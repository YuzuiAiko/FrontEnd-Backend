# run.ps1

Write-Host "Running tasks in VS Code..."

# Use the VS Code CLI to start the tasks.json tasks
code --reuse-window --add .
code --execute-task "Start Python SVM Model"
code --execute-task "Start Node.js Backend"
code --execute-task "Start React Frontend"

Write-Host "All tasks started successfully!"
