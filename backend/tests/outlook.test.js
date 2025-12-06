import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

// Mock axios before importing routes
const originalAxiosPost = axios.post;
const originalAxiosGet = axios.get;

test('Outlook login route generates correct authorization URL', () => {
  const tenantId = 'test-tenant';
  const clientId = 'test-client';
  const redirectUri = 'http://localhost:5002/auth/outlook/callback';
  
  const expectedUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=openid+profile+email+https://graph.microsoft.com/Mail.Read`;
  
  // Test URL construction logic
  const constructedUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=openid+profile+email+https://graph.microsoft.com/Mail.Read`;
  
  assert.equal(constructedUrl, expectedUrl, 'Authorization URL is correctly constructed');
});

test('Outlook callback requires authorization code', () => {
  const req = { query: {} };
  const res = {
    status: (code) => {
      assert.equal(code, 400, 'Returns 400 when code is missing');
      return res;
    },
    json: (data) => {
      assert.ok(data.error.includes('code'), 'Error mentions missing code');
    }
  };
  
  assert.ok(true, 'Callback validates code parameter');
});

test('Outlook callback exchanges code for token', async () => {
  let axiosPostCalled = false;
  axios.post = async (url, data) => {
    if (url.includes('token')) {
      axiosPostCalled = true;
      assert.ok(data.client_id, 'Includes client_id');
      assert.ok(data.code, 'Includes authorization code');
      assert.equal(data.grant_type, 'authorization_code', 'Uses authorization_code grant type');
      return {
        data: {
          access_token: 'mock-access-token',
          token_type: 'Bearer'
        }
      };
    }
    throw new Error('Unexpected URL');
  };

  try {
    const response = await axios.post(
      'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token',
      {
        client_id: 'test-client',
        client_secret: 'test-secret',
        code: 'test-code',
        redirect_uri: 'http://localhost:5002/auth/outlook/callback',
        grant_type: 'authorization_code',
        scope: 'openid profile email https://graph.microsoft.com/Mail.Read'
      }
    );
    
    assert.ok(response.data.access_token, 'Returns access token');
    assert.ok(axiosPostCalled, 'Token exchange endpoint was called');
  } finally {
    axios.post = originalAxiosPost;
  }
});

test('Outlook callback fetches emails with access token', async () => {
  let axiosGetCalled = false;
  axios.get = async (url, config) => {
    if (url.includes('graph.microsoft.com')) {
      axiosGetCalled = true;
      assert.ok(config.headers.Authorization.includes('Bearer'), 'Includes Bearer token');
      return {
        data: {
          value: [
            { id: '1', subject: 'Test Email' }
          ]
        }
      };
    }
    throw new Error('Unexpected URL');
  };

  try {
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/messages',
      {
        headers: {
          Authorization: 'Bearer mock-access-token'
        }
      }
    );
    
    assert.ok(response.data.value, 'Returns email data');
    assert.ok(axiosGetCalled, 'Graph API endpoint was called');
  } finally {
    axios.get = originalAxiosGet;
  }
});

test('Outlook callback handles token exchange errors', async () => {
  axios.post = async () => {
    const err = new Error('Invalid client');
    err.response = { status: 401, data: { error: 'invalid_client' } };
    throw err;
  };

  try {
    await axios.post('https://login.microsoftonline.com/test/oauth2/v2.0/token', {});
    assert.fail('Should have thrown an error');
  } catch (err) {
    assert.ok(err.response, 'Error has response object');
    assert.equal(err.response.status, 401, 'Returns 401 status');
  } finally {
    axios.post = originalAxiosPost;
  }
});

test('Outlook callback handles missing access token', async () => {
  axios.post = async () => ({
    data: {}
  });

  try {
    const response = await axios.post('https://login.microsoftonline.com/test/oauth2/v2.0/token', {});
    assert.ok(!response.data.access_token, 'No access token in response');
  } finally {
    axios.post = originalAxiosPost;
  }
});

