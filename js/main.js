/* "The Comeback": scroll-driven scenes with GSAP + ScrollTrigger and Lenis
   smooth scrolling. Every scene is readable without this file; it only adds
   motion when the page has the .motion class (scripts on, motion welcome). */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Campaign video: load when near, play muted in view, sound toggle ---------- */
  var cam = $('#campaign');
  var soundBtn = $('#sound');
  var camLoaded = false;
  function loadCam() { if (!camLoaded) { cam.src = cam.dataset.src; camLoaded = true; } }
  if (cam) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { loadCam(); var p = cam.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!cam.paused) cam.pause();
      });
    }, { rootMargin: '200px 0px', threshold: 0.25 }).observe(cam);
    soundBtn.addEventListener('click', function () {
      loadCam();
      var on = cam.muted;
      cam.muted = !on;
      if (on) { cam.currentTime = 0; cam.loop = false; } else { cam.loop = true; }
      var p = cam.play(); if (p && p.catch) p.catch(function () {});
      soundBtn.setAttribute('aria-pressed', String(on));
      $('.phone__label', soundBtn).textContent = on ? 'Mute' : 'Play with sound';
    });
    cam.addEventListener('ended', function () {
      cam.muted = true; cam.loop = true; cam.play();
      soundBtn.setAttribute('aria-pressed', 'false');
      $('.phone__label', soundBtn).textContent = 'Play with sound';
    });
  }

  /* ---------- Pause the hero loop when it is off screen ---------- */
  var heroVid = $('.hero__vid');
  if (heroVid) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { var p = heroVid.play(); if (p && p.catch) p.catch(function () {}); }
        else heroVid.pause();
      });
    }).observe(heroVid);
  }

  /* ---------- Trophy spotlight follows the pointer ---------- */
  if (matchMedia('(hover: hover)').matches) {
    $$('.trophy__img').forEach(function (el) {
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((ev.clientX - r.left) / r.width * 100) + '%');
        el.style.setProperty('--my', ((ev.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  var motion = root.classList.contains('motion') && window.gsap && window.ScrollTrigger;
  if (!motion) { root.classList.remove('motion'); return; }

  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  /* ---------- Smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { duration: 1.8 }); else t.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Opening slate ---------- */
  var slate = $('#slate');
  var seen = false;
  try { seen = sessionStorage.getItem('slate') === '1'; sessionStorage.setItem('slate', '1'); } catch (e) {}
  if (lenis) lenis.stop();
  var intro = gsap.timeline({
    onComplete: function () { slate.remove(); if (lenis) lenis.start(); }
  });
  var cnt = { v: 0 }, cntEl = $('#slate-count');
  intro
    .to(cnt, { v: 100, duration: seen ? 0.3 : 1.2, ease: 'power2.inOut', onUpdate: function () { cntEl.textContent = String(Math.round(cnt.v)).padStart(2, '0'); } })
    .to('.slate__inner', { opacity: 0, duration: 0.3 })
    .to('.slate__bar--top', { yPercent: -101, duration: 1, ease: 'expo.inOut' }, '<0.05')
    .to('.slate__bar--bottom', { yPercent: 101, duration: 1, ease: 'expo.inOut' }, '<')
    .from('.hero__frame', { scale: 1.12, clipPath: 'inset(50% 0% 50% 0%)', duration: 1.3, ease: 'expo.out' }, '-=0.55')
    .from('.hero__first', { xPercent: -40, opacity: 0, duration: 1.2, ease: 'expo.out' }, '<0.1')
    .from('.hero__last', { xPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out' }, '<')
    .from('.hero__lower > *, .hud', { opacity: 0, y: 18, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, '<0.35');

  /* ---------- HUD: scene label + timeline timecode ---------- */
  var sceneLabel = $('#hud-scene'), fill = $('#timeline-fill'), tc = $('#timecode');
  var pad = function (n) { return String(n).padStart(2, '0'); };

  /* ---------- SCENE 01 · Hero exits ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero__first', { xPercent: -35, ease: 'none' }, 0)
    .to('.hero__last', { xPercent: 35, ease: 'none' }, 0)
    .to('.hero__frame', { scale: 1.18, opacity: 0.15, ease: 'none' }, 0)
    .to('.hero__lower', { y: -60, opacity: 0, ease: 'none' }, 0);

  /* Helper: cut between stacked subtitles inside a scrubbed timeline */
  function subIn(tl, el, at) { tl.fromTo(el, { opacity: 0, y: 28, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out' }, at); }
  function subOut(tl, el, at) { tl.to(el, { opacity: 0, y: -28, filter: 'blur(10px)', duration: 0.4, ease: 'power2.in' }, at); }

  /* ---------- SCENE 02 · Prologue ---------- */
  (function () {
    var subs = $$('#prologue .subs li');
    var tl = gsap.timeline({ scrollTrigger: { trigger: '#prologue', start: 'top top', end: '+=' + subs.length * 85 + '%', pin: true, scrub: 1 } });
    tl.fromTo('#prologue .prologue__media img', { scale: 1.35 }, { scale: 1, ease: 'none', duration: subs.length * 2 }, 0);
    tl.from('#prologue .card-title', { opacity: 0, y: 20, duration: 0.4 }, 0);
    subs.forEach(function (li, i) {
      subIn(tl, li, i * 2 + 0.2);
      if (i < subs.length - 1) subOut(tl, li, i * 2 + 1.6);
    });
  })();

  /* ---------- SCENE 03 · The climb ---------- */
  (function () {
    var subs = $$('#climb .subs li'), sets = $$('#climb .board__sets li');
    var num = $('#gpa-num'), g = { v: 2.67 };
    var draw = function () { num.textContent = g.v.toFixed(2); };
    draw();
    var setActive = function (i) { sets.forEach(function (s, k) { s.classList.toggle('is-on', k === i); }); };
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#climb', start: 'top top', end: '+=320%', pin: true, scrub: 1,
        onUpdate: function (self) { setActive(self.progress < 0.36 ? 0 : self.progress < 0.7 ? 1 : 2); }
      }
    });
    tl.set(num, { color: '#5F5C58' }, 0)
      .from('#climb .board', { opacity: 0, scale: 0.9, duration: 0.4 }, 0)
      .fromTo('.climb__path', { strokeDashoffset: 1 }, { strokeDashoffset: 1 - 0.143, ease: 'none', duration: 0.8 }, 0);
    subIn(tl, subs[0], 0.2);
    subOut(tl, subs[0], 1.1);
    tl.to(g, { v: 3.78, duration: 1, ease: 'power2.inOut', onUpdate: draw }, 1.2)
      .to(num, { color: '#F2EFE9', duration: 1 }, 1.2)
      .to('.climb__path', { strokeDashoffset: 1 - 0.523, ease: 'none', duration: 1 }, 1.2);
    subIn(tl, subs[1], 1.7);
    subOut(tl, subs[1], 2.6);
    tl.to(g, { v: 3.89, duration: 0.8, ease: 'power2.out', onUpdate: draw }, 2.8)
      .to(num, { color: '#FF5B1F', duration: 0.8 }, 2.8)
      .to('.climb__path', { strokeDashoffset: 0, ease: 'none', duration: 1 }, 2.8);
    subIn(tl, subs[2], 3.2);
    tl.to({}, { duration: 0.6 });
  })();

  /* ---------- SCENE 04 · 410 → 800 ---------- */
  (function () {
    var subs = $$('#sat .subs li'), num = $('#sat-num'), pct = $('#sat-pct'), date = $('#sat-date');
    var s = { v: 410 };
    var draw = function () {
      var v = Math.round(s.v);
      num.textContent = v;
      pct.textContent = v >= 800 ? '>99th' : Math.round(24 + (v - 410) / 390 * 75) + 'th';
      date.textContent = v > 410 ? 'June 2026' : 'May 2025';
    };
    draw();
    var domains = $$('#sat .domain');
    domains.forEach(function (d) { d.style.setProperty('--s', getComputedStyle(d).getPropertyValue('--a')); });
    var tl = gsap.timeline({ scrollTrigger: { trigger: '#sat', start: 'top top', end: '+=420%', pin: true, scrub: 1 } });
    tl.set(num, { color: '#5F5C58', textShadow: '0 0 0 rgba(0,0,0,0)' }, 0)
      .set('#sat-delta', { opacity: 0, scale: 2.4 }, 0)
      .from(num, { opacity: 0, scale: 1.15, filter: 'blur(16px)', duration: 0.6 }, 0);
    subIn(tl, subs[0], 0.3);
    subOut(tl, subs[0], 1.3);
    // "So I became my own tutor": number fades back, the skill board comes up
    subIn(tl, subs[1], 1.6);
    tl.to(num, { opacity: 0.1, duration: 0.5 }, 1.7)
      .to('#sat .domains', { opacity: 1, duration: 0.5 }, 1.9);
    subOut(tl, subs[1], 2.5);
    subIn(tl, subs[2], 2.7);
    domains.forEach(function (d, i) {
      tl.to(d, { '--s': 1, duration: 0.9, ease: 'power2.inOut' }, 2.8 + i * 0.12);
    });
    subOut(tl, subs[2], 3.9);
    tl.to('#sat .domains', { opacity: 0, duration: 0.4 }, 4.0)
      .to(num, { opacity: 1, duration: 0.4 }, 4.1)
      .to(s, { v: 800, duration: 1.4, ease: 'power3.inOut', onUpdate: draw }, 4.2)
      .to(num, { color: '#FF5B1F', textShadow: '0 0 80px rgba(255,91,31,.45)', duration: 1.2 }, 4.4)
      .to('#sat-delta', { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 5.6);
    subIn(tl, subs[3], 5.6);
    tl.to({}, { duration: 0.7 });
  })();

  /* ---------- SCENE 05 · Two tests, one score ---------- */
  (function () {
    var sup = { v: 920 }, supEl = $('#super-num');
    var tl = gsap.timeline({ scrollTrigger: { trigger: '#combo', start: 'top top', end: '+=240%', pin: true, scrub: 1 } });
    tl.from('#combo .card-title', { opacity: 0, y: 20, duration: 0.3 }, 0)
      .from('[data-test="may"]', { xPercent: -60, opacity: 0, rotate: -4, duration: 0.8, ease: 'power3.out' }, 0)
      .from('[data-test="june"]', { xPercent: 60, opacity: 0, rotate: 4, duration: 0.8, ease: 'power3.out' }, 0.1)
      .to('#combo .score__row:not(.score__row--best), #combo .score__total', { opacity: 0.18, duration: 0.5 }, 1.1)
      .fromTo('#combo .score__row--best', { backgroundColor: 'rgba(255,91,31,0)' }, { backgroundColor: 'rgba(255,91,31,.14)', duration: 0.5 }, 1.1)
      .fromTo('#combo .score__row--best b', { scale: 1 }, { scale: 1.25, transformOrigin: 'right center', duration: 0.5, ease: 'back.out(2)' }, 1.2)
      .to('#combo .super', { opacity: 1, duration: 0.4 }, 1.9)
      .from('#combo .super', { y: 60, scale: 0.85, duration: 0.8, ease: 'power3.out' }, 1.9)
      .to(sup, { v: 1310, duration: 1, ease: 'power2.out', onUpdate: function () { supEl.textContent = Math.round(sup.v); } }, 2.0)
      .to({}, { duration: 0.6 });
  })();

  /* ---------- SCENE 06 · On camera ---------- */
  gsap.fromTo('.reel__track', { xPercent: 0 }, { xPercent: -40, ease: 'none', scrollTrigger: { trigger: '#oncam', start: 'top bottom', end: 'bottom top', scrub: true } });
  (function () {
    var v = { v: 0 }, el = $('#views');
    gsap.timeline({ scrollTrigger: { trigger: '#oncam', start: 'top 65%', toggleActions: 'play none none none' } })
      .from('.oncam__copy > *', { opacity: 0, y: 40, duration: 0.9, stagger: 0.1, ease: 'power3.out' })
      .to(v, { v: 2.5, duration: 1.6, ease: 'power3.out', onUpdate: function () { el.textContent = v.v.toFixed(1); } }, 0.1)
      .from('.phone', { y: 120, rotate: 6, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.1);
  })();

  /* ---------- SCENE 07 · Trophy room ---------- */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', function () {
    var track = $('.trophies__track');
    var dist = function () { return track.scrollWidth - window.innerWidth; };
    var slide = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: '.trophies__pin', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true }
    });
    gsap.from('.panel--intro > *', { opacity: 0, y: 40, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '#trophies', start: 'top 60%' } });
    $$('.trophy').forEach(function (fig) {
      var box = $('.trophy__img', fig), img = $('img', fig);
      gsap.fromTo(box, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: fig, containerAnimation: slide, start: 'left 100%', end: 'left 55%', scrub: true } });
      gsap.fromTo(img, { scale: 1.45, filter: 'grayscale(1) brightness(.45)' }, { scale: 1, filter: 'grayscale(0) brightness(1)', ease: 'none', scrollTrigger: { trigger: fig, containerAnimation: slide, start: 'left 100%', end: 'left 35%', scrub: true } });
      gsap.fromTo(img, { xPercent: 0 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: fig, containerAnimation: slide, start: 'left 50%', end: 'right 0%', scrub: true } });
      gsap.from($('.lower3', fig), { xPercent: -25, opacity: 0, ease: 'none', scrollTrigger: { trigger: fig, containerAnimation: slide, start: 'left 70%', end: 'left 45%', scrub: true } });
    });
  });
  mm.add('(max-width: 899px)', function () {
    $$('.trophy').forEach(function (fig) {
      var box = $('.trophy__img', fig), img = $('img', fig);
      gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 92%', end: 'top 35%', scrub: true } })
        .fromTo(box, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
        .fromTo(img, { scale: 1.4, filter: 'grayscale(1) brightness(.45)' }, { scale: 1, filter: 'grayscale(0) brightness(1)', ease: 'none' }, 0);
    });
    gsap.from('.panel--intro > *', { opacity: 0, y: 30, stagger: 0.1, duration: 0.8, scrollTrigger: { trigger: '#trophies', start: 'top 70%' } });
  });

  /* ---------- SCENE 08 · Character: the quote lights up word by word ---------- */
  (function () {
    var q = $('#quote');
    q.innerHTML = q.textContent.split(' ').map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    gsap.fromTo('#quote .w', { opacity: 0.1 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '#character', start: 'top 70%', end: 'center 45%', scrub: true } });
    gsap.from('.beats li', { opacity: 0, y: 40, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.beats', start: 'top 85%' } });
  })();

  /* ---------- SCENE 09 · Finale: the photo opens to full screen ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.finale__pin', start: 'top top', end: '+=170%', pin: true, scrub: 1 } })
    .fromTo('.finale__img', { clipPath: 'inset(26% 32% 26% 32%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 })
    .fromTo('.finale__img img', { scale: 1.45 }, { scale: 1, ease: 'none', duration: 1.2 }, 0)
    .fromTo('.finale__text > *', { opacity: 0, y: 50 }, { opacity: 1, y: 0, stagger: 0.18, duration: 0.5 }, 0.85)
    .to({}, { duration: 0.4 });

  /* ---------- End credits ---------- */
  $$('.credits__inner > *, .credits__list > div').forEach(function (el) {
    if (el.classList.contains('credits__list')) return;
    gsap.from(el, { opacity: 0, y: 36, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  /* ---------- HUD wiring (after pins exist so positions include pin spacing) ---------- */
  $$('[data-scene]').forEach(function (el) {
    ST.create({ trigger: el, start: 'top 50%', end: 'bottom 50%', onToggle: function (self) { if (self.isActive) sceneLabel.textContent = el.dataset.scene; } });
  });
  ST.create({
    start: 0, end: 'max',
    onUpdate: function (self) {
      fill.style.transform = 'scaleX(' + self.progress + ')';
      var f = Math.round(self.progress * 180 * 24);  // the "film" runs three minutes at 24 fps
      tc.textContent = '00:' + pad(Math.floor(f / 1440)) + ':' + pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
    }
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  window.addEventListener('load', function () { ST.refresh(); });
})();
