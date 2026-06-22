/* =========================================
   MAIN.JS — shared interactions
   ========================================= */

'use strict';

/* ---- Theme + custom cursor ---- */
const Theme = (function () {
  const CURSOR_BASE = '#f0f0f0';   // cursor is always created white…
  let cursorNodes = [];            // …then inverted to dark in light mode

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function syncToggles(theme) {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = theme === 'dark' ? '◑' : '●';
      btn.title       = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-label', btn.title);
    });
  }

  // Create the Crosshair cursor (always white) and remember the nodes it added.
  function initCursor() {
    if (typeof Crosshair === 'undefined') return;
    const before = new Set(document.body.children);
    new Crosshair({
      style: 'corners',
      dotSize: 6,
      outlineSize: 2,
      outlineSpace: 20,
      dotColor: CURSOR_BASE,
      outlineColor: CURSOR_BASE,
      useBlend: false,
      hoverPadding: { x: 15, y: 10 }
    });
    cursorNodes = [...document.body.children].filter(n => !before.has(n));
  }

  // Invert the (white) cursor to near-black on the light theme.
  function recolorCursor(theme) {
    const filter = theme === 'light' ? 'invert(1)' : '';
    cursorNodes.forEach(n => { n.style.filter = filter; });
  }

  function set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hoxx-theme', theme);
    syncToggles(theme);
    recolorCursor(theme);
  }

  // boot
  const saved = localStorage.getItem('hoxx-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  syncToggles(saved);

  document.addEventListener('click', e => {
    if (!e.target.closest('.theme-toggle')) return;
    set(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  // Crosshair script loads right after main.js, so defer init to DOMContentLoaded.
  document.addEventListener('DOMContentLoaded', () => {
    initCursor();
    recolorCursor(currentTheme());
  });

  return { set, currentTheme };
})();

/* ---- Hamburger nav ---- */
const nav        = document.getElementById('nav');
const hamburger  = document.getElementById('hamburger');

if (hamburger) {
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('open');
    const open = nav.classList.contains('open');
    hamburger.setAttribute('aria-expanded', open);
  });

  // close on outside click
  document.addEventListener('click', e => {
    if (nav.classList.contains('open') && !nav.contains(e.target)) {
      nav.classList.remove('open');
    }
  });
}

/* ---- Nav scroll tint ---- */
window.addEventListener('scroll', () => {
  if (!nav) return;
  nav.style.borderBottomColor = window.scrollY > 40
    ? 'var(--red-dim)'
    : 'var(--border)';
}, { passive: true });

/* ---- Scroll-reveal ---- */
const revealEls = document.querySelectorAll(
  '.card, .project-row, .art-card, .disciplines__item, ' +
  '.contact__link, .bio__skill-group, .stats-strip__item'
);

if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('revealed');
      io.unobserve(el);
      // Once revealed, drop the reveal classes so they don't keep a
      // `transform` that would override the 3D tilt on cards. The tilt's
      // resting transform is visually identical, so there's no jump.
      el.addEventListener('transitionend', () => {
        el.classList.remove('reveal', 'revealed');
        el.style.removeProperty('--reveal-delay');
      }, { once: true });
    });
  }, { threshold: 0.12 });

  revealEls.forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${Math.min(i, 6) * 70}ms`);
    el.classList.add('reveal');
    io.observe(el);
  });
}

/* ---- Project / artwork filter ---- */
function initFilter() {
  const tags  = document.querySelectorAll('.filter-tag');
  const items = document.querySelectorAll('[data-category]');
  const count = document.getElementById('projectCount');

  if (!tags.length || !items.length) return;

  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      const filter = tag.dataset.filter;

      tags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');

      let visible = 0;
      items.forEach(item => {
        const cats = item.dataset.category || '';
        const show = filter === 'all' || cats.includes(filter);
        item.classList.toggle('hidden', !show);
        if (show) visible++;
      });

      if (count) {
        count.textContent = `${String(visible).padStart(2, '0')} ${visible === 1 ? 'Item' : (count.dataset.label || 'Projects')}`;
      }
    });
  });
}

initFilter();

/* ---- Contact form (demo handler) ---- */
const form       = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();

    const name    = form.name.value.trim();
    const email   = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showStatus('Please fill in all fields.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus('Enter a valid email address.', 'error');
      return;
    }

    // Simulate send
    const btn = form.querySelector('.form-submit');
    btn.textContent = 'Sending…';
    btn.disabled = true;

    setTimeout(() => {
      showStatus('Message sent — I\'ll be in touch soon.', 'ok');
      form.reset();
      btn.textContent = 'Send Message →';
      btn.disabled = false;
    }, 1200);
  });

  function showStatus(msg, type) {
    if (!formStatus) return;
    formStatus.textContent = msg;
    formStatus.style.color = type === 'ok' ? 'var(--green)' : 'var(--red)';
  }
}

/* ---- Artwork lightbox ---- */
(function initLightbox() {
  const lightbox      = document.getElementById('lightbox');
  const lbClose       = document.getElementById('lightboxClose');
  const lbMedia       = document.getElementById('lightboxMedia');
  const lbInfo        = document.getElementById('lightboxInfo');
  const lbPrev        = document.getElementById('lightboxPrev');
  const lbNext        = document.getElementById('lightboxNext');
  const lbCount       = document.getElementById('lightboxCount');

  if (!lightbox) return;

  let cards   = [];
  let current = 0;

  function buildCards() {
    cards = Array.from(document.querySelectorAll('.art-card:not(.hidden)'));
  }

  function openLightbox(index) {
    buildCards();
    if (!cards.length) return;
    current = Math.max(0, Math.min(index, cards.length - 1));
    renderLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  function renderLightbox() {
    const card  = cards[current];
    const title = card.querySelector('.art-card__title')?.textContent || '';
    const desc  = card.querySelector('.art-card__desc')?.textContent  || '';
    const tags  = card.querySelector('.art-card__foot')?.innerHTML    || '';
    const num   = card.querySelector('.art-card__num')?.textContent   || '';

    lbMedia.textContent = `[ ${title} ]`;
    lbInfo.innerHTML = `
      <p class="u-mono u-muted" style="font-size:10px;letter-spacing:.18em;">${num}</p>
      <h2 class="art-card__title display">${title}</h2>
      <p class="art-card__desc">${desc}</p>
      <div class="art-card__foot" style="margin-top:16px;">${tags}</div>
    `;
    lbCount.textContent = `${String(current + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  }

  // open on expand btn or card click
  document.addEventListener('click', e => {
    const btn  = e.target.closest('.art-card__expand');
    const card = e.target.closest('.art-card');
    if (!btn && !card) return;
    buildCards();
    const target = btn ? btn.closest('.art-card') : card;
    const idx    = cards.indexOf(target);
    if (idx !== -1) openLightbox(idx);
  });

  lbClose?.addEventListener('click', closeLightbox);
  lbPrev?.addEventListener('click',  () => { openLightbox(current - 1 < 0 ? cards.length - 1 : current - 1); });
  lbNext?.addEventListener('click',  () => { openLightbox(current + 1 >= cards.length ? 0 : current + 1); });

  // keyboard nav
  document.addEventListener('keydown', e => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  lbPrev?.click();
    if (e.key === 'ArrowRight') lbNext?.click();
  });

  // backdrop click
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
})();

/* ---- 3D tilt on cards ---- */
(function initTilt() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced     = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reduced) return;

  const MAX = 9; // max degrees of rotation
  const tiltEls = document.querySelectorAll('.card, .art-card');

  tiltEls.forEach(el => {
    el.classList.add('tilt');

    el.addEventListener('pointermove', e => {
      const r  = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0..1
      const py = (e.clientY - r.top)  / r.height;  // 0..1
      const ry = (px - 0.5) * 2 * MAX;             // rotateY
      const rx = (0.5 - py) * 2 * MAX;             // rotateX
      el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      // light glare follows the pointer
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    });

    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
})();

/* ---- Scroll progress bar ---- */
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  let ticking = false;
  function update() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    bar.style.transform = `scaleX(${(pct / 100).toFixed(4)})`;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();

/* ---- Inject reveal CSS once ---- */
(function injectRevealStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .reveal {
      opacity: 0;
      transform: translateY(18px);
      transition: opacity .5s var(--reveal-delay, 0ms),
                  transform .5s var(--reveal-delay, 0ms);
    }
    .reveal.revealed {
      opacity: 1;
      transform: none;
    }
  `;
  document.head.appendChild(style);
})();
