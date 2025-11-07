"""Configuration file for Reddit Bot"""
import os

# Gmail API Configuration
GMAIL_CREDENTIALS_FILE = os.getenv("GMAIL_CREDENTIALS_FILE", "credentials.json")
GMAIL_TOKEN_FILE = os.getenv("GMAIL_TOKEN_FILE", "token.json")
# F5Bot emails come from admin@f5bot.com
# If your F5Bot emails are in a specific label/folder, add it like: 'label:F5Bot' or 'label:"Reddit Alerts"'
F5BOT_LABEL = os.getenv("F5BOT_LABEL", "Automations/F5 Bot")  # Optional: label name like "F5Bot" or "Reddit Alerts"
base_query = 'from:admin@f5bot.com subject:"debt recycling"'
if F5BOT_LABEL:
    base_query = f'{base_query} label:"{F5BOT_LABEL}"'
GMAIL_QUERY = os.getenv("GMAIL_QUERY", base_query)

# Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Reddit API Configuration
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USERNAME = os.getenv("REDDIT_USERNAME", "")
REDDIT_PASSWORD = os.getenv("REDDIT_PASSWORD", "")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "DebtRecyclingBot/1.0 by /u/yourusername")

# Website URLs
CALCULATOR_URL = "https://debt-recycler.aufintools.com"
LEARN_URL = "https://debt-recycler.aufintools.com/learn"

# Database
# Use temp directory that works on both Windows and Linux
import tempfile
DB_PATH = os.getenv("DB_PATH", os.path.join(tempfile.gettempdir(), "processed_emails.db"))

# Summary Email
SUMMARY_EMAIL = os.getenv("SUMMARY_EMAIL", "")  # Email to send summaries to (defaults to authenticated Gmail account)

# Relevance checking prompt
RELEVANCE_PROMPT = """You are analysing Reddit posts and comments about debt recycling and leveraged investing in an Australian context.

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

Respond with ONLY "RELEVANT" or "NOT_RELEVANT" followed by a brief one-sentence explanation."""

# Response generation prompt template
RESPONSE_PROMPT_TEMPLATE = """You are a helpful reddit users experinced in debt recycling and leveraged investing for ETFs and Shares in an Australian context.

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

Keep the response natural and helpful. Do not be overly salesy or promotional."""

