# Aider

[Aider](https://aider.chat) is a terminal AI pair programmer.
Aider's MCP support is configured via `mcp_servers` in `~/.aider.conf.yml`.

## Install

1. `cd /path/to/nanotracker-api-sdk/tools && npm install`
2. Start the relay: `node tools/relay.mjs`
3. Add to `~/.aider.conf.yml`:

   ```yaml
   mcp-servers:
     nanotracker:
       command: node
       args:
         - /abs/path/to/nanotracker-api-sdk/tools/mcp-server.mjs
   ```

4. Start Aider as usual. The tools auto-register.

## Smoke test

```
/tools nanotracker_health
```

## Notes

- Aider's tool-use UX is more terminal-driven than IDE agents — for
  ad-hoc edits the CLI is often easier:
  ```sh
  node tools/cli.mjs read getProjectSummary
  ```
- See [`AGENTS.md`](../AGENTS.md) for the cross-agent rules.
