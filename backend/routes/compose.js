import express from 'express';
import axios from 'axios';
import OpenAI from 'openai';
// Gemini / Google Generative AI fallback helper will use axios to their REST endpoint

const router = express.Router();

// Helper: attempt a Perplexity POST with retries and timeout
export async function performPerplexityRequest(prompt, context = '', opts = {}) {
  const PERP_KEY = process.env.PERPLEXITY_API_KEY;
  if (!PERP_KEY) throw new Error('PERPLEXITY_API_KEY not set');

  const retries = Number.isInteger(opts.retries) ? opts.retries : 3;
  const timeout = opts.timeout || 5000;
  const baseUrl = opts.url || 'https://api.perplexity.ai/chat/completions';

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      // Use axios for Perplexity requests (chat completions shape)
      const resp = await axios.post(
        baseUrl,
        { messages: [{ role: 'user', content: `${prompt}\n\nContext: ${context || ''}` }], model: 'sonar' },
        {
          headers: {
            Authorization: `Bearer ${PERP_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout,
        }
      );

      return resp;
    } catch (err) {
      lastErr = err;
      // If it's the last attempt, break and throw
      if (attempt === retries) break;
      // For 4xx other than 429, don't retry
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        break;
      }
      // Exponential backoff before next attempt
      const backoffMs = Math.pow(2, attempt) * 300; // 300ms, 600ms, 1200ms...
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  // If we get here, all retries failed; throw the last error
  throw lastErr || new Error('Perplexity request failed');
}

// Handler function exported for easier testing
export async function handleCompose(req, res) {
  const { prompt, context } = req.body || {};
  if (!prompt || String(prompt).trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const PERP_KEY = process.env.PERPLEXITY_API_KEY;
  const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY;

  // Prefer OpenAI if available
  if (OPENAI_KEY) {
    try {
      // Use official OpenAI SDK for chat completions
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
      return res.json({ success: true, provider: 'openai', text });
    } catch (err) {
      console.error('OpenAI compose error:', err?.response?.data || err.message || err);
      if (err?.response?.status === 429) {
        return res.status(429).json({ success: false, error: 'Rate limit from OpenAI. Try again later.' });
      }
      return res.status(502).json({ success: false, error: 'OpenAI service error' });
    }
  }

  // If OpenAI key isn't present, try Perplexity (experimental)
  if (PERP_KEY) {
    try {
      const pResp = await performPerplexityRequest(prompt, context, { retries: 3, timeout: 5000 });

      // Try to extract generated text from several possible response shapes
      const data = pResp.data || {};
      let generated = '';
      if (typeof data.answer === 'string') generated = data.answer;
      else if (data.answer && data.answer[0] && data.answer[0].text) generated = data.answer[0].text;
      else if (data.results && Array.isArray(data.results) && data.results[0] && data.results[0].text) generated = data.results[0].text;
      else if (data.text) generated = data.text;

      if (!generated) {
        // As a fallback, try JSON.stringify of a likely field
        generated = data?.response || data?.summary || '';
      }

      if (!generated) {
        console.warn('Perplexity: response received but no text could be extracted.', { body: data });
        return res.status(502).json({ success: false, error: 'Perplexity returned an unexpected response shape.' });
      }

      return res.json({ success: true, provider: 'perplexity', text: generated });
    } catch (err) {
      console.error('Perplexity compose error:', err?.response?.data || err.message || err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ success: false, error: 'Perplexity authorization failed (invalid API key).' });
      }
      if (status === 429) {
        return res.status(429).json({ success: false, error: 'Perplexity rate-limited. Try again later.' });
      }
      return res.status(502).json({ success: false, error: 'Perplexity service error' });
    }
  }

  // If neither OpenAI nor Perplexity produced a result, try Google Gemini if configured
  const GEM_KEY = GEMINI_KEY;
  if (GEM_KEY) {
    try {
      // Try to call Google Generative Language REST endpoint (best-effort). The exact request shape
      // may vary depending on API version/account; we use a conservative POST and try to extract a text field.
      const url = `https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate?key=${GEM_KEY}`;
      const gResp = await (async () => {
        // reuse same retry/backoff pattern as Perplexity
        const retries = 2;
        let lastErr;
        for (let attempt = 0; attempt <= retries; attempt += 1) {
          try {
            return await axios.post(url, { prompt: { text: `${prompt}\n\nContext: ${context || ''}` } }, { timeout: 5000 });
          } catch (err) {
            lastErr = err;
            const status = err?.response?.status;
            if (attempt === retries) break;
            if (status && status >= 400 && status < 500 && status !== 429) break;
            const backoffMs = Math.pow(2, attempt) * 300;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
        throw lastErr || new Error('Gemini request failed');
      })();

      const data = gResp.data || {};
      // Try a few possible fields for text output
      let generated = '';
      if (typeof data.output_text === 'string') generated = data.output_text;
      else if (data.candidates && Array.isArray(data.candidates) && data.candidates[0] && data.candidates[0].content) generated = data.candidates[0].content;
      else if (data.output && typeof data.output === 'string') generated = data.output;

      if (!generated) {
        generated = data?.result || data?.generated_text || '';
      }

      if (!generated) {
        console.warn('Gemini: response received but no text could be extracted.', { body: data });
        return res.status(502).json({ success: false, error: 'Gemini returned an unexpected response shape.' });
      }

      return res.json({ success: true, provider: 'gemini', text: generated });
    } catch (err) {
      console.error('Gemini compose error:', err?.response?.data || err.message || err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ success: false, error: 'Gemini authorization failed (invalid API key).' });
      }
      if (status === 429) {
        return res.status(429).json({ success: false, error: 'Gemini rate-limited. Try again later.' });
      }
      return res.status(502).json({ success: false, error: 'Gemini service error' });
    }
  }

  return res.status(503).json({ success: false, error: 'No AI provider configured. Set OPENAI_API_KEY (preferred) or PERPLEXITY_API_KEY in server environment.' });
}

router.post('/', handleCompose);

export default router;
