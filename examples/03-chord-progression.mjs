#!/usr/bin/env node
/* Example 3 — write a I-V-vi-IV chord progression across channels 0..2.
 * 4 chords, 4 rows each = 16 rows. Uses instrument slot 1.
 *
 * Run: node examples/03-chord-progression.mjs
 */

import { health, execute, bail } from "./_client.mjs";

const h = await health();
if (!h.pageConnected) { console.error("no tab connected"); process.exit(1); }

// Triads in C major. Tracker note 49 = C-4 = MIDI 60.
const C = [49, 53, 56];   // C  E  G
const G = [44, 51, 56];   // G  D  G  (close voicing)
const A = [46, 49, 53];   // A  C  E
const F = [42, 49, 53];   // F  C  E

const chords = [C, G, A, F];

const cmds = [];
chords.forEach((triad, i) => {
  triad.forEach((note, ch) => {
    cmds.push({
      op: "setCell", patternId: 0, row: i * 4, channel: ch,
      cell: { note, instrument: 1, volume: 56 },
    });
  });
});

const result = await execute(cmds, { undoDescription: "example: I-V-vi-IV in C" });
bail("execute", result);
console.log(`progression placed across rows 0/4/8/12, channels 0..2 (${result.commandsApplied} commands).`);
