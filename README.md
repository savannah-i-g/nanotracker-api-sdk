# nanoTracker API SDK

Drive a live [nanoTracker](https://federatedindustrial.com/tracker) session
from any AI coding agent, CLI, script, or browser extension.

This repo ships:

- **A local relay server** — a small Node script that brokers between the
  browser tab (which holds the live tracker state) and external callers
  (which speak HTTP).
- **An MCP server** — `tools/mcp-server.mjs`, a stdio Model Context
  Protocol wrapper. Drop the snippet from
  [`adapters/`](adapters/) into Claude Code, Cursor, Cline, Continue,
  Codex, opencode, openclaude, Aider, Gemini CLI, etc. and the agent
  gets `nanotracker_read` / `nanotracker_execute` / `nanotracker_assets_*`
  tools automatically.
- **Per-agent skill bundles** — `.claude/`, `.hermes/`, `.agents/`
  containing four skills (`api-inspect-state`, `api-author-pattern`,
  `api-load-sample`, `api-subscribe-stream`) with identical bodies and
  agent-specific frontmatter. Same convention as nanoTracker's
  [`plugin-sdk`](https://github.com/savannah-i-g/plugin-sdk).
- **A CLI** — `tools/cli.mjs`, useful for shell scripts and humans.
- **Runnable examples** under [`examples/`](examples/).
- **A protocol reference** at [`docs/PROTOCOL.md`](docs/PROTOCOL.md).

The browser-side bridge that closes the loop lives in nanoTracker itself;
this SDK is the everything-else.

## Quickstart (5 minutes)

You need: Node 20+, a recent Chromium / Firefox / Safari, and a
nanoTracker tab open at <https://federatedindustrial.com/tracker>.

1. Install:

   ```sh
   git clone https://github.com/savannah-i-g/nanotracker-api-sdk
   cd nanotracker-api-sdk/tools
   npm install
   ```

2. Start the relay:

   ```sh
   node relay.mjs
   ```

   First run generates `~/.nanotracker/relay-token` (mode 0600) and prints
   the token to stderr. Copy it.

3. In the nanoTracker tab: **FILE > API…**, toggle **Enable Local API**,
   toggle **Connect to local relay**, paste the token, leave the URL as
   `ws://localhost:9311/page`. The status pill flips to `ACTIVE`.

4. From a shell:

   ```sh
   node tools/cli.mjs read getProjectSummary
   ```

   Returns the live project state as JSON.

## Pick your agent

| Agent          | How to install                                            |
|----------------|-----------------------------------------------------------|
| Claude Code    | [`adapters/claude-code.md`](adapters/claude-code.md)      |
| Cursor         | [`adapters/cursor.md`](adapters/cursor.md)                |
| Cline          | [`adapters/cline.md`](adapters/cline.md)                  |
| Continue       | [`adapters/continue.md`](adapters/continue.md)            |
| Aider          | [`adapters/aider.md`](adapters/aider.md)                  |
| OpenAI Codex   | [`adapters/codex.md`](adapters/codex.md)                  |
| Gemini CLI     | [`adapters/gemini-cli.md`](adapters/gemini-cli.md)        |
| opencode       | [`adapters/opencode.md`](adapters/opencode.md)            |
| openclaude     | [`adapters/openclaude.md`](adapters/openclaude.md)        |
| Hermes Agents  | drop in [`.hermes/skills/`](.hermes/) — see its README    |
| Anything else  | use the CLI or curl the relay directly — see [docs/PROTOCOL.md](docs/PROTOCOL.md) |

## Protocol overview

```
agent ──MCP──┐
agent ──HTTP─┤    127.0.0.1:9311
script ──────┤      (relay)              ws://localhost:9311/page
curl  ───────┘──────► <─────────► browser tab (window.nanoTracker)
                                   │
                                   ↓
                         live React state in nanoTracker
```

Three core methods on the API surface:

- **`read(query)`** — sync queries: project summary, pattern list,
  individual patterns, cell ranges, samples, instrument table, sequence
  layers, schema. Cheap, no undo.
- **`execute(commands, opts)`** — batched mutations: cells, rows,
  patterns, order list, bpm/speed, instrument slots, sequence notes,
  sample stretch / conformity. Atomic per batch (validate-all → apply
  or reject-all). One undo entry per batch.
- **`assets.{list,load,unload}(...)`** — async, project-only. Reads
  files from `<project>/samples/` and loads them into instrument slots.
  Returns `noProject` when no project is open.

Every command, query, and asset method is fully described in
[`docs/PROTOCOL.md`](docs/PROTOCOL.md). Agents can also fetch the
machine-readable schema at runtime:

```sh
node tools/cli.mjs read getSchema
```

## Repository layout

```
.
├── README.md, CLAUDE.md, AGENTS.md, CHANGELOG.md, LICENSE
├── .github/copilot-instructions.md
├── .claude/, .hermes/, .agents/      Per-agent skill bundles
├── adapters/                          One markdown per AI tool, with config
├── docs/                              Protocol, security, browser-compat
├── tools/                             Relay, CLI, MCP server (run from here)
├── examples/                          Runnable .mjs walkthroughs
└── resources/                         Icons
```

## Security model

- The relay binds **`127.0.0.1` only** — never the network interface,
  even with a permissive firewall.
- A **256-bit bearer token** (in `~/.nanotracker/relay-token`, mode
  `0600`) gates every authenticated endpoint and the page handshake.
- Every batch goes through the same page-side validator
  (`executeBatch`); no commands bypass it via the relay.
- The browser tab keeps an audit log of every relay-sourced batch
  (visible in **FILE > API…**).
- The API, postMessage bridge, and relay are all **off by default**.

Full notes in [`docs/SECURITY.md`](docs/SECURITY.md).

## Browser compatibility

The page tries `ws://localhost:9311/page` first. Modern Chromium /
Firefox 84+ / Safari 15+ permit it from an HTTPS origin. If WS is
blocked the page falls back to HTTP long-poll automatically.

Matrix in [`docs/BROWSER-COMPAT.md`](docs/BROWSER-COMPAT.md).

## Versioning

This SDK tracks the nanoTracker Local API surface as deployed at
<https://federatedindustrial.com/tracker>. See [`CHANGELOG.md`](CHANGELOG.md).

## License

MIT — see [`LICENSE`](LICENSE).
