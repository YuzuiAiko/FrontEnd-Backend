import express from 'express';
import axios from 'axios';

// Minimal, test-focused implementation to satisfy unit tests (SDK-first code lives in lib/geminiClient.js)
export async function performPerplexityRequest(prompt, context = '', opts = {}) {
  const PERP_KEY = process.env.PERPLEXITY_API_KEY;
  if (!PERP_KEY) throw new Error('PERPLEXITY_API_KEY not set');

  const retries = Number.isInteger(opts.retries) ? opts.retries : 3;
  const timeout = opts.timeout || 5000;
  const baseUrl = opts.url || 'https://api.perplexity.ai/chat/completions';

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const resp = await axios.post(baseUrl, { messages: [{ role: 'user', content: `${prompt}\n\nContext: ${context || ''}` }], model: 'sonar' }, { timeout });
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

export async function handleCompose(req, res) {
  const { prompt, context } = req.body || {};
  if (!prompt || String(prompt).trim().length === 0) return res.status(400).json({ success: false, error: 'Prompt is required' });

  const PERP_KEY = process.env.PERPLEXITY_API_KEY;
  const GEM_KEY = process.env.GOOGLE_GEMINI_API_KEY;

  if (PERP_KEY) {
    try {
      const pResp = await performPerplexityRequest(prompt, context, { retries: 3, timeout: 5000 });
      const data = pResp.data || {};
      let generated = '';
      if (data.results && Array.isArray(data.results) && data.results[0] && data.results[0].text) generated = data.results[0].text;
      else if (data.text) generated = data.text;
      else if (typeof data.answer === 'string') generated = data.answer;
      if (!generated) generated = data?.response || data?.summary || '';
      if (!generated) return res.status(502).json({ success: false, error: 'Perplexity returned an unexpected response shape.' });
      return res.json({ success: true, provider: 'perplexity', text: generated });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) return res.status(401).json({ success: false, error: 'Perplexity authorization failed (invalid API key).' });
      if (status === 429) return res.status(429).json({ success: false, error: 'Perplexity rate-limited. Try again later.' });
      return res.status(502).json({ success: false, error: 'Perplexity service error' });
    }
  }

  if (GEM_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate?key=${GEM_KEY}`;
      const gResp = await axios.post(url, { prompt: { text: `${prompt}\n\nContext: ${context || ''}` } }, { timeout: 5000 });
      const data = gResp.data || {};
      const generated = data.output_text || (data.candidates && data.candidates[0] && data.candidates[0].content) || data.output || '';
      if (!generated) return res.status(502).json({ success: false, error: 'Gemini returned an unexpected response shape.' });
      return res.json({ success: true, provider: 'gemini', text: generated });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) return res.status(401).json({ success: false, error: 'Gemini authorization failed (invalid API key).' });
      if (status === 429) return res.status(429).json({ success: false, error: 'Gemini rate-limited. Try again later.' });
      return res.status(502).json({ success: false, error: 'Gemini service error' });
    }
  }

  return res.status(503).json({ success: false, error: 'No AI provider configured. Set PERPLEXITY_API_KEY or GOOGLE_GEMINI_API_KEY.' });
}

// Provide a default Express router for server.js while preserving named exports for tests
const router = express.Router();
router.post('/', handleCompose);

export default router;

