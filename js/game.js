/* Bichos y Bloques 3D — juego casero de bloques y Pokémon */
(function () {
'use strict';

/* ================= constantes ================= */
const WX = 64, WZ = 64, WY = 30, SEA = 6, CH = 16;
const SAVE = 'bichos-bloques-3d-v1', MAXP = 3, REACH = 8;
const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6, PLANKS: 7, BRICK: 8, WATER: 9, TALL: 10, FLOWR: 11, FLOWY: 12, BED: 13 };
const SOLID = new Uint8Array(16), OPAQUE = new Uint8Array(16), PLANT = new Uint8Array(16);
[1, 2, 3, 4, 5, 6, 7, 8, 13].forEach(i => SOLID[i] = 1);
[1, 2, 3, 4, 5, 7, 8, 13].forEach(i => OPAQUE[i] = 1);
[10, 11, 12].forEach(i => PLANT[i] = 1);
// tile del atlas por bloque: [arriba, costado, abajo]
const TILES = { 1: [0, 1, 2], 2: [2, 2, 2], 3: [3, 3, 3], 4: [4, 4, 4], 5: [6, 5, 6], 6: [7, 7, 7], 7: [8, 8, 8], 8: [9, 9, 9], 10: [11, 11, 11], 11: [12, 12, 12], 12: [13, 13, 13], 13: [14, 14, 14] };
const BLOCKCOL = { 1: ['#5fae3f', '#8b5a2f'], 2: ['#8b5a2f', '#6a4220'], 3: ['#8f8f8f', '#6c6c6c'], 4: ['#e4cf8e', '#c9b26c'], 5: ['#6b4423', '#a8804a'], 6: ['#3f9636', '#24621f'], 7: ['#b8864a', '#7d5629'], 8: ['#9c9c9c', '#646464'], 10: ['#4a9a32', '#9be36b'], 11: ['#e8443a', '#3f8a2b'], 12: ['#ffd23f', '#3f8a2b'] };

const ITEMS = [
  { id: 'madera', name: 'Madera', tile: 8, block: B.PLANKS },
  { id: 'piedra', name: 'Piedra', tile: 9, block: B.BRICK },
  { id: 'tierra', name: 'Tierra', tile: 2, block: B.DIRT },
  { id: 'arena', name: 'Arena', tile: 4, block: B.SAND },
  { id: 'hojas', name: 'Hojas', tile: 7, block: B.LEAVES },
  { id: 'flor', name: 'Flor', tile: 12, block: B.FLOWR },
  { id: 'pasto', name: 'Pasto alto', tile: 11, block: B.TALL }
];
const DROP = { 1: 'tierra', 2: 'tierra', 3: 'piedra', 4: 'arena', 5: 'madera', 6: 'hojas', 7: 'madera', 8: 'piedra', 10: 'pasto', 11: 'flor', 12: 'flor' };

// Pokémon reales: n = número de la Pokédex (las imágenes se cargan de PokeAPI)
// w = qué tan seguido aparece, c = chance de atraparlo, hab = dónde le gusta estar, s = tamaño
const MONS = [
  { id: 'bulbasaur', n: 1, name: 'Bulbasaur', w: 30, c: .75, hab: null, rar: 'Común', tip: 'Vive en el pasto alto', col: '#5fbf8f', emoji: '🌱' },
  { id: 'pikachu', n: 25, name: 'Pikachu', w: 25, c: .65, hab: null, rar: 'Común', tip: 'Corre por toda la isla', col: '#f7d02c', emoji: '⚡' },
  { id: 'charmander', n: 4, name: 'Charmander', w: 18, c: .65, hab: null, rar: 'Común', tip: 'Su llamita se ve entre el pasto', col: '#f08030', emoji: '🔥' },
  { id: 'squirtle', n: 7, name: 'Squirtle', w: 20, c: .65, hab: 'agua', rar: 'Común', tip: 'Le gusta estar cerca del agua', col: '#6390f0', emoji: '💧' },
  { id: 'psyduck', n: 54, name: 'Psyduck', w: 12, c: .6, hab: 'agua', rar: 'Común', tip: 'Se rasca la cabeza en la orilla', col: '#f5d76e', emoji: '🦆' },
  { id: 'geodude', n: 74, name: 'Geodude', w: 15, c: .55, hab: 'piedra', rar: 'Común', tip: 'Se esconde cerca de las piedras', col: '#a8a090', emoji: '🪨' },
  { id: 'butterfree', n: 12, name: 'Butterfree', w: 12, c: .6, hab: 'flor', rar: 'Común', tip: 'Vuela cerca de las flores', col: '#b8a8f0', emoji: '🦋', fly: true },
  { id: 'oddish', n: 43, name: 'Oddish', w: 12, c: .6, hab: 'flor', rar: 'Común', tip: 'Se planta al lado de las flores', col: '#5a7fd0', emoji: '🌿' },
  { id: 'caterpie', n: 10, name: 'Caterpie', w: 15, c: .7, hab: 'arbol', rar: 'Común', tip: 'Come hojas debajo de los árboles', col: '#78c850', emoji: '🐛' },
  { id: 'paras', n: 46, name: 'Paras', w: 10, c: .6, hab: 'arbol', rar: 'Común', tip: 'Aparece a la sombra de los árboles', col: '#e07040', emoji: '🍄' },
  { id: 'eevee', n: 133, name: 'Eevee', w: 5, c: .4, hab: null, rar: 'Raro', tip: 'Muy de vez en cuando pasea por ahí', col: '#c08850', emoji: '🦊' },
  { id: 'onix', n: 95, name: 'Onix', w: 4, c: .4, hab: 'piedra', rar: 'Raro', tip: 'Gigante de piedra, cerca de las rocas', col: '#9a9a9a', emoji: '🐍', s: 2.3 },
  { id: 'snorlax', n: 143, name: 'Snorlax', w: 3, c: .35, hab: null, rar: 'Raro', tip: 'Duerme la siesta en cualquier lado', col: '#3a6a80', emoji: '😴', s: 2 },
  { id: 'mew', n: 151, name: 'Mew', w: 1.5, c: .25, hab: null, rar: 'Rarísimo', tip: 'Casi nadie lo encontró', col: '#f5a8c8', emoji: '✨', fly: true },
  { id: 'rayquaza', n: 384, name: 'Rayquaza negro', w: 1, c: .2, hab: null, rar: 'Rarísimo', tip: 'Un dragón variocolor que vuela muy alto', col: '#2a2a2a', emoji: '🐉', fly: true, shiny: true, s: 2.8 }
];
const MON = Object.fromEntries(MONS.map(m => [m.id, m]));
// partidas guardadas con los bichos viejos: se pasan a su Pokémon parecido
const OLDMON = { brotito: 'bulbasaur', gotin: 'squirtle', piedron: 'geodude', zumbi: 'butterfree', hongui: 'paras', nubi: 'eevee', velin: 'charmander', cristalin: 'mew' };
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const pixelURL = m => SPR + (m.shiny ? 'shiny/' : '') + m.n + '.png';
const artURL = m => SPR + 'other/official-artwork/' + (m.shiny ? 'shiny/' : '') + m.n + '.png';
// <img> con respaldo: si la imagen grande falla prueba la otra, y si no hay internet muestra el emoji
function monImg(m, big) {
  const urls = big ? [artURL(m), pixelURL(m)] : [pixelURL(m), artURL(m)];
  if (m.shiny) urls.push(SPR + (big ? 'other/official-artwork/' : '') + m.n + '.png');
  return '<span class="pk"><img alt="' + m.name + '" src="' + urls[0] + '" data-alt="' + urls.slice(1).join(' ') + '" onerror="monImgFail(this)"><i style="background:' + m.col + '">' + m.emoji + '</i></span>';
}
window.monImgFail = img => {
  const rest = (img.dataset.alt || '').split(' ').filter(Boolean);
  if (rest.length) { img.dataset.alt = rest.slice(1).join(' '); img.src = rest[0]; }
  else img.parentNode.classList.add('fail');
};

/* ================= utilidades ================= */
function rng32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const $ = id => document.getElementById(id);
function angLerp(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }

let ac = null;
function beep(f, d, type, vol) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.value = f; g.gain.value = vol || .05;
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
  } catch (e) { }
}

let toastT;
function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.classList.remove('off'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('off'), ms || 2200); }

/* ================= atlas de texturas ================= */
const atlas = document.createElement('canvas'); atlas.width = atlas.height = 64;
(function paintAtlas() {
  const g = atlas.getContext('2d');
  function tile(i, seed, fn) { const r = rng32(seed); g.save(); g.translate((i % 4) * 16, (i >> 2) * 16); g.beginPath(); g.rect(0, 0, 16, 16); g.clip(); fn(r); g.restore(); }
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  function speck(r, base, cols, n) { g.fillStyle = base; g.fillRect(0, 0, 16, 16); for (let k = 0; k < n; k++) px(Math.floor(r() * 16), Math.floor(r() * 16), cols[Math.floor(r() * cols.length)]); }
  const GR = ['#4f9a33', '#72c44e', '#57a539', '#68b845', '#86d460'];
  tile(0, 1, r => speck(r, '#5fae3f', GR, 120));
  tile(1, 2, r => { speck(r, '#8b5a2f', ['#744a26', '#9c6a3c', '#6a4220', '#a8774a'], 90); for (let x = 0; x < 16; x++) { const h = 3 + Math.floor(r() * 3); for (let y = 0; y < h; y++) px(x, y, GR[Math.floor(r() * GR.length)]); } });
  tile(2, 3, r => speck(r, '#8b5a2f', ['#744a26', '#9c6a3c', '#6a4220', '#a8774a'], 100));
  tile(3, 4, r => { speck(r, '#8f8f8f', ['#7a7a7a', '#a5a5a5', '#6c6c6c', '#999'], 140); g.fillStyle = '#5e5e5e'; g.fillRect(3, 5, 4, 1); g.fillRect(9, 11, 4, 1); g.fillRect(11, 3, 1, 3); g.fillRect(2, 12, 1, 2); });
  tile(4, 5, r => speck(r, '#e4cf8e', ['#d4bd76', '#efdca0', '#c9b26c'], 80));
  tile(5, 6, r => { speck(r, '#6b4423', ['#5a381c', '#7c5230'], 50); g.fillStyle = '#4e3018'; [2, 6, 10, 13].forEach(x => g.fillRect(x, 0, 1, 16)); for (let k = 0; k < 6; k++) px(Math.floor(r() * 16), Math.floor(r() * 16), '#8a6038'); });
  tile(6, 7, r => { g.fillStyle = '#b48a52'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#6b4423'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); g.strokeStyle = '#8f6a3a'; g.lineWidth = 1; [3, 5.5].forEach(k => g.strokeRect(k + .5, k + .5, 15 - 2 * k, 15 - 2 * k)); });
  tile(7, 8, r => { speck(r, '#2f7a2a', ['#3f9636', '#24621f', '#358a30', '#4aa83f'], 150); for (let k = 0; k < 34; k++) g.clearRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1); });
  tile(8, 9, r => { speck(r, '#b8864a', ['#a87a40', '#c6955a', '#b07e44'], 60); g.fillStyle = '#7d5629'; [3, 7, 11, 15].forEach(y => g.fillRect(0, y, 16, 1)); [[5, 0], [12, 4], [3, 8], [10, 12]].forEach(([x, y]) => g.fillRect(x, y, 1, 3)); });
  tile(9, 10, r => { speck(r, '#9c9c9c', ['#888', '#aaa', '#939393'], 60); g.fillStyle = '#646464'; [0, 4, 8, 12].forEach(y => g.fillRect(0, y, 16, 1)); for (let row = 0; row < 4; row++) { const off = row % 2 ? 4 : 0; for (let x = off; x < 16; x += 8) g.fillRect(x, row * 4, 1, 4); } });
  tile(10, 11, r => speck(r, '#3a78d0', ['#3471c6', '#2e64b4', '#4585da', '#6aa6ea'], 60));
  tile(11, 12, r => { g.clearRect(0, 0, 16, 16); for (let k = 0; k < 12; k++) { const x = 1 + Math.floor(r() * 14), h = 7 + Math.floor(r() * 9); g.fillStyle = '#2f6e22'; g.fillRect(x, 16 - h, 1, h); g.fillStyle = '#4a9a32'; if (x < 15) g.fillRect(x + 1, 16 - h + 3, 1, h - 3); g.fillStyle = '#9be36b'; g.fillRect(x, 16 - h, 1, 2); } });
  function flower(c, c2) { g.clearRect(0, 0, 16, 16); g.fillStyle = '#2f7a2a'; g.fillRect(7, 7, 2, 9); g.fillRect(4, 11, 3, 1); g.fillRect(9, 9, 3, 1); g.fillStyle = c; g.fillRect(6, 2, 4, 5); g.fillRect(5, 3, 6, 3); g.fillStyle = c2; g.fillRect(7, 3, 2, 3); }
  tile(12, 13, () => flower('#e8443a', '#ffd23f'));
  tile(13, 14, () => flower('#ffd23f', '#f08a1a'));
  tile(14, 15, r => speck(r, '#3a3a3a', ['#222', '#555', '#2c2c2c'], 140));
})();
const tileCanvas = i => { const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').drawImage(atlas, (i % 4) * 16, (i >> 2) * 16, 16, 16, 0, 0, 16, 16); return c; };

/* ================= three.js ================= */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
const scene = new THREE.Scene();
const FOG = new THREE.Color('#cdeeff');
(function sky() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#4aa8ff'); gr.addColorStop(.55, '#9ad6ff'); gr.addColorStop(1, '#cdeeff');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); scene.background = new THREE.CanvasTexture(c);
})();
scene.fog = new THREE.Fog(FOG, 30, 78);
const camera = new THREE.PerspectiveCamera(62, 1, .1, 200);
scene.add(new THREE.HemisphereLight(0xffffff, 0x7a9a5a, .85));
const sunLight = new THREE.DirectionalLight(0xffffff, .55); sunLight.position.set(4, 10, 6); scene.add(sunLight);

const atlasTex = new THREE.CanvasTexture(atlas);
atlasTex.magFilter = THREE.NearestFilter; atlasTex.minFilter = THREE.NearestFilter; atlasTex.generateMipmaps = false;
const matSolid = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: .5 });
const matPlant = new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, alphaTest: .5, side: THREE.DoubleSide });

// mar
const waterCanvas = tileCanvas(10);
const waterTex = new THREE.CanvasTexture(waterCanvas);
waterTex.magFilter = THREE.NearestFilter; waterTex.minFilter = THREE.NearestFilter; waterTex.generateMipmaps = false;
waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(300, 300);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ map: waterTex, transparent: true, opacity: .78, depthWrite: false }));
sea.rotation.x = -Math.PI / 2; sea.position.set(WX / 2, SEA + .88, WZ / 2); sea.renderOrder = 2; scene.add(sea);
const seabed = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ color: '#c9b26c' }));
seabed.rotation.x = -Math.PI / 2; seabed.position.set(WX / 2, .5, WZ / 2); scene.add(seabed);

// sol cuadrado
const sun = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: '#fff6b0', fog: false }));
scene.add(sun);

// nubes
const clouds = [];
(function () {
  const m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .88 });
  const r = rng32(99);
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(6 + r() * 10, 1.2, 4 + r() * 7), m);
    c.position.set(-40 + r() * 150, 34 + r() * 4, -40 + r() * 150); scene.add(c); clouds.push(c);
  }
})();

/* ================= mundo ================= */
const world = new Uint8Array(WX * WY * WZ);
const idx = (x, y, z) => (y * WZ + z) * WX + x;
function get(x, y, z) {
  if (y < 0) return B.BED;
  if (x < 0 || z < 0 || x >= WX || z >= WZ || y >= WY) return y <= SEA ? B.WATER : B.AIR;
  return world[idx(x, y, z)];
}
function set(x, y, z, v) { if (x < 0 || z < 0 || x >= WX || z >= WZ || y < 0 || y >= WY) return; world[idx(x, y, z)] = v; }

let seed = 1, edits = {};
function noise2(r, cw) {
  const gw = Math.ceil(WX / cw) + 2, gh = Math.ceil(WZ / cw) + 2, g = [];
  for (let i = 0; i < gw * gh; i++) g.push(r());
  const s = t => t * t * (3 - 2 * t);
  return (x, z) => { const fx = x / cw, fz = z / cw, x0 = Math.floor(fx), z0 = Math.floor(fz), u = s(fx - x0), v = s(fz - z0);
    const a = g[z0 * gw + x0], b = g[z0 * gw + x0 + 1], c = g[(z0 + 1) * gw + x0], d = g[(z0 + 1) * gw + x0 + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}
const heights = new Int16Array(WX * WZ);
function generate(sd) {
  world.fill(0);
  const r = rng32(sd), n1 = noise2(r, 18), n2 = noise2(r, 7), n3 = noise2(r, 11), n4 = noise2(r, 6);
  for (let z = 0; z < WZ; z++) for (let x = 0; x < WX; x++) {
    const dx = (x - WX / 2) / (WX / 2), dz = (z - WZ / 2) / (WZ / 2), d = Math.sqrt(dx * dx + dz * dz);
    let h = 5.5 + (.62 * n1(x, z) + .38 * n2(x, z)) * 13;
    h -= Math.max(0, d - .55) / .45 * 11;
    h = clamp(Math.floor(h), 1, WY - 9);
    heights[z * WX + x] = h;
    for (let y = 0; y <= Math.max(h, SEA); y++) {
      let v;
      if (y === 0) v = B.BED;
      else if (y <= h) {
        if (y === h) v = h <= SEA + 1 ? B.SAND : h >= 14 ? B.STONE : B.GRASS;
        else if (y > h - 3) v = h <= SEA + 1 ? B.SAND : h >= 14 ? B.STONE : B.DIRT;
        else v = B.STONE;
      } else v = B.WATER;
      set(x, y, z, v);
    }
  }
  // árboles, pasto y flores
  for (let z = 3; z < WZ - 3; z++) for (let x = 3; x < WX - 3; x++) {
    const h = heights[z * WX + x];
    if (get(x, h, z) !== B.GRASS || get(x, h + 1, z) !== B.AIR) continue;
    const q = r();
    if (q < .03 && n3(x, z) < .6) {
      const th = 4 + Math.floor(r() * 2);
      for (let y = h + 1; y <= h + th; y++) set(x, y, z, B.LOG);
      for (let yy = h + th - 2; yy <= h + th + 1; yy++) {
        const rad = yy >= h + th ? 1 : 2;
        for (let zz = -rad; zz <= rad; zz++) for (let xx = -rad; xx <= rad; xx++) {
          if (rad === 2 && Math.abs(xx) === 2 && Math.abs(zz) === 2 && r() < .6) continue;
          if (yy === h + th + 1 && Math.abs(xx) + Math.abs(zz) > 1) continue;
          if (get(x + xx, yy, z + zz) === B.AIR) set(x + xx, yy, z + zz, B.LEAVES);
        }
      }
    } else if (n4(x, z) > .58 && r() < .8) set(x, h + 1, z, B.TALL);
    else if (r() < .04) set(x, h + 1, z, r() < .5 ? B.FLOWR : B.FLOWY);
    else if (n3(x, z) > .8 && r() < .05) set(x, h + 1, z, B.STONE);
  }
}
function surfaceY(x, z) { // altura de los pies sobre suelo sólido; null si es agua
  x = Math.floor(x); z = Math.floor(z);
  for (let y = WY - 1; y >= 0; y--) { const v = get(x, y, z); if (v === B.WATER) return null; if (SOLID[v]) return y + 1; }
  return 1;
}
function groundBelow(x, y, z) { // primer piso (sólido o agua) bajo una posición
  x = Math.floor(x); z = Math.floor(z);
  for (let yy = Math.floor(y); yy >= Math.max(0, Math.floor(y) - 6); yy--) { const v = get(x, yy, z); if (SOLID[v]) return yy + 1; if (v === B.WATER) return SEA + .9; }
  return null;
}

/* ================= mallas por chunk ================= */
const FACES = [
  { n: [-1, 0, 0], c: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]], uv: [[0, 1], [0, 0], [1, 1], [1, 0]], s: .78, t: 1 },
  { n: [1, 0, 0], c: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]], uv: [[0, 1], [0, 0], [1, 1], [1, 0]], s: .82, t: 1 },
  { n: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]], uv: [[1, 0], [0, 0], [1, 1], [0, 1]], s: .55, t: 2 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]], uv: [[1, 1], [0, 1], [1, 0], [0, 0]], s: 1, t: 0 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]], uv: [[0, 0], [1, 0], [0, 1], [1, 1]], s: .68, t: 1 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], uv: [[0, 0], [1, 0], [0, 1], [1, 1]], s: .9, t: 1 }
];
FACES.forEach(f => { f.ax = [0, 1, 2].filter(a => f.n[a] === 0); });
const AOF = [.42, .62, .8, 1];
const UVE = .002;
function uvOf(tile, u, v) { const tx = tile % 4, ty = tile >> 2; return [(tx + UVE + u * (1 - 2 * UVE)) / 4, (3 - ty + UVE + v * (1 - 2 * UVE)) / 4]; }
const chunks = {};
function buildChunk(cx, cz) {
  const P = [], U = [], C = [], I = [], pP = [], pU = [], pC = [], pI = [];
  const o1 = [0, 0, 0], o2 = [0, 0, 0];
  for (let y = 0; y < WY; y++) for (let z = cz * CH; z < cz * CH + CH; z++) for (let x = cx * CH; x < cx * CH + CH; x++) {
    const v = world[idx(x, y, z)];
    if (!v || v === B.WATER) continue;
    if (PLANT[v]) {
      const t = TILES[v][1], base = pP.length / 3, hh = v === B.TALL ? .9 : .85;
      const q = [[.15, 0, .15], [.85, 0, .85], [.15, hh, .15], [.85, hh, .85], [.85, 0, .15], [.15, 0, .85], [.85, hh, .15], [.15, hh, .85]];
      const quv = [[0, 0], [1, 0], [0, 1], [1, 1]];
      for (let k = 0; k < 8; k++) { pP.push(x + q[k][0], y + q[k][1], z + q[k][2]); const uv = uvOf(t, quv[k % 4][0], quv[k % 4][1]); pU.push(uv[0], uv[1]); const s = k % 4 < 2 ? .78 : 1; pC.push(s, s, s); }
      pI.push(base, base + 1, base + 2, base + 2, base + 1, base + 3, base + 4, base + 5, base + 6, base + 6, base + 5, base + 7);
      continue;
    }
    const tiles = TILES[v];
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi], nb = get(x + f.n[0], y + f.n[1], z + f.n[2]);
      if (OPAQUE[nb] || (v === B.LEAVES && nb === B.LEAVES)) continue;
      if (fi === 2 && y === 0) continue;
      const base = P.length / 3, ao = [0, 0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const c = f.c[k];
        o1[0] = o1[1] = o1[2] = 0; o2[0] = o2[1] = o2[2] = 0;
        o1[f.ax[0]] = c[f.ax[0]] ? 1 : -1; o2[f.ax[1]] = c[f.ax[1]] ? 1 : -1;
        const bx = x + f.n[0], by = y + f.n[1], bz = z + f.n[2];
        const s1 = SOLID[get(bx + o1[0], by + o1[1], bz + o1[2])], s2 = SOLID[get(bx + o2[0], by + o2[1], bz + o2[2])];
        const cc = SOLID[get(bx + o1[0] + o2[0], by + o1[1] + o2[1], bz + o1[2] + o2[2])];
        ao[k] = s1 && s2 ? 0 : 3 - s1 - s2 - cc;
        P.push(x + c[0], y + c[1], z + c[2]);
        const uv = uvOf(tiles[f.t], f.uv[k][0], f.uv[k][1]); U.push(uv[0], uv[1]);
        const b = f.s * AOF[ao[k]]; C.push(b, b, b);
      }
      if (ao[0] + ao[3] > ao[1] + ao[2]) I.push(base, base + 1, base + 3, base, base + 3, base + 2);
      else I.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  const key = cx + ',' + cz, old = chunks[key];
  if (old) { old.forEach(m => { scene.remove(m); m.geometry.dispose(); }); }
  const meshes = [];
  function mk(Pa, Ua, Ca, Ia, mat) {
    if (!Ia.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(Pa, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(Ua, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(Ca, 3));
    g.setIndex(Ia); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); scene.add(m); meshes.push(m);
  }
  mk(P, U, C, I, matSolid); mk(pP, pU, pC, pI, matPlant);
  chunks[key] = meshes;
}
function buildAll() { for (let cz = 0; cz < WZ / CH; cz++) for (let cx = 0; cx < WX / CH; cx++) buildChunk(cx, cz); }
function rebuildAround(x, z) {
  const s = new Set();
  for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= WX || zz >= WZ) continue; s.add(Math.floor(xx / CH) + ',' + Math.floor(zz / CH)); }
  s.forEach(k => { const [a, b] = k.split(',').map(Number); buildChunk(a, b); });
}

/* ================= modelos ================= */
const BOX = new THREE.BoxGeometry(1, 1, 1);
const matCache = {};
function mat(col, opts) { const k = col + (opts ? JSON.stringify(opts) : ''); return matCache[k] || (matCache[k] = new THREE.MeshLambertMaterial(Object.assign({ color: col }, opts || {}))); }
function bx(p, w, h, d, col, x, y, z, opts) { const m = new THREE.Mesh(BOX, mat(col, opts)); m.scale.set(w, h, d); m.position.set(x, y, z); p.add(m); return m; }
function eyes(p, y, z, sep, s) {
  [-1, 1].forEach(k => { bx(p, s, s * 1.15, .04, '#141414', k * sep, y, z); bx(p, s * .38, s * .38, .02, '#ffffff', k * sep - s * .18, y + s * .22, z + .025); });
}
// sprite pixelado de cada Pokémon (una textura compartida por especie)
const spriteTex = {};
function monTexture(m) {
  let t = spriteTex[m.id];
  if (t) return t;
  t = spriteTex[m.id] = { ok: null, mat: null, wait: [] };
  const urls = [pixelURL(m)]; if (m.shiny) urls.push(SPR + m.n + '.png');
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  (function tryLoad(i) {
    loader.load(urls[i], tex => {
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; // estilo Minecraft
      t.mat = new THREE.SpriteMaterial({ map: tex, alphaTest: .5 }); t.ok = true;
      t.wait.splice(0).forEach(f => f());
    }, undefined, () => { if (i + 1 < urls.length) tryLoad(i + 1); else { t.ok = false; t.wait.length = 0; } });
  })(0);
  return t;
}
// respaldo si la imagen no carga: un bloquecito del color del Pokémon con ojitos
function fallbackMon(p, m) {
  const g = new THREE.Group(); p.add(g);
  bx(g, .62, .56, .62, m.col, 0, .28, 0); bx(g, .64, .08, .64, '#00000033', 0, .04, 0);
  eyes(g, .36, .315, .13, .1); bx(g, .14, .05, .03, '#4a2a2a', 0, .2, .315);
  bx(g, .1, .06, .03, '#ff9db0', -.21, .27, .315); bx(g, .1, .06, .03, '#ff9db0', .21, .27, .315);
  return g;
}
function makeMon(id) {
  const m = MON[id], g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const fb = fallbackMon(body, m), t = monTexture(m), sz = m.s || 1.5;
  function show() {
    const sp = new THREE.Sprite(t.mat); sp.center.set(.5, .12); sp.scale.set(sz, sz, 1);
    sp.userData.creature = g.userData.creature; body.add(sp); fb.visible = false;
  }
  if (t.ok) show(); else if (t.ok === null) t.wait.push(show);
  g.userData.parts = {}; g.userData.body = body;
  return g;
}
function makePlayer() {
  const g = new THREE.Group(), r = {};
  const SK = '#f0b989', HO = '#f07a2a', HO2 = '#c85c18', PA = '#3f7d3a', SH = '#2b2b2b', HA = '#22201e';
  r.legL = new THREE.Group(); r.legL.position.set(-.13, .62, 0); g.add(r.legL); bx(r.legL, .24, .5, .26, PA, 0, -.25, 0); bx(r.legL, .25, .13, .3, SH, 0, -.56, .02);
  r.legR = new THREE.Group(); r.legR.position.set(.13, .62, 0); g.add(r.legR); bx(r.legR, .24, .5, .26, PA, 0, -.25, 0); bx(r.legR, .25, .13, .3, SH, 0, -.56, .02);
  bx(g, .54, .62, .3, HO, 0, .93, 0); bx(g, .3, .14, .02, HO2, 0, .8, .155); bx(g, .56, .08, .32, HO2, 0, .64, 0);
  r.armL = new THREE.Group(); r.armL.position.set(-.37, 1.18, 0); g.add(r.armL); bx(r.armL, .2, .48, .22, HO, 0, -.22, 0); bx(r.armL, .18, .14, .2, SK, 0, -.52, 0);
  r.armR = new THREE.Group(); r.armR.position.set(.37, 1.18, 0); g.add(r.armR); bx(r.armR, .2, .48, .22, HO, 0, -.22, 0); bx(r.armR, .18, .14, .2, SK, 0, -.52, 0);
  r.head = new THREE.Group(); r.head.position.set(0, 1.24, 0); g.add(r.head);
  bx(r.head, .5, .48, .48, SK, 0, .24, 0); bx(r.head, .54, .14, .52, HA, 0, .48, 0); bx(r.head, .54, .3, .12, HA, 0, .34, -.21);
  bx(r.head, .1, .16, .5, HA, -.23, .36, -.01); bx(r.head, .1, .16, .5, HA, .23, .36, -.01); bx(r.head, .22, .07, .04, HA, -.08, .41, .24);
  [-1, 1].forEach(k => { bx(r.head, .08, .1, .02, '#1b1b1b', k * .11, .25, .245); bx(r.head, .03, .03, .01, '#ffffff', k * .11 - .02, .28, .256); });
  bx(r.head, .12, .04, .02, '#b0604a', 0, .13, .245);
  g.userData.rig = r; return g;
}
function makeCube() {
  const g = new THREE.Group();
  bx(g, .4, .4, .4, '#b8864a'); bx(g, .42, .06, .42, '#6b4423', 0, .17, 0); bx(g, .42, .06, .42, '#6b4423', 0, -.17, 0);
  [[0, 0, .21], [0, 0, -.21], [.21, 0, 0], [-.21, 0, 0], [0, .21, 0]].forEach(p => bx(g, p[0] ? .02 : .12, p[1] ? .02 : .12, p[2] ? .02 : .12, '#f2b233', p[0], p[1], p[2], { emissive: '#704800' }));
  return g;
}

// sombras redondas
const shadowTex = (function () { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
const shadowGeo = new THREE.PlaneGeometry(1, 1);
function makeShadow(size) { const m = new THREE.Mesh(shadowGeo, shadowMat); m.rotation.x = -Math.PI / 2; m.scale.set(size, size, 1); m.renderOrder = 1; scene.add(m); return m; }
function placeShadow(sh, p, size) { const gy = groundBelow(p.x, p.y + .2, p.z); if (gy === null) { sh.visible = false; return; } sh.visible = true; const d = clamp(1 - (p.y - gy) / 5, .3, 1); sh.position.set(p.x, gy + .03, p.z); sh.scale.set(size * d, size * d, 1); }

/* ================= física ================= */
function collides(b, x, y, z) {
  if (x - b.hw < .05 || z - b.hw < .05 || x + b.hw > WX - .05 || z + b.hw > WZ - .05) return true;
  const x0 = Math.floor(x - b.hw), x1 = Math.floor(x + b.hw), z0 = Math.floor(z - b.hw), z1 = Math.floor(z + b.hw), y0 = Math.floor(y), y1 = Math.floor(y + b.h - .001);
  for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (SOLID[get(xx, yy, zz)]) return true;
  return false;
}
function moveBody(b, dt) {
  const steps = Math.ceil(dt / .02), h = dt / steps;
  b.hit = false;
  for (let s = 0; s < steps; s++) {
    b.inWater = b.p.y + .3 < SEA + .9;
    if (b.fly) { /* vuelo: velocidad vertical la maneja la IA */ }
    else { b.v.y -= (b.inWater ? 7 : 26) * h; if (b.inWater && b.v.y < -2.5) b.v.y = -2.5; if (b.v.y < -28) b.v.y = -28; }
    const vx = b.v.x, vz = b.v.z;
    let nx = b.p.x + vx * h;
    if (!collides(b, nx, b.p.y, b.p.z)) b.p.x = nx; else { b.hit = true; b.v.x = 0; }
    let nz = b.p.z + vz * h;
    if (!collides(b, b.p.x, b.p.y, nz)) b.p.z = nz; else { b.hit = true; b.v.z = 0; }
    if (b.hit && b.autoJump && (b.ground || b.inWater) && (vx || vz)) {
      const l = Math.hypot(vx, vz) || 1, tx = b.p.x + vx / l * .35, tz = b.p.z + vz / l * .35;
      if (!collides(b, tx, b.p.y + 1.05, tz) && !collides(b, b.p.x, b.p.y + 1.05, b.p.z)) { b.v.y = b.inWater ? 6 : b.jumpV; b.ground = false; }
    }
    const ny = b.p.y + b.v.y * h;
    if (!collides(b, b.p.x, ny, b.p.z)) { b.p.y = ny; b.ground = false; }
    else { if (b.v.y < 0) { const fy = Math.floor(ny) + 1; if (!collides(b, b.p.x, fy, b.p.z)) b.p.y = fy; b.ground = true; } b.v.y = 0; }
  }
  if (b.p.y < -5) { b.p.y = (surfaceY(b.p.x, b.p.z) || SEA + 1) + .5; b.v.set(0, 0, 0); }
}
const newBody = (hw, h) => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), hw, h, ground: false, autoJump: true, jumpV: 8.6, inWater: false, hit: false });

/* ================= estado del juego ================= */
let inv, cubes, dex, party, sel = 0, mode = 'break', running = false;
const player = { body: newBody(.3, 1.7), model: makePlayer(), yaw: 0, phase: 0 };
scene.add(player.model); player.shadow = makeShadow(.9);
let camYaw = Math.PI * .75, camPitch = .42, camDist = 7, camDistCur = 7;
const followers = [], wild = [];

function freshState() { inv = { madera: 2, piedra: 2, tierra: 0, arena: 0, hojas: 0, flor: 0, pasto: 0 }; cubes = 5; dex = {}; party = []; edits = {}; }
function findSpawn() {
  for (let rad = 0; rad < 30; rad++) for (let k = 0; k < 40; k++) {
    const a = k / 40 * Math.PI * 2, x = Math.floor(WX / 2 + Math.cos(a) * rad), z = Math.floor(WZ / 2 + Math.sin(a) * rad);
    const y = surfaceY(x, z); if (y && y > SEA + 1 && get(x, y - 1, z) === B.GRASS && !collides(player.body, x + .5, y, z + .5)) return [x, y, z];
  }
  return [WX / 2, 20, WZ / 2];
}
function newWorld() {
  seed = (Math.random() * 1e9) | 0; freshState(); generate(seed);
  const [x, y, z] = findSpawn();
  // un poco de pasto alto cerca para empezar
  for (let dz = -2; dz <= 2; dz++) for (let dx = 3; dx <= 6; dx++) { const sy = surfaceY(x + dx, z + dz); if (sy && get(x + dx, sy - 1, z + dz) === B.GRASS && get(x + dx, sy, z + dz) === B.AIR) { set(x + dx, sy, z + dz, B.TALL); edits[idx(x + dx, sy, z + dz)] = B.TALL; } }
  player.body.p.set(x + .5, y, z + .5); player.body.v.set(0, 0, 0);
}
function save() {
  try { localStorage.setItem(SAVE, JSON.stringify({ seed, edits, p: player.body.p.toArray(), inv, cubes, dex, party })); } catch (e) { }
}
let saveT = null; function saveSoon() { clearTimeout(saveT); saveT = setTimeout(save, 600); }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE)); if (!s || !s.seed) return false;
    seed = s.seed; generate(seed); edits = s.edits || {};
    for (const k in edits) world[+k] = edits[k];
    inv = Object.assign({ madera: 0, piedra: 0, tierra: 0, arena: 0, hojas: 0, flor: 0, pasto: 0 }, s.inv); cubes = s.cubes | 0; dex = {};
    for (const k in s.dex || {}) { const id = MON[k] ? k : OLDMON[k]; if (id) dex[id] = (dex[id] || 0) + s.dex[k]; }
    party = [...new Set((s.party || []).map(id => MON[id] ? id : OLDMON[id]))].filter(id => dex[id] && MON[id]).slice(0, MAXP);
    player.body.p.fromArray(s.p); if (collides(player.body, player.body.p.x, player.body.p.y, player.body.p.z)) { const [x, y, z] = findSpawn(); player.body.p.set(x + .5, y, z + .5); }
    return true;
  } catch (e) { return false; }
}
function setBlock(x, y, z, v) { set(x, y, z, v); edits[idx(x, y, z)] = v; rebuildAround(x, z); saveSoon(); }

/* ================= Pokémon ================= */
function makeCreature(id, x, y, z) {
  const m = MON[id], c = { id, mon: m, model: makeMon(id), body: newBody(.28, .75), t: Math.random() * 3, dir: new THREE.Vector3(), yaw: Math.random() * 6, hop: 0, state: 'wander', alive: true };
  c.body.p.set(x, y, z); c.body.fly = !!m.fly; c.home = new THREE.Vector3(x, y, z); c.body.jumpV = 7.5;
  c.model.userData.creature = c; c.model.traverse(o => { o.userData.creature = c; });
  c.model.position.copy(c.body.p); scene.add(c.model); c.shadow = makeShadow(.8);
  return c;
}
function removeCreature(c) { c.alive = false; scene.remove(c.model); scene.remove(c.shadow); }
function nearType(x, y, z, kind) {
  for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) for (let dy = -2; dy <= 4; dy++) {
    const v = get(x + dx, y + dy, z + dz);
    if (kind === 'agua' && v === B.WATER) return true;
    if (kind === 'piedra' && (v === B.STONE || v === B.BRICK)) return true;
    if (kind === 'flor' && (v === B.FLOWR || v === B.FLOWY)) return true;
    if (kind === 'arbol' && (v === B.LOG || v === B.LEAVES)) return true;
  }
  return false;
}
function pickSpecies(x, y, z) {
  const ws = MONS.map(m => m.hab ? m.w * (nearType(x, y, z, m.hab) ? 3 : .25) : m.w);
  let s = ws.reduce((a, b) => a + b), r = Math.random() * s;
  for (let i = 0; i < MONS.length; i++) { r -= ws[i]; if (r <= 0) return MONS[i].id; }
  return 'bulbasaur';
}
function spawnWild() {
  const p = player.body.p;
  let best = null;
  for (let k = 0; k < 16; k++) {
    const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * 20, x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
    if (x < 2 || z < 2 || x >= WX - 2 || z >= WZ - 2) continue;
    const y = surfaceY(x, z); if (!y || y <= SEA) continue;
    const top = get(x, y, z), under = get(x, y - 1, z);
    if (under !== B.GRASS && under !== B.SAND && under !== B.DIRT) continue;
    if (SOLID[get(x, y + 1, z)]) continue;
    best = [x, y, z]; if (top === B.TALL) break;
  }
  if (!best) return;
  const [x, y, z] = best; const id = pickSpecies(x, y, z);
  wild.push(makeCreature(id, x + .5, y + (MON[id].fly ? 1 : 0), z + .5));
}
function animateCreature(c, dt, now, moving) {
  const parts = c.model.userData.parts, body = c.model.userData.body;
  c.yaw = angLerp(c.yaw, c.targetYaw === undefined ? c.yaw : c.targetYaw, Math.min(1, dt * 8));
  c.model.rotation.y = c.yaw; c.model.position.copy(c.body.p);
  const sq = c.body.ground && !c.body.fly ? Math.max(0, Math.sin(now * .012 + c.t)) * (moving ? .08 : .03) : 0;
  body.scale.set(1 + sq * .5, 1 - sq, 1 + sq * .5);
  if (c.body.fly) body.position.y = Math.sin(now * .004 + c.t) * .08;
  if (parts.wingL) { const f = Math.sin(now * .05) * .6; parts.wingL.rotation.z = f; parts.wingR.rotation.z = -f; }
  if (parts.flame) { const f = 1 + Math.sin(now * .03 + c.t) * .15; parts.flame.scale.set(1 / f, f, 1 / f); }
  if (parts.leafA) { parts.leafA.rotation.z = .5 + Math.sin(now * .006 + c.t) * .15; parts.leafB.rotation.z = -.5 - Math.sin(now * .006 + c.t) * .15; }
  placeShadow(c.shadow, c.body.p, .8);
}
function flyHover(c, dt) {
  const gy = groundBelow(c.body.p.x, c.body.p.y + .5, c.body.p.z), target = (gy === null ? SEA + 2 : gy) + 1.1;
  c.body.v.y = clamp((target - c.body.p.y) * 3, -3, 3);
}
function steer(c, dirx, dirz, speed, dt) {
  const k = Math.min(1, dt * 8);
  c.body.v.x += (dirx * speed - c.body.v.x) * k; c.body.v.z += (dirz * speed - c.body.v.z) * k;
  if (Math.abs(dirx) + Math.abs(dirz) > .01) c.targetYaw = Math.atan2(dirx, dirz);
}
function updateWild(c, dt, now) {
  if (c.state === 'caught') return;
  const p = player.body.p;
  c.t -= dt;
  let speed = 1.2;
  if (c.state === 'wander') {
    if (c.t <= 0) {
      c.t = 1.5 + Math.random() * 2.5;
      if (Math.random() < .35) c.dir.set(0, 0, 0);
      else { const a = Math.random() * Math.PI * 2; c.dir.set(Math.cos(a), 0, Math.sin(a)); }
      if (c.body.p.distanceTo(c.home) > 6) c.dir.copy(c.home).sub(c.body.p).setY(0).normalize();
    }
  } else if (c.state === 'flee') {
    speed = 4.5; c.dir.copy(c.body.p).sub(p).setY(0).normalize();
    if (c.t <= 0) { removeCreature(c); return; }
  } else if (c.state === 'emerge') { c.dir.set(0, 0, 0); if (c.t <= 0) c.state = 'wander'; }
  // no meterse al agua si no vuela
  if (!c.body.fly && (c.dir.x || c.dir.z)) {
    const ax = Math.floor(c.body.p.x + c.dir.x * .7), az = Math.floor(c.body.p.z + c.dir.z * .7), sy = surfaceY(ax, az);
    if (sy === null || sy < c.body.p.y - 2.5) { c.dir.multiplyScalar(-1); c.t = 1; }
  }
  steer(c, c.dir.x, c.dir.z, speed, dt);
  if (c.body.fly) flyHover(c, dt);
  else if (c.body.ground && (c.dir.x || c.dir.z) && (c.hop -= dt) <= 0) { c.body.v.y = 4.2; c.hop = .7 + Math.random() * .5; }
  moveBody(c.body, dt);
  animateCreature(c, dt, now, !!(c.dir.x || c.dir.z));
}
function updateFollower(c, i, dt, now) {
  if (c.state === 'emerge') { c.t -= dt; if (c.t <= 0) c.state = 'follow'; }
  const leader = i === 0 ? player.body.p : followers[i - 1].body.p;
  const d = Math.hypot(leader.x - c.body.p.x, leader.z - c.body.p.z);
  if (d > 16 || leader.y - c.body.p.y > 6) { c.body.p.set(leader.x - Math.sin(player.yaw) * 1.2, leader.y + 1, leader.z - Math.cos(player.yaw) * 1.2); c.body.v.set(0, 0, 0); }
  let dx = 0, dz = 0;
  if (d > 1.7 && c.state !== 'emerge') { dx = (leader.x - c.body.p.x) / d; dz = (leader.z - c.body.p.z) / d; }
  else if (d <= 1.7) c.targetYaw = Math.atan2(player.body.p.x - c.body.p.x, player.body.p.z - c.body.p.z);
  steer(c, dx, dz, Math.min(6.2, 1.5 + d * 1.4), dt);
  if (c.body.fly) flyHover(c, dt);
  else if (!dx && !dz && c.body.ground && Math.random() < dt * .25) c.body.v.y = 4;
  moveBody(c.body, dt);
  animateCreature(c, dt, now, !!(dx || dz));
}
function addFollower(id, from) {
  const p = from || player.body.p;
  const c = makeCreature(id, p.x, p.y + .2, p.z); c.state = 'follow'; followers.push(c); return c;
}
function rebuildFollowers() {
  followers.splice(0).forEach(removeCreature);
  party.forEach((id, i) => { const p = player.body.p; addFollower(id, new THREE.Vector3(p.x - Math.sin(player.yaw) * (1 + i), p.y + .5, p.z - Math.cos(player.yaw) * (1 + i))); });
}

/* ================= partículas ================= */
const parts = [];
const PGEO = new THREE.BoxGeometry(1, 1, 1);
const pmat = {};
function particle(pos, vel, col, size, life, grav) {
  const m = new THREE.Mesh(PGEO, pmat[col] || (pmat[col] = new THREE.MeshBasicMaterial({ color: col })));
  m.position.copy(pos); m.scale.setScalar(size); scene.add(m);
  parts.push({ m, v: vel, life, max: life, grav: grav === undefined ? 14 : grav, size });
}
function burst(x, y, z, id) {
  const cols = BLOCKCOL[id] || ['#ccc', '#999'];
  for (let i = 0; i < 14; i++) particle(new THREE.Vector3(x + .2 + Math.random() * .6, y + .2 + Math.random() * .6, z + .2 + Math.random() * .6), new THREE.Vector3((Math.random() - .5) * 4, Math.random() * 4 + 1, (Math.random() - .5) * 4), cols[i % 2], .12, .7);
}
function stars(p, col) { for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 3; particle(p.clone(), new THREE.Vector3(Math.cos(a) * s, 2 + Math.random() * 4, Math.sin(a) * s), i % 3 ? (col || '#ffd23f') : '#ffffff', .1, .9, 6); } }
function hearts(p) { for (let i = 0; i < 6; i++) particle(new THREE.Vector3(p.x + (Math.random() - .5) * .5, p.y + .9, p.z + (Math.random() - .5) * .5), new THREE.Vector3((Math.random() - .5) * .6, 1.2 + Math.random(), (Math.random() - .5) * .6), i % 2 ? '#ff5d8f' : '#ff9db0', .1, 1.2, 0); }
function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i]; q.life -= dt;
    if (q.life <= 0) { scene.remove(q.m); parts.splice(i, 1); continue; }
    q.v.y -= q.grav * dt; q.m.position.addScaledVector(q.v, dt); q.m.scale.setScalar(q.size * Math.min(1, q.life / q.max * 2));
  }
}

/* ================= atrapar ================= */
let catching = null;
function throwAt(c) {
  if (catching) return;
  if (cubes < 1) { toast('No te quedan cubos. Tocá "Hacer cubo" (1 madera + 1 piedra).', 3000); beep(120, .15); return; }
  cubes--; updateUI();
  const cube = makeCube(); scene.add(cube);
  const from = player.body.p.clone().add(new THREE.Vector3(0, 1.3, 0));
  c.state = 'caught'; c.body.v.set(0, 0, 0);
  catching = { c, cube, from, to: c.body.p.clone().add(new THREE.Vector3(0, .4, 0)), t: 0, phase: 'fly', shakes: 0 };
  player.yaw = Math.atan2(c.body.p.x - player.body.p.x, c.body.p.z - player.body.p.z);
  player.throwT = .35;
  beep(500, .08);
}
function updateCatch(dt) {
  const k = catching; if (!k) return; k.t += dt;
  if (k.phase === 'fly') {
    const u = Math.min(1, k.t / .5);
    k.cube.position.lerpVectors(k.from, k.to, u); k.cube.position.y += Math.sin(u * Math.PI) * 1.5; k.cube.rotation.x += dt * 14; k.cube.rotation.y += dt * 9;
    if (u >= 1) { k.phase = 'suck'; k.t = 0; beep(700, .1, 'sine'); }
  } else if (k.phase === 'suck') {
    const u = Math.min(1, k.t / .25); k.c.model.scale.setScalar(1 - u); k.c.model.position.lerp(k.cube.position, u);
    if (u >= 1) { k.c.model.visible = false; k.phase = 'drop'; k.t = 0; k.cube.rotation.set(0, k.cube.rotation.y, 0); }
  } else if (k.phase === 'drop') {
    const gy = groundBelow(k.cube.position.x, k.cube.position.y, k.cube.position.z) || k.to.y;
    k.cube.position.y = Math.max(gy + .2, k.cube.position.y - dt * 4);
    if (k.cube.position.y <= gy + .21) { k.phase = 'shake'; k.t = 0; }
  } else if (k.phase === 'shake') {
    const cyc = k.t % .7, n = Math.floor(k.t / .7);
    k.cube.rotation.z = cyc < .35 ? Math.sin(cyc / .35 * Math.PI * 2) * .45 : 0;
    if (n > k.shakes) { k.shakes = n; }
    if (cyc < dt && n < 3) beep(320, .06);
    if (k.t >= 2.1) resolveCatch();
  }
}
function resolveCatch() {
  const k = catching, c = k.c, m = c.mon;
  scene.remove(k.cube);
  const at = k.cube.position.clone();
  if (Math.random() < m.c) {
    dex[c.id] = (dex[c.id] || 0) + 1; const first = dex[c.id] === 1;
    removeCreature(c); wild.splice(wild.indexOf(c), 1);
    stars(at); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .15), i * 110));
    let msg = '¡Atrapaste a ' + m.name + '!';
    let follows = false;
    if (first && party.length < MAXP) { party.push(c.id); const f = addFollower(c.id, at); f.state = 'emerge'; f.t = .5; follows = true; msg += ' Ahora te sigue.'; }
    else if (first) msg += ' Es nuevo en tu Pokédex.';
    toast(msg, 3000);
    if (first) setTimeout(() => showNew(m, follows), 900);
  } else {
    c.model.visible = true; c.model.scale.setScalar(1); c.body.p.copy(at).setY(at.y - .2);
    stars(at, '#bbbbbb'); beep(160, .25, 'sawtooth');
    if (Math.random() < .25) { c.state = 'flee'; c.t = 3; toast(m.name + ' salió del cubo y se fue corriendo.', 2500); }
    else { c.state = 'emerge'; c.t = .6; toast('¡Uy! ' + m.name + ' se escapó. Probá otra vez.', 2500); }
  }
  catching = null; updateUI(); save();
}

/* ================= tocar el mundo ================= */
const ray = new THREE.Raycaster();
function voxelRay(o, d, max) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
  let tmx = d.x > 0 ? (x + 1 - o.x) * tdx : d.x < 0 ? (o.x - x) * tdx : Infinity;
  let tmy = d.y > 0 ? (y + 1 - o.y) * tdy : d.y < 0 ? (o.y - y) * tdy : Infinity;
  let tmz = d.z > 0 ? (z + 1 - o.z) * tdz : d.z < 0 ? (o.z - z) * tdz : Infinity;
  let px = x, py = y, pz = z, t = 0;
  for (let i = 0; i < 200 && t <= max; i++) {
    const v = get(x, y, z);
    if (i > 0 && (SOLID[v] || PLANT[v])) return { x, y, z, px, py, pz, v, t };
    px = x; py = y; pz = z;
    if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; } else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; } else { z += sz; t = tmz; tmz += tdz; }
  }
  return null;
}
function tapAt(cx, cy) {
  if (!running) return;
  const ndc = new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const objs = wild.filter(c => c.alive && c.state !== 'caught').map(c => c.model).concat(followers.map(c => c.model));
  const hitsC = ray.intersectObjects(objs, true);
  const hv = voxelRay(ray.ray.origin, ray.ray.direction, 40);
  if (hitsC.length && (!hv || hitsC[0].distance < hv.t + .3)) {
    const c = hitsC[0].object.userData.creature;
    if (!c) return;
    if (followers.includes(c)) { hearts(c.body.p); beep(880, .08, 'sine'); setTimeout(() => beep(1175, .1, 'sine'), 80); c.body.v.y = 5; return; }
    if (c.body.p.distanceTo(player.body.p) > 12) { toast('Está muy lejos. Acercate a ' + c.mon.name + '.'); return; }
    throwAt(c); return;
  }
  if (!hv) return;
  const head = player.body.p.clone().add(new THREE.Vector3(0, 1.4, 0));
  if (head.distanceTo(new THREE.Vector3(hv.x + .5, hv.y + .5, hv.z + .5)) > REACH) { toast('Está muy lejos. Acercate.'); beep(120, .1); return; }
  if (mode === 'break') breakBlock(hv); else placeBlock(hv);
}
function breakBlock(h) {
  if (h.v === B.BED) { toast('Esa roca no se rompe.'); beep(120, .12); return; }
  const drop = DROP[h.v];
  burst(h.x, h.y, h.z, h.v);
  setBlock(h.x, h.y, h.z, h.y <= SEA ? B.WATER : B.AIR);
  if (PLANT[get(h.x, h.y + 1, h.z)]) setBlock(h.x, h.y + 1, h.z, B.AIR);
  if (drop) { inv[drop]++; toast('+1 ' + ITEMS.find(i => i.id === drop).name, 900); }
  player.throwT = .25;
  beep(180 + Math.random() * 90, .08); updateUI();
}
function placeBlock(h) {
  const it = ITEMS[sel];
  if (!inv[it.id]) { toast('No tenés ' + it.name.toLowerCase() + '. Rompé bloques para juntar.'); beep(120, .12); return; }
  let x = h.px, y = h.py, z = h.pz;
  if (PLANT[h.v]) { x = h.x; y = h.y; z = h.z; }
  const cur = get(x, y, z);
  if (x < 0 || z < 0 || x >= WX || z >= WZ || y >= WY - 1 || !(cur === B.AIR || cur === B.WATER || PLANT[cur])) { toast('Ahí no se puede poner.'); beep(120, .12); return; }
  if (PLANT[it.block] && (!SOLID[get(x, y - 1, z)] || cur === B.WATER)) { toast('Las plantas van arriba de un bloque.'); beep(120, .12); return; }
  if (!PLANT[it.block]) {
    const box = { hw: .5, h: 1 };
    const inside = b => Math.abs(b.p.x - (x + .5)) < b.hw + .5 && Math.abs(b.p.z - (z + .5)) < b.hw + .5 && b.p.y < y + 1 && b.p.y + b.h > y;
    if (inside(player.body) || followers.some(f => inside(f.body)) || wild.some(w => w.alive && inside(w.body))) { toast('¡Hay alguien ahí!'); beep(120, .12); return; }
    void box;
  }
  setBlock(x, y, z, it.block); inv[it.id]--; player.throwT = .25; beep(330, .08); updateUI();
}
function craft() {
  if (inv.madera < 1 || inv.piedra < 1) { toast('Para un cubo necesitás 1 madera y 1 piedra.', 2600); beep(120, .12); return; }
  inv.madera--; inv.piedra--; cubes++; beep(520, .1); setTimeout(() => beep(780, .12), 90); toast('¡Hiciste un cubo atrapador!'); updateUI(); saveSoon();
}

/* ================= interfaz ================= */
const hot = $('hot');
ITEMS.forEach((it, i) => {
  const b = document.createElement('button'); b.className = 'slot'; b.setAttribute('aria-label', it.name);
  const c = tileCanvas(it.tile);
  b.appendChild(c); b.appendChild(document.createElement('b'));
  b.addEventListener('click', () => { sel = i; setMode('place'); updateUI(); toast(it.name + ' — tocá un bloque para ponerlo', 1500); });
  hot.appendChild(b);
});
function setMode(m) { mode = m; const b = $('modeBtn'); b.textContent = m === 'break' ? 'Romper' : 'Poner'; b.classList.toggle('place', m === 'place'); }
function updateUI() {
  [...hot.children].forEach((b, i) => { const n = inv[ITEMS[i].id]; b.querySelector('b').textContent = n || ''; b.classList.toggle('sel', i === sel && mode === 'place'); b.classList.toggle('empty', !n); });
  $('cubeCount').textContent = cubes; $('dexCount').textContent = MONS.filter(m => dex[m.id]).length + '/' + MONS.length;
}
$('modeBtn').addEventListener('click', () => { setMode(mode === 'break' ? 'place' : 'break'); updateUI(); beep(400, .05); });
$('craftBtn').addEventListener('click', craft);
let jumpHeld = false;
const jb = $('jumpBtn');
jb.addEventListener('pointerdown', e => { e.preventDefault(); jumpHeld = true; doJump(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => jb.addEventListener(ev, () => { jumpHeld = false; }));
function doJump() { const b = player.body; if (b.ground) { b.v.y = b.jumpV; b.ground = false; beep(260, .05, 'triangle'); } else if (b.inWater) b.v.y = 5; }

// cartel de "¡Pokémon nuevo!" con la imagen grande
let newOpen = false;
function showNew(m, follows) {
  if (!$('title').hidden || !$('dexOv').hidden) return;
  running = false; newOpen = true;
  $('newArt').innerHTML = monImg(m, true);
  $('newName').textContent = m.name;
  $('newNum').textContent = 'N.º ' + String(m.n).padStart(3, '0') + (m.shiny ? ' · variocolor' : '');
  const all = MONS.every(mm => dex[mm.id]);
  $('newMsg').textContent = all ? '¡Completaste la Pokédex! Sos un gran entrenador.' : follows ? 'Ahora te sigue a todos lados.' : 'Ya está en tu Pokédex.';
  $('newOv').hidden = false;
  [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => beep(f, .12, 'triangle'), i * 120));
}
$('newClose').addEventListener('click', () => { $('newOv').hidden = true; newOpen = false; running = true; last = performance.now(); });

let resetArm = false;
function renderDex() {
  const grid = $('dexGrid'); grid.innerHTML = '';
  MONS.forEach(m => {
    const got = dex[m.id] || 0, f = party.includes(m.id), d = document.createElement('button');
    d.className = 'mon' + (got ? ' got' : '') + (f ? ' follow' : ''); d.disabled = !got;
    d.innerHTML = (f ? '<span class="tag">Te sigue</span>' : '') + monImg(m, false) + '<em>N.º ' + String(m.n).padStart(3, '0') + '</em><strong>' + (got ? m.name : '???') + '</strong><span class="rar" style="color:' + (m.rar === 'Común' ? 'var(--muted)' : 'var(--accent)') + '">' + m.rar + '</span><span>' + (got ? 'Atrapados: ' + got : m.tip) + '</span>';
    if (got) d.addEventListener('click', () => {
      if (f) party = party.filter(id => id !== m.id);
      else if (party.length >= MAXP) { $('dexSum').textContent = 'Solo pueden seguirte ' + MAXP + ' a la vez. Tocá uno que te sigue para que descanse.'; beep(120, .1); return; }
      else party.push(m.id);
      rebuildFollowers(); save(); beep(f ? 300 : 600, .08); renderDex();
    });
    grid.appendChild(d);
  });
  const n = MONS.filter(m => dex[m.id]).length;
  $('dexSum').textContent = (n === MONS.length ? '¡Los encontraste a todos! ' : 'Encontraste ' + n + ' de ' + MONS.length + '. ') + (n ? 'Tocá un Pokémon para que te siga (hasta ' + MAXP + ').' : 'Buscalos caminando por la isla.');
}
$('bookBtn').addEventListener('click', () => { if (!running || newOpen) return; running = false; resetArm = false; $('resetBtn').textContent = 'Mundo nuevo'; renderDex(); $('dexOv').hidden = false; });
$('dexClose').addEventListener('click', () => { $('dexOv').hidden = true; running = true; last = performance.now(); });
$('resetBtn').addEventListener('click', () => {
  if (!resetArm) { resetArm = true; $('resetBtn').textContent = '¿Seguro? Tocá otra vez'; return; }
  wild.splice(0).forEach(removeCreature); newWorld(); buildAll(); rebuildFollowers(); updateUI(); save();
  $('dexOv').hidden = true; running = true; last = performance.now(); toast('¡Isla nueva! Buscá Pokémon en el pasto alto.', 3000);
});

/* ================= controles ================= */
const joy = { x: 0, y: 0, id: null };
const joyEl = $('joy'), knob = $('knob');
joyEl.addEventListener('pointerdown', e => { e.preventDefault(); joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
joyEl.addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyMove(e); });
['pointerup', 'pointercancel'].forEach(ev => joyEl.addEventListener(ev, e => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } }));
function joyMove(e) {
  const r = joyEl.getBoundingClientRect(), R = r.width * .36;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const l = Math.hypot(dx, dy);
  if (l > R) { dx = dx / l * R; dy = dy / l * R; }
  joy.x = dx / R; joy.y = dy / R; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
}
const look = { id: null, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: false };
canvas.addEventListener('pointerdown', e => {
  if (look.id !== null) return; look.id = e.pointerId; canvas.setPointerCapture(e.pointerId);
  look.x = look.sx = e.clientX; look.y = look.sy = e.clientY; look.t = performance.now(); look.moved = false;
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== look.id) return;
  const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
  if (Math.hypot(e.clientX - look.sx, e.clientY - look.sy) > 9) look.moved = true;
  if (look.moved) { camYaw -= dx * .008; camPitch = clamp(camPitch + dy * .005, .08, 1.25); }
});
['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, e => {
  if (e.pointerId !== look.id) return; look.id = null;
  if (ev === 'pointerup' && !look.moved && performance.now() - look.t < 500) tapAt(e.clientX, e.clientY);
}));
canvas.addEventListener('wheel', e => { camDist = clamp(camDist + e.deltaY * .01, 3.5, 12); }, { passive: true });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
const keys = {};
addEventListener('keydown', e => {
  if (newOpen) { if (e.key === 'Enter' || e.key === 'Escape' || e.code === 'Space') { e.preventDefault(); $('newClose').click(); } return; }
  if (!$('dexOv').hidden) { if (e.key === 'Escape' || e.key === 'l' || e.key === 'L') $('dexClose').click(); return; }
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); doJump(); }
  else if (e.code === 'KeyE' || e.code === 'KeyQ') { setMode(mode === 'break' ? 'place' : 'break'); updateUI(); }
  else if (e.code === 'KeyC') craft();
  else if (e.code === 'KeyL') $('bookBtn').click();
  else if (/^Digit[1-7]$/.test(e.code)) { sel = +e.code.slice(5) - 1; setMode('place'); updateUI(); toast(ITEMS[sel].name, 900); }
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });

/* ================= bucle ================= */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

const camTarget = new THREE.Vector3(), tmp = new THREE.Vector3();
function updatePlayer(dt, now) {
  const b = player.body;
  let jx = joy.x, jy = joy.y;
  if (keys.KeyA) jx -= 1; if (keys.KeyD) jx += 1; if (keys.KeyW) jy -= 1; if (keys.KeyS) jy += 1;
  if (keys.ArrowLeft) camYaw += dt * 2.2; if (keys.ArrowRight) camYaw -= dt * 2.2;
  if (keys.ArrowUp) camPitch = clamp(camPitch + dt * 1.2, .08, 1.25); if (keys.ArrowDown) camPitch = clamp(camPitch - dt * 1.2, .08, 1.25);
  const l = Math.hypot(jx, jy); if (l > 1) { jx /= l; jy /= l; }
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  const mx = fx * -jy + rx * jx, mz = fz * -jy + rz * jx, ml = Math.hypot(mx, mz);
  const speed = (b.inWater ? 2.6 : 4.6) * Math.min(1, ml);
  const tx = ml > .05 ? mx / ml * speed : 0, tz = ml > .05 ? mz / ml * speed : 0, k = Math.min(1, dt * 12);
  b.v.x += (tx - b.v.x) * k; b.v.z += (tz - b.v.z) * k;
  if (jumpHeld || keys.Space) { if (b.ground && b.v.y <= 0) doJump(); else if (b.inWater) b.v.y = Math.max(b.v.y, 3.5); }
  if (catching) { b.v.x *= .5; b.v.z *= .5; }
  moveBody(b, dt);
  if (ml > .05 && !catching) player.yaw = angLerp(player.yaw, Math.atan2(mx, mz), Math.min(1, dt * 12));
  // animación
  const m = player.model, rig = m.userData.rig, sp = Math.hypot(b.v.x, b.v.z);
  m.position.copy(b.p); m.rotation.y = player.yaw;
  player.phase += dt * sp * 2.4;
  const sw = Math.sin(player.phase) * Math.min(1, sp / 3) * .75;
  rig.legL.rotation.x = sw; rig.legR.rotation.x = -sw;
  rig.armL.rotation.x = -sw; rig.armR.rotation.x = sw;
  if (player.throwT > 0) { player.throwT -= dt; rig.armR.rotation.x = -2.2 * Math.sin(Math.max(0, player.throwT) / .35 * Math.PI); }
  if (!b.ground && !b.inWater) { rig.armL.rotation.z = .5; rig.armR.rotation.z = -.5; } else { rig.armL.rotation.z = 0; rig.armR.rotation.z = 0; }
  rig.head.rotation.y = Math.sin(now * .001) * .08;
  placeShadow(player.shadow, b.p, .9);
}
function updateCamera(dt) {
  const b = player.body;
  camTarget.lerp(tmp.set(b.p.x, b.p.y + 1.35, b.p.z), Math.min(1, dt * 10));
  const dir = new THREE.Vector3(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch));
  let want = camDist;
  for (let s = .5; s <= camDist; s += .25) {
    const p = tmp.copy(camTarget).addScaledVector(dir, s);
    if (SOLID[get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))]) { want = Math.max(1.4, s - .45); break; }
  }
  camDistCur += (want - camDistCur) * Math.min(1, dt * (want < camDistCur ? 20 : 4));
  camera.position.copy(camTarget).addScaledVector(dir, camDistCur);
  if (camera.position.y < SEA + 1.2) camera.position.y = SEA + 1.2;
  camera.lookAt(camTarget);
}
let last = performance.now(), spawnT = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (running) {
    updatePlayer(dt, now);
    followers.forEach((c, i) => updateFollower(c, i, dt, now));
    for (let i = wild.length - 1; i >= 0; i--) { const c = wild[i]; if (!c.alive) { wild.splice(i, 1); continue; } updateWild(c, dt, now); if (c.alive && c.state !== 'caught' && c.body.p.distanceTo(player.body.p) > 42) { removeCreature(c); wild.splice(i, 1); } }
    spawnT -= dt; if (spawnT <= 0) { spawnT = 1.2; if (wild.filter(c => c.alive).length < 12) spawnWild(); }
    updateCatch(dt);
    updateParticles(dt);
    if (Math.random() < dt * .2) saveSoon();
  }
  updateCamera(dt);
  waterTex.offset.x = (now * .00002) % 1; waterTex.offset.y = (now * .000013) % 1;
  clouds.forEach(c => { c.position.x += dt * .6; if (c.position.x > WX + 80) c.position.x = -80; });
  sun.position.set(camera.position.x + 50, camera.position.y + 60, camera.position.z - 70); sun.lookAt(camera.position);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ================= arranque ================= */
resize();
if (!load()) { freshState(); newWorld(); }
buildAll();
camYaw = player.yaw + Math.PI;
camTarget.set(player.body.p.x, player.body.p.y + 1.35, player.body.p.z);
MONS.forEach(monTexture); // empieza a bajar las imágenes
rebuildFollowers(); updateUI(); setMode('break');
for (let i = 0; i < 8; i++) spawnWild();
requestAnimationFrame(frame);
let hadSave = false; try { hadSave = !!localStorage.getItem(SAVE); } catch (e) { }
$('loadMsg').textContent = hadSave ? 'Tu isla te está esperando.' : 'Una isla nueva te está esperando.';
$('playBtn').addEventListener('click', () => {
  beep(523, .08); setTimeout(() => beep(784, .12), 90);
  try { const el = document.documentElement; if (el.requestFullscreen && matchMedia('(pointer:coarse)').matches) el.requestFullscreen().catch(() => { }); } catch (e) { }
  $('title').hidden = true; running = true; last = performance.now();
  toast(Object.keys(dex).length ? '¡Bienvenido de vuelta!' : 'Buscá Pokémon en el pasto alto y tocalos para atraparlos', 3500);
  save();
});
window.__game = { get player() { return player; }, get wild() { return wild; }, get followers() { return followers; }, tapAt, throwAt };
})();
