# nanoTracker API SDK — agent rules

Cross-agent must-know rules for driving a live
[nanoTracker](https://federatedindustrial.com/tracker) session. Per-agent
detail is in [`CLAUDE.md`](CLAUDE.md), [`.hermes/`](.hermes/),
[`.agents/`](.agents/), and [`adapters/`](adapters/).

## The shape

You call **MCP tools** or **HTTP endpoints** on a relay running on
`127.0.0.1:9311`. The relay forwards to a browser tab where
`window.nanoTracker` lives. The user must:

1. Have started the relay (`node tools/relay.mjs`).
2. Have the nanoTracker tab open.
3. Have toggled **Enable Local API** in **FILE > API…**.
4. Have toggled **Connect to local relay** and pasted the token.

If any of these is false, you get `{ ok: false, errors: [...] }`. Read
the error code, tell the user, do not retry in a loop.

## Hard rules

- **Every non-dryRun batch needs `opts.undoDescription`.**
- **`patternId` ≠ order-list index.** Resolve via `getPatternList`.
- **Validation is two-phase, all-or-nothing.** One bad command rejects
  the whole batch.
- **Use `dryRun: true`** for destructive batches against patterns with
  existing cells.
- **Sample binary upload is out of scope.** Use `assets.load` to bring
  files in from `<project>/samples/` only.
- **Hard limits**: 10,000 commands/batch, 64 patterns created/batch,
  1 MiB payload, 20 batches/sec.

## Surfaces

- `read(query)` — sync queries. Cheap. No undo.
- `execute(commands, opts)` — batched mutations. One undo entry per
  batch.
- `assets.{list,load,unload}(args)` — async, project-only.

Full reference:
[`docs/PROTOCOL.md`](docs/PROTOCOL.md),
[`docs/ASSETS.md`](docs/ASSETS.md).

## When in doubt, fetch the schema

```sh
node tools/cli.mjs read getSchema
```

returns the canonical machine-readable list of every command, query,
and field type.

## Skills

- `api-inspect-state` — reading current state cheaply
- `api-author-pattern` — composing batches of cell edits
- `api-load-sample` — project-only sample loading + conformity
- `api-subscribe-stream` — change detection without polling everything

Same bodies, three frontmatter formats:

- [`.claude/skills/`](.claude/skills/) — Anthropic Claude Code
- [`.hermes/skills/`](.hermes/skills/) — Nous Research Hermes Agents
- [`.agents/skills/`](.agents/skills/) — OpenAI Codex (with
  `agents/openai.yaml` sidecars)

## Adapters

One markdown per MCP-aware tool in [`adapters/`](adapters/). They
contain the install path, the MCP-server config snippet, and a
two-command smoke test. They do not duplicate skill content — they
point at the skill folders.

## Things to ask the user before doing

- "Is the relay running and the API enabled?" — if you see
  `{ code: "disabled" }`.
- "Open a project first?" — if you see `{ code: "noProject" }` from an
  asset call.
- "Should I dry-run this first?" — if your batch will overwrite
  existing cell data.

Per `~/.claude/projects/.../memory` repo convention: agent docs stay
literal. No taglines, no in-jokes, no meta asides.
