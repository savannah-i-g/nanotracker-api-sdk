#!/usr/bin/env node
/* Example 1 — inspect a live nanoTracker session.
 * Run from repo root: node examples/01-inspect-state.mjs
 */

import { health, read, bail } from "./_client.mjs";

const h = await health();
console.log("relay health:", h);
if (!h.pageConnected) {
  console.error("no nanoTracker tab connected — open the page and toggle FILE > API…");
  process.exit(1);
}

const summary = await read({ op: "getProjectSummary" });
bail("getProjectSummary", summary);
console.log("\nproject:", summary.data);

const list = await read({ op: "getPatternList" });
bail("getPatternList", list);
console.log("\npatterns:");
console.table(list.data);

if (list.data.length > 0) {
  const first = list.data[0];
  const range = await read({
    op: "getRange", patternId: first.id, rowStart: 0, rowEnd: Math.min(8, first.rows),
  });
  bail("getRange", range);
  console.log(`\nfirst 8 rows of pattern ${first.id} (${first.name}):`);
  for (let r = 0; r < range.data.rows.length; r++) {
    const row = range.data.rows[r];
    const cells = row.map(c =>
      c.note === 0 ? "···" :
      c.note === 97 ? "OFF" :
      `n${c.note.toString().padStart(2, "0")}/i${c.instrument.toString(16).toUpperCase().padStart(2, "0")}`,
    );
    console.log(`  R${r.toString().padStart(2, "0")}  ${cells.join("  ")}`);
  }
}

const samples = await read({ op: "getSamples" });
bail("getSamples", samples);
console.log(`\n${samples.data.length} sample(s) loaded`);
