# Protocol reference

The full surface of the nanoTracker Local API as exposed through the
relay's HTTP endpoints (and equivalently through the MCP server tools
and the CLI).

If you'd rather have a machine-readable form, run:

```sh
node tools/cli.mjs read getSchema
```

## Three surfaces

### `read(query)` — sync queries

Returns `{ ok: true, data }` or `{ ok: false, errors: LocalApiError[] }`.

| op                  | Args                                                          | Returns                                                                       |
|---------------------|---------------------------------------------------------------|-------------------------------------------------------------------------------|
| `getProjectSummary` | —                                                             | `{ name, bpm, speed, channels, rowsPerPattern, patternCount, orderListLength, sampleCount, instrumentTableSize }` |
| `getPatternList`    | —                                                             | `Array<{ id, name, rows, filledCells, orderListPositions }>`                  |
| `getPattern`        | `patternId`                                                   | `{ id, name, rows: TrackerCell[][] }`                                         |
| `getRange`          | `patternId, rowStart, rowEnd, channels?`                      | `{ patternId, rowStart, rowEnd, channels, rows: TrackerCell[][] }`            |
| `getOrderList`      | —                                                             | `number[]` (pattern ids)                                                      |
| `getSamples`        | —                                                             | `Array<TrackerSample>` (without `originalData`)                               |
| `getInstrumentTable`| —                                                             | `Array<InstrumentTableEntry>`                                                 |
| `getSeqLayer`       | `patternId, channel, layerIndex`                              | `{ instrument, enabled, notes: SequenceNote[] }`                              |
| `getSeqLayerList`   | `patternId`                                                   | `Array<{ channel, layerIndex, instrument, enabled, noteCount }>`              |
| `getSchema`         | —                                                             | This document, structured.                                                    |

### `execute(commands, opts)` — batched mutations

`commands: LocalApiCommand[]` — see below.
`opts: { undoDescription: string; dryRun?: boolean }`.

Returns `{ ok: true, commandsApplied, createdPatternIds, dryRunSummary? }`
or `{ ok: false, errors: LocalApiError[] }`.

Atomic: validate-all-then-apply. One bad command rejects every command.
One batch = one undo entry labelled by `undoDescription`.

### `assets.{list,load,unload}(args)` — async, project-only

Returns `{ ok: true, data }` or `{ ok: false, errors: [...] }`.
Returns `{ code: "noProject" }` when no project is open.

| Method   | Args                       | Returns                                                                |
|----------|----------------------------|------------------------------------------------------------------------|
| `list`   | —                          | `Array<{ name, size?, lastModified? }>`                                |
| `load`   | `{ slot, fileName }`       | `{ slot, fileName, sample: { id, name, sampleRate, numChannels, frames, durationSeconds } }` |
| `unload` | `{ slot }`                 | `{ slot }`                                                             |

## TrackerCell

The cell shape used by every pattern op:

```ts
{
  note:        number   // 0 empty, 1-96 = C-0..B-7, 97 = note-off
  instrument:  number   // 0 empty, 1-31 = sample slot
  volume:      number   // 0xFF = use sample default, 0x00-0x40 = override
  effect:      number   // 0x0-0xF
  effectParam: number   // 0x00-0xFF
  boundIndex?: number   // 0..15, only consulted when instrument === 0
}
```

`Partial<TrackerCell>` accepted by `setCell` / `setRange` — undefined
fields preserve existing values.

Note encoding:
- tracker note 1 = C-0
- tracker note 49 = C-4 (middle C, MIDI 60)
- tracker note 97 = note-off
- formula: `tracker = midi - 11`

See [`reference/note-numbers.md`](reference/note-numbers.md) for a table.

### Note-offs

A note-off ends the voice currently playing on a channel. Sample voices
without envelope shaping cut immediately; plugin instruments with
release curves enter their release phase.

The canonical note-off cell is `{ note: 97, instrument: 0, volume:
0xFF, effect: 0, effectParam: 0 }` — same shape as typing `==` in the
pattern editor. Use the dedicated `setNoteOff` op:

```jsonc
{ "op": "setNoteOff", "patternId": 0, "row": 48, "channel": 0 }
```

`setCell` with `{ note: 97 }` works too but it merges — the old
`instrument` and `volume` fields stay on the cell, which is almost
never what you want. Prefer `setNoteOff`.

## Commands

### Pattern cells + rows

| op              | Fields                                                                                          |
|-----------------|-------------------------------------------------------------------------------------------------|
| `setCell`       | `patternId, row, channel, cell: Partial<TrackerCell>`                                           |
| `clearCell`     | `patternId, row, channel`                                                                       |
| `setNoteOff`    | `patternId, row, channel` — writes canonical note-off cell (see below)                           |
| `setRange`      | `patternId, rowStart, channels: number[], cells: Partial<TrackerCell>[][]` — outer rows, inner = channels.length |
| `insertRow`     | `patternId, at, count?` (default 1)                                                             |
| `deleteRow`     | `patternId, at, count?` (default 1; pattern must keep ≥ 1 row)                                  |
| `resizePattern` | `patternId, rows` (1..256)                                                                      |
| `createPattern` | `name?, rows?` — id returned in `BatchResult.createdPatternIds`                                 |
| `deletePattern` | `patternId` — at least 1 pattern must remain                                                    |
| `renamePattern` | `patternId, name`                                                                               |

### Order list + tempo

| op              | Fields                                                                                |
|-----------------|---------------------------------------------------------------------------------------|
| `setOrderList`  | `orderList: number[]` — every id must exist in `project.patterns`                     |
| `insertOrderAt` | `index, patternId`                                                                    |
| `removeOrderAt` | `index` — list must keep ≥ 1 entry                                                    |
| `setBpm`        | `value` (32..999)                                                                     |
| `setSpeed`      | `value` (1..31, ticks per row)                                                        |
| `setChannels`   | `count` (1..32) — reshapes every pattern; shrink can drop cells; **dryRun first**     |

### Samples + instrument table

| op                       | Fields                                                                  |
|--------------------------|-------------------------------------------------------------------------|
| `renameSample`           | `sampleId, name`                                                        |
| `setSampleMeta`          | `sampleId, patch: SampleMetaPatch` (any of `name`, `baseNote`, `finetune`, `volume`, `pan`, `loopStart`, `loopLength`, `stretchRatio`, `category`) |
| `setSampleStretchRatio`  | `sampleId, ratio` (0.01..100; 1 = no stretch)                           |
| `conformSampleToRows`    | `sampleId, rows, patternId?` — computes the stretchRatio that makes the sample play for exactly `rows` rows at the project's current bpm/speed |
| `setInstrumentSlot`      | `slot, entry: InstrumentTableEntry`                                     |
| `clearInstrumentSlot`    | `slot` — resets to default sample entry                                 |

### Sequence layer (piano roll)

| op                          | Fields                                                                                                 |
|-----------------------------|--------------------------------------------------------------------------------------------------------|
| `addSeqNote`                | `patternId, channel, layerIndex, note: SequenceNote`                                                   |
| `removeSeqNote`             | `patternId, channel, layerIndex, noteIndex`                                                            |
| `updateSeqNote`             | `patternId, channel, layerIndex, noteIndex, note` — re-sorts if startTick changed                      |
| `addSeqLayer`               | `patternId, channel` — max 4 layers per channel                                                        |
| `removeSeqLayer`            | `patternId, channel, layerIndex` — at least 1 layer must remain                                        |
| `setSeqLayerInstrument`     | `patternId, channel, layerIndex, instrument` (1-based slot, 0 = silent)                                |
| `setSeqLayerEnabled`        | `patternId, channel, layerIndex, enabled`                                                              |

`SequenceNote = { pitch: 0..127, startTick, durationTicks: ≥ 1, velocity: 0..127 }`.
A "tick" is one engine tick: `1 row = project.speed ticks`. So at
`speed = 6`, row 4 sub-tick 0 is `startTick = 24`.

## Errors

`LocalApiError = { index: number; code: LocalApiErrorCode; message: string }`.
`index` is the position of the offending command in the batch, or `-1`
for batch-level errors.

| Code                       | Means                                                              |
|----------------------------|--------------------------------------------------------------------|
| `disabled`                 | API is off — user hasn't toggled it in FILE > API…                 |
| `rateLimited`              | More than 20 batches in the last second                            |
| `invalidOp`                | Unknown `op`                                                       |
| `invalidField`             | Field missing or wrong type                                        |
| `outOfBounds`              | Index outside the valid range                                      |
| `duplicateId`              | (reserved)                                                         |
| `notFound`                 | Pattern / sample / layer not found                                 |
| `limitExceeded`            | Hit a hard cap (commands, patterns, layers per channel)            |
| `payloadTooLarge`          | > 1 MiB JSON body                                                  |
| `missingUndoDescription`   | `opts.undoDescription` not provided on a non-dryRun batch          |
| `readOnly`                 | (reserved)                                                         |
| `noProject`                | An assets call was made without a project open                     |
| `ioError`                  | An assets call failed at the filesystem layer                      |
| `internal`                 | Anything else                                                      |

## Limits

```js
maxCommandsPerBatch:  10000
maxPatternsCreated:   64
maxPayloadBytes:      1048576    // 1 MiB
maxBatchesPerSecond:  20
```

## Subscriptions

`subscribe(fn)` is page-side only: it fires a callback after every
mutation (UI / API / undo). External callers can't subscribe directly
through the relay; instead, poll cheap reads (`getProjectSummary`,
`getPatternList`) and diff.

See [`AGENTS-OVERVIEW.md`](AGENTS-OVERVIEW.md) for the most compact
summary fit for an LLM context window.
