# `.hermes/` — Nous Hermes Agents assets

Skill bundles for [Hermes Agents](https://docs.nousresearch.com/).
The skill bodies are identical to those in [`../.claude/`](../.claude/)
and [`../.agents/`](../.agents/) — only the frontmatter differs.

## Layout

```
.hermes/
├── README.md
└── skills/
    ├── api-inspect-state/SKILL.md
    ├── api-author-pattern/SKILL.md
    ├── api-load-sample/SKILL.md
    └── api-subscribe-stream/SKILL.md
```

## Setup

Add this directory as a skill source in your `~/.hermes/config.yaml`:

```yaml
skills:
  sources:
    - type: directory
      path: /abs/path/to/nanotracker-api-sdk/.hermes/skills
```

Then start a Hermes session in the same shell where the relay is
running. The four skills (`api-inspect-state`, `api-author-pattern`,
`api-load-sample`, `api-subscribe-stream`) load automatically.

## MCP

Hermes is MCP-capable. To install the unified MCP server (six tools
spanning read/execute/assets/health), see
[`../adapters/`](../adapters/) — pick whichever adapter doc applies
to your Hermes wrapper, or use the canonical snippet documented in
[`../tools/README.md`](../tools/README.md#mcp-servermjs).
