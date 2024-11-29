const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Gmail login route
router.get("/login", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.labels",
      "https://www.googleapis.com/auth/gmail.send",  // Added the send email scope
    ],
  });
  res.redirect(authUrl);
});

// Gmail callback route
// Gmail callback route
router.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens in the session
    req.session.tokens = tokens;

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const response = await gmail.users.messages.list({ userId: "me", maxResults: 50 });

    if (response.data.messages) {
      const messageIds = response.data.messages.map((msg) => msg.id);
      const messages = [];

      for (const messageId of messageIds) {
        const messageDetails = await gmail.users.messages.get({ userId: "me", id: messageId });
        const emailData = {
          sender: extractEmailSender(getEmailHeader(messageDetails.data.payload.headers, "From")),
          subject: getEmailHeader(messageDetails.data.payload.headers, "Subject"),
          body: getEmailBody(messageDetails.data.payload),
        };
        messages.push(emailData);
      }

      // Store emails in session
      req.session.emails = messages;

      console.log("Emails stored in session:", req.session.emails);  // Debugging session content

      return res.redirect("https://localhost:3000/home"); // Redirect to home after storing emails
    } else {
      res.status(404).json({ error: "No Gmail messages found." });
    }
  } catch (error) {
    console.error("Gmail login error:", error.message);
    res.status(500).json({ error: "Failed to fetch Gmail emails." });
  }
});


// API to fetch stored emails
router.get("/emails", (req, res) => {
  if (!req.session || !req.session.emails) {
    return res.status(404).json({ error: "No emails found in session." });
  }

  console.log("Session Emails: ", req.session.emails); // Debugging session data
  res.json({ emails: req.session.emails });
});


// Send email route
router.post("/send", async (req, res) => {
  // Check if tokens are in the session
  if (!req.session.tokens) {
    return res.status(400).json({ error: "User not authorized" });
  }

  const { to, subject, body } = req.body;

  // Check if the required parameters are provided
  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing required email parameters" });
  }

  // Set credentials using tokens from session
  oauth2Client.setCredentials(req.session.tokens);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Create the raw message
  const rawMessage = createRawMessage(to, subject, body);

  try {
    // Send the email
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });

    console.log("Email sent:", response);

    // Send a success response
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error.response ? error.response.data : error);
    res.status(500).json({ error: "Failed to send email" });
  }
});





// Helper function to create a raw email message
function createRawMessage(to, subject, body) {
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ];
  const message = messageParts.join("\n");

  // Encode the message to base64url format
  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}


// Extract header data
function getEmailHeader(headers, name) {
  const header = headers.find((h) => h.name === name);
  return header ? header.value : null;
}

// Extract sender's email from "From" header
function extractEmailSender(fromHeader) {
  if (!fromHeader) return "Unknown Sender";
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1] : fromHeader;
}

// Extract the email body from the message
function getEmailBody(payload) {
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
  }
  return "No HTML email body found.";
}

module.exports = router;
