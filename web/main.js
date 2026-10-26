import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const DT = 0.005;
let lab;
let running = false;
let accumulator = 0;
let lastTime = null;
let desktopGrab = null;
let lastReadout = 0;
let frameIntervals = [];
const controllers = [];
const heldBy = new Map();
const releaseAngles = [0, 0];

function showError(error) {
  console.error(error);
  $('error').hidden = false;
  $('error').textContent = error.message || String(error);
}

function checked(result) {
  if (result !== 1) throw new Error('The C++ engine rejected an invalid simulation setting.');
}

try {
  const moduleUrl = new URL(`${import.meta.env.BASE_URL}wasm/pendulum.js`, document.baseURI).href;
  const { default: createModule } = await import(/* @vite-ignore */ moduleUrl);
  lab = await createModule();
  start();
} catch (error) {
  $('engine-status').textContent = 'Simulation could not start';
  showError(error);
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8ede3');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 40);
  camera.position.set(3.1, 2.4, 3.4);
  const controls = new OrbitControls(camera, canvas);
  const desktopPosition = camera.position.clone();
  const desktopTarget = new THREE.Vector3(0, 1.3, -3);
  controls.target.set(0, 1.3, -3);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x879d85, 2.5));
  const light = new THREE.DirectionalLight(0xfff6df, 3);
  light.position.set(-3, 7, 3);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -5;
  light.shadow.camera.right = 5;
  light.shadow.camera.top = 5;
  light.shadow.camera.bottom = -5;
  light.shadow.camera.far = 20;
  scene.add(light);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: '#e8ede3', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(8, 16, '#c9d5c3', '#d9e1d1');
  grid.position.set(0, 0.002, -3);
  scene.add(grid);

  const metal = new THREE.MeshStandardMaterial({ color: '#b9c6b4', roughness: 0.6 });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 0.08), metal);
  beam.position.set(0, 2.55, -3);
  beam.castShadow = true;
  scene.add(beam);
  for (const x of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.55), metal);
    post.position.set(x, 1.275, -3);
    post.castShadow = true;
    scene.add(post);
  }

  const pendulums = ['#377d6e', '#c9865c'].map((color, id) => {
    const pivot = new THREE.Group();
    pivot.position.set(id === 0 ? -0.75 : 0.75, 2.5, -3);
    const arm = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1, 8),
      new THREE.MeshStandardMaterial({ color: '#546253', roughness: 0.7 }));
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 20),
      new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.15 }));
    bob.castShadow = true;
    bob.userData.id = id;
    arm.add(rod, bob);
    pivot.add(arm);
    scene.add(pivot);
    return { pivot, arm, rod, bob, length: id + 1 };
  });

  function panel(width, height, draw) {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const context = surface.getContext('2d');
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width / 300, height / 300),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
    const update = () => { draw(context, width, height); texture.needsUpdate = true; };
    update();
    return { mesh, update };
  }

  const hud = panel(840, 120, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f7f7f2';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#163536';
    ctx.font = '24px sans-serif';
    const a = lab._lab_period(0);
    const b = lab._lab_period(1);
    ctx.fillText('PREDICT → RELEASE → OBSERVE', width / 2, 36);
    ctx.font = '26px sans-serif';
    ctx.fillText(`A: ${format(a)} s     B: ${format(b)} s     B/A: ${format(b / a)}`, width / 2, 83);
  });
  hud.mesh.position.set(0, 2.95, -3);
  scene.add(hud.mesh);

  const resetPanel = panel(240, 75, (ctx, width, height) => {
    ctx.fillStyle = '#183f37';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RESET TRIAL', width / 2, 47);
  });
  resetPanel.mesh.position.set(0, 0.24, -2.4);
  resetPanel.mesh.rotation.x = -0.35;
  resetPanel.mesh.userData.reset = true;
  scene.add(resetPanel.mesh);

  function updateBodies() {
    for (let id = 0; id < 2; id++) {
      const object = pendulums[id];
      object.arm.rotation.z = lab._lab_angle(id);
      object.rod.scale.y = object.length;
      object.rod.position.y = -object.length / 2;
      object.bob.position.y = -object.length;
    }
    scene.updateMatrixWorld(true);
  }

  function setRunning(value) {
    running = value;
    accumulator = 0;
    lastTime = null;
    $('play').textContent = value ? 'Pause' : 'Start';
    $('run-status').textContent = value ? 'Running' : 'Paused';
  }

  function resetTrials() {
    cancelGrabs();
    const length = Number($('length').value);
    const angle = Number($('angle').value);
    const gravity = Number($('gravity').value);
    for (let id = 0; id < 2; id++) {
      pendulums[id].length = length * (id + 1);
      checked(lab._lab_reset(id, pendulums[id].length, gravity, angle));
      releaseAngles[id] = angle * Math.PI / 180;
    }
    $('length-value').value = `${length.toFixed(2)} m`;
    $('angle-value').value = `${angle}°`;
    frameIntervals = [];
    setRunning(false);
    updateBodies();
    updateReadings();
  }

  function updateReadings() {
    const a = lab._lab_period(0);
    const b = lab._lab_period(1);
    for (const [id, name] of [[0, 'a'], [1, 'b']]) {
      const value = lab._lab_period(id);
      const theory = lab._lab_prediction(id);
      $(`period-${name}`).textContent = format(value);
      $(`theory-${name}`).textContent = theory.toFixed(3);
      const count = lab._lab_count(id);
      $(`count-${name}`).textContent = count > 0
        ? `${count} complete periods · ${((value / theory - 1) * 100).toFixed(2)}% above prediction`
        : 'Waiting for a complete period';
    }
    $('ratio').textContent = format(b / a);
    const equalAngles = Math.abs(Math.abs(releaseAngles[0]) - Math.abs(releaseAngles[1])) < 0.00001;
    $('ratio-caption').textContent = !equalAngles
      ? 'Release angles differ. The √2 comparison assumes equal amplitudes.'
      : Number.isFinite(b / a) ? 'A measured result, calculated from the motion.' : 'The first full cycles will tell us.';
    $('sim-time').textContent = `${lab._lab_time(0).toFixed(2)} s`;
    if (frameIntervals.length >= 30) {
      const sorted = [...frameIntervals].sort((x, y) => x - y);
      $('frame-time').textContent = `${sorted[Math.floor(sorted.length * 0.5)].toFixed(1)} / ${sorted[Math.floor((sorted.length - 1) * 0.95)].toFixed(1)} ms`;
    } else $('frame-time').textContent = 'Collecting…';
    hud.update();
  }

  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 3);
  const dragPoint = new THREE.Vector3();
  const rotation = new THREE.Matrix4();
  const targets = [...pendulums.map(item => item.bob), resetPanel.mesh];

  function beginGrab(owner) {
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    if (hit.object.userData.reset) {
      resetTrials();
      setRunning(true);
      return null;
    }
    const id = hit.object.userData.id;
    if (heldBy.has(id)) return null;
    heldBy.set(id, owner);
    checked(lab._lab_hold(id, lab._lab_angle(id)));
    return id;
  }

  function drag(id) {
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      const pivot = pendulums[id].pivot.position;
      const angle = Math.atan2(dragPoint.x - pivot.x, pivot.y - dragPoint.y);
      checked(lab._lab_hold(id, angle));
      releaseAngles[id] = lab._lab_angle(id);
    }
  }

  function release(id) {
    if (id === null || id === undefined) return;
    checked(lab._lab_release(id));
    heldBy.delete(id);
  }

  function cancelGrabs() {
    if (desktopGrab) release(desktopGrab.id);
    desktopGrab = null;
    for (const controller of controllers) {
      release(controller.userData.grab);
      controller.userData.grab = null;
    }
    controls.enabled = !renderer.xr.isPresenting;
  }

  function pointerRay(event) {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    ), camera);
  }

  canvas.addEventListener('pointerdown', event => {
    if (renderer.xr.isPresenting || event.button !== 0 || desktopGrab) return;
    pointerRay(event);
    const id = beginGrab('mouse');
    if (id !== null) {
      desktopGrab = { id, pointer: event.pointerId };
      controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
      drag(id);
      updateBodies();
    }
  });
  canvas.addEventListener('pointermove', event => {
    if (!desktopGrab || event.pointerId !== desktopGrab.pointer) return;
    pointerRay(event);
    drag(desktopGrab.id);
    updateBodies();
  });
  function pointerEnd(event) {
    if (!desktopGrab || event.pointerId !== desktopGrab.pointer) return;
    release(desktopGrab.id);
    desktopGrab = null;
    controls.enabled = true;
    setRunning(true);
  }
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, pointerEnd);

  function controllerRay(controller) {
    controller.updateWorldMatrix(true, false);
    rotation.extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
  }

  for (let index = 0; index < 2; index++) {
    const controller = renderer.xr.getController(index);
    controller.userData.grab = null;
    const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(0, 0, -6),
    ]), new THREE.LineBasicMaterial({ color: '#477e6d' }));
    controller.add(ray);
    controller.addEventListener('selectstart', () => {
      controllerRay(controller);
      controller.userData.grab = beginGrab(controller);
    });
    controller.addEventListener('selectend', () => {
      release(controller.userData.grab);
      controller.userData.grab = null;
      setRunning(true);
    });
    controller.addEventListener('disconnected', () => {
      release(controller.userData.grab);
      controller.userData.grab = null;
    });
    scene.add(controller);
    controllers.push(controller);
  }

  $('play').disabled = false;
  $('reset').disabled = false;
  $('play').addEventListener('click', () => setRunning(!running));
  $('reset').addEventListener('click', resetTrials);
  for (const id of ['length', 'angle', 'gravity']) $(id).addEventListener('input', resetTrials);

  renderer.xr.addEventListener('sessionstart', () => {
    desktopPosition.copy(camera.position);
    desktopTarget.copy(controls.target);
    cancelGrabs();
    controls.enabled = false;
    $('enter-xr').disabled = false;
    $('enter-xr').textContent = 'Exit VR';
    frameIntervals = [];
    setRunning(true);
  });
  renderer.xr.addEventListener('sessionend', () => {
    cancelGrabs();
    controls.enabled = true;
    camera.position.copy(desktopPosition);
    controls.target.copy(desktopTarget);
    controls.update();
    $('enter-xr').disabled = false;
    $('enter-xr').textContent = 'Enter VR';
    frameIntervals = [];
    setRunning(false);
  });

  $('enter-xr').addEventListener('click', async () => {
    $('enter-xr').disabled = true;
    let session;
    try {
      const active = renderer.xr.getSession();
      if (active) await active.end();
      else {
        session = await navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local-floor'] });
        await renderer.xr.setSession(session);
      }
    } catch (error) {
      if (session) await session.end();
      $('xr-status').textContent = `Could not start VR: ${error.message}`;
      console.error(error);
    } finally {
      $('enter-xr').disabled = false;
    }
  });

  async function checkXR() {
    if (!window.isSecureContext) {
      $('enter-xr').textContent = 'VR requires HTTPS';
      $('xr-status').textContent = 'Use HTTPS on a headset, or localhost for desktop development.';
      return;
    }
    if (!navigator.xr) {
      $('enter-xr').textContent = 'Desktop mode';
      $('xr-status').textContent = 'WebXR is unavailable in this browser. The desktop experiment is ready.';
      return;
    }
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      $('enter-xr').disabled = !supported;
      $('enter-xr').textContent = supported ? 'Enter VR' : 'No VR device available';
      $('xr-status').textContent = supported
        ? 'A VR session is available. Floor-level tracking and controller support are needed for interaction.'
        : 'Use a compatible headset browser for immersive VR; desktop mode is ready here.';
    } catch (error) {
      $('enter-xr').textContent = 'VR capability check failed';
      $('xr-status').textContent = error.message;
      console.error(error);
    }
  }

  const observer = new ResizeObserver(() => {
    if (renderer.xr.isPresenting) return;
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  observer.observe(canvas.parentElement);
  document.addEventListener('visibilitychange', () => {
    cancelGrabs();
    lastTime = null;
    accumulator = 0;
    frameIntervals = [];
  });

  resetTrials();
  $('engine-status').textContent = 'C++ / WebAssembly · ready';
  checkXR();
  renderer.setAnimationLoop(time => {
    try {
      const elapsed = lastTime === null ? 0 : Math.max(0, (time - lastTime) / 1000);
      lastTime = time;
      if (!document.hidden) {
        for (const controller of controllers) {
          if (controller.userData.grab !== null) {
            controllerRay(controller);
            drag(controller.userData.grab);
          }
        }
        if (running) {
          if (elapsed > 0) {
            frameIntervals.push(elapsed * 1000);
            if (frameIntervals.length > 600) frameIntervals.shift();
          }
          // Limit catch-up after a stall; physics remains fixed-step, independent of rendering.
          accumulator += Math.min(elapsed, 0.1);
          while (accumulator >= DT) {
            checked(lab._lab_step(DT));
            accumulator -= DT;
          }
        }
      }
      updateBodies();
      if (!renderer.xr.isPresenting) controls.update();
      if (time - lastReadout >= 100) {
        updateReadings();
        lastReadout = time;
      }
      renderer.render(scene, camera);
    } catch (error) {
      renderer.setAnimationLoop(null);
      setRunning(false);
      showError(error);
    }
  });
}

function format(value) { return Number.isFinite(value) ? value.toFixed(3) : '—'; }
