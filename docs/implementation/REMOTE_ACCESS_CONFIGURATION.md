# Remote Access Configuration Guide

This document explains the changes made to enable remote access to the application via IP address or domain name instead of just localhost.

## Problem Statement

**Before Changes:**
- Application could only be accessed via `http://localhost:3000`
- API calls were hardcoded to `http://localhost:3001`
- WebSocket connections were hardcoded to `ws://localhost:3002`
- Remote access (via IP like `192.168.1.100`) would fail because the frontend tried to connect to `localhost:3001` and `localhost:3002` on the client's machine, not the server

**After Changes:**
- Application can be accessed from any device on the network
- Frontend automatically detects the server's hostname/IP from the browser URL
- API and WebSocket connections use dynamic hostname
- CORS properly configured to allow cross-origin requests in development

---

## Changes Made

### 1. Frontend - Dynamic API Base URL

**File:** `frontend/src/config/app.config.ts`

**Location:** Lines 136-153

**What Changed:**

```typescript
/**
 * Get API base URL for frontend requests
 * In browser, automatically uses the current hostname for remote access compatibility
 */
export const getApiBaseUrl = (): string => {
  const api = config.server.api;

  // If running in browser, use the current window location's hostname
  // This allows remote access to work correctly (e.g., accessing via IP or domain)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol.replace(':', ''); // Remove trailing ':'
    return `${protocol}://${hostname}:${api.port}`;
  }

  // Fallback for server-side rendering or Node.js environment
  return `${api.protocol}://${api.host}:${api.port}`;
};
```

**How It Works:**
- Detects the hostname from `window.location.hostname` (what the user typed in the browser)
- Uses the same protocol (http/https) as the frontend
- Appends the API port (3001 by default)
- Falls back to configured host for server-side rendering

**Example:**
- User accesses: `http://192.168.1.100:3000`
- API calls go to: `http://192.168.1.100:3001`
- User accesses: `http://myserver.local:3000`
- API calls go to: `http://myserver.local:3001`

---

### 2. Frontend - Dynamic WebSocket URL

**File:** `frontend/src/contexts/WebSocketContext.tsx`

**Location:** Lines 10-31

**What Changed:**

```typescript
/**
 * Get WebSocket URL dynamically based on current hostname
 * This enables remote access to work correctly
 */
const getWebSocketUrl = (): string => {
  // Check for explicit environment variable first
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }

  // If running in browser, use the current window location's hostname
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol.replace(':', ''); // Remove trailing ':'
    return `${protocol}://${hostname}:3002`;
  }

  // Fallback for server-side rendering
  return 'http://localhost:3002';
};

const WS_URL = getWebSocketUrl();
```

**How It Works:**
- Checks for explicit `REACT_APP_WS_URL` environment variable first
- Detects the hostname from `window.location.hostname` (what the user typed in the browser)
- Uses the same protocol (http/https) as the frontend
- Appends the WebSocket port (3002 by default)
- Falls back to localhost for server-side rendering

**Example:**
- User accesses: `http://192.168.1.100:3000`
- WebSocket connects to: `ws://192.168.1.100:3002`
- User accesses: `http://myserver.local:3000`
- WebSocket connects to: `ws://myserver.local:3002`

**Features Enabled:**
- Real-time messaging
- Push notifications
- Online status indicators
- Typing indicators
- Live updates

---

### 3. Backend - CORS Configuration for Development

**File:** `backend/src/server.js`

**Location:** Lines 82-97

**What Changed:**

```javascript
// CORS configuration
// In development, allow all origins for remote access
// In production, use the configured origins
const corsOptions = config.isDevelopment ? {
  origin: true, // Allow all origins in development
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders
} : {
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders
};

app.use(cors(corsOptions));
```

**How It Works:**
- In development mode (`NODE_ENV=development`): Accepts requests from ANY origin
- In production mode: Only accepts requests from whitelisted origins in config
- This prevents CORS errors when accessing from different IPs/domains in development

**Security Note:**
- Development: Permissive (allows all origins)
- Production: Restrictive (only configured origins)

---

### 4. Backend - Auth Rate Limiting Adjustment

**File:** `backend/src/routes/auth.js`

**Location:** Lines 22-41

**What Changed:**

```javascript
/**
 * Rate limiting for authentication endpoints
 * Disabled in test environment to avoid interference with tests
 * More permissive in development for easier testing
 */
const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next() // Skip rate limiting in tests
  : rateLimit({
      windowMs: config.rateLimiting.auth.windowMs,
      max: config.isDevelopment ? 50 : config.rateLimiting.auth.maxRequests, // 50 attempts in dev, 5 in production
      message: {
        success: false,
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          type: 'RATE_LIMIT_ERROR'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
```

**How It Works:**
- Development: 50 login attempts per 15 minutes
- Production: 5 login attempts per 15 minutes
- Prevents "too many authentication attempts" errors during testing

**Why This Was Needed:**
When testing remote access, multiple login attempts from the same IP would trigger the rate limiter. The increased limit makes development/testing easier while maintaining security in production.

---

## How to Use Remote Access

### 1. Find Your Server's IP Address

**On Linux/Mac:**
```bash
hostname -I
# or
ifconfig | grep "inet "
```

**On Windows:**
```cmd
ipconfig
```

Look for your local network IP (usually starts with 192.168.x.x or 10.x.x.x)

### 2. Start the Servers

**Backend:**
```bash
cd backend
NODE_ENV=development DB_SSL=false node src/server.js
```

**Frontend:**
```bash
npm start
```

### 3. Access from Any Device

**From the server itself:**
- `http://localhost:3000`

**From other devices on the same network:**
- `http://192.168.1.100:3000` (replace with your actual IP)
- `http://yourserver.local:3000` (if using mDNS/Bonjour)

### 4. Test the API Connection

The frontend will automatically connect to the backend using the same hostname:
- If you visit `http://192.168.1.100:3000`, API calls go to `http://192.168.1.100:3001`
- If you visit `http://localhost:3000`, API calls go to `http://localhost:3001`

---

## Testing Remote Access

### Test from Another Device:

1. **Phone/Tablet:**
   - Make sure device is on the same WiFi network
   - Open browser and go to `http://YOUR_SERVER_IP:3000`
   - Try logging in (username: `admin`, password: `test123`)

2. **Another Computer:**
   - Connect to same network
   - Open browser and navigate to server's IP on port 3000
   - Full application functionality should work

### Verify API Calls:

Open browser DevTools (F12) > Network tab:
- Look at API requests
- Verify they're going to `http://YOUR_IP:3001/api/...`
- Should see 200 OK responses, not CORS errors

---

## Environment Configuration

### Development (Current Setup):
- CORS: Allow all origins
- Rate Limiting: 50 auth attempts per 15 minutes
- Dynamic API URL: Based on browser hostname

### Production (Future):
- CORS: Whitelist specific origins
- Rate Limiting: 5 auth attempts per 15 minutes
- API URL: Configured via environment variables

---

## Troubleshooting

### "Network Error" or "Failed to Fetch"

**Check:**
1. Backend server is running on port 3001
2. Firewall allows incoming connections on ports 3000 and 3001
3. Both devices are on the same network

**Fix:**
```bash
# Check if backend is running
curl http://localhost:3001/health

# Check from remote device
curl http://YOUR_SERVER_IP:3001/health
```

### CORS Errors

**Symptoms:**
- Browser console shows "CORS policy" errors
- API calls fail with "Access-Control-Allow-Origin" errors

**Fix:**
- Ensure backend is running with `NODE_ENV=development`
- Restart backend server after CORS configuration changes

### "Too Many Authentication Attempts"

**Symptoms:**
- Login fails with rate limit error
- Can't log in even with correct credentials

**Fix:**
- Wait 15 minutes for rate limit to reset
- Or restart the backend server to clear rate limits
- In development, you have 50 attempts per 15 minutes

### API Calls Going to Wrong URL

**Check:**
1. Open DevTools > Network tab
2. Look at API request URLs
3. Should match the hostname in the browser address bar

**If using localhost when you want remote:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- The dynamic URL detection happens at runtime

---

## Summary of Files Modified

| File | Purpose | Lines Changed |
|------|---------|---------------|
| `frontend/src/config/app.config.ts` | Dynamic API base URL detection | 136-153 |
| `frontend/src/contexts/WebSocketContext.tsx` | Dynamic WebSocket URL detection | 10-31 |
| `backend/src/server.js` | CORS configuration for development | 82-97 |
| `backend/src/routes/auth.js` | Increased rate limit for development | 27-41 |

---

## Additional Benefits

1. **Mobile Testing:** Test the application on phones/tablets without deploying
2. **Multi-Device Development:** Work on UI from one device, backend from another
3. **Demo Friendly:** Show the app to others on their devices
4. **Network Testing:** Test performance over WiFi vs localhost
5. **Realistic Environment:** Closer to production setup with network latency

---

## Security Considerations

### Development vs Production

**Development (Current):**
- ✅ All origins allowed (CORS)
- ✅ High rate limits
- ✅ Easy testing and development
- ⚠️ Less secure (acceptable for development)

**Production (Recommended):**
- ✅ Whitelist specific origins
- ✅ Strict rate limits
- ✅ HTTPS only
- ✅ Environment-specific configuration

### Before Deploying to Production:

1. Set `NODE_ENV=production`
2. Configure specific CORS origins in `config/app.config.js`
3. Use HTTPS for both frontend and backend
4. Review and adjust rate limits
5. Set up proper authentication and session management

---

## Configuration Reference

### Environment Variables

```bash
# API Configuration
API_PORT=3001
API_HOST=localhost
API_PROTOCOL=http

# Frontend Configuration
FRONTEND_PORT=3000
FRONTEND_HOST=localhost
FRONTEND_PROTOCOL=http

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3004
CORS_CREDENTIALS=true

# Rate Limiting
AUTH_RATE_WINDOW_MS=900000  # 15 minutes
AUTH_RATE_MAX_REQUESTS=5     # 5 in production, 50 in development
```

### Default Behavior

- **No environment variables set:** Works with localhost
- **With environment variables:** Can customize for specific deployments
- **Development mode:** Automatically enables remote access features

---

## Quick Reference

### Start Servers for Remote Access:
```bash
# Terminal 1 - Backend
NODE_ENV=development DB_SSL=false node backend/src/server.js

# Terminal 2 - Frontend
npm start
```

### Access URLs:
- **Local:** http://localhost:3000
- **Remote:** http://[YOUR_IP]:3000

### Test Credentials:
- **Username:** admin
- **Password:** test123

### Common IP Ranges:
- **192.168.x.x** - Most home routers
- **10.x.x.x** - Corporate networks
- **172.16.x.x - 172.31.x.x** - Private networks

---

*Last Updated: November 8, 2025*
*Commit: d8aa59e - Add remote access support and password reset CLI tool*
