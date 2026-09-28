#!/usr/bin/env node
// Offline backfill: embed every seed note with the same MiniLM weights the
// browser uses, build the k-NN edge graph at the same threshold, and report
// whether the seed corpus produces a meaningful mesh. Run with:
//   npm run check:seed
import { pipeline, env } from '@huggingface/transformers';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SEED_NOTES } from '../src/lib/seed.js';

const ROOT = dirname(fileURLToPath(new URL('..', import.meta.url + '/x')));

// In Node we read model files straight off disk, not over HTTP.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = join(ROOT, 'public', 'models') + '/';

const K = 3;
// CLI: `node scripts/check-seed.mjs 0.18` to override; `--sweep` for full table.
const THRESHOLD = Number(process.argv[2] ?? 0.15);
const SWEEP = process.argv.includes('--sweep');
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function buildEdges(nodes, k, threshold) {
  const edges = [];
  const seen = new Set();
  for (let i = 0; i < nodes.length; i++) {
    const sims = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      sims.push({ j, s: cosine(nodes[i].embedding, nodes[j].embedding) });
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

function components(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const e of edges) {
    const ra = find(e.source), rb = find(e.target);
    if (ra !== rb) parent[ra] = rb;
  }
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length);
}

function fmt(score) {
  return (score * 100).toFixed(0).padStart(2, ' ');
}

function preview(s, n = 42) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n);
}

async function main() {
  console.log(`Loading ${MODEL_ID} from ${env.localModelPath}…`);
  const t0 = Date.now();
  const extractor = await pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' });
  console.log(`  ready in ${Date.now() - t0} ms\n`);

  console.log(`Embedding ${SEED_NOTES.length} seed notes…`);
  const t1 = Date.now();
  const out = await extractor(SEED_NOTES, { pooling: 'mean', normalize: true });
  const dim = out.dims[out.dims.length - 1];
  const flat = out.data;
  const nodes = SEED_NOTES.map((content, i) => ({
    id: `n${i}`,
    content,
    embedding: new Float32Array(flat.buffer, flat.byteOffset + i * dim * 4, dim).slice()
  }));
  console.log(`  embedded in ${Date.now() - t1} ms (${dim}-dim, ${(SEED_NOTES.length / ((Date.now() - t1) / 1000)).toFixed(1)} notes/s)\n`);

  // similarity distribution
  const sims = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      sims.push(cosine(nodes[i].embedding, nodes[j].embedding));
  sims.sort((a, b) => a - b);
  const q = (p) => sims[Math.floor(p * (sims.length - 1))];
  console.log('Pairwise cosine distribution (all C(n,2) pairs):');
  console.log(`  min=${fmt(q(0))}  p25=${fmt(q(0.25))}  median=${fmt(q(0.5))}  p75=${fmt(q(0.75))}  p90=${fmt(q(0.9))}  max=${fmt(q(1))}\n`);

  if (SWEEP) {
    console.log('Threshold sweep (k=3):');
    console.log('  thr   edges   orphans   components');
    for (const t of [0.1, 0.12, 0.15, 0.18, 0.2, 0.22, 0.25, 0.3]) {
      const e = buildEdges(nodes, K, t);
      const deg = new Map(nodes.map((n) => [n.id, 0]));
      for (const ed of e) {
        deg.set(nodes[ed.source].id, deg.get(nodes[ed.source].id) + 1);
        deg.set(nodes[ed.target].id, deg.get(nodes[ed.target].id) + 1);
      }
      const orph = nodes.filter((n) => deg.get(n.id) === 0).length;
      const cs = components(nodes.length, e).length;
      console.log(`  ${t.toFixed(2)}   ${String(e.length).padStart(3)}    ${String(orph).padStart(3)}      ${String(cs).padStart(3)}`);
    }
    console.log();
  }

  const edges = buildEdges(nodes, K, THRESHOLD);
  const above = sims.filter((s) => s >= THRESHOLD).length;
  console.log(`Edges at k=${K}, threshold=${THRESHOLD}: ${edges.length}`);
  console.log(`  pairs ≥ threshold: ${above} / ${sims.length}`);
  console.log(`  avg edges per node: ${((edges.length * 2) / nodes.length).toFixed(2)}\n`);

  // node-degree report — flag any orphans
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    degree.set(nodes[e.source].id, degree.get(nodes[e.source].id) + 1);
    degree.set(nodes[e.target].id, degree.get(nodes[e.target].id) + 1);
  }
  const orphans = nodes.filter((n) => degree.get(n.id) === 0);
  if (orphans.length) {
    console.log(`⚠  ${orphans.length} orphan note${orphans.length === 1 ? '' : 's'} (no neighbors above threshold):`);
    for (const n of orphans) console.log(`     · ${n.content}`);
    console.log();
  } else {
    console.log('✓ every seed note has at least one connection.\n');
  }

  // top edges
  console.log('Top 10 edges by similarity:');
  const top = [...edges].sort((a, b) => b.weight - a.weight).slice(0, 10);
  for (const e of top) {
    console.log(
      `  ${fmt(e.weight)}%  ${preview(nodes[e.source].content)}  ↔  ${preview(nodes[e.target].content)}`
    );
  }
  console.log();

  // weakest-edge sanity check
  console.log('Weakest 5 edges (just above threshold):');
  const bot = [...edges].sort((a, b) => a.weight - b.weight).slice(0, 5);
  for (const e of bot) {
    console.log(
      `  ${fmt(e.weight)}%  ${preview(nodes[e.source].content)}  ↔  ${preview(nodes[e.target].content)}`
    );
  }
  console.log();

  // connected components
  const comps = components(nodes.length, edges);
  console.log(`Connected components: ${comps.length}`);
  comps.forEach((c, i) => {
    const tag = i === 0 ? '(largest) ' : '';
    console.log(`  ${tag}${c.length} note${c.length === 1 ? '' : 's'}`);
    if (comps.length <= 6 || c.length > 1) {
      for (const idx of c) console.log(`     · ${nodes[idx].content}`);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
