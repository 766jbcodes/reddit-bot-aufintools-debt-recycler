"""Check what labels exist and what labels F5Bot emails have"""
from gmail_client import GmailClient

def main():
    gmail = GmailClient('credentials.json', 'token.json')
    gmail.authenticate()
    
    print("Checking labels...")
    print("=" * 60)
    
    # Get all labels
    labels = gmail.service.users().labels().list(userId='me').execute()
    print("Available labels:")
    for label in labels.get('labels', []):
        if 'F5' in label['name'] or 'Bot' in label['name'] or 'f5' in label['name'].lower():
            print(f"  - {label['name']} (ID: {label['id']})")
    
    print()
    print("=" * 60)
    
    # Get a F5Bot email and check its labels
    result = gmail.service.users().messages().list(
        userId='me', q='from:admin@f5bot.com', maxResults=1).execute()
    
    if result.get('messages'):
        msg_id = result['messages'][0]['id']
        message = gmail.service.users().messages().get(
            userId='me', id=msg_id, format='metadata',
            metadataHeaders=['From', 'Subject']).execute()
        
        headers = {h['name']: h['value'] for h in message['payload'].get('headers', [])}
        label_ids = message.get('labelIds', [])
        
        print(f"Sample F5Bot email:")
        print(f"  From: {headers.get('From', 'N/A')}")
        print(f"  Subject: {headers.get('Subject', 'N/A')[:50]}")
        print(f"  Label IDs: {label_ids}")
        
        # Get label names
        label_map = {l['id']: l['name'] for l in labels.get('labels', [])}
        label_names = [label_map.get(lid, lid) for lid in label_ids]
        print(f"  Label Names: {label_names}")

if __name__ == "__main__":
    main()


