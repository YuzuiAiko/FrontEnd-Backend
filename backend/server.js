import express from "express"; // Import the express module
import https from "https"; // Import the https module for creating HTTPS server
import fs from "fs"; // Import the fs module for file system operations
import bodyParser from "body-parser"; // Import the body-parser module to parse request bodies
import cors from "cors"; // Import the cors module to enable Cross-Origin Resource Sharing (CORS)
import session from "express-session"; // Import the express-session module for session management
import gmailRoutes from "./routes/gmail.js"; // Import Gmail-related routes from a separate file

const app = express(); // Create an Express application instance

app.use(bodyParser.json()); // Use body-parser to parse JSON request bodies

// Parse allowed origins from environment variable or use defaults
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim().replace(/^"|"$/g, ""))
  : [
      // Default localhost origins
      "https://localhost:3000",
      "https://localhost:5002",
      "https://localhost:5000",
      "https://localhost:5003",
      "https://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5002",
      "http://localhost:5000",
      "http://localhost:5003",
      "http://localhost:5173",
      "https://127.0.0.1:3000",
      "https://127.0.0.1:5002",
      "https://127.0.0.1:5000",
      "https://127.0.0.1:5003",
      "https://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5002",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:5003",
      "http://127.0.0.1:5173",
    ];

const allowedOrigins = allowedOriginsEnv;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error("Not allowed by CORS")); // Block the request
      }
    },
    methods: ["GET", "POST"], // Allow only GET and POST methods
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

// Load SSL certificate and key for HTTPS server
const options = {
  key: fs.readFileSync(process.env.SSL_KEY_FILE || "ssl/localhost-key.pem"), // Load SSL private key
  cert: fs.readFileSync(process.env.SSL_CRT_FILE || "ssl/localhost-cert.pem"), // Load SSL certificate
};

// Start the HTTPS server on the specified port
const PORT = process.env.PORT || 5000; // Ensure backend uses port 5000
https.createServer(options, app).listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}`); // Log server start message
});

