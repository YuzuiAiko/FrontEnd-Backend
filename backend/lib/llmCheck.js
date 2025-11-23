import axios from 'axios';
import OpenAI from 'openai';
import { getGeminiClient } from './geminiClient.js';

export async function checkLLMKeys() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;

  // OpenAI check (tests may set __TEST_OPENAI_MOCK to prefer axios-based check)
  if (openaiKey) {
    try {
      if (process.env.__TEST_OPENAI_MOCK === 'true') {
        const resp = await axios.get('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${openaiKey}` },
          timeout: 5000,
        });
        if (resp.status === 200) console.log('OPENAI_API_KEY: present and usable (OpenAI reachable).');
        else console.warn(`OPENAI_API_KEY: present but unexpected response: ${resp.status}`);
      } else {
        const client = new OpenAI({ apiKey: openaiKey });
        const resp = await client.models.list();
        if (resp && resp.data) console.log('OPENAI_API_KEY: present and usable (OpenAI reachable).');
        else console.warn('OPENAI_API_KEY: present but unexpected response from models.list()');
      }
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 401 || status === 403) console.warn('OPENAI_API_KEY: present but authorization failed (invalid key).');
      else if (status === 429) console.warn('OPENAI_API_KEY: present but rate-limited (429).');
      else console.warn('OPENAI_API_KEY: present but could not reach OpenAI API:', err.message || err);
    }
  } else {
    console.log('OPENAI_API_KEY: not set.');
  }

  // Perplexity check (best-effort)
  if (perplexityKey) {
    if (!perplexityKey.startsWith('pplx-')) {
      console.warn('PERPLEXITY_API_KEY: key does not appear to start with the expected `pplx-` prefix. Verify you copied the correct Perplexity API key.');
    }
    try {
      const p = await axios.post('https://api.perplexity.ai/chat/completions', { query: 'healthcheck' }, {
        headers: { Authorization: `Bearer ${perplexityKey}`, 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      if (p.status >= 200 && p.status < 300) console.log('PERPLEXITY_API_KEY: present and Perplexity endpoint reachable (experimental check).');
      else console.warn(`PERPLEXITY_API_KEY: present but unexpected response: ${p.status}`);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) console.warn('PERPLEXITY_API_KEY: present but authorization failed (invalid key).');
      else if (status === 429) console.warn('PERPLEXITY_API_KEY: present but rate-limited (429).');
      else console.warn('PERPLEXITY_API_KEY: present but could not reach Perplexity API:', err.message || err);
    }
  } else {
    console.log('PERPLEXITY_API_KEY: not set.');
  }

  // Google Gemini check: prefer SDK, fall back to REST
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      try {
        const gem = await getGeminiClient(geminiKey);
        const r = await gem.generateContent({ model: 'gemini-2.5-flash', contents: 'healthcheck' });
        if (r && r.text) console.log('GOOGLE_GEMINI_API_KEY: present and usable (Gemini via SDK).');
        else console.warn('GOOGLE_GEMINI_API_KEY: present but unexpected response shape from SDK.');
      } catch (sdkErr) {
        // fall back to REST check
        try {
          const g = await axios.post(`https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate?key=${geminiKey}`, { prompt: { text: 'healthcheck' } }, { timeout: 5000 });
          if (g.status >= 200 && g.status < 300) console.log('GOOGLE_GEMINI_API_KEY: present and Gemini endpoint reachable');
          else console.warn(`GOOGLE_GEMINI_API_KEY: present but unexpected response from REST fallback: ${g.status}`);
        } catch (restErr) {
          const status2 = restErr?.response?.status;
          if (status2 === 401 || status2 === 403) console.warn('GOOGLE_GEMINI_API_KEY: present but authorization failed (invalid key) on REST fallback.');
          else if (status2 === 429) console.warn('GOOGLE_GEMINI_API_KEY: present but rate-limited (429) on REST fallback.');
          else console.warn('GOOGLE_GEMINI_API_KEY: present but REST fallback could not reach Gemini API:', restErr.message || restErr);
        }
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) console.warn('GOOGLE_GEMINI_API_KEY: present but authorization failed (invalid key).');
      else if (status === 429) console.warn('GOOGLE_GEMINI_API_KEY: present but rate-limited (429).');
      else console.warn('GOOGLE_GEMINI_API_KEY: present but could not reach Gemini API:', err.message || err);
    }
  } else {
    console.log('GOOGLE_GEMINI_API_KEY: not set.');
  }
}

export default checkLLMKeys;
