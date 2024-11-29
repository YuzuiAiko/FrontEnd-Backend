const express = require("express");
const router = express.Router();
const axios = require("axios");

// Outlook login route
router.get("/login", (req, res) => {
  const authorizationUrl = `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.OUTLOOK_CLIENT_ID}&response_type=code&redirect_uri=${process.env.OUTLOOK_REDIRECT_URI}&scope=openid+profile+email+https://graph.microsoft.com/Mail.Read`;

  res.redirect(authorizationUrl);
});

// Outlook callback route
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  // Exchange the authorization code for a token
  try {
    const tokenResponse = await axios.post(`https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}/oauth2/v2.0/token`, {
      client_id: process.env.OUTLOOK_CLIENT_ID,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.OUTLOOK_REDIRECT_URI,
      grant_type: "authorization_code",
      scope: "openid profile email https://graph.microsoft.com/Mail.Read",
    });
    
    console.log("Token response:", tokenResponse.data); // Add this line to inspect the token response
    
    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: "Failed to retrieve access token" });
    }
    


    // Use the access token to fetch email data
    const emailResponse = await axios.get("https://graph.microsoft.com/v1.0/me/messages", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    res.json(emailResponse.data);
  }  catch (error) {
    console.error("Error fetching Outlook data:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch Outlook data", details: error.response?.data || error.message });
  }
});

module.exports = router;
