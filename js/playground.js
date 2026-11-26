/* Serve simulator: drag back from the ball and release to launch it.
   Real projectile physics in metres: an 18 m volleyball court, 2.43 m net, g = 9.81 m/s². */
(function () {
  'use strict';
  var cv = document.getElementById('playground');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var out = {
    speed: document.getElementById('r-speed'),
    angle: document.getElementById('r-angle'),
    peak: document.getElementById('r-peak'),
    reach: document.getElementById('r-reach'),
    result: document.getElementById('r-result')
  };

  var G = 9.81, NET_X = 10, NET_H = 2.43, COURT_END = 19, START = { x: 0.6, y: 2.6 }, MAX_SPEED = 26;
  var W = 0, H = 0, dpr = 1, scale = 1, groundY = 0, originX = 0;
  var ball = { x: START.x, y: START.y, vx: 0, vy: 0, flying: false, spin: 0 };
  var trail = [], drag = null, last = 0, landed = null;

  function resize() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = W / 21;               // 21 m of world across the canvas
    originX = scale * 0.6;
    groundY = H - 46;
    draw();
  }
  var toPx = function (x, y) { return [originX + x * scale, groundY - y * scale]; };

  function predict(vx, vy) {
    var pts = [], x = START.x, y = START.y, t = 0, dt = 0.03;
    while (y > 0 && t < 4) { t += dt; x = START.x + vx * t; y = START.y + vy * t - 0.5 * G * t * t; pts.push([x, y]); }
    return pts;
  }

  function stats(vx, vy) {
    var speed = Math.hypot(vx, vy), angle = Math.atan2(vy, vx) * 180 / Math.PI;
    var flight = (vy + Math.sqrt(vy * vy + 2 * G * START.y)) / G;
    var peak = START.y + Math.max(vy, 0) * Math.max(vy, 0) / (2 * G);
    out.speed.textContent = speed.toFixed(1) + ' m/s';
    out.angle.textContent = angle.toFixed(0) + '°';
    out.peak.textContent = peak.toFixed(2) + ' m';
    out.reach.textContent = (vx * flight).toFixed(1) + ' m';
  }

  function launch(vx, vy) {
    ball = { x: START.x, y: START.y, vx: vx, vy: vy, flying: true, spin: 0 };
    trail = []; landed = null;
    stats(vx, vy);
    out.result.textContent = 'In the air…';
    out.result.classList.remove('win');
    kick();
  }

  function finish(msg, win) {
    ball.flying = false;
    out.result.textContent = msg;
    out.result.classList.toggle('win', !!win);
  }

  function step(dt) {
    if (!ball.flying) return;
    var px = ball.x;
    ball.vy -= G * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.spin += dt * 8;
    trail.push([ball.x, ball.y]); if (trail.length > 70) trail.shift();
    // Net: crossing x = NET_X below the tape
    if (px < NET_X && ball.x >= NET_X && ball.y < NET_H) {
      ball.x = NET_X - 0.12; landed = ball.x;
      return finish('Into the net. Try a higher angle.', false);
    }
    if (ball.y <= 0.11) {
      ball.y = 0.11; landed = ball.x;
      if (ball.x < NET_X) return finish('Short. It landed on your own side.', false);
      if (ball.x <= COURT_END) return finish('In! Clean serve, landed ' + (ball.x - NET_X).toFixed(1) + ' m past the net.', true);
      return finish('Long. Out by ' + (ball.x - COURT_END).toFixed(1) + ' m.', false);
    }
    if (ball.x > 24) { landed = null; finish('Way out. Ease off the power.', false); }
  }

  function drawBall(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#F4F4F5'; ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#A1A1AA'; ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.9, r * 1.1, r * 0.55, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#52525B'; ctx.beginPath(); ctx.ellipse(r * 0.4, r * 0.9, r * 1.1, r * 0.55, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // floor
    var floor = ctx.createLinearGradient(0, groundY, 0, H);
    floor.addColorStop(0, '#18181B'); floor.addColorStop(1, '#0C0C0D');
    ctx.fillStyle = floor; ctx.fillRect(0, groundY, W, H - groundY);
    // court lines and labels
    var a = toPx(1, 0), n = toPx(NET_X, 0), e = toPx(COURT_END, 0);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(n[0], groundY, e[0] - n[0], 6);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a[0], groundY); ctx.lineTo(e[0], groundY); ctx.stroke();
    [a, e].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0], groundY - 6); ctx.lineTo(p[0], groundY + 6); ctx.stroke(); });
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace'; ctx.fillStyle = '#71717A'; ctx.textAlign = 'center';
    ctx.fillText('your side', (a[0] + n[0]) / 2, groundY + 26);
    ctx.fillStyle = '#D4D4D8'; ctx.fillText('target: opponent court (9 m)', (n[0] + e[0]) / 2, groundY + 26);
    // net
    var top = toPx(NET_X, NET_H);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(n[0], groundY); ctx.lineTo(top[0], top[1] - 4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(n[0] - 4, top[1], 8, scale * 1);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(n[0] - 5, top[1] - 3, 10, 4);
    ctx.fillStyle = '#71717A'; ctx.fillText('2.43 m', n[0], top[1] - 12);

    // predicted path while aiming
    if (drag) {
      var p = predict(drag.vx, drag.vy);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      p.forEach(function (q, i) { if (i % 2) return; var s = toPx(q[0], q[1]); ctx.beginPath(); ctx.arc(s[0], s[1], 2.2, 0, Math.PI * 2); ctx.fill(); });
      var b = toPx(START.x, START.y);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(drag.px, drag.py); ctx.stroke(); ctx.setLineDash([]);
    }
    // trail
    trail.forEach(function (q, i) {
      var s = toPx(q[0], q[1]);
      ctx.fillStyle = 'rgba(255,255,255,' + (i / trail.length * 0.5) + ')';
      ctx.beginPath(); ctx.arc(s[0], s[1], 2 + i / trail.length * 3, 0, Math.PI * 2); ctx.fill();
    });
    // landing marker
    if (landed !== null) {
      var m = toPx(landed, 0);
      ctx.strokeStyle = out.result.classList.contains('win') ? '#FFFFFF' : '#71717A'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(m[0], groundY + 2, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // ball
    var bp = drag ? toPx(START.x, START.y) : toPx(ball.x, ball.y);
    drawBall(bp[0], bp[1], Math.max(9, scale * 0.33), ball.spin);
  }

  // Only animate while the ball is flying or being aimed, so the page stays idle otherwise.
  var running = false;
  function loop(t) {
    var dt = Math.min((t - last) / 1000, 0.033); last = t;
    step(dt); draw();
    if (ball.flying || drag) requestAnimationFrame(loop); else running = false;
  }
  function kick() {
    if (running) return;
    running = true;
    requestAnimationFrame(function (t) { last = t; loop(t); });
  }

  // pointer interaction (mouse, touch, pen)
  function local(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener('pointerdown', function (e) {
    cv.setPointerCapture(e.pointerId);
    var p = local(e); drag = { px: p[0], py: p[1], vx: 0, vy: 0 };
    ball = { x: START.x, y: START.y, vx: 0, vy: 0, flying: false, spin: 0 }; trail = []; landed = null;
    cv.classList.add('is-dragging');
    update(p);
    kick();
  });
  function update(p) {
    var b = toPx(START.x, START.y);
    var dx = (b[0] - p[0]) / scale, dy = (p[1] - b[1]) / scale;   // pull back = launch forward
    var k = 2.4, vx = dx * k, vy = dy * k, sp = Math.hypot(vx, vy);
    if (sp > MAX_SPEED) { vx *= MAX_SPEED / sp; vy *= MAX_SPEED / sp; }
    drag.px = p[0]; drag.py = p[1]; drag.vx = Math.max(vx, 0.5); drag.vy = vy;
    stats(drag.vx, drag.vy);
  }
  cv.addEventListener('pointermove', function (e) { if (drag) update(local(e)); });
  function release() {
    if (!drag) return;
    var d = drag; drag = null; cv.classList.remove('is-dragging');
    if (Math.hypot(d.vx, d.vy) < 2) { out.result.textContent = 'Pull back further for more power.'; draw(); return; }
    launch(d.vx, d.vy);
  }
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);

  // keyboard: Enter or Space serves a demo ball
  cv.tabIndex = 0;
  cv.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(12 * Math.cos(Math.PI / 6), 12 * Math.sin(Math.PI / 6)); }
  });

  window.addEventListener('resize', resize);
  resize();

  // demo serve the first time the simulator scrolls into view
  var io = new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) { launch(12 * Math.cos(Math.PI / 6), 12 * Math.sin(Math.PI / 6)); io.disconnect(); }
  }, { threshold: 0.5 });
  io.observe(cv);
})();
