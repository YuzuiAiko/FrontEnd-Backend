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

4. Set up environment variables:
   - Create `.env` files in both the `backend` and `frontend` directories.
   - Add the required environment variables as specified in the project documentation.

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

## Alternate Usage with tmux

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