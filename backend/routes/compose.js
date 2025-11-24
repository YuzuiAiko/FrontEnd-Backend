import express from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import { getGeminiClient } from '../lib/geminiClient.js';

// Attempt a Perplexity POST with retries/backoff
export async function performPerplexityRequest(prompt, context = '', opts = {}) {
  const PERP_KEY = process.env.PERPLEXITY_API_KEY;
  if (!PERP_KEY) throw new Error('PERPLEXITY_API_KEY not set');

  const retries = Number.isInteger(opts.retries) ? opts.retries : 3;
  const timeout = opts.timeout || 5000;
  const baseUrl = opts.url || 'https://api.perplexity.ai/chat/completions';

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const resp = await axios.post(
        baseUrl,
        { messages: [{ role: 'user', content: `${prompt}\n\nContext: ${context || ''}` }], model: 'sonar' },
        { timeout }
      );
      return resp;
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) break;
      const backoffMs = Math.pow(2, attempt) * 300;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr || new Error('Perplexity request failed');
}

// Compose handler: try providers in order and fall back on failures instead of returning immediately
export async function handleCompose(req, res) {
  const { prompt, context } = req.body || {};
  if (!prompt || String(prompt).trim().length === 0) return res.status(400).json({ success: false, error: 'Prompt is required' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const PERP_KEY = process.env.PERPLEXITY_API_KEY;
  const GEM_KEY = process.env.GOOGLE_GEMINI_API_KEY;

  const errors = [];

  // Try Gemini first (SDK-first, then REST fallback)
  if (GEM_KEY) {
    try {
      try {
        const gem = await getGeminiClient(GEM_KEY);
        const out = await gem.generateContent({ model: 'gemini-2.5-flash', contents: `Compose email text based on: ${prompt}\n\nContext: ${context || ''}` });
        const generated = out?.text || '';
        if (generated) return res.json({ success: true, provider: 'gemini', text: generated });
        errors.push({ provider: 'gemini', reason: 'empty-sdk-response' });
      } catch (sdkErr) {
        console.warn('Gemini SDK unavailable or failed, trying REST fallback:', sdkErr.message || sdkErr.code || sdkErr);
        // REST fallback
        const url = `https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate?key=${GEM_KEY}`;
        let lastErr;
        let gResp;
        const retries = 2;
        for (let attempt = 0; attempt <= retries; attempt += 1) {
          try {
            gResp = await axios.post(url, { prompt: { text: `${prompt}\n\nContext: ${context || ''}` } }, { timeout: 5000 });
            break;
          } catch (err) {
            lastErr = err;
            const status2 = err?.response?.status;
            if (attempt === retries) break;
            if (status2 && status2 >= 400 && status2 < 500 && status2 !== 429) break;
            const backoffMs = Math.pow(2, attempt) * 300;
            await new Promise((r) => setTimeout(r, backoffMs));
          }
        }
        if (!gResp) throw lastErr || new Error('Gemini REST fallback failed');
        const data = gResp.data || {};
        const generated = data.output_text || (data.candidates && data.candidates[0] && data.candidates[0].content) || data.output || data.result || data.generated_text || '';
        if (generated) return res.json({ success: true, provider: 'gemini', text: generated });
        errors.push({ provider: 'gemini', reason: 'empty-rest-response' });
      }
    } catch (err) {
      const status = err?.response?.status || err?.status;
      errors.push({ provider: 'gemini', status: status || 502, message: err?.message || String(err) });
      console.warn('Gemini compose error:', err?.response?.data || err.message || err);
    }
  }

  // Try OpenAI next (if configured)
  if (OPENAI_KEY) {
    try {
      const client = new OpenAI({ apiKey: OPENAI_KEY });
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an assistant that writes email text. Be concise and helpful.' },
          { role: 'user', content: `Prompt: ${prompt}\n\nContext: ${context || ''}` }
        ],
        max_tokens: 512,
        temperature: 0.7,
      });

      const choices = response?.choices;
      const text = Array.isArray(choices) && choices[0] && choices[0].message ? choices[0].message.content : response?.text || '';
      if (text) return res.json({ success: true, provider: 'openai', text });
      errors.push({ provider: 'openai', reason: 'empty-response' });
    } catch (err) {
      const status = err?.response?.status || err?.status;
      errors.push({ provider: 'openai', status: status || 502, message: err?.message || String(err) });
      console.warn('OpenAI compose error, falling back:', err?.response?.data || err.message || err);
    }
  }

  // Next, try Perplexity if configured
  if (PERP_KEY) {
    try {
      const pResp = await performPerplexityRequest(prompt, context, { retries: 3, timeout: 5000 });
      const data = pResp.data || {};
      let generated = '';
      if (typeof data.answer === 'string') generated = data.answer;
      else if (data.answer && data.answer[0] && data.answer[0].text) generated = data.answer[0].text;
      else if (data.results && Array.isArray(data.results) && data.results[0] && data.results[0].text) generated = data.results[0].text;
      else if (data.text) generated = data.text;
      if (!generated) generated = data?.response || data?.summary || '';
      if (generated) return res.json({ success: true, provider: 'perplexity', text: generated });
      errors.push({ provider: 'perplexity', reason: 'empty-response' });
    } catch (err) {
      const status = err?.response?.status || err?.status;
      // Record auth and rate-limit failures but do not short-circuit other providers.
      errors.push({ provider: 'perplexity', status: status || 502, message: err?.message || String(err) });
      console.warn('Perplexity compose error (recording and continuing):', err?.response?.data || err.message || err);
    }
  }

  // No provider succeeded — pick an appropriate status to return based on failures
  const statusPriority = (errs) => {
    if (!errs || errs.length === 0) return 503;
    if (errs.some((e) => e.status === 401 || e.status === 403)) return 401;
    if (errs.some((e) => e.status === 429)) return 429;
    return 502;
  };

  const finalStatus = statusPriority(errors);
  return res.status(finalStatus).json({ success: false, error: 'All providers failed', details: errors });
}

// Provide a default Express router for server.js while preserving named exports for tests
const router = express.Router();
router.post('/', handleCompose);

export default router;

