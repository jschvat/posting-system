# Starting the Posting System Servers

The posting system now runs on **three separate servers** for better separation of concerns.

## Server Architecture

1. **API Server** - REST API endpoints (port 3001)
2. **WebSocket Server** - Real-time messaging and notifications (port 3002)
3. **Frontend** - React development server (port 3000)

## Quick Start

### Option 1: Separate Terminals (Recommended for Development)

```bash
# Terminal 1 - API Server
cd /home/jason/Development/claude/posting-system
NODE_ENV=development DB_SSL=false node backend/src/server.js

# Terminal 2 - WebSocket Server
cd /home/jason/Development/claude/posting-system
NODE_ENV=development DB_SSL=false WS_PORT=3002 node backend/src/websocket-server.js

# Terminal 3 - Frontend
cd /home/jason/Development/claude/posting-system/frontend
npm start
```

### Option 2: Background Processes

```bash
# Start all servers in background
NODE_ENV=development DB_SSL=false node backend/src/server.js &
NODE_ENV=development DB_SSL=false WS_PORT=3002 node backend/src/websocket-server.js &
cd frontend && npm start &

# To stop all servers
lsof -ti:3000,3001,3002 | xargs -r kill -9
```

## Health Checks

Once started, verify each server:

```bash
# API Server
curl http://localhost:3001/health

# WebSocket Server
curl http://localhost:3002/health

# Frontend (in browser)
http://localhost:3000
```

## Environment Variables

### Backend (.env or environment)
- `NODE_ENV=development` - Sets development mode
- `DB_SSL=false` - Disables SSL for local PostgreSQL
- `API_PORT=3001` - API server port (default)
- `WS_PORT=3002` - WebSocket server port

### Frontend (frontend/.env)
- `REACT_APP_API_PORT=3001` - API server port
- `REACT_APP_WS_URL=http://localhost:3002` - WebSocket URL
- `PORT=3000` - Frontend dev server port

## Troubleshooting

### CORS Errors in Browser
If you see CORS errors after starting servers:
1. **Clear browser cache** (hard refresh: Ctrl+Shift+R)
2. Verify servers are running on correct ports
3. Check frontend .env has correct ports

### Port Already in Use
```bash
# Kill all processes on relevant ports
lsof -ti:3000,3001,3002 | xargs -r kill -9

# Then restart servers
```

### Database Connection Errors
- Verify PostgreSQL is running
- Check database credentials match your .env
- Ensure `DB_SSL=false` for local development

### WebSocket Not Connecting
1. Verify WebSocket server is running on port 3002
2. Check frontend .env has `REACT_APP_WS_URL=http://localhost:3002`
3. Look for authentication errors in WebSocket server logs

## Server Logs

### API Server Output
```
🚀 API Server is running on port 3001
🌍 Environment: development
📊 Health check available at: http://localhost:3001/health
📡 API endpoints available at: http://localhost:3001/api
```

### WebSocket Server Output
```
🔌 WebSocket Server is running on port 3002
🌍 Environment: development
📊 Health check available at: http://localhost:3002/health
🔌 WebSocket endpoint: ws://localhost:3002
✅ WebSocket authenticated: User X (username)
```

### Frontend Output
```
Compiled successfully!
webpack compiled with 1 warning

You can now view frontend in the browser.

  Local:            http://localhost:3000
```

## Production Deployment

For production, you should:
1. Use a process manager like PM2 or systemd
2. Set up reverse proxy (nginx) for both servers
3. Enable SSL/TLS
4. Set `NODE_ENV=production`
5. Configure proper CORS origins
6. Use production database with SSL
