#!/usr/bin/env node
/* nanoTracker Local API CLI
 * Convenience wrapper around the relay's HTTP endpoints. Reads the token
 * from ~/.nanotracker/relay-token automatically.
 *
 * Examples:
 *   node tools/local-api-cli.mjs read getProjectSummary
 *   node tools/local-api-cli.mjs read getPattern '{"patternId":0}'
 *   node tools/local-api-cli.mjs execute '[{"op":"setBpm","value":140}]' '{"undoDescription":"cli bpm"}'
 *   node tools/local-api-cli.mjs assets list
 *   node tools/local-api-cli.mjs assets load '{"slot":1,"fileName":"kick.wav"}'
 *   node tools/local-api-cli.mjs health
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE  = process.env.NANOTRACKER_RELAY ?? "http://127.0.0.1:9311";
const TOKEN = (process.env.NANOTRACKER_TOKEN ??
  (() => {
    const p = path.join(os.homedir(), ".nanotracker", "relay-token");
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf8").trim();
  })());

const args = process.argv.slice(2);
const cmd  = args.shift();

async function call(pathname, body) {
  const headers = { "content-type": "application/json" };
  if (TOKEN) headers["authorization"] = `Bearer ${TOKEN}`;
  const res = await fetch(BASE + pathname, {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  console.log(JSON.stringify(json, null, 2));
  process.exit(res.ok ? 0 : 1);
}

function parseJsonArg(arg, fallback) {
  if (arg === undefined) return fallback;
  try { return JSON.parse(arg); } catch (e) { console.error("invalid JSON:", e.message); process.exit(2); }
}

if (!TOKEN && cmd !== "health") {
  console.error("no token found at ~/.nanotracker/relay-token (start the relay first, or set NANOTRACKER_TOKEN)");
  process.exit(2);
}

switch (cmd) {
  case "health":
    await call("/v1/health");
    break;
  case "read": {
    const op = args.shift();
    if (!op) { console.error("usage: read <op> [extraJSON]"); process.exit(2); }
    const extra = parseJsonArg(args.shift(), {});
    await call("/v1/read", { op, ...extra });
    break;
  }
  case "execute": {
    const commands = parseJsonArg(args.shift(), []);
    const opts     = parseJsonArg(args.shift(), { undoDescription: "cli batch" });
    await call("/v1/execute", { commands, opts });
    break;
  }
  case "assets": {
    const method = args.shift();
    if (!method) { console.error("usage: assets <list|load|unload> [argsJSON]"); process.exit(2); }
    const extra = parseJsonArg(args.shift(), {});
    await call("/v1/assets", { method, args: extra });
    break;
  }
  default:
    console.error("usage: read|execute|assets|health …");
    process.exit(2);
}
