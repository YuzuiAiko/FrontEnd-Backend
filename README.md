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
- Available as a desktop application (Windows, macOS, Linux)

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

4. Set up environment variables:
   - Create `.env` files in both the `backend` and `frontend` directories, or use the provided `.env.example` as a template.
   - Add the required environment variables as specified below.

   **Dynamic Redirect Support:**
   - The backend supports dynamic OAuth2 redirects using the `FRONTEND_REDIRECT_URL` variable.
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

## Desktop Application

The application can be installed and run as a native desktop application using Electron. Here's how to build it:

1. Switch to the Electron branch:
   ```bash
   git checkout feat-wrapwithelectron
   ```

2. Install all dependencies:
   ```bash
   npm install
   cd frontend
   npm install
   cd ../backend
   npm install
   ```

3. Build the application:
   ```bash
   # For Windows installer
   npm run package
   # For development build
   npm run electron:build
   ```

This will create executable files in the `dist` directory:
- Windows: Find the `.exe` installer in `dist/`
- macOS: Find the `.dmg` file in `dist/` (requires build on macOS)
- Linux: Find `.deb` and `.rpm` packages in `dist/` (requires build on Linux)

The desktop application includes all necessary services bundled together, so you don't need to run servers separately.

## Authentication Flow: Frontend, Backend, and Login Methods

The authentication process between the frontend and backend is based on OAuth2 for both Gmail and Outlook. Here’s how the flow works:

1. **User Initiates Login from Frontend:**
   - The user clicks a login button (e.g., "Sign in with Google" or "Sign in with Outlook") in the frontend React app.
   - The frontend opens a new window or redirects the user to the backend’s OAuth2 login endpoint (e.g., `/auth/gmail/login` or `/auth/outlook/login`).

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