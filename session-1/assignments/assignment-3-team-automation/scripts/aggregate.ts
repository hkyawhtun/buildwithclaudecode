// Stage 4 — aggregate
// Reads categorized events from stdin, emits a single JSON summary on stdout.

import { createInterface } from "node:readline";

type Event = {
  ts: string;
  level: string;
  service: string;
  message: string;
  category: string;
};

const events: Event[] = [];
const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (line) events.push(JSON.parse(line));
});
rl.on("close", () => {
  const byCategory: Record<string, number> = {};
  const errorByService: Record<string, number> = {};
  const errorByHour: Record<string, number> = {};
  let date = "";

  for (const e of events) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    if (e.level === "ERROR") {
      errorByService[e.service] = (errorByService[e.service] ?? 0) + 1;
      const hour = e.ts.slice(0, 13); // YYYY-MM-DDTHH
      errorByHour[hour] = (errorByHour[hour] ?? 0) + 1;
    }
    if (!date) date = e.ts.slice(0, 10);
  }

  const topServices = Object.entries(errorByService)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  process.stdout.write(
    JSON.stringify({ date, total: events.length, byCategory, errorByHour, topServices }, null, 2),
  );
});
