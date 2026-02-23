# Seed from API-Football
Write-Host "Calling seed-from-api endpoint..."
Write-Host "This will take about 2-3 minutes (25 players x 6 second delay)"
Write-Host ""

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/market/seed-from-api" -Method Post -TimeoutSec 300
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Message: $($result.message)"
    Write-Host ""
    Write-Host "Players seeded:"
    $result.data | ForEach-Object {
        Write-Host "  $($_.tokenId). $($_.name) - $($_.goals)G / $($_.assists)A / $($_.matches) matches"
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
