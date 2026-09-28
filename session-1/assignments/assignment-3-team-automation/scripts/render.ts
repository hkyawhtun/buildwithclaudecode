// Stage 5 — render
// Reads the aggregate JSON summary from stdin, fills the template at the path
// passed as the first arg, writes the rendered markdown to stdout.
//
// Usage:  npx tsx scripts/render.ts templates/report.md < summary.json

import { readFileSync } from "node:fs";

const templatePath = process.argv[2];
if (!templatePath) {
  console.error("usage: render.ts <template-path>  (reads aggregate JSON from stdin)");
  process.exit(1);
}

const template = readFileSync(templatePath, "utf8");
const summary = JSON.parse(readFileSync(0, "utf8"));

function listByCategory(byCategory: Record<string, number>): string {
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "(no events)";
  return entries.map(([cat, n]) => `- **${cat}**: ${n}`).join("\n");
}

function listTopServices(top: [string, number][]): string {
  if (top.length === 0) return "(no errors)";
  return top.map(([svc, n]) => `- \`${svc}\` — ${n}`).join("\n");
}

function hourlyHistogram(byHour: Record<string, number>): string {
  const hours = Object.entries(byHour).sort();
  if (hours.length === 0) return "(no errors)";
  const max = Math.max(...hours.map(([, n]) => n));
  const width = 24;
  return hours
    .map(([h, n]) => {
      const bar = "█".repeat(Math.max(1, Math.round((n / max) * width)));
      return `- \`${h}:00\` ${bar} ${n}`;
    })
    .join("\n");
}

const replacements: Record<string, string> = {
  date: summary.date,
  total: String(summary.total),
  by_category_list: listByCategory(summary.byCategory),
  top_services_list: listTopServices(summary.topServices),
  hourly_histogram: hourlyHistogram(summary.errorByHour),
  generated_at: new Date().toISOString(),
};

let output = template;
for (const [k, v] of Object.entries(replacements)) {
  output = output.replaceAll(`{{${k}}}`, v);
}

process.stdout.write(output);
