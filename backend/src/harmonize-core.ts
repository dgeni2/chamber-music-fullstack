import { type NextRequest, NextResponse } from "next/server"
import { DOMParser } from '@xmldom/xmldom'

// Seeded Random Number Generator for deterministic output
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  // Linear Congruential Generator algorithm
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296
    return this.seed / 4294967296
  }

  // Reset to initial seed
  reset(seed: number) {
    this.seed = seed
  }
}

// Simple string hash function to generate seed from content
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Helper functions for xmldom compatibility
function querySelector(element: Document | Element, tagName: string): Element | null {
  const elements = element.getElementsByTagName(tagName)
  return elements.length > 0 ? elements[0] : null
}

function querySelectorAll(element: Document | Element, tagName: string): Element[] {
  const elements = element.getElementsByTagName(tagName)
  return Array.from(elements)
}

// Major scale intervals (in semitones from root)
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]

// SATB Voice Ranges (MIDI pitches)
const SATB_RANGES = {
  soprano: { min: 60, max: 84 }, // C4 to C6
  alto: { min: 55, max: 76 },     // G3 to E5
  tenor: { min: 48, max: 67 },    // C3 to G4
  bass: { min: 40, max: 60 },     // E2 to C4
}

// Harmonic Function Flowchart: Tonic -> Tonic Prolongation -> Predominant -> Dominant -> Tonic
const HARMONIC_FUNCTIONS: Record<string, "tonic" | "predominant" | "dominant" | "tonicProlongation"> = {
  "I": "tonic",
  "I6": "tonicProlongation",
  "I64": "tonicProlongation",
  "iii": "tonicProlongation",
  "vi": "tonicProlongation",
  "ii": "predominant",
  "ii6": "predominant",
  "ii7": "predominant",
  "IV": "predominant",
  "iv": "predominant", // Borrowed
  "VI": "predominant", // Borrowed
  "V": "dominant",
  "V6": "dominant",
  "V7": "dominant",
  "vii°": "dominant",
  "vii°7": "dominant",
}

// Genre-specific rule modifications
const GENRE_RULES: Record<string, {
  allowParallelThirds?: boolean
  preferredProgressions?: string[][]
  tensionTolerance?: number
  nonChordToneFrequency?: number
}> = {
  classical: {
    allowParallelThirds: false,
    preferredProgressions: [["I", "IV", "V", "I"], ["I", "ii", "V", "I"]],
    tensionTolerance: 0.3,
    nonChordToneFrequency: 0.2,
  },
  jazz: {
    allowParallelThirds: true,
    preferredProgressions: [["I", "vi", "ii", "V"], ["I", "iii", "vi", "ii", "V"]],
    tensionTolerance: 0.6,
    nonChordToneFrequency: 0.4,
  },
  contemporary: {
    allowParallelThirds: true,
    preferredProgressions: [["I", "vi", "IV", "V"], ["vi", "IV", "I", "V"]],
    tensionTolerance: 0.5,
    nonChordToneFrequency: 0.3,
  },
  romantic: {
    allowParallelThirds: false,
    preferredProgressions: [["I", "vi", "IV", "V"], ["I", "iii", "vi", "IV"]],
    tensionTolerance: 0.4,
    nonChordToneFrequency: 0.3,
  },
  baroque: {
    allowParallelThirds: false,
    preferredProgressions: [["I", "V", "I"], ["I", "IV", "V", "I"]],
    tensionTolerance: 0.2,
    nonChordToneFrequency: 0.15,
  },
}

interface Note {
  pitch: number
  duration: number
  offset: number
}

interface Chord {
  root: number // MIDI pitch class (0-11)
  quality: "major" | "minor" | "diminished" | "augmented" | "dominant7" | "major7" | "minor7" | "halfDim7" | "dim7"
  inversion: 0 | 1 | 2 | 3 // 0 = root, 1 = first, 2 = second, 3 = third (for 7th chords)
  voices: number[] // MIDI pitches for each voice [soprano, alto, tenor, bass]
  romanNumeral?: string // e.g., "I", "V/V", "iv"
  function?: "tonic" | "predominant" | "dominant" | "tonicProlongation"
  isSecondaryDominant?: boolean
  isBorrowed?: boolean
  isIncomplete?: boolean // For chords missing the fifth
}

interface VoiceLeadingContext {
  previousChord: Chord | null
  previousMelody: number | null
  measurePosition: number
  phrasePosition: number
  instrumentVariation: number
  previousVoices?: number[] // Previous voice pitches for NCT detection
}

interface NCTInfo {
  type: "passing" | "neighbor" | "suspension" | "appoggiatura" | "escape" | "anticipation" | null
  pitch: number
  resolvedTo?: number
}

interface InstrumentConfig {
  clefSign: "G" | "F" | "C"
  clefLine: 2 | 4 | 3
  minMidi: number
  maxMidi: number
  transposition: number // Semitones up for written pitch
}

interface HarmonicAnalysis {
  score: number
  warnings: string[]
  suggestions: string[]
}

// New interfaces for enhanced features
interface HarmonizationOptions {
  tension?: number // 0-1: 0 = very consonant, 1 = very dissonant
  emotion?: number // 0-1: 0 = sad/melancholic, 1 = happy/energetic (tonal tension/emotion parameter)
  genre?: "classical" | "jazz" | "contemporary" | "romantic" | "baroque"
  horizontalFlowWeight?: number // 0-1: weight for horizontal vs vertical rules
  enableCompositionalTechniques?: boolean
  compositionalTechniques?: CompositionalTechnique[]
  barLevelControls?: BarLevelControl[]
  trackLevelControls?: TrackLevelControl[]
  generateAlternatives?: number // Number of alternative solutions to generate
  transparencyMode?: boolean // Enable explainability
  educationalMode?: boolean // Enable educational explanations
  pitchClassSet?: number[] // Hard constraint: only use these pitch classes (0-11)
  scaleConstraint?: boolean // Guarantee all notes conform to scale
  enableInfilling?: boolean // Enable infilling workflow
  infillingRange?: { start: number; end: number } // Range to infill (note indices)
  enableExpressivePerformance?: boolean // Enable dynamics, phrasing, rubato
  semanticSliders?: SemanticSliders // High-level semantic controls
  exampleBasedSteering?: ExampleBasedSteering // Example-based generation
  enableProbeIntervention?: boolean // Enable probe-assisted intervention
  schenkerianAnalysis?: boolean // Enable Schenkerian analysis visualization
  structuralHierarchy?: StructuralHierarchy // Multi-level hierarchical planning
}

interface BarLevelControl {
  barIndex: number // 0-based
  density?: "sparse" | "moderate" | "dense"
  polyphony?: number // Number of simultaneous voices
  rhythmicComplexity?: "simple" | "moderate" | "complex"
  lockedVoices?: number[] // Voice indices to lock (0=soprano, 1=alto, 2=tenor, 3=bass)
  articulation?: "staccato" | "legato" | "tenuto" | "marcato"
  dynamics?: "pp" | "p" | "mp" | "mf" | "f" | "ff"
}

interface TrackLevelControl {
  trackIndex: number // 0-based track/instrument index
  noteDensity?: number // 0-1: density of notes
  polyphonyRate?: number // 0-1: likelihood of multiple simultaneous notes
  rhythmicPattern?: number[] // Array of durations for rhythmic pattern
  articulation?: "staccato" | "legato" | "tenuto" | "marcato"
  dynamics?: "pp" | "p" | "mp" | "mf" | "f" | "ff"
}

interface CompositionalTechnique {
  type: "fragmentation" | "sequence" | "inversion" | "augmentation" | "diminution"
  startIndex: number // Where to apply
  length?: number // Length of motif to transform
  interval?: number // For sequence: transposition interval in semitones
  direction?: "up" | "down" // For sequence
}

interface SemanticSliders {
  conventionalSurprising?: number // 0-1: 0 = conventional, 1 = surprising
  happySad?: number // 0-1: 0 = sad, 1 = happy
  simpleComplex?: number // 0-1: 0 = simple, 1 = complex
  stableUnstable?: number // 0-1: 0 = stable, 1 = unstable
}

interface ExampleBasedSteering {
  exampleXML?: string // Example MusicXML to learn from
  similarity?: number // 0-1: how similar to example
}

interface StructuralHierarchy {
  phrases?: PhraseStructure[]
  sections?: SectionStructure[]
  cadencePlacement?: CadencePlacement[]
}

interface PhraseStructure {
  startIndex: number
  endIndex: number
  type: "antecedent" | "consequent" | "period" | "sentence"
  cadenceType?: "authentic" | "half" | "plagal" | "deceptive"
}

interface SectionStructure {
  startIndex: number
  endIndex: number
  type: "verse" | "chorus" | "bridge" | "development" | "exposition" | "recapitulation"
}

interface CadencePlacement {
  index: number
  type: "authentic" | "half" | "plagal" | "deceptive"
  strength: "strong" | "moderate" | "weak"
}

interface RuleExplanation {
  chordIndex: number
  rule: string
  reason: string
  appliedTo: "chord" | "voice" | "progression"
  voiceIndex?: number
}

interface HarmonizationResult {
  harmonyOnlyXML: string
  combinedXML: string
  explanations?: RuleExplanation[]
  alternatives?: HarmonizationResult[]
  educationalNotes?: string[]
  schenkerianAnalysis?: SchenkerianStructure
  probeReadings?: ProbeReading[]
  structuralAnalysis?: StructuralAnalysis
}

interface SchenkerianStructure {
  foreground: Chord[] // Surface level
  middleground: StructuralChord[] // Intermediate level
  background: StructuralChord[] // Deep structure
  levels: number // Number of hierarchical levels
}

interface StructuralChord {
  function: "tonic" | "dominant" | "predominant" | "prolongation"
  span: { start: number; end: number } // Spans multiple surface chords
  importance: number // 0-1: importance in structure
}

interface ProbeReading {
  concept: "syncopation" | "tonalTension" | "harmonicComplexity" | "voiceLeadingSmoothness"
  value: number // 0-1
  chordIndex: number
  explanation: string
}

interface StructuralAnalysis {
  phrases: PhraseAnalysis[]
  cadences: CadenceAnalysis[]
  form: string // e.g., "AABA", "Sonata", "Binary"
}

interface PhraseAnalysis {
  startIndex: number
  endIndex: number
  type: string
  harmonicFunction: string
}

interface CadenceAnalysis {
  index: number
  type: string
  strength: number
  function: string
}

const INSTRUMENT_CONFIG: Record<string, InstrumentConfig> = {
  // --- Treble Clef (G), Concert Pitch, High Range ---
  Violin: { clefSign: "G", clefLine: 2, minMidi: 55, maxMidi: 96, transposition: 0 },
  Flute: { clefSign: "G", clefLine: 2, minMidi: 60, maxMidi: 99, transposition: 0 },
  Oboe: { clefSign: "G", clefLine: 2, minMidi: 58, maxMidi: 94, transposition: 0 },

  // --- Bass Clef (F), Concert Pitch, Low Range ---
  Cello: { clefSign: "F", clefLine: 4, minMidi: 36, maxMidi: 80, transposition: 0 },
  Tuba: { clefSign: "F", clefLine: 4, minMidi: 21, maxMidi: 53, transposition: 0 },
  Bassoon: { clefSign: "F", clefLine: 4, minMidi: 34, maxMidi: 74, transposition: 0 },

  // --- Alto Clef (C), Concert Pitch, Mid-Range ---
  Viola: { clefSign: "C", clefLine: 3, minMidi: 48, maxMidi: 77, transposition: 0 },

  // --- Treble Clef (G), Transposing Instruments ---
  "B-flat Clarinet": { clefSign: "G", clefLine: 2, minMidi: 53, maxMidi: 98, transposition: 2 },
  "B-flat Trumpet": { clefSign: "G", clefLine: 2, minMidi: 53, maxMidi: 86, transposition: 2 },
  "F Horn": { clefSign: "G", clefLine: 2, minMidi: 41, maxMidi: 84, transposition: 7 },

  // --- Voices ---
  Soprano: { clefSign: "G", clefLine: 2, minMidi: 60, maxMidi: 84, transposition: 0 },
  "Tenor Voice": { clefSign: "G", clefLine: 2, minMidi: 48, maxMidi: 67, transposition: 12 },

  // --- Default ---
  Other: { clefSign: "G", clefLine: 2, minMidi: 40, maxMidi: 84, transposition: 0 },
}

// Simple in-memory cache for consistent outputs
interface CacheEntry {
  result: { harmonyOnlyXML: string; combinedXML: string }
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes
const MAX_CACHE_SIZE = 100

// Clean up old cache entries periodically
function cleanCache() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key)
    }
  }

  // If cache is still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE)
    for (const [key] of toRemove) {
      cache.delete(key)
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let requestId = Math.random().toString(36).substring(7)

  try {
    console.log(`[${requestId}] Processing harmonization request`)

    const formData = await request.formData()
    const file = formData.get("file") as File
    const instrumentsStr = (formData.get("instruments") as string) || "Violin"
    const instruments = instrumentsStr.split(",").map((i) => i.trim())
    
    // Parse optional harmonization options
    const options: HarmonizationOptions = {
      tension: formData.get("tension") ? parseFloat(formData.get("tension") as string) : 0.3,
      emotion: formData.get("emotion") ? parseFloat(formData.get("emotion") as string) : undefined,
      genre: (formData.get("genre") as HarmonizationOptions["genre"]) || "classical",
      horizontalFlowWeight: formData.get("horizontalFlowWeight") ? parseFloat(formData.get("horizontalFlowWeight") as string) : 0.5,
      enableCompositionalTechniques: formData.get("enableCompositionalTechniques") === "true",
      generateAlternatives: formData.get("generateAlternatives") ? parseInt(formData.get("generateAlternatives") as string) : 0,
      transparencyMode: formData.get("transparencyMode") === "true",
      educationalMode: formData.get("educationalMode") === "true",
      scaleConstraint: formData.get("scaleConstraint") === "true",
      enableExpressivePerformance: formData.get("enableExpressivePerformance") === "true",
      enableProbeIntervention: formData.get("enableProbeIntervention") === "true",
      schenkerianAnalysis: formData.get("schenkerianAnalysis") === "true",
    }
    
    // Parse pitch class set if provided
    const pitchClassSetStr = formData.get("pitchClassSet")
    if (pitchClassSetStr) {
      try {
        options.pitchClassSet = JSON.parse(pitchClassSetStr as string) as number[]
      } catch (e) {
        console.warn(`[${requestId}] Failed to parse pitchClassSet:`, e)
      }
    }
    
    // Parse semantic sliders if provided
    const semanticSlidersStr = formData.get("semanticSliders")
    if (semanticSlidersStr) {
      try {
        options.semanticSliders = JSON.parse(semanticSlidersStr as string) as SemanticSliders
      } catch (e) {
        console.warn(`[${requestId}] Failed to parse semanticSliders:`, e)
      }
    }
    
    // Parse compositional techniques if provided
    const compositionalTechniquesStr = formData.get("compositionalTechniques")
    if (compositionalTechniquesStr) {
      try {
        options.compositionalTechniques = JSON.parse(compositionalTechniquesStr as string) as CompositionalTechnique[]
      } catch (e) {
        console.warn(`[${requestId}] Failed to parse compositionalTechniques:`, e)
      }
    }
    
    // Parse bar-level controls if provided
    const barControlsStr = formData.get("barLevelControls")
    if (barControlsStr) {
      try {
        options.barLevelControls = JSON.parse(barControlsStr as string) as BarLevelControl[]
      } catch (e) {
        console.warn(`[${requestId}] Failed to parse barLevelControls:`, e)
      }
    }

    // Validation
    if (!file) {
      console.error(`[${requestId}] No file provided`)
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (instruments.length === 0) {
      console.error(`[${requestId}] No instruments specified`)
      return NextResponse.json({ error: "At least one instrument must be specified" }, { status: 400 })
    }

    if (instruments.length > 4) {
      console.error(`[${requestId}] Too many instruments: ${instruments.length}`)
      return NextResponse.json({ error: "Maximum 4 instruments allowed" }, { status: 400 })
    }

    const xmlContent = await file.text()

    // Validate XML content
    if (!xmlContent || xmlContent.trim().length === 0) {
      console.error(`[${requestId}] Empty file content`)
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    if (!xmlContent.includes("<score-partwise") && !xmlContent.includes("<score-timewise")) {
      console.error(`[${requestId}] Invalid MusicXML format`)
      return NextResponse.json({ error: "Invalid MusicXML format. File must be a valid MusicXML document." }, { status: 400 })
    }

    console.log(`[${requestId}] Processing MusicXML (${xmlContent.length} bytes) for instruments:`, instruments)

    // Create cache key from content hash and instruments
    const cacheKey = hashString(xmlContent + instruments.join(',')).toString()

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached) {
      const cacheAge = Date.now() - cached.timestamp
      console.log(`[${requestId}] Cache hit! (age: ${cacheAge}ms)`)

      return NextResponse.json({
        harmonyOnly: {
          content: cached.result.harmonyOnlyXML,
          filename: file.name.replace(/\.(musicxml|xml)$/, "_harmony.musicxml"),
        },
        combined: {
          content: cached.result.combinedXML,
          filename: file.name.replace(/\.(musicxml|xml)$/, "_combined.musicxml"),
        },
      })
    }

    // Process harmonization
    const result = await harmonizeMelody(xmlContent, instruments, options)
    
    // If alternatives requested, generate them
    if (options.generateAlternatives && options.generateAlternatives > 0) {
      const alternatives: HarmonizationResult[] = []
      for (let i = 0; i < options.generateAlternatives; i++) {
        // Create variant seed for each alternative
        const variantSeed = hashString(xmlContent + instruments.join(',') + `alt${i}`)
        const variantRng = new SeededRandom(variantSeed)
        const variantOptions = { ...options, tension: (options.tension || 0.3) + (variantRng.next() - 0.5) * 0.2 }
        const altResult = await harmonizeMelody(xmlContent, instruments, variantOptions, variantRng)
        alternatives.push(altResult)
      }
      result.alternatives = alternatives
    }

    // Store in cache
    cache.set(cacheKey, {
      result: { harmonyOnlyXML: result.harmonyOnlyXML, combinedXML: result.combinedXML },
      timestamp: Date.now(),
    })

    // Clean cache periodically (every 10th request)
    if (Math.random() < 0.1) {
      cleanCache()
    }

    const duration = Date.now() - startTime
    console.log(`[${requestId}] Harmonization completed successfully in ${duration}ms (cached for future requests)`)

    const response: any = {
      harmonyOnly: {
        content: result.harmonyOnlyXML,
        filename: file.name.replace(/\.(musicxml|xml)$/, "_harmony.musicxml"),
      },
      combined: {
        content: result.combinedXML,
        filename: file.name.replace(/\.(musicxml|xml)$/, "_combined.musicxml"),
      },
    }
    
    if (result.explanations && result.explanations.length > 0) {
      response.explanations = result.explanations
    }
    
    if (result.educationalNotes && result.educationalNotes.length > 0) {
      response.educationalNotes = result.educationalNotes
    }
    
    if (result.alternatives && result.alternatives.length > 0) {
      response.alternatives = result.alternatives.map((alt, idx) => ({
        harmonyOnly: {
          content: alt.harmonyOnlyXML,
          filename: file.name.replace(/\.(musicxml|xml)$/, `_harmony_alt${idx + 1}.musicxml`),
        },
        combined: {
          content: alt.combinedXML,
          filename: file.name.replace(/\.(musicxml|xml)$/, `_combined_alt${idx + 1}.musicxml`),
        },
      }))
    }
    
    if (result.probeReadings && result.probeReadings.length > 0) {
      response.probeReadings = result.probeReadings
    }
    
    if (result.schenkerianAnalysis) {
      response.schenkerianAnalysis = result.schenkerianAnalysis
    }
    
    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[${requestId}] Harmonization error after ${duration}ms:`, error)

    // Provide more specific error messages
    let errorMessage = "Harmonization failed"
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("TIMEOUT")) {
        errorMessage = "Processing timeout. The file may be too complex. Please try a simpler melody."
        statusCode = 504
      } else if (error.message.includes("memory") || error.message.includes("ENOMEM")) {
        errorMessage = "Insufficient memory. Please try a smaller file."
        statusCode = 507
      } else if (error.message.includes("parse") || error.message.includes("XML")) {
        errorMessage = "Failed to parse MusicXML file. Please ensure the file is valid."
        statusCode = 422
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: statusCode },
    )
  }
}

// ============================================================================
// ADVANCED FEATURES: HIERARCHICAL STRUCTURAL PLANNING
// ============================================================================

function planStructuralHierarchy(
  melodyNotes: Note[],
  options: HarmonizationOptions,
): StructuralHierarchy {
  const hierarchy: StructuralHierarchy = {
    phrases: [],
    sections: [],
    cadencePlacement: [],
  }

  // Auto-detect phrases if not provided
  if (!options.structuralHierarchy?.phrases) {
    const phraseLength = Math.floor(melodyNotes.length / 4) // Approximate phrase length
    for (let i = 0; i < melodyNotes.length; i += phraseLength) {
      const endIndex = Math.min(i + phraseLength - 1, melodyNotes.length - 1)
      hierarchy.phrases?.push({
        startIndex: i,
        endIndex: endIndex,
        type: (i / phraseLength) % 2 === 0 ? "antecedent" : "consequent",
      })
    }
  } else {
    hierarchy.phrases = options.structuralHierarchy.phrases
  }

  // Plan cadence placement
  if (hierarchy.phrases) {
    hierarchy.cadencePlacement = hierarchy.phrases.map((phrase, idx) => ({
      index: phrase.endIndex,
      type: idx === hierarchy.phrases!.length - 1 ? "authentic" : "half",
      strength: idx === hierarchy.phrases!.length - 1 ? "strong" : "moderate",
    }))
  }

  return hierarchy
}

// ============================================================================
// ADVANCED FEATURES: COMPOSITIONAL TECHNIQUES
// ============================================================================

function applyCompositionalTechniques(
  notes: Note[],
  techniques: CompositionalTechnique[],
  root: number,
  scale: number[],
): Note[] {
  let transformed = [...notes]

  for (const technique of techniques) {
    const start = technique.startIndex
    const length = technique.length || 4
    const end = Math.min(start + length, transformed.length)
    const motif = transformed.slice(start, end)

    switch (technique.type) {
      case "fragmentation":
        // Use first half of motif
        transformed = [
          ...transformed.slice(0, start),
          ...motif.slice(0, Math.ceil(motif.length / 2)),
          ...transformed.slice(end),
        ]
        break

      case "sequence":
        // Transpose motif
        const interval = technique.interval || 2
        const direction = technique.direction === "down" ? -1 : 1
        const sequenced = motif.map((note) => ({
          ...note,
          pitch: note.pitch === -1 ? -1 : note.pitch + direction * interval,
        }))
        transformed = [
          ...transformed.slice(0, end),
          ...sequenced,
          ...transformed.slice(end),
        ]
        break

      case "inversion":
        // Invert around first note
        if (motif.length > 0 && motif[0].pitch !== -1) {
          const pivot = motif[0].pitch
          const inverted = motif.map((note) => ({
            ...note,
            pitch: note.pitch === -1 ? -1 : pivot - (note.pitch - pivot),
          }))
          transformed = [
            ...transformed.slice(0, start),
            ...inverted,
            ...transformed.slice(end),
          ]
        }
        break

      case "augmentation":
        // Double durations
        const augmented = motif.map((note) => ({
          ...note,
          duration: note.duration * 2,
        }))
        transformed = [
          ...transformed.slice(0, start),
          ...augmented,
          ...transformed.slice(end),
        ]
        break

      case "diminution":
        // Halve durations
        const diminished = motif.map((note) => ({
          ...note,
          duration: Math.max(0.5, note.duration / 2),
        }))
        transformed = [
          ...transformed.slice(0, start),
          ...diminished,
          ...transformed.slice(end),
        ]
        break
    }
  }

  return transformed
}

// ============================================================================
// ADVANCED FEATURES: EMOTION/TENSION MODULATION
// ============================================================================

function modulateTonalTension(
  chord: Chord,
  emotion: number,
  root: number,
  scale: number[],
): Chord {
  // Emotion parameter: 0 = sad/melancholic (minor, diminished), 1 = happy/energetic (major, augmented)
  // Tension parameter: 0 = consonant, 1 = dissonant

  if (emotion < 0.3) {
    // Sad: prefer minor, diminished
    if (chord.quality === "major") {
      const minorThird = (chord.root + 3) % 12
      return {
        ...chord,
        quality: "minor",
        voices: chord.voices.map((v) => {
          if (v === -1) return -1
          const pc = v % 12
          if (pc === (chord.root + 4) % 12) {
            // Major third -> minor third
            return v - 1
          }
          return v
        }),
      }
    }
  } else if (emotion > 0.7) {
    // Happy: prefer major, augmented
    if (chord.quality === "minor") {
      const majorThird = (chord.root + 4) % 12
      return {
        ...chord,
        quality: "major",
        voices: chord.voices.map((v) => {
          if (v === -1) return -1
          const pc = v % 12
          if (pc === (chord.root + 3) % 12) {
            // Minor third -> major third
            return v + 1
          }
          return v
        }),
      }
    }
  }

  return chord
}

// ============================================================================
// ADVANCED FEATURES: PITCH-ACCURATE HARMONIC CONSTRAINTS
// ============================================================================

function enforcePitchClassConstraint(
  chord: Chord,
  pitchClassSet: number[],
  scalePitches: number[],
): Chord {
  // Ensure all notes conform to pitch class set or scale
  const constrainedVoices = chord.voices.map((pitch) => {
    if (pitch === -1) return -1

    const pitchClass = pitch % 12

    // Check if pitch class is in allowed set
    if (pitchClassSet.length > 0 && !pitchClassSet.includes(pitchClass)) {
      // Find closest allowed pitch class
      let closest = pitchClassSet[0]
      let minDist = Math.min(
        Math.abs(pitchClass - pitchClassSet[0]),
        Math.abs(pitchClass - (pitchClassSet[0] + 12)),
      )

      for (const allowed of pitchClassSet) {
        const dist = Math.min(
          Math.abs(pitchClass - allowed),
          Math.abs(pitchClass - (allowed + 12)),
        )
        if (dist < minDist) {
          minDist = dist
          closest = allowed
        }
      }

      // Adjust to closest allowed pitch class
      const octave = Math.floor(pitch / 12)
      return octave * 12 + closest
    }

    // If using scale constraint, ensure pitch is in scale
    if (scalePitches.length > 0 && !scalePitches.includes(pitchClass)) {
      // Find closest scale pitch
      let closest = scalePitches[0]
      let minDist = Math.min(
        Math.abs(pitchClass - scalePitches[0]),
        Math.abs(pitchClass - (scalePitches[0] + 12)),
      )

      for (const scalePitch of scalePitches) {
        const dist = Math.min(
          Math.abs(pitchClass - scalePitch),
          Math.abs(pitchClass - (scalePitch + 12)),
        )
        if (dist < minDist) {
          minDist = dist
          closest = scalePitch
        }
      }

      const octave = Math.floor(pitch / 12)
      return octave * 12 + closest
    }

    return pitch
  })

  return { ...chord, voices: constrainedVoices }
}

// ============================================================================
// ADVANCED FEATURES: EXPRESSIVE PERFORMANCE MODELING
// ============================================================================

interface ExpressiveNote extends Note {
  dynamics?: "pp" | "p" | "mp" | "mf" | "f" | "ff"
  articulation?: "staccato" | "legato" | "tenuto" | "marcato"
  rubato?: number // 0-1: amount of tempo variation
}

function addExpressivePerformance(
  notes: Note[],
  options: HarmonizationOptions,
  barControls?: BarLevelControl[],
): ExpressiveNote[] {
  return notes.map((note, index) => {
    const expressive: ExpressiveNote = { ...note }

    // Find bar for this note
    const barIndex = Math.floor(index / 4) // Approximate
    const barControl = barControls?.find((bc) => bc.barIndex === barIndex)

    // Apply dynamics
    if (barControl?.dynamics) {
      expressive.dynamics = barControl.dynamics
    } else if (options.enableExpressivePerformance) {
      // Auto-generate dynamics based on phrase position
      const phrasePos = (index % 16) / 16 // 0-1 within phrase
      if (phrasePos < 0.25) expressive.dynamics = "p"
      else if (phrasePos < 0.75) expressive.dynamics = "mf"
      else expressive.dynamics = "f"
    }

    // Apply articulation
    if (barControl?.articulation) {
      expressive.articulation = barControl.articulation
    } else if (options.enableExpressivePerformance) {
      // Default to legato for smooth voice leading
      expressive.articulation = "legato"
    }

    // Apply rubato (tempo variation)
    if (options.enableExpressivePerformance) {
      const phrasePos = (index % 16) / 16
      // Slight rubato at phrase endings
      if (phrasePos > 0.85) {
        expressive.rubato = 0.1 // Slight ritardando
      }
    }

    return expressive
  })
}

// ============================================================================
// ADVANCED FEATURES: PROBE-ASSISTED INTERVENTION
// ============================================================================

function computeProbeReadings(
  chords: Chord[],
  melodyNotes: Note[],
): ProbeReading[] {
  const readings: ProbeReading[] = []

  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i]
    if (chord.voices[0] === -1) continue

    // Syncopation Index
    if (i > 0 && i < chords.length - 1) {
      const prevDuration = melodyNotes[i - 1]?.duration || 1
      const currDuration = melodyNotes[i]?.duration || 1
      const nextDuration = melodyNotes[i + 1]?.duration || 1
      const syncopation =
        currDuration < prevDuration && currDuration < nextDuration ? 0.7 : 0.2
      readings.push({
        concept: "syncopation",
        value: syncopation,
        chordIndex: i,
        explanation: `Syncopation index: ${syncopation.toFixed(2)}`,
      })
    }

    // Tonal Tension
    const tension = computeTonalTension(chord)
    readings.push({
      concept: "tonalTension",
      value: tension,
      chordIndex: i,
      explanation: `Tonal tension: ${tension.toFixed(2)} (${tension > 0.6 ? "high" : tension > 0.3 ? "moderate" : "low"})`,
    })

    // Harmonic Complexity
    const complexity = computeHarmonicComplexity(chord)
    readings.push({
      concept: "harmonicComplexity",
      value: complexity,
      chordIndex: i,
      explanation: `Harmonic complexity: ${complexity.toFixed(2)}`,
    })

    // Voice Leading Smoothness
    if (i > 0) {
      const smoothness = computeVoiceLeadingSmoothness(chord, chords[i - 1])
      readings.push({
        concept: "voiceLeadingSmoothness",
        value: smoothness,
        chordIndex: i,
        explanation: `Voice leading smoothness: ${smoothness.toFixed(2)}`,
      })
    }
  }

  return readings
}

function computeTonalTension(chord: Chord): number {
  // Higher tension for: diminished, augmented, 7th chords, non-tonic functions
  let tension = 0.3

  if (chord.quality === "diminished" || chord.quality === "augmented") tension += 0.3
  if (chord.quality.includes("7")) tension += 0.2
  if (chord.function === "dominant") tension += 0.2
  if (chord.function === "predominant") tension += 0.1
  if (chord.isSecondaryDominant) tension += 0.1

  return Math.min(1.0, tension)
}

function computeHarmonicComplexity(chord: Chord): number {
  // Complexity based on chord type and extensions
  let complexity = 0.3

  if (chord.quality.includes("7")) complexity += 0.2
  if (chord.inversion > 0) complexity += 0.1
  if (chord.isSecondaryDominant) complexity += 0.2
  if (chord.isBorrowed) complexity += 0.1

  return Math.min(1.0, complexity)
}

function computeVoiceLeadingSmoothness(current: Chord, previous: Chord): number {
  // Measure average voice leading interval
  let totalInterval = 0
  let count = 0

  for (let i = 0; i < 4; i++) {
    if (current.voices[i] !== -1 && previous.voices[i] !== -1) {
      const interval = Math.abs(current.voices[i] - previous.voices[i])
      totalInterval += interval
      count++
    }
  }

  if (count === 0) return 0.5

  const avgInterval = totalInterval / count
  // Smaller intervals = smoother = higher score
  const smoothness = Math.max(0, 1 - avgInterval / 12)

  return smoothness
}

// ============================================================================
// ADVANCED FEATURES: SCHENKERIAN ANALYSIS
// ============================================================================

function performSchenkerianAnalysis(
  chords: Chord[],
  melodyNotes: Note[],
): SchenkerianStructure {
  // Simplified Schenkerian analysis: identify structural chords
  const foreground: Chord[] = chords

  // Middleground: reduce to essential harmonic functions
  const middleground: StructuralChord[] = []
  let currentFunction: "tonic" | "dominant" | "predominant" | "prolongation" | null = null
  let startIndex = 0

  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i]
    if (chord.voices[0] === -1) continue

    const func = chord.function || "tonic"

    if (currentFunction === null) {
      currentFunction = func as any
      startIndex = i
    } else if (func !== currentFunction && func !== "tonicProlongation") {
      // New function starts
      middleground.push({
        function: currentFunction,
        span: { start: startIndex, end: i - 1 },
        importance: 0.7,
      })
      currentFunction = func as any
      startIndex = i
    }
  }

  // Add final function
  if (currentFunction) {
    middleground.push({
      function: currentFunction,
      span: { start: startIndex, end: chords.length - 1 },
      importance: 0.8,
    })
  }

  // Background: further reduction to tonic-dominant-tonic
  const background: StructuralChord[] = []
  const tonicChords = middleground.filter((c) => c.function === "tonic")
  const dominantChords = middleground.filter((c) => c.function === "dominant")

  if (tonicChords.length > 0) {
    background.push({
      function: "tonic",
      span: { start: tonicChords[0].span.start, end: tonicChords[tonicChords.length - 1].span.end },
      importance: 1.0,
    })
  }

  if (dominantChords.length > 0) {
    background.push({
      function: "dominant",
      span: { start: dominantChords[0].span.start, end: dominantChords[dominantChords.length - 1].span.end },
      importance: 0.9,
    })
  }

  return {
    foreground,
    middleground,
    background,
    levels: 3,
  }
}

// ============================================================================
// ADVANCED FEATURES: SEMANTIC SLIDERS
// ============================================================================

function applySemanticSliders(
  chord: Chord,
  sliders: SemanticSliders,
  rng: SeededRandom,
): Chord {
  let modified = { ...chord }

  // Conventional vs Surprising
  if (sliders.conventionalSurprising !== undefined) {
    if (sliders.conventionalSurprising > 0.7) {
      // Surprising: prefer less common progressions, secondary dominants
      if (rng.next() < 0.3) {
        modified.isSecondaryDominant = true
      }
    }
  }

  // Happy vs Sad
  if (sliders.happySad !== undefined) {
    if (sliders.happySad < 0.3 && modified.quality === "major") {
      modified.quality = "minor"
    } else if (sliders.happySad > 0.7 && modified.quality === "minor") {
      modified.quality = "major"
    }
  }

  // Simple vs Complex
  if (sliders.simpleComplex !== undefined) {
    if (sliders.simpleComplex > 0.6 && modified.quality === "major") {
      modified.quality = "dominant7"
    }
  }

  // Stable vs Unstable
  if (sliders.stableUnstable !== undefined) {
    if (sliders.stableUnstable > 0.7) {
      // Unstable: prefer diminished, augmented, 7th chords
      if (modified.quality === "major") {
        modified.quality = "dominant7"
      }
    }
  }

  return modified
}

async function harmonizeMelody(
  xmlContent: string,
  instruments: string[],
  options: HarmonizationOptions = {},
  providedRng?: SeededRandom,
): Promise<HarmonizationResult> {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml")

  const fifths = querySelector(xmlDoc, "fifths")?.textContent || "0"
  const mode = querySelector(xmlDoc, "mode")?.textContent || "major"
  const keyFifths = Number.parseInt(fifths)

  const { root, scale } = getKeyInfo(keyFifths, mode)

  // Create deterministic seed from file content and instruments
  const seed = hashString(xmlContent + instruments.join(','))
  const rng = providedRng || new SeededRandom(seed)
  console.log("[v0] Using deterministic seed:", seed)
  
  // Apply genre-specific rules
  const genreRules = GENRE_RULES[options.genre || "classical"] || GENRE_RULES.classical

  console.log("[v0] Key signature:", { fifths: keyFifths, mode, scale: getScaleNotes(root, scale) })
  console.log("[v0] Target instruments:", instruments)

  const isPolyphonic = detectPolyphony(xmlDoc)
  console.log("[v0] Input type:", isPolyphonic ? "Polyphonic (multiple voices)" : "Monophonic (single voice)")

  const explanations: RuleExplanation[] = []
  const educationalNotes: string[] = []
  
  if (options.educationalMode) {
    educationalNotes.push(`Key: ${getKeyName(root, mode)} (${mode})`)
    educationalNotes.push(`Scale degrees: ${getScaleNotes(root, scale).join(', ')}`)
  }
  
  let result: HarmonizationResult
  if (isPolyphonic) {
    // Handle polyphonic input - generate harmonies from multiple melodic lines
    result = await harmonizePolyphonic(xmlDoc, instruments, root, scale, mode, fifths, rng, options, explanations, educationalNotes)
  } else {
    // Handle monophonic input - existing logic
    result = await harmonizeMonophonic(xmlDoc, instruments, root, scale, mode, fifths, rng, options, explanations, educationalNotes)
  }
  
  if (options.transparencyMode) {
    result.explanations = explanations
  }
  if (options.educationalMode) {
    result.educationalNotes = educationalNotes
  }
  
  return result
}

function getKeyName(root: number, mode: string): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  return `${noteNames[root]} ${mode}`
}

function detectPolyphony(xmlDoc: Document): boolean {
  const parts = querySelectorAll(xmlDoc, "score-part")

  // If there are multiple parts defined, it's polyphonic
  if (parts.length > 1) {
    console.log("[v0] Detected", parts.length, "parts in score")
    return true
  }

  // Check if single part has multiple voices
  const voices = new Set<string>()
  const noteElements = querySelectorAll(xmlDoc, "note")

  noteElements.forEach((noteEl) => {
    const voice = querySelector(noteEl, "voice")?.textContent
    if (voice) {
      voices.add(voice)
    }
  })

  if (voices.size > 1) {
    console.log("[v0] Detected", voices.size, "voices in single part")
    return true
  }

  return false
}

async function harmonizeMonophonic(
  xmlDoc: Document,
  instruments: string[],
  root: number,
  scale: number[],
  mode: string,
  fifths: string,
  rng: SeededRandom,
  options: HarmonizationOptions,
  explanations: RuleExplanation[],
  educationalNotes: string[],
): Promise<HarmonizationResult> {
  let melodyNotes = extractNotes(xmlDoc)
  console.log("[v0] Found", melodyNotes.length, "melody notes")

  // Apply compositional techniques if enabled
  if (options.enableCompositionalTechniques && options.compositionalTechniques) {
    melodyNotes = applyCompositionalTechniques(melodyNotes, options.compositionalTechniques, root, scale)
    if (options.transparencyMode) {
      explanations.push({
        chordIndex: 0,
        rule: "Compositional Techniques",
        reason: `Applied ${options.compositionalTechniques.length} compositional technique(s)`,
        appliedTo: "progression",
      })
    }
  }

  // Plan structural hierarchy
  const structuralHierarchy = planStructuralHierarchy(melodyNotes, options)
  if (options.transparencyMode && structuralHierarchy.phrases) {
    explanations.push({
      chordIndex: 0,
      rule: "Structural Planning",
      reason: `Identified ${structuralHierarchy.phrases.length} phrase(s) with planned cadences`,
      appliedTo: "progression",
    })
  }

  let harmonicProgression = generateHarmonicProgression(
    melodyNotes, 
    root, 
    scale, 
    mode, 
    instruments.length > 1, 
    rng,
    options,
    explanations,
    educationalNotes
  )
  console.log("[v0] Generated", harmonicProgression.length, "chords")

  // Apply emotion/tension modulation
  if (options.emotion !== undefined || options.tension !== undefined) {
    harmonicProgression = harmonicProgression.map((chord) => {
      let modified = chord
      if (options.emotion !== undefined) {
        modified = modulateTonalTension(modified, options.emotion, root, scale)
      }
      return modified
    })
  }

  // Apply pitch-accurate constraints
  const scalePitches = scale.map((interval) => (root + interval) % 12)
  if (options.pitchClassSet || options.scaleConstraint) {
    harmonicProgression = harmonicProgression.map((chord) =>
      enforcePitchClassConstraint(
        chord,
        options.pitchClassSet || [],
        options.scaleConstraint ? scalePitches : [],
      ),
    )
  }

  // Apply semantic sliders
  if (options.semanticSliders) {
    harmonicProgression = harmonicProgression.map((chord) =>
      applySemanticSliders(chord, options.semanticSliders!, rng),
    )
  }

  const analysis = validateHarmonicProgression(harmonicProgression, melodyNotes, root, scale, mode === "major")
  console.log("[v0] Harmonic validation score:", analysis.score)
  if (analysis.warnings.length > 0) {
    console.log("[v0] Validation warnings:", analysis.warnings.slice(0, 5).join("; "))
  }

  if (analysis.score < 70) {
    console.log("[v0] Refinement: Applying harmonic improvements...")
    harmonicProgression = refineHarmonicProgression(harmonicProgression, melodyNotes, root, scale, mode === "major")
  }

  const instrumentVoiceMappings: Record<string, 1 | 2 | 3> = {}
  const voiceOrder: (1 | 2 | 3)[] = [1, 3, 2]
  instruments.forEach((instrument, index) => {
    instrumentVoiceMappings[instrument] = voiceOrder[index % 3]
  })

  const harmoniesByInstrument: Record<string, Note[]> = {}

  for (const instrument of instruments) {
    const assignedVoice = instrumentVoiceMappings[instrument]
    const instrumentConfig = INSTRUMENT_CONFIG[instrument] || INSTRUMENT_CONFIG["Other"]
    console.log(`[v0] Generating ${instrument} as voice ${assignedVoice}...`)

    const instrumentNotes = generateInstrumentPart(harmonicProgression, assignedVoice, instrumentConfig, melodyNotes)
    harmoniesByInstrument[instrument] = instrumentNotes
  }

  // Compute probe readings if enabled
  let probeReadings: ProbeReading[] | undefined
  if (options.enableProbeIntervention) {
    probeReadings = computeProbeReadings(harmonicProgression, melodyNotes)
  }

  // Perform Schenkerian analysis if enabled
  let schenkerianAnalysis: SchenkerianStructure | undefined
  if (options.schenkerianAnalysis) {
    schenkerianAnalysis = performSchenkerianAnalysis(harmonicProgression, melodyNotes)
    if (options.educationalMode) {
      educationalNotes.push(
        `Schenkerian Analysis: ${schenkerianAnalysis.background.length} background level(s), ${schenkerianAnalysis.middleground.length} middleground level(s)`,
      )
    }
  }

  // Add expressive performance if enabled
  let expressiveNotes = melodyNotes
  if (options.enableExpressivePerformance) {
    expressiveNotes = addExpressivePerformance(melodyNotes, options, options.barLevelControls)
  }

  const harmonyOnlyXML = createMultiInstrumentHarmonyXML(xmlDoc, harmoniesByInstrument)
  const combinedXML = createCombinedMultiInstrumentXML(xmlDoc, melodyNotes, harmoniesByInstrument)

  const result: HarmonizationResult = {
    harmonyOnlyXML,
    combinedXML,
    explanations,
    educationalNotes,
  }

  if (probeReadings) result.probeReadings = probeReadings
  if (schenkerianAnalysis) result.schenkerianAnalysis = schenkerianAnalysis

  return result
}

// ============================================================================
// ADVANCED FEATURES: INFILLING WORKFLOW
// ============================================================================

function performInfilling(
  melodyNotes: Note[],
  infillingRange: { start: number; end: number },
  root: number,
  scale: number[],
  mode: string,
  rng: SeededRandom,
  options: HarmonizationOptions,
  explanations: RuleExplanation[],
): Note[] {
  // Infilling: generate notes for a missing segment based on context before and after
  const beforeContext = melodyNotes.slice(Math.max(0, infillingRange.start - 4), infillingRange.start)
  const afterContext = melodyNotes.slice(infillingRange.end, Math.min(melodyNotes.length, infillingRange.end + 4))
  
  const infilled: Note[] = []
  const length = infillingRange.end - infillingRange.start
  
  // Use anticipation: look ahead to afterContext
  // Use context: look back to beforeContext
  for (let i = 0; i < length; i++) {
    const progress = i / length
    
    // Interpolate between before and after contexts
    const beforeNote = beforeContext[beforeContext.length - 1]
    const afterNote = afterContext[0]
    
    if (beforeNote && afterNote && beforeNote.pitch !== -1 && afterNote.pitch !== -1) {
      // Linear interpolation between pitches
      const interpolatedPitch = Math.round(
        beforeNote.pitch * (1 - progress) + afterNote.pitch * progress
      )
      const interpolatedDuration = beforeNote.duration * (1 - progress) + afterNote.duration * progress
      
      infilled.push({
        pitch: interpolatedPitch,
        duration: interpolatedDuration,
        offset: beforeNote.offset + beforeNote.duration + i * interpolatedDuration,
      })
    } else {
      // Fallback: use scale tones
      const scalePitches = scale.map((interval) => (root + interval) % 12)
      const randomScaleDegree = Math.floor(rng.next() * scalePitches.length)
      const octave = Math.floor((beforeNote?.pitch || 60) / 12)
      infilled.push({
        pitch: octave * 12 + scalePitches[randomScaleDegree],
        duration: beforeNote?.duration || 1,
        offset: (beforeNote?.offset || 0) + (beforeNote?.duration || 1) * (i + 1),
      })
    }
  }
  
  if (options.transparencyMode) {
    explanations.push({
      chordIndex: infillingRange.start,
      rule: "Infilling",
      reason: `Generated ${length} notes using anticipation and context from measures ${infillingRange.start} to ${infillingRange.end}`,
      appliedTo: "progression",
    })
  }
  
  // Insert infilled notes
  return [
    ...melodyNotes.slice(0, infillingRange.start),
    ...infilled,
    ...melodyNotes.slice(infillingRange.end),
  ]
}

async function harmonizePolyphonic(
  xmlDoc: Document,
  instruments: string[],
  root: number,
  scale: number[],
  mode: string,
  fifths: string,
  rng: SeededRandom,
  options: HarmonizationOptions,
  explanations: RuleExplanation[],
  educationalNotes: string[],
): Promise<HarmonizationResult> {
  // Extract multiple melodic lines
  let melodicLines = extractNotesPolyphonic(xmlDoc)
  console.log("[v0] Extracted", melodicLines.length, "melodic lines with", melodicLines[0]?.length || 0, "time slices")
  
  // Apply infilling if requested
  if (options.enableInfilling && options.infillingRange) {
    melodicLines = melodicLines.map((line) =>
      performInfilling(line, options.infillingRange!, root, scale, mode, rng, options, explanations)
    )
  }

  // Generate harmonic progression considering all voices
  let harmonicProgression = generateHarmonicProgressionPolyphonic(
    melodicLines,
    root,
    scale,
    mode,
    instruments.length > 1,
    rng,
    options,
    explanations,
    educationalNotes,
  )
  console.log("[v0] Generated", harmonicProgression.length, "polyphonic chords")

  const maxLength = Math.max(...melodicLines.map((line) => line.length))
  const alignedMelodyNotes: Note[] = []

  for (let i = 0; i < maxLength; i++) {
    // Use the first melodic line as reference, or create a rest if it doesn't exist
    if (i < melodicLines[0].length) {
      alignedMelodyNotes.push(melodicLines[0][i])
    } else {
      // Pad with rests if this line is shorter
      const lastNote = melodicLines[0][melodicLines[0].length - 1]
      alignedMelodyNotes.push({
        pitch: -1,
        duration: lastNote?.duration || 1,
        offset: lastNote ? lastNote.offset + lastNote.duration : i,
      })
    }
  }

  // Validate considering all input voices
  const analysis = validateHarmonicProgression(harmonicProgression, alignedMelodyNotes, root, scale, mode === "major")
  console.log("[v0] Polyphonic harmonic validation score:", analysis.score)

  if (analysis.score < 70) {
    console.log("[v0] Refinement: Applying polyphonic harmonic improvements...")
    harmonicProgression = refineHarmonicProgression(
      harmonicProgression,
      alignedMelodyNotes,
      root,
      scale,
      mode === "major",
    )
  }

  // Map instruments to voices
  const instrumentVoiceMappings: Record<string, 1 | 2 | 3> = {}
  const voiceOrder: (1 | 2 | 3)[] = [1, 3, 2]
  instruments.forEach((instrument, index) => {
    instrumentVoiceMappings[instrument] = voiceOrder[index % 3]
  })

  const harmoniesByInstrument: Record<string, Note[]> = {}

  for (const instrument of instruments) {
    const assignedVoice = instrumentVoiceMappings[instrument]
    const instrumentConfig = INSTRUMENT_CONFIG[instrument] || INSTRUMENT_CONFIG["Other"]
    console.log(`[v0] Generating polyphonic ${instrument} as voice ${assignedVoice}...`)

    const instrumentNotes = generateInstrumentPart(
      harmonicProgression,
      assignedVoice,
      instrumentConfig,
      alignedMelodyNotes,
    )
    harmoniesByInstrument[instrument] = instrumentNotes
  }

  // Apply emotion/tension modulation
  if (options.emotion !== undefined || options.tension !== undefined) {
    harmonicProgression = harmonicProgression.map((chord) => {
      let modified = chord
      if (options.emotion !== undefined) {
        modified = modulateTonalTension(modified, options.emotion, root, scale)
      }
      return modified
    })
  }

  // Apply pitch-accurate constraints
  const scalePitches = scale.map((interval) => (root + interval) % 12)
  if (options.pitchClassSet || options.scaleConstraint) {
    harmonicProgression = harmonicProgression.map((chord) =>
      enforcePitchClassConstraint(
        chord,
        options.pitchClassSet || [],
        options.scaleConstraint ? scalePitches : [],
      ),
    )
  }

  // Apply semantic sliders
  if (options.semanticSliders) {
    harmonicProgression = harmonicProgression.map((chord) =>
      applySemanticSliders(chord, options.semanticSliders!, rng),
    )
  }

  // Compute probe readings if enabled
  let probeReadings: ProbeReading[] | undefined
  if (options.enableProbeIntervention) {
    probeReadings = computeProbeReadings(harmonicProgression, alignedMelodyNotes)
  }

  // Perform Schenkerian analysis if enabled
  let schenkerianAnalysis: SchenkerianStructure | undefined
  if (options.schenkerianAnalysis) {
    schenkerianAnalysis = performSchenkerianAnalysis(harmonicProgression, alignedMelodyNotes)
    if (options.educationalMode) {
      educationalNotes.push(
        `Schenkerian Analysis: ${schenkerianAnalysis.background.length} background level(s), ${schenkerianAnalysis.middleground.length} middleground level(s)`,
      )
    }
  }

  const harmonyOnlyXML = createMultiInstrumentHarmonyXML(xmlDoc, harmoniesByInstrument)
  const combinedXML = createCombinedPolyphonicXML(xmlDoc, melodicLines, harmoniesByInstrument, fifths, mode)

  const result: HarmonizationResult = {
    harmonyOnlyXML,
    combinedXML,
    explanations,
    educationalNotes,
  }

  if (probeReadings) result.probeReadings = probeReadings
  if (schenkerianAnalysis) result.schenkerianAnalysis = schenkerianAnalysis

  return result
}

function extractNotesPolyphonic(xmlDoc: Document): Note[][] {
  const parts = querySelectorAll(xmlDoc, "part")

  if (parts.length > 1) {
    // Multiple parts - extract each separately
    const melodicLines: Note[][] = []

    parts.forEach((part) => {
      const notes: Note[] = []
      const measures = querySelectorAll(part, "measure")
      let currentOffset = 0

      measures.forEach((measure) => {
        const noteElements = querySelectorAll(measure, "note")

        noteElements.forEach((noteEl) => {
          const isRest = querySelector(noteEl, "rest") !== null
          const duration = Number.parseFloat(querySelector(noteEl, "duration")?.textContent || "1")

          if (isRest) {
            notes.push({ pitch: -1, duration, offset: currentOffset })
          } else {
            const step = querySelector(noteEl, "step")?.textContent || "C"
            const octave = Number.parseInt(querySelector(noteEl, "octave")?.textContent || "4")
            const alter = Number.parseInt(querySelector(noteEl, "alter")?.textContent || "0")

            const pitch = stepToMidi(step, octave, alter)
            notes.push({ pitch, duration, offset: currentOffset })
          }

          currentOffset += duration
        })
      })

      melodicLines.push(notes)
    })

    return melodicLines
  } else {
    // Single part with multiple voices
    const voiceMap = new Map<string, Note[]>()
    const measures = querySelectorAll(xmlDoc, "measure")
    const voiceOffsets = new Map<string, number>()

    measures.forEach((measure) => {
      const noteElements = querySelectorAll(measure, "note")

      noteElements.forEach((noteEl) => {
        const voiceNum = querySelector(noteEl, "voice")?.textContent || "1"

        if (!voiceMap.has(voiceNum)) {
          voiceMap.set(voiceNum, [])
          voiceOffsets.set(voiceNum, 0)
        }

        const isRest = querySelector(noteEl, "rest") !== null
        const duration = Number.parseFloat(querySelector(noteEl, "duration")?.textContent || "1")
        const currentOffset = voiceOffsets.get(voiceNum) || 0

        if (isRest) {
          voiceMap.get(voiceNum)!.push({ pitch: -1, duration, offset: currentOffset })
        } else {
          const step = querySelector(noteEl, "step")?.textContent || "C"
          const octave = Number.parseInt(querySelector(noteEl, "octave")?.textContent || "4")
          const alter = Number.parseInt(querySelector(noteEl, "alter")?.textContent || "0")

          const pitch = stepToMidi(step, octave, alter)
          voiceMap.get(voiceNum)!.push({ pitch, duration, offset: currentOffset })
        }

        voiceOffsets.set(voiceNum, currentOffset + duration)
      })
    })

    return Array.from(voiceMap.values())
  }
}

function generateHarmonicProgressionPolyphonic(
  melodicLines: Note[][],
  root: number,
  scale: number[],
  mode: string,
  enableVariation: boolean,
  rng: SeededRandom,
  options: HarmonizationOptions = {},
  explanations: RuleExplanation[] = [],
  educationalNotes: string[] = [],
): Chord[] {
  const scalePitches = scale.map((interval) => (root + interval) % 12)
  const chords: Chord[] = []

  // Find the maximum length to align all voices
  const maxLength = Math.max(...melodicLines.map((line) => line.length))

  const context: VoiceLeadingContext = {
    previousChord: null,
    previousMelody: null,
    measurePosition: 0,
    phrasePosition: 0,
    instrumentVariation: enableVariation ? rng.next() : 0,
    previousVoices: undefined,
  }

  for (let i = 0; i < maxLength; i++) {
    // Collect all simultaneous notes at this time slice
    const simultaneousNotes: number[] = []

    for (const line of melodicLines) {
      if (i < line.length && line[i].pitch !== -1) {
        simultaneousNotes.push(line[i].pitch)
      }
    }

    // If all voices are resting, create a rest chord
    if (simultaneousNotes.length === 0) {
      chords.push({
        root: 0,
        quality: "major",
        inversion: 0,
        voices: [-1, -1, -1, -1],
        romanNumeral: "",
      })
      context.measurePosition = (context.measurePosition + 1) % 4
      context.phrasePosition++
      context.previousVoices = undefined
      continue
    }

    // Sort notes from lowest to highest for proper bass identification
    const sortedNotes = [...simultaneousNotes].sort((a, b) => a - b)

    // Analyze the vertical harmony (all simultaneous notes)
    const chord = analyzeVerticalHarmony(
      sortedNotes,
      scalePitches,
      root,
      scale,
      context,
      melodicLines,
      i,
      enableVariation,
      options,
      explanations,
      i,
    )

    chords.push(chord)
    context.previousChord = chord
    context.previousMelody = sortedNotes[sortedNotes.length - 1] // Use highest voice as reference
    context.previousVoices = chord.voices // Store for NCT detection
    context.measurePosition = (context.measurePosition + 1) % 4
    context.phrasePosition++
  }

  return chords
}

function analyzeVerticalHarmony(
  simultaneousNotes: number[],
  scalePitches: number[],
  keyRoot: number,
  scale: number[],
  context: VoiceLeadingContext,
  allMelodicLines: Note[][],
  currentIndex: number,
  enableVariation = false,
  options: HarmonizationOptions = {},
  explanations: RuleExplanation[] = [],
  chordIndex: number = 0,
): Chord {
  // Convert all notes to pitch classes
  const pitchClasses = simultaneousNotes.map((n) => n % 12)
  const sortedNotes = [...simultaneousNotes].sort((a, b) => a - b)
  const bassNote = sortedNotes[0] % 12

  // Detect NCTs (Non-Chord Tones) - check previous notes in each voice
  const nctInfo: NCTInfo[] = []
  if (context.previousVoices && allMelodicLines.length > 0) {
    for (let i = 0; i < simultaneousNotes.length; i++) {
      const currentPitch = simultaneousNotes[i]
      const currentPC = currentPitch % 12

      // Check if this note was in the previous chord (suspension candidate)
      if (context.previousVoices.includes(currentPitch)) {
        // Check if it resolves down by step
        const nextNote = allMelodicLines[i]?.[currentIndex + 1]
        if (nextNote && nextNote.pitch !== -1) {
          const resolution = nextNote.pitch % 12
          const interval = (currentPC - resolution + 12) % 12
          if (interval === 1 || interval === 2) {
            // Suspension resolving down
            nctInfo.push({ type: "suspension", pitch: currentPitch, resolvedTo: nextNote.pitch })
          }
        }
      }
    }
  }

  // Find the most likely chord root by analyzing the pitch classes
  const chordCandidates: Array<{
    root: number
    quality: Chord["quality"]
    score: number
    scaleDegree: number
    isSeventh: boolean
  }> = []

  // Try each scale degree as a potential root, and also check for secondary dominants
  for (let degree = 0; degree < 7; degree++) {
    const potentialRoot = (keyRoot + scale[degree]) % 12

    // Detect chord quality including 7th chords
    const { quality, isSeventh } = detectChordQuality(pitchClasses, potentialRoot, scale === MAJOR_SCALE)

    // Calculate chord tones
    const third = quality === "major" || quality === "major7" || quality === "dominant7" ? 4 : 3
    const fifth = quality === "diminished" || quality === "halfDim7" || quality === "dim7" ? 6 : quality === "augmented" ? 8 : 7
    const seventh = quality === "major7" ? 11 : quality.includes("7") ? 10 : null

    const chordTones = new Set([potentialRoot, (potentialRoot + third) % 12, (potentialRoot + fifth) % 12])
    if (seventh !== null) {
      chordTones.add((potentialRoot + seventh) % 12)
    }

    // Score based on how many input notes match chord tones
    let score = 0
    let nctCount = 0

    for (const pc of pitchClasses) {
      if (chordTones.has(pc)) {
        score += 3 // Strong match for chord tone
      } else if (scalePitches.includes(pc)) {
        // Check if it's a known NCT
        const isNCT = nctInfo.some((nct) => nct.pitch % 12 === pc)
        if (isNCT) {
          score += 1.5 // NCT is acceptable, less penalty
          nctCount++
        } else {
          score += 0.5 // Passing tone or other NCT candidate
        }
      } else {
        score -= 1 // Chromatic tone not in scale
      }
    }

    // Bonus for root in bass
    if (bassNote === potentialRoot) {
      score += 2
    }

    // Bonus for proper chord structure (has third and fifth, or third and seventh for 7th chords)
    const hasThird = pitchClasses.includes((potentialRoot + third) % 12)
    const hasFifth = pitchClasses.includes((potentialRoot + fifth) % 12)
    const hasSeventhTone = seventh !== null && pitchClasses.includes((potentialRoot + seventh) % 12)

    if (isSeventh) {
      if (hasThird && hasSeventhTone) score += 2 // Complete 7th chord structure
      if (!hasFifth) score += 1 // Incomplete 7th chord (missing 5th) is acceptable
    } else {
      if (hasThird && hasFifth) score += 2 // Complete triad
    }

    // Score based on harmonic function
    const tempRomanNumeral = getRomanNumeral(potentialRoot, quality, degree, scale === MAJOR_SCALE, 0)
    const tempChord: Chord = {
      root: potentialRoot,
      quality,
      inversion: 0,
      voices: [],
      romanNumeral: tempRomanNumeral,
    }
    tempChord.function = HARMONIC_FUNCTIONS[tempRomanNumeral] || "tonic"
    const functionScore = scoreHarmonicFunction(tempChord, context.previousChord, scale === MAJOR_SCALE)
    score += functionScore * 0.3 // Weight function score

    chordCandidates.push({ root: potentialRoot, quality, score, scaleDegree: degree, isSeventh })
  }

  // Also check for secondary dominants
  for (let targetDegree = 0; targetDegree < 7; targetDegree++) {
    const targetRoot = (keyRoot + scale[targetDegree]) % 12
    const dominantOfTarget = (targetRoot + 7) % 12

    if (pitchClasses.includes(dominantOfTarget)) {
      const { quality, isSeventh } = detectChordQuality(pitchClasses, dominantOfTarget, scale === MAJOR_SCALE)
      if (quality === "dominant7" || quality === "major") {
        let score = 0
        for (const pc of pitchClasses) {
          if (pc === dominantOfTarget || pc === (dominantOfTarget + 4) % 12 || pc === (dominantOfTarget + 7) % 12) {
            score += 3
          }
        }
        if (bassNote === dominantOfTarget) score += 2

        chordCandidates.push({
          root: dominantOfTarget,
          quality: quality === "major" ? "dominant7" : quality,
          score: score + 10, // Bonus for secondary dominant
          scaleDegree: -1, // Special marker
          isSeventh: isSeventh,
        })
      }
    }
  }

  // Sort by score and select best candidate
  chordCandidates.sort((a, b) => b.score - a.score)
  const bestChord = chordCandidates[0]

  // Determine inversion based on bass note
  const chordThird = (bestChord.root + (bestChord.quality === "major" || bestChord.quality === "major7" || bestChord.quality === "dominant7" ? 4 : 3)) % 12
  const chordFifth = (bestChord.root + (bestChord.quality === "diminished" || bestChord.quality === "halfDim7" || bestChord.quality === "dim7" ? 6 : bestChord.quality === "augmented" ? 8 : 7)) % 12
  const chordSeventh = bestChord.isSeventh
    ? (bestChord.root + (bestChord.quality === "major7" ? 11 : 10)) % 12
    : null

  let inversion: 0 | 1 | 2 | 3 = 0
  if (bassNote === chordThird) {
    inversion = 1
  } else if (bassNote === chordFifth) {
    inversion = 2
  } else if (chordSeventh !== null && bassNote === chordSeventh) {
    inversion = 3
  }

  // Check for incomplete chord (missing fifth, common in V7 -> I)
  const isIncomplete = !pitchClasses.includes(chordFifth) && bestChord.isSeventh

  // Use the highest input note as the soprano (melody)
  const sopranoNote = simultaneousNotes[simultaneousNotes.length - 1]

  // Voice the chord considering the polyphonic context
  const voices = voiceChordPolyphonic(
    sopranoNote,
    bestChord.root,
    chordThird,
    chordFifth,
    inversion,
    context,
    simultaneousNotes,
    bestChord.isSeventh,
    chordSeventh,
    options,
  )

  const romanNumeral = getRomanNumeral(
    bestChord.root,
    bestChord.quality,
    bestChord.scaleDegree >= 0 ? bestChord.scaleDegree : 0,
    scale === MAJOR_SCALE,
    inversion,
  )

  const nextChord = allMelodicLines[0]?.[currentIndex + 1] ? null : null // Will be set later
  const secondaryInfo = isSecondaryDominant(
    {
      root: bestChord.root,
      quality: bestChord.quality,
      inversion,
      voices,
    },
    keyRoot,
    scale,
    nextChord,
  )

  return {
    root: bestChord.root,
    quality: bestChord.quality,
    inversion,
    voices,
    romanNumeral,
    function: HARMONIC_FUNCTIONS[romanNumeral] || "tonic",
    isSecondaryDominant: secondaryInfo.isSecondary,
    isBorrowed: isBorrowedChord(
      {
        root: bestChord.root,
        quality: bestChord.quality,
        inversion,
        voices,
      },
      keyRoot,
      scale,
      scale === MAJOR_SCALE,
    ),
    isIncomplete,
  }
}

function voiceChordPolyphonic(
  melodyPitch: number,
  chordRoot: number,
  chordThird: number,
  chordFifth: number,
  inversion: 0 | 1 | 2 | 3,
  context: VoiceLeadingContext,
  inputNotes: number[],
  isSeventh = false,
  chordSeventh: number | null = null,
  options: HarmonizationOptions = {},
): number[] {
  const soprano = melodyPitch
  const sopranoOctave = Math.floor(soprano / 12)

  // Strict SATB ranges
  const altoMin = SATB_RANGES.alto.min
  const altoMax = SATB_RANGES.alto.max
  const tenorMin = SATB_RANGES.tenor.min
  const tenorMax = SATB_RANGES.tenor.max
  const bassMin = SATB_RANGES.bass.min
  const bassMax = SATB_RANGES.bass.max

  let altoTone: number, tenorTone: number, bassTone: number

  // Try to avoid doubling notes that are already in the input
  const inputPitchClasses = new Set(inputNotes.map((n) => n % 12))
  const chordTones = [chordRoot, chordThird, chordFifth]
  if (chordSeventh !== null) chordTones.push(chordSeventh)

  // Determine doubling based on inversion and chord type
  const doublingStrategy = getDoublingStrategy(inversion, chordRoot, chordThird, chordFifth, isSeventh, chordSeventh)

  // Voice the chord based on inversion
  if (inversion === 0) {
    // Root position: double the root
    bassTone = findClosestPitch(chordRoot, sopranoOctave - 2, bassMin, bassMax)
    const availableForAlto = doublingStrategy.alto || chordThird
    const availableForTenor = doublingStrategy.tenor || chordFifth
    altoTone = findClosestPitch(availableForAlto, sopranoOctave - 1, altoMin, altoMax)
    tenorTone = findClosestPitch(availableForTenor, sopranoOctave - 1, tenorMin, tenorMax)
  } else if (inversion === 1) {
    // First inversion: don't double the bass (third), double root or fifth
    bassTone = findClosestPitch(chordThird, sopranoOctave - 2, bassMin, bassMax)
    const availableForAlto = doublingStrategy.alto || chordFifth
    const availableForTenor = doublingStrategy.tenor || chordRoot
    altoTone = findClosestPitch(availableForAlto, sopranoOctave - 1, altoMin, altoMax)
    tenorTone = findClosestPitch(availableForTenor, sopranoOctave - 1, tenorMin, tenorMax)
  } else if (inversion === 2) {
    // Second inversion: double the bass (fifth)
    bassTone = findClosestPitch(chordFifth, sopranoOctave - 2, bassMin, bassMax)
    const availableForAlto = doublingStrategy.alto || chordRoot
    const availableForTenor = doublingStrategy.tenor || chordThird
    altoTone = findClosestPitch(availableForAlto, sopranoOctave - 1, altoMin, altoMax)
    tenorTone = findClosestPitch(availableForTenor, sopranoOctave - 1, tenorMin, tenorMax)
  } else {
    // Third inversion (7th chords): bass is the seventh
    bassTone = findClosestPitch(chordSeventh!, sopranoOctave - 2, bassMin, bassMax)
    altoTone = findClosestPitch(chordRoot, sopranoOctave - 1, altoMin, altoMax)
    tenorTone = findClosestPitch(chordThird, sopranoOctave - 1, tenorMin, tenorMax)
  }

  // Apply voice leading with strict SATB rules
  if (context.previousChord) {
    const prevVoices = context.previousChord.voices

    // Apply voice leading prioritizing: oblique > contrary/stepwise > small leaps
    altoTone = applyVoiceLeadingToVoice(
      altoTone,
      prevVoices[1],
      chordRoot,
      chordThird,
      chordFifth,
      altoMin,
      altoMax,
      false,
      chordSeventh,
      options,
    )
    tenorTone = applyVoiceLeadingToVoice(
      tenorTone,
      prevVoices[2],
      chordRoot,
      chordThird,
      chordFifth,
      tenorMin,
      tenorMax,
      false,
      chordSeventh,
      options,
    )
    bassTone = applyVoiceLeadingToVoice(
      bassTone,
      prevVoices[3],
      chordRoot,
      chordThird,
      chordFifth,
      bassMin,
      bassMax,
      true,
      chordSeventh,
      options,
    )

    // Handle tendency tones (7th resolving down, leading tone resolving up)
    if (isSeventh && chordSeventh !== null) {
      // 7th of chord should resolve down by step
      const prevBass = prevVoices[3]
      if (prevBass !== -1 && (prevBass % 12) === chordSeventh) {
        // Previous chord had this 7th, resolve it down
        const resolution = (chordSeventh - 1 + 12) % 12
        bassTone = findClosestPitch(resolution, Math.floor(bassTone / 12), bassMin, bassMax)
      }
    }

    // Check for leading tone (7th scale degree) - should resolve up
    const leadingTone = (chordRoot + 11) % 12 // 7th scale degree
    if (
      context.previousChord.root === leadingTone &&
      (context.previousChord.quality === "dominant7" || context.previousChord.quality === "major")
    ) {
      // Previous was V or V7, leading tone should resolve up to tonic
      for (let i = 0; i < prevVoices.length; i++) {
        if (prevVoices[i] !== -1 && (prevVoices[i] % 12) === leadingTone) {
          // This voice had leading tone, should resolve up
          const resolution = chordRoot
          if (i === 0) {
            // Soprano - already handled by melody
          } else if (i === 1) {
            altoTone = findClosestPitch(resolution, Math.floor(altoTone / 12), altoMin, altoMax)
          } else if (i === 2) {
            tenorTone = findClosestPitch(resolution, Math.floor(tenorTone / 12), tenorMin, tenorMax)
          }
        }
      }
    }

    // Check spacing (no interval > octave between adjacent voices)
    const voices = [soprano, altoTone, tenorTone, bassTone]
    const adjustedVoices = enforceSpacing(voices)

    // Avoid parallel motion (P5, P8, direct fifths/octaves)
    const finalVoices = avoidParallelMotion(
      adjustedVoices,
      prevVoices,
      [chordRoot, chordThird, chordFifth, chordSeventh].filter((t) => t !== null) as number[],
    )

    altoTone = finalVoices[1]
    tenorTone = finalVoices[2]
    bassTone = finalVoices[3]
  } else {
    // First chord - just check spacing
    const voices = [soprano, altoTone, tenorTone, bassTone]
    const adjustedVoices = enforceSpacing(voices)
    altoTone = adjustedVoices[1]
    tenorTone = adjustedVoices[2]
    bassTone = adjustedVoices[3]
  }

  return [soprano, altoTone, tenorTone, bassTone]
}

// Get doubling strategy based on inversion and chord type
function getDoublingStrategy(
  inversion: number,
  root: number,
  third: number,
  fifth: number,
  isSeventh: boolean,
  seventh: number | null,
): { alto?: number; tenor?: number } {
  if (isSeventh && seventh !== null) {
    // 7th chords: don't double any tone, use all four chord tones
    return {}
  }

  if (inversion === 0) {
    // Root position: double the root
    return { alto: root, tenor: root }
  } else if (inversion === 1) {
    // First inversion: don't double the bass (third), double root or fifth
    return { alto: root, tenor: fifth }
  } else if (inversion === 2) {
    // Second inversion: double the bass (fifth)
    return { alto: fifth, tenor: fifth }
  }

  return {}
}

// Enforce SATB spacing rules (no interval > octave between adjacent voices)
function enforceSpacing(voices: number[]): number[] {
  const adjusted = [...voices]

  // Check Soprano-Alto spacing
  if (adjusted[0] !== -1 && adjusted[1] !== -1) {
    const interval = adjusted[0] - adjusted[1]
    if (interval > 12) {
      // Too wide, move alto up an octave
      adjusted[1] += 12
    } else if (interval < 0) {
      // Voices crossed, fix
      adjusted[1] = adjusted[0] - 12
    }
  }

  // Check Alto-Tenor spacing
  if (adjusted[1] !== -1 && adjusted[2] !== -1) {
    const interval = adjusted[1] - adjusted[2]
    if (interval > 12) {
      adjusted[2] += 12
    } else if (interval < 0) {
      adjusted[2] = adjusted[1] - 12
    }
  }

  // Check Tenor-Bass spacing
  if (adjusted[2] !== -1 && adjusted[3] !== -1) {
    const interval = adjusted[2] - adjusted[3]
    if (interval > 12) {
      adjusted[3] += 12
    } else if (interval < 0) {
      adjusted[3] = adjusted[2] - 12
    }
  }

  return adjusted
}

function createCombinedPolyphonicXML(
  originalDoc: Document,
  melodicLines: Note[][],
  harmoniesByInstrument: Record<string, Note[]>,
  fifths: string,
  mode: string,
): string {
  const beats = querySelector(originalDoc, "beats")?.textContent || "4"
  const beatType = querySelector(originalDoc, "beat-type")?.textContent || "4"
  const divisions = querySelector(originalDoc, "divisions")?.textContent || "1"

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>`

  // Add original melodic lines
  for (let i = 0; i < melodicLines.length; i++) {
    xml += `
    <score-part id="P${i + 1}">
      <part-name>Original Voice ${i + 1}</part-name>
    </score-part>`
  }

  // Add harmony instruments
  let partId = melodicLines.length + 1
  for (const instrument of Object.keys(harmoniesByInstrument)) {
    xml += `
    <score-part id="P${partId}">
      <part-name>${instrument} (Harmony)</part-name>
    </score-part>`
    partId++
  }

  xml += `
  </part-list>`

  // Add original melodic lines as parts
  for (let i = 0; i < melodicLines.length; i++) {
    xml += createPartXML(
      `P${i + 1}`,
      melodicLines[i],
      fifths,
      mode,
      beats,
      beatType,
      divisions,
      INSTRUMENT_CONFIG["Soprano"],
    )
  }

  // Add harmony parts
  partId = melodicLines.length + 1
  for (const [instrument, notes] of Object.entries(harmoniesByInstrument)) {
    const instrumentConfig = INSTRUMENT_CONFIG[instrument] || INSTRUMENT_CONFIG["Other"]
    xml += createPartXML(`P${partId}`, notes, fifths, mode, beats, beatType, divisions, instrumentConfig)
    partId++
  }

  xml += `
</score-partwise>`

  return xml
}

function generateHarmonicProgression(
  melodyNotes: Note[],
  root: number,
  scale: number[],
  mode: string,
  enableVariation: boolean,
  rng: SeededRandom,
  options: HarmonizationOptions = {},
  explanations: RuleExplanation[] = [],
  educationalNotes: string[] = [],
): Chord[] {
  const scalePitches = scale.map((interval) => (root + interval) % 12)
  const chords: Chord[] = []

  const context: VoiceLeadingContext = {
    previousChord: null,
    previousMelody: null,
    measurePosition: 0,
    phrasePosition: 0,
    instrumentVariation: enableVariation ? rng.next() : 0,
  }

  melodyNotes.forEach((note, index) => {
    // Apply bar-level controls if specified
    const barIndex = Math.floor(index / 4) // Approximate bar index
    const barControl = options.barLevelControls?.find((bc) => bc.barIndex === barIndex)
    
    // Adjust note density based on bar control
    if (barControl?.density === "sparse" && rng.next() > 0.6) {
      // Skip some notes for sparse density
      chords.push({
        root: 0,
        quality: "major",
        inversion: 0,
        voices: [-1, -1, -1, -1],
        romanNumeral: "",
      })
      context.measurePosition = (context.measurePosition + 1) % 4
      context.phrasePosition++
      return
    } else if (barControl?.density === "dense" && index > 0) {
      // Add more chords for dense density (subdivide)
      // This is handled by generating additional chords
    }
    if (note.pitch === -1) {
      chords.push({
        root: 0,
        quality: "major",
        inversion: 0,
        voices: [-1, -1, -1, -1], // Mark as rest
        romanNumeral: "",
      })
      context.measurePosition = (context.measurePosition + 1) % 4
      context.phrasePosition++
      return
    }

    const chord = analyzeAndBuildChord(
      note.pitch,
      scalePitches,
      root,
      scale,
      context,
      melodyNotes,
      index,
      enableVariation,
      rng,
      options,
      explanations,
      index,
    )

    chords.push(chord)
    context.previousChord = chord
    context.previousMelody = note.pitch
    context.measurePosition = (context.measurePosition + 1) % 4
    context.phrasePosition++
  })

  return chords
}

function generateInstrumentPart(
  harmonicProgression: Chord[],
  assignedVoiceIndex: 1 | 2 | 3,
  instrumentConfig: InstrumentConfig,
  melodyNotes: Note[],
): Note[] {
  const instrumentNotes: Note[] = []
  let previousVoicePitch: number | null = null

  harmonicProgression.forEach((chord, index) => {
    const melodyNote = melodyNotes[index]

    if (!melodyNote) {
      console.log(`[v0] Warning: No melody note at index ${index}, skipping`)
      return
    }

    if (chord.voices[0] === -1) {
      instrumentNotes.push({
        pitch: -1,
        duration: melodyNote.duration,
        offset: melodyNote.offset,
      })
      previousVoicePitch = null
      return
    }

    let voicePitch = chord.voices[assignedVoiceIndex]

    voicePitch = constrainToInstrumentRange(
      voicePitch,
      instrumentConfig.minMidi,
      instrumentConfig.maxMidi,
      previousVoicePitch,
    )

    instrumentNotes.push({
      pitch: voicePitch,
      duration: melodyNote.duration,
      offset: melodyNote.offset,
    })

    previousVoicePitch = voicePitch
  })

  return instrumentNotes
}

function constrainToInstrumentRange(
  pitch: number,
  minMidi: number,
  maxMidi: number,
  previousPitch: number | null,
): number {
  let adjustedPitch = pitch

  // First, transpose to fit in range
  while (adjustedPitch < minMidi) adjustedPitch += 12
  while (adjustedPitch > maxMidi) adjustedPitch -= 12

  // If we have a previous pitch, apply voice leading
  if (previousPitch !== null) {
    const interval = Math.abs(adjustedPitch - previousPitch)

    // If leap is too large, find closer octave
    if (interval > 8) {
      const pitchClass = pitch % 12
      const previousOctave = Math.floor(previousPitch / 12)

      let bestPitch = adjustedPitch
      let bestDistance = interval

      // Try adjacent octaves
      for (let octave = previousOctave - 1; octave <= previousOctave + 1; octave++) {
        const candidate = octave * 12 + pitchClass
        if (candidate >= minMidi && candidate <= maxMidi) {
          const distance = Math.abs(candidate - previousPitch)
          if (distance < bestDistance) {
            bestDistance = distance
            bestPitch = candidate
          }
        }
      }

      adjustedPitch = bestPitch
    }
  }

  return adjustedPitch
}

function getScaleNotes(root: number, scale: number[]): string[] {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  return scale.map((interval) => noteNames[(root + interval) % 12])
}

function getKeyInfo(fifths: number, mode: string): { root: number; scale: number[] } {
  const majorRoots = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]
  let root: number
  if (fifths >= 0) {
    root = majorRoots[fifths % 12]
  } else {
    root = majorRoots[(12 + fifths) % 12]
  }

  const scale = mode === "minor" ? MINOR_SCALE : MAJOR_SCALE

  return { root, scale }
}

function extractNotes(xmlDoc: Document): Note[] {
  const notes: Note[] = []
  const measures = querySelectorAll(xmlDoc, "measure")
  let currentOffset = 0

  measures.forEach((measure) => {
    const noteElements = querySelectorAll(measure, "note")

    noteElements.forEach((noteEl) => {
      const isRest = querySelector(noteEl, "rest") !== null
      const duration = Number.parseFloat(querySelector(noteEl, "duration")?.textContent || "1")

      if (isRest) {
        notes.push({ pitch: -1, duration, offset: currentOffset })
      } else {
        const step = querySelector(noteEl, "step")?.textContent || "C"
        const octave = Number.parseInt(querySelector(noteEl, "octave")?.textContent || "4")
        const alter = Number.parseInt(querySelector(noteEl, "alter")?.textContent || "0")

        const pitch = stepToMidi(step, octave, alter)
        notes.push({ pitch, duration, offset: currentOffset })
      }

      currentOffset += duration
    })
  })

  return notes
}

function stepToMidi(step: string, octave: number, alter: number): number {
  const stepValues: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  }
  return (octave + 1) * 12 + (stepValues[step] || 0) + alter
}

function midiToStep(midi: number): { step: string; octave: number; alter: number } {
  const octave = Math.floor(midi / 12) - 1
  const pitchClass = midi % 12

  const steps = [
    { step: "C", alter: 0 },
    { step: "C", alter: 1 },
    { step: "D", alter: 0 },
    { step: "E", alter: -1 },
    { step: "E", alter: 0 },
    { step: "F", alter: 0 },
    { step: "F", alter: 1 },
    { step: "G", alter: 0 },
    { step: "G", alter: 1 },
    { step: "A", alter: 0 },
    { step: "B", alter: -1 },
    { step: "B", alter: 0 },
  ]

  return { ...steps[pitchClass], octave }
}

function analyzeAndBuildChord(
  melodyPitch: number,
  scalePitches: number[],
  keyRoot: number,
  scale: number[],
  context: VoiceLeadingContext,
  allMelodyNotes: Note[],
  currentIndex: number,
  enableVariation = false,
  rng: SeededRandom,
  options: HarmonizationOptions = {},
  explanations: RuleExplanation[] = [],
  chordIndex: number = 0,
): Chord {
  const melodyPitchClass = melodyPitch % 12
  const scaleIndex = scalePitches.indexOf(melodyPitchClass)

  let chordScaleDegree: number
  let chordQuality: Chord["quality"]

  if (scaleIndex === -1) {
    chordScaleDegree = 6
    chordQuality = "diminished"
  } else {
    const isStrongBeat = context.measurePosition % 2 === 0
    const isEndOfPhrase = currentIndex === allMelodyNotes.length - 1 || currentIndex % 8 === 7

    chordScaleDegree = selectChordDegree(
      scaleIndex,
      isStrongBeat,
      isEndOfPhrase,
      context,
      enableVariation ? context.instrumentVariation : 0,
      rng,
      options,
      scale,
    )
    chordQuality = getChordQuality(chordScaleDegree, scale === MAJOR_SCALE)
    
    // Apply tension parameter to chord quality selection
    if (options.tension !== undefined && options.tension > 0.5) {
      // Higher tension: prefer more dissonant chords (diminished, augmented, 7ths)
      if (rng.next() < (options.tension - 0.5) * 2) {
        if (chordQuality === "major" && chordScaleDegree === 6) {
          chordQuality = "diminished"
        } else if (chordScaleDegree === 4) {
          chordQuality = "dominant7"
        }
      }
    }
    
    if (options.transparencyMode && explanations) {
      const romanNumeral = getRomanNumeral((keyRoot + scale[chordScaleDegree]) % 12, chordQuality, chordScaleDegree, scale === MAJOR_SCALE, 0)
      const functionName = HARMONIC_FUNCTIONS[romanNumeral] || "tonic"
      explanations.push({
        chordIndex,
        rule: "Chord Selection",
        reason: `Selected ${romanNumeral} (${functionName} function) based on melody note scale degree ${scaleIndex + 1}. This chord supports the melodic note and follows the harmonic function flow.`,
        appliedTo: "chord",
      })
      
      // Add voice leading explanation
      if (context.previousChord) {
        const prevFunc = context.previousChord.function || "tonic"
        const currFunc = functionName
        explanations.push({
          chordIndex,
          rule: "Harmonic Progression",
          reason: `Progression from ${prevFunc} to ${currFunc} follows classical voice leading principles. ${prevFunc === "dominant" && currFunc === "tonic" ? "This is a strong authentic cadence." : prevFunc === "predominant" && currFunc === "dominant" ? "This prepares the dominant function." : "This maintains harmonic coherence."}`,
          appliedTo: "progression",
        })
      }
    }
  }

  const chordRoot = (keyRoot + scale[chordScaleDegree]) % 12
  const chordThird = (chordRoot + (chordQuality === "major" ? 4 : chordQuality === "minor" ? 3 : 3)) % 12
  const chordFifth = (chordRoot + (chordQuality === "diminished" ? 6 : 7)) % 12

  let inversion: 0 | 1 | 2 = 0
  if (melodyPitchClass === chordThird) {
    inversion = 1
  } else if (melodyPitchClass === chordFifth) {
    inversion = 2
  }

  const voices = voiceChord(melodyPitch, chordRoot, chordThird, chordFifth, inversion, context, options, explanations)

  const romanNumeral = getRomanNumeral(chordRoot, chordQuality, chordScaleDegree, scale === MAJOR_SCALE, inversion)

  return {
    root: chordRoot,
    quality: chordQuality,
    inversion,
    voices,
    romanNumeral,
    function: HARMONIC_FUNCTIONS[romanNumeral] || "tonic",
  }
}

function selectChordDegree(
  melodyScaleDegree: number,
  isStrongBeat: boolean,
  isEndOfPhrase: boolean,
  context: VoiceLeadingContext,
  variation = 0,
  rng: SeededRandom,
  options: HarmonizationOptions = {},
  scale: number[] = MAJOR_SCALE,
): number {
  if (isEndOfPhrase) {
    if (melodyScaleDegree === 0) return 0
    if (melodyScaleDegree === 4) return 4
    if (melodyScaleDegree === 6) return 4
  }

  if (isStrongBeat) {
    const stableChords = [0, 3, 4]
    for (const degree of stableChords) {
      if (
        degree === melodyScaleDegree ||
        (degree + 2) % 7 === melodyScaleDegree ||
        (degree + 4) % 7 === melodyScaleDegree
      ) {
        return degree
      }
    }
  }

  const possibleChords: number[] = []

  for (let degree = 0; degree < 7; degree++) {
    const chordTones = [degree, (degree + 2) % 7, (degree + 4) % 7]
    if (chordTones.includes(melodyScaleDegree)) {
      possibleChords.push(degree)
    }
  }

  if (possibleChords.length === 0) {
    return melodyScaleDegree
  }

  // Apply genre-specific preferences
  const genreRules = GENRE_RULES[options.genre || "classical"] || GENRE_RULES.classical
  
  const weights = possibleChords.map((degree) => {
    let baseWeight = 1.0
    if (degree === 0) baseWeight = 3.0
    if (degree === 4) baseWeight = 2.5
    if (degree === 3) baseWeight = 2.0
    if (degree === 1 || degree === 5) baseWeight = 1.5

    // Adjust based on genre preferences
    if (genreRules.preferredProgressions) {
      const isPreferred = genreRules.preferredProgressions.some(prog => 
        prog.includes(getRomanNumeral((0 + scale[degree]) % 12, getChordQuality(degree, scale === MAJOR_SCALE), degree, scale === MAJOR_SCALE, 0))
      )
      if (isPreferred) baseWeight *= 1.2
    }

    return baseWeight + variation * (rng.next() - 0.5) * 0.5
  })

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = rng.next() * totalWeight

  for (let i = 0; i < possibleChords.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return possibleChords[i]
    }
  }

  return possibleChords[0]
}

function getChordQuality(scaleDegree: number, isMajorKey: boolean): "major" | "minor" | "diminished" | "augmented" {
  if (isMajorKey) {
    if (scaleDegree === 0 || scaleDegree === 3 || scaleDegree === 4) return "major"
    if (scaleDegree === 6) return "diminished"
    return "minor"
  } else {
    if (scaleDegree === 0 || scaleDegree === 3) return "minor"
    if (scaleDegree === 2 || scaleDegree === 5 || scaleDegree === 6) return "major"
    if (scaleDegree === 1) return "diminished"
    if (scaleDegree === 4) return "major"
    return "minor"
  }
}

// Enhanced chord quality detection for 7th chords and extended analysis
function detectChordQuality(
  pitchClasses: number[],
  root: number,
  isMajorKey: boolean,
): { quality: Chord["quality"]; isSeventh: boolean } {
  const third = (root + 4) % 12
  const minorThird = (root + 3) % 12
  const fifth = (root + 7) % 12
  const dimFifth = (root + 6) % 12
  const augFifth = (root + 8) % 12
  const seventh = (root + 10) % 12
  const majorSeventh = (root + 11) % 12

  const hasThird = pitchClasses.includes(third)
  const hasMinorThird = pitchClasses.includes(minorThird)
  const hasFifth = pitchClasses.includes(fifth)
  const hasDimFifth = pitchClasses.includes(dimFifth)
  const hasAugFifth = pitchClasses.includes(augFifth)
  const hasSeventh = pitchClasses.includes(seventh)
  const hasMajorSeventh = pitchClasses.includes(majorSeventh)

  // Detect 7th chords first
  if (hasSeventh || hasMajorSeventh) {
    if (hasThird && hasFifth && hasSeventh) return { quality: "dominant7", isSeventh: true }
    if (hasThird && hasFifth && hasMajorSeventh) return { quality: "major7", isSeventh: true }
    if (hasMinorThird && hasFifth && hasSeventh) return { quality: "minor7", isSeventh: true }
    if (hasMinorThird && hasDimFifth && hasSeventh) return { quality: "halfDim7", isSeventh: true }
    if (hasMinorThird && hasDimFifth && hasMajorSeventh) return { quality: "dim7", isSeventh: true }
  }

  // Triads
  if (hasThird && hasFifth) return { quality: "major", isSeventh: false }
  if (hasMinorThird && hasFifth) return { quality: "minor", isSeventh: false }
  if (hasMinorThird && hasDimFifth) return { quality: "diminished", isSeventh: false }
  if (hasThird && hasAugFifth) return { quality: "augmented", isSeventh: false }

  // Default fallback
  return { quality: "major", isSeventh: false }
}

// Get Roman numeral for a chord
function getRomanNumeral(
  root: number,
  quality: Chord["quality"],
  scaleDegree: number,
  isMajorKey: boolean,
  inversion: number,
): string {
  const romanNumerals = isMajorKey
    ? ["I", "ii", "iii", "IV", "V", "vi", "vii°"]
    : ["i", "ii°", "III", "iv", "v", "VI", "VII"]

  let numeral = romanNumerals[scaleDegree] || "I"

  // Handle 7th chords
  if (quality.includes("7")) {
    if (quality === "dominant7") numeral = numeral.toUpperCase() + "7"
    else if (quality === "major7") numeral = numeral.toUpperCase() + "M7"
    else if (quality === "minor7") numeral = numeral.toLowerCase() + "7"
    else if (quality === "halfDim7") numeral = numeral + "ø7"
    else if (quality === "dim7") numeral = numeral + "°7"
  }

  // Add inversion figures
  if (inversion === 1) numeral += "6"
  else if (inversion === 2) numeral += "64"
  else if (inversion === 3) numeral += "43" // Third inversion for 7th chords

  return numeral
}

// Detect if chord is a secondary dominant
function isSecondaryDominant(
  chord: Chord,
  keyRoot: number,
  scale: number[],
  nextChord?: Chord | null,
): { isSecondary: boolean; target?: number } {
  // V7/V, V7/vi, etc.
  if (chord.quality === "dominant7" || chord.quality === "major") {
    // Check if this chord's root is a perfect fifth above a diatonic chord
    for (let degree = 0; degree < 7; degree++) {
      const targetRoot = (keyRoot + scale[degree]) % 12
      const dominantOfTarget = (targetRoot + 7) % 12

      if (chord.root === dominantOfTarget) {
        // Verify it resolves to the target
        if (nextChord && nextChord.root === targetRoot) {
          return { isSecondary: true, target: targetRoot }
        }
        // Even without next chord, if it's clearly a secondary dominant structure
        if (chord.quality === "dominant7") {
          return { isSecondary: true, target: targetRoot }
        }
      }
    }
  }
  return { isSecondary: false }
}

// Detect borrowed chords (mode mixture)
function isBorrowedChord(chord: Chord, keyRoot: number, scale: number[], isMajorKey: boolean): boolean {
  if (!isMajorKey) return false // Only check in major keys

  // Find scale degree
  const scaleDegree = scale.findIndex((interval) => (keyRoot + interval) % 12 === chord.root)
  if (scaleDegree === -1) return false

  // Borrowed chords in major: iv, bVI, bVII, etc.
  const borrowedDegrees = [3, 5, 6] // iv, bVI, bVII
  if (borrowedDegrees.includes(scaleDegree) && chord.quality === "minor") {
    return true
  }

  return false
}

// Score chord based on harmonic function flowchart
function scoreHarmonicFunction(
  chord: Chord,
  previousChord: Chord | null,
  isMajorKey: boolean,
): number {
  if (!previousChord) return 50 // Neutral score for first chord

  const prevFunc = previousChord.function || "tonic"
  const currFunc = chord.function || "tonic"

  // Ideal progressions
  if (prevFunc === "tonic" && (currFunc === "tonic" || currFunc === "tonicProlongation")) return 100
  if (prevFunc === "tonicProlongation" && (currFunc === "predominant" || currFunc === "dominant")) return 100
  if (prevFunc === "predominant" && currFunc === "dominant") return 100
  if (prevFunc === "dominant" && currFunc === "tonic") return 100

  // Acceptable progressions
  if (prevFunc === "tonic" && currFunc === "predominant") return 80
  if (prevFunc === "predominant" && currFunc === "predominant") return 70
  if (prevFunc === "dominant" && currFunc === "dominant") return 60 // V to V7, etc.

  // Weak progressions
  if (prevFunc === "dominant" && currFunc === "predominant") return 30
  if (prevFunc === "predominant" && currFunc === "tonic") return 40

  return 50 // Neutral
}

function voiceChord(
  melodyPitch: number,
  chordRoot: number,
  chordThird: number,
  chordFifth: number,
  inversion: 0 | 1 | 2,
  context: VoiceLeadingContext,
  options: HarmonizationOptions = {},
  explanations?: RuleExplanation[],
): number[] {
  const soprano = melodyPitch
  const sopranoOctave = Math.floor(soprano / 12)

  // Use strict SATB ranges
  const altoMin = SATB_RANGES.alto.min
  const altoMax = SATB_RANGES.alto.max
  const tenorMin = SATB_RANGES.tenor.min
  const tenorMax = SATB_RANGES.tenor.max
  const bassMin = SATB_RANGES.bass.min
  const bassMax = SATB_RANGES.bass.max

  let altoTone: number, tenorTone: number, bassTone: number

  // Apply doubling rules
  const doublingStrategy = getDoublingStrategy(inversion, chordRoot, chordThird, chordFifth, false, null)

  if (inversion === 0) {
    // Root position: double the root
    bassTone = findClosestPitch(chordRoot, sopranoOctave - 2, bassMin, bassMax)
    altoTone = findClosestPitch(doublingStrategy.alto || chordThird, sopranoOctave - 1, altoMin, altoMax)
    tenorTone = findClosestPitch(doublingStrategy.tenor || chordFifth, sopranoOctave - 1, tenorMin, tenorMax)
  } else if (inversion === 1) {
    // First inversion: don't double the bass (third)
    bassTone = findClosestPitch(chordThird, sopranoOctave - 2, bassMin, bassMax)
    altoTone = findClosestPitch(doublingStrategy.alto || chordFifth, sopranoOctave - 1, altoMin, altoMax)
    tenorTone = findClosestPitch(doublingStrategy.tenor || chordRoot, sopranoOctave - 1, tenorMin, tenorMax)
  } else {
    // Second inversion: double the bass (fifth)
    bassTone = findClosestPitch(chordFifth, sopranoOctave - 2, bassMin, bassMax)
    altoTone = findClosestPitch(doublingStrategy.alto || chordRoot, sopranoOctave - 1, altoMin, altoMax)
    tenorTone = findClosestPitch(doublingStrategy.tenor || chordThird, sopranoOctave - 1, tenorMin, tenorMax)
  }

  if (context.previousChord) {
    const prevVoices = context.previousChord.voices

    // Apply voice leading with motion priority
    altoTone = applyVoiceLeadingToVoice(altoTone, prevVoices[1], chordRoot, chordThird, chordFifth, altoMin, altoMax, false, null, options)
    tenorTone = applyVoiceLeadingToVoice(
      tenorTone,
      prevVoices[2],
      chordRoot,
      chordThird,
      chordFifth,
      tenorMin,
      tenorMax,
      false,
      null,
      options,
    )
    bassTone = applyVoiceLeadingToVoice(
      bassTone,
      prevVoices[3],
      chordRoot,
      chordThird,
      chordFifth,
      bassMin,
      bassMax,
      true,
      null,
      options,
    )
    
    // Add transparency explanations for voice leading
    if (options.transparencyMode && explanations) {
      const altoInterval = Math.abs(altoTone - prevVoices[1])
      const tenorInterval = Math.abs(tenorTone - prevVoices[2])
      const bassInterval = Math.abs(bassTone - prevVoices[3])
      
      if (altoInterval <= 2) {
        explanations.push({
          chordIndex: context.measurePosition,
          rule: "Voice Leading - Alto",
          reason: `Alto voice moves by step (${altoInterval} semitones) for smooth voice leading. ${altoTone % 12 === prevVoices[1] % 12 ? "Common tone retained." : ""}`,
          appliedTo: "voice",
          voiceIndex: 1,
        })
      }
      
      if (tenorInterval <= 2) {
        explanations.push({
          chordIndex: context.measurePosition,
          rule: "Voice Leading - Tenor",
          reason: `Tenor voice moves by step (${tenorInterval} semitones) for smooth voice leading.`,
          appliedTo: "voice",
          voiceIndex: 2,
        })
      }
      
      if (bassInterval <= 5) {
        explanations.push({
          chordIndex: context.measurePosition,
          rule: "Voice Leading - Bass",
          reason: `Bass voice moves by ${bassInterval <= 2 ? "step" : "small leap"} (${bassInterval} semitones). ${inversion === 0 ? "Root position provides strong harmonic foundation." : inversion === 1 ? "First inversion creates smoother bass line." : "Second inversion used for passing or cadential function."}`,
          appliedTo: "voice",
          voiceIndex: 3,
        })
      }
    }

    // Enforce spacing
    const voices = [soprano, altoTone, tenorTone, bassTone]
    const spacedVoices = enforceSpacing(voices)

    // Avoid parallel motion
    const adjustedVoices = avoidParallelMotion(spacedVoices, prevVoices, [chordRoot, chordThird, chordFifth])
    altoTone = adjustedVoices[1]
    tenorTone = adjustedVoices[2]
    bassTone = adjustedVoices[3]
  } else {
    // First chord - just check spacing
    const voices = [soprano, altoTone, tenorTone, bassTone]
    const spacedVoices = enforceSpacing(voices)
    altoTone = spacedVoices[1]
    tenorTone = spacedVoices[2]
    bassTone = spacedVoices[3]
  }

  return [soprano, altoTone, tenorTone, bassTone]
}

function findClosestPitch(pitchClass: number, targetOctave: number, minMidi: number, maxMidi: number): number {
  let pitch = targetOctave * 12 + pitchClass

  while (pitch < minMidi) pitch += 12
  while (pitch > maxMidi) pitch -= 12

  return pitch
}

function applyVoiceLeadingToVoice(
  currentPitch: number,
  previousPitch: number,
  chordRoot: number,
  chordThird: number,
  chordFifth: number,
  minRange: number,
  maxRange: number,
  allowLeaps = false,
  chordSeventh: number | null = null,
  options: HarmonizationOptions = {},
): number {
  if (previousPitch === -1) {
    // No previous pitch, just constrain to range
    while (currentPitch < minRange) currentPitch += 12
    while (currentPitch > maxRange) currentPitch -= 12
    return currentPitch
  }

  const interval = Math.abs(currentPitch - previousPitch)
  const direction = currentPitch > previousPitch ? 1 : -1
  const currentPC = currentPitch % 12
  const previousPC = previousPitch % 12

  // Apply horizontal flow weight - prioritize smooth voice leading over strict chord tones
  const horizontalWeight = options.horizontalFlowWeight || 0.5
  
  // Priority 1: Oblique motion (common tone retention) - best
  if (currentPC === previousPC) {
    // Same pitch class - keep same or move to adjacent octave if needed
    while (currentPitch < minRange) currentPitch += 12
    while (currentPitch > maxRange) currentPitch -= 12
    return currentPitch
  }

  // Priority 2: Stepwise motion (2nd) - very good (prioritized by horizontal flow)
  const stepwiseInterval = Math.abs(currentPC - previousPC)
  if (stepwiseInterval === 1 || stepwiseInterval === 11) {
    // Stepwise motion - keep it (even if not a chord tone, if horizontal flow is prioritized)
    const isChordTone = [chordRoot, chordThird, chordFifth, chordSeventh].filter(t => t !== null).includes(currentPC)
    if (isChordTone || horizontalWeight > 0.6) {
      while (currentPitch < minRange) currentPitch += 12
      while (currentPitch > maxRange) currentPitch -= 12
      return currentPitch
    }
  }

  // Priority 3: Small leaps (3rd, 4th) - acceptable
  if (interval <= 5) {
    while (currentPitch < minRange) currentPitch += 12
    while (currentPitch > maxRange) currentPitch -= 12
    return currentPitch
  }

  // Priority 4: Large leaps - try to minimize
  if (interval > (allowLeaps ? 12 : 7)) {
    const chordTones = [chordRoot, chordThird, chordFifth]
    if (chordSeventh !== null) chordTones.push(chordSeventh)
    const previousOctave = Math.floor(previousPitch / 12)

    let bestPitch = currentPitch
    let bestScore = -Infinity

    for (const tone of chordTones) {
      for (let octave = previousOctave - 1; octave <= previousOctave + 1; octave++) {
        const candidate = octave * 12 + tone
        if (candidate >= minRange && candidate <= maxRange) {
          const distance = Math.abs(candidate - previousPitch)
          const candidatePC = candidate % 12

          // Score: prefer stepwise, then small leaps, then common tones
          let score = 0
          if (candidatePC === previousPC) score = 100 // Common tone
          else if (Math.abs(candidatePC - previousPC) === 1 || Math.abs(candidatePC - previousPC) === 11) score = 80 // Stepwise
          else if (distance <= 5) score = 60 // Small leap
          else score = 40 - distance // Large leap (penalized)

          if (score > bestScore) {
            bestScore = score
            bestPitch = candidate
          }
        }
      }
    }

    currentPitch = bestPitch
  }

  while (currentPitch < minRange) currentPitch += 12
  while (currentPitch > maxRange) currentPitch -= 12

  return currentPitch
}

function avoidParallelMotion(currentVoices: number[], previousVoices: number[], chordTones: number[]): number[] {
  const adjusted = [...currentVoices]

  for (let i = 0; i < currentVoices.length; i++) {
    if (currentVoices[i] === -1 || previousVoices[i] === -1) continue

    for (let j = i + 1; j < currentVoices.length; j++) {
      if (currentVoices[j] === -1 || previousVoices[j] === -1) continue

      const currentInterval = Math.abs(currentVoices[i] - currentVoices[j]) % 12
      const previousInterval = Math.abs(previousVoices[i] - previousVoices[j]) % 12

      // Check for parallel perfect intervals (P5 or P8)
      if ((currentInterval === 7 || currentInterval === 0) && currentInterval === previousInterval) {
        const currentMotion = currentVoices[i] - previousVoices[i]
        const otherMotion = currentVoices[j] - previousVoices[j]

        // Both voices moving in same direction = parallel motion
        if ((currentMotion > 0 && otherMotion > 0) || (currentMotion < 0 && otherMotion < 0)) {
          const lowerVoiceOctave = Math.floor(adjusted[j] / 12)

          // Try to fix by changing the lower voice
          for (const tone of chordTones) {
            const candidate = lowerVoiceOctave * 12 + tone
            const newInterval = Math.abs(adjusted[i] - candidate) % 12

            if (newInterval !== currentInterval && newInterval !== 7 && newInterval !== 0) {
              adjusted[j] = candidate
              console.log(
                `[v0] Avoided parallel ${currentInterval === 7 ? "fifth" : "octave"} between voices ${i} and ${j}`,
              )
              break
            }
          }
        }
      }

      // Check for direct fifths/octaves (similar motion into P5 or P8)
      if (currentInterval === 7 || currentInterval === 0) {
        const currentMotion = currentVoices[i] - previousVoices[i]
        const otherMotion = currentVoices[j] - previousVoices[j]

        // Both voices moving in same direction into a perfect interval
        if ((currentMotion > 0 && otherMotion > 0) || (currentMotion < 0 && otherMotion < 0)) {
          const prevInterval = Math.abs(previousVoices[i] - previousVoices[j]) % 12
          if (prevInterval !== 7 && prevInterval !== 0) {
            // Previous interval was not perfect, but we're moving into one
            // This is a direct fifth/octave - generally avoid
            const lowerVoiceOctave = Math.floor(adjusted[j] / 12)

            for (const tone of chordTones) {
              const candidate = lowerVoiceOctave * 12 + tone
              const newInterval = Math.abs(adjusted[i] - candidate) % 12

              if (newInterval !== 7 && newInterval !== 0) {
                adjusted[j] = candidate
                console.log(
                  `[v0] Avoided direct ${currentInterval === 7 ? "fifth" : "octave"} between voices ${i} and ${j}`,
                )
                break
              }
            }
          }
        }
      }
    }
  }

  return adjusted
}

function createMultiInstrumentHarmonyXML(originalDoc: Document, harmoniesByInstrument: Record<string, Note[]>): string {
  const fifths = querySelector(originalDoc, "fifths")?.textContent || "0"
  const mode = querySelector(originalDoc, "mode")?.textContent || "major"
  const beats = querySelector(originalDoc, "beats")?.textContent || "4"
  const beatType = querySelector(originalDoc, "beat-type")?.textContent || "4"
  const divisions = querySelector(originalDoc, "divisions")?.textContent || "1"

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>`

  let partId = 1
  for (const instrument of Object.keys(harmoniesByInstrument)) {
    xml += `
    <score-part id="P${partId}">
      <part-name>${instrument}</part-name>
    </score-part>`
    partId++
  }

  xml += `
  </part-list>`

  partId = 1
  for (const [instrument, notes] of Object.entries(harmoniesByInstrument)) {
    const instrumentConfig = INSTRUMENT_CONFIG[instrument] || INSTRUMENT_CONFIG["Other"]
    xml += createPartXML(`P${partId}`, notes, fifths, mode, beats, beatType, divisions, instrumentConfig)
    partId++
  }

  xml += `
</score-partwise>`

  return xml
}

function createCombinedMultiInstrumentXML(
  originalDoc: Document,
  melodyNotes: Note[],
  harmoniesByInstrument: Record<string, Note[]>,
): string {
  const fifths = querySelector(originalDoc, "fifths")?.textContent || "0"
  const mode = querySelector(originalDoc, "mode")?.textContent || "major"
  const beats = querySelector(originalDoc, "beats")?.textContent || "4"
  const beatType = querySelector(originalDoc, "beat-type")?.textContent || "4"
  const divisions = querySelector(originalDoc, "divisions")?.textContent || "1"

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Soprano (Melody)</part-name>
    </score-part>`

  let partId = 2
  for (const instrument of Object.keys(harmoniesByInstrument)) {
    xml += `
    <score-part id="P${partId}">
      <part-name>${instrument}</part-name>
    </score-part>`
    partId++
  }

  xml += `
  </part-list>`

  xml += createPartXML("P1", melodyNotes, fifths, mode, beats, beatType, divisions, INSTRUMENT_CONFIG["Soprano"])

  partId = 2
  for (const [instrument, notes] of Object.entries(harmoniesByInstrument)) {
    const instrumentConfig = INSTRUMENT_CONFIG[instrument] || INSTRUMENT_CONFIG["Other"]
    xml += createPartXML(`P${partId}`, notes, fifths, mode, beats, beatType, divisions, instrumentConfig)
    partId++
  }

  xml += `
</score-partwise>`

  return xml
}

function createPartXML(
  partId: string,
  notes: Note[],
  fifths: string,
  mode: string,
  beats: string,
  beatType: string,
  divisions: string,
  instrumentConfig: InstrumentConfig,
): string {
  let xml = `
  <part id="${partId}">
    <measure number="1">
      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${fifths}</fifths>
          <mode>${mode}</mode>
        </key>
        <time>
          <beats>${beats}</beats>
          <beat-type>${beatType}</beat-type>
        </time>
        <clef>
          <sign>${instrumentConfig.clefSign}</sign>
          <line>${instrumentConfig.clefLine}</line>
        </clef>
      </attributes>`

  let currentMeasure = 1
  let measureDuration = 0
  const maxMeasureDuration = Number.parseInt(divisions) * Number.parseInt(beats)

  notes.forEach((note, index) => {
    // If adding this note would exceed the measure duration, start a new measure
    if (measureDuration > 0 && measureDuration + note.duration > maxMeasureDuration) {
      // Fill remaining duration with rest if needed
      const remainingDuration = maxMeasureDuration - measureDuration
      if (remainingDuration > 0) {
        xml += `
      <note>
        <rest/>
        <duration>${remainingDuration}</duration>
      </note>`
      }

      xml += `
    </measure>
    <measure number="${++currentMeasure}">`
      measureDuration = 0
    }

    // If current measure is exactly full, start new measure
    if (measureDuration >= maxMeasureDuration && index < notes.length) {
      xml += `
    </measure>
    <measure number="${++currentMeasure}">`
      measureDuration = 0
    }

    // Handle notes that span multiple measures
    let remainingNoteDuration = note.duration
    let isFirstSegment = true

    while (remainingNoteDuration > 0) {
      const availableSpace = maxMeasureDuration - measureDuration
      const durationToWrite = Math.min(remainingNoteDuration, availableSpace)

      if (note.pitch === -1) {
        xml += `
      <note>
        <rest/>
        <duration>${durationToWrite}</duration>`

        // Add tie notation if this rest is split across measures (unusual but handled)
        if (!isFirstSegment && remainingNoteDuration > durationToWrite) {
          xml += `
        <notations>
          <tied type="stop"/>
          <tied type="start"/>
        </notations>`
        } else if (!isFirstSegment) {
          xml += `
        <notations>
          <tied type="stop"/>
        </notations>`
        } else if (remainingNoteDuration > durationToWrite) {
          xml += `
        <notations>
          <tied type="start"/>
        </notations>`
        }

        xml += `
      </note>`
      } else {
        const transposedPitch = note.pitch + instrumentConfig.transposition
        const { step, octave, alter } = midiToStep(transposedPitch)
        xml += `
      <note>
        <pitch>
          <step>${step}</step>${
            alter !== 0
              ? `
          <alter>${alter}</alter>`
              : ""
          }
          <octave>${octave}</octave>
        </pitch>
        <duration>${durationToWrite}</duration>`

        // Add tie notation if this note spans multiple measures
        if (!isFirstSegment && remainingNoteDuration > durationToWrite) {
          xml += `
        <tie type="stop"/>
        <tie type="start"/>
        <notations>
          <tied type="stop"/>
          <tied type="start"/>
        </notations>`
        } else if (!isFirstSegment) {
          xml += `
        <tie type="stop"/>
        <notations>
          <tied type="stop"/>
        </notations>`
        } else if (remainingNoteDuration > durationToWrite) {
          xml += `
        <tie type="start"/>
        <notations>
          <tied type="start"/>
        </notations>`
        }

        xml += `
      </note>`
      }

      measureDuration += durationToWrite
      remainingNoteDuration -= durationToWrite
      isFirstSegment = false

      // If measure is full and we have more note duration, start new measure
      if (measureDuration >= maxMeasureDuration && remainingNoteDuration > 0) {
        xml += `
    </measure>
    <measure number="${++currentMeasure}">`
        measureDuration = 0
      }
    }
  })

  // Fill any remaining space in the last measure with a rest
  if (measureDuration > 0 && measureDuration < maxMeasureDuration) {
    const remainingDuration = maxMeasureDuration - measureDuration
    xml += `
      <note>
        <rest/>
        <duration>${remainingDuration}</duration>
      </note>`
  }

  xml += `
    </measure>
  </part>`

  return xml
}

function validateHarmonicProgression(
  chords: Chord[],
  melodyNotes: Note[],
  keyRoot: number,
  scale: number[],
  isMajor: boolean,
): HarmonicAnalysis {
  const warnings: string[] = []
  let score = 100

  // Check 1: Common tone connectivity
  let commonToneCount = 0
  for (let i = 1; i < chords.length; i++) {
    if (chords[i].voices[0] === -1 || chords[i - 1].voices[0] === -1) continue

    const currentTones = new Set(chords[i].voices.map((v) => v % 12))
    const previousTones = new Set(chords[i - 1].voices.map((v) => v % 12))

    const hasCommonTone = Array.from(currentTones).some((tone) => previousTones.has(tone))
    if (hasCommonTone) {
      commonToneCount++
    } else {
      warnings.push(`No common tones between chords ${i} and ${i + 1}`)
      score -= 2
    }
  }

  // Check 2: Chord quality appropriateness
  let appropriateChords = 0
  for (let i = 0; i < chords.length; i++) {
    if (chords[i].voices[0] === -1) continue

    const melodyClass = melodyNotes[i].pitch % 12
    const chordTones = new Set([chords[i].root, (chords[i].root + 4) % 12, (chords[i].root + 7) % 12])

    if (chordTones.has(melodyClass) || (chords[i].quality === "minor" && chordTones.has((chords[i].root + 3) % 12))) {
      appropriateChords++
    } else {
      warnings.push(`Melody note ${i} not well supported by chord quality`)
      score -= 1
    }
  }

  // Check 3: Voice leading smoothness
  let smoothTransitions = 0
  for (let voice = 1; voice < 4; voice++) {
    for (let i = 1; i < chords.length; i++) {
      if (chords[i].voices[voice] === -1 || chords[i - 1].voices[voice] === -1) continue

      const interval = Math.abs(chords[i].voices[voice] - chords[i - 1].voices[voice])
      if (interval <= 5) {
        smoothTransitions++
      } else {
        score -= 0.5
      }
    }
  }

  // Check 4: Chord progression logic
  let progressionScore = 0
  for (let i = 1; i < chords.length; i++) {
    if (chords[i].voices[0] === -1 || chords[i - 1].voices[0] === -1) continue

    const prev = chords[i - 1].root % 12
    const curr = chords[i].root % 12
    const interval = (curr - prev + 12) % 12

    // Strong progressions: IV→I, V→I, ii→V, etc.
    if ([5, 7].includes(interval) || (interval === 1 && isMajor)) {
      progressionScore += 2
    } else if ([2, 3, 4, 8, 9, 10].includes(interval)) {
      progressionScore += 1
    }
  }

  score = Math.max(0, Math.min(100, score + Math.min(progressionScore, 10)))

  return {
    score: Math.round(score),
    warnings,
    suggestions: [],
  }
}

function refineHarmonicProgression(
  chords: Chord[],
  melodyNotes: Note[],
  keyRoot: number,
  scale: number[],
  isMajor: boolean,
): Chord[] {
  const refined: Chord[] = []

  for (let i = 0; i < chords.length; i++) {
    let chord = { ...chords[i], voices: [...chords[i].voices] }

    if (chord.voices[0] === -1) {
      refined.push(chord)
      continue
    }

    // Apply common tone retention
    if (i > 0 && chords[i - 1].voices[0] !== -1) {
      const previousTones = new Set(refined[i - 1].voices.map((v) => v % 12))
      const currentTones = new Set([chord.root % 12, (chord.root + 4) % 12, (chord.root + 7) % 12])

      const commonTones = Array.from(currentTones).filter((t) => previousTones.has(t))

      if (commonTones.length === 0) {
        // Try voice leading inversion to retain common tone
        const bestInversion = findBestInversionForCommonTone(chord, refined[i - 1], keyRoot, scale, isMajor)
        if (bestInversion) {
          chord = bestInversion
        }
      }
    }

    // Ensure voices are within bounds and smooth
    if (i > 0 && refined[i - 1].voices[0] !== -1) {
      chord = smoothVoiceLeading(chord, refined[i - 1])
    }

    refined.push(chord)
  }

  return refined
}

function findBestInversionForCommonTone(
  currentChord: Chord,
  previousChord: Chord,
  keyRoot: number,
  scale: number[],
  isMajor: boolean,
  options: HarmonizationOptions = {},
): Chord | null {
  const chordThird = (currentChord.root + (currentChord.quality === "major" ? 4 : 3)) % 12
  const chordFifth = (currentChord.root + (currentChord.quality === "diminished" ? 6 : 7)) % 12
  const previousTones = new Set(previousChord.voices.map((v) => v % 12))

  const candidates = [
    { inversion: 0, bass: currentChord.root, commonTone: previousTones.has(currentChord.root % 12) },
    { inversion: 1, bass: chordThird, commonTone: previousTones.has(chordThird) },
    { inversion: 2, bass: chordFifth, commonTone: previousTones.has(chordFifth) },
  ]

  const best = candidates.find((c) => c.commonTone)
  if (best && best.inversion !== currentChord.inversion) {
    return {
      ...currentChord,
      inversion: best.inversion as 0 | 1 | 2,
      voices: voiceChord(
        previousChord.voices[0],
        currentChord.root,
        chordThird,
        chordFifth,
        best.inversion as 0 | 1 | 2,
        { previousChord, previousMelody: null, measurePosition: 0, phrasePosition: 0, instrumentVariation: 0 },
        options,
        undefined, // explanations not available in this context
      ),
    }
  }

  return null
}

function smoothVoiceLeading(currentChord: Chord, previousChord: Chord): Chord {
  const smoothed = { ...currentChord, voices: [...currentChord.voices] }

  for (let voice = 1; voice < 4; voice++) {
    if (currentChord.voices[voice] === -1 || previousChord.voices[voice] === -1) continue

    const interval = currentChord.voices[voice] - previousChord.voices[voice]

    // If leap is large, try to reduce it
    if (Math.abs(interval) > 8) {
      const pitchClass = currentChord.voices[voice] % 12
      const targetOctave = Math.floor(previousChord.voices[voice] / 12)

      let bestPitch = currentChord.voices[voice]
      let bestInterval = Math.abs(interval)

      for (let octave = targetOctave - 1; octave <= targetOctave + 1; octave++) {
        const candidate = octave * 12 + pitchClass
        const candidateInterval = Math.abs(candidate - previousChord.voices[voice])

        if (candidateInterval < bestInterval) {
          bestInterval = candidateInterval
          bestPitch = candidate
        }
      }

      smoothed.voices[voice] = bestPitch
    }
  }

  return smoothed
}