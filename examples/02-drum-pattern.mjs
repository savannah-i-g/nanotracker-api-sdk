#!/usr/bin/env node
/* Example 2 — write a 4-on-the-floor drum pattern across channels 0..2.
 * Assumes pattern 0 has at least 16 rows and at least 3 channels.
 * Loaded samples in slots 1 (kick), 2 (snare), 3 (hat) play, but the
 * pattern data lands either way.
 *
 * Run: node examples/02-drum-pattern.mjs
 */

import { health, execute, bail } from "./_client.mjs";

const h = await health();
if (!h.pageConnected) { console.error("no tab connected"); process.exit(1); }

const KICK  = 25;   // tracker C-2 (close to typical kick)
const SNARE = 27;
const HAT   = 31;

const cmds = [];
for (let i = 0; i < 16; i += 4) cmds.push({ op: "setCell", patternId: 0, row: i,     channel: 0, cell: { note: KICK,  instrument: 1, volume: 64 } });
for (let i = 4; i < 16; i += 8) cmds.push({ op: "setCell", patternId: 0, row: i,     channel: 1, cell: { note: SNARE, instrument: 2, volume: 64 } });
for (let i = 2; i < 16; i += 2) cmds.push({ op: "setCell", patternId: 0, row: i,     channel: 2, cell: { note: HAT,   instrument: 3, volume: 40 } });

const result = await execute(cmds, { undoDescription: "example: 4-on-the-floor" });
bail("execute", result);
console.log(`applied ${result.commandsApplied} commands; one undo entry.`);
