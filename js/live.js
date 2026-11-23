/* Live layer: who else is here, where their cursor is, and (privately) where people scroll.
   Settings are in js/live-config.js. With nothing configured this file does nothing. */
(function () {
  const cfg = window.LIVE_CONFIG || {};
  const demo = new URLSearchParams(location.search).get('live') === 'demo';

  /* Microsoft Clarity: heatmaps, scroll depth and recordings, visible only in your dashboard. */
  if (cfg.clarityId) {
    (function (c, l, a, r, i) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      const t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      const y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', cfg.clarityId);
  }

  const useSupabase = cfg.supabaseUrl && cfg.supabaseAnonKey;
  if (!useSupabase && !demo) return;

  const me = Math.random().toString(36).slice(2, 10);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const counters = Array.from(document.querySelectorAll('.live'));

  function showCount(n) {
    counters.forEach((el) => {
      el.hidden = false;
      el.querySelector('.live-n').textContent = n;
      el.title = n === 1 ? 'Only you are viewing right now' : n + ' people viewing right now';
    });
  }

  /* Other visitors' cursors. Position is sent as the section under the pointer plus a share
     of that section's width and height, so it lands on the same content on any screen size. */
  const sections = Array.from(document.querySelectorAll('main > section, footer'));
  function locate(cx, cy) {
    let i = sections.findIndex((s) => s.getBoundingClientRect().bottom > cy);
    if (i < 0) i = sections.length - 1;
    const r = sections[i].getBoundingClientRect();
    return { s: i, x: (cx - r.left) / r.width, y: (cy - r.top) / r.height };
  }
  const layer = document.createElement('div');
  layer.className = 'cursors';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const others = new Map();

  /* Cursor shapes on a 24px grid: arrow, hand (links and buttons) and I-beam (text), with hotspots. */
  const SHAPES = {
    a: { d: 'M5 3v16l4.2-4 2.8 6 2.8-1.3-2.8-5.9H18z', hx: 5, hy: 3 },
    p: { d: 'M9 2.5c-.9 0-1.6.7-1.6 1.6v8.6l-1.3-1.3c-.7-.7-1.8-.7-2.4 0-.6.6-.6 1.6 0 2.3l4.6 5.2c.9 1 2.1 1.6 3.4 1.6h3.6c2.4 0 4.2-1.9 4.2-4.2v-5.4c0-.9-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v-.8c0-.9-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v-.6c0-.9-.7-1.5-1.5-1.5s-1.4.6-1.5 1.4V4.1c0-.9-.7-1.6-1.6-1.6z', hx: 9, hy: 3 },
    t: { d: 'M7.5 2.5h3.7l.8.8.8-.8h3.7v2.6h-3v13.8h3v2.6h-3.7l-.8-.8-.8.8H7.5v-2.6h3V5.1h-3z', hx: 12, hy: 12 },
  };
  function svg(k, fill, stroke) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="' + SHAPES[k].d + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (k === 't' ? 1 : 1.5) + '" stroke-linejoin="round"/></svg>';
  }
  const POINTER = 'a, button, summary, label, select, [role="button"], a *, button *';
  const TEXT = 'p, h1, h2, h3, h4, li, dd, dt, small, blockquote, figcaption, input, textarea';
  function kindAt(el) {
    if (!el || !el.closest) return 'a';
    if (el.closest('a, button, summary, label, select, [role="button"]')) return 'p';
    if (el.closest(TEXT)) return 't';
    return 'a';
  }

  /* Your own cursor: the system cursor, recoloured blue, so it never lags and still changes
     to a hand over links and an I-beam over text. */
  if (finePointer) {
    const url = (k) => 'url("data:image/svg+xml,' + encodeURIComponent(svg(k, '#2f6fe0', '#ffffff')) + '") ' + SHAPES[k].hx + ' ' + SHAPES[k].hy;
    const style = document.createElement('style');
    style.textContent =
      'html.own-cursor, html.own-cursor body { cursor: ' + url('a') + ', default; }\n' +
      'html.own-cursor :is(' + TEXT + ') { cursor: ' + url('t') + ', text; }\n' +
      'html.own-cursor :is(' + POINTER + ') { cursor: ' + url('p') + ', pointer; }';
    document.head.appendChild(style);
    document.documentElement.classList.add('own-cursor');
  }

  function moveCursor(id, s, x, y, k) {
    if (!sections[s] || !isFinite(x) || !isFinite(y)) return;
    if (!SHAPES[k]) k = 'a';
    let c = others.get(id);
    if (!c) {
      const el = document.createElement('span');
      el.className = 'cursor';
      el.innerHTML = '<span class="cursor-shape"></span><span class="cursor-tag">Visitor</span>';
      layer.appendChild(el);
      c = { el, s, x, y, tx: x, ty: y, seen: 0, k: '' };
      others.set(id, c);
    }
    if (c.k !== k) {
      c.k = k;
      const shape = c.el.firstChild;
      shape.innerHTML = svg(k, '#ff5a1f', '#0e0e0d');
      shape.style.margin = '-' + SHAPES[k].hy + 'px 0 0 -' + SHAPES[k].hx + 'px';
    }
    if (c.s !== s) { c.s = s; c.x = x; c.y = y; } // jump, don't glide, between sections
    c.tx = x; c.ty = y; c.seen = performance.now();
    if (reduced) { c.x = x; c.y = y; }
  }
  function dropCursor(id) {
    const c = others.get(id);
    if (c) { c.el.remove(); others.delete(id); }
  }
  function draw() {
    const now = performance.now();
    others.forEach((c, id) => {
      if (now - c.seen > 8000) { dropCursor(id); return; }
      if (!reduced) { c.x += (c.tx - c.x) * 0.2; c.y += (c.ty - c.y) * 0.2; }
      const r = sections[c.s].getBoundingClientRect();
      const px = r.left + c.x * r.width;
      const py = r.top + c.y * r.height;
      c.el.style.transform = `translate(${px}px, ${py}px)`;
      c.el.classList.toggle('is-idle', now - c.seen > 3000);
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  /* Transport: Supabase Realtime in production, a BroadcastChannel between tabs for ?live=demo. */
  function start(t) {
    let last = 0;
    let pending = null;
    function sendPos(cx, cy) {
      const now = performance.now();
      pending = { id: me, ...locate(cx, cy), k: kindAt(document.elementFromPoint(cx, cy)) };
      if (now - last < 80) return; // about 12 updates a second
      last = now;
      t.send(pending);
      pending = null;
    }
    if (finePointer) {
      let lx = 0, ly = 0;
      window.addEventListener('pointermove', (e) => {
        lx = e.clientX; ly = e.clientY;
        sendPos(lx, ly);
      }, { passive: true });
      window.addEventListener('scroll', () => {
        sendPos(lx, ly);
      }, { passive: true });
      setInterval(() => { if (pending) { t.send(pending); pending = null; } }, 120);
    }
  }

  if (demo) {
    const bc = new BroadcastChannel('farrel-live-demo');
    const peers = new Map([[me, Date.now()]]);
    const count = () => {
      const now = Date.now();
      peers.forEach((t, id) => { if (id !== me && now - t > 5000) { peers.delete(id); dropCursor(id); } });
      showCount(peers.size);
    };
    bc.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'hello') peers.set(m.id, Date.now());
      if (m.type === 'bye') { peers.delete(m.id); dropCursor(m.id); }
      if (m.type === 'cursor') { peers.set(m.id, Date.now()); moveCursor(m.id, m.s, m.x, m.y, m.k); }
      count();
    };
    const hello = () => { peers.set(me, Date.now()); bc.postMessage({ type: 'hello', id: me }); count(); };
    hello(); setInterval(hello, 2000);
    window.addEventListener('pagehide', () => bc.postMessage({ type: 'bye', id: me }));
    start({ send: (p) => bc.postMessage({ type: 'cursor', ...p }) });
    return;
  }

  import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/+esm').then(({ createClient }) => {
    const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const channel = client.channel('portfolio-live', { config: { presence: { key: me }, broadcast: { self: false } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        showCount(Math.max(1, Object.keys(state).length));
        others.forEach((c, id) => { if (!state[id]) dropCursor(id); });
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => moveCursor(payload.id, payload.s, payload.x, payload.y, payload.k))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ at: Date.now() });
          start({ send: (p) => channel.send({ type: 'broadcast', event: 'cursor', payload: p }) });
        }
      });
  }).catch(() => { /* offline or blocked: the page works the same without the live layer */ });
})();
