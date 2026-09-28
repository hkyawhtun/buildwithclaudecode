<script>
  let {
    open,
    query = $bindable(''),
    results,
    selectedId,
    onSelect,
    onClose,
    inputEl = $bindable(null)
  } = $props();

  const SUGGESTIONS = [
    'fast ai hardware',
    'how to think clearly',
    'craft and taste',
    'find ideas by feeling'
  ];
</script>

<div class="search-panel" class:open>
  <div class="search-head">
    <span class="search-head-label">SEMANTIC SEARCH</span>
    <button class="x-btn" onclick={onClose} aria-label="Close">×</button>
  </div>

  <div class="search-input-wrap">
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.4"/>
      <line x1="13.5" y1="13.5" x2="17" y2="17" stroke="currentColor" stroke-width="1.4"/>
    </svg>
    <input
      bind:this={inputEl}
      bind:value={query}
      class="search-input"
      placeholder="search by meaning…"
      autocomplete="off"
      spellcheck="false"
    />
  </div>

  {#if !query.trim()}
    <div class="search-suggest">
      <div class="suggest-block">
        <div class="suggest-label">TRY</div>
        {#each SUGGESTIONS as phrase}
          <button class="suggest-row" onclick={() => (query = phrase)}>
            <span class="suggest-arrow">→</span>
            <span>{phrase}</span>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="search-results">
      <div class="results-label">
        <span>{results.length} RESULT{results.length === 1 ? '' : 'S'}</span>
        <span class="rule"></span>
        <span class="dim">ranked by similarity</span>
      </div>

      {#if results.length === 0}
        <div class="empty-results">
          <div class="empty-results-title">no semantic match</div>
          <div class="empty-results-sub">your notes don't relate to this query — try another phrasing or add a note about it.</div>
        </div>
      {:else}
        {#each results as r, i (r.node.id)}
          <button
            class="result-row"
            class:active={selectedId === r.node.id}
            onclick={() => onSelect(r.node.id)}
          >
            <span class="result-rank">{String(i + 1).padStart(2, '0')}</span>
            <div class="result-body">
              <div class="result-text">{r.node.content}</div>
              <div class="result-meta">
                <div class="result-bar">
                  <div class="result-bar-fill" style:width="{r.score * 100}%"></div>
                </div>
                <span class="result-score">{(r.score * 100).toFixed(0)}<span class="dim">%</span></span>
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
