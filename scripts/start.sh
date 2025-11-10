#!/bin/bash

# Startup script for the posting system application
# Starts both frontend and backend servers using ports from .env files

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Starting Posting System Application${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if .env files exist
if [ ! -f backend/.env ]; then
    echo -e "${RED}Error: backend/.env file not found${NC}"
    exit 1
fi

if [ ! -f frontend/.env ]; then
    echo -e "${RED}Error: frontend/.env file not found${NC}"
    exit 1
fi

# Load backend port
BACKEND_PORT=$(grep "^API_PORT=" backend/.env | cut -d '=' -f2)
if [ -z "$BACKEND_PORT" ]; then
    echo -e "${YELLOW}Warning: API_PORT not found in backend/.env, using default 3001${NC}"
    BACKEND_PORT=3001
fi

# Load frontend port
FRONTEND_PORT=$(grep "^PORT=" frontend/.env | cut -d '=' -f2)
if [ -z "$FRONTEND_PORT" ]; then
    echo -e "${YELLOW}Warning: PORT not found in frontend/.env, using default 3000${NC}"
    FRONTEND_PORT=3000
fi

echo -e "${GREEN}Configuration:${NC}"
echo -e "  Backend port:  ${BACKEND_PORT}"
echo -e "  Frontend port: ${FRONTEND_PORT}"
echo ""

# Check if ports are already in use
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}Error: Port ${BACKEND_PORT} is already in use${NC}"
    echo -e "${YELLOW}To kill processes on this port, run: kill -9 \$(lsof -ti:${BACKEND_PORT})${NC}"
    exit 1
fi

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}Error: Port ${FRONTEND_PORT} is already in use${NC}"
    echo -e "${YELLOW}To kill processes on this port, run: kill -9 \$(lsof -ti:${FRONTEND_PORT})${NC}"
    exit 1
fi

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

# Create log directory if it doesn't exist
mkdir -p logs

# Start backend server in background
echo -e "${GREEN}Starting backend server on port ${BACKEND_PORT}...${NC}"
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

# Check if backend started successfully
if ! ps -p $BACKEND_PID > /dev/null; then
    echo -e "${RED}Error: Backend failed to start. Check logs/backend.log for details${NC}"
    exit 1
fi

echo -e "${GREEN}Backend started successfully (PID: ${BACKEND_PID})${NC}"

# Start frontend server in background
echo -e "${GREEN}Starting frontend server on port ${FRONTEND_PORT}...${NC}"
cd frontend
PORT=$FRONTEND_PORT npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to initialize
sleep 3

# Check if frontend started successfully
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${RED}Error: Frontend failed to start. Check logs/frontend.log for details${NC}"
    echo -e "${YELLOW}Stopping backend server...${NC}"
    kill $BACKEND_PID
    exit 1
fi

echo -e "${GREEN}Frontend started successfully (PID: ${FRONTEND_PID})${NC}"
echo ""

# Save PIDs for later cleanup
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✓ Application started successfully!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "Backend:  ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "Frontend: ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo ""
echo -e "Logs:"
echo -e "  Backend:  logs/backend.log"
echo -e "  Frontend: logs/frontend.log"
echo ""
echo -e "PIDs:"
echo -e "  Backend:  ${BACKEND_PID}"
echo -e "  Frontend: ${FRONTEND_PID}"
echo ""
echo -e "${YELLOW}To stop the application, run: ./stop.sh${NC}"
echo -e "${YELLOW}Or press Ctrl+C in this terminal and run: kill ${BACKEND_PID} ${FRONTEND_PID}${NC}"
echo ""

# Keep script running and tail logs
trap "echo ''; echo -e '${YELLOW}Stopping servers...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

echo -e "${BLUE}Tailing logs (Ctrl+C to stop):${NC}"
echo -e "${BLUE}================================================${NC}"
tail -f logs/backend.log logs/frontend.log
