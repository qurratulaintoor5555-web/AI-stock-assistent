# ==============================================================================
# One-Click Development Launcher for AI Stock Market Assistant
# Starts FastAPI Backend (Port 8000) and React Vite Frontend (Port 5173)
# ==============================================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting AI Stock Market Assistant Development" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend if not already running
$ExistingBackend = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 8000 }
if (-not $ExistingBackend) {
    Write-Host "[1/2] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='backend'; py -m uvicorn app.main:app --app-dir backend --port 8000 --reload"
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/2] FastAPI Backend is already running on port 8000." -ForegroundColor Green
}

# 2. Start React Frontend
Write-Host "[2/2] Launching React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Set-Location "frontend\stock-assistant-ui"

# Launch default browser directly to the app
Start-Process "http://localhost:5173"

npm run dev
