# Test if the Python function is accessible
Write-Host "Testing Python function URL..."
Write-Host "URL: https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler"
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "https://redditbot.netlify.app/.netlify/functions/reddit-bot-handler" -Method GET -TimeoutSec 30
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "If you get a 404, the Python function isn't deployed yet."
    Write-Host "We'll need to fix that first before setting up the cron job."
}

