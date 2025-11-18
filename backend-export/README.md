# HarmonyForge Backend API

This package contains the backend harmonization engine for HarmonyForge - an AI-powered chamber music harmonization application.

## Overview

The harmonization engine automatically generates 4-part harmony (SATB) for uploaded melodies in MusicXML format, supporting 12 different instruments across strings, woodwinds, brass, and voices.

## Features

- **Classical 4-part harmony** with sophisticated voice leading
- **Voice leading rules**: Avoids parallel fifths/octaves, maintains proper voice ranges
- **Instrument support**: Violin, Viola, Cello, Flute, Oboe, Clarinet (B♭), Bassoon, Trumpet (B♭), Horn (F), Tuba, Soprano, Tenor
- **Automatic transposition** for transposing instruments
- **Quality validation**: Scores harmonizations and refines if needed
- **Caching**: In-memory caching (30min TTL, max 100 entries)
- **Both monophonic and polyphonic** input support

## Installation

### 1. Copy Files to Your Next.js Project

```bash
# Create the API route directory
mkdir -p app/api/harmonize

# Copy the harmonization engine
cp harmonize.ts app/api/harmonize/route.ts
```

### 2. Install Dependencies

```bash
npm install @xmldom/xmldom
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "@xmldom/xmldom": "^0.8.10"
  }
}
```

## API Usage

### Endpoint

```
POST /api/harmonize
```

### Request Format

**Content-Type**: `multipart/form-data`

**Parameters**:
- `file` (File, required): MusicXML file (.xml or .musicxml)
- `instruments` (string, required): Comma-separated list of instrument names

**Supported Instruments**:
- Strings: `Violin`, `Viola`, `Cello`
- Woodwinds: `Flute`, `Oboe`, `B-flat Clarinet`, `Bassoon`
- Brass: `B-flat Trumpet`, `F Horn`, `Tuba`
- Voices: `Soprano`, `Tenor Voice`

### Response Format

```typescript
{
  "harmonyOnly": {
    "content": string,     // MusicXML content (harmony parts only)
    "filename": string     // e.g., "harmony_melody.xml"
  },
  "combined": {
    "content": string,     // MusicXML content (original + harmony)
    "filename": string     // e.g., "combined_melody.xml"
  }
}
```

### Example: Fetch API

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('instruments', 'Violin,Viola,Cello');

const response = await fetch('/api/harmonize', {
  method: 'POST',
  body: formData
});

const result = await response.json();

// Download combined score
const blob = new Blob([result.combined.content], { type: 'application/xml' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = result.combined.filename;
link.click();
```

### Example: Using ApiService (from lib/api.ts)

```typescript
import { ApiService } from '@/lib/api';

try {
  const result = await ApiService.harmonize({
    file: uploadedFile,
    instruments: ['Violin', 'Viola', 'Cello', 'B-flat Clarinet']
  });

  console.log('Harmony:', result.harmonyOnly.content);
  console.log('Combined:', result.combined.content);
} catch (error) {
  console.error('Harmonization failed:', error);
}
```

## How It Works

### 1. Input Processing
- Parses MusicXML using DOMParser (@xmldom/xmldom)
- Detects if input is monophonic or polyphonic
- Extracts notes with pitch, duration, and timing information

### 2. Harmonic Analysis
- Analyzes melody to determine key signature
- Generates chord progression based on melodic notes
- Uses scale degrees and harmonic function theory
- Assigns chords (I, IV, V, ii, iii, vi, viio)

### 3. Voice Leading
- Distributes chord tones across SATB (Soprano, Alto, Tenor, Bass)
- Applies classical voice leading rules:
  - Avoids parallel fifths and octaves
  - Prefers common tones between chords
  - Minimizes voice movement (stepwise > leaps)
  - Proper doubling (root > fifth > third)
- Maintains instrument ranges (MIDI 21-99)

### 4. Quality Validation
- Scores harmony quality (0-100) based on:
  - Common tone retention
  - Voice movement smoothness
  - Harmonic progression logic
- Refines if score < 70

### 5. Instrument Part Generation
- Extracts specific voice for each instrument
- Applies transposition for transposing instruments:
  - B♭ instruments: +2 semitones
  - F instruments: +7 semitones
- Generates individual MusicXML parts

### 6. Output
- **Harmony-only**: Just the generated harmony parts
- **Combined**: Original melody + all harmony parts

## Voice Ranges (MIDI Note Numbers)

| Instrument | MIDI Range | Clef | Notes |
|------------|------------|------|-------|
| Violin | 55-103 | G2 | Soprano/Alto voice |
| Viola | 48-91 | C3 | Alto/Tenor voice |
| Cello | 36-76 | F4 | Tenor/Bass voice |
| Flute | 60-96 | G2 | Soprano voice |
| Oboe | 58-91 | G2 | Soprano/Alto voice |
| B-flat Clarinet | 50-94 | G2 | Alto/Tenor (transposed +2) |
| Bassoon | 34-75 | F4 | Tenor/Bass voice |
| B-flat Trumpet | 55-82 | G2 | Soprano/Alto (transposed +2) |
| F Horn | 41-77 | G2 | Alto/Tenor (transposed +7) |
| Tuba | 28-58 | F4 | Bass voice |
| Soprano | 60-84 | G2 | Soprano voice |
| Tenor Voice | 48-69 | G2 (8vb) | Tenor voice |

## Limitations

- **Style**: Currently implements Classical harmony only (Jazz/Pop/Rock not yet implemented)
- **Difficulty**: Does not vary complexity by difficulty level
- **File size**: Limited to 50MB (adjustable in frontend validation)
- **Instruments**: Maximum 4 instruments per harmonization
- **MIDI support**: Only MusicXML format currently supported

## Performance

- **Average processing time**: 200-600ms for typical melodies
- **Caching**: Results cached for 30 minutes (same file + instruments)
- **Max cache size**: 100 entries (LRU eviction)

## Troubleshooting

### Common Issues

**Error: "Invalid MusicXML file"**
- Ensure file is MusicXML 3.1 **Partwise** format (not Timewise)
- Check file is well-formed XML
- Verify file size < 50MB

**Error: "No parts found in score"**
- MusicXML must contain at least one `<part>` element
- Check file was exported correctly from notation software

**Incorrect transposition**
- Verify instrument names exactly match supported names
- B-flat instruments: Use `"B-flat Clarinet"` not `"Clarinet"`
- F instruments: Use `"F Horn"` not `"French Horn"`

**Poor quality harmony**
- Try with different instruments (different voice ranges)
- Check input melody is in a common key (C, G, D, F, Bb major)
- Ensure melody has clear harmonic structure

## Technical Details

### Architecture

```
POST /api/harmonize
  ↓
Parse FormData (file + instruments)
  ↓
Validate MusicXML
  ↓
Extract melody notes
  ↓
Generate chord progression
  ↓
Apply voice leading rules
  ↓
Validate & refine
  ↓
Generate instrument parts (with transposition)
  ↓
Create MusicXML output
  ↓
Return JSON response
```

### Core Functions

- `harmonizeMelody()` - Main orchestrator
- `detectPolyphony()` - Checks monophonic vs polyphonic
- `extractNotes()` - Parse MusicXML to note objects
- `generateHarmonicProgression()` - Creates chord progression
- `analyzeAndBuildChord()` - Determines chord quality
- `voiceChord()` - Applies voice leading rules
- `validateHarmonicProgression()` - Scores quality (0-100)
- `refineHarmonicProgression()` - Regenerates if score < 70
- `generateInstrumentPart()` - Extracts voice for instrument
- `createMusicXML()` - Generates MusicXML output

### Caching Implementation

```typescript
interface CacheEntry {
  result: HarmonizationResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100;
```

Cache key: `SHA-256(fileContent + instrumentList)`

## Compatible Software

Generated MusicXML files are compatible with:
- MuseScore (free, open-source)
- Finale
- Sibelius
- Dorico
- Flat.io
- All major music notation software supporting MusicXML 3.1

## License

MIT License - Feel free to use in your own projects!

## Credits

Built for HarmonyForge - AI-powered chamber music harmonization
