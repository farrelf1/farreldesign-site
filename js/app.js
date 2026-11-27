/*
 * Farrel Fadillah · rounded portfolio
 * Plain JS, no libraries. Sections:
 *   1. Hero letters      4. Navigation
 *   2. Colour fields     5. Scroll reveals
 *   3. Clock             6. Projects + sheet
 *                        7. Copy email + confetti
 */
(() => {
  "use strict";

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const clampN = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- 1. Hero letters ---------- */

  let charIndex = 0;
  $$("[data-split]").forEach((line) => {
    const text = line.textContent;
    line.textContent = "";
    line.setAttribute("aria-hidden", "true");
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      span.style.setProperty("--i", charIndex++);
      line.appendChild(span);
    }
  });

  // Letters rise in a soft wave around the pointer. Each letter is its own
  // spring, so neighbours follow with a little lag and everything settles
  // smoothly when the pointer leaves.
  const nameEl = $(".hero-name");
  const chars = $$(".char", nameEl).map((el) => ({ el, cx: 0, cy: 0, h: 1, y: 0, vy: 0, r: 0, vr: 0, s: 1, vs: 0 }));
  const pointer = { x: 0, y: 0, active: false };
  let waveRunning = false, lastT = 0;
  // Floating: the letters drift constantly and slowly, like they're floating
  // in water. It never stops; the cursor wave is added on top of it.
  const FLOAT_SPEED = 0.55; // lower = slower drift
  const FLOAT_LIFT = 0.03;  // how far letters bob, as a share of letter height
  const FLOAT_TILT = 1.6;   // degrees of gentle rocking
  let heroOnScreen = true;
  // The rise-in intro also runs on these springs, so it flows straight into
  // the floating with no pause. Each letter starts below its line, tilted.
  let introStart = null, startIntro = null;

  const measure = () => chars.forEach((c) => {
    const r = c.el.getBoundingClientRect();
    c.cx = r.left + r.width / 2;
    c.cy = r.top + r.height / 2 - c.y; // measure the resting position
    c.h = r.height;
  });

  const stepWave = (t) => {
    const dt = Math.min(0.032, (t - lastT) / 1000 || 0.016);
    lastT = t;
    let moving = false;
    const s = (t / 1000) * FLOAT_SPEED;
    chars.forEach((c, i) => {
      if (introStart !== null && t < introStart + c.delay) {
        // still waiting for this letter's turn: hold it below the line
        c.y = c.h * 1.15; c.r = 12; c.vy = c.vr = 0;
        c.el.style.transform = `translate3d(0, ${c.y.toFixed(2)}px, 0) rotate(12deg)`;
        moving = true;
        return;
      }
      // two slow, out-of-step swells per letter, so the drift never looks mechanical
      let ty = -c.h * FLOAT_LIFT * (Math.sin(s * 1.6 - i * 0.45) * 0.7 + Math.sin(s * 0.9 + i * 1.3) * 0.3);
      let tr = FLOAT_TILT * Math.sin(s * 1.2 - i * 0.5 + 1.1);
      let ts = 1;
      if (pointer.active) {
        const dx = (pointer.x - c.cx) / (c.h * 0.8); // distance in letter-ish units
        const dy = (pointer.y - c.cy) / (c.h * 1.1);
        const f = Math.exp(-(dx * dx) / 2) * Math.exp(-(dy * dy) / 2); // gaussian falloff
        ty += -c.h * 0.2 * f;              // rise
        tr += clampN(-dx, -1, 1) * 7 * f;  // lean toward the pointer
        ts += 0.1 * f;                     // swell
      }
      // springs: stiffness 160, damping 16 (soft, barely overshoots)
      c.vy += (160 * (ty - c.y) - 16 * c.vy) * dt; c.y += c.vy * dt;
      c.vr += (160 * (tr - c.r) - 16 * c.vr) * dt; c.r += c.vr * dt;
      c.vs += (160 * (ts - c.s) - 16 * c.vs) * dt; c.s += c.vs * dt;
      if (Math.abs(c.vy) + Math.abs(c.y - ty) > 0.05 || Math.abs(c.vr) + Math.abs(c.r - tr) > 0.01) moving = true;
      c.el.style.transform = `translate3d(0, ${c.y.toFixed(2)}px, 0) rotate(${c.r.toFixed(2)}deg) scale(${c.s.toFixed(4)})`;
    });
    if (moving || pointer.active || heroOnScreen) requestAnimationFrame(stepWave);
    else waveRunning = false;
  };
  const kick = () => {
    if (waveRunning || introStart === null) return;
    waveRunning = true;
    lastT = performance.now();
    requestAnimationFrame(stepWave);
  };

  if (!reduceMotion) {
    const heroCard = $(".hero-card");
    heroCard.addEventListener("pointerenter", measure);
    heroCard.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
      kick();
    });
    heroCard.addEventListener("pointerleave", () => { pointer.active = false; });
    addEventListener("scroll", () => { if (pointer.active) measure(); }, { passive: true });
    addEventListener("resize", measure);
    // the springs run the intro: letters spring up one after another, then float
    chars.forEach((c, i) => { c.delay = 150 + i * 45; c.el.style.transition = "none"; });
    startIntro = () => {
      chars.forEach((c) => (c.el.style.transform = "none"));
      measure();
      chars.forEach((c) => {
        c.y = c.h * 1.15; c.r = 12;
        c.el.style.transform = `translate3d(0, ${c.y.toFixed(2)}px, 0) rotate(12deg)`;
      });
      introStart = performance.now();
      kick();
      // let letters move past their line once they've all risen
      setTimeout(() => nameEl.classList.add("is-live"), 150 + chars.length * 45 + 900);
    };
    // keep the idle wave running only while the hero is on screen
    // and pause it once the hero is about a third scrolled away (it's blurred by then), which
    // keeps phones from redrawing blurred, moving letters on every frame of the scroll
    new IntersectionObserver(([en]) => { heroOnScreen = en.intersectionRatio > 0.7; if (heroOnScreen) kick(); }, { threshold: [0, 0.7, 1] }).observe(heroCard);
  }

  // Start the intro once fonts are in (or after a short wait), so nothing jumps.
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add("is-ready");
    if (startIntro) startIntro();
  }));
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]).then(ready);

  /* ---------- 2. Colour fields ---------- */

  // Each field is a tiny canvas (about 80px wide) stretched over its card. Blobs
  // drift on slow sine waves and lean toward the pointer. x/y are offsets from
  // the centre as a share of width/height; r is the radius as a share of width.
  const fields = [
    {
      root: $(".hero-card"),
      base: "#EAD3A2",
      follow: 0.16,
      blobs: [
        { c: "#B9CBD2", x: -0.36, y: -0.3, r: 0.62, ax: 0.08, ay: 0.08, sp: 0.11 },
        { c: "#F7C35A", x: 0.0, y: 0.05, r: 0.5, ax: 0.1, ay: 0.1, sp: 0.09 },
        { c: "#F2802A", x: 0.36, y: 0.22, r: 0.48, ax: 0.07, ay: 0.12, sp: 0.13 },
        { c: "#FFE2A8", x: -0.1, y: 0.46, r: 0.34, ax: 0.12, ay: 0.06, sp: 0.07 },
      ],
    },
    {
      root: $(".contact-card"),
      base: "#1E3D59",
      follow: 0.1,
      blobs: [
        { c: "#3E6E99", x: -0.4, y: -0.5, r: 0.5, ax: 0.08, ay: 0.1, sp: 0.08 },
        { c: "#FA9819", x: 0.42, y: 0.55, r: 0.5, ax: 0.08, ay: 0.12, sp: 0.1 },
        { c: "#5C8FBF", x: 0.12, y: -0.45, r: 0.3, ax: 0.12, ay: 0.1, sp: 0.12, a: 0.55 },
      ],
    },
  ].filter((f) => f.root && $(".field", f.root));

  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  fields.forEach((f) => {
    f.canvas = $(".field", f.root);
    f.ctx = f.canvas.getContext("2d");
    f.visible = false;
    f.px = 0; f.py = 0; // pointer target (-0.5..0.5)
    f.cx = 0; f.cy = 0; // eased pointer
    f.blobs.forEach((b) => (b.phase = Math.random() * Math.PI * 2));
    const size = () => {
      const r = f.root.getBoundingClientRect();
      f.canvas.width = 80;
      f.canvas.height = Math.max(20, Math.round((80 * r.height) / r.width));
    };
    size();
    new ResizeObserver(size).observe(f.root);
    new IntersectionObserver(([en]) => (f.visible = en.isIntersecting)).observe(f.root);
    f.root.addEventListener("pointermove", (e) => {
      const r = f.root.getBoundingClientRect();
      f.px = (e.clientX - r.left) / r.width - 0.5;
      f.py = (e.clientY - r.top) / r.height - 0.5;
    });
    f.root.addEventListener("pointerleave", () => { f.px = 0; f.py = 0; });
  });

  const paint = (f, s) => {
    const { ctx } = f, w = f.canvas.width, h = f.canvas.height;
    ctx.fillStyle = f.base;
    ctx.fillRect(0, 0, w, h);
    f.blobs.forEach((b, i) => {
      const dir = i % 2 ? -1 : 1; // neighbours lean opposite ways, for depth
      const x = (0.5 + b.x + Math.sin(s * b.sp * 2 + b.phase) * b.ax + f.cx * f.follow * dir * (1 + i * 0.5)) * w;
      const y = (0.5 + b.y + Math.cos(s * b.sp * 1.6 + b.phase) * b.ay + f.cy * f.follow * dir * (1 + i * 0.5)) * h;
      const r = b.r * w * (1 + Math.sin(s * b.sp + b.phase) * 0.08);
      const a = b.a || 1;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(b.c, a));
      g.addColorStop(0.45, rgba(b.c, a * 0.6));
      g.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  };

  const drawFields = (t) => {
    const s = t / 1000;
    for (const f of fields) {
      if (!f.visible) continue;
      f.cx = lerp(f.cx, f.px, 0.04);
      f.cy = lerp(f.cy, f.py, 0.04);
      paint(f, s);
    }
    requestAnimationFrame(drawFields);
  };
  if (reduceMotion) fields.forEach((f) => paint(f, 0));
  else requestAnimationFrame(drawFields);

  /* ---------- Portrait: show the placeholder until images/portrait.jpg exists ---------- */

  const portrait = $(".story-photo img");
  if (portrait) {
    const drop = () => portrait.remove();
    portrait.addEventListener("error", drop);
    if (portrait.complete && !portrait.naturalWidth) drop();
  }

  /* ---------- 3. Clock (Jakarta time) ---------- */

  const clock = $("#clock");
  // 12-hour Jakarta time, e.g. "10:24 AM"
  const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Jakarta" });
  const tick = () => clock && (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 15000);

  /* ---------- 4. Navigation ---------- */

  const nav = $("#nav");
  const links = $$(".nav-links a");
  const linkBox = $(".nav-links");
  const bean = $(".nav-bean");
  // The bar stays put; it just gains a frosted background once you scroll.
  // The hero blurs out as it leaves and a soft blur fades in along the top edge.
  const root = document.documentElement;
  const heroEl = $(".hero");
  const mainEl = $("#main");
  let blurTick = false;
  // Sizes are measured only when they change, never during a scroll frame: reading layout
  // right after writing styles forced a full relayout on every frame, which phones felt.
  let heroH = 0, heroEnd = 1, mainEnd = 0;
  const measureSizes = () => {
    heroH = heroEl.offsetHeight;
    heroEnd = heroEl.offsetTop + heroH;
    mainEnd = mainEl.offsetTop + mainEl.offsetHeight;
    root.style.setProperty("--hero-h", `${heroH}px`);
    root.style.setProperty("--hero-end", `${heroEnd}px`);
    // Chrome keeps an animation's old scroll range when only the variables change, so restart them
    if (cssScroll) { root.classList.remove("css-scroll"); void root.offsetWidth; root.classList.add("css-scroll"); }
    onScroll();
  };
  // Where the browser supports scroll-driven animations, the hero's pin, blur and fade run in
  // CSS together with the scroll itself, so on phones they don't trail a frame behind the finger.
  const cssScroll = !reduceMotion && !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"));
  if (cssScroll) root.classList.add("css-scroll");
  const updateBlur = () => {
    blurTick = false;
    const y = scrollY;
    if (!cssScroll) {
      const out = clamp01((y - heroEnd * 0.25) / (heroEnd * 0.75)); // stays sharp for the first stretch
      root.style.setProperty("--hero-out", (out * out * (3 - 2 * out)).toFixed(3));
      // hero text holds still on screen while the box scrolls up past it
      root.style.setProperty("--hero-y", `${Math.min(Math.max(y, 0), heroH).toFixed(1)}px`);
    }
    root.style.setProperty("--edge-blur", clamp01(y / 120).toFixed(3));
    // the light wash fades out once the page has scrolled off and the navy footer sits under the bar
    root.style.setProperty("--edge-wash", clamp01((mainEnd - y) / 104).toFixed(3));
  };
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", scrollY > 30);
    if (!blurTick) { blurTick = true; requestAnimationFrame(updateBlur); }
  };
  addEventListener("scroll", onScroll, { passive: true });
  new ResizeObserver(measureSizes).observe(document.body);
  onScroll();

  const moveBean = (link) => {
    links.forEach((a) => a.classList.toggle("is-active", a === link));
    linkBox.classList.toggle("has-active", !!link);
    if (!link) return;
    bean.style.width = `${link.offsetWidth}px`;
    bean.style.transform = `translateX(${link.offsetLeft}px)`;
  };

  const sections = links.map((a) => $(a.dataset.spy || a.getAttribute("href"))).filter(Boolean);
  const visible = new Map();
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => visible.set(en.target, en.isIntersecting));
    // last match wins, so a row inside a section (Experience in About) can take over
    const current = [...sections].reverse().find((sec) => visible.get(sec));
    moveBean(current ? links.find((a) => (a.dataset.spy || a.getAttribute("href")) === `#${current.id}`) : null);
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => sectionIO.observe(s));
  addEventListener("resize", () => moveBean($(".nav-links a.is-active")));

  /* ---------- 6. Projects (rendered before reveals so cards animate in too) ---------- */

  const work = window.WORK || [];
  const projectsEl = $("#projects");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const statsHTML = (stats) => `<div class="stats">${stats.map(([n, l]) => `<div class="stat"><b>${esc(n)}</b><small>${esc(l)}</small></div>`).join("")}</div>`;

  const logoHTML = (p) =>
    p.logo
      ? `<img src="${esc(p.logo)}" alt="${esc(p.name)} logo" decoding="async">`
      : `<span class="logo-text">${esc(p.name)}</span>`;

  projectsEl.innerHTML = work.map((p) => `
    <article class="project reveal" data-theme="${esc(p.theme)}" data-id="${esc(p.id)}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="Open ${esc(p.title)}">
      <div class="project-panel">
        ${p.cover ? `<img class="project-cover" src="${esc(p.cover)}" alt="" loading="lazy" decoding="async">` : ""}
        ${p.cover && !p.logo ? "" : `<div class="logo">${logoHTML(p)}</div>`}
      </div>
      <div class="project-info">
        <h3>${esc(p.title)}</h3>
        <ul class="tags">${p.discipline.split(" · ").map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>
    </article>`).join("");

  /* ---------- 5. Scroll reveals ---------- */

  const revealIO = new IntersectionObserver((entries) => {
    let n = 0;
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      // stagger things that arrive together; work cards get a longer, clearer step
      const step = en.target.classList.contains("project") ? 160 : 90;
      en.target.style.setProperty("--d", `${n++ * step}ms`);
      en.target.classList.add("in");
      revealIO.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => revealIO.observe(el));

  // Once something has revealed, drop its delay so hover feels instant.
  document.addEventListener("transitionend", (e) => {
    if (e.target.classList && e.target.classList.contains("in")) e.target.style.removeProperty("--d");
  });

  /* ---------- 6b. Project sheet ---------- */

  const sheet = $("#sheet");
  const sheetBody = $("#sheet-body");
  let lastFocus = null;

  // Full-screen project panel, laid out simply: the logo on top, then
  // one headline, a few labelled rows, the work itself and what I did.
  // Optional fields in work-data.js: `headline` (wrap words in *stars* to
  // highlight them) and `hero` (an image to use as the art band).
  const sheetHTML = (p) => {
    let i = 0;
    const st = () => `class="stagger" style="--i:${i++}"`;
    const imgs = p.images || [];
    const logo = p.logo ? `<img src="${esc(p.logo)}" alt="${esc(p.name)}">` : `<span>${esc(p.name)}</span>`;
    const art = p.hero
      ? `<img class="cover" src="${esc(p.hero)}" alt="">`
      : `<div class="art-logo">${logo}</div>`;
    const headline = esc(p.headline || p.title).replace(/\*(.+?)\*/g, "<mark>$1</mark>");
    // Selected work: company > groups > designs > formats (see work-data.js).
    // All of a design's formats are laid out together in one box, packed into
    // rows of equal height by their own shape (stories, feeds, banners...),
    // so nothing is cropped and there's nothing to click through. Click any
    // format to see it big. A group can also just list `images`.
    const fmtFig = (f, alt) => `<figure class="fmt" style="--ar:${f.ratio || 1}" data-src="${esc(f.src)}" data-label="${esc(f.label || "")}"><img src="${esc(f.src)}" alt="${esc(alt + (f.label ? ", " + f.label : ""))}" loading="lazy" decoding="async" onload="this.parentNode.style.setProperty('--ar', (this.naturalWidth / this.naturalHeight).toFixed(3))">${f.label ? `<figcaption>${esc(f.label)}</figcaption>` : ""}</figure>`;
    const designHTML = (d) => {
      const f = d.formats || [];
      if (!f.length) return "";
      return `<article class="design stagger" style="--i:${i++}">
        <div class="design-info">
          <div><h5>${esc(d.title || "")}</h5>${d.note ? `<p>${esc(d.note)}</p>` : ""}</div>
        </div>
        <div class="collage">${f.map((x) => fmtFig(x, d.title || p.name)).join("")}</div>
      </article>`;
    };
    const galleryHTML = (list) => `<div class="jgallery">${list.map((im) => `<figure class="stagger" style="--i:${i++};--ar:${im.ratio || 1.5}"><img src="${esc(im.src)}" alt="${esc(im.title || p.name)}" loading="lazy" decoding="async" onload="this.parentNode.style.setProperty('--ar', (this.naturalWidth / this.naturalHeight).toFixed(3))"></figure>`).join("")}</div>`;
    const groups = (p.groups && p.groups.length) ? p.groups : imgs.length ? [{ images: imgs }] : [];
    const works = groups.length
      ? `<div class="work-groups">${groups.map((g) => `
          <div class="work-group">
            ${g.title || g.subtitle ? `<div class="work-group-head stagger" style="--i:${i++}">${g.title ? `<h4>${esc(g.title)}</h4>` : ""}${g.subtitle ? `<p>${esc(g.subtitle)}</p>` : ""}</div>` : ""}
            ${g.designs ? `<div class="designs-list">${g.designs.map(designHTML).join("")}</div>` : ""}
            ${g.images && g.images.length ? galleryHTML(g.images) : ""}
          </div>`).join("")}</div>`
      : `<p class="sheet-empty" ${st()}>Renders from the 3D greeting series are coming soon.</p>`;
    return `
      <div class="sheet-art">${art}</div>
      <div class="sheet-page">
        <header class="sheet-head">
          <h2 id="sheet-title" class="stagger" style="--i:${i++}">${headline}</h2>
        </header>
        <dl class="sheet-rows">
          <div ${st()}><dt>Position</dt><dd>${esc(p.role)}</dd></div>
          <div ${st()}><dt>Overview</dt><dd>${esc(p.intro)}</dd></div>
          <div ${st()}><dt>Categories</dt><dd class="cats">${p.discipline.split(" · ").map((c) => `<span>${esc(c)}</span>`).join("")}</dd></div>
          <div ${st()}><dt>Date</dt><dd>${esc(p.period)}</dd></div>
        </dl>
        <section class="sheet-section">
          <h3 ${st()}>Selected work</h3>
          ${works}
        </section>
        <section class="sheet-section">
          <h3 ${st()}>What I did</h3>
          <ul class="did-list">
            ${p.highlights.map(([h, t]) => `<li ${st()}><h4>${esc(h)}</h4><p>${esc(t)}</p></li>`).join("")}
          </ul>
        </section>
      </div>`;
  };

  const openSheet = (p) => {
    lastFocus = document.activeElement;
    sheetBody.innerHTML = sheetHTML(p);
    $(".sheet-inner", sheet).scrollTop = 0;
    sheet.classList.remove("is-closing");
    sheet.showModal();
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add("is-open")));
  };

  const closeSheet = () => {
    if (!sheet.open || sheet.classList.contains("is-closing")) return;
    sheet.classList.add("is-closing");
    sheet.classList.remove("is-open");
    setTimeout(() => {
      sheet.close();
      lightbox.classList.remove("is-open");
      sheet.classList.remove("is-closing");
      document.documentElement.style.overflow = "";
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 500);
  };

  const openCard = (card) => {
    const p = card && work.find((w) => w.id === card.dataset.id);
    if (p) openSheet(p);
  };
  projectsEl.addEventListener("click", (e) => openCard(e.target.closest(".project")));
  projectsEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(e.target.closest(".project")); }
  });
  $(".sheet-close", sheet).addEventListener("click", closeSheet);
  // click a format to see it big; click again or press Esc to close
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `<img alt=""><p></p>`;
  sheet.appendChild(lightbox);
  const closeLightbox = () => lightbox.classList.remove("is-open");
  sheetBody.addEventListener("click", (e) => {
    const f = e.target.closest(".fmt");
    if (!f) return;
    $("img", lightbox).src = f.dataset.src;
    $("p", lightbox).textContent = f.dataset.label;
    lightbox.classList.add("is-open");
  });
  lightbox.addEventListener("click", closeLightbox);
  sheet.addEventListener("cancel", (e) => {
    e.preventDefault();
    if (lightbox.classList.contains("is-open")) closeLightbox(); else closeSheet();
  });
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); }); // backdrop

  /* ---------- 6c. Smooth scrolling ---------- */

  // Mouse-wheel scrolling glides to a stop instead of jumping in steps.
  // Touch scrolling stays native (phones already scroll smoothly).
  // SMOOTH_EASE: lower = floatier and slower to settle, higher = snappier.
  const SMOOTH_EASE = 0.1;
  const smoother = (box) => { // box = a scrolling element, or null for the page
    const get = () => (box ? box.scrollTop : scrollY);
    const max = () => (box ? box.scrollHeight - box.clientHeight : document.documentElement.scrollHeight - innerHeight);
    const set = (y) => (box ? (box.scrollTop = y) : scrollTo(0, y));
    let target = get(), cur = target, running = false, last = 0, glide = null;
    const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      if (glide) {
        // link clicks: a timed glide that eases in and out, never a lurch
        const k = Math.min(1, (t - glide.start) / glide.dur);
        cur = target = glide.from + (glide.to - glide.from) * easeInOut(k);
        if (k === 1) glide = null;
      } else {
        cur += (target - cur) * (1 - Math.pow(1 - SMOOTH_EASE, dt * 60));
        if (Math.abs(target - cur) < 0.5) cur = target;
      }
      set(cur);
      if (glide || cur !== target) requestAnimationFrame(tick); else running = false;
    };
    const start = () => {
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
    };
    const to = (y) => {
      glide = null; // the wheel takes over from a link glide straight away
      if (!running) cur = get();
      target = Math.min(Math.max(y, 0), max());
      start();
    };
    // longer trips take a little longer, between 0.7s and 1.4s
    const glideTo = (y) => {
      const from = get(), dest = Math.min(Math.max(y, 0), max());
      glide = { from, to: dest, start: performance.now(), dur: Math.min(1400, Math.max(700, Math.abs(dest - from) * 0.45)) };
      cur = from;
      start();
    };
    (box || window).addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (!box && sheet.open) return;
      e.preventDefault();
      const d = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1);
      to((running ? target : get()) + d);
    }, { passive: false });
    // keyboard, scrollbar and code-driven scrolls: pick up from wherever we are
    (box || window).addEventListener("scroll", () => { if (!running) target = cur = get(); }, { passive: true });
    return { to, glideTo };
  };

  if (!reduceMotion) {
    const page = smoother(null);
    smoother($(".sheet-inner", sheet));
    // in-page links (Work, About, Contact, back to top) glide there too
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      const el = a && a.getAttribute("href").length > 1 && document.querySelector(a.getAttribute("href"));
      if (!el || sheet.open) return;
      e.preventDefault();
      // the contact footer lives under the page, so "Contact" glides to the very end
      if (el.id === "contact") { page.glideTo(Infinity); return; }
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      page.glideTo(el.getBoundingClientRect().top + scrollY - margin);
    });
  }

  /* ---------- 7. Copy email + confetti ---------- */

  const copyBtn = $("#copy");
  const colours = ["#FA9819", "#F7C35A", "#C6EBF7", "#FFFFFF", "#E0611A"];

  const confetti = (x, y) => {
    if (reduceMotion) return;
    for (let i = 0; i < 22; i++) {
      const bit = document.createElement("span");
      const size = 8 + Math.random() * 10;
      const shape = i % 3;
      Object.assign(bit.style, {
        width: `${shape === 1 ? size * 2 : size}px`,
        height: `${size}px`,
        background: colours[i % colours.length],
        borderRadius: shape === 2 ? "30%" : "999px",
      });
      bit.className = "confetti";
      document.body.appendChild(bit);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const dist = 90 + Math.random() * 140;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      const rot = (Math.random() - 0.5) * 720;
      bit.animate([
        { transform: `translate(${x}px, ${y}px) rotate(0) scale(.4)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x + dx * 1.2}px, ${y + dy + 160}px) rotate(${rot}deg) scale(.8)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = () => bit.remove();
    }
  };

  if (copyBtn) {
    let timer;
    copyBtn.addEventListener("click", async () => {
      const email = copyBtn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        location.href = `mailto:${email}`;
        return;
      }
      const r = copyBtn.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2);
      copyBtn.classList.add("is-copied");
      clearTimeout(timer);
      timer = setTimeout(() => copyBtn.classList.remove("is-copied"), 1800);
    });
  }
})();
