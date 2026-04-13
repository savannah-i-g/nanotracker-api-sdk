# Examples

Five runnable Node ESM scripts that exercise the Local API end-to-end.
All examples share `_client.mjs`, which reads the relay URL from
`NANOTRACKER_RELAY` (default `http://127.0.0.1:9311`) and the token
from `~/.nanotracker/relay-token`.

## Prereqs

- Relay running (`node tools/relay.mjs` from the SDK root).
- nanoTracker tab open at <https://federatedindustrial.com/tracker>
  with **FILE > API…** enabled and **Connect to local relay** on.

## Run

```sh
node examples/01-inspect-state.mjs
node examples/02-drum-pattern.mjs
node examples/03-chord-progression.mjs
node examples/04-load-and-conform-loop.mjs <fileName> [slot] [rows]
node examples/05-subscribe-stream.mjs
```

## What each one shows

| File                              | Demonstrates                                                   |
|-----------------------------------|----------------------------------------------------------------|
| `01-inspect-state.mjs`            | `health` → `getProjectSummary` → `getPatternList` → `getRange` |
| `02-drum-pattern.mjs`             | A single batched `setCell` write with one undo entry           |
| `03-chord-progression.mjs`        | Programmatic chord placement across multiple channels          |
| `04-load-and-conform-loop.mjs`    | `assets.list` + `assets.load` + `conformSampleToRows`          |
| `05-subscribe-stream.mjs`         | External-caller polling pattern with backoff on disconnect     |

## Customise

Most examples assume pattern id 0 exists with at least 16 rows and
3+ channels (the default for a fresh project). If your project layout
differs, edit the `patternId` / `row` / `channel` constants.

To target a different relay (e.g. on a different port or another
machine you SSH'd into) set:

```sh
NANOTRACKER_RELAY=http://127.0.0.1:9999 NANOTRACKER_TOKEN=$(cat /path/to/token) \
  node examples/01-inspect-state.mjs
```
