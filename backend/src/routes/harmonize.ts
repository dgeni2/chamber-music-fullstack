import express, { type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validateFileUpload } from '../middleware/fileValidator.js';
import { harmonizeMelody } from '../services/musicProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10) // 50MB
  }
});

// POST /api/harmonize
router.post('/', upload.single('file'), validateFileUpload, async (req: Request, res: Response) => {
  const startTime = Date.now();
  let filePath: string | undefined;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    filePath = req.file.path;
    const instrumentsStr = (req.body.instruments as string) || 'Violin';
    const instruments = instrumentsStr.split(',').map((i: string) => i.trim());
    const style = req.body.style as string | undefined;
    const difficulty = req.body.difficulty as string | undefined;

    console.log('[Harmonize] Processing request:', {
      file: req.file.originalname,
      instruments,
      style,
      difficulty
    });

    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Process the music
    const { harmonyOnlyXML, combinedXML } = await harmonizeMelody(
      fileContent,
      instruments
    );

    const processingTime = Date.now() - startTime;

    // Send response
    res.json({
      harmonyOnly: {
        content: harmonyOnlyXML,
        filename: req.file.originalname.replace(/\.(musicxml|xml)$/i, '_harmony.musicxml')
      },
      combined: {
        content: combinedXML,
        filename: req.file.originalname.replace(/\.(musicxml|xml)$/i, '_combined.musicxml')
      },
      metadata: {
        instruments,
        style,
        difficulty,
        processingTime
      }
    });

    console.log(`[Harmonize] Success - processed in ${processingTime}ms`);

  } catch (error) {
    console.error('[Harmonize] Error:', error);
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Harmonization failed',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  } finally {
    // Cleanup: delete uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('[Harmonize] Cleaned up temp file:', filePath);
      } catch (cleanupError) {
        console.error('[Harmonize] Failed to cleanup file:', cleanupError);
      }
    }
  }
});

export default router;
