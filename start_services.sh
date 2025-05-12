#!/bin/bash

# Check if the first argument is "install" to install dependencies
if [ "$1" == "install" ]; then
    echo "Installing Python dependencies..."
    pip install -r backend/classifier/requirements.txt --verbose

    echo "Installing Node.js dependencies for backend..."
    cd backend && npm install --legacy-peer-deps --verbose && cd ..

    echo "Installing Node.js dependencies for frontend..."
    cd frontend && npm install --legacy-peer-deps --verbose && cd ..
fi

# Create a new tmux session named "services"
tmux new-session -d -s services "python backend/classifier/svm_model.py --verbose"

# Split the window horizontally and start the backend server
tmux split-window -h "node backend/server.js --verbose"

# Split the window vertically and start the frontend
tmux split-window -v "cd frontend && npm start --verbose"

# Select the first pane
tmux select-pane -t 0

# Attach to the tmux session
tmux attach-session -t services