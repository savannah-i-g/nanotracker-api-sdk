# Agent overview — one page

Compact orientation for an LLM with limited context budget. For depth
see [`PROTOCOL.md`](PROTOCOL.md).

## What is this

`window.nanoTracker` is a JavaScript surface inside the browser tab
of [nanoTracker](https://federatedindustrial.com/tracker), a music
tracker. You drive it through a local relay using MCP tools, an HTTP
API, or a CLI.

## Six MCP tools

```
nanotracker_health         { } → { pageConnected, transport, ... }
nanotracker_read           { op, ... } → { ok, data | errors }
nanotracker_execute        { commands, opts } → { ok, commandsApplied, ... }
nanotracker_assets_list    { } → { ok, data: [{name, size, ...}] }
nanotracker_assets_load    { slot, fileName } → { ok, data: { sample } }
nanotracker_assets_unload  { slot } → { ok }
```

## First call

Always run `nanotracker_health` first if uncertain:

```jsonc
{ "pageConnected": true, "transport": "ws", "activeTabId": "...", "tabCount": 1 }
```

If `pageConnected: false`: tell the user to open the tab and toggle
**FILE > API…** + **Connect to local relay**. Don't loop.

## Reading state — cheapest first

```
getProjectSummary  — bpm, speed, pattern count, sample count
getPatternList     — every pattern's id / name / row count / fillednes
getRange           — slice of cells (cheaper than getPattern)
getPattern         — full pattern (only if you really need every cell)
getSamples         — sample metadata
getInstrumentTable — slot map
getSeqLayerList    — piano-roll layer summaries
```

Use `patternId` from `getPatternList`, NOT an order-list index.

## Writing — one batch, one undo

```jsonc
{
  "commands": [
    { "op": "setCell", "patternId": 0, "row": 0, "channel": 0,
      "cell": { "note": 49, "instrument": 1, "volume": 64 } }
  ],
  "opts": { "undoDescription": "kick on 1" }
}
```

Rules:
- `opts.undoDescription` REQUIRED unless `dryRun: true`.
- All-or-nothing: any invalid command rejects the whole batch.
- Limits: 10k commands, 1 MiB payload, 20 batches/sec.

## Note encoding

| Tracker | Note  | MIDI |
|---------|-------|------|
| 1       | C-0   | 12   |
| 49      | C-4   | 60   |
| 60      | B-4   | 71   |
| 96      | B-7   | 107  |
| 97      | OFF   | —    |

Formula: `tracker = midi - 11`.

## Sample loading

```
nanotracker_assets_list                            → see what's available
nanotracker_assets_load { slot, fileName }         → install
nanotracker_execute conformSampleToRows N          → snap to N rows
```

Returns `{ code: "noProject" }` if no project is open. Tell the user
to open one via PROJECT > EXPLORER. Don't retry.

## Error codes

`disabled, rateLimited, invalidOp, invalidField, outOfBounds,
duplicateId, notFound, limitExceeded, payloadTooLarge,
missingUndoDescription, readOnly, noProject, ioError, internal`.

`index: -1` means batch-level; otherwise it's the position of the
offending command.

## Last resort

Schema is always available:

```
nanotracker_read { op: "getSchema" }
```

returns the structured list of every command, query, field, and limit.
