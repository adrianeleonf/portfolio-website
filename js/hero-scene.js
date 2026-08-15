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
    emberCount: 46,
    emberNdcSpread: 0.3,
    emberDepthNear: 3,
    emberDepthFar: -7,
    emberRiseHeight: 9,
    baseFov: 55,
  };

  /* The hero background is a flat photo (native 1920×1080) shown with
     object-fit:cover, while this canvas is a 3D scene rendered at
     whatever aspect ratio the viewport happens to be. Those two crop
     independently by default, so anything positioned in 3D space (the
     embers, the lighting) drifts out of alignment with the photo as
     the aspect ratio changes. Compensating the camera's vertical FOV
     to mirror how "cover" crops the image keeps them roughly locked
     together instead of only matching the one aspect ratio this was
     tuned at. */
  const IMAGE_ASPECT = 1920 / 1080;

  function fovForAspect(aspect) {
    if (aspect <= IMAGE_ASPECT) return CONFIG.baseFov;
    const baseHalfRad = (CONFIG.baseFov * Math.PI / 180) / 2;
    const newHalfRad = Math.atan(Math.tan(baseHalfRad) * IMAGE_ASPECT / aspect);
    return newHalfRad * 2 * 180 / Math.PI;
  }

  const canvas = document.getElementById('three-canvas');
  const scene  = new THREE.Scene();

  /* Three stacked cutouts (far room, statue, near pillars) standing in
     for what used to be one flat photo. The statue stays put as the
     anchor/focal point; the room behind it and the pillars in front of
     it drift opposite each other around it for depth, instead of every
     layer moving and nothing reading as "the" fixed subject. */
  const heroLayers = [
    { el: document.getElementById('hero-layer-bg'),      scale: 1.04, moveX: 8,  moveY: 5, dir: 1  },
    { el: document.getElementById('hero-layer-statue'),  scale: 1.02, moveX: 0,  moveY: 0, dir: -1 },
    { el: document.getElementById('hero-layer-beams'),   scale: 1,    moveX: 8,  moveY: 5, dir: 1  },
    { el: document.getElementById('hero-layer-pillars'), scale: 1.07, moveX: 14, moveY: 8, dir: -1 },
  ];
  scene.fog    = new THREE.FogExp2(CONFIG.fogColor, 0.035);

  /* Alpha: true + setClearColor alpha 0 = transparent canvas */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0); /* fully transparent */

  const camera = new THREE.PerspectiveCamera(CONFIG.baseFov, 1, 0.1, 200);
  camera.position.set(0, CONFIG.cameraHeight, CONFIG.cameraZ);
  camera.lookAt(0, 4, 0);

  function resize() {
    const w = canvas.parentElement.offsetWidth;
    const h = canvas.parentElement.offsetHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = fovForAspect(camera.aspect);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── FLOOR ── invisible (opacity 0, only here to receive shadows), but
     without depthWrite:false it still writes to the depth buffer and
     silently occludes anything behind it — including embers dipping
     below y=0 near the bottom of the screen. */
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x18141e, roughness: 0.9, metalness: 0.1,
  transparent: true, opacity: 0, depthWrite: false,
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

  /* ── EMBERS ── a loose column of warm motes rising from the ground,
     spread across the full width of the scene so they always read as
     "coming from the bottom" regardless of viewport aspect, rather
     than being anchored to specific photo features that drift out of
     alignment across resolutions. Each mote fades in near the ground
     and fades out again before it gets very high — PointsMaterial only
     supports one shared opacity for the whole system, so a small custom
     shader carries a per-particle alpha instead.

     "The bottom" has to mean the bottom edge of the hero viewport, not
     a fixed world-space height — in a perspective camera, a flat plane
     at a fixed Y doesn't project to the same screen position at every
     depth, camera angle or FOV. So each particle's spawn point is found
     by unprojecting the screen's bottom edge at that particle's depth,
     every frame, which keeps it pinned to the true bottom regardless of
     resolution, aspect-ratio FOV compensation, or the camera's own
     parallax/orbit drift. */
  const emberLife  = [];
  const emberSpeed = [];
  const emberNdcX  = [];
  const emberDepth = [];
  const emberSway  = [];
  const emberGeo = new THREE.BufferGeometry();
  const emberPositions = new Float32Array(CONFIG.emberCount * 3);
  const emberAlphas    = new Float32Array(CONFIG.emberCount);
  for (let i = 0; i < CONFIG.emberCount; i++) {
    emberNdcX.push((Math.random() * 2 - 1) * CONFIG.emberNdcSpread);
    emberDepth.push(CONFIG.emberDepthFar + Math.random() * (CONFIG.emberDepthNear - CONFIG.emberDepthFar));
    emberLife.push(Math.random());
    emberSpeed.push(0.00025 + Math.random() * 0.00035);
    emberAlphas[i] = 0;
    emberSway.push({ amp: 0.3 + Math.random() * 0.4, phase: Math.random() * Math.PI * 2, speed: 0.2 + Math.random() * 0.3 });
  }

  const _bottomNear = new THREE.Vector3();
  const _bottomFar  = new THREE.Vector3();
  function bottomEdgeAtDepth(ndcX, z) {
    _bottomNear.set(ndcX, -1, -1).unproject(camera);
    _bottomFar.set(ndcX, -1, 1).unproject(camera);
    const t = (z - _bottomNear.z) / (_bottomFar.z - _bottomNear.z);
    return {
      x: _bottomNear.x + t * (_bottomFar.x - _bottomNear.x),
      y: _bottomNear.y + t * (_bottomFar.y - _bottomNear.y),
    };
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  emberGeo.setAttribute('aAlpha', new THREE.BufferAttribute(emberAlphas, 1));
  const emberMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0xd9a24c) } },
    vertexShader: `
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 60.0 * (1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float edgeFade = smoothstep(0.5, 0.15, d);
        gl_FragColor = vec4(color, vAlpha * edgeFade);
      }
    `,
    transparent: true, depthWrite: false,
  });
  const embers = new THREE.Points(emberGeo, emberMat);
  scene.add(embers);

  /* ── MOUSE PARALLAX ── */
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  document.addEventListener('mousemove', function(e) {
    targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
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
    camera.updateMatrixWorld();

    /* Each photo layer drifts with the mouse at its own rate and, for the
       background, its own direction — the room drifts opposite the
       pillars (rather than just slower in the same direction) to
       exaggerate the sense of the pillars passing in front of it. */
    heroLayers.forEach(function({ el, scale, moveX, moveY, dir }) {
      if (!el) return;
      el.style.transform = 'scale(' + scale + ') translate(' + (dir * currentX * moveX).toFixed(2) + 'px, ' + (dir * currentY * moveY).toFixed(2) + 'px)';
    });

    candles.forEach(function({ light, baseY, phase }) {
      light.intensity  = 1.5 + Math.sin(t * 8 + phase) * 0.4 + Math.sin(t * 13.7 + phase) * 0.2;
      light.position.y = baseY + Math.sin(t * 6 + phase) * 0.05;
    });

    const emberPos   = embers.geometry.attributes.position.array;
    const emberAlpha = embers.geometry.attributes.aAlpha.array;
    const fadeInFrac = 0.12;
    for (let i = 0; i < CONFIG.emberCount; i++) {
      let life = emberLife[i] + emberSpeed[i];
      emberLife[i] = life > 1 ? 0 : life;

      const base = bottomEdgeAtDepth(emberNdcX[i], emberDepth[i]);
      const sway = emberSway[i];
      emberPos[i * 3]     = base.x + Math.sin(t * sway.speed + sway.phase) * sway.amp;
      emberPos[i * 3 + 1] = base.y + life * CONFIG.emberRiseHeight;
      emberPos[i * 3 + 2] = emberDepth[i];

      let alpha;
      if (life < fadeInFrac) {
        alpha = life / fadeInFrac;
      } else {
        alpha = 1 - (life - fadeInFrac) / (1 - fadeInFrac);
      }
      emberAlpha[i] = Math.max(0, Math.min(1, alpha)) * 0.6;
    }
    embers.geometry.attributes.position.needsUpdate = true;
    embers.geometry.attributes.aAlpha.needsUpdate    = true;

    renderer.render(scene, camera);
  }
  animate();

})();
