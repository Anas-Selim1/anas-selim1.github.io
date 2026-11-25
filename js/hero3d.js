/* Hero 3D scene: three balls (volleyball, basketball, soccer) orbit Anas's
   portrait inside a field of gold particles. Built with Three.js (MIT). */
import * as THREE from './vendor/three.module.min.js';

const canvas = document.getElementById('hero-canvas');
const orbitCanvas = document.getElementById('orbit-canvas');
const hero = document.querySelector('.hero');
const portrait = document.querySelector('.hero__portrait');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

if (canvas && webglAvailable()) init();

function ballTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  if (kind === 'volley') {
    const cols = ['#F2C230', '#1E3A8A', '#F7F4EC'];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[i % 3];
      g.beginPath();
      g.moveTo(0, i * 43);
      for (let x = 0; x <= 512; x += 8) g.lineTo(x, i * 43 + Math.sin(x / 512 * Math.PI * 4) * 12);
      g.lineTo(512, 256); g.lineTo(0, 256); g.closePath(); g.fill();
    }
  } else if (kind === 'basket') {
    g.fillStyle = '#D9692B'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#2A140A'; g.lineWidth = 5;
    [128, 256, 384, 512].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); });
    g.beginPath(); g.moveTo(0, 128); g.lineTo(512, 128); g.stroke();
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let y = 0; y <= 256; y += 4) {
        const x = 64 + k * 256 + Math.sin(y / 256 * Math.PI) * 52;
        y === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
  } else {
    g.fillStyle = '#F4F4F2'; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#16181D';
    const pent = (cx, cy, r) => {
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
      }
      g.closePath(); g.fill();
    };
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
      pent(col * 102 + (row % 2) * 51 + 26, row * 85 + 42, 22);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  /* Second, transparent layer above the portrait so balls can pass in front of it */
  const renderer2 = new THREE.WebGLRenderer({ canvas: orbitCanvas, antialias: true, alpha: true });
  renderer2.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer2.outputColorSpace = THREE.SRGBColorSpace;
  const front = new THREE.Scene();
  front.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key2 = new THREE.DirectionalLight(0xfff1d6, 1.7); key2.position.set(4, 6, 8); front.add(key2);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 0, 12);

  /* Lights */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff1d6, 1.6); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.PointLight(0xD4A84B, 30, 40); rim.position.set(-6, -2, 6); scene.add(rim);

  /* Background geodesic sphere (faint gold wireframe) */
  const geo = new THREE.IcosahedronGeometry(9, 2);
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0xD4A84B, transparent: true, opacity: 0.07 })
  );
  scene.add(wire);

  /* Particle field */
  const N = window.innerWidth < 700 ? 900 : 1800;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const gold = new THREE.Color(0xE8C77A), ivory = new THREE.Color(0xF5F0E6), blue = new THREE.Color(0x6CC4FF);
  for (let i = 0; i < N; i++) {
    const r = 10 + Math.random() * 30, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph) - 10;
    const c = Math.random() < 0.6 ? gold : (Math.random() < 0.7 ? ivory : blue);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.07, vertexColors: true, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(particles);

  /* Orbit system around the portrait */
  const system = new THREE.Group();
  front.add(system);
  /* Invisible disc where the portrait is: hides the half of each orbit that is behind it */
  const occluder = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshBasicMaterial({ colorWrite: false })
  );
  occluder.renderOrder = -1;
  front.add(occluder);
  const orbits = [
    { kind: 'volley', tilt: [1.15, 0.0, 0.35], speed: 0.42, phase: 0.0, scale: 1.30 },
    { kind: 'basket', tilt: [1.35, 0.0, -0.55], speed: -0.33, phase: 2.1, scale: 1.52 },
    { kind: 'soccer', tilt: [1.0, 0.5, 1.2], speed: 0.27, phase: 4.2, scale: 1.74 }
  ].map(o => {
    const pivot = new THREE.Group();
    pivot.rotation.set(...o.tilt);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.006, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0xD4A84B, transparent: true, opacity: 0.45 })
    );
    pivot.add(ring);
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshStandardMaterial({ map: ballTexture(o.kind), roughness: 0.55, metalness: 0.05 })
    );
    pivot.add(ball);
    system.add(pivot);
    return { ...o, pivot, ring, ball };
  });

  /* Keep the orbits centred on the portrait at any screen size */
  let unitsPerPx = 0.01, portraitR = 1;
  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    renderer2.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    unitsPerPx = visH / h;
    const hr = hero.getBoundingClientRect(), pr = portrait.getBoundingClientRect();
    const cx = pr.left + pr.width / 2 - hr.left, cy = pr.top + pr.height / 2 - hr.top;
    system.position.set((cx - w / 2) * unitsPerPx, -(cy - h / 2) * unitsPerPx, 0);
    portraitR = (pr.width / 2) * unitsPerPx;
    occluder.position.copy(system.position);
    occluder.scale.setScalar(portraitR);
    orbits.forEach(o => {
      const narrow = hero.clientWidth < 700;
      const R = portraitR * (narrow ? 1 + (o.scale - 1) * 0.55 : o.scale);
      o.ring.scale.setScalar(R);
      o.ball.scale.setScalar(Math.max(portraitR * 0.13, 0.14));
      o.R = R;
    });
  }
  layout();
  window.addEventListener('resize', layout);
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(hero);

  /* Pointer parallax */
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  window.addEventListener('pointermove', e => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* Only animate while the hero is on screen */
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  function frame() {
    const t = reduceMotion ? 1.5 : clock.getElapsedTime();
    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;

    orbits.forEach(o => {
      const a = o.phase + t * o.speed;
      o.ball.position.set(Math.cos(a) * o.R, Math.sin(a) * o.R, 0);
      o.ball.rotation.y = t * 1.4;
      o.ball.rotation.x = t * 0.6;
    });
    system.rotation.y = cur.x * 0.25;
    system.rotation.x = cur.y * 0.15;

    wire.rotation.y = t * 0.03 + cur.x * 0.1;
    wire.rotation.x = t * 0.015;
    particles.rotation.y = t * 0.012 + cur.x * 0.06;
    particles.rotation.x = cur.y * 0.04;

    const scrollFade = Math.max(0, 1 - window.scrollY / (hero.clientHeight * 0.9));
    canvas.style.opacity = scrollFade.toFixed(3);
    orbitCanvas.style.opacity = scrollFade.toFixed(3);

    renderer.render(scene, camera);
    renderer2.render(front, camera);
  }

  if (reduceMotion) {
    frame();
    window.addEventListener('resize', () => frame());
  } else {
    renderer.setAnimationLoop(() => { if (visible) frame(); });
  }
}
