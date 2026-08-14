(function() {

  const CONFIG = {
    fogColor: 0x050407,
    ambientLight: 0x1a1025,
    ambientIntensity: 0.6,
    moonColor: 0x8899cc,
    moonIntensity: 1.2,
    candleColor: 0xf5c87a,
    cameraHeight: 3.5,
    cameraZ: 16,
    autoRotateSpeed: 0.0003,
    particleCount: 600,
  };

  const canvas = document.getElementById('three-canvas');
  const scene  = new THREE.Scene();
  scene.fog    = new THREE.FogExp2(CONFIG.fogColor, 0.035);

  /* Alpha: true + setClearColor alpha 0 = transparent canvas */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0); /* fully transparent */

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, CONFIG.cameraHeight, CONFIG.cameraZ);
  camera.lookAt(0, 4, 0);

  function resize() {
    const w = canvas.parentElement.offsetWidth;
    const h = canvas.parentElement.offsetHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── FLOOR ── */
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x18141e, roughness: 0.9, metalness: 0.1,
  transparent: true, opacity: 0,
});
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 20, 20), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ── LIGHTING ── */
  scene.add(new THREE.AmbientLight(CONFIG.ambientLight, CONFIG.ambientIntensity));

  const moon = new THREE.DirectionalLight(CONFIG.moonColor, CONFIG.moonIntensity);
  moon.position.set(-8, 20, 5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near   = 0.5;
  moon.shadow.camera.far    = 60;
  moon.shadow.camera.left   = -20;
  moon.shadow.camera.right  = 20;
  moon.shadow.camera.top    = 20;
  moon.shadow.camera.bottom = -20;
  scene.add(moon);

  const candlePositions = [[-3, 1, -4], [3, 1, -4], [0, 2, -5.5]];
  const candles = [];
  candlePositions.forEach(function([x, y, z]) {
    const light = new THREE.PointLight(CONFIG.candleColor, 1.8, 8);
    light.position.set(x, y, z);
    scene.add(light);
    candles.push({ light, baseY: y, phase: Math.random() * Math.PI * 2 });
  });

  const hellLight = new THREE.PointLight(0x3d1a5c, 0.8, 15);
  hellLight.position.set(0, 0.5, -5);
  scene.add(hellLight);

  /* ── PARTICLES ── */
  const partGeo       = new THREE.BufferGeometry();
  const partPositions = new Float32Array(CONFIG.particleCount * 3);
  for (let i = 0; i < CONFIG.particleCount; i++) {
    partPositions[i * 3]     = (Math.random() - 0.5) * 18;
    partPositions[i * 3 + 1] = Math.random() * 14;
    partPositions[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  partGeo.setAttribute('position', new THREE.BufferAttribute(partPositions, 3));
  const partMat = new THREE.PointsMaterial({
    color: 0xc9a84c, size: 0.04, transparent: true, opacity: 0.4, sizeAttenuation: true,
  });
  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);

  /* ── MOUSE PARALLAX ── */
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  document.addEventListener('mousemove', function(e) {
    targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ── VOLUMETRIC GOD RAYS ─────────────────────────────────
   Shafts of light descending from upper-left (moon position)  */

const rayGroup = new THREE.Group();
scene.add(rayGroup);

const rayMat = new THREE.MeshBasicMaterial({
  color: 0x8899cc,        // matches your moon color
  transparent: true,
  opacity: 0.045,
  side: THREE.DoubleSide,
  depthWrite: false,      // prevents z-fighting with image
});

// Each ray is a long thin cone-like box, angled from upper-left
const rayConfigs = [
  { x: -3,  width: 1.4,  length: 28, rotZ:  0.18 },
  { x: -1,  width: 0.9,  length: 32, rotZ:  0.12 },
  { x:  1,  width: 1.8,  length: 26, rotZ:  0.08 },
  { x:  3,  width: 0.7,  length: 30, rotZ:  0.22 },
  { x:  5,  width: 1.1,  length: 24, rotZ:  0.05 },
  { x: -5,  width: 0.6,  length: 34, rotZ:  0.28 },
];

const rays = [];
rayConfigs.forEach(function(cfg) {
  // Taper the ray using a custom geometry (wide at top, narrow at bottom)
  const geo = new THREE.BufferGeometry();
  const w = cfg.width;
  const l = cfg.length;
  // Two triangles forming a tapered quad
  const verts = new Float32Array([
    -w / 2, 0,      0,
     w / 2, 0,      0,
    -w / 6, -l,     0,
     w / 2, 0,      0,
     w / 6, -l,     0,
    -w / 6, -l,     0,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));

  const mat = rayMat.clone();
  const mesh = new THREE.Mesh(geo, mat);

  // Position: start high up, angle from the moon direction
  mesh.position.set(cfg.x - 4, 18, -2);
  mesh.rotation.z = -cfg.rotZ;
  mesh.rotation.y = 0.3;

  rayGroup.add(mesh);
  rays.push({ mesh, mat, baseOpacity: 0.03 + Math.random() * 0.06, phase: Math.random() * Math.PI * 2 });
});

/* ── AURORA RIBBONS ──────────────────────────────────────
   Undulating sheets of color with golden accents          */

const auroraGroup = new THREE.Group();
scene.add(auroraGroup);

const auroraRibbons = [];

const ribbonConfigs = [
  { color: 0x2d1b69, z: -12, y: 8,  width: 40, opacity: 0.12, speed: 0.18, phase: 0 },
  { color: 0x1a3a5c, z: -15, y: 11, width: 50, opacity: 0.09, speed: 0.13, phase: 1.2 },
  { color: 0xc9a84c, z: -10, y: 6,  width: 30, opacity: 0.06, speed: 0.22, phase: 2.4 },  // gold
  { color: 0x3d1a5c, z: -18, y: 14, width: 55, opacity: 0.08, speed: 0.10, phase: 0.7 },
  { color: 0xb8860b, z: -8,  y: 5,  width: 25, opacity: 0.05, speed: 0.28, phase: 3.1 },  // deep gold
  { color: 0x0d2a4a, z: -20, y: 16, width: 60, opacity: 0.07, speed: 0.08, phase: 1.8 },
];

const RIBBON_SEGMENTS = 40; // horizontal divisions — more = smoother wave

ribbonConfigs.forEach(function(cfg) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array((RIBBON_SEGMENTS + 1) * 2 * 3);
  const uvs       = new Float32Array((RIBBON_SEGMENTS + 1) * 2 * 2);
  const indices   = [];

  // Build a flat ribbon — positions will be deformed each frame in animate()
  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const t = i / RIBBON_SEGMENTS;
    const x = (t - 0.5) * cfg.width;
    // top vertex
    positions[(i * 2)     * 3 + 0] = x;
    positions[(i * 2)     * 3 + 1] = cfg.y + 1.5;
    positions[(i * 2)     * 3 + 2] = cfg.z;
    // bottom vertex
    positions[(i * 2 + 1) * 3 + 0] = x;
    positions[(i * 2 + 1) * 3 + 1] = cfg.y - 1.5;
    positions[(i * 2 + 1) * 3 + 2] = cfg.z;

    uvs[(i * 2)     * 2 + 0] = t; uvs[(i * 2)     * 2 + 1] = 1;
    uvs[(i * 2 + 1) * 2 + 0] = t; uvs[(i * 2 + 1) * 2 + 1] = 0;

    if (i < RIBBON_SEGMENTS) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const mat = new THREE.MeshBasicMaterial({
    color: cfg.color,
    transparent: true,
    opacity: cfg.opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending, // makes overlapping ribbons glow
  });

  const mesh = new THREE.Mesh(geo, mat);
  auroraGroup.add(mesh);

  auroraRibbons.push({
    mesh,
    mat,
    cfg,
    baseOpacity: cfg.opacity,
    phase: cfg.phase,
    speed: cfg.speed,
    baseY: cfg.y,
  });
});

  /* ── ANIMATION LOOP ── */
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.016;

    currentX += (targetX - currentX) * 0.04;
    currentY += (targetY - currentY) * 0.04;

    const orbitAngle = t * CONFIG.autoRotateSpeed * 60;
    camera.position.x = Math.sin(orbitAngle) * 2 + currentX * 1.5;
    camera.position.z = CONFIG.cameraZ + Math.cos(orbitAngle) * 2;
    camera.position.y = CONFIG.cameraHeight - currentY * 0.8;
    camera.lookAt(0, 4, 0);

    candles.forEach(function({ light, baseY, phase }) {
      light.intensity  = 1.5 + Math.sin(t * 8 + phase) * 0.4 + Math.sin(t * 13.7 + phase) * 0.2;
      light.position.y = baseY + Math.sin(t * 6 + phase) * 0.05;
    });

    // God ray pulse — slow breathe in and out
rays.forEach(function(r) {
  r.mat.opacity = r.baseOpacity + Math.sin(t * 0.4 + r.phase) * 0.012;
});

// Aurora ribbon undulation
auroraRibbons.forEach(function(r) {
  const pos = r.mesh.geometry.attributes.position.array;

  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const frac = i / RIBBON_SEGMENTS;
    // Wave: each column of vertices shifts up/down independently
    const wave = Math.sin(frac * 6 + t * r.speed + r.phase) * 1.2
               + Math.sin(frac * 3 + t * r.speed * 0.6 + r.phase + 1) * 0.6;

    // Ribbon thickness also breathes
    const breathe = 1.5 + Math.sin(t * r.speed * 0.5 + r.phase) * 0.4;

    // top vertex
    pos[(i * 2)     * 3 + 1] = r.baseY + wave + breathe;
    // bottom vertex
    pos[(i * 2 + 1) * 3 + 1] = r.baseY + wave - breathe;
  }

  r.mesh.geometry.attributes.position.needsUpdate = true;

  // Opacity drift — ribbons fade in and out slowly
  r.mat.opacity = r.baseOpacity * (0.6 + Math.sin(t * r.speed * 0.4 + r.phase) * 0.4);
});
    const pos = particles.geometry.attributes.position.array;
    for (let i = 0; i < CONFIG.particleCount; i++) {
      pos[i * 3 + 1] += 0.004 + Math.sin(t + i) * 0.002;
      pos[i * 3]     += Math.sin(t * 0.3 + i) * 0.001;
      if (pos[i * 3 + 1] > 14) pos[i * 3 + 1] = 0;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();

})();
