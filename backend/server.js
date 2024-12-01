import express from "express";
import https from "https";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import gmailRoutes from "./routes/gmail.js";
// Remove the invalid import
// import { EmailClassifier } from "./classifier/svm_model"; 

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.use(
  cors({
    origin: "https://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(
  session({
    secret: "asdfqwerqefadsfasdfqwerqe",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.get("/", (req, res) => {
  res.send("Hello, the server is running!");
});

app.get("/test-session", (req, res) => {
  res.json({ emails: req.session.emails });
});

const users = [
  { email: "example2@gmail.com", password: "examplePass2" },
];

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(
    (user) => user.email === email && user.password === password
  );

  if (user) {
    req.session.emails = email;
    console.log("Session after login:", req.session);

    res.status(200).json({ message: "Login successful", email: user.email });
  } else {
    res.status(400).json({ message: "Invalid email or password" });
  }
});

app.use("/auth/gmail", gmailRoutes);

app.use((req, res) => {
  res.status(404).send("Route not found");
});

const options = {
  key: fs.readFileSync(process.env.SSL_KEY_FILE || "ssl/localhost-key.pem"),
  cert: fs.readFileSync(process.env.SSL_CRT_FILE || "ssl/localhost-cert.pem"),
};

const PORT = process.env.PORT || 5000;
https.createServer(options, app).listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}`);
});
