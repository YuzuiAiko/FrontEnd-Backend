CORS and Session Cookies
========================

The backend enforces an `allowedOrigins` list in `backend/server.js`. Ensure your frontend origin (scheme+host+port) is added there when running in development or production.

Requests that require the session cookie must include credentials:

- `fetch(url, { credentials: 'include' })`
- `axios.post(url, data, { withCredentials: true })`

Session cookies are `secure: true` and `sameSite: 'None'`, so HTTPS is required for them to be set and sent by browsers.
