"""Check the format of F5Bot emails"""
from gmail_client import GmailClient

def main():
    gmail = GmailClient('credentials.json', 'token.json')
    gmail.authenticate()
    
    # Get one email
    result = gmail.service.users().messages().list(
        userId='me', q='from:admin@f5bot.com subject:"debt recycling"', maxResults=1).execute()
    
    if not result.get('messages'):
        print("No emails found")
        return
    
    msg_id = result['messages'][0]['id']
    message = gmail.service.users().messages().get(
        userId='me', id=msg_id, format='full').execute()
    
    # Get headers
    headers = {h['name']: h['value'] for h in message['payload'].get('headers', [])}
    print("Email Headers:")
    print(f"  From: {headers.get('From', 'N/A')}")
    print(f"  Subject: {headers.get('Subject', 'N/A')}")
    print()
    
    # Get body
    body = gmail.get_email_body(message)
    print("Email Body (first 1000 chars):")
    print("=" * 60)
    print(body[:1000])
    print("=" * 60)

if __name__ == "__main__":
    main()


