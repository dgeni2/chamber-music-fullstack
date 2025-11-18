# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HarmonyForge** is a hybrid fullstack application for classical 4-part harmony generation from MusicXML files. The architecture consists of:
- **Frontend**: Vite + React SPA (port 5174)
- **Backend**: Express.js server wrapping harmonization engine (port 3001)
- **Integration**: REST API with FormData for file uploads

## Development Commands

### Running the Full Stack

**Two terminals required:**

```bash
# Terminal 1 - Backend server
cd backend
npm run dev    # Runs on http://localhost:3001 with auto-reload

# Terminal 2 - Frontend dev server (from project root)
npm run dev    # Runs on http://localhost:5174
```

### Production Build

```bash
# Frontend only
cd frontend
npm run build  # Output: frontend/dist/

# Backend (no build step - pure Node.js)
cd backend
npm start      # Production mode without auto-reload
```

### Health Check

```bash
# Verify backend is running
curl http://localhost:3001/health
```

## Critical Architecture Constraints

### Instrument Naming
**CRITICAL**: Instrument names must match EXACTLY between frontend and backend. Any mismatch will cause integration failures.

**Supported instruments** (12 total):
- Strings: `Violin`, `Viola`, `Cello`
- Woodwinds: `Flute`, `Oboe`, `B-flat Clarinet`, `Bassoon`
- Brass: `B-flat Trumpet`, `F Horn`, `Tuba`
- Voices: `Soprano`, `Tenor Voice`

**Notes**:
- Use `B-flat Clarinet` not `B♭ Clarinet`
- Use `B-flat Trumpet` not `B♭ Trumpet`
- Use `Soprano` not `Soprano Voice` in backend INSTRUMENT_CONFIG
- Use `Tenor Voice` with space (not `TenorVoice`)

**Locations to update if adding instruments**:
1. `frontend/src/components/InstrumentSelectionScreen.tsx` (lines ~229, 246, 269)
2. `frontend/src/components/ResultsScreen.tsx` (INSTRUMENTS_OPTIONS array)
3. `backend/src/adapters/nextjs-adapter.js` (INSTRUMENT_CONFIG object)

### API Integration Flow

```
Frontend Upload (FormData)
    ↓
POST /api/harmonize
    ↓
routes/harmonize.js (validation + metadata)
    ↓
adapters/nextjs-adapter.js (harmonization engine)
    ↓
Response: { harmonyOnly, combined, metadata }
```

**Request format**:
- Method: `POST /api/harmonize`
- Content-Type: `multipart/form-data`
- Body: `file` (MusicXML), `instruments` (comma-separated string)

**Response format**:
```json
{
  "harmonyOnly": { "content": "<?xml...", "filename": "..." },
  "combined": { "content": "<?xml...", "filename": "..." },
  "metadata": {
    "instruments": ["Violin", "Viola"],
    "processingTime": 73,
    "timestamp": "2025-11-17T...",
    "originalFilename": "melody.xml"
  }
}
```

### Harmonization Engine (backend/src/adapters/nextjs-adapter.js)

**Core pipeline** (1,781 lines of music theory logic):

1. **Parse MusicXML**: Extract notes using @xmldom/xmldom
2. **Detect polyphony**: Single voice vs. multiple voice input
3. **Key analysis**: Extract key signature (fifths, mode)
4. **Harmonic progression**: Generate chord sequence with voice leading rules
5. **Voice leading**: Apply classical rules (avoid parallel 5ths/8ves, smooth motion)
6. **Instrument parts**: Generate SATB parts, map to selected instruments
7. **MusicXML generation**: Create output with correct clefs and transpositions

**Key features**:
- **Deterministic output**: Seeded RNG based on content hash + instruments
- **Caching**: 30-minute TTL, 100-entry LRU cache
- **Transposition**: B-flat (+2 semitones), F Horn (+7 semitones)
- **Clef handling**: Treble (G2), Bass (F4), Alto (C3)
- **Range constraints**: Each instrument has minMidi/maxMidi bounds

**Voice assignments**:
```javascript
// Voice order: [soprano, alto, tenor, bass] = [0, 1, 2, 3]
// Instrument mapping: [1, 3, 2] (alto, bass, tenor)
// First instrument → Alto (voice 1)
// Second instrument → Bass (voice 3)
// Third instrument → Tenor (voice 2)
```

## File Structure

```
chamber-music-fullstack/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── InstrumentSelectionScreen.tsx  # Main UI, API call
│   │   │   ├── ResultsScreen.tsx              # Display results
│   │   │   └── ui/                            # shadcn/ui components
│   │   ├── services/
│   │   │   └── api.ts                         # ApiService.harmonize()
│   │   └── main.tsx
│   ├── .env.local                             # VITE_API_URL=http://localhost:3001
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── server.js                          # Express server (port 3001)
│   │   ├── routes/
│   │   │   └── harmonize.js                   # POST /api/harmonize route
│   │   └── adapters/
│   │       └── nextjs-adapter.js              # 1,781-line harmonization engine
│   └── package.json
├── backend-export/
│   └── harmonize.ts                           # Original TypeScript reference
├── INTEGRATION.md                             # Full integration guide
└── CLAUDE.md                                  # This file
```

## Common Workflows

### Adding a New Instrument

1. Add to backend INSTRUMENT_CONFIG with clef, range, transposition:
   ```javascript
   // backend/src/adapters/nextjs-adapter.js
   const INSTRUMENT_CONFIG = {
     "New Instrument": {
       clefSign: "G",
       clefLine: 2,
       minMidi: 48,
       maxMidi: 84,
       transposition: 0  // Semitones up for written pitch
     }
   };
   ```

2. Add to frontend instrument list:
   ```typescript
   // frontend/src/components/InstrumentSelectionScreen.tsx
   { name: 'New Instrument', category: 'Strings' }
   ```

3. Add to results screen options:
   ```typescript
   // frontend/src/components/ResultsScreen.tsx
   const INSTRUMENTS_OPTIONS = ['Violin', ..., 'New Instrument'];
   ```

### Testing Harmonization

```bash
# 1. Start backend
cd backend && npm run dev

# 2. Test with curl
curl -X POST http://localhost:3001/api/harmonize \
  -F "file=@path/to/melody.xml" \
  -F "instruments=Violin,Viola,Cello"

# 3. Check backend logs for processing time and validation score
```

### Debugging Backend Issues

**Port already in use**:
```bash
lsof -ti:3001 | xargs kill -9
```

**CORS errors**: Check `backend/src/server.js` CORS origins list includes your frontend URL

**Invalid MusicXML**: Backend validates for `<score-partwise>` or `<score-timewise>` tags

**Instrument mismatch**: Compare names in browser DevTools → Network → Request Payload vs. backend INSTRUMENT_CONFIG keys

## Environment Variables

**Frontend** (`frontend/.env.local`):
```bash
VITE_API_URL=http://localhost:3001
```

**Backend** (optional):
```bash
PORT=3001
FRONTEND_URL=http://localhost:5174
NODE_ENV=development
```

## Music Theory Implementation Details

### Chord Quality Rules
```javascript
// Major key: I, IV, V are major; ii, iii, vi are minor; vii° is diminished
// Minor key: i, iv are minor; III, VI, VII are major; ii° is diminished
```

### Voice Leading Constraints
- Alto range: G3-E5 (MIDI 55-76)
- Tenor range: C3-G4 (MIDI 48-67)
- Bass range: E2-C4 (MIDI 40-60)
- Maximum interval between voices: 7 semitones (inner voices), 12 semitones (bass)

### Harmonic Validation Scoring
- Common tone connectivity: -2 points per missing common tone
- Chord quality appropriateness: -1 point per unsupported melody note
- Voice leading smoothness: -0.5 points per leap > 5 semitones
- Progression logic: +2 points for strong progressions (V→I, IV→I)
- Score < 70: Triggers refinement pass

## Dependencies

**Backend**:
- `express` - HTTP server
- `cors` - Cross-origin requests
- `multer` - Multipart form data (file uploads)
- `@xmldom/xmldom` - MusicXML parsing (replaces jsdom for serverless compatibility)

**Frontend**:
- `react` + `react-dom` - UI framework
- `vite` - Build tool
- `tailwindcss` - Styling
- `@radix-ui/*` - UI component primitives (shadcn/ui)
- `lucide-react` - Icons

## Deployment Considerations

**Frontend**: Vercel/Netlify (static SPA)
- Set `VITE_API_URL` to production backend URL
- Build command: `npm run build`
- Output directory: `frontend/dist`

**Backend**: Railway/Render/Vercel Serverless
- Configure CORS to allow production frontend domain
- Set `PORT` environment variable
- For serverless: Ensure 60s timeout (harmonization can take 40-70ms for complex files)

## Known Limitations

- Maximum 4 instruments per harmonization
- File size limit: 50MB
- Supported input: MusicXML 3.1 Partwise format only
- Cache size: 100 entries (LRU eviction)
- Processing timeout: 60 seconds (serverless functions)
