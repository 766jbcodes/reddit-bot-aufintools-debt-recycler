"""Check emails in F5 Bot label"""
from gmail_client import GmailClient

def main():
    gmail = GmailClient('credentials.json', 'token.json')
    gmail.authenticate()
    
    print("Checking 'F5 Bot' label...")
    print("=" * 60)
    
    # Check total emails in label
    result = gmail.service.users().messages().list(
        userId='me', q='label:"F5 Bot"', maxResults=10).execute()
    total = len(result.get('messages', []))
    print(f"Total emails in 'F5 Bot' label: {total}")
    
    # Check unread emails in label
    result2 = gmail.service.users().messages().list(
        userId='me', q='label:"F5 Bot" is:unread', maxResults=10).execute()
    unread = len(result2.get('messages', []))
    print(f"Unread emails in 'F5 Bot' label: {unread}")
    
    # Check with our full query
    full_query = 'from:admin@f5bot.com subject:"debt recycling" label:"F5 Bot"'
    result3 = gmail.service.users().messages().list(
        userId='me', q=full_query, maxResults=10).execute()
    matching = len(result3.get('messages', []))
    print(f"Matching our query: {matching}")
    
    print("=" * 60)
    print(f"\nFull query: {full_query}")

if __name__ == "__main__":
    main()


