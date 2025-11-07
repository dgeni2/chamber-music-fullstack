import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url } = req;
    
    // Health check
    if (url?.includes('/health')) {
      return res.status(200).json({ 
        status: 'ok', 
        message: 'HarmonyForge API is running',
        timestamp: new Date().toISOString(),
        environment: 'vercel-serverless'
      });
    }

    // Harmonize endpoint
    if (url?.includes('/harmonize')) {
      // Dynamically import Express app for harmonize functionality
      const express = await import('express');
      const cors = await import('cors');
      const { default: harmonizeRouter } = await import('../backend/dist/routes/harmonize.js');
      
      const app = express.default();
      app.use(express.default.json());
      app.use(express.default.urlencoded({ extended: true }));
      app.use(cors.default({ origin: true, credentials: true }));
      app.use('/', harmonizeRouter);
      
      // Use app as middleware
      return new Promise((resolve, reject) => {
        app(req as any, res as any, (err: any) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
    }

    // Default 404
    return res.status(404).json({ 
      error: 'Not found',
      path: url 
    });

  } catch (error) {
    console.error('[API Error]', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
