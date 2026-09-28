<script>
  let { selectedNode, connections, onSelect, onClose } = $props();

  function formatTime(ts) {
    const d = new Date(ts);
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  }
</script>

<div class="node-card">
  <div class="node-card-head">
    <div class="node-card-meta">
      <span class="node-id">{selectedNode.id}</span>
      <span class="node-time">{formatTime(selectedNode.createdAt)}</span>
    </div>
    <button class="x-btn" onclick={onClose} aria-label="Close">×</button>
  </div>
  <div class="node-content">{selectedNode.content}</div>
  <div class="node-conns">
    <div class="node-conns-label">
      <span>{connections.length} CONNECTIONS</span>
      <span class="rule"></span>
    </div>
    {#if connections.length === 0}
      <div class="empty-conns">no semantic neighbors yet — add more notes</div>
    {/if}
    {#each connections as c (c.node.id)}
      <button class="conn-row" onclick={() => onSelect(c.node.id)}>
        <div class="conn-bar" style:width="{Math.max(8, c.weight * 100)}%"></div>
        <div class="conn-text">{c.node.content}</div>
        <div class="conn-score">{(c.weight * 100).toFixed(0)}</div>
      </button>
    {/each}
  </div>
</div>
