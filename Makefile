# Makefile for running the SVM Model, Backend, and Frontend services

.PHONY: all svm backend frontend run stop install

# Default target to run all services
all: run

# Target to start the SVM Model
svm:
	@echo "Starting SVM Model..."
	python backend/classifier/svm_model.py

# Target to start the Backend Server
backend:
	@echo "Starting Backend Server..."
	node backend/server.js

# Target to start the Frontend
frontend:
	@echo "Starting Frontend..."
	cd frontend && npm start

# Target to run all services concurrently in a cross-platform way
run:
	@echo "Starting all services (SVM Model, Backend, Frontend)..."
	$(MAKE) svm & \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

# Target to stop all running processes
stop:
	@echo "Stopping all processes..."
	pkill -f "python backend/classifier/svm_model.py" || true
	pkill -f "node backend/server.js" || true
	pkill -f "npm start" || true

# Target to install dependencies for all services
install:
	@echo "Installing Python dependencies..."
	pip install -r backend/classifier/requirements.txt --verbose
	@echo "Installing Node.js dependencies for backend..."
	cd backend && npm install --legacy-peer-deps --verbose
	@echo "Installing Node.js dependencies for frontend..."
	cd frontend && npm install --legacy-peer-deps --verbose

# Test targets for each microservice and an aggregate target
.PHONY: test test-classifier test-backend test-frontend test-all

# Run classifier (python) tests only
test-classifier:
	@echo "Running classifier (Python) tests..."
	python -m pytest backend/classifier

# Run backend (node) tests only
test-backend:
	@echo "Running backend (Node) tests..."
	cd backend && npm test

# Run frontend (react) tests only
test-frontend:
	@echo "Running frontend (React) tests..."
	cd frontend && npm test -- --watchAll=false

# Run all tests in sequence
test-all: test-classifier test-backend test-frontend

# Default test alias
test: test-all