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

# Allow optional GMAIL_CLIENT_INDEX argument as second param
GMAIL_INDEX="${2:-}"

# Start tmux session with environment variable prefixes to ensure selection is passed into panes
if [ -n "$GMAIL_INDEX" ]; then
    tmux new-session -d -s services "GMAIL_CLIENT_INDEX=$GMAIL_INDEX python backend/classifier/svm_model.py --verbose"
    tmux split-window -h "GMAIL_CLIENT_INDEX=$GMAIL_INDEX node backend/server.js --verbose"
    tmux split-window -v "GMAIL_CLIENT_INDEX=$GMAIL_INDEX bash -lc 'cd frontend && npm start --verbose'"
else
    tmux new-session -d -s services "python backend/classifier/svm_model.py --verbose"
    tmux split-window -h "node backend/server.js --verbose"
    tmux split-window -v "cd frontend && npm start --verbose"
fi

# Select the first pane
tmux select-pane -t 0

# Attach to the tmux session
tmux attach-session -t services