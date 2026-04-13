---
name: api-author-pattern
description: Compose a batch of nanoTracker pattern mutations through the Local API. Cells, rows, structural ops, order list, tempo. One batch is one undo entry. Always include opts.undoDescription. Dry-run destructive batches first.
---

# Author a pattern via the Local API

## When to use

Any time you're writing pattern data — placing notes, building a
drum loop, copying / shifting cells, creating new patterns,
arranging the order list, changing tempo. All of this goes through
`nanotracker_execute`.

## The contract

```jsonc
nanotracker_execute {
  "commands": [ /* one or more LocalApiCommand */ ],
  "opts": { "undoDescription": "human-readable label", "dryRun": false }
}
```

- `opts.undoDescription` is **required** unless `dryRun` is true.
- Whole batch is validated, then either fully applied or fully
  rejected. One undo entry per batch.
- Hard limits: 10,000 commands, 64 patterns created, 1 MiB payload,
  20 batches/sec.

## Common cell ops

```jsonc
{ "op": "setCell",    "patternId": 0, "row": 0,  "channel": 0,
  "cell": { "note": 49, "instrument": 1, "volume": 64 } }

{ "op": "setNoteOff", "patternId": 0, "row": 8,  "channel": 0 }

{ "op": "clearCell",  "patternId": 0, "row": 0,  "channel": 0 }

{ "op": "setRange",   "patternId": 0, "rowStart": 0,
  "channels": [0, 1, 2],
  "cells": [
    [ {"note": 49, "instrument": 1, "volume": 64}, {}, {} ],
    [ {}, {"note": 53, "instrument": 1, "volume": 48}, {} ]
  ] }
```

`setRange` is much cheaper than many `setCell` commands when you're
filling a region. The `cells` array is `[row][channelIndex]` where
`channelIndex` indexes into the `channels` array, not into the
project's channel list.

## Note encoding

- Tracker note 1 = C-0, note 49 = C-4 (middle C, MIDI 60), note 97
  = note-off, note 0 = empty.
- `tracker = midi - 11`.
- `volume: 0xFF` means "use the sample's default" — not 255 dB.

## Note-offs

A note-off ends the currently-playing voice on a channel. In the pattern
editor this is the `==` cell. Use the dedicated `setNoteOff` op:

```jsonc
{ "op": "setNoteOff", "patternId": 0, "row": 48, "channel": 0 }
```

It writes the canonical cell
`{ note: 97, instrument: 0, volume: 0xFF, effect: 0 }` — the same shape
you'd place by typing `==`. `setCell` with `{ note: 97 }` works too but
merges — the old `instrument` and `volume` fields stay on the cell,
which reads as a note-off that also holds an instrument, which is
almost never what you want. Prefer `setNoteOff`.

For a sample without envelope shaping, note-off cuts the voice
immediately. For envelope-bearing instruments (plugin synths,
AudioWorklets with release) it starts the release phase.

## Structural ops

```jsonc
{ "op": "insertRow",     "patternId": 0, "at": 16, "count": 16 }
{ "op": "deleteRow",     "patternId": 0, "at": 16, "count": 16 }
{ "op": "resizePattern", "patternId": 0, "rows": 32 }
{ "op": "createPattern", "name": "BRIDGE", "rows": 32 }   // returned id in BatchResult.createdPatternIds
{ "op": "renamePattern", "patternId": 1, "name": "VERSE" }
{ "op": "deletePattern", "patternId": 2 }
```

## Order list + tempo

```jsonc
{ "op": "setOrderList",  "orderList": [0, 1, 0, 2] }
{ "op": "insertOrderAt", "index": 2, "patternId": 1 }
{ "op": "removeOrderAt", "index": 3 }
{ "op": "setBpm",        "value": 140 }
{ "op": "setSpeed",      "value": 6 }
{ "op": "setChannels",   "count": 8 }   // reshapes every pattern; dryRun first
```

## Dry-run for destructive batches

If your batch will overwrite cells in a pattern that already has
data, dry-run first:

```jsonc
nanotracker_execute {
  "commands": [...],
  "opts": { "dryRun": true }
}
```

Returns `{ ok: true, dryRunSummary: { ... } }` without mutating.
Show the user what would change before sending the real batch.

## undoDescription style

Aim for a short verb-led label: `"add kick on 1, 5, 9, 13"`,
`"shift verse down 4 rows"`, `"set bpm 140"`. Avoid generic labels
like `"api batch"` — the user reads them in the undo log.

## Validation errors

If a command is invalid, you get back:

```jsonc
{ "ok": false, "errors": [{ "index": 3, "code": "outOfBounds",
                            "message": "row 64 out of range (0..63)" }] }
```

The `index` is the position in your `commands` array. Fix that
specific command and re-send.

## Don't reference newly-created ids in the same batch

Validation runs against the PRE-batch state. So a batch that creates
a pattern and then puts it in the order list won't work — split
into two batches.
