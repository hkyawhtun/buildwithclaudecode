#!/usr/bin/env node
// One-shot setup: download MiniLM model files + copy ORT wasm runtime into public/.
// Run with `npm run setup` after install.
import { mkdir, copyFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const HF_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main`;
const MODEL_DIR = join(ROOT, 'public', 'models', MODEL_ID);
const WASM_DIR = join(ROOT, 'public', 'wasm');
const ORT_SRC = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');

const FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'onnx/model_quantized.onnx'
];

async function fetchFile(rel) {
  const dest = join(MODEL_DIR, rel);
  if (existsSync(dest)) {
    const s = await stat(dest);
    if (s.size > 0) {
      console.log(`  · ${rel} (${(s.size / 1024 / 1024).toFixed(2)} MB) — cached`);
      return;
    }
  }
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(`${HF_BASE}/${rel}`, { redirect: 'follow' });
  if (!res.ok) {
    if (rel === 'special_tokens_map.json' && res.status === 404) {
      console.log(`  · ${rel} — not in repo, skipping`);
      return;
    }
    throw new Error(`${rel}: HTTP ${res.status}`);
  }
  await streamPipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const s = await stat(dest);
  console.log(`  · ${rel} (${(s.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function copyWasm() {
  await mkdir(WASM_DIR, { recursive: true });
  const entries = await readdir(ORT_SRC);
  // Bundle the simd-threaded runtime + jsep variant (WebGPU). Skip jspi/asyncify/legacy.
  const want = entries.filter(
    (f) =>
      /^ort-wasm-simd-threaded(\.jsep)?\.(wasm|mjs)$/.test(f) ||
      /^ort-wasm-simd-threaded\.mjs$/.test(f)
  );
  for (const f of want) {
    const src = join(ORT_SRC, f);
    const dst = join(WASM_DIR, f);
    await copyFile(src, dst);
    const s = await stat(dst);
    console.log(`  · wasm/${f} (${(s.size / 1024 / 1024).toFixed(2)} MB)`);
  }
}

async function main() {
  console.log(`Fetching ${MODEL_ID} → public/models/...`);
  for (const f of FILES) await fetchFile(f);
  console.log(`\nCopying onnxruntime-web wasm → public/wasm/...`);
  await copyWasm();

  // Sanity: write a small marker so we can detect a bad/incomplete setup at runtime.
  await writeFile(
    join(MODEL_DIR, '.fetched'),
    JSON.stringify({ model: MODEL_ID, at: new Date().toISOString() }, null, 2)
  );
  console.log('\nDone.');
}

main().catch((e) => {
  console.error('fetch-model failed:', e);
  process.exit(1);
});
