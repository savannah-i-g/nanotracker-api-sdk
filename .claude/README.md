# `.claude/` — Claude Code assets

Skills, slash commands, and a permission allowlist for using the
nanoTracker Local API SDK with Claude Code.

## Layout

```
.claude/
├── README.md
├── settings.local.json
├── skills/
│   ├── api-inspect-state/SKILL.md
│   ├── api-author-pattern/SKILL.md
│   ├── api-load-sample/SKILL.md
│   └── api-subscribe-stream/SKILL.md
└── commands/
    ├── api-execute.md
    ├── api-read.md
    └── api-status.md
```

## Skills

| Skill                  | Use it when…                                                  |
|------------------------|---------------------------------------------------------------|
| `api-inspect-state`    | You need to know what's there before changing anything.       |
| `api-author-pattern`   | You're writing cells, rows, patterns, order list, or tempo.   |
| `api-load-sample`      | You're loading or unloading a sample (project-only).          |
| `api-subscribe-stream` | You need to react to ongoing changes from outside the page.   |

## Slash commands

| Command       | Wraps                              |
|---------------|------------------------------------|
| `/api-execute`| `node tools/cli.mjs execute …`     |
| `/api-read`   | `node tools/cli.mjs read …`        |
| `/api-status` | `node tools/cli.mjs health`        |

## MCP

For full automation drop the snippet from
[`../adapters/claude-code.md`](../adapters/claude-code.md) into your
`~/.claude.json` (or project `.mcp.json`). Six MCP tools become
available — `nanotracker_read`, `nanotracker_execute`,
`nanotracker_assets_*`, `nanotracker_health`.
