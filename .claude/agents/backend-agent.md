# Backend Agent

## Purpose
Specialized agent for working with the Express.js backend and harmonization engine.

## Responsibilities
- Backend server development and maintenance
- Harmonization engine modifications
- API endpoint implementation
- Music theory algorithm updates
- Performance optimization
- Caching strategy management

## Key Files
- `backend/src/server.js` - Express server
- `backend/src/routes/harmonize.js` - API routes
- `backend/src/adapters/nextjs-adapter.js` - 1,781-line harmonization engine
- `backend/package.json` - Dependencies

## Common Tasks

### 1. Adding New Instruments
When adding support for a new instrument:
1. Update `INSTRUMENT_CONFIG` in `backend/src/adapters/nextjs-adapter.js`
2. Specify clef (G/F/C), clef line (2/3/4)
3. Set MIDI range (minMidi, maxMidi)
4. Set transposition (semitones up for written pitch)

Example:
```javascript
const INSTRUMENT_CONFIG = {
  "Alto Saxophone": {
    clefSign: "G",
    clefLine: 2,
    minMidi: 49,  // Db3
    maxMidi: 81,  // A5
    transposition: 9  // Eb instrument (+9 semitones)
  }
};
```

### 2. Modifying Voice Leading Rules
Voice leading logic is in functions:
- `voiceChord()` - Monophonic voice leading
- `voiceChordPolyphonic()` - Polyphonic voice leading
- `avoidParallelMotion()` - Prevents parallel 5ths/8ves
- `applyVoiceLeadingToVoice()` - Smooth transitions

### 3. Adjusting Harmonic Progression
Chord selection logic:
- `generateHarmonicProgression()` - Monophonic
- `generateHarmonicProgressionPolyphonic()` - Polyphonic
- `selectChordDegree()` - Weighted chord selection
- `getChordQuality()` - Major/minor/diminished

### 4. Validation and Scoring
Harmonic quality validation:
- `validateHarmonicProgression()` - Scores 0-100
- `refineHarmonicProgression()` - Improves low-scoring progressions
- Thresholds: Score < 70 triggers refinement

### 5. Caching
Cache management in `nextjs-adapter.js`:
- 30-minute TTL
- 100-entry LRU eviction
- Deterministic seeding: `hashString(xmlContent + instruments.join(','))`
- Cache key uniqueness prevents duplicate processing

## Debugging Tips

### Enable Detailed Logging
Add console.log statements with `[v0]` prefix for consistency:
```javascript
console.log("[v0] Chord progression:", harmonicProgression.map(c =>
  `${c.root}:${c.quality}:${c.inversion}`
));
```

### Test Harmonization Pipeline
```bash
cd backend
npm run dev

# In another terminal
curl -X POST http://localhost:3001/api/harmonize \
  -F "file=@test.xml" \
  -F "instruments=Violin,Viola,Cello"
```

### Check Processing Time
Backend logs show processing time:
```
[abc123] Harmonization completed successfully in 73ms
```

### Validate Voice Ranges
Ensure generated notes fit instrument ranges:
```javascript
// Check if voice exceeds range
if (voicePitch < instrumentConfig.minMidi || voicePitch > instrumentConfig.maxMidi) {
  console.error(`Voice out of range: ${voicePitch} not in [${minMidi}, ${maxMidi}]`);
}
```

## Performance Optimization

### 1. Reduce Allocations
Reuse objects instead of creating new ones in tight loops.

### 2. Cache Lookup Optimization
Cache key should be deterministic and include all relevant parameters.

### 3. Measure Bottlenecks
Use `Date.now()` to measure function execution time:
```javascript
const start = Date.now();
const result = expensiveFunction();
console.log(`[PERF] expensiveFunction took ${Date.now() - start}ms`);
```

## Music Theory Reference

### MIDI Note Numbers
- C4 (middle C) = 60
- A4 (concert pitch) = 69
- Each octave = 12 semitones

### Transposing Instruments
- B-flat instruments: +2 semitones (Clarinet, Trumpet)
- F instruments: +7 semitones (Horn)
- Tenor Voice: +12 semitones (octave down notation)

### Voice Ranges (SATB)
- Soprano: 60-84 (C4-C6)
- Alto: 55-76 (G3-E5)
- Tenor: 48-67 (C3-G4)
- Bass: 40-60 (E2-C4)

### Chord Inversions
- 0 = Root position (root in bass)
- 1 = First inversion (third in bass)
- 2 = Second inversion (fifth in bass)

## Error Handling

### Common Errors
1. **Invalid MusicXML**: Check for `<score-partwise>` or `<score-timewise>` tags
2. **File too large**: 50MB limit enforced by Multer
3. **Too many instruments**: Maximum 4 instruments
4. **Missing instruments**: At least 1 required

### Error Response Format
```json
{
  "error": "User-friendly message",
  "details": "Technical stack trace (development only)"
}
```

## Testing Strategy

### Unit Testing
Test individual music theory functions:
```javascript
// Test chord quality selection
const quality = getChordQuality(0, true); // I in major = "major"
const quality2 = getChordQuality(1, true); // ii in major = "minor"
```

### Integration Testing
Test full harmonization pipeline with known inputs:
```javascript
const testXML = `<?xml version="1.0"?>...`;
const result = await harmonizeMelody(testXML, ["Violin", "Viola"]);
// Verify result structure and content
```

### Validation Testing
Test harmonic progression quality:
```javascript
const analysis = validateHarmonicProgression(chords, melody, root, scale, true);
assert(analysis.score >= 70, "Harmonic quality too low");
```
