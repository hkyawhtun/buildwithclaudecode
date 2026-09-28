// Force-directed graph with simple physics. Verlet-ish: positions integrated with damping.
const { useEffect, useRef, useState, useCallback, useMemo } = React;

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-9);
}

function buildEdges(nodes, k = 3, threshold = 0.18) {
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
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: i < j ? i : j, target: i < j ? j : i, weight: s });
    }
  }
  return edges;
}

function Graph({ nodes, edges, selectedId, setSelectedId, highlightIds, dimNonHighlight, newlyAddedId, width, height }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const simRef = useRef({ pos: new Map(), vel: new Map(), pinned: new Map() });
  const dragRef = useRef({ id: null, dx: 0, dy: 0 });
  const viewRef = useRef({ scale: 1, tx: 0, ty: 0 });
  const [, force] = useState(0);
  const tickRef = useRef(0);

  // initialize positions for new nodes
  useEffect(() => {
    const sim = simRef.current;
    nodes.forEach((n, i) => {
      if (!sim.pos.has(n.id)) {
        const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2 + Math.random() * 0.5;
        const r = 80 + Math.random() * 60;
        sim.pos.set(n.id, { x: Math.cos(angle) * r + (Math.random()-0.5)*40, y: Math.sin(angle) * r + (Math.random()-0.5)*40 });
        sim.vel.set(n.id, { x: 0, y: 0 });
      }
    });
    // remove stale
    const ids = new Set(nodes.map(n => n.id));
    for (const id of [...sim.pos.keys()]) if (!ids.has(id)) { sim.pos.delete(id); sim.vel.delete(id); sim.pinned.delete(id); }
  }, [nodes]);

  // physics loop
  useEffect(() => {
    let raf;
    const tick = () => {
      const sim = simRef.current;
      const idToIdx = new Map(nodes.map((n, i) => [n.id, i]));
      // forces
      const f = new Map();
      nodes.forEach(n => f.set(n.id, { x: 0, y: 0 }));

      // repulsion (n^2 fine for small N)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = sim.pos.get(nodes[i].id), b = sim.pos.get(nodes[j].id);
          if (!a || !b) continue;
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx*dx + dy*dy + 0.01;
          const d = Math.sqrt(d2);
          const rep = 4500 / d2;
          const fx = (dx/d) * rep, fy = (dy/d) * rep;
          f.get(nodes[i].id).x += fx; f.get(nodes[i].id).y += fy;
          f.get(nodes[j].id).x -= fx; f.get(nodes[j].id).y -= fy;
        }
      }
      // spring along edges
      for (const e of edges) {
        const sId = nodes[e.source].id, tId = nodes[e.target].id;
        const a = sim.pos.get(sId), b = sim.pos.get(tId);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx*dx + dy*dy) + 0.01;
        const rest = 130 - 30 * e.weight; // stronger similarity = shorter edge
        const k = 0.018 * (0.4 + e.weight);
        const fmag = k * (d - rest);
        const fx = (dx/d) * fmag, fy = (dy/d) * fmag;
        f.get(sId).x += fx; f.get(sId).y += fy;
        f.get(tId).x -= fx; f.get(tId).y -= fy;
      }
      // gentle gravity to center
      nodes.forEach(n => {
        const p = sim.pos.get(n.id);
        if (!p) return;
        f.get(n.id).x += -p.x * 0.004;
        f.get(n.id).y += -p.y * 0.004;
      });

      // integrate
      const damping = 0.82;
      nodes.forEach(n => {
        if (sim.pinned.get(n.id)) return;
        const v = sim.vel.get(n.id), p = sim.pos.get(n.id), ff = f.get(n.id);
        if (!v || !p) return;
        v.x = (v.x + ff.x * 0.02) * damping;
        v.y = (v.y + ff.y * 0.02) * damping;
        // clamp speed
        const sp = Math.hypot(v.x, v.y);
        if (sp > 8) { v.x = v.x/sp*8; v.y = v.y/sp*8; }
        p.x += v.x;
        p.y += v.y;
      });

      tickRef.current++;
      draw();
      raf = requestAnimationFrame(tick);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const cx = width/2, cy = height/2;
      const v = viewRef.current;
      ctx.save();
      ctx.translate(cx + v.tx, cy + v.ty);
      ctx.scale(v.scale, v.scale);

      const sim = simRef.current;
      const hl = highlightIds || new Set();
      const dim = !!dimNonHighlight;

      // edges
      ctx.lineWidth = 1;
      for (const e of edges) {
        const a = sim.pos.get(nodes[e.source].id);
        const b = sim.pos.get(nodes[e.target].id);
        if (!a || !b) continue;
        const isSel = selectedId !== null && (nodes[e.source].id === selectedId || nodes[e.target].id === selectedId);
        const isHl = hl.has(nodes[e.source].id) && hl.has(nodes[e.target].id);
        let alpha = 0.18 + e.weight * 0.4;
        if (dim && !isHl) alpha *= 0.18;
        if (isSel) alpha = Math.max(alpha, 0.85);
        ctx.strokeStyle = isSel ? `rgba(120, 220, 255, ${alpha})` : `rgba(180, 200, 220, ${alpha})`;
        ctx.lineWidth = isSel ? 1.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // nodes (ringed)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const p = sim.pos.get(n.id);
        if (!p) continue;
        const isSel = n.id === selectedId;
        const isHl = hl.has(n.id);
        const isNeighbor = selectedId !== null && edges.some(e =>
          (nodes[e.source].id === selectedId && nodes[e.target].id === n.id) ||
          (nodes[e.target].id === selectedId && nodes[e.source].id === n.id)
        );
        const isFresh = n.id === newlyAddedId && tickRef.current - (n._birthTick || 0) < 60;
        const dimmed = dim && !isHl && !isSel;

        const r = 12;
        // outer halo for selected/highlighted
        if (isSel) {
          const grad = ctx.createRadialGradient(p.x, p.y, r, p.x, p.y, r * 3.2);
          grad.addColorStop(0, 'rgba(120, 220, 255, 0.45)');
          grad.addColorStop(1, 'rgba(120, 220, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2); ctx.fill();
        } else if (isHl) {
          const grad = ctx.createRadialGradient(p.x, p.y, r, p.x, p.y, r * 3);
          grad.addColorStop(0, 'rgba(255, 190, 110, 0.5)');
          grad.addColorStop(1, 'rgba(255, 190, 110, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2); ctx.fill();
        }

        // ring
        ctx.lineWidth = isSel ? 1.6 : 1;
        const ringColor = isSel ? 'rgba(150, 230, 255, 0.95)' :
                          isHl ? 'rgba(255, 200, 130, 0.95)' :
                          isNeighbor ? 'rgba(180, 220, 240, 0.85)' :
                          dimmed ? 'rgba(140, 160, 180, 0.18)' : 'rgba(180, 200, 220, 0.55)';
        ctx.strokeStyle = ringColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // core
        const coreColor = isSel ? 'rgba(140, 230, 255, 1)' :
                          isHl ? 'rgba(255, 200, 130, 1)' :
                          dimmed ? 'rgba(120, 140, 160, 0.35)' : 'rgba(220, 230, 240, 0.85)';
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSel ? 4.2 : 3.2, 0, Math.PI * 2);
        ctx.fill();

        // birth pulse
        if (isFresh) {
          const age = tickRef.current - (n._birthTick || 0);
          const t = age / 60;
          ctx.strokeStyle = `rgba(140, 230, 255, ${1 - t})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + t * 30, 0, Math.PI * 2);
          ctx.stroke();
        }

        // label
        const label = (n.content || '').split(/\s+/).slice(0, 3).join(' ');
        ctx.font = '500 11px "Geist", "Inter", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelAlpha = dimmed ? 0.25 : (isSel || isHl ? 1 : 0.78);
        ctx.fillStyle = `rgba(220, 230, 240, ${labelAlpha})`;
        ctx.fillText(label + (n.content.split(/\s+/).length > 3 ? '…' : ''), p.x, p.y + r + 6);
      }
      ctx.restore();
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges, selectedId, highlightIds, dimNonHighlight, newlyAddedId, width, height]);

  // Mouse interactions
  const screenToWorld = (sx, sy) => {
    const v = viewRef.current;
    return { x: (sx - width/2 - v.tx) / v.scale, y: (sy - height/2 - v.ty) / v.scale };
  };

  const hitTest = (sx, sy) => {
    const w = screenToWorld(sx, sy);
    const sim = simRef.current;
    for (const n of nodes) {
      const p = sim.pos.get(n.id);
      if (!p) continue;
      const dx = w.x - p.x, dy = w.y - p.y;
      if (dx*dx + dy*dy < 14*14) return n;
    }
    return null;
  };

  const onMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const hit = hitTest(sx, sy);
    if (hit) {
      const sim = simRef.current;
      const p = sim.pos.get(hit.id);
      const w = screenToWorld(sx, sy);
      dragRef.current = { id: hit.id, dx: p.x - w.x, dy: p.y - w.y, moved: false, downX: sx, downY: sy };
      sim.pinned.set(hit.id, true);
    } else {
      dragRef.current = { id: '__pan__', startTx: viewRef.current.tx, startTy: viewRef.current.ty, downX: sx, downY: sy };
    }
  };
  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const d = dragRef.current;
    if (!d.id) {
      // hover cursor
      const hit = hitTest(sx, sy);
      canvasRef.current.style.cursor = hit ? 'pointer' : 'grab';
      return;
    }
    if (d.id === '__pan__') {
      viewRef.current.tx = d.startTx + (sx - d.downX);
      viewRef.current.ty = d.startTy + (sy - d.downY);
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }
    const w = screenToWorld(sx, sy);
    const sim = simRef.current;
    const p = sim.pos.get(d.id);
    if (p) { p.x = w.x + d.dx; p.y = w.y + d.dy; }
    if (Math.hypot(sx - d.downX, sy - d.downY) > 4) d.moved = true;
    canvasRef.current.style.cursor = 'grabbing';
  };
  const onMouseUp = (e) => {
    const d = dragRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (d.id && d.id !== '__pan__') {
      simRef.current.pinned.delete(d.id);
      if (!d.moved) {
        const hit = hitTest(sx, sy);
        setSelectedId(hit ? hit.id : null);
      }
    } else if (d.id === '__pan__') {
      if (Math.hypot(sx - d.downX, sy - d.downY) < 4) {
        setSelectedId(null);
      }
    }
    dragRef.current = { id: null };
    canvasRef.current.style.cursor = 'grab';
  };
  const onWheel = (e) => {
    e.preventDefault();
    const v = viewRef.current;
    const factor = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.min(2.5, Math.max(0.4, v.scale * factor));
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left - width/2;
    const sy = e.clientY - rect.top - height/2;
    // zoom toward cursor
    v.tx = sx - (sx - v.tx) * (newScale / v.scale);
    v.ty = sy - (sy - v.ty) * (newScale / v.scale);
    v.scale = newScale;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      style={{ display: 'block', cursor: 'grab' }}
    />
  );
}

window.Graph = Graph;
window.buildEdges = buildEdges;
window.cosine = cosine;
