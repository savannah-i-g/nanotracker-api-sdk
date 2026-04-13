---
name: api-inspect-state
description: Read state from a live nanoTracker session through the Local API. Pick the cheapest query for the question, never load full patterns when a slice would do, resolve patternId via getPatternList before any pattern op.
version: 1.0.0
metadata:
  hermes:
    tags: [nanotracker, api, read, query]
    category: nanotracker-api
    requires_toolsets: [terminal, files]
---


# Inspect a live nanoTracker session

## When to use

Use this any time you need to know what's in the project — what
patterns exist, what cells they hold, what samples are loaded, what
the song tempo is — before suggesting or making a change.

## Cheap before expensive

Call queries in this order. Stop as soon as you have what you need.

1. `nanotracker_health` — confirm the page is connected.
2. `nanotracker_read { op: "getProjectSummary" }` — bpm, speed,
   channels, pattern count, sample count.
3. `nanotracker_read { op: "getPatternList" }` — every pattern's
   `id`, `name`, row count, filled-cell count, order-list positions.
4. `nanotracker_read { op: "getRange", patternId, rowStart, rowEnd, channels? }`
   — slice of cells. Prefer this over `getPattern` for surveys.
5. `nanotracker_read { op: "getPattern", patternId }` — only when
   you really need every cell of a pattern.

## patternId, not order-list index

Pattern ids are persistent. Order-list positions are not. The order
list maps positions → pattern ids; multiple positions can reference
the same pattern. Always resolve via `getPatternList` first.

```jsonc
// WRONG — assumes order list position 0 is pattern id 0
nanotracker_read { "op": "getPattern", "patternId": 0 }

// RIGHT — discover, then read
const list  = nanotracker_read { "op": "getPatternList" }
const first = list.data[0].id
nanotracker_read { "op": "getPattern", "patternId": first }
```

## Cell shape

```ts
{
  note:        number   // 0 empty, 1-96 = C-0..B-7, 97 = note-off
  instrument:  number   // 0 empty, 1-31 = sample slot
  volume:      number   // 0xFF = use default, 0x00-0x40 = override
  effect:      number
  effectParam: number
}
```

`volume === 0xFF` means "use the sample's stored default", not 255 dB.
Don't render it as 255 in user-facing output.

## Channels are 0-indexed

`channels[0]` is the leftmost track. `project.channels` is the count
(1..32).

## Empty cells are common and not a problem

Most cells in a fresh pattern have `note: 0, instrument: 0, volume:
0xFF, effect: 0, effectParam: 0`. Treat that as "empty" — don't
report it as data.

## Skip subscribe; poll cheap reads

External callers can't subscribe to mutations. To detect changes,
poll `getProjectSummary` (returns instantly) and compare. The page
ALSO exposes `subscribe` to in-page code, but the relay doesn't
forward those events.

## Schema is always available

```sh
nanotracker_read { "op": "getSchema" }
```

returns the structured list of every command, query, and field.
Useful when you need to know whether an op exists or what fields it
takes.
