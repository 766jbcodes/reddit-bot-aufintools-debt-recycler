# Reddit Debt Recycling Bot

Automated Reddit bot that monitors F5Bot emails for debt recycling discussions and responds with helpful information.

## Features

- Monitors Gmail for F5Bot emails about debt recycling
- Uses Gemini AI to determine post relevance
- Automatically generates helpful responses
- Posts responses to Reddit automatically
- Tracks processed emails to avoid duplicates
- Sends email summaries after each run

## Architecture

- **Python Bot** (`bot.py`) - Main bot logic
- **Netlify Function** (`netlify/functions/reddit-bot-handler/`) - Serverless handler
- **Scheduled Execution** - External cron service calls the Netlify function every 2 hours

## Configuration

Edit `config.py` to customise:
- Email query filters
- Website URLs (calculator and learn pages)
- AI prompts for relevance checking and response generation
- Database location

## Environment Variables

Set these in Netlify (Site settings > Environment variables):

**Required:**
- `GEMINI_API_KEY` - Gemini API key
- `REDDIT_CLIENT_ID` - Reddit app client ID
- `REDDIT_CLIENT_SECRET` - Reddit app secret
- `REDDIT_USERNAME` - Reddit username
- `REDDIT_PASSWORD` - Reddit password
- `REDDIT_USER_AGENT` - Format: `YourBotName/1.0 by /u/yourusername`
- `GMAIL_CREDENTIALS_JSON` - Gmail OAuth credentials (JSON string or base64)
- `GMAIL_TOKEN_JSON` - Gmail OAuth token (JSON string or base64)
- `NETLIFY` - Set to `true`

**Optional:**
- `DB_PATH` - SQLite database path (default: `/tmp/processed_emails.db`)
- `GMAIL_QUERY` - Custom email query
- `SUMMARY_EMAIL` - Email for summaries (defaults to authenticated Gmail account)

## Local Development

1. Install dependencies: `pip install -r requirements.txt`
2. Get Gmail token: `python setup_gmail_token.py`
3. Set environment variables or modify `config.py`
4. Run: `python bot.py`

## Deployment

The bot is deployed on Netlify and connected to GitHub. Pushes to `main` branch trigger automatic deployments.

To set up external cron scheduling, use a service like cron-job.org to call:
```
https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler
```
Schedule: `0 */2 * * *` (every 2 hours)

## Notes

- Emails are marked as read after processing
- All processed emails are tracked in a database to avoid duplicates
- The bot only responds to posts determined as relevant by Gemini AI
- Email summaries are sent after each run with execution statistics
