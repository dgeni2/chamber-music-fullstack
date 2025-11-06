import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('[Error Handler]', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Handle specific error types
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'File upload error',
      details: err.message
    });
  }

  // Default error response
  res.status(500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
