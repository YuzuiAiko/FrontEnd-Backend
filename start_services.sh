#!/bin/bash

# Create a new tmux session named "services"
tmux new-session -d -s services "python backend/classifier/svm_model.py"

# Split the window horizontally and start the backend server
tmux split-window -h "node backend/server.js"

# Split the window vertically and start the frontend
tmux split-window -v "cd frontend && npm start"

# Select the first pane
tmux select-pane -t 0

# Attach to the tmux session
tmux attach-session -t services