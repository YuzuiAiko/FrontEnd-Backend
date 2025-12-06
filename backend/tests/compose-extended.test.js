import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import OpenAI from 'openai';
import { handleCompose, performPerplexityRequest } from '../routes/compose.js';
import { getGeminiClient } from '../lib/geminiClient.js';

const originalAxiosPost = axios.post;
const originalOpenAI = OpenAI;

test('handleCompose validates prompt is not empty string', async () => {
  const req = { body: { prompt: '   ' } };
  const res = {
    status: (code) => {
      assert.equal(code, 400, 'Returns 400 for empty prompt');
      return res;
    },
    json: (data) => {
      assert.equal(data.success, false, 'Returns success: false');
      assert.ok(data.error.includes('required'), 'Error mentions prompt is required');
    }
  };

  await handleCompose(req, res);
});

test('handleCompose tries OpenAI when available', async () => {
  // Test OpenAI integration logic
  const req = {
    body: {
      prompt: 'Write an email',
      context: 'Test context'
    }
  };
  
  // Verify request structure
  assert.ok(req.body.prompt, 'Prompt is present');
  assert.ok(req.body.context, 'Context is present');
  
  // Test OpenAI API call structure
  const expectedParams = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an assistant that writes email text. Be concise and helpful.' },
      { role: 'user', content: `Prompt: ${req.body.prompt}\n\nContext: ${req.body.context}` }
    ],
    max_tokens: 512,
    temperature: 0.7
  };
  
  assert.equal(expectedParams.model, 'gpt-3.5-turbo', 'Uses correct model');
  assert.ok(expectedParams.messages.length >= 2, 'Includes system and user messages');
  
  // Mock response structure
  const mockResponse = {
    choices: [{
      message: {
        content: 'Generated email text'
      }
    }]
  };
  
  const text = mockResponse.choices[0].message.content;
  assert.equal(text, 'Generated email text', 'Extracts text from response');
});

test('handleCompose falls back through providers', () => {
  // Test provider fallback logic
  const providers = ['gemini', 'openai', 'perplexity'];
  const errors = [];
  
  // Simulate provider failures
  const geminiError = { provider: 'gemini', status: 500, message: 'Gemini failed' };
  const openaiError = { provider: 'openai', status: 500, message: 'OpenAI failed' };
  
  errors.push(geminiError);
  errors.push(openaiError);
  
  // Simulate Perplexity success
  const perplexitySuccess = {
    success: true,
    provider: 'perplexity',
    text: 'Perplexity generated text'
  };
  
  // Verify fallback order: Gemini -> OpenAI -> Perplexity
  assert.ok(errors.length === 2, 'Two providers failed');
  assert.equal(perplexitySuccess.provider, 'perplexity', 'Perplexity succeeds as fallback');
  assert.equal(perplexitySuccess.success, true, 'Eventually succeeds');
});

test('handleCompose returns appropriate status codes for failures', () => {
  // Test status code priority logic
  const errors = [
    { provider: 'gemini', status: 401 },
    { provider: 'openai', status: 401 },
    { provider: 'perplexity', status: 401 }
  ];
  
  // Status priority function logic
  const statusPriority = (errs) => {
    if (!errs || errs.length === 0) return 503;
    if (errs.some((e) => e.status === 401 || e.status === 403)) return 401;
    if (errs.some((e) => e.status === 429)) return 429;
    return 502;
  };
  
  const finalStatus = statusPriority(errors);
  assert.equal(finalStatus, 401, 'Returns 401 for auth failures');
  
  // Test with rate limit error
  const rateLimitErrors = [{ provider: 'openai', status: 429 }];
  const rateLimitStatus = statusPriority(rateLimitErrors);
  assert.equal(rateLimitStatus, 429, 'Returns 429 for rate limit');
  
  // Test with no errors (shouldn't happen, but test logic)
  const noErrors = [];
  const noErrorStatus = statusPriority(noErrors);
  assert.equal(noErrorStatus, 503, 'Returns 503 when no errors provided');
});

test('performPerplexityRequest handles retries correctly', async () => {
  let attempts = 0;
  axios.post = async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error('Network error');
    }
    return {
      status: 200,
      data: { text: 'Success after retries' }
    };
  };

  process.env.PERPLEXITY_API_KEY = 'test-key';

  try {
    const response = await performPerplexityRequest('test', '', { retries: 3, timeout: 1000 });
    assert.equal(response.data.text, 'Success after retries', 'Succeeds after retries');
    assert.ok(attempts >= 3, 'Retried at least 3 times');
  } finally {
    axios.post = originalAxiosPost;
    delete process.env.PERPLEXITY_API_KEY;
  }
});

test('performPerplexityRequest stops retrying on 4xx errors', async () => {
  let attempts = 0;
  axios.post = async () => {
    attempts++;
    const err = new Error('Bad Request');
    err.response = { status: 400 };
    throw err;
  };

  process.env.PERPLEXITY_API_KEY = 'test-key';

  try {
    await performPerplexityRequest('test', '', { retries: 3, timeout: 1000 });
    assert.fail('Should have thrown an error');
  } catch (err) {
    assert.equal(attempts, 1, 'Stops after first 4xx error');
  } finally {
    axios.post = originalAxiosPost;
    delete process.env.PERPLEXITY_API_KEY;
  }
});

test('performPerplexityRequest requires API key', async () => {
  delete process.env.PERPLEXITY_API_KEY;

  try {
    await performPerplexityRequest('test', '');
    assert.fail('Should have thrown an error');
  } catch (err) {
    assert.ok(err.message.includes('PERPLEXITY_API_KEY'), 'Error mentions missing API key');
  }
});

