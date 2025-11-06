# Chamber Music Harmonization App

A full-stack web application that automatically generates harmonized sheet music for chamber ensembles. Upload a melody in MusicXML format, select your instruments, and get professionally harmonized parts instantly.

## 🎵 Features

- **Smart Harmonization**: AI-powered music theory engine that creates appropriate harmony parts
- **Multi-Instrument Support**: Generate parts for Alto, Tenor, and Bass instruments
- **Style Customization**: Choose from Classical, Jazz, Pop, Rock, Blues, and Folk styles
- **Difficulty Levels**: Beginner, Intermediate, Advanced, and Expert options
- **MusicXML Export**: Download your harmonized sheet music in standard MusicXML format
- **Real-time Preview**: View your harmonized music before exporting
- **Modern UI**: Beautiful, responsive interface with smooth animations

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/spatel54/chamber-music-fullstack.git
cd chamber-music-fullstack
```

2. Install dependencies for both frontend and backend:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Create the uploads directory:
```bash
mkdir -p backend/uploads
```

### Running the Application

#### Quick Start (Both servers)
From the root directory:
```bash
./start-server.sh
```

#### Or run individually:

**Frontend** (Development server on port 5173):
```bash
cd frontend
npm run dev
```

**Backend** (API server on port 3001):
```bash
cd backend
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
chamber-music/
├── frontend/              # React + Vite frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client services
│   │   ├── config/       # Design tokens and configuration
│   │   └── styles/       # Global styles
│   └── build/           # Production build output
│
├── backend/              # Express.js backend API
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Music processing logic
│   │   ├── middleware/  # Error handling and validation
│   │   └── types/       # TypeScript type definitions
│   └── uploads/         # Temporary file storage
│
├── start-server.sh      # Script to run both servers
└── test-melody.musicxml # Sample MusicXML file for testing
```

## 🎼 How to Use

1. **Upload Your Melody**: 
   - Click the upload zone on the home screen
   - Select a MusicXML file containing your melody
   - The file will be validated automatically

2. **Select Instruments**:
   - Choose the instruments you want in your ensemble
   - Options: Alto, Tenor, Bass

3. **Configure Settings**:
   - Select a musical style
   - Choose difficulty level
   - Click "Generate Harmony"

4. **Review and Export**:
   - Preview the generated harmony
   - Edit parameters if needed (auto-regenerates)
   - Export as MusicXML files

## 🛠️ Technology Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Radix UI** - Accessible UI components

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Multer** - File upload handling
- **xml2js** - XML parsing and generation

## 📝 API Endpoints

### POST `/api/harmonize`
Generate harmonized music from uploaded MusicXML file.

**Request:**
- `file`: MusicXML file (multipart/form-data)
- `instruments`: Array of instrument types
- `style`: Musical style
- `difficulty`: Difficulty level

**Response:**
```json
{
  "harmonyOnly": {
    "content": "<?xml version='1.0'?>...",
    "filename": "harmony.musicxml"
  },
  "combined": {
    "content": "<?xml version='1.0'?>...",
    "filename": "combined.musicxml"
  }
}
```

## 🎨 Design System

The application uses a comprehensive design system with:
- Custom color tokens
- Typography scale
- Spacing system
- Component library

See `/frontend/docs/` and `/backend/docs/` for detailed design documentation.

## 🧪 Testing

Test with the included sample file:
```bash
# Use the included test-melody.musicxml file in the root directory
```

## 🚢 Production Build

### Frontend
```bash
cd frontend
npm run build
```
Builds to `frontend/build/` directory.

### Backend
```bash
cd backend
npm run build
```

## 📄 License

This project is part of an academic/personal project.

## 👤 Author

**Shiv Patel**
- GitHub: [@spatel54](https://github.com/spatel54)

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 🐛 Known Issues

- Sheet music preview is currently a placeholder
- Real-time collaboration features pending
- Mobile optimization in progress

## 🔮 Future Enhancements

- [ ] Real sheet music rendering in preview
- [ ] Audio playback of generated harmonies
- [ ] User authentication and project saving
- [ ] Cloud storage integration
- [ ] MIDI file support
- [ ] More instrument types
- [ ] Collaborative editing
- [ ] Advanced music theory options

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Made with ❤️ and 🎵 by Shiv Patel
