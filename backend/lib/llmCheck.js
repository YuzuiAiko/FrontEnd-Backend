import axios from 'axios';
import OpenAI from 'openai';

export async function checkLLMKeys() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;

  if (openaiKey) {
    try {
      if (process.env.__TEST_OPENAI_MOCK === 'true') {
        // In tests we may prefer to stub axios rather than the SDK; keep prior behavior
        const resp = await axios.get('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${openaiKey}` },
          timeout: 5000,
        });
        if (resp.status === 200) console.log('OPENAI_API_KEY: present and usable (OpenAI reachable).');
        else console.warn(`OPENAI_API_KEY: present but unexpected response: ${resp.status}`);
      } else {
        const client = new OpenAI({ apiKey: openaiKey });
        // Use SDK to list models
        const resp = await client.models.list();
        if (resp && resp.data) {
          console.log('OPENAI_API_KEY: present and usable (OpenAI reachable).');
        } else {
          console.warn('OPENAI_API_KEY: present but unexpected response from models.list()');
        }
      }
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 401 || status === 403) {
        console.warn('OPENAI_API_KEY: present but authorization failed (invalid key).');
      } else if (status === 429) {
        console.warn('OPENAI_API_KEY: present but rate-limited (429).');
      } else {
        console.warn('OPENAI_API_KEY: present but could not reach OpenAI API:', err.message || err);
      }
    }
  } else {
    console.log('OPENAI_API_KEY: not set.');
  }

  if (perplexityKey) {
    // Give a helpful hint if the key doesn't match Perplexity's expected prefix
    if (!perplexityKey.startsWith('pplx-')) {
      console.warn('PERPLEXITY_API_KEY: key does not appear to start with the expected `pplx-` prefix. Verify you copied the correct Perplexity API key.');
    }

    // Attempt a lightweight Perplexity reachability check (best-effort) using their chat completions endpoint.
    try {
      const p = await axios.post('https://api.perplexity.ai/chat/completions', { query: 'healthcheck' }, {
        headers: { Authorization: `Bearer ${perplexityKey}`, 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      if (p.status >= 200 && p.status < 300) {
        console.log('PERPLEXITY_API_KEY: present and Perplexity endpoint reachable (experimental check).');
      } else {
        console.warn(`PERPLEXITY_API_KEY: present but unexpected response: ${p.status}`);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        console.warn('PERPLEXITY_API_KEY: present but authorization failed (invalid key).');
      } else if (status === 429) {
        console.warn('PERPLEXITY_API_KEY: present but rate-limited (429).');
      } else {
        console.warn('PERPLEXITY_API_KEY: present but could not reach Perplexity API:', err.message || err);
      }
    }

  } else {
    console.log('PERPLEXITY_API_KEY: not set.');
  }

  // Google Gemini (Generative Language) key check
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      // Use a conservative REST endpoint check; tests will stub axios.post.
      const g = await axios.post(`https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate?key=${geminiKey}`, { prompt: { text: 'healthcheck' } }, { timeout: 5000 });
      if (g.status >= 200 && g.status < 300) {
        console.log('GOOGLE_GEMINI_API_KEY: present and Gemini endpoint reachable (experimental check).');
      } else {
        console.warn(`GOOGLE_GEMINI_API_KEY: present but unexpected response: ${g.status}`);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        console.warn('GOOGLE_GEMINI_API_KEY: present but authorization failed (invalid key).');
      } else if (status === 429) {
        console.warn('GOOGLE_GEMINI_API_KEY: present but rate-limited (429).');
      } else {
        console.warn('GOOGLE_GEMINI_API_KEY: present but could not reach Gemini API:', err.message || err);
      }
    }
  } else {
    console.log('GOOGLE_GEMINI_API_KEY: not set.');
  }
}

export default checkLLMKeys;
