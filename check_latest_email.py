"""Check the latest F5Bot email format"""
from gmail_client import GmailClient
from email_parser import F5BotEmailParser

def main():
    gmail = GmailClient('credentials.json', 'token.json')
    gmail.authenticate()
    
    # Get latest email
    result = gmail.service.users().messages().list(
        userId='me', 
        q='from:admin@f5bot.com subject:"debt recycling" label:"Automations/F5 Bot"',
        maxResults=1).execute()
    
    if not result.get('messages'):
        print("No emails found")
        return
    
    msg_id = result['messages'][0]['id']
    message = gmail.service.users().messages().get(
        userId='me', id=msg_id, format='full').execute()
    
    headers = {h['name']: h['value'] for h in message['payload'].get('headers', [])}
    body = gmail.get_email_body(message)
    
    print("Latest F5Bot Email:")
    print("=" * 60)
    print(f"Subject: {headers.get('Subject', 'N/A')}")
    print()
    print("Email Body:")
    print("-" * 60)
    print(body)
    print("-" * 60)
    print()
    
    # Test parser
    parser = F5BotEmailParser()
    reddit_info = parser.parse_email(body, headers.get('Subject', ''))
    
    print("Parsed Reddit Info:")
    print("=" * 60)
    if reddit_info:
        print(f"URL: {reddit_info['url']}")
        print(f"Post ID: {reddit_info['post_id']}")
        print(f"Comment ID: {reddit_info.get('comment_id', 'None')}")
        print(f"Is Comment: {reddit_info['is_comment']}")
        print(f"Content Preview: {reddit_info['content'][:200]}...")
    else:
        print("Failed to parse Reddit info")

if __name__ == "__main__":
    main()


