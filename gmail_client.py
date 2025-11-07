"""Gmail API client for fetching F5Bot emails"""
import os
import json
import base64
import tempfile
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Gmail API scopes
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
]


class GmailClient:
    def __init__(self, credentials_file=None, token_file=None):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.service = None
        
    def authenticate(self):
        """Authenticate and create Gmail service"""
        creds = None
        
        # Check for credentials in environment variable (for Netlify)
        credentials_json = os.getenv('GMAIL_CREDENTIALS_JSON')
        token_json = os.getenv('GMAIL_TOKEN_JSON')
        
        # Handle credentials
        if credentials_json:
            # Decode base64 if needed, or use JSON directly
            try:
                credentials_data = json.loads(base64.b64decode(credentials_json).decode('utf-8'))
            except:
                credentials_data = json.loads(credentials_json)
            
            # Create temporary file for credentials
            temp_creds_file = os.path.join(tempfile.gettempdir(), 'gmail_creds.json')
            with open(temp_creds_file, 'w') as f:
                json.dump(credentials_data, f)
            self.credentials_file = temp_creds_file
        
        # Handle token
        if token_json:
            try:
                token_data = json.loads(base64.b64decode(token_json).decode('utf-8'))
            except:
                token_data = json.loads(token_json)
            creds = Credentials.from_authorized_user_info(token_data, SCOPES)
        elif self.token_file and os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
        
        # If no valid credentials, get new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not self.credentials_file or not os.path.exists(self.credentials_file):
                    raise FileNotFoundError(
                        f"Gmail credentials not found. Set GMAIL_CREDENTIALS_JSON environment variable "
                        f"or provide credentials.json file."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, SCOPES)
                
                # For Netlify/serverless, we can't use local server
                # Token must be pre-authenticated and stored in env var
                if os.getenv('NETLIFY'):
                    raise ValueError(
                        "Gmail token must be pre-authenticated and stored in GMAIL_TOKEN_JSON "
                        "environment variable for serverless deployment."
                    )
                creds = flow.run_local_server(port=0)
            
            # Save token if we have a file path (local development)
            if self.token_file and not os.getenv('NETLIFY'):
                with open(self.token_file, 'w') as token:
                    token.write(creds.to_json())
        
        self.service = build('gmail', 'v1', credentials=creds)
        return self.service
    
    def get_unread_emails(self, query):
        """Fetch unread emails matching the query"""
        if not self.service:
            self.authenticate()
        
        try:
            results = self.service.users().messages().list(
                userId='me', q=query).execute()
            messages = results.get('messages', [])
            
            if not messages:
                return []
            
            # Fetch full message details
            email_data = []
            for msg in messages:
                message = self.service.users().messages().get(
                    userId='me', id=msg['id'], format='full').execute()
                email_data.append(message)
            
            return email_data
        except HttpError as error:
            print(f'An error occurred: {error}')
            return []
    
    def mark_as_read(self, message_id):
        """Mark an email as read"""
        if not self.service:
            self.authenticate()
        
        try:
            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
        except HttpError as error:
            print(f'Error marking email as read: {error}')
    
    def get_email_body(self, message):
        """Extract email body text from message"""
        payload = message.get('payload', {})
        
        def extract_text(part):
            """Recursively extract text from email parts"""
            if part.get('mimeType') == 'text/plain':
                data = part.get('body', {}).get('data')
                if data:
                    return base64.urlsafe_b64decode(data).decode('utf-8')
            elif part.get('mimeType') == 'text/html':
                data = part.get('body', {}).get('data')
                if data:
                    html = base64.urlsafe_b64decode(data).decode('utf-8')
                    # Simple HTML to text conversion (can be improved)
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(html, 'html.parser')
                    return soup.get_text()
            elif part.get('parts'):
                text_parts = []
                for subpart in part['parts']:
                    text = extract_text(subpart)
                    if text:
                        text_parts.append(text)
                return '\n'.join(text_parts)
            return None
        
        return extract_text(payload) or ""
    
    def get_user_email(self):
        """Get the authenticated user's email address"""
        if not self.service:
            self.authenticate()
        
        try:
            profile = self.service.users().getProfile(userId='me').execute()
            return profile.get('emailAddress', '')
        except HttpError as error:
            print(f'Error getting user email: {error}')
            return ''
    
    def send_email(self, to_email, subject, body_text, body_html=None):
        """Send an email via Gmail API"""
        if not self.service:
            self.authenticate()
        
        try:
            # Get user's email if 'to' is empty
            if not to_email:
                to_email = self.get_user_email()
            
            # Create message
            message = self._create_message(to_email, subject, body_text, body_html)
            
            # Send message
            sent_message = self.service.users().messages().send(
                userId='me', body=message).execute()
            
            return {
                'success': True,
                'message_id': sent_message.get('id')
            }
        except HttpError as error:
            print(f'Error sending email: {error}')
            return {
                'success': False,
                'error': str(error)
            }
    
    def _create_message(self, to_email, subject, body_text, body_html=None):
        """Create a message object for sending"""
        import email.mime.text
        import email.mime.multipart
        
        if body_html:
            # Create multipart message with HTML
            message = email.mime.multipart.MIMEMultipart('alternative')
            message['to'] = to_email
            message['subject'] = subject
            
            part1 = email.mime.text.MIMEText(body_text, 'plain')
            part2 = email.mime.text.MIMEText(body_html, 'html')
            
            message.attach(part1)
            message.attach(part2)
        else:
            # Plain text message
            message = email.mime.text.MIMEText(body_text)
            message['to'] = to_email
            message['subject'] = subject
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        return {'raw': raw_message}

