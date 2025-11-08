/** Script to refresh Gmail OAuth token */
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

/**
 * Reads previously authorized token from a file, or creates a new one.
 */
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  
  console.log('Authorize this app by visiting this url:', authUrl);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        // Save the token for future program executions
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);
        
        // Also output as base64 for easy copying to Netlify
        const tokenBase64 = Buffer.from(JSON.stringify(tokens)).toString('base64');
        console.log('\n=== Token (Base64 encoded for Netlify) ===');
        console.log(tokenBase64);
        console.log('\n=== Token (JSON - for direct copy) ===');
        console.log(JSON.stringify(tokens));
        console.log('\nTo set in Netlify, run:');
        console.log(`netlify env:set GMAIL_TOKEN_JSON "${JSON.stringify(tokens)}"`);
        console.log('Or use the base64 version:');
        console.log(`netlify env:set GMAIL_TOKEN_JSON "${tokenBase64}"`);
        
        resolve(tokens);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Load or request authorization to call APIs.
 */
async function authorize() {
  let credentials;
  
  try {
    // Check for credentials in environment variable first
    if (process.env.GMAIL_CREDENTIALS_JSON) {
      try {
        credentials = JSON.parse(Buffer.from(process.env.GMAIL_CREDENTIALS_JSON, 'base64').toString('utf-8'));
      } catch (e) {
        credentials = JSON.parse(process.env.GMAIL_CREDENTIALS_JSON);
      }
    } else {
      // Load from file
      const content = await fs.readFile(CREDENTIALS_PATH);
      credentials = JSON.parse(content);
    }
  } catch (err) {
    console.error('Error loading client secret file:', err);
    console.error('\nPlease ensure credentials.json exists or GMAIL_CREDENTIALS_JSON is set.');
    process.exit(1);
  }
  
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new OAuth2Client(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  
  // Check if we have previously stored a token.
  let token;
  try {
    const content = await fs.readFile(TOKEN_PATH);
    token = JSON.parse(content);
  } catch (err) {
    // No token file, will get new one
  }
  
  // Check command line argument to force new token
  const forceNew = process.argv.includes('--force') || process.argv.includes('-f');
  
  if (token && !forceNew) {
    oAuth2Client.setCredentials(token);
    
    // Try to refresh if expired
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log('Token expired, refreshing...');
      try {
        const { credentials: newToken } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(newToken);
        
        // Save refreshed token
        await fs.writeFile(TOKEN_PATH, JSON.stringify(newToken));
        console.log('Token refreshed and saved!');
        
        // Output for Netlify
        const tokenBase64 = Buffer.from(JSON.stringify(newToken)).toString('base64');
        console.log('\n=== Refreshed Token (Base64) ===');
        console.log(tokenBase64);
        console.log('\n=== Refreshed Token (JSON) ===');
        console.log(JSON.stringify(newToken));
        console.log('\nTo set in Netlify:');
        console.log(`netlify env:set GMAIL_TOKEN_JSON "${JSON.stringify(newToken)}"`);
        
        return newToken;
      } catch (err) {
        console.log('Could not refresh token, getting new one...');
        console.error('Error:', err.message);
        // Fall through to get new token
      }
    } else {
      console.log('Token is still valid!');
      console.log('To force a new token, run: npm run setup-gmail -- --force');
      console.log('\nCurrent token (for Netlify):');
      const tokenBase64 = Buffer.from(JSON.stringify(token)).toString('base64');
      console.log('Base64:', tokenBase64);
      console.log('JSON:', JSON.stringify(token));
      return token;
    }
  }
  
  // Get new token
  console.log('Getting new token...');
  return await getNewToken(oAuth2Client);
}

// Run the authorization
authorize()
  .then((token) => {
    console.log('\n✓ Token setup complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

