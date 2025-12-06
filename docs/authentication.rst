Authentication Flow
===================

The project uses OAuth2 for Gmail and Outlook. High-level flow:

1. Frontend redirects the user to backend endpoint: `/auth/gmail/login` or `/auth/outlook/login`.
2. Backend redirects to provider consent screen.
3. Provider calls back to backend (`/auth/gmail/callback`, `/auth/outlook/callback`).
4. Backend exchanges code for tokens and stores them in the server-side session.
5. Backend redirects to the frontend using `FRONTEND_REDIRECT_URL` or the `redirect` query parameter.

Session cookies are `secure: true` and `sameSite: 'None'` so HTTPS is required for cookies to work cross-site.
