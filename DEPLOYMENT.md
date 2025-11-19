# Deployment Guide

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Vercel account (for frontend deployment)
- Backend hosting service (Railway, Render, or Vercel Serverless)

## Frontend Deployment (Vercel)

### 1. Initial Setup

1. **Fork/Clone the repository**
   ```bash
   git clone https://github.com/spatel54/chamber-music-fullstack.git
   cd chamber-music-fullstack
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Create environment file**
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

### 2. Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

#### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install --include=dev`
5. Add Environment Variable:
   - `VITE_API_URL`: Your backend API URL (e.g., `https://your-backend.railway.app`)
6. Click "Deploy"

### 3. Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://your-backend-url.com` | Backend API endpoint |

## Backend Deployment

### Option 1: Railway

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # From backend directory
   cd backend
   
   # Initialize Railway project
   railway init
   
   # Deploy
   railway up
   ```

3. **Set Environment Variables** in Railway Dashboard:
   ```
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

4. **Configure CORS**
   - Update `backend/src/server.js` CORS origins to include your Vercel frontend URL

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Create New → Web Service
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables (same as Railway)

### Option 3: Vercel Serverless (Backend as API Routes)

1. Create `backend/vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/server.js"
       }
     ]
   }
   ```

2. Deploy via Vercel CLI or Dashboard

## Post-Deployment Checklist

### Frontend
- [ ] Environment variables configured (`VITE_API_URL`)
- [ ] Build succeeds without errors
- [ ] Static assets load correctly
- [ ] Routing works (SPA configuration)

### Backend
- [ ] CORS configured with frontend URL
- [ ] Port configured correctly
- [ ] File upload limits set (50MB)
- [ ] Health endpoint responds: `GET /health`

### Integration
- [ ] Frontend can call backend API
- [ ] File uploads work
- [ ] Harmonization generates successfully
- [ ] Downloads work correctly

## Testing Production Build Locally

### Frontend
```bash
cd frontend
npm run build
npx vite preview --port 5174
```

### Backend
```bash
cd backend
NODE_ENV=production PORT=3001 npm start
```

### Integration Test
```bash
# In one terminal (backend)
cd backend && npm run dev

# In another terminal (frontend with production build)
cd frontend && npm run build && npx vite preview

# Test the API
curl -X POST http://localhost:3001/api/harmonize \
  -F "file=@../test-melody.musicxml" \
  -F "instruments=Violin,Viola,Cello"
```

## Troubleshooting

### Vercel Build Fails

**Error**: `Cannot find package '@vitejs/plugin-react-swc'`

**Solution**: Ensure `devDependencies` are installed during build:
- Check `vercel.json` has `"installCommand": "npm install --include=dev"`
- Verify `frontend/package.json` includes `@vitejs/plugin-react-swc` in devDependencies

### CORS Errors

**Symptoms**: Frontend can't connect to backend, browser console shows CORS errors

**Solution**:
1. Add your frontend URL to backend CORS configuration
2. Update `backend/src/server.js`:
   ```javascript
   const corsOptions = {
     origin: [
       'http://localhost:5174',
       'https://your-app.vercel.app'
     ]
   };
   ```
3. Set `FRONTEND_URL` environment variable in backend deployment

### 404 Errors on Page Refresh (Frontend)

**Symptoms**: Direct navigation to routes like `/projects` returns 404

**Solution**: Vercel SPA configuration is in place via `vercel.json` rewrites. If using another host:
- Add SPA redirect rules to serve `index.html` for all routes
- Example for Netlify: `_redirects` file with `/* /index.html 200`

### Large File Uploads Fail

**Symptoms**: Uploads timeout or fail for files > 10MB

**Solution**:
- Increase backend timeout (already set to 50MB in multer config)
- For serverless deployments, check function timeout limits:
  - Vercel: Max 10s (Hobby), 60s (Pro)
  - Railway: No limit (long-running processes)

## Monitoring & Logs

### Frontend (Vercel)
- Deployment logs: Vercel Dashboard → Deployments → [Your Deployment] → Logs
- Runtime logs: Vercel Dashboard → Deployments → [Your Deployment] → Functions

### Backend (Railway)
```bash
railway logs
```

### Backend (Render)
- Logs available in Render Dashboard → [Your Service] → Logs

## Updating Deployment

### Frontend
```bash
git push origin main  # Vercel auto-deploys on push
```

### Backend
```bash
# Railway
railway up

# Render
git push origin main  # Auto-deploys on push
```

## Environment-Specific Configuration

### Development
```bash
# frontend/.env.local
VITE_API_URL=http://localhost:3001
```

### Production
```bash
# Vercel Environment Variables
VITE_API_URL=https://api.yourapp.com
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **CORS**: Restrict to specific domains in production
3. **File Upload**: 50MB limit enforced, validate MusicXML format
4. **Rate Limiting**: Consider adding rate limiting for production
5. **HTTPS**: Always use HTTPS in production (Vercel/Railway provide this)

## Performance Optimization

1. **Frontend**:
   - Static assets are cached (1 year)
   - Vite builds are optimized and tree-shaken
   - Code splitting enabled

2. **Backend**:
   - In-memory caching (30 min TTL, 100 entries)
   - Deterministic outputs for same inputs
   - Consider Redis cache for multi-instance deployments

## Scaling Considerations

### Frontend
- Vercel Edge Network handles scaling automatically
- No additional configuration needed

### Backend
- Railway/Render: Add horizontal replicas for high traffic
- Consider stateless session management if scaling horizontally
- For very high traffic, consider dedicated Redis for shared cache

## Support

- Issues: [GitHub Issues](https://github.com/spatel54/chamber-music-fullstack/issues)
- Documentation: `README.md`, `CLAUDE.md`, `.github/copilot-instructions.md`
- Agent Guides: `.claude/agents/` directory
