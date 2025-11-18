# HarmonyForge - Chamber Music Harmonization App

A full-stack application for generating classical 4-part harmonies from MusicXML melodies. Built with React + Vite frontend and Express.js backend with sophisticated music theory algorithms.

## 🎵 Features

### Frontend
- **Beautiful UI**: Modern, responsive interface with smooth animations
- **File Upload**: Drag-and-drop interface for MusicXML files
- **Instrument Selection**: Interactive cards for choosing up to 4 instruments from 12 options
- **Real-time Processing**: Live feedback during harmonization
- **Multiple Download Options**: Harmony-only and combined score formats
- **Results Preview**: View and download harmonized compositions

### Backend
- **Classical Voice Leading**: Sophisticated SATB (Soprano, Alto, Tenor, Bass) voice leading
- **12 Instruments Supported**: Strings, woodwinds, brass, and voices
- **Transposing Instruments**: Automatic transposition for B-flat and F instruments
- **Music Theory Engine**: 1,781 lines of harmonization logic
- **Deterministic Output**: Seeded random number generation for consistent results
- **Intelligent Caching**: 30-minute TTL with LRU eviction

## 🎼 Supported Instruments

- **Strings**: Violin, Viola, Cello
- **Woodwinds**: Flute, Oboe, B-flat Clarinet, Bassoon
- **Brass**: B-flat Trumpet, F Horn, Tuba
- **Voices**: Soprano, Tenor Voice

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/spatel54/chamber-music-fullstack.git
cd chamber-music-fullstack
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Running the Application

**Two terminals required:**

**Terminal 1 - Backend** (runs on port 3001):
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend** (runs on port 5174):
```bash
cd frontend
npm run dev
# Or from root: npm run dev
```

Then open [http://localhost:5174](http://localhost:5174) in your browser.

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

**Backend:**
```bash
cd backend
npm start
# No build step required (pure Node.js)
```

## 📁 Project Structure

```
chamber-music-fullstack/
├── frontend/                          # React + Vite frontend
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── InstrumentSelectionScreen.tsx
│   │   │   ├── ResultsScreen.tsx
│   │   │   └── ui/                   # shadcn/ui components
│   │   ├── services/
│   │   │   └── api.ts                # Backend API integration
│   │   └── assets/                   # Images and static files
│   ├── .env.local                    # API URL configuration
│   └── package.json
│
├── backend/                           # Express.js backend
│   ├── src/
│   │   ├── server.js                 # Express server
│   │   ├── routes/
│   │   │   └── harmonize.js          # API routes
│   │   └── adapters/
│   │       └── nextjs-adapter.js     # 1,781-line harmonization engine
│   └── package.json
│
├── backend-export/                    # Reference implementation
│   ├── harmonize.ts                  # Original TypeScript logic
│   ├── README.md
│   └── QUICKSTART.md
│
├── .claude/                           # Claude Code agent system
│   └── agents/
│       ├── backend-agent.md          # Backend development guide
│       ├── frontend-agent.md         # Frontend development guide
│       ├── integration-agent.md      # Integration specialist
│       ├── testing-agent.md          # Testing guide
│       ├── debugging-agent.md        # Troubleshooting guide
│       └── README.md                 # Agent system overview
│
├── CLAUDE.md                          # Claude Code documentation
├── INTEGRATION.md                     # Integration guide
└── README.md                          # This file
```

## 🎨 Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI (shadcn/ui)
- **Icons**: Lucide React
- **Typography**: Figtree, SF Pro Rounded

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4
- **XML Parsing**: @xmldom/xmldom
- **File Upload**: Multer
- **CORS**: cors middleware

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Comprehensive guide for Claude Code development
- **[INTEGRATION.md](INTEGRATION.md)** - Full integration guide with architecture details
- **[.claude/agents/README.md](.claude/agents/README.md)** - Specialized agent system guide
- **[backend-export/README.md](backend-export/README.md)** - Harmonization algorithm details
- **[backend-export/QUICKSTART.md](backend-export/QUICKSTART.md)** - Quick integration reference

## 🎯 Quick Start for Development

### Testing the Backend
```bash
# Start backend
cd backend
npm run dev

# Test with curl
curl -X POST http://localhost:3001/api/harmonize \
  -F "file=@test-melody.musicxml" \
  -F "instruments=Violin,Viola,Cello"
```

### Health Check
```bash
curl http://localhost:3001/health
```

## 🔍 Key Features Detail

### Harmonization Engine
- **Music Theory**: Classical 4-part harmony rules
- **Voice Leading**: Avoids parallel fifths and octaves, ensures smooth voice motion
- **Harmonic Analysis**: Validates progression quality (0-100 score)
- **Automatic Refinement**: Improves low-scoring progressions
- **Polyphonic Support**: Handles both single-voice and multi-voice input

### Caching System
- **Deterministic Output**: Same input always produces same result
- **30-minute TTL**: Automatic cache expiration
- **100-entry Limit**: LRU eviction for memory efficiency
- **Content-based Keys**: Hash of MusicXML content + instruments

### Instrument Support
- **Range Constraints**: Each instrument has proper MIDI range
- **Transposition**: Automatic transposition for B-flat (+2) and F (+7) instruments
- **Clef Assignment**: Correct clef for each instrument (treble/alto/bass)
- **Voice Assignment**: Intelligent mapping to SATB voices

## 🧪 Testing

See [.claude/agents/testing-agent.md](.claude/agents/testing-agent.md) for comprehensive testing guide.

### Run Tests
```bash
# Backend tests
cd backend
node tests/run-all-tests.js

# Frontend tests
cd frontend
npm test
```

## 🐛 Debugging

See [.claude/agents/debugging-agent.md](.claude/agents/debugging-agent.md) for troubleshooting guide.

### Common Issues

**Port already in use:**
```bash
lsof -ti:3001 | xargs kill -9
```

**CORS errors:**
Check `backend/src/server.js` CORS configuration includes your frontend URL.

**Environment variables not loading:**
Restart dev server after changing `.env.local`

## 🤝 Contributing

This project uses a specialized agent system for development. See [.claude/agents/README.md](.claude/agents/README.md) for details on:
- Backend development (harmonization engine, music theory)
- Frontend development (UI components, API integration)
- Integration (instrument sync, CORS, API contracts)
- Testing (unit, integration, E2E)
- Debugging (error diagnosis, performance profiling)

## 📄 License

MIT

## 🙏 Acknowledgments

- Music theory algorithms based on classical harmony principles
- Built with Claude Code (claude.ai/code)
- UI design inspired by modern music notation software
