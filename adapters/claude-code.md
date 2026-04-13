# Claude Code

[Claude Code](https://claude.com/claude-code) speaks MCP natively.

## Install

1. Install the relay deps once:
   ```sh
   cd /path/to/nanotracker-api-sdk/tools && npm install
   ```
2. Start the relay in a separate terminal:
   ```sh
   node tools/relay.mjs
   ```
3. Add an entry to your project's `.mcp.json` (or to
   `~/.claude.json` for global use). Use the canonical snippet from
   [`mcp-config-snippet.json`](mcp-config-snippet.json) — replace
   `/ABSOLUTE/PATH/TO/` with the full path to your checkout:

   ```json
   {
     "mcpServers": {
       "nanotracker": {
         "command": "node",
         "args": ["/abs/path/to/nanotracker-api-sdk/tools/mcp-server.mjs"]
       }
     }
   }
   ```
4. Restart Claude Code. When prompted, approve the new MCP server.

## Smoke test

In the Claude Code session:

```
What's the current project summary? Use nanotracker_health first to confirm the connection.
```

You should see Claude call `nanotracker_health` then `nanotracker_read`
with `op: "getProjectSummary"`.

## Skills

The repo's [`.claude/skills/`](../.claude/skills/) folder ships four
skills that load automatically when Claude Code starts inside this
repo (or any project that includes it as a dependency). They cover
state inspection, pattern authoring, sample loading, and change
streaming.

## Slash commands

[`.claude/commands/`](../.claude/commands/) defines `/api-execute`,
`/api-read`, and `/api-status` for one-shot CLI calls without going
through MCP.

## Tips

- Set `enableAllProjectMcpServers: true` in
  [`.claude/settings.local.json`](../.claude/settings.local.json) so
  the project-level config is picked up automatically.
- The relay's stdout is JSON — pipe through `jq` for legible logs.
