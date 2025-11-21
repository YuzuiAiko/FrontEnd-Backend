import express from "express"; // Import the express module
import https from "https"; // Import the https module for creating HTTPS server
import fs from "fs"; // Import the fs module for file system operations
import bodyParser from "body-parser"; // Import the body-parser module to parse request bodies
import cors from "cors"; // Import the cors module to enable Cross-Origin Resource Sharing (CORS)
import session from "express-session"; // Import the express-session module for session management
import gmailRoutes from "./routes/gmail.js"; // Import Gmail-related routes from a separate file

const app = express(); // Create an Express application instance

app.use(bodyParser.json()); // Use body-parser to parse JSON request bodies

// Allow configuring allowed CORS origins via environment variable `ALLOWED_ORIGINS` as a comma-separated list.
// If not provided, fall back to a safe default set used for local development.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : [
      // Localhost (HTTPS)
      "https://localhost:3000",
      "https://localhost:5002",
      "https://localhost:5000",
      "https://localhost:5003",
      "https://localhost:5173",
      // Localhost (HTTP)
      "http://localhost:3000",
      "http://localhost:5002",
      "http://localhost:5000",
      "http://localhost:5003",
      "http://localhost:5173",
      // 127.0.0.1 loopback (HTTPS)
      "https://127.0.0.1:3000",
      "https://127.0.0.1:5002",
      "https://127.0.0.1:5000",
      "https://127.0.0.1:5003",
      "https://127.0.0.1:5173",
      // 127.0.0.1 loopback (HTTP)
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5002",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:5003",
      "http://127.0.0.1:5173",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error("Not allowed by CORS")); // Block the request
      }
    },
    methods: ["GET", "POST", "OPTIONS"], // Allow GET, POST, and preflight OPTIONS
    credentials: true, // Enable sending credentials (e.g., cookies, authorization headers)
  })
);

// Configure session middleware for managing user sessions
app.use(
  session({
    secret: "asdfqwerqefadsfasdfqwerqe", // Secret key used to sign session cookies
    resave: false, // Prevent resaving a session that hasn't been modified
    saveUninitialized: true, // Save sessions that are new but unmodified
    cookie: {
      httpOnly: true,
      secure: true, // Set to `true` if you're using HTTPS
      sameSite: 'None', // Allow cross-origin cookie usage
    }
  })
);

// Define a route for the root URL ("/") that sends a confirmation message
app.get("/", (req, res) => {
  res.send("Hello, the server is running!"); // Response for the root route
});

// Define a route to test session functionality and retrieve stored emails
app.get("/test-session", (req, res) => {
  res.json({ emails: req.session.emails }); // Respond with emails stored in the session
});

// Define an array of user credentials for authentication
const users = [
  { email: "ldf.gaming098@gmail.com", password: "$Hamgod123" },
  { email: "christianfriolo2003@gmail.com", password: "$hamgod123" },
  { email: "christianqwert107@gmail.com", password: "zaytanman123" },
  { email: "example2@gmail.com", password: "examplePass2" },
];

// Define a login route for authenticating users
app.post("/api/login", (req, res) => {
  const { email, password } = req.body; // Extract email and password from the request body
  const user = users.find(
    (user) => user.email === email && user.password === password // Find a matching user
  );

  if (user) {
    req.session.emails = email; // Store the user's email in the session
    console.log("Session after login:", req.session); // Log session details for debugging

    res.status(200).json({ message: "Login successful", email: user.email }); // Respond with success
  } else {
    res.status(400).json({ message: "Invalid email or password" }); // Respond with error
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.clearCookie("connect.sid"); // Clear the session cookie
    res.status(200).json({ message: "Logged out successfully" });
  });
});

// Use Gmail routes for handling authentication and email operations
app.use("/auth/gmail", gmailRoutes);

// Define a catch-all route to handle unknown or unsupported routes
app.use((req, res) => {
  res.status(404).send("Route not found"); // Respond with a 404 Not Found error
});

// Start server in a way that's safe on Vercel (platform provides HTTPS)
const PORT = process.env.PORT || process.env.BACKEND_PORT || 5002; // Ensure backend uses BACKEND_PORT or default 5002

// Detect Vercel or similar serverless hosting environment. Vercel exposes
// `VERCEL` or `VERCEL_ENV` / `NOW_REGION` environment variables at runtime.
const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION);

if (isVercel) {
  // On Vercel the platform terminates TLS for us; do not attempt to load local SSL files.
  console.log("Detected Vercel environment - not loading local SSL files. Using platform HTTPS.");
  app.listen(PORT, () => {
    console.log(`Server running (HTTP) on port ${PORT} — Vercel provides HTTPS externally.`);
  });
} else {
  // Attempt to use local SSL files when available (development / self-hosted)
  const keyPath = process.env.SSL_KEY_FILE || "ssl/localhost-key.pem";
  const certPath = process.env.SSL_CRT_FILE || "ssl/localhost-cert.pem";

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      https.createServer(options, app).listen(PORT, () => {
        const host = process.env.BACKEND_HOST || "localhost";
        console.log(`HTTPS server running at https://${host}:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start HTTPS server, falling back to HTTP:', err);
      app.listen(PORT, () => {
        console.log(`Server running (HTTP) on port ${PORT}`);
      });
    }
  } else {
    console.warn(`SSL files not found at ${keyPath} / ${certPath}. Starting HTTP server.`);
    app.listen(PORT, () => {
      console.log(`Server running (HTTP) on port ${PORT}`);
    });
  }
}

