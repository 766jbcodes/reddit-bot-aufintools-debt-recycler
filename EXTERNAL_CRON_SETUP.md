# External Cron Setup Guide - Step by Step

## Overview

An external cron service will call your Netlify function on a schedule. Think of it as an external timer that pings your bot every 2 hours to make it run.

## Prerequisites

✅ **Before starting, we need the Python function to be accessible at:**
```
https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler
```

If you get a 404 when testing, the function isn't deployed yet - we'll fix that first.

---

## Step-by-Step: Using cron-job.org (Recommended)

### Step 1: Create Account
1. Go to **https://cron-job.org**
2. Click **"Sign up"** (top right)
3. Create a free account (email + password)
4. Verify your email if required

### Step 2: Create Cron Job
1. Once logged in, click **"Create cronjob"** (big green button or top menu)
2. You'll see a form with these fields:

### Step 3: Configure the Cron Job

Fill in these details:

**Title:**
```
Reddit Bot - Debt Recycling
```
(Just a label for your reference)

**Address (URL):**
```
https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler
```
(This is your Netlify function URL)

**Schedule:**
- Select **"Cron expression"**
- Enter: `0 */2 * * *`
- This means: "Run at minute 0 of every 2nd hour" (12:00 AM, 2:00 AM, 4:00 AM, etc.)

**Request method:**
- Select **"GET"**

**Activate:**
- Check the box to **activate** the cron job

### Step 4: Save
1. Click **"Create cronjob"** button at the bottom
2. You should see a success message

### Step 5: Test It
1. On your cron job list, find your new job
2. Click the **"Run now"** button (or similar test button)
3. Check if it executes successfully
4. Go to Netlify logs to see if your bot ran: https://app.netlify.com/projects/redditbot/logs/functions

---

## Understanding Cron Expressions

The format is: `minute hour day month weekday`

- `0 */2 * * *` = Every 2 hours at minute 0
- `0 * * * *` = Every hour at minute 0  
- `*/30 * * * *` = Every 30 minutes
- `0 9 * * *` = Every day at 9:00 AM

For your bot, `0 */2 * * *` means it runs:
- 12:00 AM (midnight)
- 2:00 AM
- 4:00 AM
- 6:00 AM
- 8:00 AM
- 10:00 AM
- 12:00 PM (noon)
- 2:00 PM
- 4:00 PM
- 6:00 PM
- 8:00 PM
- 10:00 PM

---

## Monitoring & Troubleshooting

### Check if Cron Job Ran
1. Go to cron-job.org dashboard
2. Click on your cron job
3. View the "Execution history" or "Logs" tab
4. You'll see when it ran and the response

### Check Bot Execution
1. Go to Netlify Dashboard: https://app.netlify.com/projects/redditbot/logs/functions
2. Look for `reddit-bot-handler` function logs
3. You should see execution logs, errors, or success messages

### Common Issues

**404 Error:**
- The Python function isn't deployed
- Check Netlify function logs to see if it exists

**500 Error:**
- The function ran but had an error
- Check Netlify logs for error details
- Usually means missing environment variables or code errors

**Timeout:**
- The function took too long (Netlify has a 10-second timeout on free tier, 26 seconds on pro)
- Your bot might be processing too many emails

---

## Disable the Old Scheduled Function

Once external cron is working, disable the JavaScript scheduled function:

1. Edit `netlify/functions/reddit-bot.js`
2. Change line 91 from:
   ```javascript
   exports.handler = schedule('* * * * *', handler);
   ```
   To:
   ```javascript
   // Disabled - using external cron instead
   // exports.handler = schedule('* * * * *', handler);
   exports.handler = async () => ({ statusCode: 200, body: 'Disabled' });
   ```
3. Deploy: `netlify deploy --prod`

This stops the function from running every minute and trying to call the Python handler.

---

## Alternative: EasyCron

If cron-job.org doesn't work for you:

1. Go to **https://www.easycron.com**
2. Sign up for free account
3. Create new cron job with same settings:
   - URL: `https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler`
   - Cron: `0 */2 * * *`
   - Method: GET

---

## Cost

Both services have **free tiers** that should be sufficient:
- **cron-job.org**: Free tier allows 1 cron job (perfect for this)
- **EasyCron**: Free tier allows limited executions per month

For running every 2 hours, that's 12 times per day = 360 times per month, which should be fine on free tiers.

---

## Next Steps

1. ✅ Get Python function deployed and accessible
2. ✅ Set up cron-job.org account
3. ✅ Create cron job pointing to your function
4. ✅ Test it manually
5. ✅ Monitor logs to ensure it's working
6. ✅ Disable the old JS scheduled function

