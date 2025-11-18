import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { harmonizeRoute } from './routes/harmonize.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/xml' ||
        file.mimetype === 'text/xml' ||
        file.originalname.endsWith('.xml') ||
        file.originalname.endsWith('.musicxml')) {
      cb(null, true);
    } else {
      cb(new Error('Only XML/MusicXML files are allowed'));
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'HarmonyForge Backend'
  });
});

// API routes
app.post('/api/harmonize', upload.single('file'), harmonizeRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error]', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload error',
      details: err.message
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 HarmonyForge Backend running on http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for frontend URLs`);
});

export default app;
