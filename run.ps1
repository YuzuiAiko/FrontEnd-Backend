# run.ps1

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

# Start Python process
Write-Host "Starting SVM Model..."
Start-ProcessWithWindow -Path "python" -Arguments "svm_model.py" -WorkingDirectory "./backend/classifier"

# Start Node.js backend
Write-Host "Starting Backend Server..."
Start-ProcessWithWindow -Path "node" -Arguments "server.js" -WorkingDirectory "./backend"

# Start React frontend
Write-Host "Starting Frontend..."
Start-ProcessWithWindow -Path "npm" -Arguments "start" -WorkingDirectory "./frontend"

Write-Host "All processes have been started successfully!"
