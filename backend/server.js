const express = require("express");
const https = require("https");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

// Import the Gmail route handler
const gmailRoutes = require("./routes/gmail");

const app = express();
app.use(bodyParser.json());

// Set up CORS
app.use(
  cors({
    origin: "https://localhost:3000", // Adjusted to HTTPS
    methods: ["GET", "POST"],
    credentials: true, // Allow credentials like cookies or authorization headers
  })
);

// Configure session management
app.use(
  session({
    secret: "asdfqwerqefadsfasdfqwerqe", // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set secure: true in production (when using HTTPS)
  })
);

// Root route
app.get("/", (req, res) => {
  res.send("Hello, the server is running!");
});

// Test Session Access
app.get("/test-session", (req, res) => {
  res.json({ emails: req.session.emails });
});

// Example credentials (replace with a database in production)
const users = [
  { email: "ldf.gaming098@gmail.com", password: "$Hamgod123" },
  { email: "christianfriolo2003@gmail.com", password: "$hamgod123" },
  { email: "christianqwert107@gmail.com", password: "zaytanman123" },
  { email: "example2@gmail.com", password: "examplePass2" },
];

// Login route to check credentials and store session
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Check if the provided email and password match any entry in the users array
  const user = users.find(
    (user) => user.email === email && user.password === password
  );

  if (user) {
    // Store email in the session for tracking the logged-in user
    req.session.emails = email;
    console.log("Session after login:", req.session); // Debugging session

    // Send a response to the frontend indicating success
    res.status(200).json({ message: "Login successful", email: user.email });
  } else {
    // If the credentials are wrong, send an error
    res.status(400).json({ message: "Invalid email or password" });
  }
});

// Use Gmail routes for authentication and sending emails
app.use("/auth/gmail", gmailRoutes);

// Handle 404 errors (routes not found)
app.use((req, res) => {
  res.status(404).send("Route not found");
});

// HTTPS options for server (replace with your actual SSL certificate and key)
const options = {
  key: fs.readFileSync(process.env.SSL_KEY_FILE || "ssl/localhost-key.pem"),
  cert: fs.readFileSync(process.env.SSL_CRT_FILE || "ssl/localhost-cert.pem"),
};

// Start the HTTPS server
const PORT = process.env.PORT || 5000;
https.createServer(options, app).listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}`);
});
