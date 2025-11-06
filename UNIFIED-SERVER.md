# HarmonyForge - Unified Server Architecture

## Overview
The application now runs as a **single server** on port 3001, serving both the API and frontend.

## Architecture

```
http://localhost:3001
├── /                     → Frontend (React SPA)
├── /api/health          → Backend API (Health check)
└── /api/harmonize       → Backend API (Music harmonization)
```

### How It Works
1. **Express backend** handles all requests on port 3001
2. **/api/*** routes are processed by backend API handlers
3. **All other routes** serve the built React frontend (SPA fallback)
4. Frontend makes API calls to relative URLs (e.g., `/api/harmonize`)

## Starting the Server

### Option 1: Quick Start Script
```bash
./start-server.sh
```

### Option 2: Manual Steps
```bash
# Build frontend
cd frontend
npm run build

# Start unified server
cd ../backend
npx tsx src/server.ts
```

### Option 3: Production Build
```bash
cd backend
npm run build:full   # Builds frontend + backend
npm start            # Runs compiled server
```

## Development vs Production

### Development Mode (Current)
- Uses `tsx` to run TypeScript directly
- Hot reload not available (use separate dev servers for that)
- Good for testing unified deployment

### Production Mode
```bash
cd backend
npm run build:full
npm start
```
- Compiles TypeScript to JavaScript
- Runs optimized Node.js server
- Serves minified frontend assets

## Key Configuration Changes

### Frontend (`/frontend/src/services/api.ts`)
```typescript
// Changed from: http://localhost:3001
const API_URL = import.meta.env.VITE_API_URL || '';
// Now uses relative URLs when served from same origin
```

### Backend (`/backend/src/server.ts`)
```typescript
// Added static file serving
app.use(express.static(frontendBuildPath));

// SPA fallback for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});
```

## Benefits

✅ **Single URL**: No CORS issues, same origin  
✅ **Simplified Deployment**: One server process  
✅ **Production Ready**: Static asset serving optimized  
✅ **Easy Testing**: Single port to open (3001)

## Testing

1. **API Endpoint**:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Frontend**:
   Open http://localhost:3001 in browser

3. **File Upload**:
   Use frontend UI to upload MusicXML and generate harmonies

## Port Information

- **3001**: Unified server (API + Frontend)
- ~~3000~~: Frontend dev server (no longer needed)
- ~~5173~~: Vite dev server (no longer needed)

## Notes

- Frontend build files are in `/frontend/build/`
- Backend serves from `../frontend/build/` relative path
- API routes always take precedence over static files
- 404s on non-existent routes return `index.html` (SPA behavior)
