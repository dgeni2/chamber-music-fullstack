# Quick Start Guide

Get the HarmonyForge backend running in your Next.js project in 5 minutes.

## Prerequisites

- Next.js 14+ application
- Node.js 18+ installed

## Installation Steps

### 1. Copy the API Route

```bash
# In your Next.js project root
mkdir -p app/api/harmonize
cp /path/to/harmonize.ts app/api/harmonize/route.ts
```

### 2. Install Dependencies

```bash
npm install @xmldom/xmldom
```

### 3. Test the API

Start your development server:

```bash
npm run dev
```

The API will be available at: `http://localhost:3000/api/harmonize`

### 4. Make a Test Request

Create a test file `test-harmonize.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Harmonize API</title>
</head>
<body>
    <h1>Harmonize API Test</h1>
    <input type="file" id="fileInput" accept=".xml,.musicxml">
    <button onclick="harmonize()">Harmonize</button>
    <pre id="result"></pre>

    <script>
        async function harmonize() {
            const file = document.getElementById('fileInput').files[0];
            if (!file) {
                alert('Please select a file');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('instruments', 'Violin,Viola,Cello');

            try {
                const response = await fetch('/api/harmonize', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                document.getElementById('result').textContent =
                    JSON.stringify(result, null, 2);

                // Download combined score
                const blob = new Blob([result.combined.content],
                    { type: 'application/xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = result.combined.filename;
                link.click();
            } catch (error) {
                document.getElementById('result').textContent =
                    'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

Place this file in your `public` folder and navigate to `http://localhost:3000/test-harmonize.html`

## Frontend Integration

### Using with React

```typescript
import { useState } from 'react';

export default function HarmonizeForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('instruments', 'Violin,Viola,Cello');

    try {
      const response = await fetch('/api/harmonize', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResult(data);

      // Auto-download combined score
      const blob = new Blob([data.combined.content],
        { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.combined.filename;
      link.click();
    } catch (error) {
      console.error('Harmonization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept=".xml,.musicxml"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button type="submit" disabled={!file || loading}>
        {loading ? 'Processing...' : 'Harmonize'}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  );
}
```

### Using with ApiService (Recommended)

Create `lib/api.ts`:

```typescript
export interface HarmonizeParams {
  file: File;
  instruments: string[];
}

export interface HarmonizeResponse {
  harmonyOnly: {
    content: string;
    filename: string;
  };
  combined: {
    content: string;
    filename: string;
  };
}

export class ApiService {
  static async harmonize(params: HarmonizeParams): Promise<HarmonizeResponse> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('instruments', params.instruments.join(','));

    const response = await fetch('/api/harmonize', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Server error: ${response.status}`);
    }

    return await response.json();
  }
}
```

Usage:

```typescript
import { ApiService } from '@/lib/api';

const result = await ApiService.harmonize({
  file: uploadedFile,
  instruments: ['Violin', 'Viola', 'Cello']
});
```

## Environment Configuration (Optional)

For CORS or custom configuration, update `app/api/harmonize/route.ts`:

```typescript
// Add at the top of the file
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

// In the POST handler, before processing
const origin = request.headers.get('origin');
if (origin && !ALLOWED_ORIGINS.includes(origin)) {
  return NextResponse.json(
    { error: 'CORS not allowed' },
    { status: 403 }
  );
}
```

Then create `.env.local`:

```
ALLOWED_ORIGINS=http://localhost:3000,https://your-production-domain.com
```

## Testing

### Test with cURL

```bash
curl -X POST http://localhost:3000/api/harmonize \
  -F "file=@/path/to/melody.xml" \
  -F "instruments=Violin,Viola,Cello"
```

### Sample MusicXML Files

You can find sample MusicXML files at:
- MuseScore: https://musescore.com/
- Any music notation software (File > Export > MusicXML)

## Troubleshooting

**Port already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

**Module not found: @xmldom/xmldom**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API returns 404**
- Ensure file is at `app/api/harmonize/route.ts` (not `pages/api`)
- Restart dev server after adding the file
- Check Next.js is using App Router (not Pages Router)

## Next Steps

- Read [README.md](./README.md) for detailed API documentation
- Customize instrument ranges in the `INSTRUMENT_RANGES` constant
- Add authentication/rate limiting for production use
- Implement progress tracking for long-running harmonizations

## Support

For issues or questions:
- Check the main README.md
- Review the inline code comments
- Open an issue in the original repository

Happy harmonizing! 🎵
