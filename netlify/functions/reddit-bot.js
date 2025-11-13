/** Main Reddit bot orchestration */
const GmailClient = require('./services/gmail-client');
const F5BotEmailParser = require('./services/email-parser');
const GeminiService = require('./services/gemini-service');
const RedditClient = require('./services/reddit-client');
const EmailTracker = require('./services/database');
const {
  GMAIL_CREDENTIALS_FILE,
  GMAIL_TOKEN_FILE,
  GMAIL_QUERY,
  GEMINI_API_KEY,
  DB_PATH,
  SUMMARY_EMAIL
} = require('./services/config');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  /** Main bot execution */
  console.log('Starting Reddit Bot...');

  // Initialize services
  let gmail;
  try {
    // For Netlify, credentials come from env vars
    const credsFile = await fileExists(GMAIL_CREDENTIALS_FILE) ? GMAIL_CREDENTIALS_FILE : null;
    const tokenFile = await fileExists(GMAIL_TOKEN_FILE) ? GMAIL_TOKEN_FILE : null;
    gmail = new GmailClient(credsFile, tokenFile);
    await gmail.authenticate();
    console.log('[OK] Gmail authenticated');
  } catch (error) {
    console.error(`[ERROR] Gmail authentication failed: ${error.message}`);
    return;
  }

  let gemini;
  try {
    gemini = new GeminiService(GEMINI_API_KEY);
    console.log('[OK] Gemini service initialized');
  } catch (error) {
    console.error(`[ERROR] Gemini service initialization failed: ${error.message}`);
    return;
  }

  // Reddit client - optional for testing
  let reddit = null;
  try {
    reddit = new RedditClient();
    console.log('[OK] Reddit authenticated');
  } catch (error) {
    console.warn(`[WARNING] Reddit authentication failed: ${error.message}`);
    console.log('[INFO] Continuing in test mode - will not post to Reddit');
    // Continue without Reddit for testing
  }

  const tracker = new EmailTracker(DB_PATH);
  const parser = F5BotEmailParser;

  // Fetch emails
  console.log(`Fetching emails with query: ${GMAIL_QUERY}`);
  const emails = await gmail.getEmails(GMAIL_QUERY);
  console.log(`Found ${emails.length} emails`);

  if (emails.length === 0) {
    console.log('No new emails to process');
    // Send summary email even if no emails
    try {
      const stats = tracker.getStats();
      console.log(`Sending summary email (no emails found). Stats: ${JSON.stringify(stats)}`);
      await sendSummaryEmail(gmail, 0, 0, 0, [], [], stats);
      console.log('Summary email sent successfully');
    } catch (error) {
      console.error(`Error sending summary email: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    tracker.close();
    return;
  }

  let processedCount = 0;
  let relevantCount = 0;
  let postedCount = 0;
  const postedComments = []; // Track posted comments for summary
  const errors = []; // Track any errors

  for (const emailMsg of emails) {
    const emailId = emailMsg.id;

    // Check if already processed
    if (tracker.isProcessed(emailId)) {
      console.log(`Skipping already processed email: ${emailId}`);
      continue;
    }

    // Extract email content
    const emailBody = gmail.getEmailBody(emailMsg);
    const emailSubject = emailMsg.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No Subject';

    // Parse email to extract Reddit info
    const redditInfo = parser.parseEmail(emailBody, emailSubject);

    if (!redditInfo) {
      console.log(`Could not parse Reddit info from email: ${emailId}`);
      tracker.markProcessed(emailId, '', '', null, false);
      continue;
    }

    console.log(`\nProcessing: ${redditInfo.url}`);
    console.log(`Content preview: ${redditInfo.content.substring(0, 100)}...`);

    // Check relevance
    const relevanceResult = await gemini.checkRelevance(redditInfo.content);
    console.log(`Relevance: ${relevanceResult.relevant} - ${relevanceResult.explanation}`);

    if (!relevanceResult.relevant) {
      tracker.markProcessed(
        emailId,
        redditInfo.url,
        redditInfo.post_id,
        redditInfo.comment_id,
        false
      );
      processedCount++;
      continue;
    }

    relevantCount++;

    // Generate response
    console.log('Generating response...');
    const responseText = await gemini.generateResponse(redditInfo.content, redditInfo.url);
    console.log(`Generated response: ${responseText.substring(0, 100)}...`);

    // Post to Reddit (if authenticated)
    let result;
    if (reddit) {
      console.log('Posting to Reddit...');
      if (redditInfo.is_comment) {
        result = await reddit.replyToComment(redditInfo.comment_id, responseText);
      } else {
        result = await reddit.postComment(redditInfo.post_id, responseText);
      }
    } else {
      // Test mode - simulate success
      console.log('[TEST MODE] Would post to Reddit (skipped)');
      result = {
        success: false,
        error: 'Test mode - Reddit not authenticated'
      };
    }

    if (result.success) {
      console.log(`[OK] Posted successfully: ${result.comment_url}`);
      tracker.markProcessed(
        emailId,
        redditInfo.url,
        redditInfo.post_id,
        redditInfo.comment_id,
        true,
        true,
        result.comment_url
      );
      postedCount++;
      postedComments.push({
        original_url: redditInfo.url,
        comment_url: result.comment_url,
        response_preview: responseText.length > 150 ? responseText.substring(0, 150) + '...' : responseText
      });
    } else {
      const errorMsg = result.error || 'Unknown error';
      console.error(`[ERROR] Failed to post: ${errorMsg}`);
      errors.push({
        url: redditInfo.url,
        error: errorMsg
      });
      tracker.markProcessed(
        emailId,
        redditInfo.url,
        redditInfo.post_id,
        redditInfo.comment_id,
        true,
        false
      );
    }

    // Email will remain as read (inbox already marks them as read)
    processedCount++;
  }

  // Print summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('Processing complete!');
  console.log(`Emails processed: ${processedCount}`);
  console.log(`Relevant posts: ${relevantCount}`);
  console.log(`Responses posted: ${postedCount}`);
  console.log(`${'='.repeat(50)}`);

  const stats = tracker.getStats();
  console.log('\nTotal stats:');
  console.log(`  Total processed: ${stats.total_processed}`);
  console.log(`  Relevant: ${stats.relevant}`);
  console.log(`  Responses posted: ${stats.responses_posted}`);

  // Send summary email
  try {
    console.log(`Sending summary email. Processed: ${processedCount}, Relevant: ${relevantCount}, Posted: ${postedCount}`);
    await sendSummaryEmail(gmail, processedCount, relevantCount, postedCount, postedComments, errors, stats);
    console.log('Summary email sent successfully');
  } catch (error) {
    console.error(`Error sending summary email: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
  }

  tracker.close();
}

async function sendSummaryEmail(gmail, processedCount, relevantCount, postedCount, postedComments, errors, stats) {
  /** Send a summary email after bot execution */
  console.log('sendSummaryEmail called');
  // Get recipient email
  let recipient = SUMMARY_EMAIL;
  console.log(`SUMMARY_EMAIL from config: ${SUMMARY_EMAIL || 'not set'}`);
  if (!recipient) {
    console.log('Getting user email from Gmail...');
    recipient = await gmail.getUserEmail();
    console.log(`Got user email: ${recipient || 'none'}`);
  }

  if (!recipient) {
    console.error('No email address available for summary - SUMMARY_EMAIL not set and getUserEmail() returned empty');
    return;
  }

  console.log(`Sending summary email to: ${recipient}`);

  // Create email subject
  const now = new Date();
  const subject = `Reddit Bot Summary - ${now.toISOString().substring(0, 16).replace('T', ' ')}`;

  // Create email body (plain text)
  let bodyText = `Reddit Debt Recycling Bot - Execution Summary
${'='.repeat(60)}

Run Time: ${now.toISOString().substring(0, 19).replace('T', ' ')}

This Run:
  • Emails processed: ${processedCount}
  • Relevant posts found: ${relevantCount}
  • Responses posted: ${postedCount}
  • Errors: ${errors.length}

`;

  if (postedComments.length > 0) {
    bodyText += 'Posted Comments:\n';
    bodyText += '-'.repeat(60) + '\n';
    postedComments.forEach((comment, i) => {
      bodyText += `\n${i + 1}. Original Post/Comment: ${comment.original_url}\n`;
      bodyText += `   Your Response: ${comment.comment_url}\n`;
      bodyText += `   Preview: ${comment.response_preview}\n`;
    });
    bodyText += '\n';
  }

  if (errors.length > 0) {
    bodyText += 'Errors:\n';
    bodyText += '-'.repeat(60) + '\n';
    errors.forEach((error, i) => {
      bodyText += `\n${i + 1}. URL: ${error.url}\n`;
      bodyText += `   Error: ${error.error}\n`;
    });
    bodyText += '\n';
  }

  bodyText += `
All-Time Stats:
  • Total processed: ${stats.total_processed}
  • Total relevant: ${stats.relevant}
  • Total responses posted: ${stats.responses_posted}

${'='.repeat(60)}
`;

  // Create HTML version
  let bodyHtml = `<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        h2 { color: #333; }
        .stats { background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .stat-item { margin: 5px 0; }
        .comment { background-color: #e8f4f8; padding: 10px; margin: 10px 0; border-left: 3px solid #2196F3; }
        .error { background-color: #ffebee; padding: 10px; margin: 10px 0; border-left: 3px solid #f44336; }
        a { color: #2196F3; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h2>Reddit Debt Recycling Bot - Execution Summary</h2>
    <p><strong>Run Time:</strong> ${now.toISOString().substring(0, 19).replace('T', ' ')}</p>
    
    <div class="stats">
        <h3>This Run:</h3>
        <div class="stat-item">• Emails processed: <strong>${processedCount}</strong></div>
        <div class="stat-item">• Relevant posts found: <strong>${relevantCount}</strong></div>
        <div class="stat-item">• Responses posted: <strong>${postedCount}</strong></div>
        <div class="stat-item">• Errors: <strong>${errors.length}</strong></div>
    </div>
`;

  if (postedComments.length > 0) {
    bodyHtml += '<h3>Posted Comments:</h3>';
    postedComments.forEach((comment, i) => {
      bodyHtml += `
    <div class="comment">
        <p><strong>${i + 1}. Original Post/Comment:</strong><br>
        <a href="${comment.original_url}" target="_blank">${comment.original_url}</a></p>
        <p><strong>Your Response:</strong><br>
        <a href="${comment.comment_url}" target="_blank">${comment.comment_url}</a></p>
        <p><strong>Preview:</strong> ${comment.response_preview}</p>
    </div>
`;
    });
  }

  if (errors.length > 0) {
    bodyHtml += '<h3>Errors:</h3>';
    errors.forEach((error, i) => {
      bodyHtml += `
    <div class="error">
        <p><strong>${i + 1}. URL:</strong> <a href="${error.url}" target="_blank">${error.url}</a></p>
        <p><strong>Error:</strong> ${error.error}</p>
    </div>
`;
    });
  }

  bodyHtml += `
    <div class="stats">
        <h3>All-Time Stats:</h3>
        <div class="stat-item">• Total processed: <strong>${stats.total_processed}</strong></div>
        <div class="stat-item">• Total relevant: <strong>${stats.relevant}</strong></div>
        <div class="stat-item">• Total responses posted: <strong>${stats.responses_posted}</strong></div>
    </div>
</body>
</html>
`;

  // Send email
  console.log(`Attempting to send email to: ${recipient}`);
  console.log(`Subject: ${subject}`);
  const result = await gmail.sendEmail(recipient, subject, bodyText, bodyHtml);
  if (result.success) {
    console.log(`[OK] Summary email sent successfully to ${recipient}`);
    console.log(`Message ID: ${result.message_id}`);
  } else {
    console.error(`[ERROR] Failed to send summary email to ${recipient}`);
    console.error(`Error: ${result.error || 'Unknown error'}`);
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const handler = async function(event, context) {
  console.log('Reddit bot scheduled function triggered');
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Check if we should clear the database
    const queryParams = event.queryStringParameters || {};
    if (queryParams.clear === 'true' || queryParams.clear === '1') {
      console.log('Clearing processed emails database...');
      const tracker = new EmailTracker(DB_PATH);
      const deletedCount = tracker.clearAll();
      tracker.close();
      console.log(`Cleared ${deletedCount} processed email records`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Database cleared successfully. Deleted ${deletedCount} records.`
        })
      };
    }

    await main();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Bot executed successfully'
      })
    };
  } catch (error) {
    console.error('Error in bot execution:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};

// Regular HTTP handler - call via external cron service
// Use a service like cron-job.org to call: https://redditbot.netlify.app/.netlify/functions/reddit-bot
// Recommended schedule: every 2 hours (0 */2 * * *)
exports.handler = handler;
