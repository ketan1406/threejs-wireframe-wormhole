import * as THREE from "three";
import spline from "./spline.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// post-processing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.002;
bloomPass.strength = 3.5;
bloomPass.radius = 0;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// create a line geometry from the spline
const points = spline.getPoints(100);
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0x3d85c6 });
const line = new THREE.Line(geometry, material);
// scene.add(line);

// create a tube geometry from the spline
const tubeGeo = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);

// create edges geometry from the spline
const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
const lineMat = new THREE.LineDashedMaterial({ color: 0x3d85c6 });
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);


// Create glowing vertices using a custom shader
const vertexShader = `
varying vec3 vPosition;
void main() {
    vPosition = position; // Pass vertex position to fragment shader
    gl_PointSize = 10.0; // Set size of the point
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uColor;
varying vec3 vPosition;
void main() {
    // Compute the pulsating glow effect
    float glow = sin(uTime + length(vPosition)) * 0.5 + 0.5;
    gl_FragColor = vec4(uColor * glow, 1.0);

    // Smooth edges for the points
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    if (distanceToCenter > 0.5) discard; // Discard pixels outside a circular area
}
`;

// Shader material for the glowing vertices
const pointsMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 }, // Time uniform for animations
    uColor: { value: new THREE.Color(0x8e7cc3) }, // Glow color
  },
  transparent: true,
  blending: THREE.AdditiveBlending, // Additive blending for a glowing effect
});

// Create a Points object with the custom shader
const glowingVertices = new THREE.Points(tubeGeo, pointsMaterial);
scene.add(glowingVertices);

const numBoxes = 55;
const size = 0.075;
const boxGeo = new THREE.BoxGeometry(size, size, size);
for (let i = 0; i < numBoxes; i += 1) {
  const boxMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  const p = (i / numBoxes + Math.random() * 0.1) % 1;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  pos.x += Math.random() - 0.4;
  pos.z += Math.random() - 0.4;
  box.position.copy(pos);
  const rote = new THREE.Vector3(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  box.rotation.set(rote.x, rote.y, rote.z);
  const edges = new THREE.EdgesGeometry(boxGeo, 0.2);
  const color = new THREE.Color().setHSL(0.7 - p, 1, 0.5);
  const lineMat = new THREE.LineBasicMaterial({ color });
  const boxLines = new THREE.LineSegments(edges, lineMat);
  boxLines.position.copy(pos);
  boxLines.rotation.set(rote.x, rote.y, rote.z);
  // scene.add(box);
  scene.add(boxLines);
}

// Create torus knots with glowing effects
const torusKnotGeo = new THREE.TorusKnotGeometry(0.03, 0.01, 50, 8);
const torusKnotMat = new THREE.MeshStandardMaterial({
  color: 0xff69b4,
  emissive: 0xff69b4,
  emissiveIntensity: 1.0,
  roughness: 0.5,
});
for (let i = 0; i < 25; i++) {
  const torusKnot = new THREE.Mesh(torusKnotGeo, torusKnotMat);
  const p = Math.random();
  const pos = tubeGeo.parameters.path.getPointAt(p);
  pos.x += (Math.random() - 0.5) * 2;
  pos.z += (Math.random() - 0.5) * 2;
  torusKnot.position.copy(pos);
  scene.add(torusKnot);
}


function updateCamera(t) {
  const time = t * 0.1;
  const looptime = 10 * 1000;
  const p = (time % looptime) / looptime;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.03) % 1);
  camera.position.copy(pos);
  camera.lookAt(lookAt);
}

function animate(t = 0) {
  requestAnimationFrame(animate);
  updateCamera(t);
  pointsMaterial.uniforms.uTime.value = t * 0.001;
  composer.render(scene, camera);
  controls.update();
}
animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);