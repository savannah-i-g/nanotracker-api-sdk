# OpenAI Codex

[OpenAI Codex CLI](https://github.com/openai/codex) speaks MCP and
auto-discovers `.agents/skills/`.

## Install

1. `cd /path/to/nanotracker-api-sdk/tools && npm install`
2. Start the relay: `node tools/relay.mjs`
3. Add to `~/.codex/config.toml`:

   ```toml
   [mcp.servers.nanotracker]
   command = "node"
   args = ["/abs/path/to/nanotracker-api-sdk/tools/mcp-server.mjs"]
   ```

   (Or the JSON form via `~/.codex/mcp.json`; both are accepted.)

4. Start a Codex session in this repo (or any subdirectory). Skills
   under [`../.agents/skills/`](../.agents/skills/) auto-load via
   the parent-walk discovery.

## Smoke test

```
codex
> use nanotracker_health
> use nanotracker_read with op getProjectSummary
```

## Notes

- The OpenAI sidecars at `.agents/skills/*/agents/openai.yaml`
  control display name + brand colour in the Codex UI.
- See [`AGENTS.md`](../AGENTS.md) for cross-agent rules.
