/* "The Comeback": the story is split into beats. Scrolling (or Next, the
   arrow keys, or the chapter bar) only chooses which beat is on screen; each
   beat then plays its own short animation and always lands on a real value.
   Numbers are never tied to the scroll position, so the page can never rest
   on an in-between number. When scrolling stops inside a scene it snaps to the
   nearest beat. Without .motion (no JS, or reduced motion) every scene is a
   plain readable section and the chapter bar still works. */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var played = function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); };

  /* ---------- Campaign video: load when near, play muted in view, sound toggle ---------- */
  var cam = $('#campaign'), soundBtn = $('#sound'), camLoaded = false;
  function loadCam() { if (!camLoaded) { cam.src = cam.dataset.src; camLoaded = true; } }
  function soundLabel(on) {
    soundBtn.setAttribute('aria-pressed', String(on));
    $('.phone__label', soundBtn).textContent = on ? 'Mute' : 'Play with sound';
  }
  if (cam) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { loadCam(); played(cam); } else if (!cam.paused) cam.pause();
      });
    }, { rootMargin: '200px 0px', threshold: 0.25 }).observe(cam);
    soundBtn.addEventListener('click', function () {
      loadCam();
      var turnOn = cam.muted;
      cam.muted = !turnOn;
      cam.loop = !turnOn;
      if (turnOn) cam.currentTime = 0;
      played(cam);
      soundLabel(turnOn);
    });
    cam.addEventListener('ended', function () { cam.muted = true; cam.loop = true; played(cam); soundLabel(false); });
  }

  /* ---------- Pause the hero loop when it is off screen ---------- */
  var heroVid = $('.hero__vid');
  if (heroVid) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) played(heroVid); else heroVid.pause(); });
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

  /* =====================================================================
     Navigation: stops, chapter bar, Next / Previous, keyboard
     ===================================================================== */
  var motion = root.classList.contains('motion') && window.gsap && window.ScrollTrigger;
  if (!motion) root.classList.remove('motion');

  var stops = [];   // { ch: chapter id, pos: function returning a scroll position }
  var absTop = function (el) { return el.getBoundingClientRect().top + window.scrollY; };
  function addStop(ch, pos) { stops.push({ ch: ch, pos: pos }); }
  function stopList() {
    return stops.map(function (s) { return { ch: s.ch, y: Math.max(0, Math.round(s.pos())) }; })
      .sort(function (a, b) { return a.y - b.y; });
  }
  function scrollToY(y) { window.scrollTo({ top: y, behavior: motion ? 'smooth' : 'auto' }); }
  function goNext() {
    var y = window.scrollY, next = stopList().filter(function (s) { return s.y > y + 8; })[0];
    scrollToY(next ? next.y : 0);
  }
  function goPrev() {
    var y = window.scrollY, prev = null;
    stopList().forEach(function (s) { if (s.y < y - 8) prev = s; });
    scrollToY(prev ? prev.y : 0);
  }
  function goChapter(ch) {
    var s = stopList().filter(function (x) { return x.ch === ch; })[0];
    if (s) scrollToY(s.y);
  }

  var chLinks = $$('.chapters__list a'), fill = $('#progress-fill'), nextBtn = $('#next'), nextLabel = $('.chapters__next-label');
  var uiQueued = false;
  function updateUI() {
    uiQueued = false;
    var y = window.scrollY, list = stopList(), cur = list[0];
    list.forEach(function (s) { if (s.y <= y + 12) cur = s; });
    chLinks.forEach(function (a) { a.classList.toggle('is-on', a.dataset.ch === cur.ch); });
    var max = root.scrollHeight - window.innerHeight;
    fill.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    var atEnd = !list.some(function (s) { return s.y > y + 8; });
    nextLabel.textContent = atEnd ? 'Replay' : 'Next';
    if (y > 60) nextBtn.classList.remove('is-hint');
  }
  function queueUI() { if (!uiQueued) { uiQueued = true; requestAnimationFrame(updateUI); } }

  function wireNav() {
    window.addEventListener('scroll', queueUI, { passive: true });
    window.addEventListener('resize', queueUI);
    nextBtn.addEventListener('click', goNext);
    $('#prev').addEventListener('click', goPrev);
    $$('[data-next]').forEach(function (b) { b.addEventListener('click', goNext); });
    chLinks.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); goChapter(a.dataset.ch); });
    });
    $('.hud__logo').addEventListener('click', function (e) { e.preventDefault(); scrollToY(0); });
    document.addEventListener('keydown', function (e) {
      if (quick.open || e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      var onControl = tag === 'button' || tag === 'a' || tag === 'video';
      var k = e.key;
      if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey && !onControl) || k === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey && !onControl) || k === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (k === 'Home') { e.preventDefault(); scrollToY(0); }
      else if (k === 'End') { e.preventDefault(); var l = stopList(); scrollToY(l[l.length - 1].y); }
    });
    updateUI();
  }

  /* ---------- 60-second view ---------- */
  var quick = $('#quick');
  function openQuick() { if (quick.showModal) quick.showModal(); else quick.setAttribute('open', ''); }
  function closeQuick() { if (quick.close) quick.close(); else quick.removeAttribute('open'); }
  $$('[data-quick]').forEach(function (b) { b.addEventListener('click', openQuick); });
  quick.addEventListener('click', function (e) {
    var t = e.target;
    if (t === quick) { closeQuick(); return; }  // click on the backdrop
    var c = t.closest('[data-close]');
    if (!c) return;
    closeQuick();
    if (c.hasAttribute('data-watch') && window.scrollY < window.innerHeight * 0.5) goNext();
  });

  if (!motion) {
    // Plain page: one stop per chapter, at the top of its section.
    chLinks.forEach(function (a) {
      var el = $(a.getAttribute('href'));
      addStop(a.dataset.ch, function () { return absTop(el); });
    });
    wireNav();
    return;
  }

  /* =====================================================================
     Cinematic layer
     ===================================================================== */
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  /* ---------- Opening slate (short; shorter still on a repeat visit) ---------- */
  var slate = $('#slate'), seen = false;
  try { seen = sessionStorage.getItem('slate') === '1'; sessionStorage.setItem('slate', '1'); } catch (e) {}
  root.style.overflow = 'hidden';
  var cnt = { v: 0 }, cntEl = $('#slate-count');
  gsap.timeline({ onComplete: function () { slate.remove(); root.style.overflow = ''; } })
    .to(cnt, { v: 100, duration: seen ? 0.2 : 0.8, ease: 'power2.inOut', onUpdate: function () { cntEl.textContent = String(Math.round(cnt.v)).padStart(2, '0'); } })
    .to('.slate__inner', { opacity: 0, duration: 0.2 })
    .to('.slate__bar--top', { yPercent: -101, duration: 0.8, ease: 'expo.inOut' }, '<')
    .to('.slate__bar--bottom', { yPercent: 101, duration: 0.8, ease: 'expo.inOut' }, '<')
    .from('.hero__frame', { scale: 1.1, clipPath: 'inset(50% 0% 50% 0%)', duration: 1.1, ease: 'expo.out' }, '-=0.45')
    .from('.hero__first', { xPercent: -40, opacity: 0, duration: 1, ease: 'expo.out' }, '<0.05')
    .from('.hero__last', { xPercent: 40, opacity: 0, duration: 1, ease: 'expo.out' }, '<')
    .from('.hero__lower > *, .hud, .chapters', { opacity: 0, y: 16, duration: 0.6, stagger: 0.05, ease: 'power3.out' }, '<0.25');

  addStop('hero', function () { return 0; });

  /* ---------- SCENE 01 · Hero exits (scrubbed; no numbers involved) ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero__first', { xPercent: -35, ease: 'none' }, 0)
    .to('.hero__last', { xPercent: 35, ease: 'none' }, 0)
    .to('.hero__frame', { scale: 1.15, opacity: 0.15, ease: 'none' }, 0)
    .to('.hero__lower', { y: -60, opacity: 0, ease: 'none' }, 0);

  /* ---------- Beat scenes ----------
     A pinned scene with n beats. Beat i sits at scroll fraction i*seg/total;
     a short hold after the last beat lets it breathe before the page moves on. */
  function beatScene(id, ch, n, segVh, render) {
    var hold = 0.6, total = (n - 1 + hold) * segVh, cur = -1;
    var points = [];
    for (var i = 0; i < n; i++) points.push(i * segVh / total);
    points.push(1);
    var st = ST.create({
      trigger: '#' + id, start: 'top top', end: '+=' + total + '%', pin: true,
      snap: { snapTo: points, duration: { min: 0.2, max: 0.5 }, delay: 0.06, ease: 'power2.inOut' },
      onUpdate: function (self) {
        var b = Math.min(n - 1, Math.round(self.progress * total / segVh));
        if (b !== cur) { var prev = cur; cur = b; render(b, prev, false); }
      }
    });
    render(0, -1, true); cur = 0;
    points.slice(0, n).forEach(function (p) {
      addStop(ch, function () { return st.start + (st.end - st.start) * p; });
    });
    return st;
  }

  /* Show subtitle i of a stacked list, hide the rest */
  function showSub(list, i, instant) {
    list.forEach(function (li, k) {
      var on = k === i;
      gsap.to(li, {
        opacity: on ? 1 : 0, y: on ? 0 : (k < i ? -26 : 26), filter: on ? 'blur(0px)' : 'blur(8px)',
        duration: instant ? 0 : (on ? 0.55 : 0.3), delay: on && !instant ? 0.12 : 0, ease: 'power2.out', overwrite: 'auto'
      });
    });
  }
  /* Count a number to an exact target in a fixed time, independent of scrolling */
  function countTo(obj, target, el, decimals, instant, dur) {
    gsap.to(obj, {
      v: target, duration: instant ? 0 : (dur || 0.9), ease: 'power3.out', overwrite: 'auto',
      onUpdate: function () { el.textContent = obj.v.toFixed(decimals); },
      onComplete: function () { el.textContent = target.toFixed(decimals); }
    });
  }

  /* ---------- SCENE 02 · Prologue ---------- */
  (function () {
    var subs = $$('#prologue .subs li'), img = $('#prologue .prologue__media img');
    beatScene('prologue', 'prologue', subs.length, 55, function (i, prev, instant) {
      showSub(subs, i, instant);
      gsap.to(img, { scale: 1.3 - i * 0.08, duration: instant ? 0 : 1.4, ease: 'power2.out', overwrite: 'auto' });
    });
  })();

  /* ---------- SCENE 03 · The climb: 2.67 → 3.78 → 3.89 ---------- */
  (function () {
    var subs = $$('#climb .subs li'), sets = $$('#climb .board__sets li');
    var num = $('#gpa-num'), path = $('.climb__path'), g = { v: 2.67 };
    var vals = [2.67, 3.78, 3.89], cols = ['#5F5C58', '#F2EFE9', '#FF5B1F'], offs = [1 - 0.143, 1 - 0.523, 0];
    num.textContent = '2.67';
    beatScene('climb', 'climb', 3, 60, function (i, prev, instant) {
      showSub(subs, i, instant);
      sets.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      countTo(g, vals[i], num, 2, instant);
      gsap.to(num, { color: cols[i], duration: instant ? 0 : 0.8, overwrite: 'auto' });
      gsap.to(path, { strokeDashoffset: offs[i], duration: instant ? 0 : 1, ease: 'power2.inOut', overwrite: 'auto' });
    });
  })();

  /* ---------- SCENE 04 · SAT Math: 410 → 800 ---------- */
  (function () {
    var subs = $$('#sat .subs li'), num = $('#sat-num'), pct = $('#sat-pct'), date = $('#sat-date');
    var delta = $('#sat-delta'), panel = $('#sat .domains'), domains = $$('#sat .domain'), s = { v: 410 };
    num.textContent = '410';
    domains.forEach(function (d) { d.style.setProperty('--s', getComputedStyle(d).getPropertyValue('--a').trim()); });
    beatScene('sat', 'sat', 4, 60, function (i, prev, instant) {
      var d = instant ? 0 : 1;
      showSub(subs, i, instant);
      var final = i === 3;
      date.textContent = final ? 'June 2026' : 'May 2025';
      pct.textContent = final ? '>99th' : '24th';
      countTo(s, final ? 800 : 410, num, 0, instant, final ? 1.1 : 0.5);
      gsap.to(num, {
        opacity: (i === 1 || i === 2) ? 0.08 : 1,
        color: final ? '#FF5B1F' : '#5F5C58',
        textShadow: final ? '0 0 80px rgba(255,91,31,.45)' : '0 0 0px rgba(255,91,31,0)',
        duration: 0.6 * d, overwrite: 'auto'
      });
      gsap.to(panel, { opacity: (i === 1 || i === 2) ? 1 : 0, duration: 0.45 * d, overwrite: 'auto' });
      domains.forEach(function (el, k) {
        var a = parseFloat(getComputedStyle(el).getPropertyValue('--a'));
        gsap.to(el, { '--s': i >= 2 ? 1 : a, duration: 0.9 * d, delay: i === 2 ? 0.25 + k * 0.1 : 0, ease: 'power2.inOut', overwrite: 'auto' });
      });
      gsap.to(delta, { opacity: final ? 1 : 0, scale: final ? 1 : 2.2, duration: (final ? 0.4 : 0.2) * d, delay: final && !instant ? 0.9 : 0, ease: final ? 'back.out(2)' : 'power1.out', overwrite: 'auto' });
    });
  })();

  /* ---------- SCENE 05 · Two tests, one superscore ---------- */
  (function () {
    var others = $$('#combo .score__row:not(.score__row--best), #combo .score__total');
    var best = $$('#combo .score__row--best'), bestNums = $$('#combo .score__row--best b');
    var sup = $('#combo .super'), supEl = $('#super-num'), sv = { v: 920 };
    supEl.textContent = '1310';
    gsap.from('[data-test="may"]', { xPercent: -40, opacity: 0, rotate: -3, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '#combo', start: 'top 75%' } });
    gsap.from('[data-test="june"]', { xPercent: 40, opacity: 0, rotate: 3, duration: 0.9, delay: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '#combo', start: 'top 75%' } });
    beatScene('combo', 'sat', 3, 60, function (i, prev, instant) {
      var d = instant ? 0 : 1;
      gsap.to(others, { opacity: i >= 1 ? 0.18 : 1, duration: 0.45 * d, overwrite: 'auto' });
      gsap.to(best, { backgroundColor: i >= 1 ? 'rgba(255,91,31,.14)' : 'rgba(255,91,31,0)', duration: 0.45 * d, overwrite: 'auto' });
      gsap.to(bestNums, { scale: i >= 1 ? 1.25 : 1, transformOrigin: 'right center', duration: 0.5 * d, ease: 'back.out(2)', overwrite: 'auto' });
      gsap.to(sup, { opacity: i === 2 ? 1 : 0, y: i === 2 ? 0 : 50, scale: i === 2 ? 1 : 0.9, duration: 0.6 * d, ease: 'power3.out', overwrite: 'auto' });
      if (i === 2 && prev !== 2) { sv.v = 920; countTo(sv, 1310, supEl, 0, instant, 1.1); }
    });
  })();

  /* ---------- SCENE 06 · On camera ---------- */
  gsap.fromTo('.reel__track', { xPercent: 0 }, { xPercent: -40, ease: 'none', scrollTrigger: { trigger: '#oncam', start: 'top bottom', end: 'bottom top', scrub: true } });
  (function () {
    var v = { v: 0 }, el = $('#views');
    el.textContent = '2.5';
    gsap.timeline({ scrollTrigger: { trigger: '#oncam', start: 'top 65%' } })
      .from('.oncam__copy > *', { opacity: 0, y: 40, duration: 0.8, stagger: 0.08, ease: 'power3.out' })
      .fromTo(v, { v: 0 }, { v: 2.5, duration: 1.3, ease: 'power3.out', onUpdate: function () { el.textContent = v.v.toFixed(1); }, onComplete: function () { el.textContent = '2.5'; } }, 0.1)
      .from('.phone', { y: 100, rotate: 5, opacity: 0, duration: 1, ease: 'expo.out' }, 0.1);
    var sec = $('#oncam');
    addStop('oncam', function () { return absTop(sec); });
  })();

  /* ---------- SCENE 07 · Trophy room ---------- */
  var mm = gsap.matchMedia();
  var trophySt = null;
  mm.add('(min-width: 900px)', function () {
    var track = $('.trophies__track');
    var panels = $$('.trophies__track > .panel').length;
    var dist = function () { return track.scrollWidth - window.innerWidth; };
    var slide = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: '.trophies__pin', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.4,
        invalidateOnRefresh: true, snap: { snapTo: 1 / (panels - 2), duration: { min: 0.2, max: 0.5 }, delay: 0.06 }
      }
    });
    trophySt = slide.scrollTrigger;
    gsap.from('.panel--intro > *', { opacity: 0, y: 40, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '#trophies', start: 'top 60%' } });
    $$('.trophy').forEach(function (fig) {
      var box = $('.trophy__img', fig), img = $('img', fig);
      gsap.fromTo(box, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: fig, containerAnimation: slide, start: 'left 100%', end: 'left 60%', scrub: true } });
      gsap.fromTo(img, { scale: 1.4, filter: 'grayscale(1) brightness(.45)' }, { scale: 1, filter: 'grayscale(0) brightness(1)', ease: 'none', scrollTrigger: { trigger: fig, containerAnimation: slide, start: 'left 100%', end: 'left 45%', scrub: true } });
      gsap.from($('.lower3', fig), { xPercent: -25, opacity: 0, ease: 'none', scrollTrigger: { trigger: fig, containerAnimation: slide, start: 'left 75%', end: 'left 50%', scrub: true } });
    });
    return function () { trophySt = null; };
  });
  mm.add('(max-width: 899px)', function () {
    $$('.trophy').forEach(function (fig) {
      var box = $('.trophy__img', fig), img = $('img', fig);
      gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 90%', end: 'top 45%', scrub: true } })
        .fromTo(box, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
        .fromTo(img, { scale: 1.35, filter: 'grayscale(1) brightness(.45)' }, { scale: 1, filter: 'grayscale(0) brightness(1)', ease: 'none' }, 0);
    });
    gsap.from('.panel--intro > *', { opacity: 0, y: 30, stagger: 0.08, duration: 0.7, scrollTrigger: { trigger: '#trophies', start: 'top 70%' } });
  });
  (function () {
    var sec = $('#trophies');
    addStop('trophies', function () { return trophySt ? trophySt.start : absTop(sec); });
    addStop('trophies', function () { return trophySt ? trophySt.start + (trophySt.end - trophySt.start) * 0.5 : absTop(sec) + sec.offsetHeight * 0.45; });
    addStop('trophies', function () { return trophySt ? trophySt.end : absTop(sec) + sec.offsetHeight * 0.75; });
  })();

  /* ---------- SCENE 08 · Character: the quote lights up word by word ---------- */
  (function () {
    var q = $('#quote');
    q.innerHTML = q.textContent.split(' ').map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    gsap.fromTo('#quote .w', { opacity: 0.12 }, { opacity: 1, stagger: 0.06, duration: 0.5, ease: 'power1.out', scrollTrigger: { trigger: '#character', start: 'top 55%' } });
    gsap.from('.beats li', { opacity: 0, y: 40, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.beats', start: 'top 88%' } });
    var sec = $('#character');
    addStop('character', function () { return absTop(sec); });
  })();

  /* ---------- SCENE 09 · Finale: the photo opens to full screen ---------- */
  (function () {
    var ft = gsap.timeline({ scrollTrigger: { trigger: '.finale__pin', start: 'top top', end: '+=100%', pin: true, scrub: 0.4 } })
      .fromTo('.finale__img', { clipPath: 'inset(24% 30% 24% 30%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 })
      .fromTo('.finale__img img', { scale: 1.35 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .fromTo('.finale__text > *', { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.35 }, 0.7)
      .to({}, { duration: 0.25 });
    var st = ft.scrollTrigger;
    addStop('character', function () { return st.end - 4; });
  })();

  /* ---------- End credits ---------- */
  $$('.credits__inner > *, .credits__list > div').forEach(function (el) {
    if (el.classList.contains('credits__list')) return;
    gsap.from(el, { opacity: 0, y: 30, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });
  (function () {
    var sec = $('#credits');
    addStop('credits', function () { return absTop(sec); });
  })();

  /* ---------- HUD scene label ---------- */
  var sceneLabel = $('#hud-scene');
  $$('[data-scene]').forEach(function (el) {
    ST.create({ trigger: el, start: 'top 50%', end: 'bottom 50%', onToggle: function (self) { if (self.isActive) sceneLabel.textContent = el.dataset.scene; } });
  });

  wireNav();
  ST.addEventListener('refresh', queueUI);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  window.addEventListener('load', function () { ST.refresh(); });
})();
