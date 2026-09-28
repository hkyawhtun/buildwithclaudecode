import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3000;
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = join(ROOT, "data");
const PUBLIC_DIR = join(ROOT, "server", "public");

async function listLogs(): Promise<string[]> {
  const files = await readdir(DATA_DIR);
  return files.filter((f) => f.endsWith(".log")).sort();
}

function safeFilename(name: string): boolean {
  return /^[\w.-]+\.log$/.test(name);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // Home page — browseable list of logs
  if (url.pathname === "/" && req.method === "GET") {
    const html = await readFile(join(PUBLIC_DIR, "index.html"), "utf8");
    const logs = await listLogs();
    const items = logs
      .map(
        (f) =>
          `<li><span class="name">${f}</span><a class="dl" href="/download/${f}">download</a></li>`,
      )
      .join("\n      ");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html.replace("{{LOGS}}", items));
    return;
  }

  // Browser download — triggers a "Save As" dialog. Useful for humans, awkward for scripts.
  if (url.pathname.startsWith("/download/") && req.method === "GET") {
    const file = decodeURIComponent(url.pathname.slice("/download/".length));
    if (!safeFilename(file)) {
      res.writeHead(400);
      res.end("bad request");
      return;
    }
    try {
      const data = await readFile(join(DATA_DIR, file));
      res.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${file}"`,
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
    return;
  }

  // ---------------------------------------------------------------------
  // TODO: expose a programmatic endpoint here.
  //
  // Right now the only way to grab a log is the browser-download route
  // above, which doesn't help a script that just wants the raw text.
  // Add a route — something like `GET /api/logs/:id` — that returns the
  // log content as `text/plain` so it can be piped straight into a
  // pipeline:
  //
  //   curl http://localhost:3000/api/logs/incident-2026-04-15.log
  //
  // The data lives in `DATA_DIR`. Reuse `safeFilename` for validation.
  // ---------------------------------------------------------------------

  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, () => {
  console.log(`log archive running → http://localhost:${PORT}`);
});
