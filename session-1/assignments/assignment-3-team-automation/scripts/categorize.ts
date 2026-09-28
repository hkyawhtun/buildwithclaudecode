// Stage 3 — categorize
// Tags each event with a category based on regex rules over service + message.
// Deterministic. Same input → byte-identical output.

import { createInterface } from "node:readline";

function categorize(service: string, message: string): string {
  if (/^db\./.test(service) || /\b(query|connection|deadlock|pool)\b/i.test(message)) return "db";
  if (/^auth\./.test(service) || /\b(token|session|signature|issuer)\b/i.test(message)) return "auth";
  if (/\b(timeout|ECONNREFUSED|ETIMEDOUT|upstream)\b/i.test(message)) return "network";
  if (/^deploy\./.test(service) || /\b(rollout|container|image pull)\b/i.test(message)) return "deploy";
  return "other";
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line) return;
  const e = JSON.parse(line);
  e.category = categorize(e.service, e.message);
  process.stdout.write(JSON.stringify(e) + "\n");
});
