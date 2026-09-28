<script>
  import Graph from './lib/Graph.svelte';
  import NodeCard from './lib/NodeCard.svelte';
  import SearchPanel from './lib/SearchPanel.svelte';
  import { embed, embedBatch, loadEmbedder, buildEdges, SIM_THRESHOLD, cosine } from './lib/embed.js';
  import { SEED_NOTES } from './lib/seed.js';
  const seedNow = Date.now();
  let nodes = $state([]);
  let modelReady = $state(false);
  let modelStatus = $state('warming up neural net…');
  let embedding = $state(false); // true while a new note is being embedded

  let selectedId = $state(null);
  let newlyAddedId = $state(null);
  let hint = $state(true);
  let size = $state({ w: window.innerWidth, h: window.innerHeight });

  let captureValue = $state('');
  let captureFocused = $state(false);
  let captureInput;

  const SEARCH_THRESHOLD = 0.15;
  let searchOpen = $state(false);
  let searchQ = $state('');
  /** @type {Float32Array | null} */
  let queryEmbed = $state(null);
  /** @type {HTMLInputElement | null} */
  let searchInput = $state(null);

  // Load model + embed seed notes on mount.
  $effect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadEmbedder();
        if (cancelled) return;
        modelStatus = 'embedding seed notes…';
        const vecs = await embedBatch(SEED_NOTES);
        if (cancelled) return;
        nodes = SEED_NOTES.map((c, i) => ({
          id: `n${i}`,
          content: c,
          embedding: vecs[i],
          createdAt: seedNow - (SEED_NOTES.length - i) * 60000
        }));
        modelReady = true;
      } catch (err) {
        modelStatus = `model failed to load: ${err.message}`;
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const onResize = () => (size = { w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  $effect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchOpen = true;
        setTimeout(() => searchInput?.focus(), 30);
      }
      if (e.key === 'Escape') {
        if (searchOpen) {
          searchOpen = false;
          searchQ = '';
        } else if (selectedId) {
          selectedId = null;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  $effect(() => {
    const q = searchQ.trim();
    if (!modelReady || !q) {
      queryEmbed = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const v = await embed(q);
      if (!cancelled) queryEmbed = v;
    })();
    return () => {
      cancelled = true;
    };
  });

  // Dismiss the hint on first real interaction (pointer, wheel, key).
  $effect(() => {
    if (!hint) return;
    const dismiss = () => (hint = false);
    window.addEventListener('pointerdown', dismiss, { once: true });
    window.addEventListener('wheel', dismiss, { once: true, passive: true });
    window.addEventListener('keydown', dismiss, { once: true });
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('wheel', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  });

  let edges = $derived(buildEdges(nodes, 3, SIM_THRESHOLD));

  let searchResults = $derived.by(() => {
    if (!queryEmbed) return [];
    return nodes
      .map((n) => ({ node: n, score: cosine(queryEmbed, n.embedding) }))
      .filter((r) => r.score > SEARCH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  });

  let highlightIds = $derived(
    !searchOpen || !searchQ.trim()
      ? new Set()
      : new Set(searchResults.slice(0, 5).map((r) => r.node.id))
  );

  async function addNote(text) {
    const t = text.trim();
    if (!t || !modelReady || embedding) return;
    embedding = true;
    try {
      const vec = await embed(t);
      const id = `n${Date.now()}`;
      nodes = [
        ...nodes,
        { id, content: t, embedding: vec, createdAt: Date.now() }
      ];
      newlyAddedId = id;
      selectedId = id;
      hint = false;
      setTimeout(() => (newlyAddedId = null), 1500);
    } finally {
      embedding = false;
    }
  }

  async function onCaptureSubmit(e) {
    e.preventDefault();
    if (!captureValue.trim()) return;
    const text = captureValue;
    captureValue = '';
    await addNote(text);
  }

  let selectedNode = $derived(nodes.find((n) => n.id === selectedId) || null);

  let connections = $derived.by(() => {
    if (!selectedNode) return [];
    const idx = nodes.findIndex((n) => n.id === selectedId);
    return edges
      .filter((e) => e.source === idx || e.target === idx)
      .map((e) => {
        const other = e.source === idx ? nodes[e.target] : nodes[e.source];
        return { node: other, weight: e.weight };
      })
      .sort((a, b) => b.weight - a.weight);
  });
</script>

<div class="app">
  <div class="bg-grid"></div>
  <div class="bg-vignette"></div>

  <header class="topbar">
    <div class="brand">
      <div class="brand-glyph">
        <svg viewBox="0 0 20 20" width="14" height="14">
          <circle cx="10" cy="10" r="3" fill="currentColor" />
          <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6" />
        </svg>
      </div>
      <div class="brand-text">
        <div class="brand-name">Mesh</div>
        <div class="brand-sub">second brain · v0.1</div>
      </div>
    </div>

    <div class="topbar-stats">
      <div class="stat">
        <span class="stat-num">{nodes.length}</span>
        <span class="stat-label">notes</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat">
        <span class="stat-num">{edges.length}</span>
        <span class="stat-label">connections</span>
      </div>
    </div>

    <div class="topbar-actions">
      <button
        class="ghost-btn"
        onclick={() => { searchOpen = true; setTimeout(() => searchInput?.focus(), 30); }}
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.4"/>
          <line x1="13.5" y1="13.5" x2="17" y2="17" stroke="currentColor" stroke-width="1.4"/>
        </svg>
        <span>Search</span>
        <kbd>⌘K</kbd>
      </button>
    </div>

  </header>

  <div class="graph-wrap">
    <Graph
      {nodes}
      {edges}
      {selectedId}
      onSelect={(id) => (selectedId = id)}
      {newlyAddedId}
      width={size.w}
      height={size.h}
      {highlightIds}
      dimNonHighlight={searchOpen && searchQ.trim().length > 0}
    />
  </div>

  {#if hint && nodes.length > 0 && !selectedId}
    <div class="hint">
      <span class="hint-dot"></span>
      drag to rearrange · scroll to zoom · click a node to inspect
    </div>
  {/if}

  {#if selectedNode}
    <NodeCard
      {selectedNode}
      {connections}
      onSelect={(id) => (selectedId = id)}
      onClose={() => (selectedId = null)}
    />
  {/if}

  <SearchPanel
    open={searchOpen}
    bind:query={searchQ}
    results={searchResults}
    {selectedId}
    onSelect={(id) => (selectedId = id)}
    onClose={() => { searchOpen = false; searchQ = ''; }}
    bind:inputEl={searchInput}
  />

  <form class="capture {captureFocused ? 'focused' : ''}" onsubmit={onCaptureSubmit}>
    <div class="capture-glyph">
      <svg viewBox="0 0 20 20" width="14" height="14">
        <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" stroke-width="1.4" />
        <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="1.4" />
      </svg>
    </div>
    <input
      bind:this={captureInput}
      bind:value={captureValue}
      class="capture-input"
      placeholder="capture a thought…"
      onfocus={() => (captureFocused = true)}
      onblur={() => (captureFocused = false)}
    />
    {#if embedding || captureValue.trim()}
      <div class="capture-meta">
        {#if embedding}
          <span class="capture-hint">embedding…</span>
        {:else}
          <span class="capture-go">return ↵</span>
        {/if}
      </div>
    {/if}
  </form>

  {#if !modelReady}
    <div class="empty">
      <div class="empty-title">{modelStatus}</div>
      <div class="empty-sub">all-MiniLM-L6-v2 (q8) · ~22 MB · loads once, runs offline</div>
    </div>
  {:else if nodes.length === 0}
    <div class="empty">
      <div class="empty-title">start thinking</div>
      <div class="empty-sub">
        capture a thought below — it'll find its neighbors automatically
      </div>
    </div>
  {/if}
</div>
