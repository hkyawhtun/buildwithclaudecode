// Real sentence embeddings via transformers.js, running entirely in-browser
// against the bundled all-MiniLM-L6-v2 (q8) under /models/.
//
// `loadEmbedder()` warms the pipeline once. `embed()`/`embedBatch()` return
// L2-normalized 384-dim Float32Arrays so cosine collapses to a dot product.

import { pipeline, env } from '@huggingface/transformers';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';
// transformers.js v4 requires the object form (not a string prefix).
// We ship the non-asyncify simd-threaded variant — works on all browsers.
env.backends.onnx.wasm.wasmPaths = {
  wasm: '/wasm/ort-wasm-simd-threaded.wasm',
  mjs: '/wasm/ort-wasm-simd-threaded.mjs'
};

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let _extractorPromise = null;

export function loadEmbedder() {
  if (!_extractorPromise) {
    _extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      dtype: 'q8'
    });
  }
  return _extractorPromise;
}

export async function embed(text) {
  const extractor = await loadEmbedder();
  const out = await extractor(text || '', { pooling: 'mean', normalize: true });
  return new Float32Array(out.data);
}

export async function embedBatch(texts) {
  if (!texts.length) return [];
  const extractor = await loadEmbedder();
  const out = await extractor(texts, { pooling: 'mean', normalize: true });
  // Flat tensor of shape [N, dim]; split per row.
  const dim = out.dims[out.dims.length - 1];
  const flat = out.data;
  const vecs = [];
  for (let i = 0; i < texts.length; i++) {
    vecs.push(new Float32Array(flat.buffer, flat.byteOffset + i * dim * 4, dim).slice());
  }
  return vecs;
}

export function cosine(a, b) {
  // Vectors are pre-normalized → dot product is cosine.
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

// Calibrated against the seed corpus via `npm run check:seed --sweep` —
// 0.15 keeps every seed note connected with ~3.4 avg degree on MiniLM-L6-v2.
export const SIM_THRESHOLD = 0.15;

export function buildEdges(nodes, k = 3, threshold = SIM_THRESHOLD) {
  const edges = [];
  const seen = new Set();
  for (let i = 0; i < nodes.length; i++) {
    const sims = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const s = cosine(nodes[i].embedding, nodes[j].embedding);
      sims.push({ j, s });
    }
    sims.sort((a, b) => b.s - a.s);
    for (let m = 0; m < Math.min(k, sims.length); m++) {
      const { j, s } = sims[m];
      if (s < threshold) continue;
      const lo = i < j ? i : j;
      const hi = i < j ? j : i;
      const key = `${lo}-${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: lo, target: hi, weight: s });
    }
  }
  return edges;
}
