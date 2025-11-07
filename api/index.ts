import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import harmonizeRouter from '../backend/src/routes/harmonize.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create uploads directory if it doesn't exist
// Use /tmp for serverless environments (Vercel)
const uploadsDir = process.env.VERCEL 
  ? '/tmp/uploads'
  : path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Export uploadsDir for use in routes
export { uploadsDir };

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// CORS configuration for API routes
const apiCorsOptions = cors({
  origin: true, // Allow all origins in serverless environment
  credentials: true
});

// Routes
app.get('/api/health', apiCorsOptions, (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'HarmonyForge API is running',
    timestamp: new Date().toISOString(),
    environment: 'vercel-serverless'
  });
});

app.use('/api/harmonize', apiCorsOptions, harmonizeRouter);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  
  res.status(500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
