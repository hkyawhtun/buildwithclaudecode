<script>
  import { onMount, untrack } from 'svelte';
  import {
    forceSimulation,
    forceManyBody,
    forceLink,
    forceX,
    forceY,
    forceCollide
  } from 'd3-force';

  let {
    nodes,
    edges,
    selectedId,
    onSelect,
    highlightIds = new Set(),
    dimNonHighlight = false,
    newlyAddedId = null,
    width,
    height
  } = $props();

  let canvas;
  let cursor = $state('grab');

  // d3-force simulation. Nodes are mutated in-place with {x,y,vx,vy,fx,fy}.
  // We keep a local copy keyed by node id so positions persist across re-renders.
  const simNodes = new Map(); // id -> {id, x, y, vx, vy, fx, fy, bornAt}
  let simulation = null;
  let view = { scale: 1, tx: 0, ty: 0 };

  function syncSimNodes() {
    // Add new ids; remove gone ids.
    const ids = new Set();
    nodes.forEach((n, i) => {
      ids.add(n.id);
      if (!simNodes.has(n.id)) {
        const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2 + Math.random() * 0.5;
        const r = 80 + Math.random() * 60;
        simNodes.set(n.id, {
          id: n.id,
          x: Math.cos(angle) * r + (Math.random() - 0.5) * 40,
          y: Math.sin(angle) * r + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          bornAt: n.id === newlyAddedId ? performance.now() : 0
        });
      }
    });
    for (const id of [...simNodes.keys()]) {
      if (!ids.has(id)) simNodes.delete(id);
    }
  }

  function buildSimInputs() {
    const list = nodes.map((n) => simNodes.get(n.id)).filter(Boolean);
    const idxById = new Map(nodes.map((n, i) => [n.id, i]));
    const links = edges
      .map((e) => {
        const a = simNodes.get(nodes[e.source].id);
        const b = simNodes.get(nodes[e.target].id);
        if (!a || !b) return null;
        return { source: a, target: b, weight: e.weight };
      })
      .filter(Boolean);
    return { list, links, idxById };
  }

  function ensureSimulation() {
    syncSimNodes();
    const { list, links } = buildSimInputs();

    if (!simulation) {
      simulation = forceSimulation(list)
        .force(
          'charge',
          forceManyBody().strength(-260)
        )
        .force(
          'link',
          forceLink(links)
            .id((d) => d.id)
            .distance((l) => 130 - 30 * l.weight)
            .strength((l) => 0.18 * (0.4 + l.weight))
        )
        .force('x', forceX(0).strength(0.04))
        .force('y', forceY(0).strength(0.04))
        .force('collide', forceCollide(16))
        .alphaDecay(0.02)
        .velocityDecay(0.32)
        .on('tick', draw);
    } else {
      simulation.nodes(list);
      simulation.force('link').links(links);
      simulation.alpha(0.6).restart();
    }
  }

  // React to nodes/edges changes.
  $effect(() => {
    // touch reactive deps
    nodes;
    edges;
    untrack(() => ensureSimulation());
  });

  // Redraw when visual-only props change (no need to reheat sim).
  $effect(() => {
    selectedId;
    highlightIds;
    dimNonHighlight;
    newlyAddedId;
    width;
    height;
    untrack(() => draw());
  });

  // Mark birth time when a new node arrives.
  $effect(() => {
    if (!newlyAddedId) return;
    const sn = simNodes.get(newlyAddedId);
    if (sn) sn.bornAt = performance.now();
  });

  function draw() {
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

    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.translate(cx + view.tx, cy + view.ty);
    ctx.scale(view.scale, view.scale);

    const hl = highlightIds || new Set();
    const dim = !!dimNonHighlight;

    // edges
    ctx.lineWidth = 1;
    for (const e of edges) {
      const a = simNodes.get(nodes[e.source].id);
      const b = simNodes.get(nodes[e.target].id);
      if (!a || !b) continue;
      const isSel =
        selectedId !== null &&
        (nodes[e.source].id === selectedId || nodes[e.target].id === selectedId);
      const isHl = hl.has(nodes[e.source].id) && hl.has(nodes[e.target].id);
      let alpha = 0.18 + e.weight * 0.4;
      if (dim && !isHl) alpha *= 0.18;
      if (isSel) alpha = Math.max(alpha, 0.85);
      ctx.strokeStyle = isSel
        ? `rgba(120, 220, 255, ${alpha})`
        : `rgba(180, 200, 220, ${alpha})`;
      ctx.lineWidth = isSel ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // nodes (ringed)
    const now = performance.now();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const p = simNodes.get(n.id);
      if (!p) continue;
      const isSel = n.id === selectedId;
      const isHl = hl.has(n.id);
      const isNeighbor =
        selectedId !== null &&
        edges.some(
          (e) =>
            (nodes[e.source].id === selectedId && nodes[e.target].id === n.id) ||
            (nodes[e.target].id === selectedId && nodes[e.source].id === n.id)
        );
      const ageMs = p.bornAt ? now - p.bornAt : Infinity;
      const isFresh = n.id === newlyAddedId && ageMs < 1000;
      const dimmed = dim && !isHl && !isSel;

      const r = 12;
      // outer halo for selected/highlighted
      if (isSel) {
        const grad = ctx.createRadialGradient(p.x, p.y, r, p.x, p.y, r * 3.2);
        grad.addColorStop(0, 'rgba(120, 220, 255, 0.45)');
        grad.addColorStop(1, 'rgba(120, 220, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (isHl) {
        const grad = ctx.createRadialGradient(p.x, p.y, r, p.x, p.y, r * 3);
        grad.addColorStop(0, 'rgba(255, 190, 110, 0.5)');
        grad.addColorStop(1, 'rgba(255, 190, 110, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ring
      ctx.lineWidth = isSel ? 1.6 : 1;
      const ringColor = isSel
        ? 'rgba(150, 230, 255, 0.95)'
        : isHl
        ? 'rgba(255, 200, 130, 0.95)'
        : isNeighbor
        ? 'rgba(180, 220, 240, 0.85)'
        : dimmed
        ? 'rgba(140, 160, 180, 0.18)'
        : 'rgba(180, 200, 220, 0.55)';
      ctx.strokeStyle = ringColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // core
      const coreColor = isSel
        ? 'rgba(140, 230, 255, 1)'
        : isHl
        ? 'rgba(255, 200, 130, 1)'
        : dimmed
        ? 'rgba(120, 140, 160, 0.35)'
        : 'rgba(220, 230, 240, 0.85)';
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isSel ? 4.2 : 3.2, 0, Math.PI * 2);
      ctx.fill();

      // birth pulse
      if (isFresh) {
        const t = ageMs / 1000;
        ctx.strokeStyle = `rgba(140, 230, 255, ${1 - t})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + t * 30, 0, Math.PI * 2);
        ctx.stroke();
      }

      // label (first 3 words)
      const words = (n.content || '').split(/\s+/);
      const label = words.slice(0, 3).join(' ');
      ctx.font = '500 11px "Geist", "Inter", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelAlpha = dimmed ? 0.25 : isSel || isHl ? 1 : 0.78;
      ctx.fillStyle = `rgba(220, 230, 240, ${labelAlpha})`;
      ctx.fillText(label + (words.length > 3 ? '…' : ''), p.x, p.y + r + 6);
    }
    ctx.restore();
  }

  // Pointer interactions: drag node, pan empty space, wheel-zoom.
  let drag = null;

  function screenToWorld(sx, sy) {
    return {
      x: (sx - width / 2 - view.tx) / view.scale,
      y: (sy - height / 2 - view.ty) / view.scale
    };
  }

  function hitTest(sx, sy) {
    const w = screenToWorld(sx, sy);
    for (const n of nodes) {
      const p = simNodes.get(n.id);
      if (!p) continue;
      const dx = w.x - p.x;
      const dy = w.y - p.y;
      if (dx * dx + dy * dy < 14 * 14) return n;
    }
    return null;
  }

  function onPointerDown(e) {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hit = hitTest(sx, sy);
    if (hit) {
      const p = simNodes.get(hit.id);
      const w = screenToWorld(sx, sy);
      drag = {
        id: hit.id,
        dx: p.x - w.x,
        dy: p.y - w.y,
        moved: false,
        downX: sx,
        downY: sy
      };
      // Pin during drag — d3-force respects fx/fy.
      p.fx = p.x;
      p.fy = p.y;
      simulation?.alphaTarget(0.3).restart();
    } else {
      drag = {
        id: '__pan__',
        startTx: view.tx,
        startTy: view.ty,
        downX: sx,
        downY: sy
      };
    }
  }

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (!drag) {
      const hit = hitTest(sx, sy);
      cursor = hit ? 'pointer' : 'grab';
      return;
    }
    if (drag.id === '__pan__') {
      view.tx = drag.startTx + (sx - drag.downX);
      view.ty = drag.startTy + (sy - drag.downY);
      cursor = 'grabbing';
      draw();
      return;
    }
    const w = screenToWorld(sx, sy);
    const p = simNodes.get(drag.id);
    if (p) {
      p.fx = w.x + drag.dx;
      p.fy = w.y + drag.dy;
    }
    if (Math.hypot(sx - drag.downX, sy - drag.downY) > 4) drag.moved = true;
    cursor = 'grabbing';
  }

  function onPointerUp(e) {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (drag.id !== '__pan__') {
      const p = simNodes.get(drag.id);
      if (p) {
        p.fx = null;
        p.fy = null;
      }
      simulation?.alphaTarget(0);
      if (!drag.moved) {
        const hit = hitTest(sx, sy);
        onSelect?.(hit ? hit.id : null);
      }
    } else {
      if (Math.hypot(sx - drag.downX, sy - drag.downY) < 4) {
        onSelect?.(null);
      }
    }
    drag = null;
    cursor = 'grab';
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.min(2.5, Math.max(0.4, view.scale * factor));
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left - width / 2;
    const sy = e.clientY - rect.top - height / 2;
    view.tx = sx - (sx - view.tx) * (newScale / view.scale);
    view.ty = sy - (sy - view.ty) * (newScale / view.scale);
    view.scale = newScale;
    draw();
  }

  onMount(() => {
    return () => simulation?.stop();
  });
</script>

<canvas
  bind:this={canvas}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onwheel={onWheel}
  style:cursor
  style:display="block"
></canvas>
