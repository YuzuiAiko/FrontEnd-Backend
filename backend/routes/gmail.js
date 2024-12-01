import express from "express";
import { google } from "googleapis";
import axios from "axios"; // Import axios for HTTP requests

const router = express.Router();
const GMAIL_CLIENT_ID = ;
const GMAIL_CLIENT_SECRET = ;
const GMAIL_REDIRECT_URI = "https://localhost:5000/auth/gmail/callback";

const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI
);

router.get("/login", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.labels",
    ],
  });
  res.redirect(authUrl);
});

router.get("/callback", async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const response = await gmail.users.messages.list({ 
      userId: "me", 
      maxResults: 99,
      labelIds: ["INBOX"]  // Fetch emails with the INBOX label
    });

    if (response.data.messages) {
      const messageIds = response.data.messages.map((msg) => msg.id);
      const messages = [];
      const emailBodies = [];

      for (const messageId of messageIds) {
        const messageDetails = await gmail.users.messages.get({ userId: "me", id: messageId });
        const customLabels = mapGmailLabels(messageDetails.data.labelIds);  // Map Gmail labels

        const emailData = {
          sender: extractEmailSender(getEmailHeader(messageDetails.data.payload.headers, "From")),
          subject: getEmailHeader(messageDetails.data.payload.headers, "Subject"),
          body: getEmailBody(messageDetails.data.payload),
          labels: customLabels  // Include custom labels
        };
        messages.push(emailData);
        emailBodies.push(emailData.body);
      }

      console.log("Email Bodies to Classify: ", emailBodies);  // Log email bodies being sent

      // Call the classifier endpoint
      const classificationResponse = await axios.post("http://localhost:5001/classify", {
        emails: emailBodies
      });

      const classifications = classificationResponse.data.predictions;
      messages.forEach((msg, index) => {
        msg.classification = classifications[index];
      });

      req.session.emails = messages;
      console.log("Emails stored in session:", req.session.emails);

      return res.redirect("https://localhost:3000/home");
    } else {
      res.status(404).json({ error: "No Gmail messages found." });
    }
  } catch (error) {
    console.error("Gmail login error:", error.message);
    res.status(500).json({ error: "Failed to fetch Gmail emails." });
  }
});


// Map Gmail Labels to Custom Labels
function mapGmailLabels(gmailLabels) {
  const labelMap = {
    "INBOX": "Inbox",
    "IMPORTANT": "Important",
    "SPAM": "Spam",
    "DRAFT": "Draft",
    "SENT": "Sent",
    // Add other mappings as needed
  };

  return gmailLabels.map(label => labelMap[label] || label);
}


router.get("/emails", (req, res) => {
  if (!req.session || !req.session.emails) {
    return res.status(404).json({ error: "No emails found in session." });
  }

  console.log("Session Emails: ", req.session.emails);
  res.json({ emails: req.session.emails });
});

router.post("/send", async (req, res) => {
  if (!req.session.tokens) {
    return res.status(400).json({ error: "User not authorized" });
  }

  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing required email parameters" });
  }

  oauth2Client.setCredentials(req.session.tokens);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const rawMessage = createRawMessage(to, subject, body);

  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });

    console.log("Email sent:", response);

    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error.response ? error.response.data : error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

function createRawMessage(to, subject, body) {
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ];
  const message = messageParts.join("\n");

  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

function getEmailHeader(headers, name) {
  const header = headers.find((h) => h.name === name);
  return header ? header.value : null;
}

function extractEmailSender(fromHeader) {
  if (!fromHeader) return "Unknown Sender";
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1] : fromHeader;
}

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

export default router;
