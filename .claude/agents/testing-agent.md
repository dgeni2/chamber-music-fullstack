# Testing Agent

## Purpose
Specialized agent for testing the HarmonyForge application across all layers.

## Responsibilities
- Unit testing music theory functions
- Integration testing API endpoints
- End-to-end workflow testing
- Performance testing and benchmarking
- Regression testing
- Test data generation

## Testing Strategy

### Test Pyramid
```
        /\
       /E2E\          Few, slow, high-value
      /------\
     /Integr-\       Moderate, API + DB
    /----------\
   /   Unit     \    Many, fast, isolated
  /--------------\
```

## Backend Testing

### 1. Music Theory Unit Tests

#### Test Chord Quality Selection
```javascript
// Test file: backend/tests/music-theory.test.js

function testChordQuality() {
  // Major key chord qualities
  assert.equal(getChordQuality(0, true), "major");   // I
  assert.equal(getChordQuality(1, true), "minor");   // ii
  assert.equal(getChordQuality(2, true), "minor");   // iii
  assert.equal(getChordQuality(3, true), "major");   // IV
  assert.equal(getChordQuality(4, true), "major");   // V
  assert.equal(getChordQuality(5, true), "minor");   // vi
  assert.equal(getChordQuality(6, true), "diminished"); // vii°

  // Minor key chord qualities
  assert.equal(getChordQuality(0, false), "minor");  // i
  assert.equal(getChordQuality(1, false), "diminished"); // ii°
  assert.equal(getChordQuality(2, false), "major");  // III

  console.log("✓ Chord quality tests passed");
}
```

#### Test MIDI Conversion
```javascript
function testMidiConversion() {
  // stepToMidi tests
  assert.equal(stepToMidi("C", 4, 0), 60);  // Middle C
  assert.equal(stepToMidi("A", 4, 0), 69);  // A440
  assert.equal(stepToMidi("C", 4, 1), 61);  // C# (sharp)
  assert.equal(stepToMidi("D", 4, -1), 61); // Db (flat)

  // midiToStep tests
  const c4 = midiToStep(60);
  assert.equal(c4.step, "C");
  assert.equal(c4.octave, 4);
  assert.equal(c4.alter, 0);

  const cSharp4 = midiToStep(61);
  assert.equal(cSharp4.step, "C");
  assert.equal(cSharp4.alter, 1);

  console.log("✓ MIDI conversion tests passed");
}
```

#### Test Key Information
```javascript
function testKeyInfo() {
  // C major (0 sharps/flats)
  const cMajor = getKeyInfo(0, "major");
  assert.equal(cMajor.root, 0); // C
  assert.deepEqual(cMajor.scale, [0, 2, 4, 5, 7, 9, 11]);

  // G major (1 sharp)
  const gMajor = getKeyInfo(1, "major");
  assert.equal(gMajor.root, 7); // G

  // F major (1 flat)
  const fMajor = getKeyInfo(-1, "major");
  assert.equal(fMajor.root, 5); // F

  // A minor (0 sharps/flats)
  const aMinor = getKeyInfo(0, "minor");
  assert.equal(aMinor.root, 0); // A
  assert.deepEqual(aMinor.scale, [0, 2, 3, 5, 7, 8, 10]);

  console.log("✓ Key information tests passed");
}
```

#### Test Voice Leading
```javascript
function testVoiceLeading() {
  const context = {
    previousChord: {
      voices: [72, 65, 60, 48] // C major: C5, F4, C4, C3
    },
    previousMelody: 72,
    measurePosition: 0,
    phrasePosition: 0,
    instrumentVariation: 0
  };

  // Test smooth voice leading to G major
  const gMajorVoices = voiceChord(
    71,  // B4 (melody)
    7,   // G (root)
    11,  // B (third)
    2,   // D (fifth)
    2,   // second inversion (D in bass)
    context
  );

  // Verify no large leaps (except bass)
  const altoInterval = Math.abs(gMajorVoices[1] - context.previousChord.voices[1]);
  const tenorInterval = Math.abs(gMajorVoices[2] - context.previousChord.voices[2]);

  assert(altoInterval <= 7, `Alto leap too large: ${altoInterval}`);
  assert(tenorInterval <= 7, `Tenor leap too large: ${tenorInterval}`);

  console.log("✓ Voice leading tests passed");
}
```

#### Test Parallel Motion Detection
```javascript
function testParallelMotionAvoidance() {
  const currentVoices = [72, 65, 60, 48];  // C5, F4, C4, C3
  const previousVoices = [71, 64, 59, 47]; // B4, E4, B3, B2

  // This creates parallel fifths (B->C with E->F)
  const chordTones = [0, 4, 7]; // C major

  const adjusted = avoidParallelMotion(currentVoices, previousVoices, chordTones);

  // Verify no parallel fifths or octaves
  for (let i = 0; i < adjusted.length; i++) {
    for (let j = i + 1; j < adjusted.length; j++) {
      const currInterval = Math.abs(adjusted[i] - adjusted[j]) % 12;
      const prevInterval = Math.abs(previousVoices[i] - previousVoices[j]) % 12;

      if ((currInterval === 7 || currInterval === 0) && currInterval === prevInterval) {
        const currMotion = adjusted[i] - previousVoices[i];
        const otherMotion = adjusted[j] - previousVoices[j];

        // Similar motion with perfect interval = parallel motion
        assert(
          !((currMotion > 0 && otherMotion > 0) || (currMotion < 0 && otherMotion < 0)),
          `Parallel ${currInterval === 7 ? 'fifth' : 'octave'} detected`
        );
      }
    }
  }

  console.log("✓ Parallel motion avoidance tests passed");
}
```

### 2. Harmonization Integration Tests

#### Test Simple Melody Harmonization
```javascript
async function testSimpleMelodyHarmonization() {
  const simpleMelody = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>1</duration>
      </note>
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>1</duration>
      </note>
      <note>
        <pitch><step>E</step><octave>5</octave></pitch>
        <duration>1</duration>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>1</duration>
      </note>
    </measure>
  </part>
</score-partwise>`;

  const result = await harmonizeMelody(simpleMelody, ["Violin", "Viola"]);

  // Verify structure
  assert(result.harmonyOnlyXML, "harmonyOnlyXML should exist");
  assert(result.combinedXML, "combinedXML should exist");

  // Verify valid XML
  assert(result.harmonyOnlyXML.includes('<?xml version="1.0"'), "Should be valid XML");
  assert(result.harmonyOnlyXML.includes('<score-partwise'), "Should be MusicXML");

  // Verify parts exist
  assert(result.harmonyOnlyXML.includes('<part-name>Violin</part-name>'), "Violin part missing");
  assert(result.harmonyOnlyXML.includes('<part-name>Viola</part-name>'), "Viola part missing");

  console.log("✓ Simple melody harmonization test passed");
}
```

#### Test All Instruments
```javascript
async function testAllInstruments() {
  const instruments = [
    "Violin", "Viola", "Cello",
    "Flute", "Oboe", "B-flat Clarinet", "Bassoon",
    "B-flat Trumpet", "F Horn", "Tuba",
    "Soprano", "Tenor Voice"
  ];

  const testMelody = createTestMelodyXML(); // Helper function

  for (const instrument of instruments) {
    const result = await harmonizeMelody(testMelody, [instrument]);

    assert(result.harmonyOnlyXML.includes(`<part-name>${instrument}</part-name>`),
      `${instrument} part not found`);

    console.log(`✓ ${instrument} harmonization passed`);
  }
}
```

#### Test Transposing Instruments
```javascript
async function testTransposingInstruments() {
  const concertCMelody = createMelodyWithPitch(60); // C4

  // B-flat Clarinet (+2 semitones)
  const clarinetResult = await harmonizeMelody(concertCMelody, ["B-flat Clarinet"]);
  const clarinetXML = clarinetResult.harmonyOnlyXML;

  // Verify written pitch is D (2 semitones up from C)
  assert(clarinetXML.includes('<step>D</step>'), "B-flat Clarinet should write D for concert C");

  // F Horn (+7 semitones)
  const hornResult = await harmonizeMelody(concertCMelody, ["F Horn"]);
  const hornXML = hornResult.harmonyOnlyXML;

  // Verify written pitch is G (7 semitones up from C)
  assert(hornXML.includes('<step>G</step>'), "F Horn should write G for concert C");

  console.log("✓ Transposing instruments test passed");
}
```

### 3. API Endpoint Tests

#### Test POST /api/harmonize
```javascript
async function testHarmonizeEndpoint() {
  const formData = new FormData();
  const testFile = new File(
    [createTestMelodyXML()],
    'test.xml',
    { type: 'application/xml' }
  );

  formData.append('file', testFile);
  formData.append('instruments', 'Violin,Viola,Cello');

  const response = await fetch('http://localhost:3001/api/harmonize', {
    method: 'POST',
    body: formData
  });

  assert.equal(response.status, 200, "Should return 200 OK");

  const data = await response.json();

  // Verify structure
  assert(data.harmonyOnly, "harmonyOnly should exist");
  assert(data.combined, "combined should exist");
  assert(data.metadata, "metadata should exist");

  assert.equal(data.harmonyOnly.filename, 'test_harmony.musicxml');
  assert.equal(data.combined.filename, 'test_combined.musicxml');

  assert.deepEqual(data.metadata.instruments, ['Violin', 'Viola', 'Cello']);
  assert(data.metadata.processingTime > 0, "Processing time should be positive");

  console.log("✓ POST /api/harmonize test passed");
}
```

#### Test Validation Errors
```javascript
async function testValidationErrors() {
  // Test 1: No file
  let response = await fetch('http://localhost:3001/api/harmonize', {
    method: 'POST',
    body: new FormData()
  });

  assert.equal(response.status, 400);
  const data1 = await response.json();
  assert(data1.error.includes('No file'), "Should error on missing file");

  // Test 2: Too many instruments
  const formData = new FormData();
  formData.append('file', new File(['<score-partwise/>'], 'test.xml'));
  formData.append('instruments', 'Violin,Viola,Cello,Flute,Oboe'); // 5 instruments

  response = await fetch('http://localhost:3001/api/harmonize', {
    method: 'POST',
    body: formData
  });

  assert.equal(response.status, 400);
  const data2 = await response.json();
  assert(data2.error.includes('Maximum 4'), "Should error on too many instruments");

  // Test 3: Invalid XML
  const invalidFormData = new FormData();
  invalidFormData.append('file', new File(['not xml'], 'test.xml'));
  invalidFormData.append('instruments', 'Violin');

  response = await fetch('http://localhost:3001/api/harmonize', {
    method: 'POST',
    body: invalidFormData
  });

  assert.equal(response.status, 400);
  const data3 = await response.json();
  assert(data3.error.includes('Invalid MusicXML'), "Should error on invalid XML");

  console.log("✓ Validation error tests passed");
}
```

#### Test Caching
```javascript
async function testCaching() {
  const formData = new FormData();
  formData.append('file', new File([createTestMelodyXML()], 'test.xml'));
  formData.append('instruments', 'Violin');

  // First request
  const start1 = Date.now();
  const response1 = await fetch('http://localhost:3001/api/harmonize', {
    method: 'POST',
    body: formData
  });
  const duration1 = Date.now() - start1;
  const data1 = await response1.json();

  // Second request (should be cached)
  const formData2 = new FormData();
  formData2.append('file', new File([createTestMelodyXML()], 'test.xml'));
  formData2.append('instruments', 'Violin');

  const start2 = Date.now();
  const response2 = await fetch('http://localhost:3001/api/harmonize', {
    method: 'POST',
    body: formData2
  });
  const duration2 = Date.now() - start2;
  const data2 = await response2.json();

  // Cached request should be faster
  assert(duration2 < duration1,
    `Cached request (${duration2}ms) should be faster than first (${duration1}ms)`);

  // Results should be identical
  assert.equal(data1.harmonyOnly.content, data2.harmonyOnly.content,
    "Cached result should match original");

  console.log("✓ Caching test passed");
}
```

## Frontend Testing

### 1. Component Unit Tests

#### Test InstrumentSelectionScreen
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstrumentSelectionScreen } from './InstrumentSelectionScreen';

test('instrument selection and deselection', () => {
  const mockFile = new File(['<score-partwise/>'], 'test.xml');
  const mockOnGenerate = jest.fn();

  render(
    <InstrumentSelectionScreen
      uploadedFile={mockFile}
      onGenerate={mockOnGenerate}
      onBack={() => {}}
    />
  );

  // Select Violin
  const violinCard = screen.getByText('Violin');
  fireEvent.click(violinCard);
  expect(violinCard.closest('.instrument-card')).toHaveClass('selected');

  // Select Viola
  const violaCard = screen.getByText('Viola');
  fireEvent.click(violaCard);

  // Deselect Violin
  fireEvent.click(violinCard);
  expect(violinCard.closest('.instrument-card')).not.toHaveClass('selected');

  // Only Viola should be selected
  const selectedCount = screen.getAllByRole('button').filter(
    btn => btn.classList.contains('selected')
  ).length;
  expect(selectedCount).toBe(1);
});

test('maximum 4 instruments enforcement', () => {
  // ... render component

  // Select 4 instruments
  fireEvent.click(screen.getByText('Violin'));
  fireEvent.click(screen.getByText('Viola'));
  fireEvent.click(screen.getByText('Cello'));
  fireEvent.click(screen.getByText('Flute'));

  // Try to select 5th
  fireEvent.click(screen.getByText('Oboe'));

  // Error message should appear
  expect(screen.getByText(/maximum 4/i)).toBeInTheDocument();
});
```

#### Test API Service
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
  expect(result.harmonyOnly.content).toContain('<?xml');
  expect(result.combined).toBeDefined();
  expect(result.metadata).toBeDefined();
  expect(result.metadata.instruments).toEqual(['Violin', 'Viola']);
});

test('API error handling', async () => {
  // Mock fetch to return error
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'No file provided' })
    })
  );

  const mockFile = new File([], 'empty.xml');

  await expect(
    ApiService.harmonize({ file: mockFile, instruments: ['Violin'] })
  ).rejects.toThrow('No file provided');
});
```

### 2. End-to-End Tests

#### Test Complete Workflow
```javascript
// Using Playwright or Cypress

test('complete harmonization workflow', async () => {
  // 1. Navigate to app
  await page.goto('http://localhost:5174');

  // 2. Upload file
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile('test-files/melody.xml');

  // 3. Click Continue
  await page.click('text=Continue');

  // 4. Wait for instrument selection screen
  await page.waitForSelector('text=Select Instruments');

  // 5. Select instruments
  await page.click('text=Violin');
  await page.click('text=Viola');
  await page.click('text=Cello');

  // 6. Generate harmony
  await page.click('text=Generate Harmony');

  // 7. Wait for processing
  await page.waitForSelector('text=Processing', { state: 'hidden' });

  // 8. Verify results screen
  await page.waitForSelector('text=Your Harmonized Music');

  // 9. Download harmony-only
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Harmony Only')
  ]);

  expect(download.suggestedFilename()).toMatch(/_harmony\.musicxml$/);
});
```

## Performance Testing

### 1. Backend Performance Benchmarks
```javascript
async function benchmarkHarmonization() {
  const testCases = [
    { name: 'Small (10 notes)', file: createMelodyWithNotes(10) },
    { name: 'Medium (50 notes)', file: createMelodyWithNotes(50) },
    { name: 'Large (200 notes)', file: createMelodyWithNotes(200) },
  ];

  for (const testCase of testCases) {
    const times = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await harmonizeMelody(testCase.file, ['Violin', 'Viola', 'Cello']);
      times.push(Date.now() - start);
    }

    const avg = times.reduce((a, b) => a + b) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`${testCase.name}: avg=${avg}ms, min=${min}ms, max=${max}ms`);

    // Assert performance requirements
    if (testCase.name.includes('Small')) {
      assert(avg < 100, `Small melody should process in < 100ms, got ${avg}ms`);
    }
  }
}
```

### 2. Cache Performance
```javascript
async function benchmarkCache() {
  const testFile = createTestMelodyXML();

  // Warm up
  await harmonizeMelody(testFile, ['Violin']);

  // Measure cache hit
  const times = [];
  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    await harmonizeMelody(testFile, ['Violin']);
    times.push(Date.now() - start);
  }

  const avg = times.reduce((a, b) => a + b) / times.length;
  console.log(`Cache hit average: ${avg}ms`);

  assert(avg < 10, `Cache hits should be < 10ms, got ${avg}ms`);
}
```

## Test Data Generation

### Create Test MusicXML Files
```javascript
function createMelodyWithNotes(count) {
  const notes = [];
  const pitches = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale

  for (let i = 0; i < count; i++) {
    const pitch = pitches[i % pitches.length];
    const { step, octave, alter } = midiToStep(pitch);

    notes.push(`
      <note>
        <pitch>
          <step>${step}</step>
          ${alter !== 0 ? `<alter>${alter}</alter>` : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>1</duration>
      </note>
    `);
  }

  return `<?xml version="1.0"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Test</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      ${notes.join('\n')}
    </measure>
  </part>
</score-partwise>`;
}
```

## Running Tests

### Backend Tests
```bash
cd backend
node tests/run-all-tests.js
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
# Start servers
npm run dev &
cd backend && npm run dev &

# Run tests
npx playwright test
```
