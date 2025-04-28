# Define parameters
param (
    [string]$Service = "all" # Default to "all" if no parameter is provided
)

# Function to stop all running processes for the project
function Stop-AllProcesses {
    Write-Host "Stopping all processes..."
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

# Helper function to run a process and keep the window open upon error or exit
function Start-ProcessWithWindow {
    param (
        [string]$Path,
        [string]$Arguments,
        [string]$WorkingDirectory
    )
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$WorkingDirectory'; $Path $Arguments"
}

# Install dependencies for Python and Node.js
if ($Service -eq "install" -or $Service -eq "all") {
    Write-Host "Installing Python dependencies..."
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd './backend/classifier'; pip install -r requirements.txt"

    Write-Host "Installing Node.js dependencies for backend..."
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd './backend'; npm install --verbose"

    Write-Host "Installing Node.js dependencies for frontend..."
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd './frontend'; npm install --verbose"
}

# Start services based on the parameter
if ($Service -eq "svm" -or $Service -eq "all") {
    Write-Host "Starting SVM Model..."
    Start-ProcessWithWindow -Path "python" -Arguments "svm_model.py" -WorkingDirectory "./backend/classifier"
}

if ($Service -eq "backend" -or $Service -eq "all") {
    Write-Host "Starting Backend Server..."
    Start-ProcessWithWindow -Path "node" -Arguments "server.js" -WorkingDirectory "./backend"
}

if ($Service -eq "frontend" -or $Service -eq "all") {
    Write-Host "Starting Frontend..."
    Start-ProcessWithWindow -Path "npm" -Arguments "start" -WorkingDirectory "./frontend"
}

Write-Host "All processes have been started successfully!"