import express from "express"; // Import the express module
import { google } from "googleapis"; // Import the googleapis module for Google API integration
import axios from "axios"; // Import axios for making HTTP requests

const router = express.Router(); // Create a new router instance for defining Gmail routes

if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REDIRECT_URI) {
  throw new Error("Missing required environment variables. Please check your .env file.");
}

// Google OAuth2 client credentials
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID; // Client ID for Google OAuth2
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET; // Client Secret for Google OAuth2
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI; // Redirect URI after Google login

// Initialize the OAuth2 client with credentials for authentication
const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI
);

// Route to start the Google OAuth2 login process
router.get("/login", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Request a refresh token for long-term use
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly", // Read-only access to Gmail
      "https://www.googleapis.com/auth/gmail.modify", // Modify access to Gmail
      "https://www.googleapis.com/auth/gmail.compose", // Compose email access
      "https://www.googleapis.com/auth/gmail.labels", // Access to Gmail labels
    ],
  });
  res.redirect(authUrl); // Redirect user to the Google OAuth2 login page
});

// Callback route to handle the response from Google after login
router.get("/callback", async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code); // Exchange authorization code for tokens
    oauth2Client.setCredentials(tokens); // Set the OAuth2 client credentials
    req.session.tokens = tokens; // Save tokens in the session

    const gmail = google.gmail({ version: "v1", auth: oauth2Client }); // Create a Gmail API client instance

    // Define labels to categorize emails
    const labels = ["INBOX", "IMPORTANT", "SPAM", "DRAFT"];
    const messages = []; // Store email data
    const emailBodies = []; // Store email bodies for classification

    // Fetch and process emails for each label
    for (const label of labels) {
      const response = await gmail.users.messages.list({
        userId: "me", // 'me' refers to the authenticated user
        maxResults: 99, // Limit the number of emails fetched
        labelIds: [label], // Filter emails by label
      });

      if (response.data.messages) {
        const messageIds = response.data.messages.map((msg) => msg.id); // Extract message IDs

        // Retrieve details for each email
        for (const messageId of messageIds) {
          const messageDetails = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
          });

          // Map Gmail labels to custom labels
          const customLabels = mapGmailLabels(messageDetails.data.labelIds);

          // Extract email details
          const emailData = {
            sender: extractEmailSender(getEmailHeader(messageDetails.data.payload.headers, "From")), // Extract sender
            subject: getEmailHeader(messageDetails.data.payload.headers, "Subject"), // Extract subject
            body: getEmailBody(messageDetails.data.payload), // Extract email body
            date: new Date(parseInt(messageDetails.data.internalDate)).toLocaleString(), // Convert date to readable format
            labels: customLabels, // Apply custom labels
          };
          messages.push(emailData); // Add email details to messages array
          emailBodies.push(emailData.body); // Add email body for classification
        }
      }
    }

    console.log("Email Bodies to Classify: ", emailBodies);

    // Call a separate classification service to classify email content
    const classificationResponse = await axios.post("http://localhost:5001/classify", {
      emails: emailBodies, // Send email bodies for classification
    });

    const classifications = classificationResponse.data.predictions; // Get classification results
    messages.forEach((msg, index) => {
      msg.classification = classifications[index]; // Attach classifications to email data
    });

    req.session.emails = messages; // Store processed emails in the session
    console.log("Emails stored in session:", req.session.emails);

    return res.redirect("https://localhost:3000/home"); // Redirect to the home page
  } catch (error) {
    console.error("Gmail login error:", error.message); // Log any errors
    res.status(500).json({ error: "Failed to fetch Gmail emails." }); // Respond with an error
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
