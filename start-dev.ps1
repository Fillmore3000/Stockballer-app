# StockBaller Development Startup Script
# Ensures MongoDB is running before starting API and Frontend

Write-Host "[STARTUP] StockBaller Development Environment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if Docker is running
$dockerRunning = $null
try {
    $dockerRunning = docker info 2>$null
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Docker is running" -ForegroundColor Green

# Check if MongoDB container exists
$mongoContainer = docker ps -a --filter "name=stockballer-mongo" --format "{{.Names}}" 2>$null

if ($mongoContainer -eq "stockballer-mongo") {
    # Container exists, check if running
    $mongoRunning = docker ps --filter "name=stockballer-mongo" --format "{{.Names}}" 2>$null
    
    if ($mongoRunning -eq "stockballer-mongo") {
        Write-Host "[OK] MongoDB container is already running" -ForegroundColor Green
    } else {
        Write-Host "[...] Starting existing MongoDB container..." -ForegroundColor Yellow
        docker start stockballer-mongo
        Start-Sleep -Seconds 3
        Write-Host "[OK] MongoDB started" -ForegroundColor Green
    }
} else {
    # Container doesn't exist, create it
    Write-Host "[...] Creating new MongoDB container with replica set..." -ForegroundColor Yellow
    docker run -d --name stockballer-mongo -p 27017:27017 -v stockballer-mongo-data:/data/db mongo:7 --replSet rs0
    
    Write-Host "[...] Waiting for MongoDB to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host "[...] Initializing replica set..." -ForegroundColor Yellow
    docker exec stockballer-mongo mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
    Start-Sleep -Seconds 3
    
    Write-Host "[OK] MongoDB replica set initialized" -ForegroundColor Green
}

# Test MongoDB connection
Write-Host ""
Write-Host "[...] Testing MongoDB connection..." -ForegroundColor Yellow
$mongoTest = docker exec stockballer-mongo mongosh --eval "db.runCommand({ ping: 1 })" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] MongoDB is ready and accepting connections" -ForegroundColor Green
} else {
    Write-Host "[WARN] MongoDB may need more time to initialize" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "[READY] MongoDB is ready! Start the services:" -ForegroundColor Green
Write-Host ""
Write-Host "  Terminal 1 (API):      cd api; npm run start:dev" -ForegroundColor White
Write-Host "  Terminal 2 (Frontend): npm run web" -ForegroundColor White
Write-Host ""
Write-Host "Or run both in separate terminals." -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Cyan
