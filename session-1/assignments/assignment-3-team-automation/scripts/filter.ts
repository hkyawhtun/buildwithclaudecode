// Stage 2 — filter
// Reads parsed events from stdin, drops anything below WARN, writes the rest.

import { createInterface } from "node:readline";

const KEEP = new Set(["WARN", "ERROR"]);

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line) return;
  const e = JSON.parse(line);
  if (KEEP.has(e.level)) process.stdout.write(line + "\n");
});
