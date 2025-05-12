export const emailProviders = {
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GMAIL_REDIRECT_URI,
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.labels",
    ],
    tokenRevokeUrl: "https://oauth2.googleapis.com/revoke",
  },
  outlook: {
    clientId: process.env.OUTLOOK_CLIENT_ID,
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    redirectUri: process.env.OUTLOOK_REDIRECT_URI,
    scopes: [
      "https://outlook.office.com/Mail.Read",
      "https://outlook.office.com/Mail.Send",
    ],
    tokenRevokeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/logout",
  },
  imap: {
    imapHost: process.env.IMAP_HOST,
    imapPort: process.env.IMAP_PORT,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
  },
};
