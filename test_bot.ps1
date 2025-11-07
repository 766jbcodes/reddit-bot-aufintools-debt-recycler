# Test script for Reddit Bot
# This script helps set up environment variables for local testing

Write-Host "Setting up environment variables for local testing..." -ForegroundColor Green
Write-Host ""

# Check if we can get values from Netlify
Write-Host "Attempting to get environment variables from Netlify..." -ForegroundColor Yellow

# Set required environment variables
# You can either:
# 1. Get them from Netlify dashboard and paste here
# 2. Or set them manually below

# Example - uncomment and fill in:
# $env:GEMINI_API_KEY = "your-gemini-api-key"
# $env:REDDIT_CLIENT_ID = "your-reddit-client-id"
# $env:REDDIT_CLIENT_SECRET = "your-reddit-secret"
# $env:REDDIT_USERNAME = "your-reddit-username"
# $env:REDDIT_PASSWORD = "your-reddit-password"
# $env:REDDIT_USER_AGENT = "DebtRecyclingBot/1.0 by /u/yourusername"

Write-Host ""
Write-Host "To get your Gemini API key:" -ForegroundColor Cyan
Write-Host "  1. Go to: https://makersuite.google.com/app/apikey" -ForegroundColor White
Write-Host "  2. Copy your API key" -ForegroundColor White
Write-Host "  3. Run: `$env:GEMINI_API_KEY = 'your-key'" -ForegroundColor White
Write-Host ""
Write-Host "Or get all from Netlify dashboard and set them manually." -ForegroundColor Yellow
Write-Host ""
Write-Host "Once set, run: python bot.py" -ForegroundColor Green


