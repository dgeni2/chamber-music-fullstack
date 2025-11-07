import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

let app: express.Application | null = null;

// Initialize app lazily
function getApp() {
  if (app) return app;
  
  app = express();

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

  // Lazy load harmonize router to avoid import issues
  app.use('/api/harmonize', apiCorsOptions, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { default: harmonizeRouter } = await import('../backend/src/routes/harmonize.js');
      harmonizeRouter(req, res, next);
    } catch (error) {
      console.error('[Harmonize Router Error]', error);
      next(error);
    }
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[Error]', err);
    
    res.status(500).json({
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  return app;
}

// Vercel serverless handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = getApp();
    return app(req as any, res as any);
  } catch (error) {
    console.error('[Handler Error]', error);
    return res.status(500).json({
      error: 'Failed to initialize API handler',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
