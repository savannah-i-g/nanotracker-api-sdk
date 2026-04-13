---
name: api-load-sample
description: Load a sample from the open project into a tracker instrument slot, then optionally conform it to a specific row count. Project-only — fails with noProject if no project is open. Combine assets.list + assets.load + execute(conformSampleToRows).
---

# Load a sample via the Local API

## When to use

The user has files in `<project>/samples/` (or wants to know what's
there) and wants to bring one into an instrument slot, optionally
snapping its length to a number of rows.

## Project-required

Every call in this flow returns `{ ok: false, errors:
[{ code: "noProject" }] }` if no project is open. Tell the user to
open one via PROJECT > EXPLORER. **Don't retry.**

## Three steps

```sh
# 1. See what's available
nanotracker_assets_list

# 2. Load a file into a slot (1..31)
nanotracker_assets_load { "slot": 1, "fileName": "kick.wav" }

# 3. (Optional) Snap a loop to N rows at the project's bpm/speed
nanotracker_execute {
  "commands": [{ "op": "conformSampleToRows", "sampleId": 1, "rows": 16 }],
  "opts": { "undoDescription": "conform kick to 1 bar" }
}
```

`conformSampleToRows` computes the `stretchRatio` so the sample
plays for exactly `rows` rows at the project's current bpm/speed.
Useful for drum loops that should fit one bar (16 rows by default),
two bars (32 rows), etc.

## Direct stretch

If you know the exact ratio:

```jsonc
{ "op": "setSampleStretchRatio", "sampleId": 1, "ratio": 2 }
```

Plays at 2× speed. `ratio: 0.5` is half speed. Range 0.01..100.

## Other sample-metadata edits

```jsonc
{ "op": "renameSample",  "sampleId": 1, "name": "KICK" }
{ "op": "setSampleMeta", "sampleId": 1, "patch": {
    "baseNote": 60, "finetune": 0, "volume": 64, "pan": 128,
    "loopStart": 0, "loopLength": 0
  } }
```

`baseNote: 60` (MIDI middle C) means tracker note 49 plays the sample
at its natural pitch. Higher tracker notes pitch up, lower notes
pitch down.

## Unloading

```jsonc
nanotracker_assets_unload { "slot": 1 }
```

Frees the audio engine voice and removes the sample. The instrument
table slot resets to a default empty entry.

## Out of scope

- **Uploading new sample files via the API.** Files have to be in
  `<project>/samples/` already. The user adds them via PROJECT >
  EXPLORER (which uses the browser's File System Access API).
- **Loading from URLs.** Same reason.

## Common mistakes

- Calling `assets.load` before checking `nanotracker_health`. If the
  page isn't connected, you'll get an opaque error.
- Forgetting `undoDescription` on the `conformSampleToRows` execute
  batch. Required.
- Confusing `slot` (1..31, instrument table) with `sampleId`
  (the loaded sample's id, which is normally equal to the slot but
  may differ in unusual projects).
