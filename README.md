# Reddit Debt Recycling Bot

Automated Reddit bot that monitors F5Bot emails for debt recycling discussions and responds with helpful information.

## Features

- Monitors Gmail for F5Bot emails about debt recycling
- Uses Gemini AI to determine post relevance
- Automatically generates helpful responses
- Posts responses to Reddit automatically
- Tracks processed emails to avoid duplicates

## Setup

### 1. Gmail API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Desktop app)
5. Download credentials as `credentials.json` and place in project root

### 2. Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Reddit API Setup

1. Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Click "create another app" or "create app"
3. Fill in:
   - Name: Your bot name
   - Type: script
   - Description: (optional)
   - About URL: (optional)
   - Redirect URI: `http://localhost:8080`
4. Note your client ID (under the app name) and secret

### 4. Get Gmail Token (One-time Setup)

Run this locally first to get your Gmail token:

```bash
python setup_gmail_token.py
```

This will:
1. Open a browser for OAuth authentication
2. Save `token.json` locally
3. Display the token JSON that you'll need for Netlify

Copy the token JSON output - you'll need it for the `GMAIL_TOKEN_JSON` environment variable.

### 5. Environment Variables for Netlify

Set these in Netlify (Site settings > Environment variables):

**Required:**
- `GEMINI_API_KEY` - Your Gemini API key
- `REDDIT_CLIENT_ID` - Your Reddit app client ID  
- `REDDIT_CLIENT_SECRET` - Your Reddit app secret
- `REDDIT_USERNAME` - Your Reddit username
- `REDDIT_PASSWORD` - Your Reddit password
- `REDDIT_USER_AGENT` - Format: `YourBotName/1.0 by /u/yourusername`
- `GMAIL_CREDENTIALS_JSON` - Contents of `credentials.json` as JSON string (or base64 encoded)
- `GMAIL_TOKEN_JSON` - Token JSON from setup script (or base64 encoded)
- `NETLIFY` - Set to `true` (tells the bot it's running on Netlify)

**Optional:**
- `DB_PATH` - Path for SQLite database (default: `/tmp/processed_emails.db`)
- `GMAIL_QUERY` - Custom email query (default: `from:f5bot@f5bot.com subject:"debt recycling"`)
- `SUMMARY_EMAIL` - Email address to send summaries to (defaults to authenticated Gmail account)

**Note:** The bot now requires Gmail send permissions. You'll need to re-run `python setup_gmail_token.py` to get a new token with send permissions.

**Note**: For `GMAIL_CREDENTIALS_JSON` and `GMAIL_TOKEN_JSON`, you can either:
- Paste the JSON directly as a string (escape quotes properly)
- Base64 encode the JSON and paste the encoded string

## Deployment

### Netlify

**Important Notes:**
- The scheduled function uses a JavaScript wrapper (`reddit-bot.js`) that executes the Python script
- Netlify Functions need Python 3.9+ available in the runtime
- All credentials must be set as environment variables in Netlify

**Deployment Steps:**

1. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

2. Install Netlify CLI: `npm install -g netlify-cli`

3. Login: `netlify login`

4. Link your site: `netlify link` (or create new: `netlify init`)

5. Set all environment variables in Netlify dashboard (Site settings > Environment variables)

6. Deploy: `netlify deploy --prod`

The function will run automatically every 2 hours via the scheduled function.

**Troubleshooting:**
- If Python isn't available, you may need to use a build plugin or different runtime
- Check Netlify function logs in the dashboard for errors
- Ensure all environment variables are set correctly

### Local Testing

1. Install dependencies: 
   ```bash
   pip install -r requirements.txt
   ```

2. Get Gmail token (one-time): `python setup_gmail_token.py`

3. Set environment variables or modify `config.py`

4. Run: `python bot.py`

## Configuration

Edit `config.py` to customise:
- Email query filters
- Website URLs
- AI prompts
- Database location

## Notes

- The bot runs every 2 hours (configurable in `netlify.toml`)
- Emails are marked as read after processing
- All processed emails are tracked in a database
- The bot only responds to posts determined as relevant by Gemini AI
- **Email Summaries:** After each run, you'll receive an email summary with:
  - Number of emails processed
  - Relevant posts found
  - Links to all posted comments
  - Any errors encountered
  - All-time statistics

