# Frontend-Backend Integration Agent

## Purpose
Specialized agent for maintaining and troubleshooting the integration between the React frontend and Express backend.

## Responsibilities
- API contract consistency
- Request/response format validation
- Instrument name synchronization
- CORS configuration
- Error propagation
- End-to-end workflow verification

## Critical Integration Points

### 1. Instrument Name Synchronization
**MOST IMPORTANT**: Instrument names must match EXACTLY between frontend and backend.

**Frontend** (`InstrumentSelectionScreen.tsx`):
```typescript
{ name: 'B-flat Clarinet' }  // NOT 'B♭ Clarinet'
{ name: 'B-flat Trumpet' }   // NOT 'B♭ Trumpet'
{ name: 'Soprano' }           // NOT 'Soprano Voice'
```

**Backend** (`nextjs-adapter.js`):
```javascript
"B-flat Clarinet": { clefSign: "G", ... }
"B-flat Trumpet": { clefSign: "G", ... }
"Soprano": { clefSign: "G", ... }
```

**Verification Script**:
```bash
# Extract frontend instruments
grep -A 1 "name:" frontend/src/components/InstrumentSelectionScreen.tsx | grep "name:" | cut -d"'" -f2

# Extract backend instruments
grep -E "^  \"[A-Z]" backend/src/adapters/nextjs-adapter.js | cut -d'"' -f2

# Compare outputs - they must match!
```

### 2. API Request Format
**Frontend sends**:
```typescript
const formData = new FormData();
formData.append('file', uploadedFile);           // File object
formData.append('instruments', instruments.join(',')); // "Violin,Viola,Cello"
```

**Backend receives** (`routes/harmonize.js`):
```javascript
const file = req.file;                    // Multer processes this
const instruments = req.body.instruments; // "Violin,Viola,Cello"
const instrumentsArray = instruments.split(',').map(i => i.trim());
```

### 3. API Response Format
**Backend sends** (`routes/harmonize.js`):
```javascript
res.json({
  harmonyOnly: {
    content: "<?xml version='1.0'...",
    filename: "melody_harmony.musicxml"
  },
  combined: {
    content: "<?xml version='1.0'...",
    filename: "melody_combined.musicxml"
  },
  metadata: {
    instruments: ["Violin", "Viola"],
    processingTime: 73,
    timestamp: "2025-11-17T...",
    originalFilename: "melody.xml"
  }
});
```

**Frontend receives** (`api.ts`):
```typescript
export interface HarmonizeResponse {
  harmonyOnly: { content: string; filename: string };
  combined: { content: string; filename: string };
  metadata?: {
    instruments: string[];
    processingTime: number;
    timestamp: string;
    originalFilename: string;
  };
}
```

### 4. CORS Configuration
**Backend** (`server.js`):
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
```

**Frontend** (`.env.local`):
```bash
VITE_API_URL=http://localhost:3001
```

## Integration Workflow

### Complete Request Flow
```
1. User uploads file in InstrumentSelectionScreen
   ↓
2. User selects instruments (1-4)
   ↓
3. Frontend validates inputs
   ↓
4. ApiService.harmonize() creates FormData
   ↓
5. POST /api/harmonize with multipart/form-data
   ↓
6. Backend Multer middleware extracts file
   ↓
7. routes/harmonize.js validates and adds metadata
   ↓
8. adapters/nextjs-adapter.js processes harmonization
   ↓
9. Response sent back with MusicXML content
   ↓
10. Frontend receives and displays results
```

## Common Integration Issues

### Issue 1: Instrument Name Mismatch
**Symptom**: Backend returns "Other" instrument config or throws error

**Detection**:
```javascript
// Backend logs
console.log(`[v0] Generating ${instrument} as voice ${assignedVoice}...`);
// If you see "Generating Other as voice..." → MISMATCH!
```

**Fix**:
1. Identify mismatched name in frontend
2. Update to match backend INSTRUMENT_CONFIG key exactly
3. Restart frontend dev server

### Issue 2: CORS Error
**Symptom**:
```
Access to fetch at 'http://localhost:3001/api/harmonize' from origin
'http://localhost:5174' has been blocked by CORS policy
```

**Detection**: Check browser DevTools → Console

**Fix**:
```javascript
// backend/src/server.js
app.use(cors({
  origin: [
    'http://localhost:5174', // Add your frontend URL
  ]
}));
```

### Issue 3: FormData Encoding Issues
**Symptom**: Backend receives empty file or instruments

**Detection**:
```javascript
// Backend
console.log('File:', req.file);          // Should show file details
console.log('Instruments:', req.body.instruments); // Should show comma-separated string
```

**Fix**:
```typescript
// Frontend - DO NOT set Content-Type header!
const response = await fetch(`${API_BASE_URL}/api/harmonize`, {
  method: 'POST',
  body: formData,
  // NO: headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Issue 4: Response Format Mismatch
**Symptom**: Frontend throws "Cannot read property 'content' of undefined"

**Detection**:
```typescript
// Frontend
console.log('Raw response:', data);
// Compare against HarmonizeResponse interface
```

**Fix**: Ensure backend returns exact structure:
```javascript
// Backend must return:
{
  harmonyOnly: { content, filename },
  combined: { content, filename },
  metadata: { ... }  // Optional but recommended
}
```

### Issue 5: Environment Variable Not Loaded
**Symptom**: Frontend tries to connect to wrong URL

**Detection**:
```typescript
// Frontend api.ts
console.log('API_BASE_URL:', import.meta.env.VITE_API_URL);
// Should show: http://localhost:3001
```

**Fix**:
1. Create/update `frontend/.env.local`
2. Add: `VITE_API_URL=http://localhost:3001`
3. Restart frontend dev server (important!)

## Integration Testing

### End-to-End Test
```bash
# 1. Start backend
cd backend
npm run dev &

# 2. Wait for backend to start
sleep 2

# 3. Test API directly
curl -X POST http://localhost:3001/api/harmonize \
  -F "file=@test-files/melody.xml" \
  -F "instruments=Violin,Viola,Cello"

# 4. Verify response structure
# Should return JSON with harmonyOnly, combined, metadata

# 5. Start frontend
cd ../frontend
npm run dev &

# 6. Open browser to http://localhost:5174
# 7. Upload file, select instruments, generate
# 8. Verify results display correctly
```

### Health Check Test
```bash
# Backend health
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"...","service":"HarmonyForge Backend"}

# Frontend API connection
# Open browser console on http://localhost:5174
# Run: fetch('http://localhost:3001/health').then(r => r.json()).then(console.log)
```

### Instrument Sync Verification
```bash
# Create verification script
cat > verify-instruments.sh <<'EOF'
#!/bin/bash

echo "=== Frontend Instruments ==="
grep -o "name: '[^']*'" frontend/src/components/InstrumentSelectionScreen.tsx | \
  cut -d"'" -f2 | sort

echo ""
echo "=== Backend Instruments ==="
grep -E '^  "[A-Z]' backend/src/adapters/nextjs-adapter.js | \
  cut -d'"' -f2 | grep -v "Other" | sort

echo ""
echo "=== Differences (should be empty) ==="
diff \
  <(grep -o "name: '[^']*'" frontend/src/components/InstrumentSelectionScreen.tsx | cut -d"'" -f2 | sort) \
  <(grep -E '^  "[A-Z]' backend/src/adapters/nextjs-adapter.js | cut -d'"' -f2 | grep -v "Other" | sort)
EOF

chmod +x verify-instruments.sh
./verify-instruments.sh
```

## Deployment Integration

### Production Environment Variables

**Frontend** (Vercel/Netlify):
```bash
VITE_API_URL=https://your-backend.railway.app
```

**Backend** (Railway/Render):
```bash
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
PORT=3001
```

### CORS in Production
```javascript
// backend/src/server.js
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,              // Production frontend
    'http://localhost:5174',               // Dev frontend
    'https://your-domain.com',             // Custom domain
  ].filter(Boolean),
  credentials: true
}));
```

### API URL Configuration
```typescript
// frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production'
    ? 'https://your-backend.railway.app'
    : 'http://localhost:3001');
```

## Monitoring Integration Health

### Backend Logs to Monitor
```bash
# Success indicators
[abc123] Processing MusicXML (148940 bytes) for instruments: Violin,Viola,Cello
[abc123] Using deterministic seed: 123456789
[abc123] Key signature: { fifths: 0, mode: 'major', scale: ['C','D','E'...] }
[abc123] Generated 45 chords
[abc123] Harmonic validation score: 85
[abc123] Generating Violin as voice 1...
[abc123] Generating Viola as voice 3...
[abc123] Generating Cello as voice 2...
[abc123] Harmonization completed successfully in 73ms

# Error indicators
[abc123] No file provided
[abc123] Too many instruments: 5
[abc123] Invalid MusicXML format
```

### Frontend Logs to Monitor
```typescript
// api.ts
[API] Sending harmonization request: {
  filename: "melody.xml",
  instruments: ["Violin", "Viola", "Cello"],
  fileSize: "145.45 KB"
}

[API] Harmonization successful: {
  instruments: ["Violin", "Viola", "Cello"],
  processingTime: 73,
  timestamp: "2025-11-17T..."
}

// Or errors
[API] Harmonization failed: Cannot connect to backend server
```

## Adding New Integration Points

### Adding a New API Parameter

**1. Update TypeScript Interface** (`frontend/src/services/api.ts`):
```typescript
export interface HarmonizeParams {
  file: File;
  instruments: string[];
  tempo?: number; // NEW PARAMETER
}
```

**2. Update Frontend API Call**:
```typescript
const formData = new FormData();
formData.append('file', params.file);
formData.append('instruments', params.instruments.join(','));
if (params.tempo) {
  formData.append('tempo', params.tempo.toString());
}
```

**3. Update Backend Route** (`backend/src/routes/harmonize.js`):
```javascript
const tempo = req.body.tempo ? parseInt(req.body.tempo) : 120;
```

**4. Update Adapter** (`backend/src/adapters/nextjs-adapter.js`):
```javascript
async function POST(request) {
  const formData = await request.formData();
  const tempo = formData.get("tempo") || "120";

  // Use tempo in harmonization logic
}
```

**5. Test Integration**:
```bash
curl -X POST http://localhost:3001/api/harmonize \
  -F "file=@test.xml" \
  -F "instruments=Violin" \
  -F "tempo=140"
```
