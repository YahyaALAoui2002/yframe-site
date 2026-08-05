import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

gsap.registerPlugin(ScrollTrigger);

/* ---------- shared footprint (used by 3D model + floor plan) ----------
   NEXUS PAVILION — three tapered wings radiating at 120deg from a circular
   central courtyard/atrium (a "pinwheel" plan). Built from 9 points: for
   each wing, two outer tip corners at r_out, joined by a "waist" point at
   r_in shared with the neighboring wing — no gaps, no self-intersection. */
const R_OUT = 11;      // wing tip radius, meters
const R_IN = 3.6;      // waist radius between wings
const R_COURTYARD = 2.8; // circular atrium void radius
const HALF_OUTER_DEG = 26; // half-angle of each wing's tip

function polarPoint(r, deg){
  const rad = deg * Math.PI / 180;
  return [r * Math.cos(rad), r * Math.sin(rad)];
}

const WING_CENTERS_DEG = [90, 210, 330];
const FOOTPRINT = [];
WING_CENTERS_DEG.forEach((deg, i) => {
  const nextDeg = WING_CENTERS_DEG[(i + 1) % 3] + (i === 2 ? 360 : 0);
  const waistDeg = (deg + nextDeg) / 2;
  FOOTPRINT.push(polarPoint(R_OUT, deg - HALF_OUTER_DEG));
  FOOTPRINT.push(polarPoint(R_OUT, deg + HALF_OUTER_DEG));
  FOOTPRINT.push(polarPoint(R_IN, waistDeg));
});

const FLOOR_H = 4.6;
const FLOORS = 1;
const BUILD_H = FLOOR_H * FLOORS;

function smoothstepJS(e0, e1, x){
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

/* walk every edge of FOOTPRINT (including the notch) and place window
   instances directly on the wall, oriented to face outward — avoids the
   bounding-box approximation that left windows floating over the notch */
function computeWindowTransforms(){
  let signedArea = 0;
  for (let i = 0; i < FOOTPRINT.length; i++){
    const [x1, z1] = FOOTPRINT[i];
    const [x2, z2] = FOOTPRINT[(i + 1) % FOOTPRINT.length];
    signedArea += x1 * z2 - x2 * z1;
  }
  const outSign = signedArea > 0 ? 1 : -1;

  const transforms = [];
  const inset = 1.0, spacing = 2.1;
  for (let e = 0; e < FOOTPRINT.length; e++){
    const [x1, z1] = FOOTPRINT[e];
    const [x2, z2] = FOOTPRINT[(e + 1) % FOOTPRINT.length];
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < inset * 2 + 0.5) continue;

    const nx = outSign * (dz / len);
    const nz = outSign * (-dx / len);
    const angle = Math.atan2(nx, nz);
    const usable = len - inset * 2;
    const count = Math.max(1, Math.floor(usable / spacing) + 1);

    for (let i = 0; i < count; i++){
      const t = count === 1 ? 0.5 : i / (count - 1);
      const along = inset + t * usable;
      const px = x1 + (dx / len) * along + nx * 0.04;
      const pz = z1 + (dz / len) * along + nz * 0.04;
      for (let f = 0; f < FLOORS; f++){
        transforms.push({ x: px, y: f * FLOOR_H + FLOOR_H * 0.55, z: pz, angle });
      }
    }
  }
  return transforms;
}

/* full glazing ring around the circular courtyard, facing inward toward
   the reflecting pool */
function computeCourtyardWindowTransforms(){
  const transforms = [];
  const r = R_COURTYARD + 0.04;
  const count = 22;
  for (let i = 0; i < count; i++){
    const theta = (i / count) * Math.PI * 2;
    const x = Math.cos(theta) * r, z = Math.sin(theta) * r;
    const inwardX = -Math.cos(theta), inwardZ = -Math.sin(theta);
    const angle = Math.atan2(inwardX, inwardZ);
    transforms.push({ x, y: FLOOR_H * 0.55, z, angle });
  }
  return transforms;
}

/* ============================================================
   SMOOTH SCROLL + GLOBAL CHROME (nav, progress bar)
   ============================================================ */
function initChrome(){
  const lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 3) });
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const progress = document.getElementById('scroll-progress');
  const nav = document.getElementById('nav');
  lenis.on('scroll', ({ scroll, limit }) => {
    progress.style.width = (limit > 0 ? (scroll / limit) * 100 : 0) + '%';
    nav.classList.toggle('scrolled', scroll > 60);
    ScrollTrigger.update();
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -20 });
    });
  });

  gsap.utils.toArray('.section-label, .section-title').forEach(el => {
    gsap.from(el, {
      opacity: 0, y: 24, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });
}

/* ============================================================
   HERO — terrain that morphs into a building on scroll
   ============================================================ */
function initTerrainHero(){
  const canvas = document.getElementById('terrain-canvas');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.PlaneGeometry(64, 64, 140, 140);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const count = pos.count;
  const heightA = new Float32Array(count);
  const heightB = new Float32Array(count);
  for (let i = 0; i < count; i++){
    const x = pos.getX(i);
    const z = pos.getZ(i);

    let h = 0;
    h += Math.sin(x * 0.12 + z * 0.07) * 3.2;
    h += Math.sin(x * 0.05 - z * 0.15) * 2.1;
    h += Math.cos(x * 0.22 + z * 0.02) * 1.1;
    h += Math.sin(x * 0.4) * Math.cos(z * 0.37) * 0.6;
    heightA[i] = h;

    const mx = 1 - smoothstepJS(7, 8.6, Math.abs(x));
    const mz = 1 - smoothstepJS(5, 6.6, Math.abs(z));
    const mask = mx * mz;
    const raw = mask * 15;
    heightB[i] = Math.floor(raw / FLOOR_H + 0.0001) * FLOOR_H;
  }
  geometry.setAttribute('aHeightA', new THREE.BufferAttribute(heightA, 1));
  geometry.setAttribute('aHeightB', new THREE.BufferAttribute(heightB, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uMorph: { value: 0 } },
    vertexShader: `
      attribute float aHeightA;
      attribute float aHeightB;
      uniform float uMorph;
      varying float vElevation;
      void main(){
        float h = mix(aHeightA, aHeightB, uMorph);
        vec3 p = position;
        p.y = h;
        vElevation = h;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uMorph;
      varying float vElevation;
      void main(){
        vec3 terrainLow = vec3(0.180,0.196,0.150);
        vec3 terrainHigh = vec3(0.663,0.541,0.376);
        vec3 buildLow = vec3(0.106,0.098,0.086);
        vec3 buildHigh = vec3(0.741,0.706,0.635);

        vec3 colLow = mix(terrainLow, buildLow, uMorph);
        vec3 colHigh = mix(terrainHigh, buildHigh, uMorph);
        float t = clamp(vElevation / 15.0, 0.0, 1.0);
        vec3 base = mix(colLow, colHigh, t);

        float freq = mix(5.0, 12.0, uMorph);
        float f = fract(vElevation * freq);
        float d = min(f, 1.0 - f);
        float line = 1.0 - smoothstep(0.0, 0.04, d);
        vec3 lineColor = mix(vec3(0.847,0.616,0.416), vec3(0.97,0.94,0.87), uMorph);

        vec3 color = mix(base, lineColor, line * 0.85);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  camera.position.set(0, 26, 46);
  camera.lookAt(0, 2, 0);

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 0.6,
    onUpdate: self => { material.uniforms.uMorph.value = self.progress; }
  });

  let clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.06) * 5;
    camera.position.y = 26 + Math.sin(t * 0.09) * 1.4;
    camera.lookAt(0, 2, 0);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ============================================================
   "EXPLORE THE STRUCTURE" — interactive model + plan + light
   ============================================================ */
function initStructureScene(){
  const wrap = document.querySelector('.structure-stage');
  const canvas = document.getElementById('model-canvas');
  const hint = document.getElementById('stage-hint');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, wrap.clientWidth / wrap.clientHeight, 0.1, 200);
  camera.position.set(24, 16, 26);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);

  /* ground */
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: 0x5f7a49, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* building volume from shared footprint, with a circular courtyard hole */
  // shape.y maps to world z after the -90deg X rotation below and is negated
  // by that rotation, so feed it -z here to keep the plan and 3D views aligned
  const shape = new THREE.Shape();
  FOOTPRINT.forEach(([x, z], i) => i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z));
  shape.closePath();
  const courtyardHole = new THREE.Path();
  courtyardHole.absarc(0, 0, R_COURTYARD, 0, Math.PI * 2, true);
  shape.holes.push(courtyardHole);

  const extrude = new THREE.ExtrudeGeometry(shape, { depth: BUILD_H, bevelEnabled: false });
  extrude.rotateX(-Math.PI / 2);

  const buildingMat = new THREE.MeshStandardMaterial({ color: 0xcfc7b5, roughness: 0.85, metalness: 0.04 });
  const building = new THREE.Mesh(extrude, buildingMat);
  scene.add(building);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(extrude),
    new THREE.LineBasicMaterial({ color: 0x1c1a16, transparent: true, opacity: 0.35 })
  );
  scene.add(edges);

  /* reflecting pool at the courtyard center */
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(R_COURTYARD * 0.78, 40),
    new THREE.MeshStandardMaterial({ color: 0x11181c, roughness: 0.15, metalness: 0.3 })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.02;
  scene.add(pool);

  /* folded photovoltaic canopy — one tilted cantilevered wedge per wing,
     tapered (narrow at the courtyard, wide at the tip) to actually follow
     the wing's own footprint instead of a fixed-width box overhanging it */
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1c2430, roughness: 0.35, metalness: 0.55 });
  const cantilever = 2.5;
  const innerHalfW = 2.2;
  const outerHalfW = R_OUT * Math.sin(HALF_OUTER_DEG * Math.PI / 180) * 1.08;
  const canopyShape = new THREE.Shape();
  // y here is negative radial distance so that, after the same -90deg X
  // bake-in rotation used elsewhere, local +Z ends up pointing along
  // increasing radius — consistent with the atan2(dirX, dirZ) yaw below
  canopyShape.moveTo(-innerHalfW, -R_IN);
  canopyShape.lineTo(innerHalfW, -R_IN);
  canopyShape.lineTo(outerHalfW, -(R_OUT + cantilever));
  canopyShape.lineTo(-outerHalfW, -(R_OUT + cantilever));
  canopyShape.closePath();
  const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, { depth: 0.16, bevelEnabled: false });
  canopyGeo.rotateX(-Math.PI / 2);

  WING_CENTERS_DEG.forEach(deg => {
    const rad = deg * Math.PI / 180;
    const dirX = Math.cos(rad), dirZ = Math.sin(rad); // matches FOOTPRINT's world x/z mapping
    const panel = new THREE.Mesh(canopyGeo, canopyMat);
    panel.position.set(0, BUILD_H + 0.5, 0);
    panel.rotation.y = Math.atan2(dirX, dirZ);
    panel.rotation.x = THREE.MathUtils.degToRad(-7); // tips lift, don't droop
    scene.add(panel);
  });

  /* window strips walked along the actual pinwheel perimeter (not a bounding
     box), plus a full glazing ring facing into the courtyard */
  const winTransforms = computeWindowTransforms().concat(computeCourtyardWindowTransforms());
  const winGeo = new THREE.BoxGeometry(0.9, 1.1, 0.06);
  const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xffdca0, emissiveIntensity: 0.25, roughness: 0.3 });
  const windows = new THREE.InstancedMesh(winGeo, winMat, winTransforms.length);
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  winTransforms.forEach((wt, idx) => {
    e4.set(0, wt.angle, 0);
    q4.setFromEuler(e4);
    m4.compose(new THREE.Vector3(wt.x, wt.y, wt.z), q4, one);
    windows.setMatrixAt(idx, m4);
  });
  windows.instanceMatrix.needsUpdate = true;
  scene.add(windows);

  /* lighting rig, driven by time-of-day slider */
  const hemi = new THREE.HemisphereLight(0xfff2df, 0x3a362f, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  scene.add(sun);

  const DAWN = new THREE.Color('#ff9d5c');
  const NOON = new THREE.Color('#fff6e8');
  const DUSK = new THREE.Color('#7a5cff');
  const SKY_DAWN = new THREE.Color('#2a1f14');
  const SKY_NOON = new THREE.Color('#151310');
  const SKY_DUSK = new THREE.Color('#160f22');

  function updateTimeOfDay(t){ // t in [0,1]
    const sunColor = t < 0.5 ? DAWN.clone().lerp(NOON, t * 2) : NOON.clone().lerp(DUSK, (t - 0.5) * 2);
    const skyColor = t < 0.5 ? SKY_DAWN.clone().lerp(SKY_NOON, t * 2) : SKY_NOON.clone().lerp(SKY_DUSK, (t - 0.5) * 2);
    sun.color.copy(sunColor);
    scene.background = skyColor;
    renderer.setClearColor(skyColor, 1);

    const elevation = 15 + Math.sin(t * Math.PI) * 55; // degrees
    const azimuth = -110 + t * 220; // degrees, sweeps east->west
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    const r = 40;
    sun.position.setFromSphericalCoords(r, phi, theta);
    sun.intensity = 0.7 + Math.sin(t * Math.PI) * 0.7;
    hemi.intensity = 0.35 + Math.sin(t * Math.PI) * 0.3;

    const readout = document.getElementById('tod-readout');
    readout.textContent = t < 0.33 ? 'Dawn' : t < 0.66 ? 'Noon' : 'Dusk';
  }
  updateTimeOfDay(0.5);

  const slider = document.getElementById('tod-slider');
  slider.addEventListener('input', () => updateTimeOfDay(slider.value / 100));

  /* orbit controls — free rotate + zoom so the model actually feels explorable */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, BUILD_H * 0.4, 0);
  controls.enableZoom = true;
  controls.minDistance = 8;
  controls.maxDistance = 55;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = Math.PI * 0.04;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    hint.style.opacity = '0';
  });

  /* preset camera views */
  const VIEWS = {
    entrance:  { pos: [0, 2.6, 25], target: [0, 2, 3] },
    aerial:    { pos: [0.1, 34, 0.1], target: [0, BUILD_H * 0.3, 0] },
    courtyard: { pos: [0, 3, 0.3], target: [6.15, 2, -9.12] },
    elevation: { pos: [38, 3.2, 0], target: [0, BUILD_H * 0.45, 0] }
  };
  function goToView(key){
    const v = VIEWS[key];
    if (!v) return;
    controls.autoRotate = false;
    hint.style.opacity = '0';
    gsap.to(camera.position, { x: v.pos[0], y: v.pos[1], z: v.pos[2], duration: 1.5, ease: 'power3.inOut' });
    gsap.to(controls.target, { x: v.target[0], y: v.target[1], z: v.target[2], duration: 1.5, ease: 'power3.inOut' });
  }
  const viewPresets = document.getElementById('view-presets');
  viewPresets.addEventListener('click', e => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    viewPresets.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    goToView(btn.dataset.preset);
  });

  function animate(){
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  const ro = new ResizeObserver(() => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  ro.observe(wrap);

  /* ---------- floor plan (SVG) ---------- */
  buildBlueprint();

  const viewToggle = document.getElementById('view-toggle');
  let planDrawn = false;
  viewToggle.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    viewToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const showPlan = btn.dataset.view === 'plan';
    wrap.classList.toggle('plan-active', showPlan);
    document.getElementById('blueprint').classList.toggle('active', showPlan);
    if (showPlan && !planDrawn){
      planDrawn = true;
      animateBlueprintDraw();
    }
  });
}

/* fit FOOTPRINT's bounding box into the viewBox with margin for
   dimension lines/labels, computed from the geometry rather than hardcoded
   so the plan stays correct if the footprint constants ever change */
const BP_MARGIN_X = 100, BP_MARGIN_Y = 90;
const bboxX = FOOTPRINT.map(p => p[0]), bboxZ = FOOTPRINT.map(p => p[1]);
const BP_MIN_X = Math.min(...bboxX), BP_MAX_X = Math.max(...bboxX);
const BP_MIN_Z = Math.min(...bboxZ), BP_MAX_Z = Math.max(...bboxZ);
const BP_SCALE = Math.min(
  (800 - BP_MARGIN_X * 2) / (BP_MAX_X - BP_MIN_X),
  (600 - BP_MARGIN_Y * 2) / (BP_MAX_Z - BP_MIN_Z)
);
const BP_CX = 400, BP_CY = 300;

function svgPoint(x, z){
  return [BP_CX + x * BP_SCALE, BP_CY + z * BP_SCALE];
}

function buildBlueprint(){
  const outline = document.getElementById('bp-outline');
  const rooms = document.getElementById('bp-rooms');
  const labels = document.getElementById('bp-labels');
  const dims = document.getElementById('bp-dims');
  const svgNS = 'http://www.w3.org/2000/svg';

  const pts = FOOTPRINT.map(([x, z]) => svgPoint(x, z));
  const d = 'M ' + pts.map(p => p.join(',')).join(' L ') + ' Z';
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('id', 'bp-outline-path');
  outline.appendChild(path);

  /* circular courtyard + reflecting pool */
  const [ccx, ccy] = svgPoint(0, 0);
  const courtyard = document.createElementNS(svgNS, 'circle');
  courtyard.setAttribute('cx', ccx); courtyard.setAttribute('cy', ccy);
  courtyard.setAttribute('r', R_COURTYARD * BP_SCALE);
  outline.appendChild(courtyard);

  const pool = document.createElementNS(svgNS, 'circle');
  pool.setAttribute('cx', ccx); pool.setAttribute('cy', ccy);
  pool.setAttribute('r', R_COURTYARD * 0.78 * BP_SCALE);
  pool.setAttribute('stroke-dasharray', '2 2');
  rooms.appendChild(pool);

  /* per-wing labels at the wing midpoint */
  const wingNames = ['LIVING WING', 'STUDIO WING', 'REST WING'];
  WING_CENTERS_DEG.forEach((deg, i) => {
    const rad = deg * Math.PI / 180;
    const midR = (R_IN + R_OUT) / 2;
    const [lx, ly] = svgPoint(Math.cos(rad) * midR, Math.sin(rad) * midR);
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', lx); t.setAttribute('y', ly);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('letter-spacing', '1.2');
    t.textContent = wingNames[i];
    labels.appendChild(t);
  });
  const poolLabel = document.createElementNS(svgNS, 'text');
  poolLabel.setAttribute('x', ccx); poolLabel.setAttribute('y', ccy + 4);
  poolLabel.setAttribute('text-anchor', 'middle');
  poolLabel.setAttribute('font-size', '9');
  poolLabel.textContent = 'COURTYARD';
  labels.appendChild(poolLabel);

  /* overall span dimension line, above the plan */
  const [x1, ] = svgPoint(BP_MIN_X, 0), [x2, ] = svgPoint(BP_MAX_X, 0);
  const dimY = BP_CY + BP_MIN_Z * BP_SCALE - 34;
  const dimLine = document.createElementNS(svgNS, 'path');
  dimLine.setAttribute('d', `M ${x1},${dimY} L ${x2},${dimY} M ${x1},${dimY - 8} L ${x1},${dimY + 8} M ${x2},${dimY - 8} L ${x2},${dimY + 8}`);
  dims.appendChild(dimLine);
  const dimText = document.createElementNS(svgNS, 'text');
  dimText.setAttribute('x', (x1 + x2) / 2); dimText.setAttribute('y', dimY - 10);
  dimText.setAttribute('text-anchor', 'middle');
  dimText.setAttribute('stroke', 'none');
  dimText.textContent = `${(BP_MAX_X - BP_MIN_X).toFixed(1)} m span`;
  dims.appendChild(dimText);

  /* north arrow + scale note, fixed in the corner */
  const north = document.createElementNS(svgNS, 'g');
  north.setAttribute('transform', 'translate(730,60)');
  north.innerHTML = `
    <path d="M 0,-18 L 7,10 L 0,4 L -7,10 Z" fill="#c9c2b0" stroke="none"></path>
    <text x="0" y="26" text-anchor="middle" stroke="none" font-size="10" fill="#c9c2b0">N</text>
  `;
  labels.appendChild(north);

  const scaleNote = document.createElementNS(svgNS, 'text');
  scaleNote.setAttribute('x', 730); scaleNote.setAttribute('y', 560);
  scaleNote.setAttribute('text-anchor', 'middle');
  scaleNote.setAttribute('stroke', 'none');
  scaleNote.setAttribute('font-size', '10');
  scaleNote.textContent = 'SCALE 1:200';
  dims.appendChild(scaleNote);
}

function animateBlueprintDraw(){
  const path = document.getElementById('bp-outline-path');
  const len = path.getTotalLength();
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;
  gsap.to(path.style, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' });
  gsap.from('#bp-outline circle', { opacity: 0, duration: 0.8, delay: 1.0, stagger: 0.1 });
  gsap.from('#bp-rooms *', { opacity: 0, duration: 0.8, delay: 0.9, stagger: 0.15 });
  gsap.from('#bp-labels text, #bp-labels g, #bp-dims *', { opacity: 0, duration: 0.6, delay: 1.3, stagger: 0.06 });
}

/* ============================================================
   PROCESS — allow vertical wheel to drive horizontal scroll
   ============================================================ */
function initProcessDrag(){
  const track = document.querySelector('.process-track');
  track.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)){
      track.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
}

/* ---------------------------------------------------------- */
initChrome();
initTerrainHero();
initStructureScene();
initProcessDrag();
