# NorthFlank Backend Deployment Guide

This guide walks you through deploying the HarmonyForge backend Express server on NorthFlank.

## Prerequisites

- NorthFlank account (sign up at https://northflank.com)
- GitHub account with access to this repository
- Vercel frontend deployed at `https://harmonyforge-fullstack.vercel.app`

## Deployment Steps

### Step 1: Create a NorthFlank Project

1. Go to https://northflank.com and log in
2. Click **"Create"** or **"New Project"** (top left)
3. Give your project a name: `harmonyforge-backend`
4. Click **"Create Project"**

### Step 2: Install NorthFlank GitHub App

1. After creating the project, you'll be prompted to connect a repository
2. Click **"Install NorthFlank on GitHub"**
3. Authorize NorthFlank to access your repositories
4. Select the `chamber-music-fullstack` repository
5. Click **"Install and Authorize"**
6. Return to NorthFlank

### Step 3: Create a Docker Service

1. In NorthFlank dashboard, click **"Create Service"** → **"Docker"**
2. Select **"GitHub"** as the source
3. Select your `chamber-music-fullstack` repository
4. Click **"Continue"**

### Step 4: Configure Build Settings

1. Under **"Build options"**:
   - **Build type**: Select **"Dockerfile"** (should be pre-selected)
   - **Build context**: `backend`
   - **Dockerfile location**: `/backend/Dockerfile`

2. Click **"Reload"** to verify the Dockerfile is found (you should see checkmark ✓)

3. Under **"Build arguments"**:
   - You should see `FRONTEND_URL` already set to `https://harmonyforge-fullstack.vercel.app`
   - This is correct - leave it as is

4. Click **"Continue"** or scroll to next section

### Step 5: Configure Deployment Settings

1. Under **"Deployment"** section:
   - **Port**: `3001`
   - **Public URL**: Enable this toggle (so your backend gets a public domain)

2. Set the following environment variables:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://harmonyforge-fullstack.vercel.app`

3. Click **"Create Service"**

### Step 6: Wait for Deployment

1. NorthFlank will start building your Docker image
2. This takes 2-5 minutes
3. Once complete, you'll see a green checkmark and a **public URL** like:
   ```
   https://harmonyforge-backend-xxxxx.northflank.io
   ```

4. Copy this URL - you'll need it for the next step

### Step 7: Update Vercel Frontend Environment Variable

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your `harmonyforge-fullstack` project
3. Go to **Settings** → **Environment Variables**
4. Find or create the variable `VITE_API_URL`:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://harmonyforge-backend-xxxxx.northflank.io` (your NorthFlank URL from Step 6)
   - **Environment**: Production
5. Click **"Save"**
6. Redeploy your frontend:
   - Option A: Push a commit to `main` branch (auto-deploys)
   - Option B: Manual redeploy in Vercel dashboard

### Step 8: Test the Connection

1. Go to your Vercel frontend: `https://harmonyforge-fullstack.vercel.app`
2. Upload a MusicXML file
3. Select instruments
4. Click "Harmonize"
5. If successful, you'll see the harmonized music output!

## Troubleshooting

### Build Fails: "No Dockerfile found"
- Verify **Dockerfile location** is set to `/backend/Dockerfile` (with the `/` prefix)
- Click **"Reload"** button

### Deployment says "No public URL"
- In Step 5, make sure you **enabled the "Public URL" toggle**
- Redeploy the service

### Frontend still shows "Cannot connect to backend"
- Verify `VITE_API_URL` in Vercel matches your NorthFlank public URL exactly
- Make sure there are no trailing slashes
- Redeploy Vercel after updating the environment variable
- Wait 1-2 minutes for the new build to deploy

### Backend returns CORS errors
- The Express server allows requests from your Vercel frontend
- If you change the Vercel URL, update `FRONTEND_URL` in NorthFlank as well

## Useful Commands (Local Development)

```bash
# Test backend locally
cd backend
npm run dev    # Runs on http://localhost:3001

# Test health endpoint
curl http://localhost:3001/health

# Build Docker image locally
docker build -t harmonyforge-backend:latest backend/
docker run -p 3001:3001 harmonyforge-backend:latest
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│   Vercel (Frontend)                     │
│   https://harmonyforge-fullstack...     │
│                                         │
│  Vite + React SPA                       │
│  - Instrument selection UI              │
│  - File upload                          │
│  - Results display                      │
└──────────────────┬──────────────────────┘
                   │
                   │ API calls to
                   │
┌──────────────────▼──────────────────────┐
│   NorthFlank (Backend)                  │
│   https://harmonyforge-backend-xxx...   │
│                                         │
│  Express.js Server (Docker)             │
│  - File upload handling                 │
│  - Harmonization engine                 │
│  - MusicXML processing                  │
└─────────────────────────────────────────┘
```

## File Structure Used for Deployment

```
chamber-music-fullstack/
├── backend/
│   ├── Dockerfile          ← NorthFlank uses this
│   ├── .dockerignore       ← Optimizes image size
│   ├── src/
│   │   ├── server.js       ← Express app
│   │   ├── routes/
│   │   └── adapters/
│   └── package.json
```

## Next Steps

- Monitor deployment logs in NorthFlank dashboard
- Check backend health: Visit `https://your-northflank-url/health`
- Test harmonization with a sample MusicXML file
- Review logs if you encounter issues

## Support

For NorthFlank-specific questions:
- NorthFlank Docs: https://docs.northflank.com
- NorthFlank Support: support@northflank.com

For HarmonyForge-specific questions:
- See `CLAUDE.md` for architecture details
- Check `INTEGRATION.md` for API specifications
