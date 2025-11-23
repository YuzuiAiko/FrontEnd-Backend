import axios from 'axios';

export async function checkLLMKeys() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;

  if (openaiKey) {
    try {
      // quick check to OpenAI models endpoint to validate key
      const resp = await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openaiKey}` },
        timeout: 5000,
      });
      if (resp.status === 200) {
        console.log('OPENAI_API_KEY: present and usable (OpenAI reachable).');
      } else {
        console.warn(`OPENAI_API_KEY: present but unexpected response: ${resp.status}`);
      }
    } catch (err) {
      const status = err?.response?.status;
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
}

export default checkLLMKeys;
