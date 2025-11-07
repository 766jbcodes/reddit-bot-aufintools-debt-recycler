"""Helper script to get Gmail OAuth token for Netlify deployment"""
import os
import json
import base64
from gmail_client import GmailClient, SCOPES

def main():
    print("=" * 60)
    print("Gmail Token Setup for Netlify")
    print("=" * 60)
    print()
    
    # Check for credentials file
    credentials_file = "credentials.json"
    if not os.path.exists(credentials_file):
        print(f"ERROR: {credentials_file} not found!")
        print("Please download credentials.json from Google Cloud Console")
        print("and place it in this directory.")
        return
    
    print(f"Found {credentials_file}")
    print("Starting OAuth flow...")
    print("A browser window will open for authentication.")
    print()
    
    # Create Gmail client and authenticate
    gmail = GmailClient(credentials_file, "token.json")
    
    try:
        gmail.authenticate()
        print("✓ Authentication successful!")
        print()
        
        # Read the token file
        with open("token.json", "r") as f:
            token_data = json.load(f)
        
        # Display token info
        print("Token saved to token.json")
        print()
        print("=" * 60)
        print("For Netlify deployment, add this to GMAIL_TOKEN_JSON:")
        print("=" * 60)
        print()
        
        # Option 1: JSON string
        token_json_str = json.dumps(token_data)
        print("Option 1 - Direct JSON (escape quotes in Netlify UI):")
        print(token_json_str[:200] + "..." if len(token_json_str) > 200 else token_json_str)
        print()
        
        # Option 2: Base64 encoded
        token_b64 = base64.b64encode(token_json_str.encode('utf-8')).decode('utf-8')
        print("Option 2 - Base64 encoded (recommended):")
        print(token_b64[:100] + "..." if len(token_b64) > 100 else token_b64)
        print()
        
        print("=" * 60)
        print("Also add GMAIL_CREDENTIALS_JSON to Netlify:")
        print("=" * 60)
        print()
        
        # Read credentials
        with open(credentials_file, "r") as f:
            creds_data = json.load(f)
        
        creds_json_str = json.dumps(creds_data)
        creds_b64 = base64.b64encode(creds_json_str.encode('utf-8')).decode('utf-8')
        
        print("Base64 encoded credentials:")
        print(creds_b64[:100] + "..." if len(creds_b64) > 100 else creds_b64)
        print()
        print("Setup complete! Copy these values to Netlify environment variables.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        print()
        print("Make sure you have:")
        print("1. Downloaded credentials.json from Google Cloud Console")
        print("2. Enabled Gmail API in your Google Cloud project")
        print("3. Created OAuth 2.0 credentials (Desktop app type)")

if __name__ == "__main__":
    main()

