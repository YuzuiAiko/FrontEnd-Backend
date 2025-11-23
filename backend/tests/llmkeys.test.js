import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { checkLLMKeys } from '../lib/llmCheck.js';

// Save originals
const origGet = axios.get;
const origPost = axios.post;
const origLog = console.log;
const origWarn = console.warn;

test('checkLLMKeys reports OpenAI reachable on 200', async () => {
  let logged = '';
  console.log = (msg, ...rest) => { logged += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  process.env.OPENAI_API_KEY = 'ok-key';
  axios.get = async () => ({ status: 200, data: {} });
  axios.post = async () => ({ status: 404 }); // Perplexity not set path safe-guard

  await checkLLMKeys();
  assert.ok(logged.includes('OPENAI_API_KEY: present and usable'));

  // restore
  axios.get = origGet;
  axios.post = origPost;
  console.log = origLog;
});

test('checkLLMKeys warns on OpenAI auth failure (401)', async () => {
  let warned = '';
  console.warn = (msg, ...rest) => { warned += msg + (rest.length ? ' ' + JSON.stringify(rest) : ''); };

  process.env.OPENAI_API_KEY = 'bad-key';
  axios.get = async () => { const e = new Error('Unauthorized'); e.response = { status: 401 }; throw e; };
  axios.post = async () => ({ status: 404 });

  await checkLLMKeys();
  assert.ok(warned.includes('OPENAI_API_KEY: present but authorization failed'));

  // restore
  axios.get = origGet;
  axios.post = origPost;
  console.warn = origWarn;
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
});
