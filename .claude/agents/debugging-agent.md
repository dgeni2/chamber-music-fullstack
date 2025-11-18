# Debugging Agent

## Purpose
Specialized agent for diagnosing and fixing issues in the HarmonyForge application.

## Responsibilities
- Error diagnosis and root cause analysis
- Performance bottleneck identification
- Integration issue troubleshooting
- Log analysis
- Debug instrumentation
- Production issue investigation

## Common Issues and Solutions

### Backend Issues

#### Issue 1: Port Already in Use
**Symptoms**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Diagnosis**:
```bash
# Find process using port 3001
lsof -ti:3001

# Or more detailed
lsof -i:3001
```

**Solution**:
```bash
# Kill the process
lsof -ti:3001 | xargs kill -9

# Restart backend
npm run dev
```

**Prevention**:
- Use `node --watch` (already configured)
- Properly handle SIGTERM/SIGINT signals
- Use process managers like PM2 in production

#### Issue 2: XML Parsing Failures
**Symptoms**:
```
[abc123] Harmonization error: Cannot read property 'textContent' of null
```

**Diagnosis**:
```javascript
// Add debugging in nextjs-adapter.js
const fifths = querySelector(xmlDoc, "fifths");
console.log("[DEBUG] Fifths element:", fifths);
console.log("[DEBUG] XML structure:", xmlDoc.documentElement.nodeName);

// Check if XML is valid
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
const parseErrors = xmlDoc.getElementsByTagName("parsererror");
if (parseErrors.length > 0) {
  console.error("[DEBUG] XML parse errors:", parseErrors[0].textContent);
}
```

**Solutions**:
- Validate MusicXML structure before processing
- Add null checks for all querySelector calls
- Provide default values
- Return informative error messages

```javascript
const fifths = querySelector(xmlDoc, "fifths")?.textContent || "0";
const mode = querySelector(xmlDoc, "mode")?.textContent || "major";

if (!xmlContent.includes("<score-partwise") && !xmlContent.includes("<score-timewise")) {
  throw new Error("Invalid MusicXML: Missing score-partwise or score-timewise root");
}
```

#### Issue 3: Voice Range Violations
**Symptoms**:
```
[v0] Warning: Voice out of range: 35 not in [40, 60]
```

**Diagnosis**:
```javascript
// Add logging in constrainToInstrumentRange
function constrainToInstrumentRange(pitch, minMidi, maxMidi, previousPitch) {
  console.log(`[DEBUG] Constraining pitch ${pitch} to [${minMidi}, ${maxMidi}]`);

  let adjustedPitch = pitch;
  let adjustmentCount = 0;

  while (adjustedPitch < minMidi) {
    adjustedPitch += 12;
    adjustmentCount++;
  }
  while (adjustedPitch > maxMidi) {
    adjustedPitch -= 12;
    adjustmentCount++;
  }

  if (adjustmentCount > 0) {
    console.log(`[DEBUG] Adjusted ${adjustmentCount} octaves: ${pitch} -> ${adjustedPitch}`);
  }

  return adjustedPitch;
}
```

**Solutions**:
- Verify INSTRUMENT_CONFIG ranges are correct
- Check voice leading logic doesn't force out-of-range notes
- Add emergency fallback to nearest valid octave

#### Issue 4: Infinite Loops in Voice Leading
**Symptoms**:
- Request hangs indefinitely
- High CPU usage
- No response from backend

**Diagnosis**:
```javascript
// Add loop counters
function avoidParallelMotion(currentVoices, previousVoices, chordTones) {
  const adjusted = [...currentVoices];
  let iterationCount = 0;
  const MAX_ITERATIONS = 1000;

  for (let i = 0; i < currentVoices.length; i++) {
    for (let j = i + 1; j < currentVoices.length; j++) {
      if (++iterationCount > MAX_ITERATIONS) {
        console.error("[DEBUG] Infinite loop detected in avoidParallelMotion");
        return adjusted; // Return best effort
      }
      // ... rest of logic
    }
  }

  return adjusted;
}
```

**Solutions**:
- Add iteration limits to all loops
- Add timeout to harmonization process
- Simplify voice leading constraints

#### Issue 5: Memory Leaks in Cache
**Symptoms**:
- Increasing memory usage over time
- Backend slows down after many requests
- Eventually crashes with OOM

**Diagnosis**:
```bash
# Monitor memory usage
node --expose-gc --max-old-space-size=512 src/server.js

# Or use node-inspect
node --inspect src/server.js
# Open chrome://inspect
```

**Solutions**:
```javascript
// Implement proper cache cleanup
function cleanCache() {
  const now = Date.now();
  let removedCount = 0;

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      removedCount++;
    }
  }

  // Enforce size limit
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      cache.delete(key);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`[CACHE] Cleaned ${removedCount} entries, size now: ${cache.size}`);
  }
}

// Call periodically
setInterval(cleanCache, 60000); // Every minute
```

### Frontend Issues

#### Issue 1: CORS Errors
**Symptoms**:
```
Access to fetch at 'http://localhost:3001/api/harmonize' from origin
'http://localhost:5174' has been blocked by CORS policy
```

**Diagnosis**:
```bash
# Check backend CORS config
grep -A 5 "cors" backend/src/server.js

# Test with curl (bypasses CORS)
curl -X POST http://localhost:3001/api/harmonize \
  -F "file=@test.xml" \
  -F "instruments=Violin"
```

**Solutions**:
```javascript
// Backend: Update CORS origins
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',  // Add this
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Frontend: Verify API URL
console.log('API URL:', import.meta.env.VITE_API_URL);
```

#### Issue 2: File Upload Not Working
**Symptoms**:
- Backend receives no file
- `req.file` is undefined
- Error: "No file provided"

**Diagnosis**:
```typescript
// Frontend: Log FormData
const formData = new FormData();
formData.append('file', uploadedFile);
formData.append('instruments', selectedInstruments.join(','));

// Debug FormData
for (const [key, value] of formData.entries()) {
  console.log('[DEBUG] FormData entry:', key, value);
}

const response = await fetch(...);
```

**Solutions**:
```typescript
// 1. Verify file object is valid
if (!uploadedFile || !(uploadedFile instanceof File)) {
  console.error('Invalid file object:', uploadedFile);
  return;
}

// 2. Check file size
if (uploadedFile.size === 0) {
  setError('File is empty');
  return;
}

// 3. Verify MIME type
if (!['application/xml', 'text/xml'].includes(uploadedFile.type)) {
  console.warn('Unexpected MIME type:', uploadedFile.type);
  // Still try to upload (backend validates extension)
}

// 4. DO NOT set Content-Type header
// Let browser set it automatically with boundary
const response = await fetch(url, {
  method: 'POST',
  body: formData,
  // NO: headers: { 'Content-Type': 'multipart/form-data' }
});
```

#### Issue 3: Environment Variables Not Loading
**Symptoms**:
- `import.meta.env.VITE_API_URL` is undefined
- Frontend tries to connect to wrong URL
- 404 errors on API calls

**Diagnosis**:
```typescript
// Add debug logging
console.log('All env vars:', import.meta.env);
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Mode:', import.meta.env.MODE);
```

**Solutions**:
1. **Check file exists**: `frontend/.env.local`
2. **Verify format**:
   ```bash
   # Correct
   VITE_API_URL=http://localhost:3001

   # Wrong (no quotes, no spaces)
   VITE_API_URL = "http://localhost:3001"
   ```
3. **Restart dev server** (required after .env changes)
4. **Clear browser cache** (Ctrl+Shift+R)

#### Issue 4: State Not Updating
**Symptoms**:
- Component doesn't re-render
- useState value doesn't change
- UI out of sync with state

**Diagnosis**:
```typescript
// Add state change logging
const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);

const handleInstrumentClick = (instrument: string) => {
  console.log('[DEBUG] Before:', selectedInstruments);

  setSelectedInstruments(prev => {
    const newState = prev.includes(instrument)
      ? prev.filter(i => i !== instrument)
      : [...prev, instrument];

    console.log('[DEBUG] After:', newState);
    return newState;
  });
};
```

**Solutions**:
```typescript
// 1. Don't mutate state directly
// ❌ Bad
selectedInstruments.push(instrument);
setSelectedInstruments(selectedInstruments);

// ✅ Good
setSelectedInstruments([...selectedInstruments, instrument]);

// 2. Use functional updates for dependent state
// ❌ Bad
setCount(count + 1);

// ✅ Good
setCount(prev => prev + 1);

// 3. Handle async state updates
const handleClick = async () => {
  setLoading(true);
  try {
    await doSomething();
  } finally {
    setLoading(false); // Always runs
  }
};
```

### Integration Issues

#### Issue 1: Instrument Name Mismatch
**Symptoms**:
- Backend uses "Other" instrument config
- Unexpected clefs or ranges in output
- Instruments not found errors

**Diagnosis**:
```bash
# Run instrument verification script
cat > verify-instruments.sh <<'EOF'
#!/bin/bash
echo "=== Frontend Instruments ==="
grep -o "name: '[^']*'" frontend/src/components/InstrumentSelectionScreen.tsx | \
  cut -d"'" -f2 | sort

echo ""
echo "=== Backend Instruments ==="
grep -E '^  "[A-Z]' backend/src/adapters/nextjs-adapter.js | \
  cut -d'"' -f2 | grep -v "Other" | sort
EOF

chmod +x verify-instruments.sh
./verify-instruments.sh
```

**Solutions**:
1. **Find the mismatch**:
   ```bash
   # Show differences
   diff \
     <(grep -o "name: '[^']*'" frontend/src/components/InstrumentSelectionScreen.tsx | cut -d"'" -f2 | sort) \
     <(grep -E '^  "[A-Z]' backend/src/adapters/nextjs-adapter.js | cut -d'"' -f2 | grep -v "Other" | sort)
   ```

2. **Fix frontend** (most common):
   ```typescript
   // Change from:
   { name: 'B♭ Clarinet' }

   // To:
   { name: 'B-flat Clarinet' }
   ```

3. **Or fix backend**:
   ```javascript
   // Change from:
   "Bb Clarinet": { ... }

   // To:
   "B-flat Clarinet": { ... }
   ```

#### Issue 2: Response Format Mismatch
**Symptoms**:
- TypeError: Cannot read property 'content' of undefined
- Frontend expects different structure than backend sends

**Diagnosis**:
```typescript
// Frontend: Log raw response
const response = await fetch(...);
const rawData = await response.text();
console.log('[DEBUG] Raw response:', rawData);

const data = JSON.parse(rawData);
console.log('[DEBUG] Parsed response:', data);
console.log('[DEBUG] Has harmonyOnly?', 'harmonyOnly' in data);
console.log('[DEBUG] Has combined?', 'combined' in data);
```

**Solutions**:
```typescript
// Add runtime validation
function validateHarmonizeResponse(data: any): data is HarmonizeResponse {
  if (!data || typeof data !== 'object') {
    console.error('[VALIDATION] Response is not an object:', data);
    return false;
  }

  if (!data.harmonyOnly || !data.harmonyOnly.content) {
    console.error('[VALIDATION] Missing harmonyOnly.content');
    return false;
  }

  if (!data.combined || !data.combined.content) {
    console.error('[VALIDATION] Missing combined.content');
    return false;
  }

  return true;
}

// Use in API call
const data = await response.json();
if (!validateHarmonizeResponse(data)) {
  throw new Error('Invalid response format from backend');
}
```

## Debug Instrumentation

### Backend Logging
```javascript
// Add structured logging
function log(level, component, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    component,
    message,
    ...data
  };

  if (level === 'ERROR') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Usage
log('INFO', 'harmonize', 'Processing started', {
  instruments: ['Violin', 'Viola'],
  fileSize: 148940
});

log('ERROR', 'voice-leading', 'Range violation', {
  pitch: 35,
  minMidi: 40,
  maxMidi: 60
});
```

### Frontend Logging
```typescript
// Create debug logger
class DebugLogger {
  private enabled = import.meta.env.DEV;

  log(component: string, message: string, data?: any) {
    if (!this.enabled) return;

    console.log(
      `%c[${component}]%c ${message}`,
      'color: #e76d57; font-weight: bold',
      'color: inherit',
      data || ''
    );
  }

  error(component: string, message: string, error?: any) {
    console.error(`[${component}] ${message}`, error);
  }
}

export const logger = new DebugLogger();

// Usage
logger.log('API', 'Sending harmonization request', {
  filename: file.name,
  instruments
});
```

### Performance Profiling
```javascript
// Backend performance tracking
class PerformanceTracker {
  constructor() {
    this.timings = new Map();
  }

  start(label) {
    this.timings.set(label, Date.now());
  }

  end(label) {
    const start = this.timings.get(label);
    if (!start) {
      console.warn(`No start time for ${label}`);
      return;
    }

    const duration = Date.now() - start;
    console.log(`[PERF] ${label}: ${duration}ms`);
    this.timings.delete(label);
    return duration;
  }
}

const perf = new PerformanceTracker();

// Usage
perf.start('harmonization');
const result = await harmonizeMelody(xmlContent, instruments);
perf.end('harmonization');

perf.start('xml-generation');
const xml = createMusicXML(result);
perf.end('xml-generation');
```

## Production Debugging

### Enable Debug Mode
```javascript
// Backend: Add debug endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/cache', (req, res) => {
    res.json({
      size: cache.size,
      keys: Array.from(cache.keys()),
      entries: Array.from(cache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    });
  });

  app.get('/debug/memory', (req, res) => {
    const usage = process.memoryUsage();
    res.json({
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    });
  });
}
```

### Remote Logging
```javascript
// Send errors to logging service
function reportError(error, context) {
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (e.g., Sentry, LogRocket)
    fetch(process.env.ERROR_REPORTING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  } else {
    console.error('Error:', error, 'Context:', context);
  }
}
```

## Debugging Checklist

### Before Starting
- [ ] Can reproduce the issue consistently?
- [ ] Have relevant error messages/logs?
- [ ] Know which component is failing (frontend/backend/integration)?
- [ ] Have test case or sample data?

### Investigation Steps
1. Check browser console (frontend issues)
2. Check backend terminal output (backend issues)
3. Check network tab (integration issues)
4. Add debug logging at failure point
5. Verify data at each step of pipeline
6. Test with minimal example
7. Compare working vs. broken states

### Resolution Steps
1. Identify root cause
2. Implement fix
3. Add test to prevent regression
4. Document issue and solution
5. Remove debug code (if temporary)
