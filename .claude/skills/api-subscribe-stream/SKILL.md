---
name: api-subscribe-stream
description: Detect changes in a live nanoTracker session from external code. The page-side subscribe() does not cross the relay; external callers must poll cheap reads. This skill covers how to do that without DoS-ing the relay.
---

# Subscribe to nanoTracker changes (from outside the page)

## When to use

You need to react to changes the user makes in the editor (or that
another agent makes via the API) — for example, regenerating a
visualisation, syncing to an external sequencer, logging edits.

## Why subscribe doesn't cross the relay

`window.nanoTracker.subscribe(fn)` exists in the page, but it fires
local React effects. The relay forwards request/reply pairs, not
event streams. So external callers must **poll**.

The good news: `getProjectSummary` is dirt cheap. A 1 Hz poll is
totally fine. A 10 Hz poll is fine for small projects. Don't go
faster — the relay's rate limit is 20 batches/sec across all
sources.

## Cheap-revision pattern

```js
let lastSig = "";
async function poll() {
  const out = await call("read", { op: "getProjectSummary" });
  const sig = JSON.stringify(out.data);
  if (sig !== lastSig) {
    lastSig = sig;
    onChange(out.data);
  }
  setTimeout(poll, 1000);
}
poll();
```

`getProjectSummary` returns scalars — bpm, speed, channels,
patternCount, orderListLength, sampleCount, instrumentTableSize. The
JSON is short and stable; comparing as a string works.

## Detecting cell-level changes

Project summary catches structural changes (pattern added, bpm
changed). It doesn't catch a single cell edit. For finer detection,
add `getPatternList`:

```js
const list = await call("read", { op: "getPatternList" });
const fp   = list.data.map(p => `${p.id}:${p.filledCells}`).join(",");
```

`filledCells` increments/decrements with every cell edit. Combine
with the summary signature to catch most changes cheaply.

## Cell-exact diffing

If you really need to know which cell changed, you have to fetch the
range and diff client-side. Do that lazily — only when one of the
cheaper signatures has changed.

## Don't busy-loop on errors

If the page disconnects you'll start seeing errors with
`code: "internal", message: "no nanoTracker tab connected"`. Back
off:

```js
let backoff = 1000;
async function poll() {
  try {
    /* ... */
    backoff = 1000;
  } catch (e) {
    backoff = Math.min(backoff * 2, 30000);
  }
  setTimeout(poll, backoff);
}
```

## Health checks

`nanotracker_health` is the one endpoint that doesn't require the
token, so it's safe to poll even if the user has rotated keys. Use
it to decide whether the connection is recoverable.

## Skip if you're inside the page

This whole skill is for external callers. Page-internal code (browser
extensions, in-tab scripts) should call `window.nanoTracker.subscribe`
directly — far more efficient than polling.
