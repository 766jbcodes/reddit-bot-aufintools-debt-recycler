"""Main Reddit bot orchestration"""
import os
import sys
from gmail_client import GmailClient
from email_parser import F5BotEmailParser
from gemini_service import GeminiService
from reddit_client import RedditClient
from database import EmailTracker
from config import (
    GMAIL_CREDENTIALS_FILE, GMAIL_TOKEN_FILE, GMAIL_QUERY,
    GEMINI_API_KEY, DB_PATH, SUMMARY_EMAIL
)
from datetime import datetime


def main():
    """Main bot execution"""
    print("Starting Reddit Bot...")
    
    # Initialize services
    try:
        # For Netlify, credentials come from env vars
        creds_file = GMAIL_CREDENTIALS_FILE if os.path.exists(GMAIL_CREDENTIALS_FILE) else None
        token_file = GMAIL_TOKEN_FILE if os.path.exists(GMAIL_TOKEN_FILE) else None
        gmail = GmailClient(creds_file, token_file)
        gmail.authenticate()
        print("[OK] Gmail authenticated")
    except Exception as e:
        print(f"[ERROR] Gmail authentication failed: {e}")
        return
    
    try:
        gemini = GeminiService(GEMINI_API_KEY)
        print("[OK] Gemini service initialized")
    except Exception as e:
        print(f"[ERROR] Gemini service initialization failed: {e}")
        return
    
    # Reddit client - optional for testing
    reddit = None
    try:
        reddit = RedditClient()
        print("[OK] Reddit authenticated")
    except Exception as e:
        print(f"[WARNING] Reddit authentication failed: {e}")
        print("[INFO] Continuing in test mode - will not post to Reddit")
        # Continue without Reddit for testing
    
    tracker = EmailTracker(DB_PATH)
    parser = F5BotEmailParser()
    
    # Fetch unread emails
    print(f"Fetching emails with query: {GMAIL_QUERY}")
    emails = gmail.get_unread_emails(GMAIL_QUERY)
    print(f"Found {len(emails)} unread emails")
    
    if not emails:
        print("No new emails to process")
        # Send summary email even if no emails
        try:
            stats = tracker.get_stats()
            send_summary_email(gmail, 0, 0, 0, [], [], stats)
        except Exception as e:
            print(f"Error sending summary email: {e}")
        return
    
    processed_count = 0
    relevant_count = 0
    posted_count = 0
    posted_comments = []  # Track posted comments for summary
    errors = []  # Track any errors
    
    for email_msg in emails:
        email_id = email_msg['id']
        
        # Check if already processed
        if tracker.is_processed(email_id):
            print(f"Skipping already processed email: {email_id}")
            continue
        
        # Extract email content
        email_body = gmail.get_email_body(email_msg)
        email_subject = next(
            (h['value'] for h in email_msg['payload']['headers'] if h['name'] == 'Subject'),
            'No Subject'
        )
        
        # Parse email to extract Reddit info
        reddit_info = parser.parse_email(email_body, email_subject)
        
        if not reddit_info:
            print(f"Could not parse Reddit info from email: {email_id}")
            tracker.mark_processed(email_id, "", "", relevant=False)
            continue
        
        print(f"\nProcessing: {reddit_info['url']}")
        print(f"Content preview: {reddit_info['content'][:100]}...")
        
        # Check relevance
        relevance_result = gemini.check_relevance(reddit_info['content'])
        print(f"Relevance: {relevance_result['relevant']} - {relevance_result['explanation']}")
        
        if not relevance_result['relevant']:
            tracker.mark_processed(
                email_id,
                reddit_info['url'],
                reddit_info['post_id'],
                reddit_info['comment_id'],
                relevant=False
            )
            processed_count += 1
            continue
        
        relevant_count += 1
        
        # Generate response
        print("Generating response...")
        response_text = gemini.generate_response(reddit_info['content'], reddit_info['url'])
        print(f"Generated response: {response_text[:100]}...")
        
        # Post to Reddit (if authenticated)
        if reddit:
            print("Posting to Reddit...")
            if reddit_info['is_comment']:
                result = reddit.reply_to_comment(reddit_info['comment_id'], response_text)
            else:
                result = reddit.post_comment(reddit_info['post_id'], response_text)
        else:
            # Test mode - simulate success
            print("[TEST MODE] Would post to Reddit (skipped)")
            result = {
                'success': False,
                'error': 'Test mode - Reddit not authenticated'
            }
        
        if result.get('success'):
            print(f"[OK] Posted successfully: {result['comment_url']}")
            tracker.mark_processed(
                email_id,
                reddit_info['url'],
                reddit_info['post_id'],
                reddit_info['comment_id'],
                relevant=True,
                response_posted=True,
                response_url=result['comment_url']
            )
            posted_count += 1
            posted_comments.append({
                'original_url': reddit_info['url'],
                'comment_url': result['comment_url'],
                'response_preview': response_text[:150] + '...' if len(response_text) > 150 else response_text
            })
        else:
            error_msg = result.get('error', 'Unknown error')
            print(f"[ERROR] Failed to post: {error_msg}")
            errors.append({
                'url': reddit_info['url'],
                'error': error_msg
            })
            tracker.mark_processed(
                email_id,
                reddit_info['url'],
                reddit_info['post_id'],
                reddit_info['comment_id'],
                relevant=True,
                response_posted=False
            )
        
        # Mark email as read in Gmail
        gmail.mark_as_read(email_id)
        processed_count += 1
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"Processing complete!")
    print(f"Emails processed: {processed_count}")
    print(f"Relevant posts: {relevant_count}")
    print(f"Responses posted: {posted_count}")
    print(f"{'='*50}")
    
    stats = tracker.get_stats()
    print(f"\nTotal stats:")
    print(f"  Total processed: {stats['total_processed']}")
    print(f"  Relevant: {stats['relevant']}")
    print(f"  Responses posted: {stats['responses_posted']}")
    
    # Send summary email
    try:
        send_summary_email(gmail, processed_count, relevant_count, posted_count, 
                          posted_comments, errors, stats)
    except Exception as e:
        print(f"Error sending summary email: {e}")


def send_summary_email(gmail, processed_count, relevant_count, posted_count, 
                      posted_comments, errors, stats):
    """Send a summary email after bot execution"""
    from config import SUMMARY_EMAIL
    
    # Get recipient email
    recipient = SUMMARY_EMAIL if SUMMARY_EMAIL else gmail.get_user_email()
    
    if not recipient:
        print("No email address available for summary")
        return
    
    # Create email subject
    subject = f"Reddit Bot Summary - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    # Create email body (plain text)
    body_text = f"""Reddit Debt Recycling Bot - Execution Summary
{'='*60}

Run Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

This Run:
  • Emails processed: {processed_count}
  • Relevant posts found: {relevant_count}
  • Responses posted: {posted_count}
  • Errors: {len(errors)}

"""
    
    if posted_comments:
        body_text += "Posted Comments:\n"
        body_text += "-" * 60 + "\n"
        for i, comment in enumerate(posted_comments, 1):
            body_text += f"\n{i}. Original Post/Comment: {comment['original_url']}\n"
            body_text += f"   Your Response: {comment['comment_url']}\n"
            body_text += f"   Preview: {comment['response_preview']}\n"
        body_text += "\n"
    
    if errors:
        body_text += "Errors:\n"
        body_text += "-" * 60 + "\n"
        for i, error in enumerate(errors, 1):
            body_text += f"\n{i}. URL: {error['url']}\n"
            body_text += f"   Error: {error['error']}\n"
        body_text += "\n"
    
    body_text += f"""
All-Time Stats:
  • Total processed: {stats['total_processed']}
  • Total relevant: {stats['relevant']}
  • Total responses posted: {stats['responses_posted']}

{'='*60}
"""
    
    # Create HTML version
    body_html = f"""<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        h2 {{ color: #333; }}
        .stats {{ background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 10px 0; }}
        .stat-item {{ margin: 5px 0; }}
        .comment {{ background-color: #e8f4f8; padding: 10px; margin: 10px 0; border-left: 3px solid #2196F3; }}
        .error {{ background-color: #ffebee; padding: 10px; margin: 10px 0; border-left: 3px solid #f44336; }}
        a {{ color: #2196F3; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <h2>Reddit Debt Recycling Bot - Execution Summary</h2>
    <p><strong>Run Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    
    <div class="stats">
        <h3>This Run:</h3>
        <div class="stat-item">• Emails processed: <strong>{processed_count}</strong></div>
        <div class="stat-item">• Relevant posts found: <strong>{relevant_count}</strong></div>
        <div class="stat-item">• Responses posted: <strong>{posted_count}</strong></div>
        <div class="stat-item">• Errors: <strong>{len(errors)}</strong></div>
    </div>
"""
    
    if posted_comments:
        body_html += "<h3>Posted Comments:</h3>"
        for i, comment in enumerate(posted_comments, 1):
            body_html += f"""
    <div class="comment">
        <p><strong>{i}. Original Post/Comment:</strong><br>
        <a href="{comment['original_url']}" target="_blank">{comment['original_url']}</a></p>
        <p><strong>Your Response:</strong><br>
        <a href="{comment['comment_url']}" target="_blank">{comment['comment_url']}</a></p>
        <p><strong>Preview:</strong> {comment['response_preview']}</p>
    </div>
"""
    
    if errors:
        body_html += "<h3>Errors:</h3>"
        for i, error in enumerate(errors, 1):
            body_html += f"""
    <div class="error">
        <p><strong>{i}. URL:</strong> <a href="{error['url']}" target="_blank">{error['url']}</a></p>
        <p><strong>Error:</strong> {error['error']}</p>
    </div>
"""
    
    body_html += f"""
    <div class="stats">
        <h3>All-Time Stats:</h3>
        <div class="stat-item">• Total processed: <strong>{stats['total_processed']}</strong></div>
        <div class="stat-item">• Total relevant: <strong>{stats['relevant']}</strong></div>
        <div class="stat-item">• Total responses posted: <strong>{stats['responses_posted']}</strong></div>
    </div>
</body>
</html>
"""
    
    # Send email
    result = gmail.send_email(recipient, subject, body_text, body_html)
    if result['success']:
        print(f"[OK] Summary email sent to {recipient}")
    else:
        print(f"[ERROR] Failed to send summary email: {result.get('error', 'Unknown error')}")


if __name__ == "__main__":
    main()

