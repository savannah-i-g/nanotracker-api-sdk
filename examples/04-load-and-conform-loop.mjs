#!/usr/bin/env node
/* Example 4 — load a sample from the open project and snap it to N rows.
 *
 * Project-only — fails with noProject if no project is open.
 *
 * Usage: node examples/04-load-and-conform-loop.mjs <fileName> [slot] [rows]
 *   fileName  required, must exist in <project>/samples/
 *   slot      default 1
 *   rows      default 16  (one bar at the project's row count)
 */

import { health, assets, execute, bail } from "./_client.mjs";

const [fileName, slotArg, rowsArg] = process.argv.slice(2);
if (!fileName) {
  console.error("usage: node examples/04-load-and-conform-loop.mjs <fileName> [slot] [rows]");
  process.exit(2);
}
const slot = parseInt(slotArg ?? "1", 10);
const rows = parseInt(rowsArg ?? "16", 10);

const h = await health();
if (!h.pageConnected) { console.error("no tab connected"); process.exit(1); }

const list = await assets("list");
bail("assets.list", list);
console.log(`found ${list.data.length} sample file(s) in project samples/`);

const loaded = await assets("load", { slot, fileName });
bail("assets.load", loaded);
console.log(`loaded "${loaded.data.fileName}" into slot ${loaded.data.slot}`);
console.log(`  ${loaded.data.sample.numChannels}ch ${loaded.data.sample.sampleRate}Hz, ` +
            `${loaded.data.sample.frames} frames, ${loaded.data.sample.durationSeconds.toFixed(3)}s natural`);

const conformed = await execute(
  [{ op: "conformSampleToRows", sampleId: slot, rows }],
  { undoDescription: `conform ${fileName} to ${rows} rows` },
);
bail("execute conformSampleToRows", conformed);
console.log(`stretchRatio set so the sample plays for exactly ${rows} rows at the project's bpm/speed.`);
