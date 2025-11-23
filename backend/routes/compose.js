import express from 'express';
import axios from 'axios';

const router = express.Router();

// POST /api/compose
// Body: { prompt: string, context?: string, options?: { tone?: string, length?: string } }
router.post('/', async (req, res) => {
  const { prompt, context } = req.body || {};
  if (!prompt || String(prompt).trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const PERP_KEY = process.env.PERPLEXITY_API_KEY;

  // Prefer OpenAI if available
  if (OPENAI_KEY) {
    try {
      const payload = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an assistant that writes email text. Be concise and helpful.' },
          { role: 'user', content: `Prompt: ${prompt}\n\nContext: ${context || ''}` }
        ],
        max_tokens: 512,
        temperature: 0.7,
      };

      const r = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      });

      const choices = r.data?.choices;
      const text = Array.isArray(choices) && choices[0] && choices[0].message ? choices[0].message.content : r.data?.text || '';
      return res.json({ success: true, provider: 'openai', text });
    } catch (err) {
      console.error('OpenAI compose error:', err?.response?.data || err.message || err);
      if (err?.response?.status === 429) {
        return res.status(429).json({ success: false, error: 'Rate limit from OpenAI. Try again later.' });
      }
      return res.status(502).json({ success: false, error: 'OpenAI service error' });
    }
  }

  // If user provided PERPLEXITY_API_KEY but OpenAI is not present, inform maintainers (fallback not implemented)
  if (PERP_KEY) {
    console.warn('PERPLEXITY_API_KEY present but Perplexity integration not implemented.');
    return res.status(501).json({ success: false, error: 'Perplexity integration not implemented on this server. Please set OPENAI_API_KEY or implement Perplexity support.' });
  }

  return res.status(503).json({ success: false, error: 'No AI provider configured. Set OPENAI_API_KEY (preferred) or PERPLEXITY_API_KEY in server environment.' });
});

export default router;
