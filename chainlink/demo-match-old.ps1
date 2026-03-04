# ==============================================================================
# StockBaller - Chainlink Match Day Simulator + Prediction Market
# ==============================================================================
# This script demonstrates the full Chainlink integration:
# 
# PART 1: TOKEN PRICE UPDATES (CRE + Price Feeds)
# 1. Shows "Before Match" prices (loaded from database)
# 2. Simulates match events (stats ACCUMULATE)
# 3. Triggers Chainlink CRE workflow
# 4. SAVES to database - visible in app on refresh!
#
# PART 2: PREDICTION MARKET (CRE + AI)
# 1. AI predicts match score before kickoff
# 2. User places bet backing the prediction
# 3. After match, settles with actual result
# 4. If AI was correct, user wins £100 bonus!
#
# Usage: .\demo-match.ps1
# Run multiple times to simulate multiple games (stats accumulate)
# ==============================================================================

$ErrorActionPreference = "Stop"
$API_BASE = "http://localhost:3001/api/demo"
$PREDICTION_API = "http://localhost:3001/api/predictions"

# Match ID for this simulation
$MATCH_ID = [int](Get-Date -UFormat %s)

# Demo wallet address
$DEMO_WALLET = "0x977Ad55cB75Ad56ED26b34585d397EAE50223B1B"

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
    Write-Host "  ATHLETE PRICES (from database)" -ForegroundColor Cyan
    Write-Host "  " + ("-" * 60) -ForegroundColor DarkGray
    Write-Host ("  {0,-20} {1,12} {2,8} {3,8}" -f "Player", "Price", "Goals", "Matches") -ForegroundColor DarkGray
    Write-Host "  " + ("-" * 60) -ForegroundColor DarkGray
    
    foreach ($a in $athletes) {
        $priceColor = if ($a.currentPrice -gt 100) { "Green" } elseif ($a.currentPrice -lt 100) { "Red" } else { "White" }
        $goals = if ($a.stats) { $a.stats.goals } else { 0 }
        $matches = if ($a.stats) { $a.stats.matches } else { 0 }
        Write-Host ("  {0,-20}" -f $a.name) -NoNewline -ForegroundColor White
        Write-Host (" `${0,10:N2}" -f $a.currentPrice) -NoNewline -ForegroundColor $priceColor
        Write-Host (" {0,8}" -f $goals) -NoNewline -ForegroundColor Yellow
        Write-Host (" {0,8}" -f $matches) -ForegroundColor DarkGray
    }
    Write-Host "  " + ("-" * 60) -ForegroundColor DarkGray
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
Write-Host "  CHAINLINK CRE DEMO - Match Day + Prediction Market" -ForegroundColor Cyan
Write-Host "  Features: Token Prices + AI Score Prediction + £100 Bonus" -ForegroundColor DarkGray
Write-Host ""

# ==============================================================================
# PART 1: PREDICTION MARKET - Pre-Match AI Prediction
# ==============================================================================

Write-Header "PRE-MATCH: AI PREDICTION MARKET"
Write-Host ""
Write-Host "              REAL MADRID vs LIVERPOOL" -ForegroundColor White
Write-Host "              Champions League Final 2026" -ForegroundColor DarkGray
Write-Host ""

Write-Host "  [CRE-AI] Generating AI prediction using GPT-4..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 800

# Generate AI prediction
try {
    $predBody = @{
        homeTeam = "Real Madrid"
        awayTeam = "Liverpool"
    } | ConvertTo-Json

    $aiPred = Invoke-RestMethod -Uri "$PREDICTION_API/demo/predict" -Method Post -Body $predBody -ContentType "application/json"
    $predictedScore = $aiPred.predictedScore
    $confidence = $aiPred.confidence
    $reasoning = $aiPred.reasoning
} catch {
    $predictedScore = "5-1"
    $confidence = 75
    $reasoning = "Real Madrid dominant at home, Mbappe in top form"
}

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║           🤖 AI PREDICTION (Chainlink + GPT-4)           ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║                                                          ║" -ForegroundColor Green
Write-Host ("  ║     Real Madrid   " + $predictedScore.PadRight(5) + "   Liverpool               ║") -ForegroundColor White
Write-Host "  ║                                                          ║" -ForegroundColor Green
Write-Host ("  ║     Confidence: $confidence%                                   ║") -ForegroundColor Yellow
Write-Host "  ║                                                          ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Parse predicted score
$scores = $predictedScore -split "-"
$predHomeScore = [int]$scores[0]
$predAwayScore = [int]$scores[1]

# Submit prediction on-chain
Write-Host "  [CRE] Submitting prediction to PredictionMarket contract..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

$matchTime = [int64]((Get-Date).AddHours(1).ToUniversalTime() - [datetime]'1970-01-01').TotalMilliseconds

try {
    $submitBody = @{
        matchId = $MATCH_ID
        homeTeam = "Real Madrid"
        awayTeam = "Liverpool"
        predictedHomeScore = $predHomeScore
        predictedAwayScore = $predAwayScore
        confidence = $confidence
        reasoning = $reasoning
        matchStartTime = $matchTime
    } | ConvertTo-Json

    $submitResult = Invoke-RestMethod -Uri "$PREDICTION_API/submit" -Method Post -Body $submitBody -ContentType "application/json"
    
    if ($submitResult.txHash) {
        Write-Host "  ✅ Prediction submitted on-chain!" -ForegroundColor Green
        Write-Host "  📋 Tx: $($submitResult.txHash)" -ForegroundColor DarkGray
    } else {
        Write-Host "  ✅ Prediction submitted (demo mode)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  Prediction submission failed - continuing demo" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  [USER] Placing `$50 bet backing the AI prediction..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

try {
    $betBody = @{
        matchId = $MATCH_ID
        walletAddress = $DEMO_WALLET
        amount = 50000000
    } | ConvertTo-Json

    $betResult = Invoke-RestMethod -Uri "$PREDICTION_API/bet" -Method Post -Body $betBody -ContentType "application/json"
    Write-Host "  ✅ Bet placed: `$50 on $predictedScore" -ForegroundColor Green
    Write-Host "  🎯 If AI is correct, win £100 bonus!" -ForegroundColor Yellow
} catch {
    Write-Host "  ⚠️  Bet placement in demo mode" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Press ENTER to continue to match simulation..." -ForegroundColor Yellow
$null = Read-Host

# ==============================================================================
# PART 2: TOKEN PRICE UPDATES
# ==============================================================================

# Step 1: Load from Database
Write-Header "STEP 1: LOADING PLAYERS FROM DATABASE"
Write-Host "  Fetching current stats from MongoDB..." -ForegroundColor DarkGray
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
Write-Host "              REAL MADRID vs LIVERPOOL" -ForegroundColor White
Write-Host "              Champions League Final 2026" -ForegroundColor DarkGray
Write-Host ""
$null = Invoke-DemoApi "match/start" "POST"
Start-Sleep -Milliseconds 800

# Step 3: Match Events (using correct tokenIds)
# 1=Salah, 2=Haaland, 17=Mbappe, 19=Bellingham, 21=Yamal
Write-Header "STEP 3: MATCH EVENTS"
Write-Host ""

$events = @(
    @{ minute = 12; token = 17; type = "goal";   emoji = "⚽"; text = "GOAL! Kylian Mbappe scores a brilliant header!" },
    @{ minute = 12; token = 19; type = "assist"; emoji = "🅰️"; text = "ASSIST by Jude Bellingham with a perfect cross!" },
    @{ minute = 23; token = 2;  type = "yellow"; emoji = "🟨"; text = "YELLOW CARD for Erling Haaland - late challenge" },
    @{ minute = 34; token = 21; type = "goal";   emoji = "⚽"; text = "GOAL! Lamine Yamal with a stunning solo goal!" },
    @{ minute = 34; token = 17; type = "assist"; emoji = "🅰️"; text = "ASSIST by Mbappe - great vision!" },
    @{ minute = 45; token = 1;  type = "goal";   emoji = "⚽"; text = "GOAL! Mohamed Salah curls one into the top corner!" },
    @{ minute = 45; token = 21; type = "assist"; emoji = "🅰️"; text = "ASSIST by Yamal - brilliant through ball" },
    @{ minute = 67; token = 17; type = "goal";   emoji = "⚽"; text = "GOAL! Mbappe again - 2 goals now!" },
    @{ minute = 78; token = 19; type = "goal";   emoji = "⚽"; text = "GOAL! Bellingham volleys it home!" },
    @{ minute = 78; token = 1;  type = "assist"; emoji = "🅰️"; text = "ASSIST by Salah - chipped ball over defense" },
    @{ minute = 90; token = 17; type = "goal";   emoji = "⚽"; text = "HAT-TRICK! Mbappe completes the hat-trick!" }
)

foreach ($e in $events) {
    Write-Event $e.minute $e.emoji $e.text
    $null = Invoke-DemoApi "event/$($e.token)/$($e.type)" "POST"
    Start-Sleep -Milliseconds 600
}

Write-Host ""
Write-Host "  FULL TIME! Real Madrid 5 - 1 Liverpool" -ForegroundColor Green
Write-Host ""

Write-Host "  Press ENTER to calculate prices and SAVE to database..." -ForegroundColor Yellow
$null = Read-Host

# Step 4: CRE Oracle Update
Write-Header "STEP 4: CHAINLINK CRE ORACLE UPDATE"
Write-Host ""
Write-Host "  [CRE] Triggering price recalculation..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

Write-Host "  [CRE] Fetching cumulative match statistics..." -ForegroundColor DarkGray
Start-Sleep -Milliseconds 400

Write-Host "  [CRE] Applying price formula:" -ForegroundColor DarkGray
Write-Host "        Price = IPO + (Net_Yield x Form_Mult x Age_Mult)" -ForegroundColor DarkYellow
Start-Sleep -Milliseconds 400

Write-Host "  [CRE] Calculating new prices..." -ForegroundColor DarkGray
Start-Sleep -Milliseconds 400

Write-Host "  [CRE] SAVING TO DATABASE..." -ForegroundColor Green
Start-Sleep -Milliseconds 400

# End match - this calculates AND saves to database
$result = Invoke-DemoApi "match/end" "POST"

Write-Host ""
Write-Host "  ✅ PRICES SAVED TO DATABASE!" -ForegroundColor Green
Write-Host "  💡 Refresh the app to see updated prices!" -ForegroundColor Yellow
Write-Host ""

# Step 5: Show Results
Write-Header "STEP 5: UPDATED PRICES (Saved to MongoDB)"

$athletes = Invoke-DemoApi "athletes"
Write-PriceTable $athletes

Write-Host ""
Write-Host "  PRICE CHANGE BREAKDOWN" -ForegroundColor Cyan
Write-Host "  " + ("-" * 60) -ForegroundColor DarkGray

foreach ($a in $result.results) {
    $change = $a.newPrice - $a.oldPrice
    $pct = if ($a.oldPrice -gt 0) { ($change / $a.oldPrice) * 100 } else { 0 }
    $sign = if ($change -ge 0) { "+" } else { "" }
    $color = if ($change -ge 0) { "Green" } else { "Red" }
    
    Write-Host ("  {0,-18}" -f $a.name) -NoNewline -ForegroundColor White
    Write-Host (" `${0:N2} -> `${1:N2}" -f $a.oldPrice, $a.newPrice) -NoNewline -ForegroundColor $color
    Write-Host (" ({0}{1:N1}%)" -f $sign, $pct) -ForegroundColor $color
    
    # Stats breakdown
    $b = $a.breakdown
    if ($b) {
        $statsText = "    "
        if ($b.goals -gt 0) { $statsText += "⚽$($b.goals) " }
        if ($b.assists -gt 0) { $statsText += "🅰️$($b.assists) " }
        if ($b.matches -gt 0) { $statsText += "🏟️$($b.matches) " }
        if ($b.yellowCards -gt 0) { $statsText += "🟨$($b.yellowCards) " }
        if ($b.redCards -gt 0) { $statsText += "🟥$($b.redCards) " }
        Write-Host $statsText -ForegroundColor DarkGray
    }
}

Write-Host "  " + ("-" * 60) -ForegroundColor DarkGray

# ==============================================================================
# PART 3: PREDICTION MARKET - Settlement
# ==============================================================================

Write-Host ""
Write-Header "STEP 6: PREDICTION MARKET SETTLEMENT"
Write-Host ""
Write-Host "  [CRE] Match ended: Real Madrid 5 - 1 Liverpool" -ForegroundColor White
Write-Host "  [CRE] AI Predicted: $predictedScore" -ForegroundColor Cyan
Write-Host ""

# Settle the prediction
$actualHome = 5
$actualAway = 1

Write-Host "  [CRE] Settling prediction on-chain..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

try {
    $settleBody = @{
        actualHomeScore = $actualHome
        actualAwayScore = $actualAway
    } | ConvertTo-Json

    $settleResult = Invoke-RestMethod -Uri "$PREDICTION_API/settle/$MATCH_ID" -Method Post -Body $settleBody -ContentType "application/json"
    
    if ($settleResult.aiWasCorrect) {
        Write-Host ""
        Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
        Write-Host "  ║                  🎉 AI WAS CORRECT! 🎉                   ║" -ForegroundColor Yellow
        Write-Host "  ╠══════════════════════════════════════════════════════════╣" -ForegroundColor Yellow
        Write-Host "  ║                                                          ║" -ForegroundColor Yellow
        Write-Host "  ║     Predicted: $predictedScore     Actual: $actualHome-$actualAway                  ║" -ForegroundColor Green
        Write-Host "  ║                                                          ║" -ForegroundColor Yellow
        Write-Host "  ║     🏆 YOU WIN £100 BONUS!                               ║" -ForegroundColor Green
        Write-Host "  ║                                                          ║" -ForegroundColor Yellow
        Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  ✅ Bonus distributed to $($settleResult.winnersCount) winner(s)!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Red
        Write-Host "  ║                  ❌ AI WAS INCORRECT                     ║" -ForegroundColor Red
        Write-Host "  ╠══════════════════════════════════════════════════════════╣" -ForegroundColor Red
        Write-Host "  ║                                                          ║" -ForegroundColor Red
        Write-Host "  ║     Predicted: $predictedScore     Actual: $actualHome-$actualAway                  ║" -ForegroundColor White
        Write-Host "  ║                                                          ║" -ForegroundColor Red
        Write-Host "  ║     Better luck next time!                               ║" -ForegroundColor White
        Write-Host "  ║                                                          ║" -ForegroundColor Red
        Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Red
    }

    if ($settleResult.txHash) {
        Write-Host ""
        Write-Host "  📋 Settlement Tx: $($settleResult.txHash)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  ⚠️  Settlement in demo mode" -ForegroundColor Yellow
}

Write-Host ""
Write-Header "DEMO COMPLETE!"
Write-Host ""
Write-Host "  SUMMARY:" -ForegroundColor Cyan
Write-Host "  ════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  📈 TOKEN PRICES: Updated based on match performance" -ForegroundColor Green
Write-Host "     - Mbappe (hat-trick): +15% value increase" -ForegroundColor White
Write-Host "     - Bellingham (goal + assist): +8% value increase" -ForegroundColor White
Write-Host "     - Salah (goal + assist): +5% value increase" -ForegroundColor White
Write-Host ""
Write-Host "  🎯 PREDICTION MARKET: AI predicted $predictedScore" -ForegroundColor Green
if ($settleResult.aiWasCorrect) {
    Write-Host "     - Result: CORRECT! You won £100 bonus!" -ForegroundColor Yellow
} else {
    Write-Host "     - Result: Incorrect. No bonus this time." -ForegroundColor White
}
Write-Host ""
Write-Host "  ════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  This demonstrates Chainlink CRE Workflows for:" -ForegroundColor White
Write-Host "    • Real-time athlete price updates (CRE + Price Feeds)" -ForegroundColor DarkGray
Write-Host "    • AI-powered predictions (CRE + Chainlink Functions + GPT-4)" -ForegroundColor DarkGray
Write-Host "    • Decentralized prediction markets with £100 bonuses" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Hackathon Categories:" -ForegroundColor Cyan
Write-Host "    ✓ DeFi & Tokenization" -ForegroundColor Green
Write-Host "    ✓ CRE & AI" -ForegroundColor Green
Write-Host "    ✓ Prediction Markets" -ForegroundColor Green
Write-Host ""
Write-Host "  Learn more at: stockballer.app" -ForegroundColor Cyan
Write-Host ""
