# Assets — project-only sample I/O

The `assets` namespace is the only async surface and the only one
that touches the filesystem. It is **only available when a project
is open** in nanoTracker (PROJECT > EXPLORER…). Otherwise every call
returns `{ ok: false, errors: [{ code: "noProject" }] }`.

## Methods

### `assets.list()`

Walks `<project>/samples/` **recursively** (max depth 8) and returns
every audio file with its path relative to `samples/`. No args.

```jsonc
{
  "ok": true,
  "data": [
    { "name": "kick.wav",                   "leafName": "kick.wav",     "directory": "" },
    { "name": "loop.wav",                   "leafName": "loop.wav",     "directory": "" },
    { "name": "Drums/snare.wav",            "leafName": "snare.wav",    "directory": "Drums" },
    { "name": "Drums/hat.wav",              "leafName": "hat.wav",      "directory": "Drums" },
    { "name": "One-Shots/Bass/sub.wav",     "leafName": "sub.wav",      "directory": "One-Shots/Bass" }
  ]
}
```

Each entry has three name-like fields:

- **`name`** — full path relative to `samples/`, with forward slashes.
  Pass this verbatim to `assets.load`.
- **`leafName`** — just the filename, no path.
- **`directory`** — the parent directory's path (empty at top level).

Paths use forward slashes regardless of host OS. Depth is capped at 8
levels so pathologically deep trees don't stall the walk. Size and
last-modified are omitted from the listing payload — stat-ing every
file makes `list()` O(filecount) round-trips on FSA / OPFS and blows
past the relay's request timeout on libraries with a few hundred
samples. If you need the size of a specific file, check it after
loading — `assets.load` returns `sample.frames` / `sample.sampleRate`
which together give you natural duration.

### `assets.load({ slot, fileName })`

Decodes `<project>/samples/<fileName>` and installs it in instrument
slot `slot` (1..31). `fileName` may include forward-slash segments —
the loader splits on `/` and walks the subdirectory chain. Captures
one undo entry labelled `Load sample <NAME>`.

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
# what's available (recursive — includes subfolders)
node tools/cli.mjs assets list

# load from a subfolder — pass the full 'name' you got from list
node tools/cli.mjs assets load '{"slot":1,"fileName":"Drums/break.wav"}'

# or a top-level file
node tools/cli.mjs assets load '{"slot":2,"fileName":"kick.wav"}'

# snap a sample to exactly 16 rows at the project's current bpm/speed
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
