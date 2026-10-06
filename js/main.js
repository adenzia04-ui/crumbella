/* Crumbella by Ireen
   One fixed three.js stage (cookie + brownie, built procedurally) driven by scroll,
   plus the page's UI: loader, nav, reveals, cursor, filters and the WhatsApp order form. */
(() => {
  'use strict';

  // ---- Edit these for the real business -------------------------------------------
  // Leave whatsapp empty to use "Copy order message". To switch to WhatsApp, fill both,
  // e.g. whatsapp: '60123456789' (country code, no "+" or spaces), whatsappLabel: '+60 12-345 6789'.
  const CONTACT = {
    whatsapp: '923054979830',
    whatsappLabel: '+92 305 4979830',
  };
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
  // -------------------------------------------------------------------------------

  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

  /* ================================================================== LOADER */
  const loader = $('.loader');
  const tempEl = $('#loader-temp');
  const barEl = $('.loader__bar i');
  const loadStart = performance.now();
  let loadTarget = 0.12, loadShown = 0, loaded = false, loadLast = loadStart;
  const setLoad = (v) => { loadTarget = Math.max(loadTarget, v); };
  function tickLoader(now) {
    if (loaded) return;
    loadShown = damp(loadShown, loadTarget, 3.2, Math.min(1, (now - loadLast) / 1000));
    loadLast = now;
    if (loadTarget >= 1 && loadShown > 0.97) loadShown = 1;
    tempEl.textContent = Math.round(loadShown * 180);
    barEl.style.transform = `scaleX(${loadShown})`;
    if (loadShown >= 1 && now - loadStart > 1100) finishLoading();
    else requestAnimationFrame(tickLoader);
  }
  function finishLoading() {
    if (loaded) return;
    loaded = true;
    tempEl.textContent = '180';
    root.classList.add('is-loaded');
    setTimeout(() => $$('.hero [data-split], .hero [data-reveal]').forEach((el, i) => {
      el.style.setProperty('--d', `${i * 0.12}s`);
      el.classList.add('is-in');
    }), 350);
    setTimeout(() => loader && loader.remove(), 1700);
  }
  requestAnimationFrame(tickLoader);
  setTimeout(() => setLoad(1), 6500); // never hold the page hostage

  /* ================================================================== SPLIT + REVEAL */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'wi';
            inner.style.setProperty('--i', i++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
  $$('[data-split], [data-reveal]').forEach((el) => {
    if (el.closest('.hero')) return; // hero waits for the loader
    if (io) io.observe(el); else el.classList.add('is-in');
  });
  // stagger cards in the same row
  $$('.grid .card').forEach((c, i) => c.style.setProperty('--d', `${(i % 2) * 0.12}s`));

  /* ================================================================== SMOOTH SCROLL */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    try { lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4 }); } catch (e) { lenis = null; }
  }
  const scrollTo = (target) => {
    if (lenis) { lenis.scrollTo(target, { duration: 1.8 }); return; }
    const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY;
    scrollTo_native(top);
  };
  const scrollTo_native = (top) => window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollTo(id === '#top' ? 0 : el);
  });

  /* ================================================================== NAV + MENU */
  const nav = $('#nav');
  const menu = $('#menu');
  const menuBtn = $('.nav__menu');
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = 'Menu';
    lenis && lenis.start();
  }
  menuBtn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // KL clock + oven status
  const timeEl = $('#kl-time');
  const statusEl = $('#oven-status');
  const fmtTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: 'numeric', hour12: false });
  function tickClock() {
    const now = new Date();
    timeEl.textContent = fmtTime.format(now);
    const parts = Object.fromEntries(fmtParts.formatToParts(now).map((p) => [p.type, p.value]));
    const hour = parseInt(parts.hour, 10);
    const open = parts.weekday !== 'Mon' && hour >= 10 && hour < 19;
    statusEl.textContent = open ? 'Oven on · taking orders now' : 'Oven resting · orders open Tue–Sun';
  }
  tickClock();
  setInterval(tickClock, 1000);
  $('#year').textContent = new Date().getFullYear();
  if (!finePointer) {
    const hint = $('.hero__hint');
    hint.lastChild.textContent = 'Tap the cookie, then scroll';
  }

  /* ================================================================== CURSOR */
  const cursor = $('.cursor');
  const cursorLabel = $('.cursor__label');
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, cx: innerWidth / 2, cy: innerHeight / 2 };
  let cursorOverride = null; // set by the 3D scene when hovering the cookie
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.nx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ny = -((e.clientY / innerHeight) * 2 - 1);
    if (finePointer && e.pointerType === 'mouse') root.classList.add('has-cursor');
  }, { passive: true });
  document.addEventListener('pointerleave', () => root.classList.remove('has-cursor'));
  function updateCursor(dt) {
    if (!finePointer) return;
    pointer.cx = damp(pointer.cx, pointer.x, 18, dt);
    pointer.cy = damp(pointer.cy, pointer.y, 18, dt);
    cursor.style.transform = `translate3d(${pointer.cx}px, ${pointer.cy}px, 0)`;
    const el = document.elementFromPoint(pointer.x, pointer.y);
    const card = el && el.closest('.card__media');
    const link = el && el.closest('a, button, select, input, textarea, label');
    let label = '';
    if (card) label = 'Look';
    else if (!link && cursorOverride) label = cursorOverride;
    cursor.classList.toggle('is-label', !!label);
    cursor.classList.toggle('is-link', !label && !!link);
    if (label && cursorLabel.textContent !== label) cursorLabel.textContent = label;
  }

  /* ================================================================== PROCESS UI */
  const proc = $('#process');
  const steps = $$('.step');
  const railBtns = $$('.rail button');
  const readoutLabel = $('#readout-label');
  const readoutVal = $('#readout-val');
  const readoutBar = $('#readout-bar');
  const READOUTS = ['Exploded view · 4 parts', 'Fracture · 5 pieces', 'Cocoa · 70%', 'Cut · 9 squares'];
  let activeStep = -1;
  railBtns.forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.goto;
    const travel = proc.offsetHeight - innerHeight;
    const top = proc.getBoundingClientRect().top + scrollY;
    scrollTo(top + travel * (i * 0.25 + 0.15));
  }));
  function updateProcessUI(p) {
    const i = Math.min(3, Math.floor(p * 4 + 0.0001));
    if (i !== activeStep) {
      activeStep = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      railBtns.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      readoutLabel.textContent = READOUTS[i];
    }
    readoutVal.textContent = String(Math.round(p * 100)).padStart(3, '0');
    readoutBar.style.transform = `scaleX(${p})`;
  }

  /* ================================================================== WORK: filters, parallax, order-similar */
  const cards = $$('.card');
  $$('.filters button').forEach((btn) => btn.addEventListener('click', () => {
    $$('.filters button').forEach((b) => b.classList.toggle('is-active', b === btn));
    const f = btn.dataset.filter;
    cards.forEach((c) => c.classList.toggle('is-dim', f !== 'all' && c.dataset.cat !== f));
  }));
  const mediaImgs = $$('.card__media img');
  function updateParallax() {
    if (reduceMotion) return;
    const vh = innerHeight;
    for (const img of mediaImgs) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      const t = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 around centre
      img.style.setProperty('--py', `${(-t * 6).toFixed(2)}%`);
    }
  }

  /* ================================================================== ORDER FORM → WhatsApp */
  const form = $('#order');
  const waLink = $('#wa-link');
  const copyBtn = $('#order-copy');
  const statusNote = $('#order-status');
  const previewWrap = $('#order-preview-wrap');
  const preview = $('#order-preview');
  const hasWhatsApp = /^\d{8,15}$/.test(CONTACT.whatsapp);
  let orderText = '';
  if (hasWhatsApp) {
    const waNumber = $('#wa-number');
    waNumber.textContent = CONTACT.whatsappLabel || `+${CONTACT.whatsapp}`;
    waNumber.href = `https://wa.me/${CONTACT.whatsapp}`;
    $('#row-whatsapp').hidden = false;
    waLink.hidden = false;
    copyBtn.hidden = true;
    $('#order-lead').textContent = 'Tell me what you need and when. The form writes a WhatsApp message for you; nothing is sent until you press send in WhatsApp.';
  }
  const dateInput = $('#f-date');
  const minDate = new Date(Date.now() + 3 * 864e5);
  dateInput.min = minDate.toISOString().slice(0, 10);
  function buildMessage() {
    const v = (id) => $(id).value.trim();
    const lines = ['Hi Ireen! I would like to order from Crumbella.'];
    if (v('#f-name')) lines.push(`Name: ${v('#f-name')}`);
    lines.push(`Order: ${v('#f-type')}, ${v('#f-qty')}`);
    if (v('#f-date')) {
      const d = new Date(v('#f-date') + 'T12:00:00');
      lines.push(`Needed by: ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`);
    }
    if (v('#f-notes')) lines.push(`Notes: ${v('#f-notes')}`);
    orderText = lines.join('\n');
    if (hasWhatsApp) waLink.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(orderText)}`;
    if (!previewWrap.hidden) preview.value = orderText;
  }
  function copyOrder() {
    buildMessage();
    preview.value = orderText;
    const done = () => {
      statusNote.textContent = 'Copied. Paste it into a DM to @crumbellabyireen on TikTok.';
      statusNote.classList.add('is-done');
    };
    const fallback = () => {
      previewWrap.hidden = false;
      preview.value = orderText;
      preview.focus();
      preview.select();
      statusNote.textContent = 'Your message is below. Copy it, then send it as a DM.';
      statusNote.classList.add('is-done');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(orderText).then(done, fallback);
    else fallback();
  }
  form.addEventListener('input', buildMessage);
  form.addEventListener('change', buildMessage);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (hasWhatsApp) waLink.click(); else copyOrder();
  });
  buildMessage();
  $$('.card__order').forEach((b) => b.addEventListener('click', () => {
    $('#f-type').value = b.dataset.order;
    const notes = $('#f-notes');
    notes.value = `Something like "${b.dataset.title}" from your portfolio.`;
    buildMessage();
    scrollTo($('#contact'));
    setTimeout(() => $('#f-name').focus({ preventScroll: true }), 1200);
  }));

  /* ================================================================== DIAL (watch bezel behind the 3D) */
  const dial = $('#dial');
  (function buildDial() {
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('stroke', 'currentColor');
    let ticks = '';
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const major = i % 10 === 0, mid = i % 5 === 0;
      const r1 = 262, r2 = major ? 240 : mid ? 248 : 254;
      const op = major ? 0.55 : mid ? 0.32 : 0.16;
      ticks += `<line x1="${(Math.cos(a) * r1).toFixed(2)}" y1="${(Math.sin(a) * r1).toFixed(2)}" x2="${(Math.cos(a) * r2).toFixed(2)}" y2="${(Math.sin(a) * r2).toFixed(2)}" stroke-opacity="${op}" stroke-width="${major ? 1.2 : 0.8}"/>`;
    }
    const numerals = [['XII', 0], ['III', 90], ['VI', 180], ['IX', 270]].map(([t, deg]) => {
      const a = (deg - 90) * Math.PI / 180;
      return `<text class="dial__num" x="${(Math.cos(a) * 214).toFixed(1)}" y="${(Math.sin(a) * 214 + 9).toFixed(1)}" text-anchor="middle" fill-opacity=".5">${t}</text>`;
    }).join('');
    dial.innerHTML = `
      <defs><path id="ring" d="M0,-286 a286,286 0 1,1 -0.1,0"/></defs>
      <circle r="268" fill="none" stroke="currentColor" stroke-opacity=".22"/>
      <circle r="292" fill="none" stroke="currentColor" stroke-opacity=".08"/>
      <g class="dial__rot">${ticks}${numerals}
        <text fill-opacity=".42"><textPath href="#ring">CRUMBELLA BY IREEN · BROWNIES · COOKIES · DESSERTS · CHERAS · KUALA LUMPUR · LITTLE BITES OF HAPPINESS · BAKED TO ORDER ·</textPath></text>
      </g>
      <circle r="150" fill="none" stroke="currentColor" stroke-opacity=".06" stroke-dasharray="2 6"/>`;
  })();
  const dialRot = $('.dial__rot', dial);

  /* ================================================================== SCROLL READ */
  const sec = { work: $('#work'), about: $('#about'), contact: $('#contact') };
  const navLinks = $$('[data-nav]');
  const seal = $('#seal');
  let lastY = 0, navHidden = false, activeNav = '';
  function readScroll() {
    const vh = innerHeight;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const pr = proc.getBoundingClientRect();
    const wr = sec.work.getBoundingClientRect();
    const cr = sec.contact.getBoundingClientRect();
    return {
      y, vh,
      heroP: clamp(y / vh),
      procP: clamp(-pr.top / (pr.height - vh)),
      inProc: pr.top <= 1 && pr.bottom >= vh - 1,
      workIn: clamp(1 - wr.top / vh),
      contactIn: clamp(1 - cr.top / (vh * 0.85)),
      covered: wr.top <= 0 && cr.top >= vh,
    };
  }
  function updateChrome(s) {
    // nav background + hide on scroll down
    nav.classList.toggle('is-scrolled', s.y > 40);
    const down = s.y > lastY + 2, up = s.y < lastY - 2;
    if (down && s.y > s.vh * 0.6 && !navHidden && menu.hidden) { nav.classList.add('is-hidden'); navHidden = true; }
    else if (up && navHidden) { nav.classList.remove('is-hidden'); navHidden = false; }
    lastY = s.y;
    // active nav
    const mid = s.vh * 0.45;
    let cur = '';
    for (const id of ['process', 'work', 'about', 'contact']) {
      const r = document.getElementById(id).getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) cur = id;
    }
    if (cur !== activeNav) {
      activeNav = cur;
      navLinks.forEach((a) => {
        const on = a.dataset.nav === cur;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    // seal rotates with the page like a bezel
    const ar = sec.about.getBoundingClientRect();
    if (ar.top < s.vh && ar.bottom > 0) seal.style.setProperty('--seal-rot', `${((ar.top / s.vh) * 24).toFixed(2)}deg`);
  }

  /* ================================================================== MAIN LOOP */
  let world = null;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (lenis) lenis.raf(now);
    const s = readScroll();
    updateChrome(s);
    updateProcessUI(s.procP);
    updateParallax();
    updateCursor(dt);
    if (world) world.update(dt, now / 1000, s);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ================================================================== 3D WORLD */
  setLoad(0.25);
  import(THREE_URL)
    .then((THREE) => { setLoad(0.55); return createWorld(THREE); })
    .then((w) => { world = w; setLoad(1); })
    .catch((err) => {
      console.warn('3D scene unavailable, showing the photo instead.', err);
      root.classList.add('no-webgl');
      setLoad(1);
    });

  function createWorld(THREE) {
    const canvas = $('#scene');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('No WebGL');
    // phones: fewer pixels, lighter shadows, less dust, so the GPU stays cool and scrolling stays smooth
    const lite = !finePointer || Math.min(screen.width, screen.height) < 600;
    const DPR = Math.min(devicePixelRatio || 1, lite ? 1.5 : 1.75);
    const stageHeight = () => canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(DPR);
    renderer.setSize(innerWidth, stageHeight(), false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const V2 = THREE.Vector2, V3 = THREE.Vector3;
    const TAU = Math.PI * 2;
    const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

    // value noise for geometry displacement
    const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    const noise2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v) * 2 - 1;
    };

    /* ---------- geometry helpers ---------- */
    function mergeByPosition(geo) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      const pos = g.attributes.position;
      const map = new Map(), verts = [], idx = [];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const key = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
        let id = map.get(key);
        if (id === undefined) { id = verts.length / 3; verts.push(x, y, z); map.set(key, id); }
        idx.push(id);
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      out.setIndex(idx);
      return out;
    }
    function setOffset(geo, x, y, z) {
      const n = geo.attributes.position.count;
      const a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z; }
      geo.setAttribute('aOffset', new THREE.BufferAttribute(a, 3));
      return geo;
    }
    function roundedBox(w, h, d, r, seg) {
      let g = new THREE.BoxGeometry(w, h, d, seg, Math.max(4, Math.round(seg * h / w) + 2), seg);
      g = mergeByPosition(g);
      const p = g.attributes.position;
      const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
      const v = new V3(), c = new V3(), n = new V3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
        n.subVectors(v, c);
        if (n.lengthSq() < 1e-10) n.set(0, 1, 0);
        n.normalize();
        v.copy(c).addScaledVector(n, r);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      return g;
    }
    function chunkGeometry(seed) {
      const r = rng(seed);
      let g = mergeByPosition(new THREE.BoxGeometry(1, 1, 1, 3, 3, 3));
      const p = g.attributes.position, v = new V3();
      const sx = 0.8 + r() * 0.5, sy = 0.8 + r() * 0.5, sz = 0.7 + r() * 0.4;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const s = v.clone().normalize().multiplyScalar(0.6);
        v.lerp(s, 0.32);
        v.x *= sx * (1 + (r() - 0.5) * 0.18); v.y *= sy * (1 + (r() - 0.5) * 0.18); v.z *= sz * (1 + (r() - 0.5) * 0.18);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return g;
    }

    /* ---------- procedural materials (object-space noise: colour, roughness, bump) ---------- */
    const NOISE = /* glsl */`
      vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
      float snoise(vec3 v){
        const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
        vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
        vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
        i=mod289(i);
        vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
        float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
        vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
        vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
        vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
        vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
        vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
        vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
        return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
      }
      vec3 cbPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir){
        vec3 sx=dFdx(surf_pos); vec3 sy=dFdy(surf_pos); vec3 R1=cross(sy,surf_norm); vec3 R2=cross(surf_norm,sx);
        float det=dot(sx,R1)*faceDir; vec3 grad=sign(det)*(dHdxy.x*R1+dHdxy.y*R2);
        return normalize(abs(det)*surf_norm-grad);
      }`;

    const COOKIE_SHADE = /* glsl */`
      uniform vec3 uDough; uniform vec3 uGolden; uniform vec3 uBaked; uniform vec3 uCrumb; uniform vec3 uChoc;
      void cbShade(out vec3 col, out float h, out float rough){
        vec3 p = vObjPos; vec3 n = normalize(vObjN);
        float r = length(p.xy) / uR;
        float top = smoothstep(0.3, 0.75, n.z);
        float bot = smoothstep(0.3, 0.75, -n.z);
        float side = clamp(1.0 - top - bot, 0.0, 1.0);
        float rim = smoothstep(0.86, 0.96, r);
        float large = snoise(p * 1.7);
        float med = snoise(p * 4.6 + 2.0);
        float fine = snoise(p * 26.0);
        float ridge = 1.0 - abs(snoise(p * vec3(1.2, 1.2, 0.5) + 4.0));
        float crk = smoothstep(0.86, 0.975, ridge);
        vec3 tc = mix(uDough, uGolden, smoothstep(-0.6, 0.8, large + 0.6 * med));
        tc = mix(tc, uBaked, smoothstep(0.6, 1.02, r) * 0.85);
        tc = mix(tc, uCrumb, crk * 0.7);
        tc *= 0.84 + 0.28 * smoothstep(-0.3, 0.9, fine);
        float swirl = smoothstep(0.3, 0.62, snoise(p * vec3(2.3, 2.3, 1.2) + vec3(snoise(p * 1.1) * 0.9, 0.0, 7.0)));
        swirl *= 1.0 - smoothstep(0.84, 0.98, r);
        tc = mix(tc, uChoc * (0.8 + 0.45 * med), swirl * 0.95);
        float th = 0.55 * large + 0.35 * med + 0.16 * fine - 1.25 * crk + 0.35 * swirl;
        float pores = smoothstep(0.35, 0.85, snoise(p * 15.0));
        float molten = smoothstep(-0.3, 0.2, snoise(p * vec3(2.0, 2.0, 3.0) + 9.0) + 0.35 * snoise(p * 6.0)) * (1.0 - rim);
        float wet = smoothstep(-0.7, -0.2, snoise(p * vec3(2.0, 2.0, 3.0) + 9.0)) * (1.0 - rim);
        vec3 crumbC = mix(uCrumb, uGolden, 0.3 + 0.35 * med) * (1.0 - 0.38 * pores);
        crumbC = mix(crumbC, uChoc * 2.2, wet * 0.45);
        vec3 gooC = uChoc * (0.9 + 0.9 * smoothstep(0.2, 0.9, snoise(p * 4.0 + 2.0)));
        vec3 sc = mix(crumbC, gooC, molten);
        vec3 rc = mix(uBaked, uGolden, smoothstep(-0.6, 0.7, med)) * (0.88 + 0.22 * fine);
        sc = mix(sc, rc, rim);
        float sh = mix(0.45 * snoise(p * 9.0) + 0.25 * fine - 0.9 * pores, 0.25 * snoise(p * 3.0), molten);
        sh = mix(sh, 0.45 * med + 0.2 * fine, rim);
        vec3 bc = uBaked * 0.6 * (0.9 + 0.2 * fine);
        col = tc * top + sc * side + bc * bot;
        h = th * top + sh * side + 0.2 * fine * bot;
        rough = mix(mix(0.8, 0.88, crk), 0.22, swirl) * top + mix(mix(0.92, 0.24, molten), 0.72, rim) * side + 0.9 * bot;
      }`;

    const BROWNIE_SHADE = /* glsl */`
      uniform vec3 uCrust; uniform vec3 uCrustHi; uniform vec3 uFudge; uniform vec3 uFudgeHi;
      void cbShade(out vec3 col, out float h, out float rough){
        vec3 p = vObjPos; vec3 n = normalize(vObjN);
        float top = smoothstep(0.4, 0.85, n.y);
        float bot = smoothstep(0.4, 0.85, -n.y);
        float side = clamp(1.0 - top - bot, 0.0, 1.0);
        float med = snoise(p * 4.5);
        float fine = snoise(p * 30.0);
        float ridge = 1.0 - abs(snoise(vec3(p.xz * 2.2, 0.5)));
        float ridge2 = 1.0 - abs(snoise(vec3(p.xz * 5.2, 3.5)));
        float crk = max(smoothstep(0.93, 0.99, ridge), smoothstep(0.95, 0.992, ridge2) * 0.6);
        vec3 tc = mix(uCrust, uCrustHi, smoothstep(-0.5, 0.8, med)) * (0.8 + 0.32 * smoothstep(-0.2, 1.0, fine));
        tc = mix(tc, uFudge * 0.9, crk * 0.85);
        float th = 0.35 * med + 0.14 * fine - 1.3 * crk;
        float holes = smoothstep(0.42, 0.85, snoise(p * 24.0));
        float bits = smoothstep(0.5, 0.78, snoise(p * 6.5 + 3.0));
        vec3 sc = mix(uFudge, uFudgeHi, 0.35 + 0.45 * med) * (1.0 - 0.45 * holes) * (0.9 + 0.12 * fine);
        sc = mix(sc, uFudge * 0.55, bits * 0.85);
        float sh = 0.25 * snoise(p * 11.0) + 0.16 * fine - 0.9 * holes;
        col = tc * top + sc * side + uFudge * 0.55 * bot;
        h = th * top + sh * side;
        rough = mix(0.5, 0.8, crk) * top + mix(0.66, 0.26, bits) * side + 0.9 * bot;
      }`;

    function proceduralMaterial(kind, colors, opts = {}) {
      const uniforms = { uR: { value: opts.R || 1.6 }, uBump: { value: opts.bump || 0.02 } };
      for (const [k, v] of Object.entries(colors)) uniforms[k] = { value: new THREE.Color(v) };
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, envMapIntensity: opts.env ?? 0.55 });
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, uniforms);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute vec3 aOffset;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position + aOffset;\nvObjN = normal;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>\nvarying vec3 vObjPos;\nvarying vec3 vObjN;\nuniform float uR;\nuniform float uBump;\n${NOISE}\n${kind === 'cookie' ? COOKIE_SHADE : BROWNIE_SHADE}\nfloat cbH; float cbRough;`)
          .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 cbCol; cbShade(cbCol, cbH, cbRough); diffuseColor.rgb = cbCol;')
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = cbRough;')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = cbPerturb(-vViewPosition, normal, vec2(dFdx(cbH), dFdy(cbH)) * uBump, faceDirection);');
      };
      mat.customProgramCacheKey = () => 'crumbella-' + kind;
      return mat;
    }
    const chocMaterial = (color, opts = {}) => new THREE.MeshPhysicalMaterial({
      color, roughness: opts.roughness ?? 0.3, metalness: 0, clearcoat: opts.clearcoat ?? 0.7, clearcoatRoughness: 0.22, envMapIntensity: 0.9,
    });

    const VARIANTS = {
      classic: {
        dough: { uDough: '#d9a35e', uGolden: '#c47c38', uBaked: '#8c4a1c', uCrumb: '#e8b872', uChoc: '#2c140a' },
        chunk: '#2e160b', goo: '#46200f', salt: true,
      },
      dark: {
        dough: { uDough: '#4a2818', uGolden: '#3a1e11', uBaked: '#24120a', uCrumb: '#5c3420', uChoc: '#1a0a04' },
        chunk: '#efe2cc', chunkRough: 0.42, goo: '#261007', salt: true,
      },
      pandan: {
        dough: { uDough: '#a3b45e', uGolden: '#8a9a48', uBaked: '#5f5424', uCrumb: '#c6d088', uChoc: '#3a1c0a' },
        chunk: '#3b1d0b', goo: '#4a230b', salt: false,
      },
    };

    /* ---------- cookie builder ---------- */
    function buildCookie(variantName, seed = 7) {
      const variant = VARIANTS[variantName];
      const R = 1.6, depth = 0.2, bevelT = 0.13, bevelS = 0.08, dome = 0.16, cracks = 5;
      const rand = rng(seed);
      const doughMat = proceduralMaterial('cookie', variant.dough, { R, bump: 0.022 });
      const chunkMat = chocMaterial(variant.chunk, { roughness: variant.chunkRough });
      const gooMat = new THREE.MeshPhysicalMaterial({ color: variant.goo, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 });
      const saltMat = new THREE.MeshPhysicalMaterial({ color: 0xf3efe8, roughness: 0.18, clearcoat: 1, envMapIntensity: 1.2 });

      const group = new THREE.Group();
      group.rotation.order = 'YXZ';
      const center = new V2((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3);
      const rimR = (a) => R * (1 + 0.022 * Math.sin(3 * a + 1.3) + 0.016 * Math.sin(5 * a + 0.4) + 0.009 * Math.sin(11 * a + 2.0));
      const topZ = (x, y) => depth + bevelT + dome * Math.max(0, 1 - (x * x + y * y) / (R * R));
      const base = rand() * TAU;
      const angles = [];
      for (let i = 0; i < cracks; i++) angles.push(base + (i / cracks) * TAU + (rand() - 0.5) * 0.45);
      const crackPts = angles.map((a) => {
        const end = new V2(Math.cos(a) * rimR(a), Math.sin(a) * rimR(a));
        const dir = end.clone().sub(center);
        const perp = new V2(-dir.y, dir.x).normalize();
        const pts = []; let walk = 0; const N = 18;
        for (let s = 0; s <= N; s++) {
          const t = s / N;
          walk += (rand() - 0.5) * 0.11;
          const off = (s === 0 || s === N) ? 0 : (walk * Math.sin(Math.PI * t) + (rand() - 0.5) * 0.025);
          pts.push(center.clone().addScaledVector(dir, t).addScaledVector(perp, off));
        }
        return pts;
      });

      const pieces = [];
      const pointInPoly = (pt, poly) => {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
          if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
      };
      const distToPolyline = (pt, line) => {
        let d = Infinity;
        for (let i = 0; i < line.length - 1; i++) {
          const a = line[i], b = line[i + 1];
          const ab = b.clone().sub(a); const t = clamp(pt.clone().sub(a).dot(ab) / ab.lengthSq());
          d = Math.min(d, pt.distanceTo(a.clone().addScaledVector(ab, t)));
        }
        return d;
      };
      const chunkGeos = [0, 1, 2, 3, 4, 5].map((k) => chunkGeometry(seed * 13 + k));
      const saltGeo = new THREE.BoxGeometry(1, 0.16, 0.8);

      for (let i = 0; i < cracks; i++) {
        const a0 = angles[i];
        const a1 = angles[(i + 1) % cracks] + (i + 1 === cracks ? TAU : 0);
        const poly = crackPts[i].slice();
        const segs = Math.max(6, Math.ceil(((a1 - a0) / TAU) * 96));
        for (let k = 1; k < segs; k++) { const a = a0 + ((a1 - a0) * k) / segs; poly.push(new V2(Math.cos(a) * rimR(a), Math.sin(a) * rimR(a))); }
        poly.push(...crackPts[(i + 1) % cracks].slice(1).reverse());

        let g = new THREE.ExtrudeGeometry(new THREE.Shape(poly), { depth, steps: 2, bevelEnabled: true, bevelThickness: bevelT, bevelSize: bevelS, bevelSegments: 5, curveSegments: 4 });
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
          const zt = clamp((z + bevelT) / (depth + 2 * bevelT));
          p.setZ(k, z + dome * Math.max(0, 1 - (x * x + y * y) / (R * R)) * zt);
        }
        g = mergeByPosition(g);
        g.computeVertexNormals();
        g.computeBoundingBox();
        const c = new V3(); g.boundingBox.getCenter(c); c.z = 0;
        g.translate(-c.x, -c.y, 0);
        setOffset(g, c.x, c.y, 0);
        const mesh = new THREE.Mesh(g, doughMat);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.position.copy(c);
        group.add(mesh);

        const dir = new V2(c.x - center.x, c.y - center.y).normalize();
        const piece = {
          mesh, base: c.clone(), dir, poly,
          dist: 0.42 + rand() * 0.3, lift: (rand() - 0.25) * 0.45,
          rot: new V3((rand() - 0.5) * 0.9, (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.5),
          chunks: [], salts: [],
        };

        // chunks pressed into the top
        const edgeLines = [crackPts[i], crackPts[(i + 1) % cracks]];
        const area = Math.abs(THREE.ShapeUtils.area(poly));
        const want = Math.round(area * 3.2);
        let tries = 0;
        while (piece.chunks.length < want && tries++ < 400) {
          const pt = new V2((rand() * 2 - 1) * R, (rand() * 2 - 1) * R);
          if (pt.length() > R * 0.86 || !pointInPoly(pt, poly)) continue;
          if (Math.min(distToPolyline(pt, edgeLines[0]), distToPolyline(pt, edgeLines[1])) < 0.13) continue;
          if (piece.chunks.some((ch) => ch.p.distanceTo(pt) < 0.3)) continue;
          const m = new THREE.Mesh(chunkGeos[(rand() * chunkGeos.length) | 0], chunkMat);
          const s = 0.15 + rand() * 0.13;
          m.scale.set(s * (0.9 + rand() * 0.5), s * (0.9 + rand() * 0.5), s * 0.62);
          m.rotation.set((rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8, rand() * TAU);
          const z = topZ(pt.x, pt.y) - s * 0.18;
          m.position.set(pt.x - c.x, pt.y - c.y, z);
          m.castShadow = true; m.receiveShadow = true;
          mesh.add(m);
          piece.chunks.push({ mesh: m, p: pt, z, s0: m.scale.clone(), lift: 0.55 + rand() * 0.3 });
        }
        // chunks inside the break faces (revealed when it snaps)
        for (const line of edgeLines) {
          for (let k = 0; k < 3; k++) {
            const t = 0.18 + rand() * 0.67;
            const idx = Math.floor(t * (line.length - 1));
            const pt = line[idx];
            const m = new THREE.Mesh(chunkGeos[(rand() * chunkGeos.length) | 0], gooMat);
            const s = 0.16 + rand() * 0.1;
            m.scale.set(s, s, s * 0.8);
            m.rotation.set(rand() * TAU, rand() * TAU, rand() * TAU);
            m.position.set(pt.x - c.x, pt.y - c.y, depth * (0.35 + rand() * 0.4) + dome * 0.3);
            mesh.add(m);
          }
        }
        // flaky salt
        if (variant.salt) {
          const nSalt = 2 + ((rand() * 2) | 0);
          for (let k = 0; k < nSalt; k++) {
            let pt, guard = 0;
            do { pt = new V2((rand() * 2 - 1) * R * 0.8, (rand() * 2 - 1) * R * 0.8); } while ((!pointInPoly(pt, poly) || Math.min(distToPolyline(pt, edgeLines[0]), distToPolyline(pt, edgeLines[1])) < 0.12) && guard++ < 200);
            const m = new THREE.Mesh(saltGeo, saltMat);
            const s = 0.06 + rand() * 0.04;
            m.scale.setScalar(s);
            m.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.6, rand() * TAU, (rand() - 0.5) * 0.6);
            const z = topZ(pt.x, pt.y) + 0.005;
            m.position.set(pt.x - c.x, pt.y - c.y, z);
            mesh.add(m);
            piece.salts.push({ mesh: m, z, lift: 1.05 + rand() * 0.3 });
          }
        }
        pieces.push(piece);
      }

      // molten core: hidden inside the whole cookie, it oozes out of the middle as it breaks
      const coreGeo = new THREE.SphereGeometry(1, 48, 24);
      const coreBase = coreGeo.attributes.position.array.slice();
      const core = new THREE.Mesh(coreGeo, gooMat);
      const coreZ = depth * 0.5 + dome * 0.55;
      core.position.set(center.x, center.y, coreZ);
      core.visible = false;
      core.castShadow = true;
      group.add(core);

      // stretchy chocolate strands across every crack; each one snaps at its own length
      const strands = [];
      const SEG = 24, RAD = 9;
      const makeTube = () => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * RAD * 3), 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((SEG + 1) * RAD * 3), 3));
        const index = [];
        for (let q = 0; q < SEG; q++) for (let r = 0; r < RAD; r++) {
          const a = q * RAD + r, b = q * RAD + ((r + 1) % RAD), c2 = (q + 1) * RAD + r, d = (q + 1) * RAD + ((r + 1) % RAD);
          index.push(a, c2, b, b, c2, d);
        }
        geo.setIndex(index);
        const mesh = new THREE.Mesh(geo, gooMat);
        mesh.frustumCulled = false;
        mesh.visible = false;
        mesh.castShadow = true;
        group.add(mesh);
        return mesh;
      };
      for (let ci = 0; ci < cracks; ci++) {
        const line = crackPts[ci];
        const A = pieces[(ci - 1 + cracks) % cracks], B = pieces[ci];
        for (let k = 0; k < 3; k++) {
          const pt = line[Math.floor((line.length - 1) * (0.38 + k * 0.19 + rand() * 0.08))];
          const zA = depth * (0.55 + rand() * 0.5) + dome * 0.45;
          const zB = zA + (rand() - 0.5) * 0.12;
          strands.push({
            mesh: makeTube(), SEG, RAD,
            la: new V3(pt.x - A.base.x, pt.y - A.base.y, zA), lb: new V3(pt.x - B.base.x, pt.y - B.base.y, zB),
            A, B, r0: 0.085 + rand() * 0.06, snapAt: 1.2 + rand() * 1.0, sag: 0.25 + rand() * 0.3,
          });
        }
      }

      // crumbs that burst from the cracks
      const CRUMBS = 70;
      const crumbGeo = setOffset(chunkGeometry(seed + 99), 0, 0, 0);
      const crumbs = new THREE.InstancedMesh(crumbGeo, doughMat, CRUMBS);
      crumbs.castShadow = true;
      crumbs.frustumCulled = false;
      const crumbData = [];
      for (let k = 0; k < CRUMBS; k++) {
        const line = crackPts[k % cracks];
        const pt = line[1 + Math.floor(rand() * (line.length - 2))];
        const out = new V3(pt.x - center.x, pt.y - center.y, 0).normalize();
        crumbData.push({
          o: new V3(pt.x, pt.y, depth * (0.2 + rand() * 0.9)),
          v: new V3(out.x * (0.4 + rand()) + (rand() - 0.5) * 0.8, out.y * (0.4 + rand()) + (rand() - 0.5) * 0.8, 0.8 + rand() * 1.6),
          s: 0.025 + rand() * 0.045,
          rv: new V3(rand() * 6, rand() * 6, rand() * 6),
        });
      }
      group.add(crumbs);

      // anchors for the exploded-view labels (local to pieces)
      const pickSalt = pieces.flatMap((p) => p.salts.map((s) => ({ p, s })))[0];
      const pickChunk = pieces[1].chunks[0] ? { p: pieces[1], s: pieces[1].chunks[0] } : null;
      const rimA = angles[2] + 0.4;
      const rimPiece = pieces[2];
      const rimPt = new V3(Math.cos(rimA) * rimR(rimA) - rimPiece.base.x, Math.sin(rimA) * rimR(rimA) - rimPiece.base.y, depth * 0.5);
      const doughPiece = pieces[4];
      const doughPt = new V3(doughPiece.base.x * 0.6 - doughPiece.base.x, doughPiece.base.y * 0.6 - doughPiece.base.y, topZ(doughPiece.base.x * 0.6, doughPiece.base.y * 0.6));

      const dummy = new THREE.Object3D();
      const tmpA = new V3(), tmpB = new V3(), ctrl = new V3(), pnt = new V3(), tan = new V3(), nrm = new V3(), bin = new V3(), up = new V3(0, 0, 1);
      const gravity = new V3(), invQ = new THREE.Quaternion();

      function apply(anatomy, brk, time) {
        const b = brk;
        const eb = b < 1 ? b * b * (3 - 2 * b) : b;
        const melt = Math.min(1, eb);
        for (const pc of pieces) {
          pc.mesh.position.set(
            pc.base.x + pc.dir.x * pc.dist * eb,
            pc.base.y + pc.dir.y * pc.dist * eb,
            pc.lift * eb + Math.sin(time * 0.8 + pc.dist * 9) * 0.03 * eb,
          );
          pc.mesh.rotation.set(pc.rot.x * eb, pc.rot.y * eb, pc.rot.z * eb);
          for (const ch of pc.chunks) {
            ch.mesh.position.z = ch.z + anatomy * ch.lift - 0.025 * melt;
            ch.mesh.scale.set(ch.s0.x * (1 + 0.18 * melt), ch.s0.y * (1 + 0.18 * melt), ch.s0.z * (1 - 0.25 * melt));
          }
          for (const s of pc.salts) s.mesh.position.z = s.z + anatomy * s.lift;
          pc.mesh.updateMatrix();
        }
        // molten core swells and wobbles out of the gap
        core.visible = b > 0.006;
        if (core.visible) {
          const sp = 1 + 0.32 * melt;
          core.scale.set(0.66 * sp, 0.66 * sp, 0.12 * (1 + 2.1 * melt));
          core.position.z = coreZ + 0.14 * melt;
          const cp = coreGeo.attributes.position.array;
          for (let q = 0; q < cp.length; q += 3) {
            const bx = coreBase[q], by = coreBase[q + 1], bz = coreBase[q + 2];
            const w = noise2(bx * 1.9 + time * 0.35 + 3.1, by * 1.9 + bz * 1.4 - time * 0.27) + 0.5 * noise2(bx * 4.3 - time * 0.2, by * 4.3 + 7.7);
            const k = 1 + 0.26 * w * melt;
            cp[q] = bx * k; cp[q + 1] = by * k; cp[q + 2] = bz * (1 + 0.5 * w * melt);
          }
          coreGeo.attributes.position.needsUpdate = true;
          coreGeo.computeVertexNormals();
        }
        // world "down" expressed in cookie space, so the goo sags like real chocolate
        invQ.copy(group.quaternion).invert();
        gravity.set(0, -1, 0).applyQuaternion(invQ);
        // strands stretch, sag, thin out, then snap
        for (const st of strands) {
          tmpA.copy(st.la).applyMatrix4(st.A.mesh.matrix);
          tmpB.copy(st.lb).applyMatrix4(st.B.mesh.matrix);
          const d = tmpA.distanceTo(tmpB);
          const life = clamp(1 - (d - 0.02) / st.snapAt);
          st.mesh.visible = b > 0.01 && life > 0.03;
          if (!st.mesh.visible) continue;
          ctrl.addVectors(tmpA, tmpB).multiplyScalar(0.5);
          ctrl.addScaledVector(gravity, d * st.sag * (1.4 - life * 0.6) + Math.sin(time * 1.3 + st.r0 * 90) * 0.02);
          const pos = st.mesh.geometry.attributes.position.array;
          const nor = st.mesh.geometry.attributes.normal.array;
          for (let s = 0; s <= st.SEG; s++) {
            const t = s / st.SEG, it = 1 - t;
            pnt.set(it * it * tmpA.x + 2 * it * t * ctrl.x + t * t * tmpB.x, it * it * tmpA.y + 2 * it * t * ctrl.y + t * t * tmpB.y, it * it * tmpA.z + 2 * it * t * ctrl.z + t * t * tmpB.z);
            tan.set(2 * it * (ctrl.x - tmpA.x) + 2 * t * (tmpB.x - ctrl.x), 2 * it * (ctrl.y - tmpA.y) + 2 * t * (tmpB.y - ctrl.y), 2 * it * (ctrl.z - tmpA.z) + 2 * t * (tmpB.z - ctrl.z)).normalize();
            nrm.crossVectors(tan, up); if (nrm.lengthSq() < 1e-6) nrm.set(1, 0, 0); nrm.normalize();
            bin.crossVectors(tan, nrm).normalize();
            const thin = 1 - 0.55 * Math.sin(Math.PI * t) * (1 - life * 0.7);
            const flare = 1 + 0.9 * Math.pow(Math.abs(t - 0.5) * 2, 6);
            const rad = st.r0 * (0.4 + 0.6 * life) * thin * flare;
            for (let r = 0; r < st.RAD; r++) {
              const a = (r / st.RAD) * TAU, ca = Math.cos(a), sa = Math.sin(a);
              const nx = ca * nrm.x + sa * bin.x, ny = ca * nrm.y + sa * bin.y, nz = ca * nrm.z + sa * bin.z;
              const o = (s * st.RAD + r) * 3;
              pos[o] = pnt.x + nx * rad; pos[o + 1] = pnt.y + ny * rad; pos[o + 2] = pnt.z + nz * rad;
              nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
            }
          }
          st.mesh.geometry.attributes.position.needsUpdate = true;
          st.mesh.geometry.attributes.normal.needsUpdate = true;
        }
        // crumbs
        const ct = b * 1.25;
        for (let k = 0; k < crumbData.length; k++) {
          const c = crumbData[k];
          const vis = b > 0.015 ? 1 : 0;
          dummy.position.set(c.o.x + c.v.x * ct, c.o.y + c.v.y * ct - 0.9 * ct * ct, c.o.z + c.v.z * ct - 0.6 * ct * ct);
          dummy.rotation.set(c.rv.x * ct, c.rv.y * ct, c.rv.z * ct);
          dummy.scale.setScalar(c.s * vis * (1 - smooth(0.85, 1, b) * 0.3));
          dummy.updateMatrix();
          crumbs.setMatrixAt(k, dummy.matrix);
        }
        crumbs.instanceMatrix.needsUpdate = true;
      }

      function anchors() {
        const list = [];
        if (pickSalt) list.push(pickSalt.s.mesh.getWorldPosition(new V3()));
        if (pickChunk) list.push(pickChunk.s.mesh.getWorldPosition(new V3()));
        list.push(doughPiece.mesh.localToWorld(doughPt.clone()));
        list.push(rimPiece.mesh.localToWorld(rimPt.clone()));
        return list;
      }

      const meshes = pieces.map((p) => p.mesh);
      return { group, apply, anchors, meshes };
    }

    /* ---------- brownie tray builder ---------- */
    function buildBrownie() {
      const mat = proceduralMaterial('brownie', { uCrust: '#3f2517', uCrustHi: '#64402b', uFudge: '#2a140a', uFudgeHi: '#43231a' }, { bump: 0.018 });
      const group = new THREE.Group();
      const inner = new THREE.Group();
      group.add(inner);
      const N = 3, pitch = 1.0, size = 0.975, H = 0.56;
      const squares = [];
      const rand = rng(42);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const ox = (i - (N - 1) / 2) * pitch, oz = (j - (N - 1) / 2) * pitch;
        const g = roundedBox(size, H, size, 0.04, 16);
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
          if (y > H / 2 - 0.06) {
            const wx = x + ox, wz = z + oz;
            const dy = 0.035 * noise2(wx * 2.2, wz * 2.2) + 0.012 * noise2(wx * 7, wz * 7) + 0.03 * (1 - (wx * wx + wz * wz) / 4.5);
            p.setY(k, y + dy * smooth(H / 2 - 0.06, H / 2, y));
          }
          // a little hand-cut irregularity on the sides
          p.setX(k, p.getX(k) + 0.008 * noise2(y * 6 + oz * 3, z * 6));
        }
        g.computeVertexNormals();
        setOffset(g, ox, 0, oz);
        const m = new THREE.Mesh(g, mat);
        m.castShadow = m.receiveShadow = true;
        m.position.set(ox, 0, oz);
        inner.add(m);
        squares.push({ mesh: m, base: new V3(ox, 0, oz), center: i === 1 && j === 1, rot: new V3((rand() - 0.5) * 0.35, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.35), lift: 0.1 + rand() * 0.35 });
      }
      function apply(slice, time) {
        const e = slice * slice * (3 - 2 * slice);
        for (const sq of squares) {
          const spread = 1 + e * 0.42;
          const bob = Math.sin(time * 0.9 + sq.base.x * 3 + sq.base.z * 5) * 0.04 * e;
          sq.mesh.position.set(sq.base.x * spread, (sq.center ? 0.75 : sq.lift) * e + bob, sq.base.z * spread);
          sq.mesh.rotation.set(sq.rot.x * e * (sq.center ? 0.3 : 1), sq.rot.y * e, sq.rot.z * e * (sq.center ? 0.3 : 1));
        }
      }
      return { group, apply };
    }

    /* ---------- scene, camera, lights ---------- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
    const CAM_Z = 10;
    camera.position.set(0, 0, CAM_Z);

    function buildEnvironment() {
      const pm = new THREE.PMREMGenerator(renderer);
      const env = new THREE.Scene();
      env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: 0x140b07, side: THREE.BackSide })));
      const panel = (w, h, color, k, pos) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
      };
      panel(7, 4, 0xffcf9e, 5.5, [6, 7, 7]);      // desk lamp
      panel(1.1, 10, 0x3d7eff, 3.2, [-9, 1, -2]); // neon through the window
      panel(10, 2.5, 0xffe2c6, 0.9, [0, -7, 6]);  // bench bounce
      const tex = pm.fromScene(env, 0.035).texture;
      pm.dispose();
      return tex;
    }
    scene.environment = buildEnvironment();

    function addLights(target) {
      const key = new THREE.DirectionalLight(0xffd3a3, 2.7);
      key.position.set(4, 6, 7);
      key.castShadow = true;
      key.shadow.mapSize.set(lite ? 512 : 1024, lite ? 512 : 1024);
      key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
      key.shadow.camera.near = 1; key.shadow.camera.far = 25;
      key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
      const rim = new THREE.DirectionalLight(0x4a86ff, 1.6);
      rim.position.set(-7, 2.5, -5);
      const warmBack = new THREE.DirectionalLight(0xff9a55, 0.8);
      warmBack.position.set(6, -2, -6);
      const hemi = new THREE.HemisphereLight(0xffe6cc, 0x1a0e08, 0.35);
      target.add(key, key.target, rim, warmBack, hemi);
      return { key, rim };
    }
    const lights = addLights(scene);

    // flour dust drifting in the lamp light
    const dust = (() => {
      const N = lite ? 140 : 320;
      const pos = new Float32Array(N * 3), seeds = new Float32Array(N);
      const r = rng(3);
      for (let i = 0; i < N; i++) { pos[i * 3] = (r() - 0.5) * 16; pos[i * 3 + 1] = (r() - 0.5) * 9; pos[i * 3 + 2] = (r() - 0.5) * 7 - 1; seeds[i] = r() * 100; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,240,220,1)'); grd.addColorStop(0.4, 'rgba(255,225,190,.35)'); grd.addColorStop(1, 'rgba(255,220,180,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, 64, 64);
      const mat = new THREE.PointsMaterial({ size: 0.05, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6c8 });
      const pts = new THREE.Points(g, mat);
      pts.frustumCulled = false;
      scene.add(pts);
      const base = pos.slice();
      return (t) => {
        for (let i = 0; i < N; i++) {
          const s = seeds[i];
          pos[i * 3] = base[i * 3] + Math.sin(t * 0.13 + s) * 0.4;
          pos[i * 3 + 1] = ((base[i * 3 + 1] + t * 0.06 * (0.4 + (s % 1)) + 4.5) % 9) - 4.5;
          pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + s) * 0.3;
        }
        g.attributes.position.needsUpdate = true;
      };
    })();

    const cookie = buildCookie('classic', 7);
    scene.add(cookie.group);
    const brownie = buildBrownie();
    scene.add(brownie.group);
    setLoad(0.8);

    /* ---------- studio renders for two work cards ---------- */
    (function renderThumbs() {
      const imgs = $$('img[data-render]');
      if (!imgs.length) return;
      const tScene = new THREE.Scene();
      tScene.environment = scene.environment;
      addLights(tScene);
      const tCam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
      tCam.position.set(0, 0, 9.4);
      const W = 900, H = 900;
      renderer.setPixelRatio(1);
      renderer.setSize(W, H, false);
      for (const img of imgs) {
        const v = img.dataset.render;
        const c = buildCookie(v, v === 'dark' ? 21 : 33);
        c.group.rotation.set(-0.62, v === 'dark' ? 0.35 : -0.3, v === 'dark' ? 0.4 : 2.1);
        c.group.position.set(0, -0.05, 0);
        c.apply(0, 0.45, 0);
        tScene.add(c.group);
        renderer.render(tScene, tCam);
        try {
          const url = renderer.domElement.toDataURL('image/webp', 0.88);
          if (url.length > 2000) img.src = url;
        } catch (e) { /* keep the photo fallback */ }
        tScene.remove(c.group);
        c.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      }
      renderer.setPixelRatio(DPR);
      renderer.setSize(innerWidth, stageHeight(), false);
      renderer.clear();
    })();

    /* ---------- layout per viewport ---------- */
    let L, stageW = 0, stageH = 0;
    function layout() {
      stageW = innerWidth; stageH = stageHeight();
      const a = stageW / stageH;
      camera.aspect = a; camera.updateProjectionMatrix();
      renderer.setSize(stageW, stageH, false);
      const desk = a > 1.0 && innerWidth > 900;
      const halfW = CAM_Z * Math.tan((camera.fov * Math.PI) / 360) * a; // visible half-width at z=0
      if (desk) {
        const x = Math.min(halfW * 0.42, 2.6);
        const s = clamp(halfW / 5.2, 0.72, 1.05);
        L = { desk, s, heroX: x, heroY: -0.05, procX: Math.min(halfW * 0.3, 2.05), procY: -0.05, bX: Math.min(halfW * 0.29, 1.95), bY: -0.25, cX: Math.min(halfW * 0.48, 3.0), cY: 0.05 };
      } else {
        const s = clamp(halfW / 2.5, 0.46, 0.8);
        L = { desk, s, heroX: 0, heroY: 1.05, procX: 0, procY: 1.25, bX: 0, bY: 1.05, cX: 0, cY: 1.6 };
      }
    }
    layout();
    let resizeT;
    // the stage is sized to the largest viewport, so a phone's address bar sliding away doesn't rescale the scene
    addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => { if (innerWidth !== stageW || stageHeight() !== stageH) layout(); }, 120);
    });

    /* ---------- hover + click on the cookie ---------- */
    const ray = new THREE.Raycaster();
    const ndc = new V2();
    let hover = 0, hoverTarget = 0, snap = 0, snapVel = 0, canHover = false, heroVisible = true;
    // click (mouse) or tap (phone) on the cookie in the hero makes it snap
    addEventListener('click', (e) => {
      if (!heroVisible || reduceMotion) return;
      if (e.target.closest('a, button, input, select, textarea, label, .menu')) return;
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / stageH) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObjects(cookie.meshes, false).length) snapVel += 3.2;
    });

    /* ---------- annotations ---------- */
    const anno = $('#anno');
    const annoPaths = $$('path', anno);
    const annoLabels = $$('.anno__label', anno);
    const LABEL_OFFSETS = [[-300, -120], [170, -170], [-330, 70], [150, 140]];

    /* ---------- smoothed state ---------- */
    const S = { anatomy: 0, brk: 0, out: 0, bIn: 0, slice: 0, x: 0, y: 0, s: 1, rx: -0.42, ry: -0.35, bx: 0, by: -5, mx: 0, my: 0, dial: 0, opacity: 1 };
    let spin = 0;
    const proj = new V3();
    const toScreen = (v, vh) => { proj.copy(v).project(camera); return { x: (proj.x * 0.5 + 0.5) * innerWidth, y: (-proj.y * 0.5 + 0.5) * vh }; };

    function update(dt, t, s) {
      const vh = stageH;
      heroVisible = s.heroP < 0.6;
      // scroll → targets
      const p = s.procP;
      const back = s.contactIn;
      const keep = 1 - back;
      const T = {
        anatomy: smooth(0.03, 0.13, p) * (1 - smooth(0.2, 0.27, p)) * keep,
        brk: smooth(0.29, 0.42, p) * keep,
        out: smooth(0.5, 0.62, p) * keep,
        bIn: smooth(0.53, 0.68, p) * keep,
        slice: smooth(0.76, 0.9, p) * keep,
      };
      const h = smooth(0, 1, s.heroP);
      T.x = lerp(lerp(L.heroX, L.procX, h), L.cX, back);
      T.y = lerp(lerp(L.heroY, L.procY, h), L.cY, back);
      T.s = L.s * lerp(1, L.desk ? 0.95 : 1, h) * (L.desk ? 1 : 1);
      T.rx = -0.42 - 0.66 * T.anatomy + 0.06 * T.brk - 0.08 * back;
      T.ry = (L.desk ? -0.32 : 0) + 0.18 * T.anatomy;
      if (back > 0) T.ry = lerp(T.ry, L.desk ? -0.45 : 0, back);

      const k = reduceMotion ? 400 : 4.2;
      for (const key of ['anatomy', 'brk', 'out', 'bIn', 'slice', 'x', 'y', 's', 'rx', 'ry']) S[key] = damp(S[key], T[key], k, dt);
      S.mx = damp(S.mx, pointer.nx, 3, dt);
      S.my = damp(S.my, pointer.ny, 3, dt);

      // click-to-snap spring
      snapVel += (-snap * 38 - snapVel * 7.5) * dt;
      snap = Math.max(0, snap + snapVel * dt);

      // cookie
      if (!reduceMotion) spin += dt * (0.1 + 0.25 * S.brk);
      const out = S.out;
      cookie.group.position.set(S.x + out * (L.desk ? -0.6 : 0), S.y + out * 4.8, -out * 1.5);
      cookie.group.scale.setScalar(S.s * (1 + hover * 0.03) * (1 - out * 0.25));
      cookie.group.rotation.x = S.rx + S.my * 0.12;
      cookie.group.rotation.y = S.ry + S.mx * 0.22;
      cookie.group.rotation.z = spin + s.heroP * 0.6;
      cookie.group.visible = out < 0.995;
      const brkTotal = clamp(S.brk + snap * 0.8 + out * 0.4, 0, 1.4);
      cookie.apply(S.anatomy, brkTotal, t);

      // brownie
      const bIn = S.bIn;
      brownie.group.visible = bIn > 0.004;
      brownie.group.position.set(lerp(L.bX + (L.desk ? 0.8 : 0), L.bX, bIn), L.bY - (1 - bIn) * 5.5, 0);
      brownie.group.scale.setScalar(L.s * 0.92);
      brownie.group.rotation.set(0.5 + S.my * 0.08 + (1 - bIn) * 0.6, Math.PI / 4 + (1 - bIn) * 1.8 + S.mx * 0.2 + S.slice * 0.3 + (reduceMotion ? 0 : t * 0.05), 0);
      brownie.apply(S.slice, t);

      // lights: rim brightens while the cookie is hovered
      hover = damp(hover, hoverTarget, 6, dt);
      lights.rim.intensity = 1.6 + hover * 3.2 + S.brk * 0.8;

      dust(t);

      // hover detection (hero only, desktop)
      canHover = finePointer && s.heroP < 0.6 && !reduceMotion;
      if (canHover && root.classList.contains('has-cursor')) {
        ndc.set(pointer.nx, pointer.ny);
        ray.setFromCamera(ndc, camera);
        hoverTarget = ray.intersectObjects(cookie.meshes, false).length ? 1 : 0;
      } else hoverTarget = 0;
      cursorOverride = hoverTarget > 0.5 ? 'Snap it' : null;

      // dial follows the focus object
      const focus = new V3(lerp(cookie.group.position.x, brownie.group.position.x, bIn), lerp(cookie.group.position.y, brownie.group.position.y + 0.2, bIn), 0);
      const fs = toScreen(focus, vh);
      const ppu = vh / (2 * CAM_Z * Math.tan((camera.fov * Math.PI) / 360));
      const dialSize = 2 * 2.35 * L.s * ppu;
      const dialOp = Math.max(1 - s.workIn, s.contactIn) * (L.desk ? 0.85 : 0.5) * (root.classList.contains('is-loaded') ? 1 : 0);
      S.dial = damp(S.dial, dialOp, 4, dt);
      dial.style.opacity = S.dial.toFixed(3);
      dial.style.transform = `translate3d(${(fs.x - 300).toFixed(1)}px, ${(fs.y - 300).toFixed(1)}px, 0) scale(${(dialSize / 600).toFixed(4)})`;
      dialRot.setAttribute('transform', `rotate(${((s.y / vh) * 14 + (reduceMotion ? 0 : t * 1.5)).toFixed(2)})`);

      // render unless fully covered by the opaque work/about sheets
      if (!s.covered) {
        canvas.style.visibility = 'visible';
        renderer.render(scene, camera);
      } else canvas.style.visibility = 'hidden';

      // annotations (desktop, exploded view only)
      const aOp = L.desk && s.inProc ? smooth(0.55, 0.92, S.anatomy) : 0;
      anno.style.opacity = aOp.toFixed(3);
      if (aOp > 0.01) {
        const pts = cookie.anchors();
        pts.forEach((w, i) => {
          if (!annoLabels[i]) return;
          const sp = toScreen(w, vh);
          const [ox, oy] = LABEL_OFFSETS[i];
          const lx = clamp(sp.x + ox, 16, innerWidth - 256);
          const ly = clamp(sp.y + oy, 90, vh - 90);
          annoLabels[i].style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
          const ex = ox < 0 ? lx + 240 : lx;
          const ey = ly + 22;
          annoPaths[i].setAttribute('d', `M${sp.x.toFixed(1)},${sp.y.toFixed(1)} L${(sp.x + (ex - sp.x) * 0.35).toFixed(1)},${ey.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`);
        });
      }
    }

    // warm up shaders so the first scroll doesn't hitch
    renderer.compile(scene, camera);
    return { update };
  }
})();
