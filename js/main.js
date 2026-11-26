/* Page interactions: nav state, progress bar, reveal-on-scroll, counters
   and the photo lightbox. No dependencies. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav background + scroll progress ---------- */
  var nav = document.getElementById('nav');
  var bar = document.getElementById('progress-bar');
  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Active nav link ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var secObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(function (s) { if (s) secObserver.observe(s); });

  /* ---------- Counters ---------- */
  function runCounter(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var prefix = el.dataset.prefix || '';
    var suffix = el.dataset.suffix || '';
    var fmt = function (v) { return prefix + v.toFixed(decimals) + suffix; };
    if (reduceMotion) { el.textContent = fmt(target); return; }
    var start = null, dur = 1600;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Reveal on scroll ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in-view');
      revealObserver.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach(function (el, i) {
    el.style.transitionDelay = (el.parentElement.children.length > 1 ? (i % 4) * 0.06 : 0) + 's';
    revealObserver.observe(el);
  });

  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      runCounter(e.target);
      countObserver.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { countObserver.observe(el); });

  /* ---------- Lightbox ---------- */
  var box = document.getElementById('lightbox');
  var boxImg = box.querySelector('img');
  var boxCap = box.querySelector('.lightbox__cap');
  var lastFocus = null;
  function openBox(src, cap) {
    lastFocus = document.activeElement;
    boxImg.src = src; boxImg.alt = cap; boxCap.textContent = cap;
    box.hidden = false; document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox__close').focus();
  }
  function closeBox() {
    box.hidden = true; document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('[data-full]').forEach(function (btn) {
    btn.addEventListener('click', function () { openBox(btn.dataset.full, btn.dataset.caption); });
  });
  box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lightbox__close')) closeBox(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) closeBox(); });
})();
