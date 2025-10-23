# Function to display a step header
function Write-StepHeader {
    param([string]$Message)
    Write-Host "`n===================================================="
    Write-Host $Message
    Write-Host "====================================================`n"
}

# Function to check if a command succeeded
function Assert-LastExitCode {
    param([string]$ErrorMessage)
    if ($LASTEXITCODE -ne 0) {
        Write-Error $ErrorMessage
        exit $LASTEXITCODE
    }
}

# Stop any existing processes that might interfere
Write-StepHeader "Stopping any running processes..."
Get-Process | Where-Object { $_.Name -in @("node", "python") } | Stop-Process -Force -ErrorAction SilentlyContinue

# Clean up old build artifacts
Write-StepHeader "Cleaning up old builds..."
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
if (Test-Path "frontend/build") {
    Remove-Item -Recurse -Force "frontend/build"
}

# Install dependencies
Write-StepHeader "Installing root dependencies..."
npm install --verbose
Assert-LastExitCode "Failed to install root dependencies"

Write-StepHeader "Installing frontend dependencies..."
Set-Location frontend
npm install --verbose
Assert-LastExitCode "Failed to install frontend dependencies"
Set-Location ..

Write-StepHeader "Installing backend dependencies..."
Set-Location backend
npm install --verbose
Assert-LastExitCode "Failed to install backend dependencies"
Set-Location ..

# Build frontend
Write-StepHeader "Building frontend..."
Set-Location frontend
npm run build
Assert-LastExitCode "Failed to build frontend"
Set-Location ..

# Create executable
Write-StepHeader "Creating Windows executable..."
npm run dist
Assert-LastExitCode "Failed to create executable"

Write-StepHeader "Build completed successfully!"
Write-Host "The installer can be found in the 'dist' directory."
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")