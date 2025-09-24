// filepath: frontend/src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; // React Router for navigation
import { gapi } from "gapi-script"; // Google API client for Gmail authentication
import axios from "axios"; // HTTP client for backend communication
import "./App.css"; // Import application styles
import GmailLogo from "./assets/Gmail_logo.png"; // Gmail logo for the UI
import GroupLogo from "./assets/F (1).png"; // Application group logo
import DefaultLogo from "./assets/imfrisiv.png"; // Default logo
import Homepage from "./components/Homepage"; // Homepage component

function App() {
  // State variables for managing email, password, and login state
  const [email, setEmail] = useState(""); // User's email input
  const [password, setPassword] = useState(""); // User's password input
  const [showPassword, setShowPassword] = useState(false); // Toggle to show/hide password
  const [loginError, setLoginError] = useState(null); // Error message for login issues

  // useEffect to initialize Gmail API client when the app loads
  useEffect(() => {
    const start = () => {
      gapi.client.init({
        clientId: process.env.REACT_APP_GMAIL_CLIENT_ID, // Gmail API Client ID from environment variables
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
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const frontendUrl = window.location.origin;
  const handleGmailLogin = () => {
    window.location.href = `${backendUrl}/auth/gmail/login?redirect=${encodeURIComponent(frontendUrl)}`;
  };

  // Function to handle email and password login with the backend
  const handleEmailLogin = async () => {
    if (email && password) {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || "https://localhost:5003"; // Use environment variable or default to 5003
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

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="container">
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
  );
}

export default App;
