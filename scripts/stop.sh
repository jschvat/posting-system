#!/bin/bash

# Stop script for the posting system application

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping posting system application...${NC}"

# Read PIDs from files if they exist
if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        echo -e "${GREEN}Backend server stopped (PID: ${BACKEND_PID})${NC}"
    else
        echo -e "${YELLOW}Backend server not running${NC}"
    fi
    rm logs/backend.pid
else
    echo -e "${YELLOW}No backend PID file found${NC}"
fi

if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID
        echo -e "${GREEN}Frontend server stopped (PID: ${FRONTEND_PID})${NC}"
    else
        echo -e "${YELLOW}Frontend server not running${NC}"
    fi
    rm logs/frontend.pid
else
    echo -e "${YELLOW}No frontend PID file found${NC}"
fi

# Fallback: kill any processes on the ports from .env files
if [ -f backend/.env ] && [ -f frontend/.env ]; then
    BACKEND_PORT=$(grep "^API_PORT=" backend/.env | cut -d '=' -f2)
    FRONTEND_PORT=$(grep "^PORT=" frontend/.env | cut -d '=' -f2)

    if [ ! -z "$BACKEND_PORT" ] && lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        kill -9 $(lsof -ti:$BACKEND_PORT) 2>/dev/null
        echo -e "${GREEN}Killed process on port ${BACKEND_PORT}${NC}"
    fi

    if [ ! -z "$FRONTEND_PORT" ] && lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        kill -9 $(lsof -ti:$FRONTEND_PORT) 2>/dev/null
        echo -e "${GREEN}Killed process on port ${FRONTEND_PORT}${NC}"
    fi
fi

echo -e "${GREEN}✓ Application stopped${NC}"
