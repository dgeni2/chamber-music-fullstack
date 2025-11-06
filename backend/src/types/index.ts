// Shared TypeScript types for backend

export interface Note {
  pitch: number; // MIDI pitch number, -1 for rest
  duration: number;
  offset: number;
}

export interface Chord {
  root: number; // MIDI pitch
  quality: "major" | "minor" | "diminished" | "augmented";
  inversion: 0 | 1 | 2;
  voices: number[]; // [soprano, alto, tenor, bass]
}

export interface VoiceLeadingContext {
  previousChord: Chord | null;
  previousMelody: number | null;
  measurePosition: number;
  phrasePosition: number;
  instrumentVariation: number;
}

export interface InstrumentConfig {
  clefSign: "G" | "F" | "C";
  clefLine: 2 | 4 | 3;
  minMidi: number;
  maxMidi: number;
  transposition: number; // Semitones up for written pitch
}

export interface HarmonicAnalysis {
  score: number;
  warnings: string[];
  suggestions: string[];
}

export interface HarmonizationResponse {
  harmonyOnly: {
    content: string;
    filename: string;
  };
  combined: {
    content: string;
    filename: string;
  };
  metadata: {
    instruments: string[];
    style?: string;
    difficulty?: string;
    processingTime: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}
