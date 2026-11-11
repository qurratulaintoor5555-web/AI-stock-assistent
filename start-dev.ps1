# ==============================================================================
# One-Click Development Launcher for AI Stock Market Assistant
# Starts FastAPI Backend (Port 8000) and React Vite Frontend (Port 5173)
# ==============================================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting AI Stock Market Assistant Development" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend in background job
Write-Host "[1/2] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$BackendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='backend'; py -m uvicorn app.main:app --app-dir backend --port 8000 --reload" -PassThru

# 2. Wait 2 seconds for backend to initialize
Start-Sleep -Seconds 2

# 3. Start React Frontend
Write-Host "[2/2] Launching React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Set-Location "frontend\stock-assistant-ui"
npm run dev

# Cleanup when done
if ($BackendProcess) {
    Stop-Process -Id $BackendProcess.Id -Force
}
