// XML Generation Functions for MusicXML output
// Extracted from Next.js route and converted to pure TypeScript

import { midiToStep } from './helper-functions.js';
import type { Note, InstrumentConfig } from '../types/index.js';

// Instrument configurations (duplicated for easier reference in this file)
const INSTRUMENT_CONFIG: Record<string, InstrumentConfig> = {
  Violin: { clefSign: "G", clefLine: 2, minMidi: 55, maxMidi: 96, transposition: 0 },
  Flute: { clefSign: "G", clefLine: 2, minMidi: 60, maxMidi: 99, transposition: 0 },
  Oboe: { clefSign: "G", clefLine: 2, minMidi: 58, maxMidi: 94, transposition: 0 },
  Cello: { clefSign: "F", clefLine: 4, minMidi: 36, maxMidi: 80, transposition: 0 },
  Tuba: { clefSign: "F", clefLine: 4, minMidi: 21, maxMidi: 53, transposition: 0 },
  Bassoon: { clefSign: "F", clefLine: 4, minMidi: 34, maxMidi: 74, transposition: 0 },
  Viola: { clefSign: "C", clefLine: 3, minMidi: 48, maxMidi: 77, transposition: 0 },
  "B-flat Clarinet": { clefSign: "G", clefLine: 2, minMidi: 53, maxMidi: 98, transposition: 2 },
  "B-flat Trumpet": { clefSign: "G", clefLine: 2, minMidi: 53, maxMidi: 86, transposition: 2 },
  "F Horn": { clefSign: "G", clefLine: 2, minMidi: 41, maxMidi: 84, transposition: 7 },
  Soprano: { clefSign: "G", clefLine: 2, minMidi: 60, maxMidi: 84, transposition: 0 },
  "Tenor Voice": { clefSign: "G", clefLine: 2, minMidi: 48, maxMidi: 67, transposition: 12 },
  Other: { clefSign: "G", clefLine: 2, minMidi: 40, maxMidi: 84, transposition: 0 },
};

export function createMultiInstrumentHarmonyXML(
  originalDoc: Document,
  harmoniesByInstrument: Record<string, Note[]>
): string {
  const instruments = Object.keys(harmoniesByInstrument);

  const fifths = originalDoc.querySelector("fifths")?.textContent || "0";
  const mode = originalDoc.querySelector("mode")?.textContent || "major";
  const beats = originalDoc.querySelector("beats")?.textContent || "4";
  const beatType = originalDoc.querySelector("beat-type")?.textContent || "4";
  const divisions = originalDoc.querySelector("divisions")?.textContent || "1";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
`;

  instruments.forEach((instrument, index) => {
    const partId = `P${index + 1}`;
    xml += `    <score-part id="${partId}">
      <part-name>${instrument}</part-name>
    </score-part>
`;
  });

  xml += `  </part-list>
`;

  instruments.forEach((instrument, index) => {
    const partId = `P${index + 1}`;
    const notes = harmoniesByInstrument[instrument];
    const config = INSTRUMENT_CONFIG[instrument] || INSTRUMENT_CONFIG["Other"];

    xml += `  <part id="${partId}">
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
          <sign>${config.clefSign}</sign>
          <line>${config.clefLine}</line>
        </clef>
      </attributes>
`;

    notes.forEach((note) => {
      xml += createNoteXML(note, config);
    });

    xml += `    </measure>
  </part>
`;
  });

  xml += `</score-partwise>`;

  return xml;
}

export function createCombinedMultiInstrumentXML(
  originalDoc: Document,
  melodyNotes: Note[],
  harmoniesByInstrument: Record<string, Note[]>
): string {
  const instruments = Object.keys(harmoniesByInstrument);

  const fifths = originalDoc.querySelector("fifths")?.textContent || "0";
  const mode = originalDoc.querySelector("mode")?.textContent || "major";
  const beats = originalDoc.querySelector("beats")?.textContent || "4";
  const beatType = originalDoc.querySelector("beat-type")?.textContent || "4";
  const divisions = originalDoc.querySelector("divisions")?.textContent || "1";

  // Get original melody part name
  const originalPartName =
    originalDoc.querySelector("part-name")?.textContent || "Melody";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>${originalPartName}</part-name>
    </score-part>
`;

  instruments.forEach((instrument, index) => {
    const partId = `P${index + 2}`;
    xml += `    <score-part id="${partId}">
      <part-name>${instrument}</part-name>
    </score-part>
`;
  });

  xml += `  </part-list>
`;

  // Original melody part
  xml += `  <part id="P1">
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
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
`;

  melodyNotes.forEach((note) => {
    xml += createNoteXML(note, { clefSign: "G", clefLine: 2, minMidi: 40, maxMidi: 84, transposition: 0 });
  });

  xml += `    </measure>
  </part>
`;

  // Harmony parts
  instruments.forEach((instrument, index) => {
    const partId = `P${index + 2}`;
    const notes = harmoniesByInstrument[instrument];
    const config = INSTRUMENT_CONFIG[instrument] || INSTRUMENT_CONFIG["Other"];

    xml += `  <part id="${partId}">
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
          <sign>${config.clefSign}</sign>
          <line>${config.clefLine}</line>
        </clef>
      </attributes>
`;

    notes.forEach((note) => {
      xml += createNoteXML(note, config);
    });

    xml += `    </measure>
  </part>
`;
  });

  xml += `</score-partwise>`;

  return xml;
}

export function createCombinedPolyphonicXML(
  originalDoc: Document,
  melodicLines: Note[][],
  harmoniesByInstrument: Record<string, Note[]>,
  fifths: string,
  mode: string
): string {
  const instruments = Object.keys(harmoniesByInstrument);

  const beats = originalDoc.querySelector("beats")?.textContent || "4";
  const beatType = originalDoc.querySelector("beat-type")?.textContent || "4";
  const divisions = originalDoc.querySelector("divisions")?.textContent || "1";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
`;

  // Original polyphonic parts
  melodicLines.forEach((_, index) => {
    const partId = `P${index + 1}`;
    xml += `    <score-part id="${partId}">
      <part-name>Voice ${index + 1}</part-name>
    </score-part>
`;
  });

  // Harmony parts
  instruments.forEach((instrument, index) => {
    const partId = `P${melodicLines.length + index + 1}`;
    xml += `    <score-part id="${partId}">
      <part-name>${instrument}</part-name>
    </score-part>
`;
  });

  xml += `  </part-list>
`;

  // Original polyphonic parts
  melodicLines.forEach((notes, index) => {
    const partId = `P${index + 1}`;

    xml += `  <part id="${partId}">
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
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
`;

    notes.forEach((note) => {
      xml += createNoteXML(note, { clefSign: "G", clefLine: 2, minMidi: 40, maxMidi: 84, transposition: 0 });
    });

    xml += `    </measure>
  </part>
`;
  });

  // Harmony parts
  instruments.forEach((instrument, index) => {
    const partId = `P${melodicLines.length + index + 1}`;
    const notes = harmoniesByInstrument[instrument];
    const config = INSTRUMENT_CONFIG[instrument] || INSTRUMENT_CONFIG["Other"];

    xml += `  <part id="${partId}">
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
          <sign>${config.clefSign}</sign>
          <line>${config.clefLine}</line>
        </clef>
      </attributes>
`;

    notes.forEach((note) => {
      xml += createNoteXML(note, config);
    });

    xml += `    </measure>
  </part>
`;
  });

  xml += `</score-partwise>`;

  return xml;
}

function createNoteXML(note: Note, config: InstrumentConfig): string {
  if (note.pitch === -1) {
    return `      <note>
        <rest/>
        <duration>${note.duration}</duration>
      </note>
`;
  }

  const transposedMidi = note.pitch + config.transposition;
  const { step, octave, alter } = midiToStep(transposedMidi);

  let xml = `      <note>
        <pitch>
          <step>${step}</step>
`;

  if (alter !== 0) {
    xml += `          <alter>${alter}</alter>
`;
  }

  xml += `          <octave>${octave}</octave>
        </pitch>
        <duration>${note.duration}</duration>
      </note>
`;

  return xml;
}
