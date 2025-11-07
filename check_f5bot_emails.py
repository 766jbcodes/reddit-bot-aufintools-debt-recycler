"""Check for F5Bot emails in Gmail"""
from gmail_client import GmailClient

def main():
    gmail = GmailClient('credentials.json', 'token.json')
    gmail.authenticate()
    
    print("Checking for F5Bot emails...")
    print("=" * 60)
    
    # Try different queries
    queries = [
        ('from:f5bot@f5bot.com', 'Exact match: from:f5bot@f5bot.com'),
        ('from:f5bot', 'Partial match: from:f5bot'),
        ('f5bot', 'Any mention: f5bot'),
        ('subject:"debt recycling"', 'Subject: debt recycling'),
        ('from:f5bot@f5bot.com subject:"debt recycling"', 'Combined query'),
    ]
    
    for query, description in queries:
        try:
            result = gmail.service.users().messages().list(
                userId='me', q=query, maxResults=10).execute()
            messages = result.get('messages', [])
            print(f"{description}: Found {len(messages)} messages")
            
            if messages:
                # Get details of first message
                msg = gmail.service.users().messages().get(
                    userId='me', id=messages[0]['id'], format='metadata',
                    metadataHeaders=['From', 'Subject']).execute()
                headers = {h['name']: h['value'] for h in msg['payload'].get('headers', [])}
                print(f"  Sample - From: {headers.get('From', 'N/A')}")
                print(f"  Sample - Subject: {headers.get('Subject', 'N/A')[:50]}")
                print()
        except Exception as e:
            print(f"{description}: Error - {e}")
    
    print("=" * 60)
    print("\nCurrent query being used:")
    from config import GMAIL_QUERY
    print(f"  {GMAIL_QUERY}")

if __name__ == "__main__":
    main()


