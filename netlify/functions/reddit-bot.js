const { schedule } = require('@netlify/functions');
const https = require('https');
const http = require('http');

const handler = async function(event, context) {
  console.log('Reddit bot scheduled function triggered');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  return new Promise((resolve, reject) => {
    // Get the site URL from environment or construct it
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://redditbot.netlify.app';
    const functionUrl = `${siteUrl}/.netlify/functions/reddit-bot-handler`;
    
    console.log(`Calling Python handler at: ${functionUrl}`);
    
    // Parse URL
    const url = new URL(functionUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Netlify-Scheduled-Function/1.0'
      },
      timeout: 600000 // 10 minutes timeout
    };
    
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Python handler responded with status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        
        if (res.statusCode === 200) {
          resolve({
            statusCode: 200,
            body: JSON.stringify({
              message: 'Bot executed successfully via Python handler',
              pythonHandlerResponse: data
            })
          });
        } else {
          resolve({
            statusCode: res.statusCode,
            body: JSON.stringify({
              error: 'Python handler returned error',
              statusCode: res.statusCode,
              response: data
            })
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error calling Python handler: ${error.message}`);
      resolve({
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to call Python handler',
          message: error.message,
          functionUrl: functionUrl
        })
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 500,
        body: JSON.stringify({
          error: 'Request to Python handler timed out'
        })
      });
    });
    
    req.end();
  });
};

// Schedule to run every minute for testing (cron: * * * * *)
// Change back to '0 */2 * * *' for every 2 hours once working
exports.handler = schedule('* * * * *', handler);

