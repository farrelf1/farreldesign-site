import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

$$('[data-scroll]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const target = $(id);
  if (!target) return;
  e.preventDefault();
  const offset = window.innerWidth < 960 ? 60 : 0;
  const y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - offset;
  const focus = () => { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); };
  if (lenis) lenis.scrollTo(y, { duration: 1.4, onComplete: focus });
  else { window.scrollTo(0, y); focus(); }
}));

/* The rail marks where you are. */
const railLinks = $$('.rail-nav a');
$$('[data-section]').filter((el) => el.tagName === 'SECTION').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 50%', end: 'bottom 50%',
    onToggle: (self) => {
      if (!self.isActive) return;
      railLinks.forEach((a) => {
        const on = a.dataset.section === sec.dataset.section;
        a.classList.toggle('is-current', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    },
  });
});

/* Cut between posters inside a frame, wiping in the direction of travel. */
function cutter(frame) {
  const posters = $$('.poster', frame);
  let current = -1;
  let z = 1;
  return function show(i, dir = 1, fast = false) {
    if (i === current) return;
    const next = posters[i];
    const prev = posters[current];
    current = i;
    next.style.zIndex = ++z;
    next.classList.add('is-on');
    gsap.killTweensOf(next);
    if (reduced || fast || !prev) {
      gsap.set(next, { clipPath: 'inset(0% 0% 0% 0%)' });
      posters.forEach((p) => p !== next && p.classList.remove('is-on'));
      return;
    }
    const from = dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)';
    gsap.fromTo(next, { clipPath: from }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'expo.inOut',
      onComplete: () => posters.forEach((p) => p !== posters[current] && p.classList.remove('is-on')),
    });
    gsap.fromTo($('.word', next), { yPercent: 40 * dir }, { yPercent: 0, duration: 1.1, ease: 'expo.out' });
  };
}

/* Hero wall: columns of work drift in opposite directions on a tilted plane. */
const plane = $('.wall-plane');
const kindsOfPoster = [['p-graphic', 'Graphic'], ['p-print', 'OOH'], ['p-motion', 'Motion'], ['p-3d', '3D'], ['p-video', 'Personal']];
const cols = [];
for (let c = 0; c < 5; c++) {
  const col = document.createElement('div');
  col.className = 'wall-col';
  for (let r = 0; r < 12; r++) {
    const [cls, word] = kindsOfPoster[(c * 2 + r) % 5];
    const p = document.createElement('div');
    p.className = 'poster ' + cls;
    p.innerHTML = '<span class="mark"></span><span class="word">' + word + '</span>';
    col.appendChild(p);
  }
  plane.appendChild(col);
  cols.push(col);
}
const drift = cols.map((col, i) => {
  const dir = i % 2 ? 1 : -1;
  // Each column holds two identical runs of six, so moving by half its height loops seamlessly.
  return gsap.fromTo(col, { yPercent: dir > 0 ? -50 : 0 }, { yPercent: dir > 0 ? 0 : -50, duration: 60 + i * 7, ease: 'none', repeat: -1, paused: reduced });
});
cols.forEach((col) => {
  const kids = Array.from(col.children);
  kids.slice(6).forEach((k, i) => { k.className = kids[i].className; k.innerHTML = kids[i].innerHTML; });
});

if (!reduced) {
  // Pointer leans the wall a little, like looking along it.
  const lean = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    lean.x = (e.clientX / window.innerWidth - 0.5) * 2;
    lean.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  const tilt = { flat: 0 };
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { tilt.flat = s.progress; } });
  const cur = { x: 0, y: 0 };
  gsap.ticker.add(() => {
    if (tilt.flat >= 1) return; // the hero is off screen, nothing to draw
    cur.x += (lean.x - cur.x) * 0.05;
    cur.y += (lean.y - cur.y) * 0.05;
    const f = tilt.flat;
    const rx = 28 * (1 - f) - cur.y * 4;
    const ry = -18 * (1 - f) + cur.x * 5;
    const rz = 14 * (1 - f);
    plane.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${1 + f * 0.25})`;
    plane.style.opacity = String(1 - f * 0.7);
  });
}



/* Work: the list scrolls past a fixed viewer that cuts to each project. */
const viewer = $('.viewer');
const showWork = cutter($('.viewer-frame', viewer));
const projects = $$('.project');
const kinds = projects.map((p) => $('.project-kind', p).textContent);
let workIndex = 0;
showWork(0, 1, true);
projects[0].classList.add('is-current');
function setWork(i) {
  if (i === workIndex) return;
  const dir = i > workIndex ? 1 : -1;
  workIndex = i;
  projects.forEach((p, k) => p.classList.toggle('is-current', k === i));
  showWork(i, dir);
  $('.viewer-now').textContent = i + 1;
  jumps.forEach((b, k) => b.classList.toggle('is-current', k === i));
}
const jumps = Array.from(document.querySelectorAll('[data-jump]'));
jumps.forEach((b) => b.addEventListener('click', () => {
  const p = projects[+b.dataset.jump];
  const y = p.getBoundingClientRect().top + window.scrollY + p.offsetHeight / 2 - window.innerHeight * 0.5;
  if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo(0, y);
}));
projects.forEach((p, i) => ScrollTrigger.create({
  trigger: p, start: 'top 55%', end: 'bottom 55%',
  onToggle: (self) => self.isActive && setWork(i),
}));
$$('.open').forEach((b) => b.addEventListener('focus', () => setWork(+b.dataset.project)));

/* Entrance: lines rise once, nothing loops. */
if (!reduced) {
  gsap.from('.hero h1, .hero-sub, .hero-actions', { y: 28, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.3 });
  gsap.from('.wall-col', { opacity: 0, duration: 1.6, ease: 'power2.out', stagger: 0.12 });
}

/* Project note. */
const dialog = $('.note');
const titles = projects.map((p) => $('.project-title', p).textContent);
$$('[data-project]').forEach((b) => b.addEventListener('click', () => {
  const i = +b.dataset.project;
  $('#note-title').textContent = titles[i];
  $('.note-content', dialog).innerHTML = $('.project-more', projects[i]).innerHTML;
  const poster = $('.note-poster', dialog);
  const source = $('.inline-poster', projects[i]);
  poster.className = 'note-poster poster ' + [...source.classList].find((c) => c.startsWith('p-'));
  $('.word', poster).textContent = $('.word', source).textContent;
  $('.note-kind', dialog).textContent = kinds[i];
  $('.note-kind', dialog).classList.add('is-when');
  dialog.showModal();
  if (lenis) lenis.stop();
}));
$('.note-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => lenis && lenis.start());

/* Copy email. */
const copy = $('.copy');
const status = $('.copy-status');
copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(copy.dataset.email); status.textContent = 'Copied'; }
  catch (e) { status.textContent = 'Could not copy, select the address instead'; }
  clearTimeout(copy._t);
  copy._t = setTimeout(() => (status.textContent = ''), 2500);
});
