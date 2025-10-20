import express from "express"; // Import the express module
import { google } from "googleapis"; // Import the googleapis module for Google API integration
import axios from "axios"; // Import axios for making HTTP requests
import { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI } from '../config.js';

const router = express.Router(); // Create a new router instance for defining Gmail routes

// Initialize the OAuth2 client with credentials for authentication
const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI
);

// Route to start the Google OAuth2 login process
// Accept ?redirect=... as a query param, fallback to .env FRONTEND_REDIRECT_URL
import { FRONTEND_REDIRECT_URL } from '../config.js';
router.get("/login", (req, res) => {
  const redirectUrl = req.query.redirect || FRONTEND_REDIRECT_URL;
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.labels",
    ],
    state: redirectUrl // Pass frontend redirect target in state
  });
  res.redirect(authUrl);
});

// Callback route to handle the response from Google after login
router.get("/callback", async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;
    console.log("OAuth2 tokens:", tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Move all email fetching/classification logic inside the try block
    const labels = ["INBOX", "IMPORTANT", "SPAM", "DRAFT"];
    const messages = [];
    const emailBodies = [];
    for (const label of labels) {
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 99,
        labelIds: [label],
      });
      console.log(`Fetched messages for label ${label}:`, response.data);
      if (response.data.messages) {
        const messageIds = response.data.messages.map((msg) => msg.id);
        for (const messageId of messageIds) {
          const messageDetails = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
          });
          console.log("Message details:", messageDetails.data);
          const customLabels = mapGmailLabels(messageDetails.data.labelIds);
          const emailData = {
            sender: extractEmailSender(getEmailHeader(messageDetails.data.payload.headers, "From")),
            subject: getEmailHeader(messageDetails.data.payload.headers, "Subject"),
            body: getEmailBody(messageDetails.data.payload),
            date: new Date(parseInt(messageDetails.data.internalDate)).toLocaleString(),
            labels: customLabels,
          };
          messages.push(emailData);
          emailBodies.push(emailData.body);
        }
      }
    }
    console.log("Email Bodies to Classify: ", emailBodies);
    // Call classifier
    const classificationResponse = await axios.post("http://localhost:5001/classify", {
      emails: emailBodies,
    });
    const classifications = classificationResponse.data.predictions;
    messages.forEach((msg, index) => {
      msg.classification = classifications[index];
    });
    req.session.emails = messages;
    console.log("Emails stored in session:", req.session.emails);

    // Redirect to frontend, default to /home unless overridden
    const frontendBase = req.query.state || FRONTEND_REDIRECT_URL || '/';
    const postAuthRoute = process.env.FRONTEND_POSTAUTH_ROUTE || '/home';
    let finalRedirect = frontendBase;
    // Only append if not already present
    if (!finalRedirect.endsWith(postAuthRoute)) {
      finalRedirect = finalRedirect.replace(/\/$/, '') + postAuthRoute;
    }
    return res.redirect(finalRedirect);
  } catch (error) {
    console.error("Error in Gmail callback:", error);
    res.status(500).json({ error: "Failed to fetch Gmail emails." });
  }
});

// Map Gmail label IDs to custom labels for better readability
function mapGmailLabels(gmailLabels) {
  const labelMap = {
    INBOX: "Inbox",
    IMPORTANT: "Important",
    SPAM: "Spam",
    DRAFT: "Draft",
    SENT: "Sent",
  };

  return gmailLabels.map((label) => labelMap[label] || label); // Default to the original label if no mapping exists
}

// Route to retrieve emails stored in the session
router.get("/emails", (req, res) => {
  if (!req.session || !req.session.emails) {
    return res.status(404).json({ error: "No emails found in session." }); // Respond with an error if no emails are found
  }

  console.log("Session Emails: ", req.session.emails);
  res.json({ emails: req.session.emails }); // Respond with emails
});

// Route to send an email using the Gmail API
router.post("/send", async (req, res) => {
  if (!req.session.tokens) {
    return res.status(400).json({ error: "User not authorized" }); // Respond with error if user is not authorized
  }

  const { to, subject, body } = req.body; // Extract email details from request body

  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing required email parameters" }); // Respond with error for missing parameters
  }

  oauth2Client.setCredentials(req.session.tokens); // Set OAuth2 credentials from session
  const gmail = google.gmail({ version: "v1", auth: oauth2Client }); // Create Gmail client

  const rawMessage = createRawMessage(to, subject, body); // Create a raw email message

  try {
    const response = await gmail.users.messages.send({
      userId: "me", // Send email as the authenticated user
      requestBody: {
        raw: rawMessage, // Attach the raw email message
      },
    });

    console.log("Email sent:", response);
    res.json({ success: true, message: "Email sent successfully!" }); // Respond with success message
  } catch (error) {
    console.error("Error sending email:", error.response ? error.response.data : error); // Log any errors
    res.status(500).json({ error: "Failed to send email" }); // Respond with error
  }
});

// Create a raw email message encoded in base64
function createRawMessage(to, subject, body) {
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=UTF-8", // Specify HTML content
    "",
    body, // Email body
  ];
  const message = messageParts.join("\n");

  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_"); // Encode in base64 and make URL-safe
}

// Extract a specific header value from email headers
function getEmailHeader(headers, name) {
  const header = headers.find((h) => h.name === name);
  return header ? header.value : null; // Return header value or null if not found
}

// Extract the sender's email address from the "From" header
function extractEmailSender(fromHeader) {
  if (!fromHeader) return "Unknown Sender"; // Handle missing headers
  const match = fromHeader.match(/<([^>]+)>/); // Extract email address from angle brackets
  return match ? match[1] : fromHeader; // Return the address or the original header
}

// Get the email body, handling base64-encoded data
function getEmailBody(payload) {
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8"); // Decode base64 body
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8"); // Decode HTML part
      }
    }
  }
  return "No HTML email body found."; // Fallback for missing body
}

export default router; // Export the router for use in other modules
