import * as THREE from 'https://unpkg.com/three@0.150.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

const envMap = new THREE.CubeTextureLoader().load([
  'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
  'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg'
]);
scene.background = envMap;

const material = new THREE.MeshStandardMaterial({
  metalness: 1,
  roughness: 0,
  envMap: envMap,
});

const geometry = new THREE.SphereGeometry(1, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
const sphere = new THREE.Mesh(geometry, material);
sphere.rotation.x = Math.PI / 2;
scene.add(sphere);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 5, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

camera.position.z = 3;

const originalPositions = geometry.attributes.position.array.slice();

let ripples = [];
const maxRipples = 6;

function addRipple(point) {
  if (ripples.length >= maxRipples) ripples.shift();
  ripples.push({ point, start: performance.now() });
}

function updateRipples() {
  const positions = geometry.attributes.position.array;
  const now = performance.now();
  const vertex = new THREE.Vector3();
  const temp = new THREE.Vector3();

  for (let i = 0; i < positions.length; i += 3) {
    vertex.set(
      originalPositions[i],
      originalPositions[i + 1],
      originalPositions[i + 2]
    );

    let offset = 0;
    for (const ripple of ripples) {
      const age = (now - ripple.start) / 1000;
      if (age > 2.5) continue;
      const dist = vertex.distanceTo(ripple.point);

      const fadeIn = Math.min(age * 8.0, 1.0);
      const fadeOut = Math.exp(-age * 3.0);
      const wave = Math.sin(dist * 60 - age * 25) * Math.exp(-dist * 5);

      offset += wave * 0.01 * fadeIn * fadeOut;
    }

    temp.copy(vertex).normalize().multiplyScalar(offset);
    positions[i] = originalPositions[i] + temp.x;
    positions[i + 1] = originalPositions[i + 1] + temp.y;
    positions[i + 2] = originalPositions[i + 2] + temp.z;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function animate() {
  requestAnimationFrame(animate);
  updateRipples();
  renderer.render(scene, camera);
}
animate();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(sphere);
  if (intersects.length > 0) {
    const worldPoint = intersects[0].point.clone();
    const localPoint = sphere.worldToLocal(worldPoint);
    const normalizedPoint = localPoint.normalize();
    addRipple(normalizedPoint);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
