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

  /* Other visitors' cursors. Position is sent as a share of the page width and of the
     page height, so it lands on roughly the same content on a different screen size. */
  const layer = document.createElement('div');
  layer.className = 'cursors';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const others = new Map();

  function moveCursor(id, x, y) {
    let c = others.get(id);
    if (!c) {
      const el = document.createElement('span');
      el.className = 'cursor';
      el.innerHTML = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M1.5 1.5v17l4.6-4.3 3 6.3 3-1.4-3-6.2h6.4z" fill="#ff5a1f" stroke="#0e0e0d" stroke-width="1.5" stroke-linejoin="round"/></svg><span class="cursor-tag">Visitor</span>';
      layer.appendChild(el);
      c = { el, x, y, tx: x, ty: y, seen: 0 };
      others.set(id, c);
    }
    c.tx = x; c.ty = y; c.seen = performance.now();
    if (reduced) { c.x = x; c.y = y; }
  }
  function dropCursor(id) {
    const c = others.get(id);
    if (c) { c.el.remove(); others.delete(id); }
  }
  function draw() {
    const now = performance.now();
    const docH = document.documentElement.scrollHeight;
    others.forEach((c, id) => {
      if (now - c.seen > 8000) { dropCursor(id); return; }
      if (!reduced) { c.x += (c.tx - c.x) * 0.2; c.y += (c.ty - c.y) * 0.2; }
      const px = c.x * window.innerWidth;
      const py = c.y * docH - window.scrollY;
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
    function sendPos(x, y) {
      const now = performance.now();
      pending = { id: me, x, y };
      if (now - last < 80) return; // about 12 updates a second
      last = now;
      t.send(pending);
      pending = null;
    }
    if (finePointer) {
      let lx = 0, ly = 0;
      window.addEventListener('pointermove', (e) => {
        lx = e.clientX; ly = e.clientY;
        sendPos(lx / window.innerWidth, (ly + window.scrollY) / document.documentElement.scrollHeight);
      }, { passive: true });
      window.addEventListener('scroll', () => {
        sendPos(lx / window.innerWidth, (ly + window.scrollY) / document.documentElement.scrollHeight);
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
      if (m.type === 'cursor') { peers.set(m.id, Date.now()); moveCursor(m.id, m.x, m.y); }
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
      .on('broadcast', { event: 'cursor' }, ({ payload }) => moveCursor(payload.id, payload.x, payload.y))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ at: Date.now() });
          start({ send: (p) => channel.send({ type: 'broadcast', event: 'cursor', payload: p }) });
        }
      });
  }).catch(() => { /* offline or blocked: the page works the same without the live layer */ });
})();
