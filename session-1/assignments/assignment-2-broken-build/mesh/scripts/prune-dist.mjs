#!/usr/bin/env node
// Vite statically follows onnxruntime-web's new URL() refs and ships every
// wasm flavor (asyncify, jspi, etc) into dist/assets — even though our
// runtime overrides `env.backends.onnx.wasm.wasmPaths = '/wasm/'` and only
// uses the canonical simd-threaded variants we ship in public/wasm/.
// Strip the redundant copies post-build.
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const DIST_ASSETS = new URL('../dist/assets/', import.meta.url).pathname;

const KEEP = /^index-.*\.(js|css|map)$/; // keep all "real" build artifacts
const STRIP = /^ort-wasm.*\.(wasm|mjs|js)$/;

const files = await readdir(DIST_ASSETS);
let bytes = 0;
let count = 0;
for (const f of files) {
  if (KEEP.test(f)) continue;
  if (!STRIP.test(f)) continue;
  const p = join(DIST_ASSETS, f);
  const s = await stat(p);
  await unlink(p);
  bytes += s.size;
  count++;
  console.log(`  · removed ${f} (${(s.size / 1024 / 1024).toFixed(2)} MB)`);
}
if (count) {
  console.log(`Pruned ${count} stale wasm asset${count === 1 ? '' : 's'} (${(bytes / 1024 / 1024).toFixed(2)} MB).`);
} else {
  console.log('Nothing to prune.');
}
