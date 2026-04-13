# `.agents/` — OpenAI Codex / agentskills.io assets

Skill bundles compatible with the
[agentskills.io](https://agentskills.io/) standard, including OpenAI
Codex auto-discovery. Skill bodies are identical to those in
[`../.claude/`](../.claude/) and [`../.hermes/`](../.hermes/) — only
frontmatter differs, and Codex picks up extra UI metadata from
`agents/openai.yaml` sidecars.

## Layout

```
.agents/
├── README.md
└── skills/
    ├── api-inspect-state/
    │   ├── SKILL.md
    │   └── agents/openai.yaml
    ├── api-author-pattern/
    │   ├── SKILL.md
    │   └── agents/openai.yaml
    ├── api-load-sample/
    │   ├── SKILL.md
    │   └── agents/openai.yaml
    └── api-subscribe-stream/
        ├── SKILL.md
        └── agents/openai.yaml
```

## Setup

Codex auto-discovers `.agents/skills/` by walking from the current
working directory upward. No manual config needed — start your Codex
session inside or below this repo.

For other agentskills-compatible runners, follow their docs to add
this folder as a skills source.

## MCP

Codex supports MCP. See [`../adapters/codex.md`](../adapters/codex.md)
for the install snippet — the unified MCP server gives you
`nanotracker_read`, `nanotracker_execute`, `nanotracker_assets_*`,
and `nanotracker_health` tools.
