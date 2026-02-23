# ==============================================================================
# StockBaller - Chainlink Match Day Simulator
# ==============================================================================
# This script demonstrates the full price update flow:
# 1. Shows "Before Match" prices
# 2. Simulates match events
# 3. Triggers Chainlink CRE workflow
# 4. Shows "After Match" prices
#
# Usage: .\demo-match.ps1
# ==============================================================================

$ErrorActionPreference = "Stop"
$API_BASE = "http://localhost:3001/api/demo"

# Colors for output
function Write-Header($text) {
    Write-Host ""
    Write-Host "=" * 70 -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Yellow
    Write-Host "=" * 70 -ForegroundColor Cyan
}

function Write-Event($minute, $emoji, $text) {
    Write-Host "  [$minute']" -ForegroundColor DarkGray -NoNewline
    Write-Host " $emoji $text" -ForegroundColor White
}

function Write-PriceTable($athletes) {
    Write-Host ""
    Write-Host "  ATHLETE PRICES" -ForegroundColor Cyan
    Write-Host "  " + ("-" * 55) -ForegroundColor DarkGray
    Write-Host ("  {0,-20} {1,10} {2,8} {3,10}" -f "Player", "Price", "Age", "Multiplier") -ForegroundColor DarkGray
    Write-Host "  " + ("-" * 55) -ForegroundColor DarkGray
    
    foreach ($a in $athletes) {
        $mult = if ($a.age -lt 20) { "15x (Youth)" } elseif ($a.age -le 27) { "12x (Prime)" } else { "8x (Veteran)" }
        $priceColor = if ($a.currentPrice -gt 100) { "Green" } elseif ($a.currentPrice -lt 100) { "Red" } else { "White" }
        Write-Host ("  {0,-20}" -f $a.name) -NoNewline -ForegroundColor White
        Write-Host (" ${0,10:C2}" -f $a.currentPrice) -NoNewline -ForegroundColor $priceColor
        Write-Host (" {0,8}" -f $a.age) -NoNewline -ForegroundColor DarkGray
        Write-Host (" {0,10}" -f $mult) -ForegroundColor DarkYellow
    }
    Write-Host "  " + ("-" * 55) -ForegroundColor DarkGray
}

function Invoke-DemoApi($endpoint, $method = "GET") {
    try {
        if ($method -eq "POST") {
            $response = Invoke-RestMethod -Uri "$API_BASE/$endpoint" -Method Post -ContentType "application/json"
        } else {
            $response = Invoke-RestMethod -Uri "$API_BASE/$endpoint" -Method Get
        }
        return $response
    } catch {
        Write-Host "  ERROR: Could not reach API at $API_BASE" -ForegroundColor Red
        Write-Host "  Make sure the NestJS server is running: cd api && npm run start:dev" -ForegroundColor Yellow
        exit 1
    }
}

# ==============================================================================
# MAIN DEMO FLOW
# ==============================================================================

Clear-Host
Write-Host ""
Write-Host "  _____ _             _    ____        _ _           " -ForegroundColor Yellow
Write-Host " / ____| |           | |  |  _ \      | | |          " -ForegroundColor Yellow
Write-Host "| (___ | |_ ___   ___| | _| |_) | __ _| | | ___ _ __ " -ForegroundColor Yellow
Write-Host " \___ \| __/ _ \ / __| |/ /  _ < / _` | | |/ _ \ '__|" -ForegroundColor Yellow
Write-Host " ____) | || (_) | (__|   <| |_) | (|_| | | |  __/ |   " -ForegroundColor Yellow
Write-Host "|_____/ \__\___/ \___|_|\_\____/ \__,_|_|_|\___|_|   " -ForegroundColor Yellow
Write-Host ""
Write-Host "  CHAINLINK CRE DEMO - Match Day Simulator" -ForegroundColor Cyan
Write-Host ""

# Step 1: Reset Demo
Write-Header "STEP 1: Reset Demo State"
Write-Host "  Initializing demo with 5 athletes at IPO price ($100.00)..." -ForegroundColor DarkGray
$null = Invoke-DemoApi "reset" "POST"
Start-Sleep -Milliseconds 500

$athletes = Invoke-DemoApi "athletes"
Write-PriceTable $athletes

Write-Host ""
Write-Host "  Press ENTER to start the match..." -ForegroundColor Yellow
$null = Read-Host

# Step 2: Start Match
Write-Header "STEP 2: MATCH KICKOFF!"
Write-Host ""
Write-Host "                    FC BARCELONA vs REAL MADRID" -ForegroundColor White
Write-Host "                         El Clasico 2024" -ForegroundColor DarkGray
Write-Host ""
$null = Invoke-DemoApi "match/start" "POST"
Start-Sleep -Milliseconds 800

# Step 3: Match Events (animated)
Write-Header "STEP 3: MATCH EVENTS"
Write-Host ""

$events = @(
    @{ minute = 12; token = 2; type = "goal"; emoji = "⚽"; text = "GOAL! Kylian Mbappe scores a brilliant header!" },
    @{ minute = 12; token = 4; type = "assist"; emoji = "🅰️"; text = "ASSIST by Jude Bellingham with a perfect cross!" },
    @{ minute = 23; token = 5; type = "yellow"; emoji = "🟨"; text = "YELLOW CARD for Memphis Depay - tactical foul" },
    @{ minute = 34; token = 3; type = "goal"; emoji = "⚽"; text = "GOAL! Lamine Yamal with a stunning solo goal!" },
    @{ minute = 34; token = 2; type = "assist"; emoji = "🅰️"; text = "ASSIST by Mbappe - great vision!" },
    @{ minute = 45; token = 1; type = "goal"; emoji = "⚽"; text = "GOAL! Neymar Jr free kick into the top corner!" },
    @{ minute = 45; token = 3; type = "assist"; emoji = "🅰️"; text = "ASSIST by Yamal - won the foul for the free kick" },
    @{ minute = 56; token = 5; type = "missed"; emoji = "❌"; text = "PENALTY MISSED by Memphis Depay - saved!" },
    @{ minute = 67; token = 2; type = "goal"; emoji = "⚽"; text = "GOAL! Mbappe again - 2 goals now!" },
    @{ minute = 78; token = 4; type = "goal"; emoji = "⚽"; text = "GOAL! Bellingham volleys it home!" },
    @{ minute = 78; token = 1; type = "assist"; emoji = "🅰️"; text = "ASSIST by Neymar - chipped ball over defense" },
    @{ minute = 85; token = 5; type = "red"; emoji = "🟥"; text = "RED CARD! Memphis Depay sent off - second yellow" },
    @{ minute = 90; token = 2; type = "goal"; emoji = "⚽"; text = "HAT-TRICK! Mbappe completes the hat-trick!" }
)

foreach ($e in $events) {
    Write-Event $e.minute $e.emoji $e.text
    $null = Invoke-DemoApi "event/$($e.token)/$($e.type)" "POST"
    Start-Sleep -Milliseconds 600
}

Write-Host ""
Write-Host "  FULL TIME! Barcelona 6 - 0 Real Madrid" -ForegroundColor Green
Write-Host ""

Write-Host "  Press ENTER to trigger Chainlink CRE price update..." -ForegroundColor Yellow
$null = Read-Host

# Step 4: CRE Oracle Update
Write-Header "STEP 4: CHAINLINK CRE ORACLE UPDATE"
Write-Host ""
Write-Host "  [CRE] Triggering price recalculation..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

Write-Host "  [CRE] Fetching match statistics..." -ForegroundColor DarkGray
Start-Sleep -Milliseconds 400

Write-Host "  [CRE] Applying price formula:" -ForegroundColor DarkGray
Write-Host "        Price = IPO + (Net_Yield × Form_Mult × Age_Mult)" -ForegroundColor DarkYellow
Start-Sleep -Milliseconds 400

Write-Host "  [CRE] Calculating new prices..." -ForegroundColor DarkGray
Start-Sleep -Milliseconds 600

# End match to calculate prices
$result = Invoke-DemoApi "match/end" "POST"

Write-Host "  [CRE] Writing to blockchain (simulated)..." -ForegroundColor DarkGray
Start-Sleep -Milliseconds 400

Write-Host ""
Write-Host "  ✅ PRICE UPDATE COMPLETE!" -ForegroundColor Green
Write-Host ""

# Step 5: Show Results
Write-Header "STEP 5: UPDATED ATHLETE PRICES"

$athletes = Invoke-DemoApi "athletes"
Write-PriceTable $athletes

Write-Host ""
Write-Host "  PRICE CHANGE BREAKDOWN" -ForegroundColor Cyan
Write-Host "  " + ("-" * 55) -ForegroundColor DarkGray

foreach ($a in $result.results) {
    $change = $a.newPrice - 100
    $pct = ($change / 100) * 100
    $sign = if ($change -ge 0) { "+" } else { "" }
    $color = if ($change -ge 0) { "Green" } else { "Red" }
    
    Write-Host ("  {0,-20}" -f $a.name) -NoNewline -ForegroundColor White
    Write-Host (" $100.00 -> " -f "") -NoNewline -ForegroundColor DarkGray
    Write-Host ("${0:C2}" -f $a.newPrice) -NoNewline -ForegroundColor $color
    Write-Host (" ({0}{1:P1})" -f $sign, ($pct/100)) -ForegroundColor $color
    
    # Stats breakdown
    $b = $a.breakdown
    if ($b.goals -gt 0 -or $b.assists -gt 0 -or $b.yellowCards -gt 0 -or $b.redCards -gt 0) {
        $statsText = "    "
        if ($b.goals -gt 0) { $statsText += "⚽$($b.goals) " }
        if ($b.assists -gt 0) { $statsText += "🅰️$($b.assists) " }
        if ($b.yellowCards -gt 0) { $statsText += "🟨$($b.yellowCards) " }
        if ($b.redCards -gt 0) { $statsText += "🟥$($b.redCards) " }
        Write-Host $statsText -ForegroundColor DarkGray
    }
}

Write-Host "  " + ("-" * 55) -ForegroundColor DarkGray

Write-Host ""
Write-Header "DEMO COMPLETE!"
Write-Host ""
Write-Host "  This demonstrates how Chainlink CRE Workflows enable:" -ForegroundColor White
Write-Host "    • Real-time athlete price updates based on match performance" -ForegroundColor DarkGray
Write-Host "    • Decentralized oracle computation (verifiable & trustless)" -ForegroundColor DarkGray
Write-Host "    • Automated on-chain price feeds for ERC-1155 athlete tokens" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Learn more at: stockballer.app" -ForegroundColor Cyan
Write-Host ""
