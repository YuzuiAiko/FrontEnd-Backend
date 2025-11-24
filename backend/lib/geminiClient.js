// Helper to dynamically load a Google Gen AI SDK (supports multiple package names)
// and return a normalized client with a `generateContent` method.
export async function getGeminiClient(apiKey) {
  if (!apiKey) throw new Error('API key required');

  // Try both modern and older package names.
  const pkgNames = ['@google/genai', '@google/generative-ai'];
  let mod;
  let lastErr;

  for (const name of pkgNames) {
    try {
      mod = await import(name);
      // found a module
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!mod) {
    const err = new Error('Google Gen AI SDK not installed');
    err.code = 'MODULE_NOT_FOUND';
    err.cause = lastErr;
    throw err;
  }

  // Try to locate a constructor or factory for the client.
  const candidates = [
    mod.GoogleGenAI,
    mod.default?.GoogleGenAI,
    mod.default,
    mod.GoogleGenAI?.default,
  ];

  let ClientCtor = candidates.find((c) => typeof c === 'function');

  if (!ClientCtor) {
    // Some packages may export an object with a factory method instead
    // Try common shapes: mod.createClient, mod.createGenAI
    if (typeof mod.createClient === 'function') {
      ClientCtor = mod.createClient;
    } else if (typeof mod.create === 'function') {
      ClientCtor = mod.create;
    }
  }

  if (!ClientCtor) {
    const err = new Error('Incompatible Google Gen AI SDK export shape');
    err.code = 'INCOMPATIBLE_SDK';
    err.module = Object.keys(mod).slice(0, 10);
    throw err;
  }

  // Try to instantiate; some exports require `new`, some are factory functions.
  let client;
  try {
    client = new ClientCtor({ apiKey });
  } catch (e) {
    try {
      client = await ClientCtor({ apiKey });
    } catch (e2) {
      const err = new Error('Failed to construct Gemini SDK client');
      err.code = 'INCOMPATIBLE_SDK';
      err.cause = e2;
      throw err;
    }
  }

  // Normalize a simple generateContent method into a predictable contract.
  if (client && client.models && typeof client.models.generateContent === 'function') {
    return {
      generateContent: async (opts) => {
        const resp = await client.models.generateContent(opts);
        // Normalize possible shapes to { text, raw }
        const text = resp?.text || resp?.output?.[0]?.content || resp?.result || resp?.generated_text || '';
        return { text, raw: resp };
      },
    };
  }

  // Some older SDKs may provide generateContent at top-level
  if (typeof client.generateContent === 'function') {
    return {
      generateContent: async (opts) => {
        const resp = await client.generateContent(opts);
        const text = resp?.text || resp?.output?.[0]?.content || resp?.result || resp?.generated_text || '';
        return { text, raw: resp };
      },
    };
  }

  const err = new Error('Google Gen AI SDK found but client has no generateContent');
  err.code = 'INCOMPATIBLE_SDK';
  throw err;
}

export default getGeminiClient;
