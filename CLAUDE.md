# nanoTracker API SDK — Claude orientation

You are helping a user drive a live [nanoTracker](https://federatedindustrial.com/tracker)
session through its Local API. This file gives you the context you need
to read state and write changes correctly without grepping the
nanoTracker codebase.

## What the API is

`window.nanoTracker` is a JavaScript surface attached to the tracker's
browser tab. It exposes three methods:

```ts
window.nanoTracker.read(query)               // sync queries
window.nanoTracker.execute(commands, opts)   // batched mutations
window.nanoTracker.assets.list/load/unload   // async, project-only
```

You don't reach this surface directly. The user runs a small **relay
server** locally; you call its HTTP endpoints (or, if you're MCP-aware,
the bundled MCP server). The relay forwards your request to the open
tab over WebSocket, runs it through the same validator the in-tab UI
uses, and returns the result.

```
you ──MCP/HTTP──> 127.0.0.1:9311 (relay) ──WS──> nanoTracker tab
                                              ↓
                                  window.nanoTracker
```

The user must turn the API on (FILE > API…) and connect the relay
before any request will succeed. If they haven't, you'll see
`{ ok: false, errors: [{ code: "disabled" }] }` — politely tell the
user, don't retry in a tight loop.

## How to use this SDK

If you're an MCP-aware agent (Claude Code, Cursor, Cline, Continue,
Codex, opencode, openclaude, Aider, Gemini CLI), install the MCP
server snippet from [`adapters/`](adapters/). Six tools appear:

- `nanotracker_read`         — query state
- `nanotracker_execute`      — apply a batch
- `nanotracker_assets_list`  — list project samples
- `nanotracker_assets_load`  — load a sample into a slot
- `nanotracker_assets_unload`— clear a slot
- `nanotracker_health`       — relay status

If you're not MCP-aware, shell out:

```sh
node tools/cli.mjs read getProjectSummary
node tools/cli.mjs execute '[{"op":"setBpm","value":140}]' '{"undoDescription":"x"}'
```

## Hard rules (the relay / page enforce these)

1. **`opts.undoDescription` is required** for every non-dryRun batch.
   Pick something a human reading the undo log would understand.
2. **`patternId` is the persistent `TrackerPattern.id`, NOT an
   order-list index.** Use `getPatternList` first to map; use
   `setOrderList` / `insertOrderAt` to arrange playback.
3. **Sample binary upload is out of scope.** Only metadata edits on
   already-loaded samples (via `setSampleMeta` / `setSampleStretchRatio`
   / `conformSampleToRows`) and `assets.load` from the project's
   own samples directory.
4. **Validation is two-phase.** The whole batch is validated against
   pre-batch state; one bad command rejects every command. Use
   `dryRun: true` first if you're not certain.
5. **`assets.*` requires a project to be open.** Returns
   `{ code: "noProject" }` otherwise. Do not retry — tell the user to
   open one via PROJECT > EXPLORER.
6. **Hard limits**: 10,000 commands/batch, 64 patterns created/batch,
   1 MiB payload, 20 batches/sec.

`tools/cli.mjs read getSchema` returns the full machine-readable schema
including every command, query, and field type.

## Reading state

The right order of cheapness:

| Want                          | Use                                       |
|-------------------------------|-------------------------------------------|
| "what's there"                | `getProjectSummary`                       |
| "list of patterns"            | `getPatternList`                          |
| "one pattern's cells"         | `getPattern { patternId }`                |
| "cell slice"                  | `getRange { patternId, rowStart, rowEnd, channels? }` — **prefer over `getPattern` for surveys, cheaper** |
| "what samples are loaded"     | `getSamples`                              |
| "what files COULD load"       | `nanotracker_assets_list`                 |
| "instrument table"            | `getInstrumentTable`                      |
| "piano-roll layers"           | `getSeqLayerList { patternId }` then `getSeqLayer` |

## Writing state

Compose commands as a JSON array. One batch = one undo step.
Each command's shape is documented in
[`docs/PROTOCOL.md`](docs/PROTOCOL.md). A few common shapes:

```jsonc
{ "op": "setCell",  "patternId": 0, "row": 0, "channel": 0,
  "cell": { "note": 49, "instrument": 1, "volume": 64 } }

{ "op": "setNoteOff", "patternId": 0, "row": 8, "channel": 0 }

{ "op": "setRange", "patternId": 0, "rowStart": 0,
  "channels": [0, 1],
  "cells": [
    [ { "note": 49, "instrument": 1, "volume": 64 }, {} ],
    [ {}, { "note": 53, "instrument": 2, "volume": 48 } ]
  ] }

{ "op": "createPattern", "name": "BRIDGE", "rows": 32 }
{ "op": "setOrderList",  "orderList": [0, 1, 0, 2] }
{ "op": "setBpm",        "value": 140 }
```

### Note-offs

A note-off ends the voice currently playing on a channel. Samples
without envelope shaping cut immediately; envelope-bearing instruments
enter release. Prefer the dedicated `setNoteOff` op — `setCell` with
`{ note: 97 }` works but leaves the neighbouring instrument/volume
fields in place, which is almost never what you want. `setNoteOff`
writes the canonical shape
`{ note: 97, instrument: 0, volume: 0xFF, effect: 0 }` — identical
to typing `==` in the pattern editor.

Note number encoding: tracker note 1 = C-0, note 49 = C-4 (middle C),
note 97 = note-off. MIDI 60 = tracker 49. The cheatsheet is at
[`docs/reference/note-numbers.md`](docs/reference/note-numbers.md).

## Loading samples

Project-only flow:

```
nanotracker_assets_list                              → recursive file list
nanotracker_assets_load   { slot, fileName }         → loaded (fileName can contain "/")
nanotracker_execute       conformSampleToRows N      → snap to N rows
```

`conformSampleToRows` computes the `stretchRatio` such that the
sample plays for exactly N rows at the project's current bpm/speed.
Use this for drum loops that should fit one bar, two bars, etc.

### Subdirectories

`assets.list` walks `<project>/samples/` recursively (max depth 8)
and returns entries with full relative paths. Each entry has
`{ name, leafName, directory, size?, lastModified? }`:

- `name` is the path, forward-slash delimited — pass it verbatim to
  `assets.load`.
- `leafName` is just the filename.
- `directory` is the parent folder (empty string at top level).

So a library with `samples/Amens/Blasta 170 BPM.wav` is reachable via:

```jsonc
{ "method": "load", "args": { "slot": 1, "fileName": "Amens/Blasta 170 BPM.wav" } }
```

## Subscribing

`subscribe(fn)` fires after every project mutation (UI, API, undo).
Useful for live monitoring; **the page** holds the subscription, so
external callers can't subscribe directly. Instead, periodically call
`getProjectSummary` (cheap) and diff its `revision` against the last
seen value.

## Skills available

- [`.claude/skills/api-inspect-state/`](.claude/skills/api-inspect-state/SKILL.md)
- [`.claude/skills/api-author-pattern/`](.claude/skills/api-author-pattern/SKILL.md)
- [`.claude/skills/api-load-sample/`](.claude/skills/api-load-sample/SKILL.md)
- [`.claude/skills/api-subscribe-stream/`](.claude/skills/api-subscribe-stream/SKILL.md)

The same set is mirrored under [`.hermes/skills/`](.hermes/) and
[`.agents/skills/`](.agents/) — bodies identical, frontmatter per
target agent.

## Slash commands

- `/api-execute <jsonCommands> [jsonOpts]` — wraps `cli.mjs execute`
- `/api-read <op> [jsonArgs]` — wraps `cli.mjs read`
- `/api-status` — wraps `cli.mjs health` and surfaces relay state

## Common pitfalls

- **Calling before the user enables the API.** Always poll
  `nanotracker_health` first if uncertain.
- **Confusing `patternId` with order-list index.** Always go via
  `getPatternList`.
- **Not setting `undoDescription`.** Batch is rejected with
  `missingUndoDescription`.
- **Skipping `dryRun` on a destructive batch.** If you're about to
  rewrite cells in a pattern that already has notes, dry-run first
  and tell the user what would change.
- **Calling `assets.load` without a project open.** You'll get
  `noProject`. Don't retry; ask the user to open one.

## Reference docs

- [`docs/PROTOCOL.md`](docs/PROTOCOL.md) — every command + query
- [`docs/ASSETS.md`](docs/ASSETS.md) — the project-only assets surface
- [`docs/SECURITY.md`](docs/SECURITY.md) — token, audit log, limits
- [`docs/BROWSER-COMPAT.md`](docs/BROWSER-COMPAT.md) — WS / long-poll
- [`docs/AGENTS-OVERVIEW.md`](docs/AGENTS-OVERVIEW.md) — one-page
  orientation, useful when context is tight
- [`docs/reference/note-numbers.md`](docs/reference/note-numbers.md)
