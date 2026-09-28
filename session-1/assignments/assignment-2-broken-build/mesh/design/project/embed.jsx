// Tiny on-device "embedding" for demo purposes.
// Hash-based bag-of-words → 64-dim vector. Good enough for the search/connections demo.
const STOP = new Set(['the','a','an','and','or','but','of','in','on','to','for','is','are','was','were','be','been','being','it','its','this','that','these','those','at','by','with','as','from','i','you','we','they','he','she','my','your','our','their','if','then','else','do','does','did','can','will','would','could','should','have','has','had']);

// curated semantic groups so the demo feels meaningful
const SEMANTIC_GROUPS = [
  ['fast','speed','quick','rapid','accelerate','performance','optimize','efficient','throughput','latency','accelerator','accelerated','high-performance','snappy'],
  ['ai','ml','model','models','neural','network','networks','deep','learning','transformer','llm','llms','inference','training','train','embedding','embeddings'],
  ['hardware','gpu','tpu','tpus','chip','chips','silicon','accelerator','processor','cpu','memory','vram','bandwidth','semiconductor'],
  ['math','matrix','linear','algebra','tensor','tensors','vector','vectors','multiplication','dot','product','convolution','gradient','derivative','calculus'],
  ['design','ui','ux','interface','user','aesthetic','visual','typography','layout','grid','color','palette','minimal','craft','prototype'],
  ['write','writing','prose','essay','essays','draft','idea','ideas','thinking','thought','thoughts','note','notes','journal','journaling'],
  ['build','building','ship','shipping','prototype','product','startup','founder','launch','iterate','iterating','mvp','build-fast'],
  ['attention','focus','flow','concentration','deep-work','productive','productivity','mind','brain','cognition','memory','recall'],
  ['graph','graphs','node','nodes','edge','edges','network','connection','connections','link','links','map','mapping','topology'],
  ['search','retrieve','retrieval','query','semantic','similarity','relevance','rank','ranking','vector','embedding','search-engine'],
];

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !STOP.has(t) && t.length > 1);
}

function hashStr(s, mod) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}

const DIM = 64;

function embed(text) {
  const v = new Array(DIM).fill(0);
  const toks = tokenize(text);
  if (!toks.length) return v;
  for (const t of toks) {
    // direct hash bucket
    const i = hashStr(t, DIM);
    v[i] += 1;
    // also add a co-bucket so morphological variants land near each other
    const i2 = hashStr(t.slice(0, Math.max(3, t.length - 1)), DIM);
    v[i2] += 0.5;

    // semantic group buckets
    for (let g = 0; g < SEMANTIC_GROUPS.length; g++) {
      if (SEMANTIC_GROUPS[g].includes(t)) {
        // dedicated dims for each group (wrap into vector)
        const gi = g * 3 % DIM;
        v[gi] += 1.4;
        v[(gi + 1) % DIM] += 0.7;
      }
    }
  }
  // L2 normalize
  let n = 0; for (let i = 0; i < DIM; i++) n += v[i]*v[i];
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= n;
  return v;
}

window.embed = embed;
