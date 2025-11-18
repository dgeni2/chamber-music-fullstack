# Frontend Agent

## Purpose
Specialized agent for working with the React + Vite frontend application.

## Responsibilities
- UI/UX component development
- State management
- API integration via ApiService
- Form handling and validation
- File upload functionality
- Results display and MusicXML rendering

## Key Files
- `frontend/src/components/InstrumentSelectionScreen.tsx` - Main selection UI
- `frontend/src/components/ResultsScreen.tsx` - Display harmonization results
- `frontend/src/services/api.ts` - Backend API communication
- `frontend/src/components/ui/` - Reusable shadcn/ui components
- `frontend/.env.local` - Environment configuration

## Common Tasks

### 1. Adding New Instruments to UI
Update instrument list in `InstrumentSelectionScreen.tsx`:

```typescript
// Lines ~229, 246, 269
const INSTRUMENTS = [
  // Strings
  { name: 'Violin', category: 'Strings', image: '/violin.svg' },
  { name: 'Viola', category: 'Strings', image: '/viola.svg' },

  // NEW INSTRUMENT
  { name: 'Alto Saxophone', category: 'Woodwinds', image: '/sax.svg' },
];
```

Also update `ResultsScreen.tsx`:
```typescript
const INSTRUMENTS_OPTIONS = [
  'Violin', 'Viola', 'Cello',
  'Flute', 'Oboe', 'B-flat Clarinet', 'Bassoon',
  'B-flat Trumpet', 'F Horn', 'Tuba',
  'Soprano', 'Tenor Voice',
  'Alto Saxophone'  // NEW
];
```

**CRITICAL**: Instrument names must match backend `INSTRUMENT_CONFIG` exactly!

### 2. Updating API Service
Modify `frontend/src/services/api.ts` for API changes:

```typescript
export interface HarmonizeParams {
  file: File;
  instruments: string[];
  // Add new parameters here
}

export class ApiService {
  static async harmonize(params: HarmonizeParams): Promise<HarmonizeResponse> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('instruments', params.instruments.join(','));
    // Add new form fields here

    const response = await fetch(`${API_BASE_URL}/api/harmonize`, {
      method: 'POST',
      body: formData,
    });

    return await response.json();
  }
}
```

### 3. Form Validation
Add validation in `InstrumentSelectionScreen.tsx`:

```typescript
const handleGenerate = async () => {
  // Validate file
  if (!uploadedFile) {
    setError('Please upload a MusicXML file');
    return;
  }

  // Validate instruments (1-4 required)
  if (selectedInstruments.length === 0) {
    setError('Please select at least one instrument');
    return;
  }

  if (selectedInstruments.length > 4) {
    setError('Maximum 4 instruments allowed');
    return;
  }

  // Call API
  try {
    const result = await ApiService.harmonize({
      file: uploadedFile,
      instruments: selectedInstruments
    });
    onGenerate(result);
  } catch (err) {
    setError(err.message);
  }
};
```

### 4. Error Handling
Display user-friendly error messages:

```typescript
try {
  const result = await ApiService.harmonize(params);
} catch (err) {
  if (err instanceof Error) {
    if (err.message.includes('Cannot connect to backend')) {
      setError('Backend server is not running. Please start it with "cd backend && npm run dev"');
    } else if (err.message.includes('timeout')) {
      setError('Processing timeout. Try a simpler melody.');
    } else {
      setError(err.message);
    }
  }
}
```

### 5. Loading States
Show processing status:

```typescript
const [isGenerating, setIsGenerating] = useState(false);

const handleGenerate = async () => {
  setIsGenerating(true);
  setError(null);

  try {
    const result = await ApiService.harmonize(params);
    onGenerate(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsGenerating(false);
  }
};

// In JSX
<button disabled={isGenerating}>
  {isGenerating ? 'Generating...' : 'Generate Harmony'}
</button>
```

## UI/UX Guidelines

### 1. Color Scheme
```css
--background: #f8f3eb;  /* Cream background */
--primary: #e76d57;     /* Coral accent */
--text: #201315;        /* Dark text */
```

### 2. Typography
- Headings: Figtree font family
- Body: SF Pro Rounded
- Code: Monospace

### 3. Responsive Design
Use Tailwind breakpoints:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### 4. Animations
Use Tailwind transitions:
```tsx
<button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
  Click me
</button>
```

## Component Structure

### shadcn/ui Components
Reusable UI primitives in `frontend/src/components/ui/`:
- `button.tsx` - Button component
- `card.tsx` - Card container
- `dialog.tsx` - Modal dialogs
- `progress.tsx` - Progress bars
- `toast.tsx` - Notifications

### Custom Components
Application-specific components:
- `InstrumentSelectionScreen.tsx` - Main instrument selector
- `ResultsScreen.tsx` - Show harmonization output
- `ProcessingScreen.tsx` - Loading animations
- `HomeScreen.tsx` - Landing page with file upload

## State Management

### Local State (useState)
For component-specific data:
```typescript
const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
const [error, setError] = useState<string | null>(null);
```

### Props Drilling
Pass data through component hierarchy:
```typescript
interface InstrumentSelectionProps {
  uploadedFile: File;
  onGenerate: (result: HarmonizeResponse) => void;
  onBack: () => void;
}
```

### Context (if needed)
For global state like theme or user preferences:
```typescript
import { createContext, useContext } from 'react';

const ThemeContext = createContext({ theme: 'light' });
```

## File Upload

### Drag and Drop
```typescript
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];

  if (file && (file.name.endsWith('.xml') || file.name.endsWith('.musicxml'))) {
    setUploadedFile(file);
    setError(null);
  } else {
    setError('Please upload a valid MusicXML file (.xml or .musicxml)');
  }
};
```

### File Input
```typescript
<input
  type="file"
  accept=".xml,.musicxml"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  }}
/>
```

## Results Display

### Download Functionality
```typescript
const handleDownload = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
```

### MusicXML Preview
If using OpenSheetMusicDisplay:
```typescript
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

const renderSheet = (xmlContent: string, container: HTMLElement) => {
  const osmd = new OpenSheetMusicDisplay(container);
  osmd.load(xmlContent).then(() => {
    osmd.render();
  });
};
```

## Environment Variables

### .env.local
```bash
VITE_API_URL=http://localhost:3001
```

### Usage in Code
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**Note**: Restart dev server after changing .env.local!

## Debugging Tips

### 1. Check API Connection
```typescript
import { checkApiConnection } from './services/api';

useEffect(() => {
  checkApiConnection().then(isConnected => {
    if (!isConnected) {
      console.error('Backend is not reachable');
    }
  });
}, []);
```

### 2. Log FormData Contents
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('instruments', instruments.join(','));

// Debug logging
for (const [key, value] of formData.entries()) {
  console.log(key, value);
}
```

### 3. Network Tab
- Open DevTools → Network tab
- Filter by "Fetch/XHR"
- Check request payload and response
- Verify CORS headers

### 4. React DevTools
- Install React DevTools extension
- Inspect component props and state
- Track re-renders and performance

## Common Errors

### 1. CORS Issues
```
Access to fetch at 'http://localhost:3001/api/harmonize' from origin
'http://localhost:5174' has been blocked by CORS policy
```

**Solution**: Ensure backend CORS config includes frontend URL:
```javascript
// backend/src/server.js
app.use(cors({
  origin: ['http://localhost:5174']
}));
```

### 2. Environment Variable Not Loaded
```
TypeError: Cannot read property 'VITE_API_URL' of undefined
```

**Solution**:
- Restart dev server
- Check .env.local exists and has correct format
- Verify variable starts with `VITE_`

### 3. File Upload Fails
```
Error: No file provided
```

**Solution**: Check FormData construction:
```typescript
formData.append('file', uploadedFile); // NOT 'files'
```

## Testing

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

test('instrument selection', () => {
  render(<InstrumentSelectionScreen {...props} />);

  const violinCard = screen.getByText('Violin');
  fireEvent.click(violinCard);

  expect(violinCard).toHaveClass('selected');
});
```

### API Testing
```typescript
import { ApiService } from './services/api';

test('harmonize API call', async () => {
  const mockFile = new File(['<score-partwise/>'], 'test.xml', {
    type: 'application/xml'
  });

  const result = await ApiService.harmonize({
    file: mockFile,
    instruments: ['Violin', 'Viola']
  });

  expect(result.harmonyOnly).toBeDefined();
  expect(result.combined).toBeDefined();
});
```
