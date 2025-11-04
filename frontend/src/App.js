// filepath: frontend/src/App.js
import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { gapi } from "gapi-script";
import axios from "axios";
import "./App.css";
import Homepage from "./components/Homepage";
import ErrorBoundary from "./components/ErrorBoundary";

// Import images and get their actual paths in the build
const getAssetPath = (assetPath) => {
  console.log('\n[Asset Path Resolution]');
  console.log('Input path:', assetPath);

  const cleanPath = assetPath.replace(/^\.\//, '');

  if (window.electron) {
    const resourcesPath = window.electron.env.RESOURCES_PATH;
    console.log('Resources path:', resourcesPath);

    if (!resourcesPath || resourcesPath === '.') {
      console.error('Invalid or missing resourcesPath');
      return assetPath;
    }

    const mediaPath = window.electron.utils.resolveResourcePath(
      cleanPath
    );

    console.log('Resolved media path:', mediaPath);
    return `file://${mediaPath}`;
  }

  console.log('Web browser context, using original path');
  return assetPath;
};
// The second declaration of getAssetPath has been removed to avoid duplication.

// Import images
const GmailLogo = getAssetPath(require("./assets/Gmail_logo.png"));
const GroupLogo = getAssetPath(require("./assets/F (1).png"));
const DefaultLogo = getAssetPath(require("./assets/imfrisiv.png"));
const BackgroundImage = getAssetPath(require("./assets/images/login-background-laptopwoman.jpg"));

function App() {
  // State variables for managing email, password, and login state
  const [email, setEmail] = useState(""); // User's email input
  const [password, setPassword] = useState(""); // User's password input
  const [showPassword, setShowPassword] = useState(false); // Toggle to show/hide password
  const [loginError, setLoginError] = useState(null); // Error message for login issues

  // useEffect to initialize Gmail API client when the app loads
  useEffect(() => {
    const start = () => {
      // Get environment variables from electron bridge if available, otherwise use process.env
      const clientId = window.electron?.env?.GMAIL_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
      const redirectUrl = window.electron?.env?.FRONTEND_REDIRECT_URL || process.env.FRONTEND_REDIRECT_URL;
      
      if (!clientId) {
        console.error('Gmail client ID not found in environment variables');
        return;
      }

      gapi.client.init({
        clientId: clientId,
        scope: "email", // Gmail API scope
        discoveryDocs: [
          "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest", // Gmail API discovery document
        ],
        ux_mode: "redirect", // Redirect user after authentication
      });
    };
    gapi.load("client:auth2", start); // Load the Gmail API client and initialize
  }, []);

  // Function to handle Gmail login via OAuth
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "https://localhost:5002";
  const frontendUrl = window.location.origin;
  const handleGmailLogin = () => {
    window.location.href = `${backendUrl}/auth/gmail/login?redirect=${encodeURIComponent(frontendUrl)}`;
  };

  // Function to handle email and password login with the backend
  const handleEmailLogin = async () => {
    if (email && password) {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || "https://localhost:5002"; // Use environment variable or default to 5003
        // Send email and password to the backend for authentication
        const response = await axios.post(
          `${backendUrl}/api/login`,
          { email, password },
          { withCredentials: true }
        );

        console.log("Login successful:", response.data); // Log success response
        setLoginError(null); // Clear any previous login errors

    // Redirect to Gmail login after successful email/password login
    window.location.href = `${backendUrl}/auth/gmail/login?redirect=${encodeURIComponent(frontendUrl)}`;
      } catch (error) {
        console.error("Login failed:", error.response ? error.response.data.message : error.message); // Log error
        setLoginError("Invalid email or password."); // Display error message
      }
    } else {
      setLoginError("Please enter both email and password."); // Validation error for empty fields
    }
  };

  // Determine logo and app name based on environment variable
  const useGroupLogo = process.env.REACT_APP_USE_GROUP_LOGO === "true";
  const logo = useGroupLogo ? GroupLogo : DefaultLogo;
  const appName = useGroupLogo ? "SiFri Mail" : "ImfrisivMail";

  // Debug: Log image loading attempts
  useEffect(() => {
    console.log('Attempting to load background image:', BackgroundImage);
    console.log('Environment:', {
      isElectron: window.electron !== undefined,
      publicUrl: process.env.PUBLIC_URL,
      nodeEnv: process.env.NODE_ENV
    });
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
            <div className="container">
              {/* Separate div for background with fallback color */}
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#3b1c32', // Fallback color
                  backgroundImage: BackgroundImage ? `url(${BackgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: 0
                }}
              >
                {/* Always show debug info in a corner */}
                <div style={{ 
                  position: 'fixed', 
                  bottom: 10, 
                  right: 10, 
                  color: 'white', 
                  backgroundColor: 'rgba(0,0,0,0.7)', 
                  padding: 10,
                  borderRadius: 5,
                  fontSize: '12px',
                  maxWidth: '400px',
                  wordBreak: 'break-all'
                }}>
                  <div>Image Path: {BackgroundImage || 'Not loaded'}</div>
                  <div>Electron: {window.electron ? 'Yes' : 'No'}</div>
                  <div>Build Dir: {window.electron?.env?.BUILD_DIR || 'Not available'}</div>
                  <div>Node Env: {process.env.NODE_ENV}</div>
                </div>
              </div>
              <div className="form-section">
                <img src={logo} alt="App Logo" className="group-logo" />
                <h1 className="title">{appName}</h1>
                <p className="subtitle">Welcome</p>
                <div className="form-group">
                  <label htmlFor="email" className="label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <div className="password-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      className="input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="eye-icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <button className="button" onClick={handleEmailLogin}>
                    Log in
                  </button>
                  {loginError && <p className="error-message">{loginError}</p>}
                </div>
                <p className="or-text">or continue with</p>
                <div className="account-circles">
                  {/* Gmail login */}
                  <div className="account-circle" onClick={handleGmailLogin}>
                    <img src={GmailLogo} alt="Gmail" className="account-icon" />
                  </div>
                </div>
              </div>
            </div>
          }
        />
        <Route path="/home" element={<Homepage />} />
      </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
