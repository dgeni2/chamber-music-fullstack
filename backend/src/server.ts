import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import harmonizeRouter from './routes/harmonize.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
// Note: CORS is applied per-route below, not globally, to avoid blocking static assets

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Routes
// CORS configuration for API routes
// Since frontend is served from same origin, we allow same-origin + development origins
const apiCorsOptions = cors({
  origin: true, // Allow all origins when serving frontend from same server
  credentials: true
});

app.get('/api/health', apiCorsOptions, (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'HarmonyForge API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/harmonize', apiCorsOptions, harmonizeRouter);

// Serve frontend static files
const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  console.warn('⚠️  Frontend build not found. Run `npm run build` in frontend directory.');
  
  // 404 handler for API-only mode
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  
  res.status(500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 HarmonyForge API server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🌐 CORS enabled for: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
