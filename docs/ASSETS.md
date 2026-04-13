# Assets — project-only sample I/O

The `assets` namespace is the only async surface and the only one
that touches the filesystem. It is **only available when a project
is open** in nanoTracker (PROJECT > EXPLORER…). Otherwise every call
returns `{ ok: false, errors: [{ code: "noProject" }] }`.

## Methods

### `assets.list()`

Lists audio files in `<project>/samples/`. No args.

```jsonc
{
  "ok": true,
  "data": [
    { "name": "kick.wav",  "size": 26244, "lastModified": 1731612301000 },
    { "name": "snare.wav", "size": 18420, "lastModified": 1731612306000 },
    { "name": "loop.wav",  "size": 412800 }
  ]
}
```

### `assets.load({ slot, fileName })`

Decodes `<project>/samples/<fileName>` and installs it in instrument
slot `slot` (1..31). Captures one undo entry labelled
`Load sample <NAME>`.

```jsonc
{
  "ok": true,
  "data": {
    "slot": 1,
    "fileName": "kick.wav",
    "sample": {
      "id": 1,
      "name": "KICK",
      "sampleRate": 44100,
      "numChannels": 1,
      "frames": 11580,
      "durationSeconds": 0.2627
    }
  }
}
```

### `assets.unload({ slot })`

Clears slot `slot`. Frees the audio engine voice and removes the
sample. Captures one undo entry.

```jsonc
{ "ok": true, "data": { "slot": 1 } }
```

## Common flow — load + conform

```sh
# what's available
node tools/cli.mjs assets list

# load into slot 1
node tools/cli.mjs assets load '{"slot":1,"fileName":"loop.wav"}'

# snap it to exactly 16 rows at the project's current bpm/speed
node tools/cli.mjs execute \
  '[{"op":"conformSampleToRows","sampleId":1,"rows":16}]' \
  '{"undoDescription":"conform loop to 1 bar"}'
```

After conforming, hitting that sample on row 0 (with
`stretchRatio` applied) will play it for exactly 16 rows worth of
time at the current tempo.

## Error codes specific to assets

| Code        | Means                                                     |
|-------------|-----------------------------------------------------------|
| `noProject` | No project is open. Tell the user to open one. Don't retry.|
| `ioError`   | Filesystem error (file missing, permission denied, decode failure). |
| `disabled`  | API toggle is off.                                         |
| `invalidField` | `slot` out of range, missing `fileName`, etc.           |

## Out of scope (v1)

- Uploading new sample files via the API. Users add files via PROJECT
  > EXPLORER (which calls the FSA API directly). Once a file is in
  `<project>/samples/`, you can `assets.load` it.
- Loading from arbitrary URLs.
- Writing or renaming files in the project samples directory.
