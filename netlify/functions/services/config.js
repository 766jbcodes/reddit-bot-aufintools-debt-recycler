/** Configuration file for Reddit Bot */
const os = require('os');
const path = require('path');

// Gmail API Configuration
const GMAIL_CREDENTIALS_FILE = process.env.GMAIL_CREDENTIALS_FILE || 'credentials.json';
const GMAIL_TOKEN_FILE = process.env.GMAIL_TOKEN_FILE || 'token.json';

// F5Bot emails come from admin@f5bot.com
// If your F5Bot emails are in a specific label/folder, add it like: 'label:F5Bot' or 'label:"Reddit Alerts"'
const F5BOT_LABEL = process.env.F5BOT_LABEL || 'Automations/F5 Bot';
let baseQuery = 'from:admin@f5bot.com subject:"debt recycling"';
if (F5BOT_LABEL) {
  baseQuery = `${baseQuery} label:"${F5BOT_LABEL}"`;
}
const GMAIL_QUERY = process.env.GMAIL_QUERY || baseQuery;

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Reddit API Configuration
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || '';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || '';
const REDDIT_USERNAME = process.env.REDDIT_USERNAME || '';
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD || '';
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'DebtRecyclingBot/1.0 by /u/yourusername';

// Website URLs
const CALCULATOR_URL = 'https://debt-recycler.aufintools.com';
const LEARN_URL = 'https://debt-recycler.aufintools.com/learn';

// Database
// Use temp directory that works on both Windows and Linux
const DB_PATH = process.env.DB_PATH || path.join(os.tmpdir(), 'processed_emails.db');

// Summary Email
const SUMMARY_EMAIL = process.env.SUMMARY_EMAIL || ''; // Email to send summaries to (defaults to authenticated Gmail account)

// Relevance checking prompt
const RELEVANCE_PROMPT = `You are analysing Reddit posts and comments about debt recycling and leveraged investing in an Australian context.

Determine if this post/comment is relevant to debt recycling, leveraged investing, or related financial strategies in an Australian context.

A post is relevant if it:
- Asks questions about debt recycling, leveraged investing, or calculators related to these topics.
- Discusses debt recycling strategies or questions about doing it in single name, joint names.
- Mentions leveraged investing in the context of purchasing ETFs or shares
- Asks about using home equity for investing in ETFs or Shares
- Discusses tax-effective investment strategies involving debt


A post is NOT relevant if it:
- Is about general debt management (not recycling), tax structures for recycling such as trusts or companies
- Is about credit card debt or consumer debt
- Is spam or promotional content
- Is completely unrelated to finance/investing

Respond with ONLY "RELEVANT" or "NOT_RELEVANT" followed by a brief one-sentence explanation.`;

// Response generation prompt template
const RESPONSE_PROMPT_TEMPLATE = `You are a helpful reddit users experinced in debt recycling and leveraged investing for ETFs and Shares in an Australian context.

A Reddit user has posted the following about debt recycling:

---
{post_content}
---

Craft a helpful, concise response (2-3 sentences) that:
1. Provides a small piece of useful information or clarification about debt recycling
2. Is friendly and non-promotional
3. Directs them to either:
   - {calculator_url} (if they need a calculator or want to calculate something)
   - {learn_url} (if they want to learn more about debt recycling and leveraged investing)

Choose the most appropriate link based on their question. If they're asking "how do I calculate" or "what would my numbers be", or help with their scenario use the calculator. Otherwise, use the learn page.

Keep the response natural and helpful. Do not be overly salesy or promotional.`;

module.exports = {
  GMAIL_CREDENTIALS_FILE,
  GMAIL_TOKEN_FILE,
  F5BOT_LABEL,
  GMAIL_QUERY,
  GEMINI_API_KEY,
  REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET,
  REDDIT_USERNAME,
  REDDIT_PASSWORD,
  REDDIT_USER_AGENT,
  CALCULATOR_URL,
  LEARN_URL,
  DB_PATH,
  SUMMARY_EMAIL,
  RELEVANCE_PROMPT,
  RESPONSE_PROMPT_TEMPLATE
};

