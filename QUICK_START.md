# 🚀 Quick Start Guide
**HarmonyForge - Run Everything with One Command!**

---

## ⚡ TL;DR - Super Quick Start

```bash
# First time only - install all dependencies
npm run install:all

# Run the entire app (backend + frontend)
npm run dev
```

That's it! Open your browser to `http://localhost:5174` 🎉

---

## 📦 Installation (First Time Only)

### Option 1: Install Everything at Once (Recommended)
```bash
npm run install:all
```

This will install dependencies for:
- Root (concurrently package)
- Backend (Express, @xmldom/xmldom, etc.)
- Frontend (React, Vite, Tailwind, etc.)

### Option 2: Install Manually
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
cd ..
```

---

## 🎵 Running the Application

### ✨ Run Everything Together (Single Command!)

```bash
npm run dev
```

This starts **both** servers simultaneously:
- **Backend:** `http://localhost:3001`
- **Frontend:** `http://localhost:5174`

You'll see output from both servers in the same terminal with colored prefixes:
```
[0] 🎵 HarmonyForge Backend running on http://localhost:3001
[1] VITE v6.3.5  ready in 619 ms
[1] ➜  Local:   http://localhost:5174/
```

### 🔧 Run Servers Separately (If Needed)

**Backend only:**
```bash
npm run dev:backend
```

**Frontend only:**
```bash
npm run dev:frontend
```

---

## 🏗️ Building for Production

```bash
# Build frontend
npm run build

# Output will be in: frontend/dist/
```

---

## 🛑 Stopping the Servers

Press `Ctrl+C` in the terminal where you ran `npm run dev`

This will stop **both** servers at once.

---

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | 🚀 **Run both backend and frontend** (recommended) |
| `npm run dev:backend` | Run backend only (port 3001) |
| `npm run dev:frontend` | Run frontend only (port 5174) |
| `npm run install:all` | Install all dependencies (root + backend + frontend) |
| `npm run build` | Build frontend for production |
| `npm run start` | Run both servers (production mode) |

---

## 🧪 Testing the Application

### 1. Start the Application
```bash
npm run dev
```

### 2. Check Backend Health
Open a new terminal:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T...",
  "service": "HarmonyForge Backend"
}
```

### 3. Use the Frontend
Open your browser to: **http://localhost:5174**

1. Upload a MusicXML file
2. Select 1-4 instruments
3. Click "Continue"
4. Download your harmonized scores!

---

## 🎼 Supported File Formats

- `.xml` - MusicXML format
- `.musicxml` - MusicXML format
- Maximum file size: 50MB

---

## 🎻 Supported Instruments

Choose up to 4 instruments from:

**Strings:**
- Violin, Viola, Cello

**Woodwinds:**
- Flute, Oboe, B-flat Clarinet, Bassoon

**Brass:**
- B-flat Trumpet, F Horn, Tuba

**Voices:**
- Soprano, Tenor Voice

---

## ⚙️ Configuration

### Backend Configuration
Backend runs on port 3001 by default. To change:

Edit `backend/src/server.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

Or set environment variable:
```bash
PORT=4000 npm run dev:backend
```

### Frontend Configuration
Frontend connects to backend at `http://localhost:3001` by default.

Edit `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:3001
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5174
lsof -ti:5174 | xargs kill -9
```

### Backend Not Found

**Error:** `Cannot connect to backend server`

**Check:**
1. Is backend running? Look for: `🎵 HarmonyForge Backend running on http://localhost:3001`
2. Try health check: `curl http://localhost:3001/health`
3. Restart: `Ctrl+C` then `npm run dev` again

### Dependencies Not Installed

**Error:** `Cannot find module 'express'` or similar

**Solution:**
```bash
npm run install:all
```

### Changes Not Appearing

**Frontend changes:**
- Vite has hot reload - changes appear automatically
- If not, refresh browser (`Cmd+R` or `Ctrl+R`)

**Backend changes:**
- Backend uses `--watch` flag - restarts automatically
- Look for: `Restarting 'src/server.js'`

---

## 📁 Project Structure

```
chamber-music-fullstack/
├── package.json              ← Root config (concurrently)
├── QUICK_START.md           ← This file!
├── INTEGRATION_STATUS.md    ← Integration verification
├── CLEANUP_COMPLETED.md     ← Cleanup report
│
├── backend/                 ← Express backend (port 3001)
│   ├── package.json
│   ├── src/
│   │   ├── server.js        ← Main server
│   │   ├── routes/
│   │   │   └── harmonize.js ← API routes
│   │   └── adapters/
│   │       └── nextjs-adapter.js ← Harmonization engine (1,781 lines)
│   └── node_modules/
│
└── frontend/                ← React frontend (port 5174)
    ├── package.json
    ├── .env.local           ← Backend URL config
    ├── src/
    │   ├── App.tsx
    │   ├── services/
    │   │   └── api.ts       ← Backend API client
    │   └── components/
    └── node_modules/
```

---

## 🎯 Development Workflow

### Typical Development Session

```bash
# 1. Start everything
npm run dev

# 2. Edit code
# - Backend: backend/src/**/*.js
# - Frontend: frontend/src/**/*.tsx

# 3. Test changes
# - Backend restarts automatically
# - Frontend hot-reloads automatically

# 4. Stop when done
# Press Ctrl+C
```

### Adding New Features

**Backend API Endpoint:**
1. Add route in `backend/src/routes/`
2. Import and use in `backend/src/server.js`
3. Server will auto-restart

**Frontend Component:**
1. Create in `frontend/src/components/`
2. Import where needed
3. Page will hot-reload

---

## 🔄 Common Tasks

### Clear Cache and Restart
```bash
# Stop servers (Ctrl+C)

# Clear node_modules cache
rm -rf node_modules backend/node_modules frontend/node_modules

# Reinstall everything
npm run install:all

# Start fresh
npm run dev
```

### Update Dependencies
```bash
# Backend
cd backend
npm update
cd ..

# Frontend
cd frontend
npm update
cd ..

# Root
npm update
```

---

## 📚 Additional Resources

- **Integration Status:** See `INTEGRATION_STATUS.md`
- **Cleanup Report:** See `CLEANUP_COMPLETED.md`
- **Main README:** See `README.md`
- **Backend Details:** See `backend-export/README.md`

---

## 🎉 You're All Set!

Just run:
```bash
npm run dev
```

And start harmonizing! 🎼

---

**Last Updated:** November 19, 2025  
**Version:** 1.0.0

