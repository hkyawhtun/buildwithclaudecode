const { useEffect, useRef, useState, useMemo, useCallback } = React;

function App() {
  const [nodes, setNodes] = useState(() =>
    window.SEED_NOTES.map((c, i) => ({
      id: `n${i}`,
      content: c,
      embedding: window.embed(c),
      createdAt: Date.now() - (window.SEED_NOTES.length - i) * 60000,
    }))
  );
  const [selectedId, setSelectedId] = useState(null);
  const [newlyAddedId, setNewlyAddedId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [captureValue, setCaptureValue] = useState('');
  const [captureFocused, setCaptureFocused] = useState(false);
  const [hint, setHint] = useState(true);

  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 30);
      }
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); setSearchQ(''); }
        else if (selectedId) setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, selectedId]);

  const edges = useMemo(() => window.buildEdges(nodes, 3, 0.18), [nodes]);

  const addNote = (text) => {
    const t = text.trim();
    if (!t) return;
    const id = `n${Date.now()}`;
    const newNode = {
      id,
      content: t,
      embedding: window.embed(t),
      createdAt: Date.now(),
      _birthTick: 0, // graph will compare against tickRef
    };
    setNodes(prev => [...prev, newNode]);
    setNewlyAddedId(id);
    setSelectedId(id);
    setHint(false);
    setTimeout(() => setNewlyAddedId(null), 1500);
  };

  const onCaptureSubmit = (e) => {
    e.preventDefault();
    if (!captureValue.trim()) return;
    addNote(captureValue);
    setCaptureValue('');
  };

  // Search results
  const searchResults = useMemo(() => {
    const q = searchQ.trim();
    if (!q) return [];
    const qv = window.embed(q);
    return nodes
      .map(n => ({ node: n, score: window.cosine(qv, n.embedding) }))
      .filter(r => r.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [searchQ, nodes]);

  const highlightIds = useMemo(() => {
    if (!searchOpen || !searchQ.trim()) return new Set();
    return new Set(searchResults.slice(0, 5).map(r => r.node.id));
  }, [searchResults, searchOpen, searchQ]);

  // Selected node info
  const selectedNode = nodes.find(n => n.id === selectedId);
  const connections = useMemo(() => {
    if (!selectedNode) return [];
    const idx = nodes.findIndex(n => n.id === selectedId);
    const conns = edges
      .filter(e => e.source === idx || e.target === idx)
      .map(e => {
        const other = e.source === idx ? nodes[e.target] : nodes[e.source];
        return { node: other, weight: e.weight };
      })
      .sort((a, b) => b.weight - a.weight);
    return conns;
  }, [selectedNode, edges, nodes, selectedId]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="app">
      {/* Background grid */}
      <div className="bg-grid" />
      <div className="bg-vignette" />

      {/* Top bar */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-glyph">
            <svg viewBox="0 0 20 20" width="14" height="14">
              <circle cx="10" cy="10" r="3" fill="currentColor" />
              <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-name">Mesh</div>
            <div className="brand-sub">second brain · v0.1</div>
          </div>
        </div>

        <div className="topbar-stats">
          <div className="stat"><span className="stat-num">{nodes.length}</span><span className="stat-label">notes</span></div>
          <div className="stat-sep" />
          <div className="stat"><span className="stat-num">{edges.length}</span><span className="stat-label">connections</span></div>
        </div>

        <div className="topbar-actions">
          <button className="ghost-btn" onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 30); }}>
            <svg viewBox="0 0 20 20" width="14" height="14"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.4"/><line x1="13.5" y1="13.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.4"/></svg>
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
        </div>
      </header>

      {/* Graph */}
      <div className="graph-wrap">
        <Graph
          nodes={nodes}
          edges={edges}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          highlightIds={highlightIds}
          dimNonHighlight={searchOpen && searchQ.trim().length > 0}
          newlyAddedId={newlyAddedId}
          width={size.w}
          height={size.h}
        />
      </div>

      {/* Floating hint */}
      {hint && nodes.length > 0 && !selectedId && (
        <div className="hint">
          <span className="hint-dot" />
          drag to rearrange · scroll to zoom · click a node to inspect
        </div>
      )}

      {/* Selected node card (bottom-left) */}
      {selectedNode && (
        <div className="node-card">
          <div className="node-card-head">
            <div className="node-card-meta">
              <span className="node-id">{selectedNode.id}</span>
              <span className="node-time">{formatTime(selectedNode.createdAt)}</span>
            </div>
            <button className="x-btn" onClick={() => setSelectedId(null)} aria-label="Close">×</button>
          </div>
          <div className="node-content">{selectedNode.content}</div>
          <div className="node-conns">
            <div className="node-conns-label">
              <span>{connections.length} CONNECTIONS</span>
              <span className="rule" />
            </div>
            {connections.length === 0 && (
              <div className="empty-conns">no semantic neighbors yet — add more notes</div>
            )}
            {connections.map(c => (
              <button
                key={c.node.id}
                className="conn-row"
                onClick={() => setSelectedId(c.node.id)}
              >
                <div className="conn-bar" style={{ width: `${Math.max(8, c.weight * 100)}%` }} />
                <div className="conn-text">{c.node.content}</div>
                <div className="conn-score">{(c.weight * 100).toFixed(0)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Capture bar (bottom-center) */}
      <form className={`capture ${captureFocused ? 'focused' : ''}`} onSubmit={onCaptureSubmit}>
        <div className="capture-glyph">
          <svg viewBox="0 0 20 20" width="14" height="14">
            <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </div>
        <input
          ref={inputRef}
          className="capture-input"
          placeholder="capture a thought…"
          value={captureValue}
          onChange={(e) => setCaptureValue(e.target.value)}
          onFocus={() => setCaptureFocused(true)}
          onBlur={() => setCaptureFocused(false)}
        />
        <div className="capture-meta">
          {captureValue.trim() ? (
            <span className="capture-go">return ↵</span>
          ) : (
            <span className="capture-hint">⌘N</span>
          )}
        </div>
      </form>

      {/* Search panel (right side) */}
      <div className={`search-panel ${searchOpen ? 'open' : ''}`}>
        <div className="search-head">
          <div className="search-head-label">SEMANTIC SEARCH</div>
          <button className="x-btn" onClick={() => { setSearchOpen(false); setSearchQ(''); }} aria-label="Close">×</button>
        </div>
        <div className="search-input-wrap">
          <svg viewBox="0 0 20 20" width="14" height="14"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.4"/><line x1="13.5" y1="13.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.4"/></svg>
          <input
            ref={searchInputRef}
            className="search-input"
            placeholder="search by meaning…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <div className="search-suggest">
          {!searchQ.trim() && (
            <div className="suggest-block">
              <div className="suggest-label">TRY</div>
              {['fast ai hardware', 'how to think clearly', 'craft and taste', 'find ideas by feeling'].map(q => (
                <button key={q} className="suggest-row" onClick={() => setSearchQ(q)}>
                  <span className="suggest-arrow">→</span>{q}
                </button>
              ))}
            </div>
          )}
        </div>
        {searchQ.trim() && (
          <div className="search-results">
            <div className="results-label">
              <span>{searchResults.length} RESULT{searchResults.length === 1 ? '' : 'S'}</span>
              <span className="rule" />
              <span className="dim">ranked by similarity</span>
            </div>
            {searchResults.length === 0 && (
              <div className="empty-results">
                <div className="empty-results-title">no semantic match</div>
                <div className="empty-results-sub">your notes don't relate to this query — try another phrasing or add a note about it.</div>
              </div>
            )}
            {searchResults.map((r, i) => (
              <button
                key={r.node.id}
                className={`result-row ${selectedId === r.node.id ? 'active' : ''}`}
                onClick={() => setSelectedId(r.node.id)}
              >
                <div className="result-rank">{String(i + 1).padStart(2, '0')}</div>
                <div className="result-body">
                  <div className="result-text">{r.node.content}</div>
                  <div className="result-meta">
                    <div className="result-bar"><div className="result-bar-fill" style={{ width: `${r.score * 100}%` }} /></div>
                    <div className="result-score">{(r.score * 100).toFixed(0)}<span className="dim">%</span></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="empty">
          <div className="empty-title">start thinking</div>
          <div className="empty-sub">capture a thought below — it'll find its neighbors automatically</div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
