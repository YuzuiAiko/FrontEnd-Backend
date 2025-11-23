import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import OpenAI from 'openai';
import { checkLLMKeys } from '../lib/llmCheck.js';

// Save originals
const origPost = axios.post;
const origLog = console.log;
const origWarn = console.warn;
const origOpenAIModelsList = OpenAI.prototype.models?.list;

test('checkLLMKeys reports OpenAI reachable on 200', async () => {
  let logged = '';
  console.log = (msg, ...rest) => { logged += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  process.env.OPENAI_API_KEY = 'ok-key';
  // stub OpenAI SDK models.list
  OpenAI.prototype.models = { list: async () => ({ data: [{}] }) };
  axios.post = async () => ({ status: 404 }); // Perplexity not set path safe-guard

  await checkLLMKeys();
  assert.ok(logged.includes('OPENAI_API_KEY: present and usable'));

  // restore
  axios.post = origPost;
  console.log = origLog;
  OpenAI.prototype.models = origOpenAIModelsList;
});

test('checkLLMKeys warns on OpenAI auth failure (401)', async () => {
  let warned = '';
  console.warn = (msg, ...rest) => { warned += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  process.env.OPENAI_API_KEY = 'bad-key';
  OpenAI.prototype.models = async () => { const e = new Error('Unauthorized'); e.status = 401; throw e; };
  axios.post = async () => ({ status: 404 });

  await checkLLMKeys();
  assert.ok(warned.includes('OPENAI_API_KEY: present but authorization failed'));

  // restore
  axios.post = origPost;
  console.warn = origWarn;
  OpenAI.prototype.models = origOpenAIModelsList;
});

test('checkLLMKeys logs OpenAI not set when missing', async () => {
  let logged = '';
  console.log = (msg, ...rest) => { logged += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  delete process.env.OPENAI_API_KEY;
  axios.post = async () => ({ status: 404 });

  await checkLLMKeys();
  assert.ok(logged.includes('OPENAI_API_KEY: not set'));

  // restore
  axios.post = origPost;
  console.log = origLog;
  OpenAI.prototype.models = origOpenAIModelsList;
});
