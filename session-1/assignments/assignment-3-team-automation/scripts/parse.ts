// Stage 1 — parse
// Reads raw log lines from stdin, writes one JSON object per line to stdout.
// Drops corrupted lines (lines starting with `--`) silently.

import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });

// Format: 2026-04-15T14:23:11.482Z [ERROR] db.postgres: query timeout after 30000ms
const RE = /^(\S+)\s+\[(\w+)\s*\]\s+([\w.-]+):\s+(.*)$/;

rl.on("line", (line) => {
  if (!line || line.startsWith("--")) return;
  const m = line.match(RE);
  if (!m) return;
  const [, ts, level, service, message] = m;
  process.stdout.write(JSON.stringify({ ts, level, service, message }) + "\n");
});
