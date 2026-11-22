/* ==========================================================================
   Sushiology Mirpur — app
   ========================================================================== */

import * as THREE from './three.module.js';
import { PLATES, MENU } from './data.js';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const body = document.body;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const mod = (n, m) => ((n % m) + m) % m;
const pad2 = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* --------------------------------------------------------------------------
   Loader
   -------------------------------------------------------------------------- */

function initLoader() {
  const loader = $('#loader');
  const count = $('#loaderCount');
  const bar = $('#loaderBar');
  if (!loader) return;

  let progress = 0;
  let done = false;

  const paint = () => {
    if (count) count.textContent = pad2(Math.round(progress));
    if (bar) bar.style.transform = `scaleX(${progress / 100})`;
  };

  const tick = window.setInterval(() => {
    if (done) return;
    progress = Math.min(progress + Math.random() * 11, 88);
    paint();
  }, 90);

  const finish = () => {
    if (done) return;
    done = true;
    window.clearInterval(tick);
    progress = 100;
    paint();
    window.setTimeout(() => {
      loader.classList.add('is-done');
      body.classList.remove('is-loading');
      body.classList.add('is-ready');
      window.setTimeout(() => { loader.hidden = true; }, 1000);
    }, 260);
  };

  const minDelay = new Promise((r) => window.setTimeout(r, reduced ? 100 : 650));
  const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => window.setTimeout(r, ms))]);
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const heroImages = $$('.hero-card img')
    .filter((img) => img.complete || img.getAttribute('loading') !== 'lazy')
    .map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));

  Promise.all([minDelay, withTimeout(fonts, 1400), ...heroImages.map((p) => withTimeout(p, 1100))])
    .then(finish)
    .catch(finish);
  window.setTimeout(finish, 2600);
  paint();
}

/* --------------------------------------------------------------------------
   Split the wordmark into animatable letters
   -------------------------------------------------------------------------- */

function initSplit() {
  const el = $('[data-split]');
  if (!el) return;
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.innerHTML = Array.from(text).map((ch, i) =>
    `<span class="char" style="--i:${i}" aria-hidden="true">${esc(ch)}</span>`
  ).join('');
}

/* --------------------------------------------------------------------------
   Header, active section
   -------------------------------------------------------------------------- */

function initChrome() {
  const head = $('#head');

  const onScroll = () => {
    if (head) head.classList.toggle('is-stuck', window.scrollY > 36);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = $$('.nav a, .dock > a[data-dock]');
  const sections = links
    .filter((a) => (a.getAttribute('href') || '').startsWith('#'))
    .map((a) => ({ a, section: $(a.getAttribute('href')) }))
    .filter((x) => x.section);

  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => {
          a.classList.toggle('is-current', a.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: '-42% 0px -52% 0px', threshold: 0 });
    sections.forEach(({ section }) => io.observe(section));
  }
}

/* --------------------------------------------------------------------------
   Reveal on scroll
   -------------------------------------------------------------------------- */

function initReveal() {
  $$('.section-head, .visit__head, .story__copy').forEach((el) => el.setAttribute('data-reveal', ''));
  const items = $$('[data-reveal], .menu-group');
  if (!items.length) return;
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  items.forEach((el) => io.observe(el));
}

/* --------------------------------------------------------------------------
   Lightbox
   -------------------------------------------------------------------------- */

function initLightbox() {
  const lb = $('#lightbox');
  const img = $('#lbImg');
  const name = $('#lbName');
  const date = $('#lbDate');
  const no = $('#lbNo');
  const close = $('#lbClose');
  const prev = $('#lbPrev');
  const next = $('#lbNext');
  if (!lb || !img) return null;

  let index = 0;
  let opener = null;

  const render = () => {
    const plate = PLATES[mod(index, PLATES.length)];
    img.src = plate.full;
    img.alt = `${plate.name} at Sushiology Mirpur`;
    if (name) name.textContent = plate.name;
    if (date) date.textContent = plate.date;
    if (no) no.textContent = `${pad2(mod(index, PLATES.length) + 1)} / ${pad2(PLATES.length)}`;
  };

  const focusables = () => $$('button', lb).filter((el) => !el.disabled);

  const open = (i) => {
    opener = document.activeElement;
    index = mod(i, PLATES.length);
    render();
    lb.hidden = false;
    body.classList.add('no-scroll', 'lb-open');
    requestAnimationFrame(() => {
      lb.classList.add('is-open');
      if (close) close.focus();
    });
  };

  const hide = () => {
    lb.classList.remove('is-open');
    body.classList.remove('no-scroll', 'lb-open');
    window.setTimeout(() => { lb.hidden = true; }, 360);
    if (opener && opener.focus) opener.focus();
  };

  const step = (dir) => {
    index = mod(index + dir, PLATES.length);
    render();
  };

  if (close) close.addEventListener('click', hide);
  if (prev) prev.addEventListener('click', () => step(-1));
  if (next) next.addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) hide(); });

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); hide(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // swipe
  let sx = 0;
  let sy = 0;
  let swiping = false;
  img.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; swiping = true; });
  img.addEventListener('pointerup', (e) => {
    if (!swiping) return;
    swiping = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) step(dx > 0 ? -1 : 1);
  });

  return { open };
}

/* --------------------------------------------------------------------------
   The 3D deck
   -------------------------------------------------------------------------- */

function initDeck(lightbox) {
  const deck = $('#deck');
  const nameEl = $('#deckName');
  const dateEl = $('#deckDate');
  const noEl = $('#deckNo');
  const prev = $('#deckPrev');
  const next = $('#deckNext');
  const openBtn = $('#deckOpen');
  if (!deck) return;

  const count = PLATES.length;
  const cards = PLATES.map((plate, i) => {
    const card = document.createElement('article');
    card.className = 'deck-card';
    card.dataset.i = String(i);
    card.setAttribute('aria-label', plate.name);
    card.innerHTML = `<img alt="${esc(plate.name)} at Sushiology Mirpur" data-src="${plate.full}" loading="lazy" decoding="async">`;
    deck.appendChild(card);
    return card;
  });

  let index = 0;
  let dragging = false;
  let startX = 0;
  let startIndex = 0;
  let moved = 0;

  const offsetFor = (i) => {
    let off = i - index;
    off = mod(off + count / 2, count) - count / 2;
    return off;
  };

  const loadCard = (card) => {
    const img = card.querySelector('img');
    if (!img || img.dataset.loaded) return;
    img.dataset.loaded = '1';
    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', () => { img.style.opacity = '0'; }, { once: true });
    img.src = img.dataset.src;
    if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
  };

  const layout = () => {
    const cardW = cards[0] ? cards[0].offsetWidth || 260 : 260;
    const gap = cardW * 0.56;
    cards.forEach((card, i) => {
      const off = offsetFor(i);
      const abs = Math.abs(off);
      const x = off * gap;
      const y = Math.pow(Math.min(abs, 5), 1.7) * 7;
      const z = -Math.min(abs, 6) * 180;
      const ry = Math.max(-40, Math.min(40, off * -20));
      const s = Math.max(0.68, 1 - abs * 0.05);
      const dim = Math.min(0.66, abs * 0.19);
      const visible = abs <= 4.2;

      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
      card.style.setProperty('--z', `${z}px`);
      card.style.setProperty('--ry', `${ry}deg`);
      card.style.setProperty('--s', s.toFixed(3));
      card.style.setProperty('--dim', dim.toFixed(3));
      card.style.opacity = visible ? '1' : '0';
      card.style.pointerEvents = visible ? 'auto' : 'none';
      card.style.zIndex = String(200 - Math.round(abs * 20));
      card.classList.toggle('is-active', abs < 0.5);

      if (abs <= 4) loadCard(card);
    });
  };

  const caption = () => {
    const plate = PLATES[mod(Math.round(index), count)];
    if (nameEl) nameEl.textContent = plate.name;
    if (dateEl) dateEl.textContent = plate.date;
    if (noEl) noEl.textContent = pad2(mod(Math.round(index), count) + 1);
  };

  const snap = (dir) => {
    index = Math.round(index) + dir;
    layout();
    caption();
  };

  const settle = () => {
    index = Math.round(index);
    layout();
    caption();
  };

  // drag
  deck.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    moved = 0;
    startX = e.clientX;
    startIndex = index;
    deck.classList.add('is-dragging');
    try { deck.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  });

  deck.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    const cardW = cards[0] ? cards[0].offsetWidth || 260 : 260;
    index = startIndex - dx / (cardW * 0.68);
    layout();
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    deck.classList.remove('is-dragging');
    try { deck.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
    settle();
  };
  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);
  window.addEventListener('pointerup', (e) => { if (dragging) endDrag(e); });

  // clicks
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (moved > 8) return;
      const off = offsetFor(i);
      if (Math.abs(off) < 0.6) {
        if (lightbox) lightbox.open(i);
      } else {
        index = Math.round(index + off);
        layout();
        caption();
      }
    });
  });

  if (prev) prev.addEventListener('click', () => snap(-1));
  if (next) next.addEventListener('click', () => snap(1));
  if (openBtn) openBtn.addEventListener('click', () => {
    if (lightbox) lightbox.open(Math.round(index));
  });

  deck.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); snap(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); snap(1); }
    if (e.key === 'Home') { e.preventDefault(); index = 0; layout(); caption(); }
    if (e.key === 'End') { e.preventDefault(); index = count - 1; layout(); caption(); }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (lightbox) lightbox.open(Math.round(index));
    }
  });

  let resizeTimer = 0;
  const relayout = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 100);
  };
  window.addEventListener('resize', relayout, { passive: true });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(relayout);
    ro.observe(deck);
  }

  requestAnimationFrame(() => { layout(); caption(); });
}

/* --------------------------------------------------------------------------
   Menu
   -------------------------------------------------------------------------- */

function initMenu(lightbox) {
  const list = $('#menuList');
  if (!list) return;

  const byId = new Map(PLATES.map((p) => [p.id, p]));

  MENU.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'menu-group';
    section.setAttribute('aria-label', group.month);

    const head = document.createElement('h3');
    head.className = 'menu-month';
    head.textContent = group.month;
    section.appendChild(head);

    group.items.forEach((item) => {
      const plate = byId.get(item.id);
      if (!plate) return;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'menu-row';
      row.dataset.id = plate.id;
      row.setAttribute('aria-label', `View ${item.name}, ${plate.date}`);
      row.innerHTML = `
        <span class="menu-row__name">${esc(item.name)}</span>
        <span class="menu-row__date">${esc(plate.date.replace(' 2026', ''))}</span>
        <img class="menu-row__thumb" src="${plate.thumb}" alt="" width="62" height="62" loading="lazy" decoding="async">
      `;
      row.addEventListener('click', () => {
        const i = PLATES.findIndex((p) => p.id === plate.id);
        if (lightbox && i >= 0) lightbox.open(i);
      });
      section.appendChild(row);
    });

    list.appendChild(section);
  });

  // hover preview
  if (!fine || reduced) return;
  const preview = $('#menuPreview');
  const previewImg = preview ? preview.querySelector('img') : null;
  if (!preview || !previewImg) return;

  let mx = 0;
  let my = 0;
  let px = 0;
  let py = 0;
  let raf = 0;

  const follow = () => {
    px += (mx - px) * 0.2;
    py += (my - py) * 0.2;
    preview.style.left = `${px}px`;
    preview.style.top = `${py}px`;
    if (Math.abs(mx - px) > 0.5 || Math.abs(my - py) > 0.5) {
      raf = requestAnimationFrame(follow);
    } else {
      raf = 0;
    }
  };

  document.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!raf) raf = requestAnimationFrame(follow);
  }, { passive: true });

  $$('.menu-row', list).forEach((row) => {
    row.addEventListener('pointerenter', () => {
      const plate = byId.get(row.dataset.id);
      if (!plate) return;
      previewImg.src = plate.full;
      preview.classList.add('is-visible');
    });
    row.addEventListener('pointerleave', () => preview.classList.remove('is-visible'));
    row.addEventListener('focus', () => {
      const plate = byId.get(row.dataset.id);
      if (!plate) return;
      previewImg.src = plate.full;
      preview.classList.add('is-visible');
    });
    row.addEventListener('blur', () => preview.classList.remove('is-visible'));
  });
}

/* --------------------------------------------------------------------------
   Live Dhaka hours
   -------------------------------------------------------------------------- */

function initHours() {
  const status = $('#openStatus');
  const statusText = $('#statusText');
  const heroStatus = $('#heroStatus');
  const headStatus = $('#headStatus');
  const headStatusText = $('#headStatusText');
  const headStatusShort = $('#headStatusShort');
  const table = $('#hoursTable');
  if (!status || !statusText) return;

  const update = () => {
    const now = new Date();
    const dhaka = new Date(now.getTime() + (now.getTimezoneOffset() + 360) * 60000);
    const day = dhaka.getDay();
    const mins = dhaka.getHours() * 60 + dhaka.getMinutes();
    const openM = day === 5 ? 15 * 60 : 13 * 60;
    const closeM = 23 * 60;
    const isOpen = mins >= openM && mins < closeM;

    let text;
    if (isOpen) {
      const left = closeM - mins;
      text = left <= 60 ? `Open now · closes in ${left} min` : 'Open now · closes 11 PM';
    } else if (mins < openM) {
      text = `Closed · opens ${day === 5 ? '3 PM' : '1 PM'}`;
    } else {
      const nextDay = (day + 1) % 7;
      text = `Closed · opens ${nextDay === 5 ? '3 PM' : '1 PM'}`;
    }

    statusText.textContent = text;
    status.classList.toggle('is-open', isOpen);
    status.classList.toggle('is-closed', !isOpen);
    if (heroStatus) {
      heroStatus.textContent = isOpen ? 'Open now' : 'Closed now';
      heroStatus.classList.toggle('is-closed', !isOpen);
    }
    if (headStatus) {
      headStatus.classList.toggle('is-open', isOpen);
      headStatus.classList.toggle('is-closed', !isOpen);
    }
    if (headStatusText) headStatusText.textContent = isOpen ? 'Open now' : 'Closed now';
    if (headStatusShort) headStatusShort.textContent = isOpen ? 'Open' : 'Closed';
    if (table) {
      $$('tr', table).forEach((tr) => {
        tr.classList.toggle('is-today', Number(tr.dataset.day) === day);
      });
    }
  };

  update();
  window.setInterval(update, 60000);
}

/* --------------------------------------------------------------------------
   Cursor, magnetic buttons, hero card parallax
   -------------------------------------------------------------------------- */

function initPointer() {
  if (!fine || reduced) return;

  body.classList.add('has-cursor');
  const ring = $('#cursorRing');
  if (ring) {
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    document.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));

    const hoverables = 'a, button, [role="button"], .deck-card, .menu-row';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest && e.target.closest(hoverables)) ring.classList.add('is-hover');
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest && e.target.closest(hoverables)) ring.classList.remove('is-hover');
    });
    document.addEventListener('mouseleave', () => { ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { ring.style.opacity = '1'; });

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  $$('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${(e.clientX - r.left - r.width / 2) * 0.16}px`);
      el.style.setProperty('--ty', `${(e.clientY - r.top - r.height / 2) * 0.16}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--tx', '0px');
      el.style.setProperty('--ty', '0px');
    });
  });

  const hero = $('.hero');
  if (hero) {
    hero.addEventListener('pointermove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      hero.style.setProperty('--px', x.toFixed(3));
      hero.style.setProperty('--py', y.toFixed(3));
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--px', '0');
      hero.style.setProperty('--py', '0');
    });
  }
}

/* --------------------------------------------------------------------------
   WebGL: the current
   -------------------------------------------------------------------------- */

function initWave() {
  const canvas = $('#wave');
  if (!canvas) return;

  const isMobile = window.matchMedia('(max-width: 820px)').matches;

  try {
    THREE.ColorManagement.enabled = false;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.8));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 240);
    camera.position.set(0, 4.2, 12);
    camera.lookAt(0, 3.0, -10);

    const segX = isMobile ? 100 : 170;
    const segZ = isMobile ? 120 : 210;
    const xMin = -44;
    const xMax = 44;
    const zMin = -60;
    const zMax = 18;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let iz = 0; iz <= segZ; iz++) {
      const tz = iz / segZ;
      const z = zMin + (zMax - zMin) * tz;
      for (let ix = 0; ix <= segX; ix++) {
        const tx = ix / segX;
        positions.push(xMin + (xMax - xMin) * tx, 0, z);
        uvs.push(tx, tz);
      }
    }

    const row = segX + 1;
    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = iz * row + ix;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 1 },
      uSunX: { value: 13.5 },
      uPointer: { value: new THREE.Vector2(0, 0) }
    };

    const waveMaterial = new THREE.ShaderMaterial({
      uniforms,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uAmp;
        uniform vec2 uPointer;
        varying float vElev;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying vec3 vNormalW;

        float wave(vec2 p, float t) {
          float h = 0.0;
          h += sin(p.x * 0.155 + t * 0.50) * 0.52;
          h += sin(p.y * 0.105 - t * 0.38) * 0.60;
          h += sin((p.x * 0.72 + p.y * 0.92) * 0.215 + t * 0.62) * 0.36;
          h += sin((p.x * 0.94 - p.y * 0.52) * 0.305 - t * 0.74) * 0.20;
          h += sin(p.x * 0.92 + p.y * 0.63 + t * 1.45) * 0.055;
          h += sin(p.x * 1.63 - p.y * 1.18 - t * 1.95) * 0.028;
          h = h * 0.86 + pow(max(h, 0.0), 1.7) * 0.46;
          float d = distance(p, uPointer * vec2(28.0, 20.0));
          h += exp(-d * 0.22) * 0.5;
          return h;
        }

        void main() {
          vUv = uv;
          vec3 pos = position;
          float h = wave(pos.xz, uTime) * uAmp;
          pos.y += h;

          float e = 0.26;
          float hx = wave(pos.xz + vec2(e, 0.0), uTime) * uAmp;
          float hz = wave(pos.xz + vec2(0.0, e), uTime) * uAmp;
          vNormalW = normalize(vec3(-(hx - h) / e, 1.0, -(hz - h) / e));

          vElev = h;
          vWorld = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSunX;
        varying float vElev;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying vec3 vNormalW;

        void main() {
          vec3 ink = vec3(0.027, 0.059, 0.118);
          vec3 deep = vec3(0.012, 0.055, 0.115);
          vec3 teal = vec3(0.030, 0.165, 0.220);
          vec3 crest = vec3(0.482, 0.878, 0.812);
          vec3 saffron = vec3(1.0, 0.824, 0.247);

          float h = clamp((vElev + 2.0) / 4.0, 0.0, 1.0);

          vec3 col = mix(ink, deep, smoothstep(0.26, 0.52, h));
          col = mix(col, teal, smoothstep(0.52, 0.80, h));
          col = mix(col, crest, smoothstep(0.86, 1.0, h) * 0.5);

          vec3 N = normalize(vNormalW);
          vec3 L = normalize(vec3(0.4, 0.72, 0.4));
          vec3 V = normalize(cameraPosition - vWorld);
          float diff = clamp(dot(N, L), 0.0, 1.0);
          col *= 0.55 + diff * 0.78;

          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 70.0);
          col += vec3(0.72, 0.95, 0.90) * spec * 0.3;

          float foam = smoothstep(1.3, 1.72, vElev) * (0.55 + 0.45 * sin(vWorld.x * 0.9 + vWorld.z * 1.4 + uTime * 0.9));
          col = mix(col, vec3(0.86, 0.95, 0.93), clamp(foam, 0.0, 1.0) * 0.6);

          float path = exp(-pow((vWorld.x - uSunX) * 0.16, 2.0));
          float glit = pow(max(0.0, sin(vWorld.z * 3.1 + vWorld.x * 2.2 + uTime * 2.0)), 26.0);
          col += saffron * path * glit * 0.3 * smoothstep(0.55, 0.95, h);

          float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
          col += vec3(0.55, 0.85, 0.85) * fres * 0.16;

          float far = 1.0 - smoothstep(0.0, 0.40, vUv.y);
          col = mix(col, ink, far * 0.92);
          float horizon = (1.0 - smoothstep(0.0, 0.2, vUv.y)) * exp(-pow((vWorld.x - uSunX) * 0.11, 2.0));
          col += saffron * horizon * 0.20;

          float vig = smoothstep(0.94, 0.3, distance(vUv, vec2(0.5, 0.54)));
          col *= 0.82 + vig * 0.22;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    const wave = new THREE.Mesh(geometry, waveMaterial);
    scene.add(wave);

    // the saffron sun, behind the water
    const sunVert = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const sunFrag = `
      varying vec2 vUv;
      void main() {
        float d = distance(vUv, vec2(0.5));
        float a = smoothstep(0.5, 0.487, d);
        vec3 col = mix(vec3(1.0, 0.76, 0.10), vec3(1.0, 0.90, 0.50), smoothstep(0.5, 0.08, d) * 0.6);
        gl_FragColor = vec4(col, a * 0.97);
      }
    `;
    const glowFrag = `
      varying vec2 vUv;
      void main() {
        float d = distance(vUv, vec2(0.5));
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.25), a * a * 0.26);
      }
    `;

    const sunMat = new THREE.ShaderMaterial({
      vertexShader: sunVert,
      fragmentShader: sunFrag,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });
    const sun = new THREE.Mesh(new THREE.CircleGeometry(6, 96), sunMat);
    sun.position.set(13.5, 5.6, -48);
    scene.add(sun);

    const glowMat = new THREE.ShaderMaterial({
      vertexShader: sunVert,
      fragmentShader: glowFrag,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(13, 64), glowMat);
    glow.position.set(13.5, 5.6, -48.4);
    scene.add(glow);

    // floating plankton / stars
    const particleCount = isMobile ? 120 : 260;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 78;
      particlePositions[i * 3 + 1] = 0.4 + Math.random() * 10;
      particlePositions[i * 3 + 2] = -58 + Math.random() * 64;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      color: 0xffd23f,
      size: isMobile ? 0.05 : 0.04,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }));
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    let camX = 0;
    let camY = 0;

    window.addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      uniforms.uPointer.value.set(pointer.x * 0.6, pointer.y * 0.4);
    }, { passive: true });

    let sunBaseX = 13.5;
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      const portrait = aspect < 0.92;

      camera.aspect = aspect;
      camera.fov = portrait ? 50 : 42;
      camera.updateProjectionMatrix();

      const sunX = portrait ? 6.2 : 13.5;
      const sunZ = portrait ? -62 : -48;
      const sunR = portrait ? 4.4 : 5.2;
      const glowR = portrait ? 10 : 16;
      sunBaseX = sunX;
      sun.position.set(sunX, 4.2, sunZ);
      glow.position.set(sunX, 4.2, sunZ - 0.4);
      sun.scale.setScalar(sunR / 6);
      glow.scale.setScalar(glowR / 13);
      uniforms.uSunX.value = sunX;
    };

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();

    const hero = canvas.closest('.hero');
    let running = true;
    let visible = true;
    let raf = 0;
    let elapsed = 0;
    const clock = new THREE.Clock();

    const frame = () => {
      raf = 0;
      if (!running || !visible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;
      uniforms.uTime.value = elapsed;

      let scrollProgress = 0;
      if (hero) {
        const rect = hero.getBoundingClientRect();
        scrollProgress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
      }
      uniforms.uAmp.value = 1.3 + scrollProgress * 0.6;

      camX += (pointer.x * 1.1 - camX) * 0.045;
      camY += (4.2 + pointer.y * 0.32 - camY) * 0.045;
      camera.position.x = camX;
      camera.position.y = camY;
      camera.lookAt(camX * 0.35, 3.0 + pointer.y * 0.12, -10);

      sun.position.x = sunBaseX + camX * 0.5;
      glow.position.x = sun.position.x;
      particles.rotation.y += dt * 0.006;
      particles.position.y = Math.sin(elapsed * 0.25) * 0.15;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running && visible && !raf) {
        clock.getDelta();
        raf = requestAnimationFrame(frame);
      }
    };

    if (reduced) {
      uniforms.uTime.value = 0;
      uniforms.uAmp.value = 1;
      renderer.render(scene, camera);
    } else {
      if ('IntersectionObserver' in window && hero) {
        const io = new IntersectionObserver((entries) => {
          visible = entries[0].isIntersecting;
          if (visible) start();
        }, { threshold: 0 });
        io.observe(hero);
      }
      document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) start();
      });
      start();
    }
  } catch (err) {
    document.documentElement.classList.add('no-webgl');
    console.warn('Wave unavailable:', err);
  }
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */

function boot() {
  initSplit();
  initChrome();
  const lightbox = initLightbox();
  initDeck(lightbox);
  initMenu(lightbox);
  initHours();
  initReveal();
  initPointer();
  initWave();
  initLoader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
