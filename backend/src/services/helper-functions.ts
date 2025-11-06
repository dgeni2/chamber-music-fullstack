// Helper functions extracted for music processing
// These will be imported by musicProcessor.ts

import type { Note, Chord, InstrumentConfig, HarmonicAnalysis } from '../types/index.js';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

export function stepToMidi(step: string, octave: number, alter: number = 0): number {
  const stepMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return (octave + 1) * 12 + (stepMap[step] || 0) + alter;
}

export function midiToStep(midi: number): { step: string; octave: number; alter: number } {
  const octave = Math.floor(midi / 12) - 1;
  const pitchClass = midi % 12;
  const stepMap = [
    { step: "C", alter: 0 },
    { step: "C", alter: 1 },
    { step: "D", alter: 0 },
    { step: "D", alter: 1 },
    { step: "E", alter: 0 },
    { step: "F", alter: 0 },
    { step: "F", alter: 1 },
    { step: "G", alter: 0 },
    { step: "G", alter: 1 },
    { step: "A", alter: 0 },
    { step: "A", alter: 1 },
    { step: "B", alter: 0 },
  ];

  return { ...stepMap[pitchClass], octave };
}

export function getKeyInfo(fifths: number, mode: string): { root: number; scale: number[] } {
  const majorRoots = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  let root: number;
  
  if (fifths >= 0) {
    root = majorRoots[fifths % 12];
  } else {
    root = majorRoots[(12 + fifths) % 12];
  }

  const scale = mode === "minor" ? MINOR_SCALE : MAJOR_SCALE;
  return { root, scale };
}

export function getScaleNotes(root: number, scale: number[]): string[] {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return scale.map((interval) => noteNames[(root + interval) % 12]);
}

export function constrainToInstrumentRange(pitch: number, config: InstrumentConfig): number {
  let p = pitch;
  while (p < config.minMidi) p += 12;
  while (p > config.maxMidi) p -= 12;
  return p;
}

export function findClosestPitch(targetPitch: number, lastPitch: number, config: InstrumentConfig): number {
  const candidates: number[] = [];
  let p = targetPitch % 12;

  while (p < config.minMidi) p += 12;

  while (p <= config.maxMidi) {
    candidates.push(p);
    p += 12;
  }

  if (candidates.length === 0) {
    return constrainToInstrumentRange(targetPitch, config);
  }

  return candidates.reduce((prev, curr) =>
    Math.abs(curr - lastPitch) < Math.abs(prev - lastPitch) ? curr : prev
  );
}

export function applyVoiceLeadingToVoice(
  currentPitch: number,
  previousPitch: number,
  config: InstrumentConfig
): number {
  const interval = Math.abs(currentPitch - previousPitch);

  if (interval <= 2) return currentPitch;

  const candidates: number[] = [];
  let p = currentPitch % 12;

  while (p < config.minMidi) p += 12;

  while (p <= config.maxMidi) {
    candidates.push(p);
    p += 12;
  }

  if (candidates.length === 0) {
    return constrainToInstrumentRange(currentPitch, config);
  }

  return candidates.reduce((prev, curr) =>
    Math.abs(curr - previousPitch) < Math.abs(prev - previousPitch) ? curr : prev
  );
}

export function avoidParallelMotion(voices: number[], prevVoices: number[]): number[] {
  const adjusted = [...voices];

  for (let i = 0; i < voices.length - 1; i++) {
    for (let j = i + 1; j < voices.length; j++) {
      const interval1 = Math.abs(prevVoices[i] - prevVoices[j]);
      const interval2 = Math.abs(voices[i] - voices[j]);

      if (interval1 === interval2 && interval1 === 7) {
        adjusted[j] = (adjusted[j] + 1) % 128;
      }
    }
  }

  return adjusted;
}

export function selectChordDegree(index: number, total: number, isMajor: boolean, multipleInstruments: boolean): number {
  const progress = index / total;

  if (progress < 0.25) return 1;
  if (progress < 0.5) return isMajor ? 5 : 4;
  if (progress < 0.75) return multipleInstruments ? (isMajor ? 4 : 6) : (isMajor ? 2 : 7);
  if (progress < 0.9) return 5;
  return 1;
}

export function getChordQuality(degree: number, isMajor: boolean): "major" | "minor" | "diminished" {
  if (isMajor) {
    if ([1, 4, 5].includes(degree)) return "major";
    if ([2, 3, 6].includes(degree)) return "minor";
    return "diminished";
  } else {
    if ([3, 6, 7].includes(degree)) return "major";
    if ([1, 4].includes(degree)) return "minor";
    return "diminished";
  }
}

export function analyzeAndBuildChord(degree: number, root: number, isMajor: boolean): number[] {
  const scale = isMajor ? MAJOR_SCALE : MINOR_SCALE;
  const chordRoot = (root + scale[degree - 1]) % 12;
  const intervals = getChordQuality(degree, isMajor) === "major" ? [0, 4, 7] : [0, 3, 7];

  return intervals.map((interval) => (chordRoot + interval) % 12);
}

export function validateHarmonicProgression(
  progression: Chord[],
  melody: Note[],
  root: number,
  scale: number[],
  isMajor: boolean
): HarmonicAnalysis {
  let score = 100;
  const issues: string[] = [];

  for (let i = 1; i < progression.length; i++) {
    const prev = progression[i - 1];
    const curr = progression[i];

    if (prev.root === -1 || curr.root === -1) continue;

    const interval = Math.abs(curr.root - prev.root);

    if (interval > 7) {
      score -= 5;
      issues.push(`Large harmonic leap at position ${i}`);
    }

    if (prev.inversion === curr.inversion && prev.root !== curr.root) {
      score -= 2;
    }
  }

  const scaleNotes = scale.map((interval) => (root + interval) % 12);

  progression.forEach((chord, i) => {
    if (chord.root === -1) return;

    const melodyPitch = melody[i]?.pitch;
    if (melodyPitch !== undefined && melodyPitch !== -1) {
      const melodyPC = melodyPitch % 12;
      const chordPCs = [chord.root, (chord.root + 4) % 12, (chord.root + 7) % 12];

      if (!chordPCs.includes(melodyPC)) {
        score -= 3;
        issues.push(`Melody-harmony mismatch at position ${i}`);
      }
    }
  });

  return { score: Math.max(0, score), issues };
}

export function refineHarmonicProgression(
  progression: Chord[],
  melody: Note[],
  root: number,
  scale: number[],
  isMajor: boolean
): Chord[] {
  const refined = [...progression];

  for (let i = 1; i < refined.length; i++) {
    const prev = refined[i - 1];
    const curr = refined[i];

    if (prev.root === -1 || curr.root === -1) continue;

    const interval = Math.abs(curr.root - prev.root);

    if (interval > 7) {
      const betterInversion = findBestInversionForCommonTone(curr, prev);
      if (betterInversion) {
        refined[i] = { ...curr, inversion: betterInversion.inversion };
      }
    }
  }

  for (let i = 0; i < refined.length; i++) {
    const chord = refined[i];
    if (chord.root === -1) continue;

    const melodyPitch = melody[i]?.pitch;
    if (melodyPitch !== undefined && melodyPitch !== -1) {
      const melodyPC = melodyPitch % 12;
      const intervals = chord.quality === "major" ? [0, 4, 7] : [0, 3, 7];
      const chordPCs = intervals.map((interval) => (chord.root + interval) % 12);

      if (!chordPCs.includes(melodyPC)) {
        const scaleNotes = scale.map((interval) => (root + interval) % 12);
        const closestScaleNote = scaleNotes.reduce((prev, curr) =>
          Math.abs(curr - melodyPC) < Math.abs(prev - melodyPC) ? curr : prev
        );

        const newRoot = closestScaleNote;
        refined[i] = { ...chord, root: newRoot };
      }
    }
  }

  return refined;
}

export function findBestInversionForCommonTone(
  currentChord: Chord,
  previousChord: Chord
): { inversion: number; commonTone: number } | null {
  const intervals = currentChord.quality === "major" ? [0, 4, 7] : [0, 3, 7];
  const prevIntervals = previousChord.quality === "major" ? [0, 4, 7] : [0, 3, 7];

  const prevPitches = prevIntervals.map((interval) => (previousChord.root + interval) % 12);
  const currPitches = intervals.map((interval) => (currentChord.root + interval) % 12);

  const commonTones = currPitches.filter((pitch) => prevPitches.includes(pitch));

  if (commonTones.length > 0) {
    const commonTone = commonTones[0];
    const index = currPitches.indexOf(commonTone);

    if (index === 1) return { inversion: 1, commonTone };
    if (index === 2) return { inversion: 2, commonTone };
  }

  return null;
}

export function smoothVoiceLeading(voices: number[], prevVoices: number[], config: InstrumentConfig): number[] {
  return voices.map((voice, i) => {
    if (prevVoices[i] !== undefined) {
      return applyVoiceLeadingToVoice(voice, prevVoices[i], config);
    }
    return voice;
  });
}

export function generateHarmonicProgression(
  notes: Note[],
  root: number,
  scale: number[],
  mode: string,
  multipleInstruments: boolean
): Chord[] {
  const progression: Chord[] = [];
  const scaleNotes = scale.map((interval) => (root + interval) % 12);
  const isMajor = mode === "major";

  let lastChord: Chord | null = null;

  notes.forEach((note, i) => {
    if (note.pitch === -1) {
      if (lastChord) {
        progression.push({ ...lastChord, duration: note.duration });
      } else {
        progression.push({ root: -1, quality: "major", inversion: 0, duration: note.duration, voices: [] });
      }
      return;
    }

    const notePitchClass = note.pitch % 12;
    const scaleDegreeIndex = scaleNotes.indexOf(notePitchClass);

    let chordRoot: number;
    let quality: "major" | "minor" | "diminished";

    if (scaleDegreeIndex !== -1) {
      chordRoot = selectChordDegree(i, notes.length, isMajor, multipleInstruments);
      quality = getChordQuality(chordRoot, isMajor);
    } else {
      const closest = scaleNotes.reduce((prev, curr) =>
        Math.abs(curr - notePitchClass) < Math.abs(prev - notePitchClass) ? curr : prev
      );
      const closestIndex = scaleNotes.indexOf(closest);
      chordRoot = closestIndex + 1;
      quality = getChordQuality(chordRoot, isMajor);
    }

    const absoluteRoot = (root + scale[chordRoot - 1]) % 12;

    const chord: Chord = {
      root: absoluteRoot,
      quality,
      inversion: 0,
      duration: note.duration,
      voices: [],
    };

    if (lastChord) {
      const commonTone = findBestInversionForCommonTone(chord, lastChord);
      if (commonTone !== null) {
        chord.inversion = commonTone.inversion;
      }
    }

    lastChord = chord;
    progression.push(chord);
  });

  return progression;
}

export function generateHarmonicProgressionPolyphonic(
  melodicLines: Note[][],
  root: number,
  scale: number[],
  mode: string,
  multipleInstruments: boolean
): Chord[] {
  const maxLength = Math.max(...melodicLines.map((line) => line.length));
  const progression: Chord[] = [];
  const scaleNotes = scale.map((interval) => (root + interval) % 12);
  const isMajor = mode === "major";

  for (let i = 0; i < maxLength; i++) {
    const simultaneousPitches: number[] = [];
    let combinedDuration = 0;

    melodicLines.forEach((line) => {
      if (i < line.length && line[i].pitch !== -1) {
        simultaneousPitches.push(line[i].pitch);
        combinedDuration = Math.max(combinedDuration, line[i].duration);
      }
    });

    if (simultaneousPitches.length === 0) {
      const restChord: Chord = {
        root: -1,
        quality: "major",
        inversion: 0,
        duration: combinedDuration || 1,
        voices: [],
      };
      progression.push(restChord);
      continue;
    }

    const analysis = analyzeVerticalHarmony(simultaneousPitches, scaleNotes, root, isMajor);
    const chordRoot = (root + scale[(analysis.suggestedDegree || 1) - 1]) % 12;
    const quality = getChordQuality(analysis.suggestedDegree || 1, isMajor);

    const chord: Chord = {
      root: chordRoot,
      quality,
      inversion: 0,
      duration: combinedDuration,
      voices: simultaneousPitches,
    };

    progression.push(chord);
  }

  return progression;
}

export function analyzeVerticalHarmony(
  pitches: number[],
  scaleNotes: number[],
  root: number,
  isMajor: boolean
): { suggestedDegree: number; confidence: number } {
  const pitchClasses = pitches.map((p) => p % 12);
  const degreeScores: Record<number, number> = {};

  for (let degree = 1; degree <= 7; degree++) {
    let score = 0;
    const chordPitches = analyzeAndBuildChord(degree, root, isMajor);

    pitchClasses.forEach((pc) => {
      if (chordPitches.includes(pc)) {
        score += 2;
      } else if (scaleNotes.includes(pc)) {
        score += 1;
      }
    });

    degreeScores[degree] = score;
  }

  const maxScore = Math.max(...Object.values(degreeScores));
  const bestDegree = parseInt(
    Object.keys(degreeScores).find((k) => degreeScores[parseInt(k)] === maxScore) || "1",
    10
  );

  return { suggestedDegree: bestDegree, confidence: maxScore };
}

export function generateInstrumentPart(
  chords: Chord[],
  voiceNumber: 1 | 2 | 3,
  instrumentConfig: InstrumentConfig,
  melodyNotes: Note[]
): Note[] {
  const notes: Note[] = [];
  let lastPitch: number | null = null;

  chords.forEach((chord, i) => {
    if (chord.root === -1) {
      notes.push({ pitch: -1, duration: chord.duration, offset: melodyNotes[i]?.offset || 0 });
      return;
    }

    const melodyPitch = melodyNotes[i]?.pitch ?? null;

    let voicedChord: number[];
    if (chord.voices && chord.voices.length > 0) {
      voicedChord = voiceChordPolyphonic(chord, instrumentConfig, lastPitch, chord.voices);
    } else {
      voicedChord = voiceChord(chord, instrumentConfig, lastPitch, melodyPitch);
    }

    const targetPitch = voicedChord[voiceNumber - 1];
    notes.push({
      pitch: targetPitch,
      duration: chord.duration,
      offset: melodyNotes[i]?.offset || 0,
    });

    lastPitch = targetPitch;
  });

  return notes;
}

export function voiceChord(
  chord: Chord,
  instrumentConfig: InstrumentConfig,
  lastPitch: number | null,
  melodyPitch: number | null
): number[] {
  const intervals = chord.quality === "major" ? [0, 4, 7] : chord.quality === "minor" ? [0, 3, 7] : [0, 3, 6];

  let voices = intervals.map((interval) => chord.root + interval);

  if (chord.inversion === 1) {
    voices[0] += 12;
  } else if (chord.inversion === 2) {
    voices[0] += 12;
    voices[1] += 12;
  }

  const midpoint = (instrumentConfig.minMidi + instrumentConfig.maxMidi) / 2;

  voices = voices.map((pitch) => {
    let p = pitch;
    while (p < instrumentConfig.minMidi) p += 12;
    while (p > instrumentConfig.maxMidi) p -= 12;

    const candidates = [p];
    if (p + 12 <= instrumentConfig.maxMidi) candidates.push(p + 12);
    if (p - 12 >= instrumentConfig.minMidi) candidates.push(p - 12);

    return candidates.reduce((prev, curr) =>
      Math.abs(curr - midpoint) < Math.abs(prev - midpoint) ? curr : prev
    );
  });

  if (lastPitch !== null) {
    voices = voices.map((pitch) => findClosestPitch(pitch, lastPitch, instrumentConfig));
  }

  if (melodyPitch !== null && melodyPitch !== -1) {
    const melodyPC = melodyPitch % 12;
    const chordPCs = voices.map((v) => v % 12);

    if (chordPCs.includes(melodyPC)) {
      const index = chordPCs.indexOf(melodyPC);
      if (index !== -1) {
        voices[index] = constrainToInstrumentRange(melodyPitch, instrumentConfig);
      }
    }
  }

  voices.sort((a, b) => b - a);

  return voices;
}

export function voiceChordPolyphonic(
  chord: Chord,
  instrumentConfig: InstrumentConfig,
  lastPitch: number | null,
  inputNotes: number[]
): number[] {
  const intervals = chord.quality === "major" ? [0, 4, 7] : chord.quality === "minor" ? [0, 3, 7] : [0, 3, 6];

  let baseVoices = intervals.map((interval) => chord.root + interval);

  if (chord.inversion === 1) {
    baseVoices[0] += 12;
  } else if (chord.inversion === 2) {
    baseVoices[0] += 12;
    baseVoices[1] += 12;
  }

  const midpoint = (instrumentConfig.minMidi + instrumentConfig.maxMidi) / 2;

  baseVoices = baseVoices.map((pitch) => {
    let p = pitch;
    while (p < instrumentConfig.minMidi) p += 12;
    while (p > instrumentConfig.maxMidi) p -= 12;

    const candidates = [p];
    if (p + 12 <= instrumentConfig.maxMidi) candidates.push(p + 12);
    if (p - 12 >= instrumentConfig.minMidi) candidates.push(p - 12);

    return candidates.reduce((prev, curr) =>
      Math.abs(curr - midpoint) < Math.abs(prev - midpoint) ? curr : prev
    );
  });

  const inputPitchClasses = inputNotes.map((n) => n % 12);
  const chordPitchClasses = baseVoices.map((v) => v % 12);

  inputPitchClasses.forEach((ipc) => {
    if (chordPitchClasses.includes(ipc)) {
      const index = chordPitchClasses.indexOf(ipc);
      const matchingInput = inputNotes.find((n) => n % 12 === ipc);
      if (matchingInput !== undefined) {
        baseVoices[index] = constrainToInstrumentRange(matchingInput, instrumentConfig);
      }
    }
  });

  if (lastPitch !== null) {
    baseVoices = baseVoices.map((pitch) => findClosestPitch(pitch, lastPitch, instrumentConfig));
  }

  baseVoices.sort((a, b) => b - a);

  return baseVoices;
}

