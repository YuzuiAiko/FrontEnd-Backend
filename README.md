<h1><center>
<img src="./frontend/src/assets/imfrisiv.png" alt="Imfrisiv Mail" width="200">
<div style="position:relative;top:-1.5em;margin-bottom:0em;font-variant:all-small-caps;">Imfrisiv Mail</div>
</center></h1>

<div style="padding:1em;"><center>
<h3>Save time by organizing your emails.</h3>
<p>
  <a href="mailto:ilp0824@dlsud.edu.ph?cc=fcc2386@dlsud.edu.ph,stn0169@dlsud.edu.ph"><img src="https://img.shields.io/badge/contact_us_via-email-mediumvioletred.svg" alt="contact us through email"></a>
</p>
</center></div>

## Features

- Supports Gmail.
- Categorize email into distinct labels.
- Authenticate with your Google account securely.
- Send and receive messages with a sleek interface.
- Works on every device with Internet access.

## Background

This was proposed as the SiFri-Mail project for the S–CSSE321 and S–CSIS311 classes by three De La Salle University – Dasmariñas students in the first semester of their junior year.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YuzuiAiko/FrontEnd-Backend.git
   cd FrontEnd-Backend
   ```

2. Install dependencies for the backend:
   ```bash
   cd backend
   npm install
   ```

3. Install dependencies for the frontend:
   ```bash
   cd ../frontend
   npm install
   ```

## Configuration

### Environment Variables

Create a `.env` file in the project root and configure the following variables:

#### Server Configuration
- `PORT=5002` - Port on which the backend server will run
- `BACKEND_HOST=localhost` - Hostname for the backend server
- `BACKEND_PORT=5002` - Port for the backend server (should match PORT)

#### SSL Configuration (for HTTPS)
- `SSL_KEY_FILE=ssl/localhost-key.pem` - Path to SSL private key
- `SSL_CRT_FILE=ssl/localhost-cert.pem` - Path to SSL certificate
- `SSL_KEY_PATH=ssl/localhost-key.pem` - Legacy path to SSL private key
- `SSL_CERT_PATH=ssl/localhost-cert.pem` - Legacy path to SSL certificate

#### OAuth2 Configuration
**Gmail OAuth2:**
- `GMAIL_CLIENT_ID` - Your Google OAuth client ID
- `GMAIL_CLIENT_SECRET` - Your Google OAuth client secret
- `GMAIL_REDIRECT_URI` - Redirect URI registered in Google Cloud Console

**Outlook OAuth2:**
- `OUTLOOK_CLIENT_ID` - Your Microsoft OAuth client ID
- `OUTLOOK_CLIENT_SECRET` - Your Microsoft OAuth client secret
- `OUTLOOK_TENANT_ID` - Your Microsoft tenant ID
- `OUTLOOK_REDIRECT_URI` - Redirect URI registered in Azure Portal

#### Frontend Configuration
- `REACT_APP_BACKEND_URL` - Full URL to your backend server
- `FRONTEND_REDIRECT_URL` - Fallback URL for OAuth2 redirects
- `FRONTEND_POSTAUTH_ROUTE=/home` - Route to redirect after successful authentication

#### Frontend Customization
- `REACT_APP_USE_GROUP_LOGO=false` - Set to `true` to use group logo
- `REACT_APP_TITLE` - Application title
- `REACT_APP_DESCRIPTION` - Application description for SEO
- `REACT_APP_KEYWORDS` - Comma-separated keywords for SEO

#### Backend Services
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `CLASSIFIER_URL` - URL of the email classification service

#### Email Classification
- `CLASSIFICATION_CATEGORIES` - Comma-separated list of email categories

#### API Keys (Never commit real keys to version control!)
- `OPENAI_API_KEY` - Required for AI-powered features
- `PERPLEXITY_API_KEY` - Optional: For advanced features
- `GOOGLE_GEMINI_API_KEY` - Optional: Google Gemini / Generative Language API key (fallback provider)

Note: AI/compose features are implemented server-side. Set `OPENAI_API_KEY` (preferred) or `PERPLEXITY_API_KEY` in the server environment (not as `REACT_APP_` variables) so the backend can call the provider and keep secrets private.
You can also set `GOOGLE_GEMINI_API_KEY` as an additional fallback provider; the server will prefer OpenAI, then Perplexity, then Gemini when composing text.

### Setting Up

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and fill in your configuration values.

3. For development with HTTPS, place your SSL certificate files in the `backend/ssl/` directory or update the SSL paths in the `.env` file.

4. For OAuth2 setup:
   - Register your application with Google Cloud Console and Azure Portal
   - Add the appropriate redirect URIs
   - Copy the client IDs and secrets to your `.env` file
   - When the frontend initiates Gmail OAuth, it sends its current URL/port in the `redirect` query parameter.
   - The backend will redirect users to this URL after authentication. If not provided, it falls back to `FRONTEND_REDIRECT_URL` from `.env`.
   - The route to redirect to after authentication defaults to `/home`, but can be customized with the `FRONTEND_POSTAUTH_ROUTE` variable in `.env`.

   **Example .env variables:**
   ```env
   PORT=5002
   GMAIL_CLIENT_ID=your-google-client-id
   GMAIL_CLIENT_SECRET=your-google-client-secret
   GMAIL_REDIRECT_URI=https://localhost:5002/auth/gmail/callback
   OUTLOOK_CLIENT_ID=your-outlook-client-id
   OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
   OUTLOOK_TENANT_ID=your-outlook-tenant-id
   OUTLOOK_REDIRECT_URI=https://localhost:5002/auth/outlook/callback
   SSL_KEY_PATH=ssl/localhost-key.pem
   SSL_CERT_PATH=ssl/localhost-cert.pem
   REACT_APP_BACKEND_URL=https://localhost:5002
   FRONTEND_REDIRECT_URL=http://localhost:5003/
   FRONTEND_POSTAUTH_ROUTE=/home
   # FRONTEND_REDIRECT_URL is used as a fallback for dynamic OAuth2 redirects if not provided by the frontend.
   # FRONTEND_POSTAUTH_ROUTE sets the route to redirect to after authentication (default: /home)
   ```

5. Train the email classifier (optional):
   ```bash
   cd backend/classifier
   python train_model.py
   ```


## Usage

1. Start all services:
   ```bash
   cd FrontEnd-Backend
   ./run.ps1
   ```

2. Access the application:
   - Frontend: [https://localhost:5002](https://localhost:5002)
   - Backend: [https://localhost:5000](https://localhost:5000)

3. Log in using your Gmail account or email credentials.

4. Explore features like email categorization, sending emails, and more.

## Authentication Flow: Frontend, Backend, and Login Methods

The authentication process between the frontend and backend is based on OAuth2 for both Gmail and Outlook. Here’s how the flow works:

1. **User Initiates Login from Frontend:**
   - The user clicks a login button (e.g., "Sign in with Google" or "Sign in with Outlook") in the frontend React app.
   - The frontend opens a new window or redirects the user to the backend’s OAuth2 login endpoint (e.g., `/auth/gmail/login` or `/auth/outlook/login`).

### Backend: Vercel deployment note

When deploying the `backend/` folder to Vercel (or similar serverless platforms), the platform terminates TLS for you and provides HTTPS at the edge. The backend should not attempt to load local SSL PEM files in that environment — those files typically don't exist in the build/runtime environment and will cause the process to crash with ENOENT errors.

Changes in this repo to support Vercel:
- `backend/server.js` now detects Vercel/Now runtime (via `VERCEL`, `VERCEL_ENV`, or `NOW_REGION`) and avoids reading local `ssl/*.pem` files when those environment variables are present.
- Locally (or on self-hosted servers), the server will attempt to start an HTTPS server if both key and cert files exist, otherwise it falls back to an HTTP server.

If you need HTTPS locally, keep your certs in `backend/ssl` and set `SSL_KEY_FILE` / `SSL_CRT_FILE` environment variables to point to them. On Vercel, simply deploy the `backend/` directory — the platform's HTTPS will be used automatically.

2. **Backend Handles OAuth2 Flow:**
   - The backend redirects the user to the third-party provider’s (Google or Microsoft) OAuth2 consent screen.
   - After the user authenticates and grants permissions, the provider redirects back to the backend’s callback endpoint (e.g., `/auth/gmail/callback` or `/auth/outlook/callback`).

3. **Backend Exchanges Code for Tokens:**
   - The backend receives an authorization code and exchanges it for access/refresh tokens.
   - These tokens are stored in the user’s session (`req.session.tokens`).

4. **Session and Cookie Handling:**
   - The backend sets a session cookie in the user’s browser. This cookie is configured as `secure: true` and `sameSite: 'None'` for cross-site HTTPS use.
   - The session contains the user’s tokens and, after email fetching, the emails themselves.

5. **Frontend Receives Redirect:**
   - The backend redirects the user back to the frontend (using a dynamic or fallback redirect URL, e.g., `FRONTEND_REDIRECT_URL`), typically to a route like `/home`.
   - The frontend can now make authenticated requests to the backend (e.g., to fetch emails), with the session cookie included.

6. **Authenticated API Requests:**
   - The frontend uses `fetch` or `axios` with credentials enabled (`credentials: 'include'` or `withCredentials: true`) to call backend endpoints.
   - The backend checks the session for tokens and user data to authorize requests.

**Supported Login Methods:**
- **Gmail:** Uses Google OAuth2. Endpoints: `/auth/gmail/login`, `/auth/gmail/callback`.
- **Outlook:** Uses Microsoft OAuth2. Endpoints: `/auth/outlook/login`, `/auth/outlook/callback`.

**Security Notes:**
- All sensitive data (tokens, emails) are stored in the server-side session, not in the frontend.
- Session cookies require HTTPS and proper CORS configuration (see below).

**See also:**
- The CORS and session cookie configuration section below for more on cross-origin and credential handling.

## How Emails Are Gathered and Stored

The backend gathers emails from Gmail and Outlook using their respective APIs after the user authenticates. For Gmail, the `/gmail/callback` route fetches and classifies emails, then stores them in the session (`req.session.emails`). The frontend retrieves these emails by calling `/gmail/emails`.

For Outlook, after OAuth2 authentication, the backend fetches emails from Microsoft Graph API and returns them to the frontend (see `backend/routes/outlook.js`).

**Session Storage:**
- Emails are not stored in a database. Instead, they are kept in the user's session for the duration of their login. If the session is lost (e.g., browser closed, session expired), emails must be refetched.

**Endpoints:**
- `GET /gmail/emails` — Returns emails stored in the session for Gmail accounts.
- (For Outlook, emails are returned directly after authentication.)

**Security:**
- Session cookies are configured as `secure: true` and `sameSite: 'None'` to ensure they are only sent over HTTPS and are cross-site compatible.

See also the CORS and cookie configuration notes below for more details on session handling.

1. Start all services:
   ```bash
   cd FrontEnd-Backend
   ./run.ps1
   ```

2. Access the application:
   - Frontend: [https://localhost:5002](https://localhost:5002)
   - Backend: [https://localhost:5000](https://localhost:5000)

3. Log in using your Gmail account or email credentials.

4. Explore features like email categorization, sending emails, and more.


## Running All Services with tmux (Optional)

For users who prefer using `tmux` to manage multiple terminal sessions, a `start_services.sh` script is provided. This script launches all services (SVM Model, Backend, Frontend) in separate `tmux` panes for better process management.

### Steps to Use the tmux Script

1. Ensure `tmux` is installed on your system. You can install it using your package manager:
   ```bash
   sudo apt install tmux  # For Debian/Ubuntu
   sudo dnf install tmux  # For Fedora
   brew install tmux      # For macOS
   ```

2. Run the `start_services.sh` script:
   ```bash
   ./start_services.sh
   ```

3. The script will:
   - Create a new `tmux` session named `services`.
   - Start the SVM Model, Backend, and Frontend in separate panes.
   - Attach to the `tmux` session for monitoring.

4. To detach from the `tmux` session, press `Ctrl+B` followed by `D`.

5. To reattach to the session later, use:
   ```bash
   tmux attach-session -t services
   ```

This method is particularly useful for Linux CLI environments or when running the application on a remote server.

## Notes

- Ensure you have Python 3.8+ and Node.js installed.
- Use `npm start` in the `frontend` directory to run the frontend separately.
- Use `node server.js` in the `backend` directory to run the backend separately.


## CORS Configuration and Session Cookies

The backend enforces CORS to only allow requests from known frontend origins and to support cross-site cookies for session auth.

- Where it lives: `backend/server.js` in the `allowedOrigins` array and the `cors(...)` middleware.
- Default allowed dev origins (both HTTP and HTTPS):
  - `localhost` and `127.0.0.1` on ports 3000, 5000, 5002, 5003, 5173
- Preflight: `OPTIONS` is enabled. Common headers are allowed and `credentials` is set to `true`.

How to add a new origin
1) Determine your exact frontend origin (scheme + host + port), for example:
   - `https://localhost:5003`
   - `https://mail.mycorp.internal`
2) Add that exact string to `allowedOrigins` in `backend/server.js`.
3) Restart the backend.

Example: internal/corporate deployments
- Add explicit entries for each UI hostname:
  - `https://mail.mycorp.internal`
  - `https://intranet.mycorp.local`
- If you serve multiple subdomains, add each explicitly. Wildcards are not used in the current `origin` function. To support patterns, you can switch to a regex check in the CORS `origin` callback.

Cookies, HTTPS, and credentials
- The session cookie is configured with `secure: true` and `sameSite: 'None'`, which requires the frontend to be served over HTTPS for cookies to be set and sent.
- All frontend requests that need cookies must send credentials:
  - `fetch(url, { credentials: 'include' })`
  - `axios.post(url, data, { withCredentials: true })`
- Ensure `REACT_APP_BACKEND_URL` points to the HTTPS backend origin you’re running (e.g., `https://localhost:5002`).

Debugging tips
- In the browser DevTools → Network tab, open a failing request and check the Request Headers → `Origin`. It must exactly match an entry in `allowedOrigins`.
- Verify the preflight `OPTIONS` response includes `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true`.