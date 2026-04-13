# Changelog

## v1.1.0 — note-off op + recursive sample subdirectories

### Surface changes

- **`setNoteOff { patternId, row, channel }`** — dedicated op for writing
  the canonical note-off cell `{ note: 97, instrument: 0, volume: 0xFF,
  effect: 0 }`. Same shape as pressing `==` in the pattern editor. Prefer
  this over `setCell { ..., cell: { note: 97 } }` which accidentally
  preserves neighbouring instrument/volume fields.
- **`assets.list`** now walks `<project>/samples/` recursively (max
  depth 8) and returns entries with full relative paths. Each entry now
  has `{ name, leafName, directory, size?, lastModified? }` where `name`
  is the full path (e.g. `Amens/Blasta 170 BPM.wav`).
- **`assets.load`** accepts path-with-slashes `fileName` values — pass
  the `name` field from `list()` verbatim and the loader walks the
  subdirectory chain automatically.

### Docs + tooling

- `docs/PROTOCOL.md`, `docs/ASSETS.md`, `docs/AGENTS-OVERVIEW.md`,
  `CLAUDE.md`, `AGENTS.md` updated.
- All four skills (mirrored across `.claude/`, `.hermes/`, `.agents/`)
  updated.
- `tools/mcp-server.mjs` tool descriptions updated.
- `tools/lib/schema.mjs` re-mirrored.

## v1.0.0 — initial public release

Tracks the nanoTracker Local API surface as shipped in
[`https://federatedindustrial.com/tracker`](https://federatedindustrial.com/tracker)
on this release date.

### Surface

- `read(query)` queries: `getProjectSummary`, `getPatternList`,
  `getPattern`, `getRange`, `getOrderList`, `getSamples`,
  `getInstrumentTable`, `getSeqLayer`, `getSeqLayerList`, `getSchema`.
- `execute(commands, opts)` commands across five domains:
  - **Pattern cells/rows** — `setCell`, `clearCell`, `setRange`,
    `insertRow`, `deleteRow`, `resizePattern`, `createPattern`,
    `deletePattern`, `renamePattern`.
  - **Order list + tempo** — `setOrderList`, `insertOrderAt`,
    `removeOrderAt`, `setBpm`, `setSpeed`, `setChannels`.
  - **Samples + instrument table** — `renameSample`, `setSampleMeta`,
    `setSampleStretchRatio`, `conformSampleToRows`, `setInstrumentSlot`,
    `clearInstrumentSlot`.
  - **Sequence layer** — `addSeqNote`, `removeSeqNote`, `updateSeqNote`,
    `addSeqLayer`, `removeSeqLayer`, `setSeqLayerInstrument`,
    `setSeqLayerEnabled`.
- `assets.{list, load, unload}(...)` — project-only sample-directory
  operations.
- `subscribe(fn)` — page-side fan-out of mutations (UI / API / undo).

### Tooling

- `tools/relay.mjs` — Node relay (HTTP for callers, WS+long-poll for the
  page). Loopback bind, bearer token.
- `tools/cli.mjs` — shell wrapper around the relay.
- `tools/mcp-server.mjs` — stdio MCP server for any MCP-aware agent.
- `tools/lib/schema.mjs` — hand-mirrored schema (re-mirror on every
  upstream API release).

### Docs

`docs/PROTOCOL.md`, `docs/ASSETS.md`, `docs/SECURITY.md`,
`docs/BROWSER-COMPAT.md`, `docs/AGENTS-OVERVIEW.md`,
`docs/reference/note-numbers.md`.

### Agent assets

Four skills (`api-inspect-state`, `api-author-pattern`, `api-load-sample`,
`api-subscribe-stream`) mirrored across `.claude/`, `.hermes/`, `.agents/`.
Slash commands and settings under `.claude/`. Adapter snippets for nine
MCP-aware tools.

### Schema mirror policy

`tools/lib/schema.mjs` is a hand-rolled mirror of the page-side schema
shipped with nanoTracker. When the live API surface changes, re-mirror
and record the new release date in the next entry of this file.
