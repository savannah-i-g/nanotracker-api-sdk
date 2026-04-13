#!/usr/bin/env node
/* Example 5 — poll the project for changes and react.
 *
 * subscribe() is page-side only (doesn't cross the relay). External
 * callers poll the cheapest read (`getProjectSummary` + `getPatternList`)
 * and diff. Default 1 Hz, well below the 20 batches/sec rate limit.
 *
 * Run: node examples/05-subscribe-stream.mjs   (Ctrl-C to stop)
 */

import { health, read } from "./_client.mjs";

let lastSig = "";
let backoff = 1000;

async function tick() {
  try {
    const h = await health();
    if (!h.pageConnected) {
      console.log(`[${new Date().toISOString()}] page disconnected`);
      backoff = Math.min(backoff * 2, 30000);
    } else {
      const [s, l] = await Promise.all([
        read({ op: "getProjectSummary" }),
        read({ op: "getPatternList" }),
      ]);
      const sig = JSON.stringify({
        summary: s.data,
        patternFingerprints: l.data?.map(p => `${p.id}:${p.filledCells}`).join(","),
      });
      if (sig !== lastSig) {
        lastSig = sig;
        console.log(`[${new Date().toISOString()}] change detected`);
        console.log("  summary:", s.data);
      }
      backoff = 1000;
    }
  } catch (e) {
    console.error(`[${new Date().toISOString()}] poll failed: ${e instanceof Error ? e.message : e}`);
    backoff = Math.min(backoff * 2, 30000);
  } finally {
    setTimeout(tick, backoff);
  }
}

console.log("polling every 1s — Ctrl-C to stop");
tick();
