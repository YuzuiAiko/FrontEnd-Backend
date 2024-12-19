# run.ps1

# Function to stop all running processes for the project
function Stop-AllProcesses {
    Write-Host "Stopping all processes..."
    # Get all processes started by this script (node and python)
    $processes = Get-Process | Where-Object { $_.Name -in @("python", "node") }
    if ($processes) {
        $processes | Stop-Process -Force
        Write-Host "All processes stopped successfully."
    } else {
        Write-Host "No matching processes found to stop."
    }
}

# Register a cleanup event to stop processes when the script exits
$script:ExitHandler = {
    Stop-AllProcesses
}
Register-EngineEvent PowerShell.Exiting -Action $script:ExitHandler

# Check and install Python dependencies
Write-Host "Checking Python dependencies..."
Push-Location ./backend/classifier
if (Test-Path "requirements.txt") {
    python -m pip install -r requirements.txt
} else {
    Write-Host "No requirements.txt found. Skipping Python dependency installation."
}
Pop-Location

# Check and install Node.js dependencies for backend
Write-Host "Checking Node.js dependencies for backend..."
Push-Location ./backend
if (Test-Path "package.json") {
    npm install
} else {
    Write-Host "No package.json found in backend. Skipping Node.js dependency installation."
}
Pop-Location

# Check and install Node.js dependencies for frontend
Write-Host "Checking Node.js dependencies for frontend..."
Push-Location ./frontend
if (Test-Path "package.json") {
    npm install
} else {
    Write-Host "No package.json found in frontend. Skipping Node.js dependency installation."
}
Pop-Location

# Start Python process
Write-Host "Starting SVM Model..."
Push-Location ./backend/classifier
Start-Process -FilePath "python" -ArgumentList "svm_model.py"
Pop-Location

# Start Node.js backend
Write-Host "Starting Backend Server..."
Push-Location ./backend
Start-Process -FilePath "node" -ArgumentList "server.js"
Pop-Location

# Start React frontend
Write-Host "Starting Frontend..."
Push-Location ./frontend
Start-Process -FilePath "npm" -ArgumentList "start"
Pop-Location

Write-Host "All processes have been started successfully!"
