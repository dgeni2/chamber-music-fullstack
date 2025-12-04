# HarmonyForge

**HarmonyForge** is a full-stack web application that automatically generates chamber music harmonies from melodic input. Upload a MIDI or MusicXML file with a melody, select your desired instruments, and HarmonyForge will create professional-quality SATB (Soprano, Alto, Tenor, Bass) harmonies with intelligent voice leading, following classical music theory principles.

🔗 **Live Application**: [https://chamber-music-fullstack-deploy.vercel.app/](https://chamber-music-fullstack-deploy.vercel.app/)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
  - [Frontend](#frontend)
  - [Backend](#backend)
- [How It Works](#how-it-works)
  - [Frontend Flow](#frontend-flow)
  - [Backend Harmonization Logic](#backend-harmonization-logic)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [Deployment](#deployment)
- [Technical Details](#technical-details)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)

---

## Overview

HarmonyForge is designed for musicians, composers, and music educators who want to quickly generate harmonizations for chamber music ensembles. The application uses advanced music theory algorithms to:

- Analyze melodic input (monophonic or polyphonic)
- Generate appropriate harmonic progressions
- Apply SATB voice leading rules
- Assign harmonies to selected instruments
- Output MusicXML files for use in music notation software

The system supports 13 different instruments across strings, woodwinds, brass, and voices, and can generate harmonies for ensembles of 1-4 instruments.

---

## Features

### Core Functionality

- **Multi-Format Input**: Supports MIDI (.mid, .midi) and MusicXML (.xml, .musicxml) files
- **Instrument Selection**: Choose from 13 instruments organized by family
  - **Strings**: Violin, Viola, Cello
  - **Woodwinds**: Flute, Oboe, B-flat Clarinet, Bassoon
  - **Brass**: B-flat Trumpet, F Horn, Tuba
  - **Voices**: Soprano, Tenor Voice
- **Polyphonic Support**: Handles both single-voice melodies and multi-voice polyphonic input
- **Intelligent Harmonization**: 
  - Analyzes key signature and mode
  - Generates appropriate chord progressions
  - Applies voice leading rules (SATB)
  - Avoids parallel fifths/octaves
  - Handles non-chord tones (NCTs)
- **Dual Output**: Generates both harmony-only and combined (melody + harmony) MusicXML files
- **Visual Score Display**: Renders generated scores using OpenSheetMusicDisplay

### User Interface

- **Modern, Responsive Design**: Built with React, TypeScript, and Tailwind CSS
- **Intuitive Workflow**: Step-by-step process (Upload → Select Instruments → Generate → View Results)
- **Drag & Drop Upload**: Easy file upload with drag-and-drop support
- **Real-time Processing**: Visual feedback during harmonization
- **Score Visualization**: Interactive sheet music viewer
- **Download Capabilities**: Export generated MusicXML files

---

## Architecture

### Frontend

The frontend is built as a Single Page Application (SPA) using modern web technologies:

#### Technology Stack

- **React 18.3** with TypeScript
- **Vite 5.4** as the build tool and dev server
- **Tailwind CSS 4.1** for styling
- **Radix UI** components for accessible UI primitives
- **OpenSheetMusicDisplay** for music score rendering
- **React Router** (implicit via state management)

#### Key Components

1. **`App.tsx`** - Main application component managing the overall state and navigation
   - Manages page state (home, projects, profile, processing, instrument selection, results)
   - Handles file upload and validation
   - Coordinates between different screens

2. **`HomePage` Components** (`components/home/`):
   - `UploadZone.tsx` - Drag-and-drop file upload area
   - `AnimatedTitle.tsx` - Animated welcome title
   - `UploadMessage.tsx` - File upload status messages

3. **`InstrumentSelectionScreen.tsx`** - Instrument selection interface
   - Displays instruments organized by family
   - Allows selection of up to 4 instruments
   - Validates selection before proceeding

4. **`ProcessingScreen.tsx`** - Loading/processing indicator

5. **`ResultsScreen.tsx`** - Results display
   - Renders MusicXML scores using OpenSheetMusicDisplay
   - Provides download functionality
   - Shows harmony-only and combined versions
   - Allows regeneration with different instruments

6. **`Sidebar.tsx`** - Navigation sidebar
   - Links to Home, Projects, and Profile pages

#### State Management

The application uses React's built-in state management (`useState`, `useEffect`) for:
- Current page/view state
- File upload state
- Selected instruments
- Harmonization results
- Error handling

#### API Integration

The frontend communicates with the backend through the `ApiService` class (`services/api.ts`):

```typescript
// API Service handles:
- File uploads via FormData
- Harmonization requests to /api/harmonize
- Health checks to /health
- Error handling and user feedback
```

#### Build & Development

- **Development**: `npm run dev` (runs on `http://localhost:5173`)
- **Production Build**: `npm run build` (outputs to `frontend/dist/`)
- **Environment Variables**: Uses `VITE_API_URL` to configure backend endpoint

### Backend

The backend consists of a Node.js/Express server with a sophisticated harmonization engine.

#### Technology Stack

- **Node.js 18+** with ES modules
- **Express 4.18** for HTTP server
- **Multer 1.4** for file upload handling
- **@xmldom/xmldom 0.8** for XML parsing
- **TypeScript** for core harmonization logic

#### Architecture Layers

1. **Server Layer** (`backend/src/server.js`)
   - Express server setup
   - CORS configuration
   - File upload middleware (Multer)
   - Error handling
   - Health check endpoint

2. **Route Layer** (`backend/src/routes/harmonize.js`)
   - Validates file uploads
   - Parses instrument parameters
   - Converts Express request to adapter format
   - Adds metadata to responses

3. **Adapter Layer** (`backend/src/adapters/nextjs-adapter.js`)
   - Bridges Express and harmonization core
   - Handles Next.js-compatible request format
   - Manages caching (optional)

4. **Core Harmonization Engine** (`backend/src/harmonize-core.ts`)
   - **2,386 lines** of sophisticated music theory logic
   - MusicXML parsing
   - Harmonic analysis
   - Voice leading algorithms
   - MusicXML generation

#### Deployment Modes

The backend can run in two modes:

1. **Development Mode**: Standalone Express server (`http://localhost:3001`)
2. **Production Mode**: Vercel serverless functions (`api/harmonize.js`)

The Vercel deployment uses serverless functions for the harmonization API, allowing it to scale automatically.

---

## How It Works

### Frontend Flow

1. **File Upload** (`HomePage`)
   - User drags and drops or selects a MIDI/XML file
   - File is validated (format, size ≤ 50MB)
   - File data is stored in component state

2. **Processing Screen**
   - Brief processing animation
   - Prepares for instrument selection

3. **Instrument Selection** (`InstrumentSelectionScreen`)
   - User selects 1-4 instruments from available options
   - Selection is validated
   - On "Continue", triggers API call

4. **API Request** (`ApiService.harmonize()`)
   - Creates FormData with file and instruments
   - POSTs to `/api/harmonize`
   - Handles loading states and errors

5. **Results Display** (`ResultsScreen`)
   - Receives harmony data (XML strings)
   - Renders scores using OpenSheetMusicDisplay
   - Provides download buttons
   - Allows regeneration or new harmonization

### Backend Harmonization Logic

The harmonization process is a sophisticated multi-stage pipeline:

#### Stage 1: Input Parsing & Analysis

```typescript
1. Parse MusicXML using DOMParser
2. Extract key signature (fifths, mode)
3. Determine root note and scale
4. Detect polyphony (single voice vs. multiple voices)
```

**Key Detection**:
- Reads `<fifths>` element (number of sharps/flats)
- Reads `<mode>` element (major/minor)
- Maps to root note and scale intervals
- Supports all 12 major and 12 minor keys

**Polyphony Detection**:
- Checks for multiple `<score-part>` elements, OR
- Checks for multiple `<voice>` elements within a part
- Routes to appropriate harmonization algorithm

#### Stage 2: Melody Extraction

**Monophonic** (`extractNotes()`):
- Extracts single melodic line
- Converts note elements to MIDI pitches
- Tracks duration and timing
- Handles rests

**Polyphonic** (`extractNotesPolyphonic()`):
- Extracts multiple melodic lines
- Maintains temporal alignment
- Creates synchronized time slices

#### Stage 3: Harmonic Progression Generation

**Monophonic Harmonization** (`generateHarmonicProgression()`):
- Analyzes each melody note
- Determines appropriate chord function (tonic, predominant, dominant)
- Selects chord based on:
  - Melody note's scale degree
  - Harmonic function flow (Tonic → Predominant → Dominant → Tonic)
  - Voice leading considerations
  - Random variation (if enabled, using seeded RNG)

**Polyphonic Harmonization** (`generateHarmonicProgressionPolyphonic()`):
- Analyzes simultaneous notes at each time slice
- Determines vertical harmony (chord implied by multiple notes)
- Uses `analyzeVerticalHarmony()` to identify:
  - Root of the chord
  - Chord quality (major, minor, diminished, augmented)
  - Inversion
  - Non-chord tones

**Harmonic Functions**:
The system uses classical harmonic function theory:
- **Tonic**: I, iii, vi (stable, home)
- **Tonic Prolongation**: I6, I64, iii, vi (extending tonic)
- **Predominant**: ii, ii6, ii7, IV, iv, VI (preparing dominant)
- **Dominant**: V, V6, V7, vii°, vii°7 (creating tension, resolving to tonic)

#### Stage 4: Voice Leading (SATB)

**Voice Assignment**:
- **Soprano**: Original melody (voice 0)
- **Alto**: First harmony voice (voice 1)
- **Tenor**: Second harmony voice (voice 2)
- **Bass**: Third harmony voice (voice 3)

**Voice Leading Rules** (applied in `voiceChord()` and `voiceChordPolyphonic()`):

1. **Range Constraints**: Each voice stays within SATB ranges:
   - Soprano: C4 to C6 (MIDI 60-84)
   - Alto: G3 to E5 (MIDI 55-76)
   - Tenor: C3 to G4 (MIDI 48-67)
   - Bass: E2 to C4 (MIDI 40-60)

2. **Motion Priority** (in `applyVoiceLeadingToVoice()`):
   - **Oblique Motion** (common tone retention) - Best
   - **Stepwise Motion** (2nd intervals) - Very Good
   - **Small Leaps** (3rd, 4th) - Acceptable
   - **Large Leaps** - Minimized

3. **Spacing Rules** (`enforceSpacing()`):
   - No interval > octave between adjacent voices
   - Soprano-Alto, Alto-Tenor, Tenor-Bass spacing checked

4. **Parallel Motion Avoidance** (`avoidParallelMotion()`):
   - No parallel perfect fifths
   - No parallel perfect octaves
   - No direct fifths/octaves in outer voices

5. **Tendency Tones**:
   - Leading tone (7th scale degree) resolves up to tonic
   - Chord 7ths resolve down by step

6. **Doubling Strategy** (`getDoublingStrategy()`):
   - Root position: Double root
   - First inversion: Double root or third
   - Second inversion: Double fifth
   - Seventh chords: Avoid doubling seventh

#### Stage 5: Instrument Part Generation

For each selected instrument (`generateInstrumentPart()`):

1. **Voice Mapping**: Instruments are assigned to voices cyclically:
   ```typescript
   const voiceOrder = [1, 3, 2]; // Alto, Bass, Tenor
   // 1st instrument → Alto (voice 1)
   // 2nd instrument → Bass (voice 3)
   // 3rd instrument → Tenor (voice 2)
   // 4th instrument → Alto again
   ```

2. **Instrument Configuration**: Each instrument has:
   - **Clef**: G (treble), F (bass), or C (alto)
   - **Range**: Min/max MIDI pitches
   - **Transposition**: Semitones offset (for transposing instruments)

3. **Note Generation**: 
   - Extracts assigned voice from SATB voicing
   - Adjusts for instrument range
   - Applies transposition if needed
   - Handles rests

#### Stage 6: Validation & Refinement

**Harmonic Validation** (`validateHarmonicProgression()`):
- Scores harmonic progression (0-100)
- Checks for:
  - Proper chord functions
  - Voice leading quality
  - Resolution of tensions
- Generates warnings and suggestions

**Refinement** (`refineHarmonicProgression()`):
- If score < 70, applies improvements:
  - Better inversion choices
  - Common tone retention
  - Smoother voice leading
  - Better chord resolutions

#### Stage 7: MusicXML Generation

**Harmony-Only XML** (`createMultiInstrumentHarmonyXML()`):
- Creates new MusicXML document
- Adds parts for selected instruments
- Includes only harmony parts (no melody)

**Combined XML** (`createCombinedMultiInstrumentXML()`):
- Creates new MusicXML document
- Adds melody part as first part
- Adds harmony parts below

**MusicXML Structure**:
- Proper score-partwise format
- Instrument definitions with MIDI programs
- Clef, key signature, time signature
- Note elements with pitch, duration, voice assignments
- Supports multi-voice polyphony

#### Stage 8: Response & Caching

- Returns both XML strings as base64 or plain text
- Adds metadata (instruments, processing time, timestamp)
- Optional caching for consistent results (seeded random)

---

## Installation & Setup

### Prerequisites

- **Node.js** 18.x or higher
- **npm** (comes with Node.js)
- Git (for cloning the repository)

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd chamber-music-fullstack
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```
   This installs dependencies for:
   - Root package (for scripts)
   - Backend (`backend/`)
   - Frontend (`frontend/`)

3. **Start the development servers**:

   **Option A: Run both simultaneously** (recommended):
   ```bash
   npm run dev
   ```
   This runs both backend and frontend concurrently using `concurrently`.

   **Option B: Run separately**:
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on `http://localhost:3001`

   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

4. **Access the application**:
   - Open your browser to `http://localhost:5173`
   - The frontend will automatically connect to the backend

### Environment Variables

**Frontend** (optional):
- `VITE_API_URL`: Backend API URL (defaults to `http://localhost:3001` in dev, empty in prod for relative paths)

**Backend** (optional):
- `PORT`: Server port (defaults to 3001)
- `NODE_ENV`: Environment mode (development/production)
- `FRONTEND_URL`: Frontend URL for CORS (optional)

### Production Build

**Frontend**:
```bash
cd frontend
npm run build
```
Output: `frontend/dist/`

**Backend**:
No build step required (pure Node.js/TypeScript)

---

## Usage Guide

### Basic Workflow

1. **Upload a File**
   - Drag and drop a MIDI or MusicXML file onto the upload zone
   - OR click the upload zone to browse and select a file
   - Supported formats: `.mid`, `.midi`, `.xml`, `.musicxml`
   - Maximum file size: 50MB

2. **Select Instruments**
   - Choose 1-4 instruments from the available options
   - Instruments are organized by family (Strings, Woodwinds, Brass, Voices)
   - Click on an instrument card to select/deselect
   - Maximum 4 instruments can be selected at once

3. **Generate Harmony**
   - Click the "Continue" button
   - Wait for processing (typically 1-5 seconds)
   - The system will:
     - Analyze your melody
     - Generate harmonic progression
     - Create voice parts for selected instruments
     - Generate MusicXML output

4. **View Results**
   - View the generated score in the sheet music viewer
   - Toggle between "Harmony Only" and "Combined" views
   - Download the MusicXML files using the download buttons

5. **Options**
   - **Regenerate**: Create a new harmonization with the same instruments
   - **Generate New**: Start over with a new file

### Tips for Best Results

- **Melody Quality**: Clear, single-voice melodies work best
- **Key Signature**: The system automatically detects key, but explicit key signatures in the input file help
- **Length**: Works with melodies of any length, from a few measures to full pieces
- **Instrument Selection**: 
  - Choose instruments that cover different ranges for best voice distribution
  - Example: Violin + Viola + Cello provides good SATB coverage
- **Polyphonic Input**: If your input has multiple voices, the system will analyze them together

### Supported Instruments

| Instrument | Range | Clef | Transposition |
|------------|-------|------|---------------|
| Violin | G3 to E7 | Treble (G) | 0 (Concert) |
| Viola | C3 to E6 | Alto (C) | 0 (Concert) |
| Cello | C2 to A5 | Bass (F) | 0 (Concert) |
| Flute | C4 to C7 | Treble (G) | 0 (Concert) |
| Oboe | Bb3 to A6 | Treble (G) | 0 (Concert) |
| B-flat Clarinet | D3 to Bb6 | Treble (G) | +2 semitones |
| Bassoon | Bb1 to Eb5 | Bass (F) | 0 (Concert) |
| B-flat Trumpet | E3 to Bb5 | Treble (G) | +2 semitones |
| F Horn | B2 to F5 | Treble (G) | +7 semitones |
| Tuba | D1 to F4 | Bass (F) | 0 (Concert) |
| Soprano | C4 to C6 | Treble (G) | 0 (Concert) |
| Tenor Voice | C3 to C5 | Treble (G) | +12 semitones (octave) |

---

## Deployment

### Vercel Deployment

The application is deployed on Vercel at:
**https://chamber-music-fullstack-deploy.vercel.app/**

#### Deployment Configuration

The deployment uses Vercel serverless functions for the API:

**`vercel.json`** configuration:
```json
{
  "buildCommand": "bash build.sh",
  "outputDirectory": "frontend/dist",
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60,
      "memory": 3008
    }
  },
  "rewrites": [
    {
      "source": "/api/harmonize",
      "destination": "/api/harmonize.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Build Process** (`build.sh`):
1. Installs frontend dependencies
2. Builds Vite application
3. Outputs static files to `frontend/dist/`

**Serverless Functions**:
- `api/harmonize.js` - Harmonization API endpoint
- `api/health.js` - Health check endpoint

#### Deployment Steps

1. **Connect to Vercel**:
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Production Deployment**:
   ```bash
   vercel --prod
   ```

The Vercel deployment automatically:
- Builds the frontend
- Deploys static files
- Sets up serverless functions
- Configures routing and CORS

### Environment Variables for Production

Set in Vercel dashboard:
- `NODE_ENV=production`
- (Optional) `FRONTEND_URL` for CORS if needed

---

## Technical Details

### Music Theory Implementation

#### Scale Detection
- Uses circle of fifths to map `<fifths>` to key
- Supports major and minor modes
- Calculates scale intervals (semitone distances)

#### Chord Analysis
- Identifies triads and seventh chords
- Determines chord quality (major, minor, diminished, augmented)
- Analyzes inversions (root, first, second, third)
- Detects secondary dominants and borrowed chords

#### Voice Leading Algorithms

**SATB Rules Implementation**:
- **Soprano (Melody)**: Preserved from input
- **Alto, Tenor, Bass**: Generated with constraints

**Motion Types**:
1. **Oblique**: One voice holds, other moves (best)
2. **Contrary**: Voices move in opposite directions (good)
3. **Similar**: Voices move in same direction (acceptable)
4. **Parallel**: Voices move in same direction, same interval (avoided)

**Voice Leading Constraints**:
- Maximum leap: Octave (prefer smaller)
- Parallel perfect intervals: Avoided
- Voice crossing: Avoided
- Range limits: Enforced per voice

#### Non-Chord Tones (NCTs)

The system recognizes and handles:
- **Passing Tones**: Stepwise motion between chord tones
- **Neighbor Tones**: Stepwise motion away and back
- **Suspensions**: Held tone resolving down
- **Appoggiaturas**: Leap up, step down
- **Escape Tones**: Step up, leap down
- **Anticipations**: Early arrival of next chord tone

### Deterministic Output

The harmonization uses a **seeded random number generator**:
- Seed is generated from file content + instruments
- Same input → same output
- Allows for reproducible results
- Optional variation can be enabled

### Caching Strategy

- In-memory cache for harmonization results
- Cache key: file content hash + instruments
- TTL: 30 minutes
- Max size: 100 entries
- Helps with repeated requests

### Error Handling

**Frontend**:
- File validation (format, size)
- API error handling with user-friendly messages
- Network error detection
- Loading states

**Backend**:
- XML parsing errors
- Invalid file format detection
- Instrument validation
- Graceful error responses with details

### Performance Considerations

**Optimizations**:
- Efficient XML parsing (single pass where possible)
- Minimal DOM manipulation
- Caching for repeated requests
- Streaming for large files (future enhancement)

**Limitations**:
- File size limit: 50MB
- Maximum instruments: 4
- Processing time: 1-60 seconds (depends on complexity)
- Vercel function timeout: 60 seconds

---

## Project Structure

```
chamber-music-fullstack/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── home/        # Homepage components
│   │   │   ├── ui/          # Reusable UI components (Radix UI)
│   │   │   └── ...
│   │   ├── services/        # API service layer
│   │   ├── assets/          # Images, icons
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── harmonize-core.ts    # Core harmonization engine (2,386 lines)
│   │   ├── server.js            # Express server
│   │   ├── routes/              # API routes
│   │   └── adapters/            # Adapter layers
│   └── package.json
│
├── api/                      # Vercel serverless functions
│   ├── harmonize.js          # Harmonization endpoint
│   └── health.js             # Health check
│
├── backend-export/           # Export/backup of harmonization logic
│
├── scripts/                  # Utility scripts
│
├── vercel.json               # Vercel deployment configuration
├── build.sh                  # Build script for Vercel
└── package.json              # Root package.json
```

### Key Files

**Frontend**:
- `frontend/src/App.tsx` - Main app component
- `frontend/src/components/InstrumentSelectionScreen.tsx` - Instrument selection
- `frontend/src/components/ResultsScreen.tsx` - Results display
- `frontend/src/services/api.ts` - API client

**Backend**:
- `backend/src/harmonize-core.ts` - Core harmonization engine (2,386 lines)
- `backend/src/server.js` - Express server setup
- `backend/src/routes/harmonize.js` - API route handler
- `backend/src/adapters/nextjs-adapter.js` - Next.js adapter

**Deployment**:
- `api/harmonize.js` - Vercel serverless function
- `vercel.json` - Vercel configuration
- `build.sh` - Build script

---

## API Documentation

### Endpoint: `POST /api/harmonize`

Harmonizes a melody with selected instruments.

#### Request

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file` (File): MusicXML or MIDI file (max 50MB)
- `instruments` (String): Comma-separated list of instrument names

**Example**:
```bash
curl -X POST http://localhost:3001/api/harmonize \
  -F "file=@melody.xml" \
  -F "instruments=Violin,Viola,Cello"
```

#### Response

**Success** (200 OK):
```json
{
  "harmonyOnly": {
    "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "filename": "harmony-only.musicxml"
  },
  "combined": {
    "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "filename": "combined.musicxml"
  },
  "metadata": {
    "instruments": ["Violin", "Viola", "Cello"],
    "processingTime": 2341,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "originalFilename": "melody.xml"
  }
}
```

**Error** (400/500):
```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "metadata": {
    "processingTime": 123,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Codes

- `400` - Bad Request (invalid file, missing parameters, invalid instruments)
- `500` - Internal Server Error (harmonization failure, parsing error)

### Endpoint: `GET /health`

Health check endpoint.

#### Response

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "HarmonyForge Backend"
}
```

---

## Contributing

This is a full-stack music harmonization application. If you'd like to contribute:

1. Understand the music theory principles (SATB voice leading)
2. Test thoroughly with various musical inputs
3. Maintain code quality and documentation
4. Follow the existing code style

---

## License

MIT License - see LICENSE file for details

---

## Acknowledgments

- Built with modern web technologies
- Uses classical music theory principles
- Inspired by traditional SATB harmonization techniques
- OpenSheetMusicDisplay for score rendering
- Vercel for hosting and serverless functions

---

## Support

For issues, questions, or contributions, please refer to the repository's issue tracker.

**Live Application**: [https://chamber-music-fullstack-deploy.vercel.app/](https://chamber-music-fullstack-deploy.vercel.app/)

---

*Last Updated: January 2024*
