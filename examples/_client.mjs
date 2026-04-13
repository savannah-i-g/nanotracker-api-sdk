/* Tiny shared HTTP client for the examples. Reads
 * NANOTRACKER_RELAY (default http://127.0.0.1:9311) and
 * ~/.nanotracker/relay-token automatically.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE  = process.env.NANOTRACKER_RELAY ?? "http://127.0.0.1:9311";
const TOKEN = process.env.NANOTRACKER_TOKEN ?? readToken();

function readToken() {
  try { return fs.readFileSync(path.join(os.homedir(), ".nanotracker", "relay-token"), "utf8").trim(); }
  catch { return null; }
}

async function call(pathname, body) {
  const headers = { "content-type": "application/json" };
  if (TOKEN) headers["authorization"] = `Bearer ${TOKEN}`;
  const res = await fetch(BASE + pathname, {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export const health  = ()                  => call("/v1/health");
export const read    = (query)             => call("/v1/read",   query);
export const execute = (commands, opts)    => call("/v1/execute",{ commands, opts });
export const assets  = (method, args = {}) => call("/v1/assets", { method, args });

export function bail(label, result) {
  if (result.ok === false) {
    console.error(`[${label}] ${JSON.stringify(result.errors, null, 2)}`);
    process.exit(1);
  }
}
