# Copilot instructions for HarmonyForge (chamber-music-fullstack)

Use this file to get up to speed quickly when editing or extending this repo.

Key points (quick):
- Fullstack app: `frontend/` (Vite + React) and `backend/` (Express + harmonization engine).
- Dev run: start backend then frontend in two terminals:
  - `cd backend && npm run dev` (http://localhost:3001)
  - `cd frontend && npm run dev` (http://localhost:5174)
- Main API: `POST /api/harmonize` (multipart/form-data: `file`, `instruments`). See `backend/src/routes/harmonize.js`.

Critical, non-obvious conventions and gotchas:
- Instrument names must match exactly between frontend and backend. Examples: `B-flat Clarinet`, `B-flat Trumpet`, `F Horn`, `Tenor Voice`.
  - Edit mapping in `backend/src/adapters/nextjs-adapter.js` (INSTRUMENT_CONFIG)
  - Edit UI lists in `frontend/src/components/InstrumentSelectionScreen.tsx` and `frontend/src/components/ResultsScreen.tsx`.
- Max 4 instruments per harmonization, file size limit ~50MB, supported input: MusicXML (partwise).

Where the music logic lives (read before changing behavior):
- `backend/src/adapters/nextjs-adapter.js` — the harmonization engine (core pipeline: parse → analyze → voice-leading → output).
- `backend-export/harmonize.ts` — original/reference implementation.
- Voice/order mapping (SATB → instrument assignment):
  ```javascript
  // Voice array: [soprano, alto, tenor, bass] = [0, 1, 2, 3]
  const voiceOrder = [1, 3, 2]; // Maps instruments to [alto, bass, tenor]
  // 1st instrument → Alto (voice 1), 2nd → Bass (voice 3), 3rd → Tenor (voice 2)
  ```
  Each instrument picks a voice cyclically from `voiceOrder` (index % 3). The soprano voice (0) is reserved for the original melody.

API contract (example request/response):
- Request: multipart `file=@melody.musicxml`, `instruments=Violin,Viola,Cello`
- Response JSON: `{ harmonyOnly: {content, filename}, combined: {content, filename}, metadata: {instruments, processingTime, originalFilename} }`

Dev / debugging shortcuts:
- Health: `curl http://localhost:3001/health`
- Kill port: `lsof -ti:3001 | xargs kill -9`
- CORS: edit origins in `backend/src/server.js` (ensure frontend URL present or set `VITE_API_URL` in `frontend/.env.local`).
 - Verify instrument sync: `npm run verify-instruments` (checks backend `INSTRUMENT_CONFIG` vs frontend lists)

Patterns & important implementation details to follow:
- Deterministic output: engine uses a seeded RNG (seed = hash(file + instruments)) — changes affect caching and reproducibility.
- Caching: in-memory LRU (30 min TTL, 100 entries) — key = SHA-256(file + instruments).
- Transposition rules: B-flat instruments +2 semitones; F Horn +7 semitones. Changing transposition requires updates in the adapter and tests.
- Validation/quality scoring: harmonization has a 0–100 score and may trigger refinement passes when <70.

Tests & agent docs:
- Backend tests: `cd backend && node tests/run-all-tests.js` (see `README.md`).
- Frontend tests: `cd frontend && npm test`.
- Specialized agent docs and checklists are under `.claude/agents/` (use these for focussed tasks — e.g., `backend-agent.md`, `integration-agent.md`).

If adding a new instrument (explicit steps):
1. Add entry to `INSTRUMENT_CONFIG` in `backend/src/adapters/nextjs-adapter.js` (clef, minMidi/maxMidi, transposition).
   ```javascript
   "Alto Saxophone": { clefSign: "G", clefLine: 2, minMidi: 49, maxMidi: 81, transposition: 9 },
   ```
2. Add to `frontend/src/components/InstrumentSelectionScreen.tsx` in the appropriate category array:
   ```typescript
   { icon: <PlaceholderIcon instrument="Alto Sax" />, name: 'Alto Saxophone', range: 'Db3 to Ab5', description: '...' }
   ```
3. Add to `INSTRUMENTS_OPTIONS` array in `frontend/src/components/ResultsScreen.tsx`:
   ```typescript
   const INSTRUMENTS_OPTIONS = [ 'Violin', ..., 'Alto Saxophone' ];
   ```
4. Verify sync: `npm run verify-instruments` (should pass).
5. Test with backend: `curl -X POST http://localhost:3001/api/harmonize -F "file=@melody.xml" -F "instruments=Violin,Alto Saxophone,Cello"`
6. (Optional) Add unit/integration test and update `.claude/agents/` docs.

References: `CLAUDE.md`, `README.md`, `INTEGRATION.md`, `DEPLOYMENT.md`, `backend/src/adapters/nextjs-adapter.js`, `frontend/src/components/InstrumentSelectionScreen.tsx`.

Production deployment:
- Frontend: Vercel (static SPA) — see `vercel.json` and `DEPLOYMENT.md`
- Backend: Railway/Render/Vercel Serverless
- Environment files: Copy `.env.example` to `.env.local` and configure URLs
- Build locally: `cd frontend && npm run build && npx vite preview`

If anything here is unclear or missing, tell me which part you want expanded (examples, file pointers, or workflows) and I will iterate.
