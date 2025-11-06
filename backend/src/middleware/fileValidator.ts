import type { Request, Response, NextFunction } from 'express';

export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.file;
  const validExtensions = ['.mid', '.midi', '.xml', '.musicxml'];
  const fileName = file.originalname.toLowerCase();
  
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      details: 'Please upload a MIDI (.mid, .midi) or MusicXML (.xml, .musicxml) file'
    });
  }

  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10); // 50MB
  if (file.size > maxSize) {
    return res.status(400).json({ 
      error: 'File too large',
      details: `File size must be less than ${Math.floor(maxSize / 1024 / 1024)}MB`
    });
  }

  next();
}
