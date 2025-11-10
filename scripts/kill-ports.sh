#!/bin/bash

# Script to find and kill processes running on specified ports
# Usage: ./kill-ports.sh <port1> [port2] [port3] ...

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if at least one port was provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No ports specified${NC}"
    echo "Usage: $0 <port1> [port2] [port3] ..."
    echo "Example: $0 3000 5432 8080"
    exit 1
fi

# Function to find and kill process on a port
kill_port() {
    local port=$1

    echo -e "\n${YELLOW}Checking port $port...${NC}"

    # Find PIDs using the port (works on Linux)
    local pids=$(ss -lptn "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)

    # If ss didn't work or find anything, try lsof as fallback
    if [ -z "$pids" ]; then
        pids=$(lsof -ti :$port 2>/dev/null || true)
    fi

    if [ -z "$pids" ]; then
        echo -e "${GREEN}No process found on port $port${NC}"
        return
    fi

    # Display process information
    echo -e "${YELLOW}Found process(es) on port $port:${NC}"
    for pid in $pids; do
        local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        local full_cmd=$(ps -p $pid -o args= 2>/dev/null || echo "unknown")
        echo -e "  PID: ${GREEN}$pid${NC} | Command: ${GREEN}$cmd${NC}"
        echo -e "  Full: $full_cmd"
    done

    # Ask for confirmation
    read -p "Kill process(es) on port $port? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for pid in $pids; do
            if kill $pid 2>/dev/null; then
                echo -e "${GREEN}✓ Killed process $pid${NC}"
            else
                echo -e "${RED}✗ Failed to kill process $pid (try with sudo?)${NC}"
            fi
        done
    else
        echo -e "${YELLOW}Skipped port $port${NC}"
    fi
}

# Process each port argument
for port in "$@"; do
    # Validate port number
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        echo -e "${RED}Error: Invalid port number '$port' (must be 1-65535)${NC}"
        continue
    fi

    kill_port "$port"
done

echo -e "\n${GREEN}Done!${NC}"
