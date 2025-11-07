# Script to set Netlify environment variables
# Run this after linking your site with: netlify link

Write-Host "Setting Netlify Environment Variables..." -ForegroundColor Green
Write-Host ""

# Gmail Token (Base64 encoded)
$gmailToken = "eyJ0b2tlbiI6ICJ5YTI5LmEwQVRpNksydUZjNi1uMkdhcWlJM1hJUzAydDJMUVl5NVdNemxHVUR1Sk12RmRvOGhVQXg1eDdRSmZmMTBvWkdvUG1hWmRyYlJWdnMzRWwxWkpxazlCX05VTTQ0QXJKemV5V1RJczhMVnI5REt3cjBvcnNSVnFjbV9UeFJESGVUVzVIUGdXVW5MVFNWN25yRDlMZHJOZDFWNG5GNDgwZWJPQk1iT1Z3NVhwQWUwbHJVRWNSREItM0NaWXBFY203bTlJa1hjRFBJZ2FDZ1lLQVRjU0FSVVNGUUhHWDJNaVYzbVQ5anpWb3RlcEVCZ0x6MlNZb3cwMjA2IiwgInJlZnJlc2hfdG9rZW4iOiAiMS8vMGc4QzNvUFJXeWpxMUNnWUlBUkFBR0JBU053Ri1MOUlyWEtRd2lab1NNanJ4LVk2OG14RTNIVi0zaE9xQWV4aDdvZGdIazJ0SWo0SFdsaGpDcEJad2paNFFlc0dLelJneXh2OCIsICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLCAiY2xpZW50X2lkIjogIjQwODY5NTE5MTQyNi1ldWJtaDU2bzV0aW1hMThsZHVsa2NyYThoMzVsZnNidi5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsICJjbGllbnRfc2VjcmV0IjogIkdPQ1NQWC1XLU10cGZXWExSMFU0VnpqUEtJZ0s2NjJXcXNGIiwgInNjb3BlcyI6IFsiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9nbWFpbC5yZWFkb25seSJdLCAiZXhwaXJ5IjogIjIwMjUtMTEtMDdUMDA6NTQ6MDlaIn0="

# Gmail Credentials (Base64 encoded)
$gmailCreds = "eyJpbnN0YWxsZWQiOiB7ImNsaWVudF9pZCI6ICI0MDg2OTUxOTE0MjYtZXVibWg1Nm81dGltYTE4bGR1bGtjcmE4aDM1bGZzYnYuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCAicHJvamVjdF9pZCI6ICJkZWJ0LXJlY3ljbGVyLXJlZGRpdC1ib3QiLCAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLCAidG9rZW5fdXJpIjogImh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwgImF1dGhfcHJvdmlkZXJfeDUwOUNlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92MS9jZXJ0cyIsICJjbGllbnRfc2VjcmV0IjogIkdPQ1NQWC1XLU10cGZXWExSMFU0VnpqUEtJZ0s2NjJXcXNGIiwgInJlZGlyZWN0X3VyaXMiOiBbImh0dHA6Ly9sb2NhbGhvc3QiXX19"

Write-Host "Setting GMAIL_TOKEN_JSON..." -ForegroundColor Yellow
netlify env:set GMAIL_TOKEN_JSON $gmailToken

Write-Host "Setting GMAIL_CREDENTIALS_JSON..." -ForegroundColor Yellow
netlify env:set GMAIL_CREDENTIALS_JSON $gmailCreds

Write-Host "Setting NETLIFY=true..." -ForegroundColor Yellow
netlify env:set NETLIFY "true"

Write-Host ""
Write-Host "✓ Gmail environment variables set!" -ForegroundColor Green
Write-Host ""
Write-Host "You still need to set these manually:" -ForegroundColor Cyan
Write-Host "  - GEMINI_API_KEY (get from https://makersuite.google.com/app/apikey)" -ForegroundColor White
Write-Host "  - REDDIT_CLIENT_ID" -ForegroundColor White
Write-Host "  - REDDIT_CLIENT_SECRET" -ForegroundColor White
Write-Host "  - REDDIT_USERNAME" -ForegroundColor White
Write-Host "  - REDDIT_PASSWORD" -ForegroundColor White
Write-Host "  - REDDIT_USER_AGENT (format: DebtRecyclingBot/1.0 by /u/yourusername)" -ForegroundColor White
Write-Host ""
Write-Host "To set them, run:" -ForegroundColor Cyan
Write-Host "  netlify env:set VARIABLE_NAME 'value'" -ForegroundColor White


