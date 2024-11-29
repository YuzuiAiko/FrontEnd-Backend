import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { gapi } from "gapi-script";
import axios from "axios";
import "./App.css";
import GmailLogo from "./assets/Gmail_logo.png";
import GroupLogo from "./assets/F (1).png";
import Homepage from "./components/Homepage";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    // Initialize Gmail API
    const start = () => {
      gapi.client.init({
        clientId: process.env.REACT_APP_GMAIL_CLIENT_ID,
        scope: "email",
        discoveryDocs: [
          "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
        ],
        ux_mode: "redirect",
      });
    };
    gapi.load("client:auth2", start);
  }, []);

  // Function to handle Gmail login
  const handleGmailLogin = () => {
    window.location.href = "https://localhost:5000/auth/gmail/login";
  };

  // Handle email and password login with the backend
  const handleEmailLogin = async () => {
    if (email && password) {
      try {
        // First, attempt email/password login with backend
        const response = await axios.post("https://localhost:5000/api/login", {
          email,
          password,
        });

        console.log("Login successful:", response.data);
        setLoginError(null); // Clear any previous errors

        // After email/password login success, redirect to Gmail OAuth
        window.location.href = "https://localhost:5000/auth/gmail/login"; // Redirect to Gmail login after email/password login
      } catch (error) {
        console.error("Login failed:", error.response ? error.response.data.message : error.message);
        setLoginError("Invalid email or password.");
      }
    } else {
      setLoginError("Please enter both email and password.");
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="container">
              <div className="form-section">
                <img src={GroupLogo} alt="Group Logo" className="group-logo" />
                <h1 className="title">SiFri Mail</h1>
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
