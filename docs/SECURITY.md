# Security model

## Defaults

Every layer is **off by default**:

- The `window.nanoTracker` API is inert until the user toggles **Enable
  Local API** in **FILE > API…**.
- The postMessage bridge inside the page is gated by a separate toggle.
- The relay bridge is a third toggle, plus a token field.

A fresh nanoTracker session does nothing externally observable.

## Loopback bind

`relay.mjs` binds to **`127.0.0.1` only**. It refuses connections from
any other interface even if a firewall would otherwise permit them.
Defence in depth: the HTTP handler additionally rejects requests whose
remote address is not `127.0.0.1` / `::1`.

## Bearer token

On first start the relay generates a 256-bit token via
`crypto.randomBytes(32)` and writes it to `~/.nanotracker/relay-token`
(directory `0700`, file `0600`, never logged after the one-time
stderr print).

Every authenticated endpoint requires `Authorization: Bearer <token>`:

- `POST /v1/read`
- `POST /v1/execute`
- `POST /v1/assets`
- `POST /reply`

Page handshake (over WS or in the long-poll `/poll` query string)
also requires the token. Mismatches close the WS with code `4401` or
return `401` to long-poll.

`/v1/health` is the only unauthenticated endpoint and returns a
minimal payload (no tab details).

## Validation

Every batch goes through the **same page-side validator** as UI edits.
The relay never short-circuits validation. Hard caps:

- ≤ 10,000 commands per batch
- ≤ 64 patterns created per batch
- ≤ 1 MiB JSON payload per request
- ≤ 20 batches per second

The relay also enforces a 10 s request timeout (returns `504` if the
page doesn't reply).

## Audit log

Every relay-sourced batch is recorded in the page's API window
activity log with `source: "relay"`. The user sees the timestamp,
description, command count, and ok/denied state of every external
request.

## Multi-tab

The relay tracks tabs in connection order. Only the **oldest** active
tab serves requests; later tabs receive `role: "backup"` and silently
hold the connection. On active disconnect the oldest backup is
promoted automatically. New external requests during a transition
either go through the new active tab or return `503` with
`internal: "no nanoTracker tab connected"`.

## Token rotation

Stop the relay, delete `~/.nanotracker/relay-token`, restart. A new
token is generated. Existing page connections will keep working until
the user reconnects (the page caches the token it pasted); paste the
new token in the API window to reconnect.

## What this protects against

- LAN attackers on the same machine — relay isn't reachable from the
  network.
- Other browser tabs from random origins — can't reach the relay
  directly (no CORS for `127.0.0.1`-only traffic without the token).
- Malicious npm packages in your dev tree — can't read the token
  unless they specifically open `~/.nanotracker/relay-token`.

## What this does NOT protect against

- Other unprivileged processes running as your user — they can read
  the token and call the relay just like the CLI.
- A compromised browser extension running with broad permissions in
  the same browser as the nanoTracker tab — it could call
  `window.nanoTracker.execute()` directly. Bearer tokens in
  `localStorage` aren't a defence against same-page code.
- Someone with shell access on your machine.

For shared machines, treat `~/.nanotracker/relay-token` like an SSH
key. For headless / CI use, prefer a fresh token per run.
