# Start demo frontend quickly (PowerShell)
# Usage: .\start_demo.ps1

# Set demo env var for this process
$env:REACT_APP_DEMO = 'true'
# Move into frontend and ensure dependencies installed, then start
Push-Location frontend
if (-not (Test-Path node_modules)) {
    Write-Host "Installing frontend dependencies..."
    npm install
}
Write-Host "Starting frontend in demo mode..."
npm start
Pop-Location
