# tools/

Three runnable Node ESM scripts and one schema mirror.

| File             | Purpose                                                            |
|------------------|--------------------------------------------------------------------|
| `relay.mjs`      | Local relay server. Run this first.                                |
| `cli.mjs`        | Shell wrapper around the relay's HTTP endpoints.                   |
| `mcp-server.mjs` | stdio MCP server. Configure your agent to spawn it.                |
| `lib/schema.mjs` | Hand-mirrored snapshot of the page-side schema.                    |

Install once:

```sh
cd tools
npm install
```

## relay.mjs

Brokers between the browser tab and external callers. Loopback bind
(`127.0.0.1`), 256-bit bearer token written to
`~/.nanotracker/relay-token` (mode `0600`). Multi-tab aware: oldest
connected tab is `active`, others wait as `backup` and are promoted on
disconnect.

```sh
node relay.mjs                        # default port 9311
node relay.mjs --port 9999
```

Endpoints (all require `Authorization: Bearer <token>` except `/v1/health`):

| Method | Path           | Body / Notes                                              |
|--------|----------------|-----------------------------------------------------------|
| GET    | `/v1/health`   | No auth. Returns `{pageConnected, transport, ...}`        |
| POST   | `/v1/read`     | `LocalApiQuery`                                           |
| POST   | `/v1/execute`  | `{ commands: LocalApiCommand[], opts: ExecuteOptions }`   |
| POST   | `/v1/assets`   | `{ method: "list" \| "load" \| "unload", args: any }`       |

Page-side endpoints (used by the in-tab bridge, not by external callers):

| Method | Path     | Notes                                                      |
|--------|----------|------------------------------------------------------------|
| WS     | `/page`  | Primary transport.                                         |
| GET    | `/poll`  | Long-poll fallback. Token in query string.                 |
| POST   | `/reply` | Long-poll reply.                                           |

JSON line logs to stdout — composes well with `jq`:

```sh
node relay.mjs | jq .
```

## cli.mjs

Reads `~/.nanotracker/relay-token` automatically. Override with
`NANOTRACKER_RELAY` and `NANOTRACKER_TOKEN` env vars.

```sh
node cli.mjs health
node cli.mjs read    getProjectSummary
node cli.mjs read    getPattern '{"patternId":0}'
node cli.mjs execute '[{"op":"setBpm","value":140}]' '{"undoDescription":"x"}'
node cli.mjs assets  list
node cli.mjs assets  load   '{"slot":1,"fileName":"kick.wav"}'
node cli.mjs assets  unload '{"slot":1}'
```

## mcp-server.mjs

stdio MCP server. Drop the snippet from
[`../adapters/`](../adapters/) into your agent's MCP config and the
following tools appear:

- `nanotracker_read`
- `nanotracker_execute`
- `nanotracker_assets_list`
- `nanotracker_assets_load`
- `nanotracker_assets_unload`
- `nanotracker_health`

Each is a thin pass-through to the relay's HTTP endpoints, so error
shapes and rate-limiting are identical between the CLI and MCP paths.

## lib/schema.mjs

Mirrors the page-side `LOCAL_API_SCHEMA`. Use it for codegen,
completion, or static validation. Re-mirror when the live API surface
changes (see [`../CHANGELOG.md`](../CHANGELOG.md)).

```js
import { LOCAL_API_SCHEMA, LOCAL_API_LIMITS } from "./lib/schema.mjs";
```

The relay also serves `read({ op: "getSchema" })` to fetch the live
schema once a tab is connected.
