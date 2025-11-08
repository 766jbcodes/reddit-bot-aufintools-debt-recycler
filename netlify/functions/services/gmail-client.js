/** Gmail API client for fetching F5Bot emails */
const { google } = require('googleapis');
const cheerio = require('cheerio');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

class GmailClient {
  constructor(credentialsFile = null, tokenFile = null) {
    this.credentialsFile = credentialsFile;
    this.tokenFile = tokenFile;
    this.service = null;
  }

  async authenticate() {
    /** Authenticate and create Gmail service */
    // Check for credentials in environment variable (for Netlify)
    const credentialsJson = process.env.GMAIL_CREDENTIALS_JSON;
    const tokenJson = process.env.GMAIL_TOKEN_JSON;

    // Handle credentials
    let credentialsData = null;
    if (credentialsJson) {
      // Decode base64 if needed, or use JSON directly
      try {
        credentialsData = JSON.parse(Buffer.from(credentialsJson, 'base64').toString('utf-8'));
      } catch (e) {
        try {
          credentialsData = JSON.parse(credentialsJson);
        } catch (e2) {
          throw new Error('Invalid GMAIL_CREDENTIALS_JSON format');
        }
      }
    } else if (this.credentialsFile) {
      try {
        const credsContent = await fs.readFile(this.credentialsFile, 'utf-8');
        credentialsData = JSON.parse(credsContent);
      } catch (e) {
        throw new Error('Failed to read credentials file');
      }
    } else {
      throw new Error('Gmail credentials not found. Set GMAIL_CREDENTIALS_JSON environment variable or provide credentials.json file.');
    }

    // Handle token
    let tokenData = null;
    if (tokenJson) {
      try {
        tokenData = JSON.parse(Buffer.from(tokenJson, 'base64').toString('utf-8'));
      } catch (e) {
        try {
          tokenData = JSON.parse(tokenJson);
        } catch (e2) {
          throw new Error('Invalid GMAIL_TOKEN_JSON format');
        }
      }
    } else if (this.tokenFile) {
      try {
        const tokenContent = await fs.readFile(this.tokenFile, 'utf-8');
        tokenData = JSON.parse(tokenContent);
      } catch (e) {
        // Token file doesn't exist or is invalid
      }
    }

    if (!tokenData) {
      throw new Error(
        'Gmail token not found. Set GMAIL_TOKEN_JSON environment variable ' +
        'or provide token.json file.'
      );
    }

    // Create OAuth2 client with credentials and token
    const { OAuth2Client } = require('google-auth-library');

    // Extract client_id and client_secret from credentials
    const clientId = credentialsData.installed?.client_id || credentialsData.web?.client_id || credentialsData.client_id;
    const clientSecret = credentialsData.installed?.client_secret || credentialsData.web?.client_secret || credentialsData.client_secret;
    const redirectUri = credentialsData.installed?.redirect_uris?.[0] || credentialsData.web?.redirect_uris?.[0] || credentialsData.redirect_uris?.[0];

    if (!clientId || !clientSecret) {
      throw new Error('Invalid credentials: missing client_id or client_secret');
    }

    const oAuth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri
    );

    // Clean token data - only include fields needed for OAuth2Client.setCredentials
    // Remove client_id, client_secret, token_uri if they exist in tokenData
    const cleanTokenData = {
      access_token: tokenData.token || tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date || (tokenData.expiry ? new Date(tokenData.expiry).getTime() : null),
      scope: tokenData.scopes?.join(' ') || tokenData.scope,
      token_type: tokenData.token_type || 'Bearer'
    };

    // Set credentials from cleaned token
    oAuth2Client.setCredentials(cleanTokenData);

    // Refresh token if expired
    const expiryDate = cleanTokenData.expiry_date;
    if (expiryDate && expiryDate < Date.now() && cleanTokenData.refresh_token) {
      try {
        console.log('Access token expired, refreshing...');
        const newCreds = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newCreds.credentials);
        console.log('Access token refreshed successfully');
        
        // Save refreshed token if we have a file path (local development)
        if (this.tokenFile && !process.env.NETLIFY) {
          await fs.writeFile(this.tokenFile, JSON.stringify(newCreds.credentials));
        }
        
        // Note: In Netlify, we can't update environment variables at runtime
        // The refreshed token will be used for this execution, but the env var
        // will still contain the old token. This is fine because:
        // 1. The refresh_token doesn't change
        // 2. The next execution will refresh again if needed
        // 3. The refresh_token is what matters for long-term access
      } catch (error) {
        throw new Error(`Failed to refresh token: ${error.message}`);
      }
    }
    
    // Create Gmail service
    this.service = google.gmail({ version: 'v1', auth: oAuth2Client });
    return this.service;
  }

  async getUnreadEmails(query) {
    /** Fetch unread emails matching the query */
    if (!this.service) {
      await this.authenticate();
    }

    try {
      const response = await this.service.users.messages.list({
        userId: 'me',
        q: query
      });

      const messages = response.data.messages || [];

      if (messages.length === 0) {
        return [];
      }

      // Fetch full message details
      const emailData = [];
      for (const msg of messages) {
        const message = await this.service.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });
        emailData.push(message.data);
      }

      return emailData;
    } catch (error) {
      console.error(`An error occurred: ${error}`);
      return [];
    }
  }

  async markAsRead(messageId) {
    /** Mark an email as read */
    if (!this.service) {
      await this.authenticate();
    }

    try {
      await this.service.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (error) {
      console.error(`Error marking email as read: ${error}`);
    }
  }

  getEmailBody(message) {
    /** Extract email body text from message */
    const payload = message.payload || {};

    const extractText = (part) => {
      /** Recursively extract text from email parts */
      if (part.mimeType === 'text/plain') {
        const data = part.body?.data;
        if (data) {
          return Buffer.from(data, 'base64').toString('utf-8');
        }
      } else if (part.mimeType === 'text/html') {
        const data = part.body?.data;
        if (data) {
          const html = Buffer.from(data, 'base64').toString('utf-8');
          // Simple HTML to text conversion using cheerio
          const $ = cheerio.load(html);
          return $.text();
        }
      } else if (part.parts) {
        const textParts = [];
        for (const subpart of part.parts) {
          const text = extractText(subpart);
          if (text) {
            textParts.push(text);
          }
        }
        return textParts.join('\n');
      }
      return null;
    };

    return extractText(payload) || '';
  }

  async getUserEmail() {
    /** Get the authenticated user's email address */
    if (!this.service) {
      await this.authenticate();
    }

    try {
      const profile = await this.service.users.getProfile({
        userId: 'me'
      });
      return profile.data.emailAddress || '';
    } catch (error) {
      console.error(`Error getting user email: ${error}`);
      return '';
    }
  }

  async sendEmail(toEmail, subject, bodyText, bodyHtml = null) {
    /** Send an email via Gmail API */
    if (!this.service) {
      await this.authenticate();
    }

    try {
      // Get user's email if 'to' is empty
      if (!toEmail) {
        toEmail = await this.getUserEmail();
      }

      // Create message
      const message = this._createMessage(toEmail, subject, bodyText, bodyHtml);

      // Send message
      const sentMessage = await this.service.users.messages.send({
        userId: 'me',
        requestBody: message
      });

      return {
        success: true,
        message_id: sentMessage.data.id
      };
    } catch (error) {
      console.error(`Error sending email: ${error}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  _createMessage(toEmail, subject, bodyText, bodyHtml = null) {
    /** Create a message object for sending */
    const messageParts = [];

    if (bodyHtml) {
      // Create multipart message with HTML
      messageParts.push(
        `To: ${toEmail}\r\n` +
        `Subject: ${subject}\r\n` +
        `Content-Type: multipart/alternative; boundary="boundary123"\r\n\r\n` +
        `--boundary123\r\n` +
        `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
        `${bodyText}\r\n` +
        `--boundary123\r\n` +
        `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
        `${bodyHtml}\r\n` +
        `--boundary123--`
      );
    } else {
      // Plain text message
      messageParts.push(
        `To: ${toEmail}\r\n` +
        `Subject: ${subject}\r\n` +
        `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
        `${bodyText}`
      );
    }

    // Encode message
    const rawMessage = Buffer.from(messageParts.join(''))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return { raw: rawMessage };
  }
}

module.exports = GmailClient;

