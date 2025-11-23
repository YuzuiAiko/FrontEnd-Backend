import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import OpenAI from 'openai';
import { checkLLMKeys } from '../lib/llmCheck.js';

// Save originals
const origGet = axios.get;
const origPost = axios.post;
const origLog = console.log;
const origWarn = console.warn;
const origOpenAIModelsList = OpenAI.prototype.models?.list;

test('checkLLMKeys reports OpenAI reachable on 200', async () => {
  let logged = '';
  console.log = (msg, ...rest) => { logged += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  process.env.OPENAI_API_KEY = 'ok-key';
  process.env.__TEST_OPENAI_MOCK = 'true';
  // stub OpenAI SDK models.list
  OpenAI.prototype.models = { list: async () => ({ data: [{}] }) };
  axios.get = async () => ({ status: 200, data: {} });
  axios.post = async () => ({ status: 404 }); // Perplexity not set path safe-guard

  await checkLLMKeys();
  assert.ok(logged.includes('OPENAI_API_KEY: present and usable'));

  // restore
  axios.post = origPost;
  console.log = origLog;
  axios.get = origGet;
  OpenAI.prototype.models = origOpenAIModelsList;
  delete process.env.__TEST_OPENAI_MOCK;
});

test('checkLLMKeys warns on OpenAI auth failure (401)', async () => {
  let warned = '';
  console.warn = (msg, ...rest) => { warned += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  process.env.OPENAI_API_KEY = 'bad-key';
  OpenAI.prototype.models = async () => { const e = new Error('Unauthorized'); e.status = 401; throw e; };
  axios.get = async () => { const e = new Error('Unauthorized'); e.response = { status: 401 }; throw e; };
  axios.post = async () => ({ status: 404 });

  await checkLLMKeys();
  assert.ok(warned.includes('OPENAI_API_KEY: present but authorization failed'));

  // restore
  axios.post = origPost;
  console.warn = origWarn;
  OpenAI.prototype.models = origOpenAIModelsList;
  delete process.env.__TEST_OPENAI_MOCK;
  axios.get = origGet;
  delete process.env.GOOGLE_GEMINI_API_KEY;
});

test('checkLLMKeys reports Gemini reachable on 200', async () => {
  let logged = '';
  console.log = (msg, ...rest) => { logged += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  process.env.GOOGLE_GEMINI_API_KEY = 'gem-key';
  axios.post = async () => ({ status: 200, data: {} });

  await checkLLMKeys();
  assert.ok(logged.includes('GOOGLE_GEMINI_API_KEY: present and Gemini endpoint reachable'));

  // restore
  axios.post = origPost;
  console.log = origLog;
  delete process.env.GOOGLE_GEMINI_API_KEY;
});

test('checkLLMKeys logs OpenAI not set when missing', async () => {
  let logged = '';
  console.log = (msg, ...rest) => { logged += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  delete process.env.OPENAI_API_KEY;
  axios.post = async () => ({ status: 404 });
  axios.get = async () => ({ status: 404 });

  await checkLLMKeys();
  assert.ok(logged.includes('OPENAI_API_KEY: not set'));

  // restore
  axios.post = origPost;
  console.log = origLog;
  OpenAI.prototype.models = origOpenAIModelsList;
  delete process.env.__TEST_OPENAI_MOCK;
  axios.get = origGet;
});
