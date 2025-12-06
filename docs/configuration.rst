Configuration
=============

Environment variables and configuration options are described here. See `README.md` for a full list; this page summarizes the key variables.

- `PORT`, `BACKEND_HOST`, `BACKEND_PORT` — backend server network settings.
- SSL: `SSL_KEY_FILE`, `SSL_CRT_FILE`, `SSL_KEY_PATH`, `SSL_CERT_PATH` — paths to TLS files for local HTTPS.
- OAuth2: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`, `OUTLOOK_REDIRECT_URI`.
- Frontend: `REACT_APP_BACKEND_URL`, `FRONTEND_REDIRECT_URL`, `FRONTEND_POSTAUTH_ROUTE`.
- AI keys (server-side only): `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GOOGLE_GEMINI_API_KEY`.

Copy ``.env.example`` to ``.env`` and edit values for your environment.
