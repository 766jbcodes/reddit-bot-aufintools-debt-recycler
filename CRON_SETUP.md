# Setting Up Automated Scheduling for Reddit Bot

Since Netlify's scheduled functions have limitations with Python execution, we'll use an external cron service to trigger the bot.

## Option 1: Using cron-job.org (Recommended - Free)

1. Go to https://cron-job.org and create a free account
2. Click "Create cronjob"
3. Configure:
   - **Title**: Reddit Bot - Debt Recycling
   - **Address (URL)**: `https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler`
   - **Schedule**: Every 2 hours (`0 */2 * * *`)
   - **Request method**: GET
   - **Activate**: Yes
4. Save the cronjob

## Option 2: Using EasyCron (Free tier available)

1. Go to https://www.easycron.com and sign up
2. Create a new cron job:
   - **Cron Job Name**: Reddit Bot
   - **URL**: `https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler`
   - **Schedule Type**: Cron Expression
   - **Cron Expression**: `0 */2 * * *` (every 2 hours)
   - **HTTP Method**: GET
3. Save and activate

## Option 3: Using GitHub Actions (If repo is on GitHub)

Create `.github/workflows/reddit-bot.yml`:

```yaml
name: Reddit Bot

on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours
  workflow_dispatch:  # Allow manual trigger

jobs:
  trigger-bot:
    runs-on: ubuntu-latest
    steps:
      - name: Call Netlify Function
        run: |
          curl -X GET https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler
```

## Testing the Function

You can test the function manually by visiting:
```
https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler
```

Or using curl:
```bash
curl https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler
```

## Monitoring

Check function logs in Netlify Dashboard:
- Go to: https://app.netlify.com/projects/redditbot/logs/functions
- Look for `reddit-bot-handler` function logs

## Current Status

**Issue**: Netlify's build process isn't detecting the Python function automatically. The scheduled JS function is working but can't call the Python handler because it's not being deployed.

**Solution**: Use an external cron service (Option 1 or 2 above) to call the Python handler directly once it's deployed.

## Next Steps

1. **Deploy the Python function manually** or ensure it's properly configured
2. **Test the function URL** once deployed: `https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler`
3. **Set up external cron** using one of the options above
4. **Disable the JS scheduled function** (change schedule to a far future date or remove it) to avoid unnecessary calls

## Function Structure

- **Scheduled Function (JS)**: `netlify/functions/reddit-bot.js` - Currently runs every minute, trying to call Python handler
- **Python Handler**: `netlify/functions/reddit-bot-handler/handler.py` - Executes the actual bot logic (needs to be deployed)

