/* Bichos y Bloques 3D — juego casero de bloques y Pokémon */
(function () {
'use strict';

/* ================= constantes ================= */
// la isla es grande (96x96). Una partida de la isla chica vieja se pasa sola a una isla grande nueva:
// se quedan los Pokémon, la Pokédex, las cosas y los amigos; lo construido no.
const SAVE = 'bichos-bloques-3d-v1', BIG = 96;
(() => { try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.seed && s.wx !== BIG) { Object.assign(s, { seed: (Math.random() * 1e9) | 0, wx: BIG, edits: {}, p: null, veh: null, track: 1 }); localStorage.setItem(SAVE, JSON.stringify(s)); } } catch (e) { } })();
const WX = BIG, WZ = BIG, WY = 30, SEA = 6, CH = 16;
const MAXP = 99, REACH = 8; // MAXP: pueden salir todos los Pokémon a la vez
const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6, PLANKS: 7, BRICK: 8, WATER: 9, TALL: 10, FLOWR: 11, FLOWY: 12, BED: 13, GEM: 14, ROAD: 15, ROADL: 16, CURB: 17 };
const SOLID = new Uint8Array(32), OPAQUE = new Uint8Array(32), PLANT = new Uint8Array(32);
[1, 2, 3, 4, 5, 6, 7, 8, 13, 14, 15, 16, 17].forEach(i => SOLID[i] = 1);
[1, 2, 3, 4, 5, 7, 8, 13, 14, 15, 16, 17].forEach(i => OPAQUE[i] = 1);
[10, 11, 12].forEach(i => PLANT[i] = 1);
// tile del atlas por bloque: [arriba, costado, abajo]
const TILES = { 1: [0, 1, 2], 2: [2, 2, 2], 3: [3, 3, 3], 4: [4, 4, 4], 5: [6, 5, 6], 6: [7, 7, 7], 7: [8, 8, 8], 8: [9, 9, 9], 10: [11, 11, 11], 11: [12, 12, 12], 12: [13, 13, 13], 13: [14, 14, 14], 14: [15, 15, 15], 15: [16, 19, 19], 16: [17, 19, 19], 17: [18, 18, 19] };
const BLOCKCOL = { 1: ['#5fae3f', '#8b5a2f'], 2: ['#8b5a2f', '#6a4220'], 3: ['#8f8f8f', '#6c6c6c'], 4: ['#e4cf8e', '#c9b26c'], 5: ['#6b4423', '#a8804a'], 6: ['#3f9636', '#24621f'], 7: ['#b8864a', '#7d5629'], 8: ['#9c9c9c', '#646464'], 10: ['#4a9a32', '#9be36b'], 11: ['#e8443a', '#3f8a2b'], 12: ['#ffd23f', '#3f8a2b'], 14: ['#5ff2f2', '#c48bff'], 15: ['#3b3d42', '#55575c'], 16: ['#3b3d42', '#f2f2f2'], 17: ['#e0302a', '#f2f2f2'] };

const ITEMS = [
  { id: 'madera', name: 'Madera', tile: 8, block: B.PLANKS },
  { id: 'piedra', name: 'Piedra', tile: 9, block: B.BRICK },
  { id: 'tierra', name: 'Tierra', tile: 2, block: B.DIRT },
  { id: 'arena', name: 'Arena', tile: 4, block: B.SAND },
  { id: 'hojas', name: 'Hojas', tile: 7, block: B.LEAVES },
  { id: 'flor', name: 'Flor', tile: 12, block: B.FLOWR },
  { id: 'pasto', name: 'Pasto alto', tile: 11, block: B.TALL },
  // bloques de pista infinitos: tocando otra vez el casillero cambia entre asfalto, línea y cordón
  { id: 'pista', name: 'Pista', tile: 16, block: B.ROAD, inf: true, v: 0, vars: [[B.ROAD, 16, 'Pista'], [B.ROADL, 17, 'Pista con línea'], [B.CURB, 18, 'Cordón rojo y blanco']] }
];
const DROP = { 15: 'piedra', 16: 'piedra', 17: 'piedra', 1: 'tierra', 2: 'tierra', 3: 'piedra', 4: 'arena', 5: 'madera', 6: 'hojas', 7: 'madera', 8: 'piedra', 10: 'pasto', 11: 'flor', 12: 'flor' };

// Pokémon reales: n = número de la Pokédex (las imágenes se cargan de PokeAPI)
// w = qué tan seguido aparece, c = chance de atraparlo, hab = dónde le gusta estar, s = tamaño
const MONS = [
  { id: 'bulbasaur', n: 1, name: 'Bulbasaur', w: 30, c: .75, hab: null, rar: 'Común', tip: 'Vive en el pasto alto', col: '#5fbf8f', emoji: '🌱' },
  { id: 'pikachu', n: 25, name: 'Pikachu', w: 25, c: .65, hab: null, rar: 'Común', tip: 'Corre por toda la isla', col: '#f7d02c', emoji: '⚡' },
  { id: 'charmander', n: 4, name: 'Charmander', w: 18, c: .65, hab: null, rar: 'Común', tip: 'Su llamita se ve entre el pasto', col: '#f08030', emoji: '🔥' },
  { id: 'squirtle', n: 7, name: 'Squirtle', w: 20, c: .65, hab: 'agua', rar: 'Común', tip: 'Le gusta estar cerca del agua', col: '#6390f0', emoji: '💧' },
  { id: 'psyduck', n: 54, name: 'Psyduck', w: 12, c: .6, hab: 'agua', rar: 'Común', tip: 'Se rasca la cabeza en la orilla', col: '#f5d76e', emoji: '🦆' },
  { id: 'geodude', n: 74, name: 'Geodude', w: 15, c: .55, hab: 'piedra', rar: 'Común', tip: 'Se esconde cerca de las piedras', col: '#a8a090', emoji: '🪨' },
  { id: 'butterfree', n: 12, name: 'Butterfree', from: 'metapod', stage: 2, w: 12, c: .6, hab: 'flor', rar: 'Común', tip: 'Vuela cerca de las flores', col: '#b8a8f0', emoji: '🦋', fly: true },
  { id: 'oddish', n: 43, name: 'Oddish', w: 12, c: .6, hab: 'flor', rar: 'Común', tip: 'Se planta al lado de las flores', col: '#5a7fd0', emoji: '🌿' },
  { id: 'caterpie', n: 10, name: 'Caterpie', w: 15, c: .7, hab: 'arbol', rar: 'Común', tip: 'Come hojas debajo de los árboles', col: '#78c850', emoji: '🐛' },
  { id: 'paras', n: 46, name: 'Paras', w: 10, c: .6, hab: 'arbol', rar: 'Común', tip: 'Aparece a la sombra de los árboles', col: '#e07040', emoji: '🍄' },
  { id: 'eevee', n: 133, name: 'Eevee', w: 5, c: .4, hab: null, rar: 'Raro', tip: 'Muy de vez en cuando pasea por ahí', col: '#c08850', emoji: '🦊' },
  { id: 'onix', n: 95, name: 'Onix', w: 4, c: .4, hab: 'piedra', rar: 'Raro', tip: 'Gigante de piedra, cerca de las rocas', col: '#9a9a9a', emoji: '🐍', s: 2.3 },
  { id: 'snorlax', n: 143, name: 'Snorlax', w: 3, c: .35, hab: null, rar: 'Raro', tip: 'Duerme la siesta en cualquier lado', col: '#3a6a80', emoji: '😴', s: 2 },
  { id: 'mew', n: 151, name: 'Mew', w: 1.5, c: .25, hab: null, rar: 'Rarísimo', tip: 'Casi nadie lo encontró', col: '#f5a8c8', emoji: '✨', fly: true },
  { id: 'rayquaza', n: 384, name: 'Rayquaza negro', w: 1, c: .2, hab: null, rar: 'Rarísimo', tip: 'Dragón variocolor: debilitalo con tus Pokémon antes de tirarle un cubo', col: '#2a2a2a', emoji: '🐉', fly: true, shiny: true, s: 2.8 },
  // evoluciones: no aparecen sueltas, se consiguen con una gema 💎 (from = de quién evoluciona)
  { id: 'ivysaur', n: 2, name: 'Ivysaur', from: 'bulbasaur', stage: 1, col: '#5fbf8f', emoji: '🌿', s: 1.7 },
  { id: 'venusaur', n: 3, name: 'Venusaur', from: 'ivysaur', stage: 2, col: '#4fa07a', emoji: '🌺', s: 2.1 },
  { id: 'charmeleon', n: 5, name: 'Charmeleon', from: 'charmander', stage: 1, col: '#e0603a', emoji: '🔥', s: 1.7 },
  { id: 'charizard', n: 6, name: 'Charizard', from: 'charmeleon', stage: 2, col: '#f08030', emoji: '🐲', s: 2.2, fly: true },
  { id: 'wartortle', n: 8, name: 'Wartortle', from: 'squirtle', stage: 1, col: '#6390f0', emoji: '💧', s: 1.7 },
  { id: 'blastoise', n: 9, name: 'Blastoise', from: 'wartortle', stage: 2, col: '#4a6fc0', emoji: '🌊', s: 2.1 },
  { id: 'metapod', n: 11, name: 'Metapod', from: 'caterpie', stage: 1, col: '#78c850', emoji: '🟢', s: 1.4 },
  { id: 'raichu', n: 26, name: 'Raichu', from: 'pikachu', stage: 1, col: '#e8a030', emoji: '⚡', s: 1.8 },
  { id: 'gloom', n: 44, name: 'Gloom', from: 'oddish', stage: 1, col: '#5a7fd0', emoji: '🌸', s: 1.6 },
  { id: 'vileplume', n: 45, name: 'Vileplume', from: 'gloom', stage: 2, col: '#d04040', emoji: '🌺', s: 1.9 },
  { id: 'parasect', n: 47, name: 'Parasect', from: 'paras', stage: 1, col: '#e07040', emoji: '🍄', s: 1.8 },
  { id: 'golduck', n: 55, name: 'Golduck', from: 'psyduck', stage: 1, col: '#4a8ad0', emoji: '🦆', s: 1.9 },
  { id: 'graveler', n: 75, name: 'Graveler', from: 'geodude', stage: 1, col: '#a8a090', emoji: '🪨', s: 1.7 },
  { id: 'golem', n: 76, name: 'Golem', from: 'graveler', stage: 2, col: '#8a8a70', emoji: '🪨', s: 2 },
  { id: 'vaporeon', n: 134, name: 'Vaporeon', from: 'eevee', stage: 1, col: '#4a9ae0', emoji: '💧', s: 1.8 },
  { id: 'jolteon', n: 135, name: 'Jolteon', from: 'eevee', stage: 1, col: '#f0d040', emoji: '⚡', s: 1.8 },
  { id: 'flareon', n: 136, name: 'Flareon', from: 'eevee', stage: 1, col: '#f08040', emoji: '🔥', s: 1.8 },
  { id: 'steelix', n: 208, name: 'Steelix', from: 'onix', stage: 1, col: '#9aa8b8', emoji: '⚙️', s: 2.6 }
];
const MON = Object.fromEntries(MONS.map(m => [m.id, m]));
const EVO = {}; // a quién puede evolucionar cada uno
MONS.forEach(m => {
  if (m.w === undefined) Object.assign(m, { w: 0, c: .5, hab: null, rar: 'Evolución', tip: 'Evoluciona de ' + MON[m.from].name + ' con una gema 💎' });
  if (m.from) (EVO[m.from] = EVO[m.from] || []).push(m.id);
});
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
const atlas = document.createElement('canvas'); atlas.width = 64; atlas.height = 80; // 4 x 5 texturas de 16x16
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
  // piedra con gemas de evolución
  tile(15, 16, r => { speck(r, '#8f8f8f', ['#7a7a7a', '#a5a5a5', '#6c6c6c'], 120);
    [[2, 2, '#5ff2f2'], [9, 3, '#c48bff'], [5, 8, '#ff7ad9'], [11, 10, '#5ff2f2'], [2, 12, '#c48bff']].forEach(([x, y, c]) => {
      g.fillStyle = '#2a2a4a'; g.fillRect(x - 1, y - 1, 5, 5); g.fillStyle = c; g.fillRect(x, y, 3, 3); g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }); });
  // pista: asfalto, asfalto con línea blanca, cordón rojo y blanco, costado
  const ASF = ['#34363a', '#44464b', '#2e3034'];
  tile(16, 17, r => speck(r, '#3b3d42', ASF, 90));
  tile(17, 18, r => { speck(r, '#3b3d42', ASF, 90); g.fillStyle = '#f2f2f2'; g.fillRect(5, 5, 6, 6); });
  tile(18, 19, () => { for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#f2f2f2' : '#e0302a'; g.fillRect(k * 4, 0, 4, 16); } });
  tile(19, 20, r => speck(r, '#5c5e63', ['#4e5055', '#686a6f'], 80));
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
const hemi = new THREE.HemisphereLight(0xffffff, 0x7a9a5a, .85); scene.add(hemi);
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
    c.position.set(-40 + r() * (WX + 86), 34 + r() * 4, -40 + r() * (WZ + 86)); scene.add(c); clouds.push(c);
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
  // gemas de evolución escondidas en la piedra (más fáciles de ver en las piedras de afuera)
  const rg = rng32(sd ^ 0x5eed6e5);
  for (let y = 1; y < WY - 1; y++) for (let z = 1; z < WZ - 1; z++) for (let x = 1; x < WX - 1; x++) {
    if (world[idx(x, y, z)] !== B.STONE) continue;
    const open = get(x, y + 1, z) === B.AIR || get(x + 1, y, z) === B.AIR || get(x - 1, y, z) === B.AIR || get(x, y, z + 1) === B.AIR || get(x, y, z - 1) === B.AIR;
    if (rg() < (open ? .016 : .004)) set(x, y, z, B.GEM);
  }
  village = buildVillage(sd);
  track = buildTrack();
}
// pista alrededor de la isla, lejos del pueblo, con subidas suaves (terraplén sobre el agua, túnel en las colinas)
let track = null;
function buildTrack() {
  const cx = WX / 2, cz = WZ / 2;
  let R = Math.round(WX * .3);
  if (village) { const vd = Math.hypot(village.x - cx, village.z - cz), near = vd - 10 - 4.5, far = vd + 10 + 4.5; if (R > near && R < far) R = far <= 26 ? far : near; }
  R = clamp(R, 12, Math.round(WX * .41));
  const N = 360, hh = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, x = clamp(Math.floor(cx + Math.cos(a) * R), 0, WX - 1), z = clamp(Math.floor(cz + Math.sin(a) * R), 0, WZ - 1); hh[i] = clamp(heights[z * WX + x], SEA + 2, WY - 8); }
  for (let pass = 0; pass < 3; pass++) { const c = hh.slice(); for (let i = 0; i < N; i++) { let s = 0; for (let k = -10; k <= 10; k++) s += c[(i + k + N) % N]; hh[i] = s / 21; } }
  for (let pass = 0; pass < 4; pass++) { for (let i = 1; i <= N; i++) hh[i % N] = clamp(hh[i % N], hh[i - 1] - .17, hh[i - 1] + .17); for (let i = N - 2; i >= -1; i--) { const j = (i + N) % N; hh[j] = clamp(hh[j], hh[(j + 1) % N] - .17, hh[(j + 1) % N] + .17); } }
  for (let z = 0; z < WZ; z++) for (let x = 0; x < WX; x++) {
    const dx = x + .5 - cx, dz = z + .5 - cz, d = Math.hypot(dx, dz), off = Math.abs(d - R);
    if (off > 2.6) continue;
    const i = Math.round(((Math.atan2(dz, dx) / (Math.PI * 2)) + 1) % 1 * N) % N, h = Math.round(hh[i]);
    const type = off > 2.05 ? B.CURB : off < .55 && i % 24 < 12 ? B.ROADL : B.ROAD;
    for (let y = 1; y < h; y++) if (!SOLID[get(x, y, z)]) set(x, y, z, B.STONE);
    set(x, h, z, type);
    for (let y = h + 1; y <= Math.min(WY - 1, h + 4); y++) set(x, y, z, B.AIR);
  }
  return { R, cx, cz, hh, N };
}
// pueblo: 3 casitas de madera con techo de ladrillo sobre un terreno plano
let village = null;
function buildVillage(sd) {
  // en la isla grande el pueblo va adentro del anillo de la pista; si no entra, donde se pueda
  return villageAt(sd, 9, Math.round(WX * .3) - 15) || villageAt(sd, 9, WX * .375);
}
function villageAt(sd, dmin, dmax) {
  const r = rng32(sd ^ 0x71ab3), HX = 8, HZ = 6;
  let best = null;
  for (let k = 0; k < 400; k++) {
    const cx = HX + 2 + Math.floor(r() * (WX - 2 * HX - 4)), cz = HZ + 2 + Math.floor(r() * (WZ - 2 * HZ - 4));
    const dc = Math.hypot(cx - WX / 2, cz - WZ / 2); if (dc < dmin || dc > dmax) continue;
    let mn = 99, mx = -1, sum = 0, n = 0, bad = false;
    for (let z = cz - HZ; z <= cz + HZ && !bad; z++) for (let x = cx - HX; x <= cx + HX; x++) { const h = heights[z * WX + x]; if (h <= SEA + 1) { bad = true; break; } mn = Math.min(mn, h); mx = Math.max(mx, h); sum += h; n++; }
    if (bad) continue;
    const sc = mx - mn + dc * .05; if (!best || sc < best.sc) best = { sc, cx, cz, h: Math.round(sum / n), range: mx - mn };
  }
  if (!best || best.range > 6) return null;
  const { cx, cz, h } = best;
  for (let z = cz - HZ - 1; z <= cz + HZ + 1; z++) for (let x = cx - HX - 1; x <= cx + HX + 1; x++) {
    for (let y = 1; y < WY; y++) { const v = get(x, y, z); if (y < h - 2) { if (!v) set(x, y, z, B.STONE); } else if (y < h) set(x, y, z, B.DIRT); else if (y === h) set(x, y, z, B.GRASS); else set(x, y, z, B.AIR); }
  }
  for (let x = cx - HX + 1; x <= cx + HX - 1; x++) set(x, h, cz, B.SAND); // caminito
  for (let z = cz - HZ + 2; z <= cz + 1; z++) set(cx, h, z, B.SAND);
  const houses = [];
  function house(x0, z0, doorZ) { // casa de 5x5; la puerta mira hacia el caminito
    for (let z = z0; z < z0 + 5; z++) for (let x = x0; x < x0 + 5; x++) {
      set(x, h, z, B.PLANKS);
      const edge = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4, corner = (x === x0 || x === x0 + 4) && (z === z0 || z === z0 + 4);
      for (let y = h + 1; y <= h + 3; y++) set(x, y, z, edge ? (corner ? B.LOG : B.PLANKS) : B.AIR);
      set(x, h + 4, z, B.BRICK);
      if (x > x0 && x < x0 + 4 && z > z0 && z < z0 + 4) set(x, h + 5, z, B.BRICK);
    }
    const dz = doorZ > 0 ? z0 + 4 : z0, mx = x0 + 2;
    set(mx, h + 1, dz, B.AIR); set(mx, h + 2, dz, B.AIR); // puerta
    set(x0, h + 2, z0 + 2, B.AIR); set(x0 + 4, h + 2, z0 + 2, B.AIR); // ventanas
    houses.push({ door: [mx + .5, h + 1, dz + .5 + doorZ * 1.2] });
  }
  house(cx - 7, cz - 6, 1); house(cx + 3, cz - 6, 1); house(cx - 2, cz + 2, -1);
  return { x: cx + .5, y: h + 1, z: cz + .5, houses };
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
function uvOf(tile, u, v) { const tx = tile % 4, ty = tile >> 2; return [(tx + UVE + u * (1 - 2 * UVE)) / 4, (4 - ty + UVE + v * (1 - 2 * UVE)) / 5]; }
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
let inv, cubes, gems = 0, dex, party, sel = 0, mode = 'break', running = false;
const player = { body: newBody(.3, 1.7), model: makePlayer(), yaw: 0, phase: 0 };
scene.add(player.model); player.shadow = makeShadow(.9);
let camYaw = Math.PI * .75, camPitch = .42, camDist = 7, camDistCur = 7;
const followers = [], wild = [];

function freshState() { inv = { madera: 2, piedra: 2, tierra: 0, arena: 0, hojas: 0, flor: 0, pasto: 0 }; cubes = 5; gems = 0; dex = {}; party = []; edits = {}; }
function findSpawn() {
  for (let rad = 0; rad < WX * .47; rad++) for (let k = 0; k < 40; k++) {
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
  try { localStorage.setItem(SAVE, JSON.stringify({ seed, edits, p: player.body.p.toArray(), wx: WX, inv, cubes, gems, dex, party, adv, tday, veh: vehicles.map(v => ({ k: v.kind, p: v.body.p.toArray(), y: v.yaw })), track: 1 })); } catch (e) { }
}
let savedVeh = null, savedTrack = false;
let saveT = null; function saveSoon() { clearTimeout(saveT); saveT = setTimeout(save, 600); }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE)); if (!s || !s.seed) return false;
    seed = s.seed; generate(seed); edits = s.edits || {};
    for (const k in edits) world[+k] = edits[k];
    inv = Object.assign({ madera: 0, piedra: 0, tierra: 0, arena: 0, hojas: 0, flor: 0, pasto: 0 }, s.inv); cubes = s.cubes | 0; gems = s.gems | 0; dex = {}; if (s.adv) Object.assign(adv, s.adv); if (typeof s.tday === 'number') tday = s.tday; savedVeh = s.veh || null; savedTrack = !!s.track;
    for (const k in s.dex || {}) { const id = MON[k] ? k : OLDMON[k]; if (id) dex[id] = (dex[id] || 0) + s.dex[k]; }
    party = [...new Set((s.party || []).map(id => MON[id] ? id : OLDMON[id]))].filter(id => dex[id] && MON[id]).slice(0, MAXP);
    if (s.p) player.body.p.fromArray(s.p); else { const [x, y, z] = findSpawn(); player.body.p.set(x + .5, y, z + .5); }
    if (collides(player.body, player.body.p.x, player.body.p.y, player.body.p.z)) { const [x, y, z] = findSpawn(); player.body.p.set(x + .5, y, z + .5); }
    return true;
  } catch (e) { return false; }
}
function setBlock(x, y, z, v) { set(x, y, z, v); edits[idx(x, y, z)] = v; rebuildAround(x, z); saveSoon(); }

/* ================= Pokémon ================= */
function makeCreature(id, x, y, z) {
  const m = MON[id], c = { id, mon: m, model: makeMon(id), body: newBody(.28, .75), t: Math.random() * 3, dir: new THREE.Vector3(), yaw: Math.random() * 6, hop: 0, state: 'wander', alive: true };
  c.body.p.set(x, y, z); c.body.fly = !!m.fly; c.home = new THREE.Vector3(x, y, z); c.body.jumpV = 7.5;
  c.hp = 1; c.hitAgo = 99;
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
// barra de vida arriba de los Pokémon salvajes (aparece cuando los atacás, o siempre en los raros)
function drawHp(c) {
  if (!c.hpBar) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 10;
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = tex.minFilter = THREE.NearestFilter;
    c.hpBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    c.hpBar.scale.set(1, .16, 1); c.hpBar.position.y = (c.mon.s || 1.5) * .78 + .25; c.hpBar.renderOrder = 5; c.hpBar.userData.cv = cv;
    c.model.add(c.hpBar);
  }
  const cv = c.hpBar.userData.cv, g = cv.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, 64, 10); g.fillStyle = '#444'; g.fillRect(2, 2, 60, 6);
  g.fillStyle = c.hp > .5 ? '#5fd35f' : c.hp > .2 ? '#f2c233' : '#f04a3a'; g.fillRect(2, 2, Math.max(2, Math.round(60 * c.hp)), 6);
  c.hpBar.material.map.needsUpdate = true;
}
function updateWild(c, dt, now) {
  if (c.state === 'caught') return;
  c.hitAgo += dt;
  if (c.hp < 1 && c.hitAgo > 10) { c.hp = Math.min(1, c.hp + dt * .03); drawHp(c); } // se recupera solo si lo dejás tranquilo
  if (c.mon.rar !== 'Común' && !c.hpBar) drawHp(c);
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
  // pasean alrededor tuyo (no pegados): cada uno elige un lugarcito cerca y lo va cambiando
  const p = player.body.p, d = Math.hypot(p.x - c.body.p.x, p.z - c.body.p.z);
  if (d > 24 || p.y - c.body.p.y > 8) { const a = Math.random() * 6.28, tx = p.x + Math.cos(a) * 4, tz = p.z + Math.sin(a) * 4; c.body.p.set(tx, (surfaceY(tx, tz) || p.y) + .5, tz); c.body.v.set(0, 0, 0); c.roamT = 0; }
  c.roamT = (c.roamT || 0) - dt;
  if (!c.roam || c.roamT <= 0) { const a = Math.random() * 6.28, r = 3 + Math.random() * 4 + Math.min(i, 12) * .25; c.roam = { x: Math.cos(a) * r, z: Math.sin(a) * r }; c.roamT = 3 + Math.random() * 5; }
  const gx = p.x + c.roam.x, gz = p.z + c.roam.z, gd = Math.hypot(gx - c.body.p.x, gz - c.body.p.z);
  if (!c.body.fly && surfaceY(gx, gz) === null) c.roamT = 0; // ese lugar es agua: elegir otro
  let dx = 0, dz = 0;
  if (gd > .7 && c.state !== 'emerge') { dx = (gx - c.body.p.x) / gd; dz = (gz - c.body.p.z) / gd; }
  else if (Math.random() < dt * .5) c.targetYaw = Math.atan2(p.x - c.body.p.x, p.z - c.body.p.z);
  steer(c, dx, dz, d > 9 ? Math.min(7, 2 + d * .5) : Math.min(2.2, .8 + gd * .6), dt);
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
  party.forEach((id, i) => { const p = player.body.p, a = i * 2.4, r = 2.5 + (i % 4); addFollower(id, new THREE.Vector3(p.x + Math.cos(a) * r, (surfaceY(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r) || p.y) + .5, p.z + Math.sin(a) * r)); });
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
  if (c.mon.rar === 'Rarísimo' && c.hp > .6 && !c.warned) { c.warned = true; toast(c.mon.name + ' es muy fuerte. ' + (followers.length ? 'Primero atacalo con tus Pokémon (botón ¡Ataque!).' : 'Conseguí Pokémon que te sigan para debilitarlo.'), 3500); beep(200, .15); return; }
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
  const chance = m.c + (1 - m.c) * (1 - c.hp) * .85; // más débil = más fácil de atrapar
  if (Math.random() < chance) {
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
    if (Math.random() < (c.hp < .5 ? .08 : .25)) { c.state = 'flee'; c.t = 3; toast(m.name + ' salió del cubo y se fue corriendo.', 2500); }
    else { c.state = 'emerge'; c.t = .6; toast('¡Uy! ' + m.name + ' se escapó. ' + (c.hp > .5 && followers.length ? 'Atacalo para debilitarlo.' : 'Probá otra vez.'), 2500); }
  }
  catching = null; updateUI(); save();
}

/* ================= atacar para debilitar ================= */
let atkCD = 0;
function attackTarget() {
  // el más cercano, pero prefiere al que ya venías atacando y a los raros
  let best = null, bs = Infinity;
  wild.forEach(c => {
    if (!c.alive || c.state === 'caught' || c.state === 'flee') return;
    const d = c.body.p.distanceTo(player.body.p); if (d > 12) return;
    const sc = d - (c.hitAgo < 10 ? 8 : 0) - (c.mon.rar === 'Rarísimo' ? 6 : c.mon.rar === 'Raro' ? 3 : 0);
    if (sc < bs) { bs = sc; best = c; }
  });
  return best;
}
function attack() {
  if (!running || catching || atkCD > 0) return;
  if (!followers.length) { toast('Necesitás Pokémon que te sigan para atacar.'); beep(120, .1); return; }
  const z = ADV && nearestZombie(player.body.p, 12);
  if (z) { atkCD = 1.1; followers.slice(0, 6).forEach((f, i) => setTimeout(() => beamMob(f, z), i * 160)); return; }
  const t = attackTarget(); if (!t) { toast('No hay ningún Pokémon salvaje cerca.'); beep(120, .1); return; }
  atkCD = 1.1;
  player.yaw = Math.atan2(t.body.p.x - player.body.p.x, t.body.p.z - player.body.p.z);
  followers.slice(0, 6).forEach((f, i) => setTimeout(() => beam(f, t), i * 160)); // atacan hasta 6 a la vez
}
function beamMob(f, z) {
  if (!z.alive || !followers.includes(f)) return;
  const a = f.body.p.clone().add(new THREE.Vector3(0, .6, 0)), b = z.body.p.clone().add(new THREE.Vector3(0, 1, 0)), dir = b.clone().sub(a);
  f.targetYaw = Math.atan2(dir.x, dir.z); if (f.body.ground) f.body.v.y = 4;
  for (let i = 0; i < 12; i++) particle(a.clone().addScaledVector(dir, i / 24), dir.clone().multiplyScalar(2.6 + Math.random()), i % 3 ? f.mon.col : '#ffffff', .14, .3, 0);
  beep(300 + Math.random() * 200, .08, 'sawtooth', .04);
  setTimeout(() => hurtMob(z, 2 + (f.mon.stage || 0), a), 300);
}
function beam(f, t) {
  if (!t.alive || t.state === 'caught' || !followers.includes(f)) return;
  const a = f.body.p.clone().add(new THREE.Vector3(0, .6, 0)), b = t.body.p.clone().add(new THREE.Vector3(0, .5, 0));
  f.targetYaw = Math.atan2(b.x - a.x, b.z - a.z); if (f.body.ground) f.body.v.y = 4;
  const dir = b.clone().sub(a);
  for (let i = 0; i < 12; i++) particle(a.clone().addScaledVector(dir, i / 24), dir.clone().multiplyScalar(2.6 + Math.random()), i % 3 ? f.mon.col : '#ffffff', .14, .3, 0);
  beep(300 + Math.random() * 200, .08, 'sawtooth', .04);
  setTimeout(() => {
    if (!t.alive || t.state === 'caught') return;
    const resist = t.mon.rar === 'Rarísimo' ? .5 : t.mon.rar === 'Raro' ? .8 : 1;
    t.hp = Math.max(.08, t.hp - (.14 + .06 * (f.mon.stage || 0)) * resist); t.hitAgo = 0;
    drawHp(t); stars(b, f.mon.col); beep(150, .1, 'square', .05);
    if (t.state === 'wander') { t.state = 'emerge'; t.t = .7; } t.targetYaw = Math.atan2(player.body.p.x - t.body.p.x, player.body.p.z - t.body.p.z);
    if (t.hp <= .08 && !t.weakMsg) { t.weakMsg = true; toast('¡' + t.mon.name + ' está muy débil! Tirale un cubo.', 3000); }
  }, 300);
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
function tapAt(cx, cy, forceMode) {
  if (!running) return;
  const ndc = new THREE.Vector2(cx / viewW() * 2 - 1, -(cy / viewH()) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const objs = wild.filter(c => c.alive && c.state !== 'caught').map(c => c.model).concat(followers.map(c => c.model));
  const hitsC = ray.intersectObjects(objs, true);
  const hv = voxelRay(ray.ray.origin, ray.ray.direction, 40);
  const hitC = hitsC.length && (!hv || hitsC[0].distance < hv.t + .3) ? hitsC[0] : null;
  if (townTap(ray, hv, hitC)) return; // aldeanos, gallinas, golem y vehículos
  if (advTap(ray, hv, hitC)) return; // zombies, lobos y arco (modo aventura)
  if (hitC) {
    const c = hitsC[0].object.userData.creature;
    if (!c) return;
    if (followers.includes(c)) { hearts(c.body.p); beep(880, .08, 'sine'); setTimeout(() => beep(1175, .1, 'sine'), 80); c.body.v.y = 5; return; }
    if (c.body.p.distanceTo(player.body.p) > 12) { toast('Está muy lejos. Acercate a ' + c.mon.name + '.'); return; }
    throwAt(c); return;
  }
  if (!hv) return;
  const head = player.body.p.clone().add(new THREE.Vector3(0, 1.4, 0));
  if (head.distanceTo(new THREE.Vector3(hv.x + .5, hv.y + .5, hv.z + .5)) > REACH) { toast('Está muy lejos. Acercate.'); beep(120, .1); return; }
  if ((forceMode || mode) === 'break') breakBlock(hv); else placeBlock(hv);
}
function breakBlock(h) {
  if (h.v === B.BED) { toast('Esa roca no se rompe.'); beep(120, .12); return; }
  const drop = DROP[h.v];
  burst(h.x, h.y, h.z, h.v);
  if (h.v === B.GEM) { gems++; stars(new THREE.Vector3(h.x + .5, h.y + .5, h.z + .5), '#5ff2f2'); [988, 1319, 1568].forEach((f, i) => setTimeout(() => beep(f, .1, 'triangle'), i * 80)); toast('¡Encontraste una gema de evolución! 💎 Usala en la Pokédex.', 2600); }
  setBlock(h.x, h.y, h.z, h.y <= SEA ? B.WATER : B.AIR);
  if (PLANT[get(h.x, h.y + 1, h.z)]) setBlock(h.x, h.y + 1, h.z, B.AIR);
  if (drop) { inv[drop]++; toast('+1 ' + ITEMS.find(i => i.id === drop).name, 900); }
  player.throwT = .25;
  beep(180 + Math.random() * 90, .08); updateUI();
}
function placeBlock(h) {
  const it = ITEMS[sel];
  if (!it.inf && !inv[it.id]) { toast('No tenés ' + it.name.toLowerCase() + '. Rompé bloques para juntar.'); beep(120, .12); return; }
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
  setBlock(x, y, z, it.block); if (!it.inf) inv[it.id]--; player.throwT = .25; beep(330, .08); updateUI();
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
  const num = document.createElement('i'); num.textContent = i + 1; b.appendChild(num);
  b.addEventListener('click', () => {
    if (it.vars && sel === i && mode === 'place') { // cambiar de tipo de pista
      it.v = (it.v + 1) % it.vars.length; [it.block, it.tile, it.name] = it.vars[it.v];
      const g = c.getContext('2d'); g.clearRect(0, 0, 16, 16); g.drawImage(tileCanvas(it.tile), 0, 0);
    }
    sel = i; setMode('place'); updateUI(); toast(it.name + (it.inf ? ' (infinita ∞)' : '') + ' — tocá un bloque para ponerlo' + (it.vars ? '. Tocá el casillero otra vez para cambiar.' : ''), 1800);
  });
  hot.appendChild(b);
});
function setMode(m) { mode = m; const b = $('modeBtn'); b.textContent = m === 'break' ? 'Romper' : 'Poner'; b.classList.toggle('place', m === 'place'); }
function updateUI() {
  [...hot.children].forEach((b, i) => { const n = ITEMS[i].inf ? '∞' : inv[ITEMS[i].id]; b.querySelector('b').textContent = n || ''; b.classList.toggle('sel', i === sel && mode === 'place'); b.classList.toggle('empty', !n); });
  $('cubeCount').textContent = cubes; $('gemCount').textContent = gems; $('dexCount').textContent = MONS.filter(m => dex[m.id]).length + '/' + MONS.length;
}
$('modeBtn').addEventListener('click', () => { setMode(mode === 'break' ? 'place' : 'break'); updateUI(); beep(400, .05); });
$('craftBtn').addEventListener('click', () => ADV ? openCraft() : craft());
$('atkBtn').addEventListener('click', attack);
let jumpHeld = false;
const jb = $('jumpBtn');
jb.addEventListener('pointerdown', e => { e.preventDefault(); jumpHeld = true; doJump(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => jb.addEventListener(ev, () => { jumpHeld = false; }));
function doJump() { if (riding) return; const b = player.body; if (b.ground) { b.v.y = b.jumpV; b.ground = false; beep(260, .05, 'triangle'); } else if (b.inWater) b.v.y = 5; }

// cartel de "¡Pokémon nuevo!" con la imagen grande
let newOpen = false;
function showNew(m, follows, evoFrom) {
  if (!$('title').hidden || !$('dexOv').hidden) return;
  $('newTop').textContent = evoFrom ? '¡' + evoFrom.name + ' evolucionó!' : '¡Pokémon nuevo!';
  running = false; newOpen = true;
  $('newArt').innerHTML = monImg(m, true);
  $('newName').textContent = m.name;
  $('newNum').textContent = 'N.º ' + String(m.n).padStart(3, '0') + (m.shiny ? ' · variocolor' : '');
  const all = MONS.every(mm => dex[mm.id]);
  $('newMsg').textContent = all ? '¡Completaste la Pokédex! Sos un gran entrenador.' : evoFrom ? (follows ? 'Ahora es más fuerte para atacar.' : 'Ya está en tu Pokédex.') : follows ? 'Ahora te sigue a todos lados.' : 'Ya está en tu Pokédex.';
  $('newOv').hidden = false;
  [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => beep(f, .12, 'triangle'), i * 120));
}
$('newClose').addEventListener('click', () => { $('newOv').hidden = true; newOpen = false; running = true; last = performance.now(); });

function evolve(fromId, toId) {
  if (gems < 1) { $('dexSum').textContent = 'Necesitás una gema 💎. Buscalas en las piedras brillantes y rompelas.'; beep(120, .1); return; }
  gems--; dex[toId] = (dex[toId] || 0) + 1;
  const i = party.indexOf(fromId), follows = i >= 0;
  if (follows) { party[i] = toId; rebuildFollowers(); }
  save(); updateUI();
  $('dexOv').hidden = true;
  const m = MON[toId]; showNew(m, follows, MON[fromId]);
  const p = (followers[i] || player).body.p; stars(p.clone().add(new THREE.Vector3(0, .5, 0)), m.col); stars(p.clone().add(new THREE.Vector3(0, .8, 0)), '#ffffff');
}
let resetArm = false;
function renderDex() {
  $('switchMode').textContent = ADV ? 'Pasar a modo Pokémon 🌞' : 'Pasar a modo Aventura 🌙';
  const grid = $('dexGrid'); grid.innerHTML = '';
  [...MONS].sort((a, b) => a.n - b.n).forEach(m => {
    const got = dex[m.id] || 0, f = party.includes(m.id), d = document.createElement('div');
    d.className = 'mon' + (got ? ' got' : '') + (f ? ' follow' : ''); if (got) { d.setAttribute('role', 'button'); d.tabIndex = 0; }
    d.innerHTML = (f ? '<span class="tag">Te sigue</span>' : '') + monImg(m, false) + '<em>N.º ' + String(m.n).padStart(3, '0') + '</em><strong>' + (got ? m.name : '???') + '</strong><span class="rar" style="color:' + (m.rar === 'Común' ? 'var(--muted)' : 'var(--accent)') + '">' + m.rar + '</span><span>' + (got ? 'Atrapados: ' + got : m.tip) + '</span>';
    if (got && EVO[m.id]) EVO[m.id].forEach(to => {
      const eb = document.createElement('button'); eb.className = 'evo' + (gems < 1 ? ' off' : '');
      eb.textContent = 'Evolucionar a ' + MON[to].name + ' · 💎1';
      eb.addEventListener('click', e => { e.stopPropagation(); evolve(m.id, to); });
      d.appendChild(eb);
    });
    if (got) d.addEventListener('click', () => {
      if (f) party = party.filter(id => id !== m.id);
      else party.push(m.id);
      rebuildFollowers(); save(); beep(f ? 300 : 600, .08); renderDex();
    });
    grid.appendChild(d);
  });
  const n = MONS.filter(m => dex[m.id]).length;
  $('dexSum').textContent = (n === MONS.length ? '¡Los encontraste a todos! ' : 'Encontraste ' + n + ' de ' + MONS.length + '. ') + (n ? 'Tocá un Pokémon para que salga o descanse.' : 'Buscalos caminando por la isla.') + ' Gemas: ' + gems + ' 💎';
}
$('allOut').addEventListener('click', () => { party = [...MONS].sort((a, b) => a.n - b.n).filter(m => dex[m.id]).map(m => m.id); rebuildFollowers(); save(); beep(700, .1); renderDex(); });
$('allIn').addEventListener('click', () => { party = []; rebuildFollowers(); save(); beep(300, .1); renderDex(); });
$('bookBtn').addEventListener('click', () => { if (!running || newOpen) return; running = false; resetArm = false; $('resetBtn').textContent = 'Mundo nuevo'; renderDex(); $('dexOv').hidden = false; });
$('dexClose').addEventListener('click', () => { $('dexOv').hidden = true; running = true; last = performance.now(); });
$('resetBtn').addEventListener('click', () => {
  if (!resetArm) { resetArm = true; $('resetBtn').textContent = '¿Seguro? Tocá otra vez'; return; }
  exitVehicle(); wild.splice(0).forEach(removeCreature); newWorld(); buildAll(); spawnTown(); placeVehicles(null); rebuildFollowers(); updateUI(); save();
  $('dexOv').hidden = true; running = true; last = performance.now(); toast('¡Isla nueva! Buscá Pokémon en el pasto alto.', 3000);
});

/* ================= controles ================= */
// compu con mouse y teclado: se esconde el joystick y se muestran las teclas
const DESK = matchMedia('(hover:hover) and (pointer:fine)').matches;
if (DESK) document.body.classList.add('desk');
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
const look = { id: null, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: false, btn: 0 };
canvas.addEventListener('pointerdown', e => {
  if (look.id !== null) return; look.id = e.pointerId; canvas.setPointerCapture(e.pointerId);
  look.x = look.sx = e.clientX; look.y = look.sy = e.clientY; look.t = performance.now(); look.moved = false; look.btn = e.pointerType === 'mouse' ? e.button : 0;
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== look.id) return;
  const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
  if (Math.hypot(e.clientX - look.sx, e.clientY - look.sy) > 9) look.moved = true;
  if (look.moved) { camYaw -= dx * .008; camPitch = clamp(camPitch + dy * .005, .08, 1.25); }
});
['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, e => {
  if (e.pointerId !== look.id) return; look.id = null;
  // en la compu: clic izquierdo rompe, clic derecho pone (como en Minecraft)
  if (ev === 'pointerup' && !look.moved && performance.now() - look.t < 500) tapAt(e.clientX, e.clientY, look.btn === 2 ? 'place' : DESK && look.btn === 0 ? 'break' : null);
}));
canvas.addEventListener('wheel', e => { camDist = clamp(camDist + e.deltaY * .01, 3.5, 12); }, { passive: true });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
const keys = {};
addEventListener('keydown', e => {
  if (faintOpen) { if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); $('faintBtn').click(); } return; }
  if (!$('craftOv').hidden) { if (e.key === 'Escape' || e.code === 'KeyC') $('craftClose').click(); return; }
  if (newOpen) { if (e.key === 'Enter' || e.key === 'Escape' || e.code === 'Space') { e.preventDefault(); $('newClose').click(); } return; }
  if (!$('dexOv').hidden) { if (e.key === 'Escape' || e.code === 'KeyL' || e.code === 'KeyP') $('dexClose').click(); return; }
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); doJump(); }
  else if (e.code === 'KeyR' || e.code === 'Tab') { e.preventDefault(); setMode(mode === 'break' ? 'place' : 'break'); updateUI(); }
  else if (e.code === 'KeyC') ADV ? openCraft() : craft();
  else if (e.code === 'KeyX' && ADV) cycleWeapon();
  else if (e.code === 'KeyV') { if (riding) exitVehicle(); else { const v = vehicles.find(v => v.body.p.distanceTo(player.body.p) < 4.5); if (v) enterVehicle(v); else toast('No hay ningún vehículo cerca.'); } }
  else if (e.code === 'KeyF') attack();
  else if (e.code === 'KeyL' || e.code === 'KeyP') $('bookBtn').click();
  else if (/^Digit[1-8]$/.test(e.code)) { sel = +e.code.slice(5) - 1; setMode('place'); updateUI(); toast(ITEMS[sel].name, 900); }
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; }); // que no quede caminando solo
// después de hacer clic en un botón, sacarle el foco para que la barra espaciadora no lo vuelva a apretar
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });

/* ================= bucle ================= */
// en iPhone el dibujo ocupa la pantalla entera (100lvh) para que no quede una franja abajo; en el resto, la ventana
const viewW = () => IOS ? canvas.clientWidth || innerWidth : innerWidth, viewH = () => IOS ? canvas.clientHeight || innerHeight : innerHeight;
function resize() { renderer.setSize(viewW(), viewH(), false); camera.aspect = viewW() / viewH(); camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

const camTarget = new THREE.Vector3(), tmp = new THREE.Vector3();
function updatePlayer(dt, now) {
  const b = player.body;
  let jx = joy.x, jy = joy.y;
  // caminar: W A S D o las flechas
  if (keys.KeyA || keys.ArrowLeft) jx -= 1; if (keys.KeyD || keys.ArrowRight) jx += 1; if (keys.KeyW || keys.ArrowUp) jy -= 1; if (keys.KeyS || keys.ArrowDown) jy += 1;
  // girar la cámara con Q / E (o arrastrando el mouse)
  if (keys.KeyQ) camYaw += dt * 2.4; if (keys.KeyE) camYaw -= dt * 2.4;
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
  const cd = camDist + (riding ? riding.V.cam : 0);
  let want = cd;
  for (let s = .5; s <= cd; s += .25) {
    const p = tmp.copy(camTarget).addScaledVector(dir, s);
    if (SOLID[get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))]) { want = Math.max(1.4, s - .45); break; }
  }
  camDistCur += (want - camDistCur) * Math.min(1, dt * (want < camDistCur ? 20 : 4));
  camera.position.copy(camTarget).addScaledVector(dir, camDistCur);
  if (camera.position.y < SEA + 1.2) camera.position.y = SEA + 1.2;
  camera.lookAt(camTarget);
}
let last = performance.now(), spawnT = 0, atkUiT = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (running) {
    if (!riding) updatePlayer(dt, now);
    updateVehicles(dt);
    town.forEach(n => updateNpc(n, dt));
    followers.forEach((c, i) => updateFollower(c, i, dt, now));
    for (let i = wild.length - 1; i >= 0; i--) { const c = wild[i]; if (!c.alive) { wild.splice(i, 1); continue; } updateWild(c, dt, now); if (c.alive && c.state !== 'caught' && c.body.p.distanceTo(player.body.p) > 42) { removeCreature(c); wild.splice(i, 1); } }
    if (atkCD > 0) atkCD -= dt;
    if ((atkUiT -= dt) <= 0) { atkUiT = .25; const show = followers.length > 0 && (!!attackTarget() || (ADV && !!nearestZombie(player.body.p, 12))); if ($('atkBtn').hidden === show) $('atkBtn').hidden = !show; }
    spawnT -= dt; if (spawnT <= 0) { spawnT = 1.2; if (wild.filter(c => c.alive).length < Math.round(12 * WX / 64)) spawnWild(); }
    if (ADV) updateAdv(dt);
    updateCatch(dt);
    updateParticles(dt);
    if (Math.random() < dt * .2) saveSoon();
  }
  updateCamera(dt);
  waterTex.offset.x = (now * .00002) % 1; waterTex.offset.y = (now * .000013) % 1;
  clouds.forEach(c => { c.position.x += dt * .6; if (c.position.x > WX + 80) c.position.x = -80; });
  updateSky();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ================= modo aventura: noche, zombies, lobos, espada y arco ================= */
let ADV = false;
const DAYLEN = 420; // segundos por día completo: unos 4 y medio de día y 2 y medio de noche
let tday = .3; // 0 = amanecer · .68 = anochecer
const adv = { hp: 10, huesos: 0, flechas: 0, espada: false, arco: false, arma: 'mano', lobos: 0, pups: [], pupGift: false, dinos: [] };
const mobs = [], arrows = [];
let hurtT = 0, sinceHurt = 99, regenT = 0, zSpawnT = 0, wSpawnT = 0, wasNight = false, faintOpen = false;

// --- cielo, sol, luna y estrellas
const skyCanvas = scene.background.image, skyG = skyCanvas.getContext('2d');
const DAYSKY = ['#4aa8ff', '#9ad6ff', '#cdeeff'].map(c => new THREE.Color(c)), NIGHTSKY = ['#03061a', '#0b1433', '#1a2546'].map(c => new THREE.Color(c)), DUSK = new THREE.Color('#ff9a5a');
const moon = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color: '#eef3ff', fog: false, transparent: true }));
scene.add(moon);
const starPts = (function () {
  const n = 500, pos = new Float32Array(n * 3), r = rng32(7);
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, b = Math.acos(r() * .95), R = 150; pos[i * 3] = Math.sin(b) * Math.cos(a) * R; pos[i * 3 + 1] = Math.cos(b) * R; pos[i * 3 + 2] = Math.sin(b) * Math.sin(a) * R; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(p); return p;
})();
function sunAngle() { return tday < .68 ? tday / .68 * Math.PI : Math.PI + (tday - .68) / .32 * Math.PI; }
const isNight = () => Math.sin(sunAngle()) < -.05;
let lastLight = -1, lastDusk = -1;
const tmpC = new THREE.Color(), fogDay = new THREE.Color('#cdeeff');
function updateSky() {
  const a = sunAngle(), h = Math.sin(a);
  const light = clamp((h + .25) / .5, 0, 1), L = .26 + .74 * light, dusk = clamp(1 - Math.abs(h) / .25, 0, 1) * (light > 0 ? 1 : .4);
  const cp = camera.position;
  sun.position.set(cp.x + Math.cos(a) * 90, cp.y + h * 90, cp.z - 40); sun.lookAt(cp); sun.visible = h > -.15;
  moon.position.set(cp.x - Math.cos(a) * 90, cp.y - h * 90, cp.z + 40); moon.lookAt(cp); moon.visible = h < .15;
  starPts.position.copy(cp); starPts.material.opacity = clamp(-h * 3, 0, 1) * .9;
  if (Math.abs(L - lastLight) < .006 && Math.abs(dusk - lastDusk) < .02) return;
  lastLight = L; lastDusk = dusk;
  const gr = skyG.createLinearGradient(0, 0, 0, 256), cols = [0, 1, 2].map(i => tmpC.clone().lerpColors(NIGHTSKY[i], DAYSKY[i], light));
  cols[2].lerp(DUSK, dusk * .7); cols[1].lerp(DUSK, dusk * .3);
  gr.addColorStop(0, '#' + cols[0].getHexString()); gr.addColorStop(.55, '#' + cols[1].getHexString()); gr.addColorStop(1, '#' + cols[2].getHexString());
  skyG.fillStyle = gr; skyG.fillRect(0, 0, 4, 256); scene.background.needsUpdate = true;
  scene.fog.color.copy(cols[2]); scene.fog.far = 50 + 28 * light;
  matSolid.color.setScalar(L); matPlant.color.setScalar(L); sea.material.color.setScalar(L); seabed.material.color.set('#c9b26c').multiplyScalar(L);
  clouds[0].material.color.setScalar(.35 + .65 * L);
  for (const k in spriteTex) if (spriteTex[k].mat) spriteTex[k].mat.color.setScalar(.45 + .55 * L);
  hemi.intensity = .2 + .65 * L; sunLight.intensity = .55 * L;
}

// --- modelos
function makeZombie() {
  const g = new THREE.Group(), r = {};
  const SK = '#5f9e4c', SK2 = '#4a8a3a', SH = '#2d9fa0', PA = '#3b3f9c';
  r.legL = new THREE.Group(); r.legL.position.set(-.13, .62, 0); g.add(r.legL); bx(r.legL, .24, .62, .26, PA, 0, -.31, 0);
  r.legR = new THREE.Group(); r.legR.position.set(.13, .62, 0); g.add(r.legR); bx(r.legR, .24, .62, .26, PA, 0, -.31, 0);
  bx(g, .54, .62, .3, SH, 0, .93, 0);
  r.armL = new THREE.Group(); r.armL.position.set(-.37, 1.18, 0); g.add(r.armL); bx(r.armL, .2, .62, .22, SK, 0, -.28, 0); r.armL.rotation.x = -1.45;
  r.armR = new THREE.Group(); r.armR.position.set(.37, 1.18, 0); g.add(r.armR); bx(r.armR, .2, .62, .22, SK, 0, -.28, 0); r.armR.rotation.x = -1.45;
  r.head = new THREE.Group(); r.head.position.set(0, 1.24, 0); g.add(r.head);
  bx(r.head, .5, .5, .5, SK, 0, .25, 0); bx(r.head, .52, .12, .52, SK2, 0, .46, 0);
  [-1, 1].forEach(k => bx(r.head, .1, .08, .02, '#101010', k * .12, .28, .255));
  bx(r.head, .2, .05, .02, '#2a4a20', 0, .14, .255);
  g.userData.rig = r; return g;
}
function makeWolf() {
  const g = new THREE.Group(), r = {}, W = '#dcdcdc', W2 = '#b9b9b9';
  bx(g, .46, .44, .9, W, 0, .62, 0); bx(g, .5, .5, .4, W2, 0, .66, .22);
  r.head = new THREE.Group(); r.head.position.set(0, .78, .5); g.add(r.head);
  bx(r.head, .42, .4, .34, W, 0, 0, .1); bx(r.head, .22, .18, .24, W2, 0, -.08, .36); bx(r.head, .08, .06, .04, '#1a1a1a', 0, -.02, .48);
  bx(r.head, .1, .14, .06, W2, -.13, .26, .02); bx(r.head, .1, .14, .06, W2, .13, .26, .02);
  [-1, 1].forEach(k => bx(r.head, .07, .06, .02, '#1a1a1a', k * .11, .06, .28));
  r.collar = bx(g, .5, .1, .14, '#d8312a', 0, .72, .42); r.collar.visible = false;
  r.tail = new THREE.Group(); r.tail.position.set(0, .74, -.45); g.add(r.tail); bx(r.tail, .12, .12, .4, W2, 0, 0, -.18); r.tail.rotation.x = .6;
  r.legs = [[-.14, .32], [.14, .32], [-.14, -.32], [.14, -.32]].map(([x, z]) => { const l = new THREE.Group(); l.position.set(x, .42, z); g.add(l); bx(l, .13, .42, .13, W2, 0, -.21, 0); return l; });
  g.userData.rig = r; return g;
}
function makeArrowMesh() { const g = new THREE.Group(); bx(g, .04, .04, .6, '#8a6038', 0, 0, 0); bx(g, .08, .08, .1, '#9a9a9a', 0, 0, .32); bx(g, .12, .02, .12, '#f2f2f2', 0, 0, -.28); return g; }
// espada y arco en la mano
(function () {
  const r = player.model.userData.rig, hand = new THREE.Group(); hand.position.set(0, -.55, .02); r.armR.add(hand);
  r.sword = new THREE.Group(); hand.add(r.sword);
  bx(r.sword, .07, .1, .62, '#cfd8de', 0, 0, .42); bx(r.sword, .03, .04, .5, '#ffffff', 0, .04, .42); bx(r.sword, .26, .07, .08, '#6b4423', 0, 0, .08); bx(r.sword, .07, .07, .16, '#4e3018', 0, 0, -.04);
  r.bow = new THREE.Group(); hand.add(r.bow); r.bow.rotation.x = Math.PI / 2;
  bx(r.bow, .06, .36, .06, '#7d5629', 0, 0, .12); const t1 = bx(r.bow, .06, .26, .06, '#7d5629', 0, .27, .05); t1.rotation.x = -.5; const t2 = bx(r.bow, .06, .26, .06, '#7d5629', 0, -.27, .05); t2.rotation.x = .5;
  bx(r.bow, .015, .78, .015, '#f2f2f2', 0, 0, -.02);
  r.sword.visible = r.bow.visible = false;
})();
function showWeapon() { const r = player.model.userData.rig; r.sword.visible = ADV && adv.arma === 'espada'; r.bow.visible = ADV && adv.arma === 'arco'; }

// --- bichos de la noche y lobos
function makeMob(kind, x, y, z) {
  const m = { kind, model: kind === 'zombie' ? makeZombie() : makeWolf(), body: newBody(.3, kind === 'zombie' ? 1.7 : .85), hp: kind === 'zombie' ? 10 : 8, yaw: Math.random() * 6, t: 0, dir: new THREE.Vector3(), atkT: 0, phase: 0, alive: true, tamed: false };
  m.body.p.set(x, y, z); m.body.jumpV = 8; m.home = new THREE.Vector3(x, y, z);
  m.model.traverse(o => { o.userData.mob = m; }); scene.add(m.model); m.shadow = makeShadow(.9);
  mobs.push(m); return m;
}
function removeMob(m) { m.alive = false; scene.remove(m.model); scene.remove(m.shadow); const i = mobs.indexOf(m); if (i >= 0) mobs.splice(i, 1); }
function spotAround(dmin, dmax, test) {
  const p = player.body.p;
  for (let k = 0; k < 20; k++) {
    const a = Math.random() * Math.PI * 2, d = dmin + Math.random() * (dmax - dmin), x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
    if (x < 2 || z < 2 || x >= WX - 2 || z >= WZ - 2) continue;
    const y = surfaceY(x, z); if (!y || y <= SEA || SOLID[get(x, y + 1, z)]) continue;
    if (test && !test(x, y, z)) continue;
    return [x + .5, y, z + .5];
  }
  return null;
}
const tamedWolves = () => mobs.filter(m => m.kind === 'wolf' && m.tamed);
function spawnTamed(n) { for (let i = 0; i < n; i++) { const p = player.body.p, w = makeMob('wolf', p.x - 1 - i * .7, p.y + .3, p.z - 1); w.tamed = true; w.model.userData.rig.collar.visible = true; } }
function nearestZombie(from, maxD) { let best = null, bd = maxD; mobs.forEach(m => { if (m.kind !== 'zombie' || !m.alive) return; const d = m.body.p.distanceTo(from); if (d < bd) { bd = d; best = m; } }); return best; }
function hurtMob(m, dmg, from) {
  if (!m.alive) return;
  m.hp -= dmg;
  const away = m.body.p.clone().sub(from).setY(0).normalize();
  m.body.v.x = away.x * 6; m.body.v.z = away.z * 6; m.body.v.y = 4.5; m.knock = .3;
  for (let i = 0; i < 8; i++) particle(m.body.p.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3((Math.random() - .5) * 3, 2 + Math.random() * 2, (Math.random() - .5) * 3), i % 2 ? '#d8312a' : '#ff7a6a', .1, .5);
  beep(140, .1, 'square', .06);
  if (m.hp <= 0) killMob(m);
}
function killMob(m, burned) {
  for (let i = 0; i < 16; i++) particle(m.body.p.clone().add(new THREE.Vector3((Math.random() - .5) * .6, .5 + Math.random(), (Math.random() - .5) * .6)), new THREE.Vector3((Math.random() - .5) * 2, 1 + Math.random() * 2, (Math.random() - .5) * 2), i % 2 ? '#bbbbbb' : '#777777', .16, .8, -1);
  if (m.kind === 'zombie' && !burned) {
    const got = [];
    if (Math.random() < .75) { adv.huesos++; got.push('+1 hueso 🦴'); }
    if (Math.random() < .35) { adv.flechas += 2; got.push('+2 flechas'); }
    if (got.length) toast(got.join(' · '), 1400);
    beep(400, .08); setTimeout(() => beep(300, .12), 80);
  }
  removeMob(m); updateAdvUI(); saveSoon();
}
function hurtPlayer(d, from) {
  if (hurtT > 0 || faintOpen || !running) return;
  adv.hp = Math.max(0, adv.hp - d); hurtT = .7; sinceHurt = 0;
  const away = player.body.p.clone().sub(from).setY(0).normalize();
  player.body.v.x = away.x * 7; player.body.v.z = away.z * 7; player.body.v.y = 5;
  const fl = $('hurtFx'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
  beep(110, .2, 'sawtooth', .07); updateAdvUI();
  if (adv.hp <= 0) faint();
}
function faint() {
  exitVehicle();
  faintOpen = true; running = false; $('faintOv').hidden = false; beep(220, .3, 'triangle'); setTimeout(() => beep(160, .4, 'triangle'), 250);
}
$('faintBtn').addEventListener('click', () => {
  mobs.filter(m => m.kind === 'zombie').forEach(removeMob);
  const [x, y, z] = findSpawn(); player.body.p.set(x + .5, y, z + .5); player.body.v.set(0, 0, 0);
  adv.hp = 10; tamedWolves().forEach(w => { w.body.p.set(x - .5, y + .3, z - .5); w.body.v.set(0, 0, 0); });
  followers.forEach(f => { f.body.p.set(x + .5, y + .5, z + 1.5); f.body.v.set(0, 0, 0); });
  $('faintOv').hidden = true; faintOpen = false; running = true; last = performance.now(); updateAdvUI(); save();
  toast('Volviste a casa con toda la vida. ¡Cuidado con los zombies!', 3000);
});
function animLegs(m, dt, sp) {
  const r = m.model.userData.rig; m.phase += dt * sp * 2.6; const sw = Math.sin(m.phase) * Math.min(1, sp / 2.5) * .7;
  if (m.kind === 'zombie') { r.legL.rotation.x = sw; r.legR.rotation.x = -sw; r.armL.rotation.x = -1.45 + sw * .2; r.armR.rotation.x = -1.45 - sw * .2; }
  else { r.legs[0].rotation.x = r.legs[3].rotation.x = sw; r.legs[1].rotation.x = r.legs[2].rotation.x = -sw; r.tail.rotation.y = Math.sin(performance.now() * (m.tamed ? .015 : .005)) * .5; }
}
function walkTo(m, tx, tz, speed, dt) {
  const dx = tx - m.body.p.x, dz = tz - m.body.p.z, d = Math.hypot(dx, dz) || 1;
  const k = Math.min(1, dt * 8); m.body.v.x += (dx / d * speed - m.body.v.x) * k; m.body.v.z += (dz / d * speed - m.body.v.z) * k;
  m.tyaw = Math.atan2(dx, dz);
}
function updateMob(m, dt) {
  const p = player.body.p, b = m.body, d = Math.hypot(p.x - b.p.x, p.z - b.p.z);
  if (collides(b, b.p.x, b.p.y, b.p.z)) b.p.y = Math.floor(b.p.y) + 1; // si quedó trabado adentro de un bloque, subirlo
  m.atkT -= dt; m.t -= dt; if (m.knock > 0) m.knock -= dt;
  if (m.knock > 0) { /* empujado: dejar que vuele */ }
  else if (m.kind === 'zombie') {
    if (!isNight()) { m.hp -= dt * 2.5; if (Math.random() < dt * 8) particle(b.p.clone().add(new THREE.Vector3((Math.random() - .5) * .5, 1.6, (Math.random() - .5) * .5)), new THREE.Vector3(0, 1.5, 0), Math.random() < .5 ? '#ff8a2a' : '#555', .14, .6, -1); if (m.hp <= 0) { killMob(m, true); return; } }
    const wolf = tamedWolves().find(w => w.body.p.distanceTo(b.p) < 1.6);
    if (d < 26) walkTo(m, p.x, p.z, 2.2, dt);
    else { if (m.t <= 0) { m.t = 2 + Math.random() * 2; const a = Math.random() * 6.28; m.dir.set(Math.cos(a), 0, Math.sin(a)); } walkTo(m, b.p.x + m.dir.x, b.p.z + m.dir.z, .9, dt); }
    if (d < 1.25 && Math.abs(p.y - b.p.y) < 1.6 && m.atkT <= 0) { m.atkT = 1.1; hurtPlayer(2, b.p); }
    else if (wolf && m.atkT <= 0) { m.atkT = 1.1; wolf.body.v.y = 4; }
  } else if (!m.tamed) {
    if (m.t <= 0) { m.t = 2 + Math.random() * 3; if (Math.random() < .4) m.dir.set(0, 0, 0); else { const a = Math.random() * 6.28; m.dir.set(Math.cos(a), 0, Math.sin(a)); } if (b.p.distanceTo(m.home) > 7) m.dir.copy(m.home).sub(b.p).setY(0).normalize(); }
    if (m.dir.x || m.dir.z) walkTo(m, b.p.x + m.dir.x, b.p.z + m.dir.z, 1.4, dt); else { b.v.x *= .8; b.v.z *= .8; }
    if (d > 44) { removeMob(m); return; }
  } else {
    const z = nearestZombie(p, 12);
    if (z) { walkTo(m, z.body.p.x, z.body.p.z, 5.2, dt); if (z.body.p.distanceTo(b.p) < 1.5 && m.atkT <= 0) { m.atkT = .8; hurtMob(z, 3, b.p); } }
    else {
      // pasean alrededor tuyo, igual que los Pokémon
      m.roamT = (m.roamT || 0) - dt;
      if (!m.roam || m.roamT <= 0) { const a = Math.random() * 6.28, r = 3 + Math.random() * 3.5; m.roam = { x: Math.cos(a) * r, z: Math.sin(a) * r }; m.roamT = 3 + Math.random() * 4; }
      const gx = p.x + m.roam.x, gz = p.z + m.roam.z, gd = Math.hypot(gx - b.p.x, gz - b.p.z);
      if (gd > .8) walkTo(m, gx, gz, d > 9 ? Math.min(6.5, 2 + d * .5) : Math.min(2.4, 1 + gd * .6), dt);
      else { b.v.x *= .8; b.v.z *= .8; if (Math.random() < dt) m.tyaw = Math.atan2(p.x - b.p.x, p.z - b.p.z); }
    }
    if (d > 24 || p.y - b.p.y > 8) { const a = Math.random() * 6.28, tx = p.x + Math.cos(a) * 3, tz = p.z + Math.sin(a) * 3; b.p.set(tx, (surfaceY(tx, tz) || p.y) + .3, tz); b.v.set(0, 0, 0); }
  }
  // no caminar al agua ni a precipicios (salvo los amaestrados que siguen)
  if (!m.tamed && (b.v.x || b.v.z)) { const l = Math.hypot(b.v.x, b.v.z) || 1, sy = surfaceY(b.p.x + b.v.x / l * .7, b.p.z + b.v.z / l * .7); if (sy === null || sy < b.p.y - 2.5) { b.v.x = -b.v.x; b.v.z = -b.v.z; m.dir.multiplyScalar(-1); } }
  moveBody(b, dt);
  if (m.tyaw !== undefined) m.yaw = angLerp(m.yaw, m.tyaw, Math.min(1, dt * 8));
  m.model.position.copy(b.p); m.model.rotation.y = m.yaw;
  animLegs(m, dt, Math.hypot(b.v.x, b.v.z)); placeShadow(m.shadow, b.p, .9);
}

// --- flechas
function shootArrow(target) {
  if (adv.flechas < 1) { toast('No te quedan flechas. Hacé más en "Hacer" (1 madera + 1 piedra = 4).', 2600); beep(120, .12); return; }
  adv.flechas--; updateAdvUI();
  const from = player.body.p.clone().add(new THREE.Vector3(0, 1.35, 0)), dir = target.clone().sub(from), dist = dir.length();
  dir.normalize(); dir.y += Math.min(.25, dist * .006);
  player.yaw = Math.atan2(dir.x, dir.z); player.throwT = .3;
  const a = { m: makeArrowMesh(), v: dir.multiplyScalar(32), life: 3, stuck: false };
  a.m.position.copy(from).addScaledVector(a.v, .02); scene.add(a.m); arrows.push(a);
  beep(700, .05, 'triangle'); setTimeout(() => beep(420, .06, 'triangle'), 40);
}
function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i]; a.life -= dt;
    if (a.life <= 0) { scene.remove(a.m); arrows.splice(i, 1); continue; }
    if (a.stuck) continue;
    const steps = 3;
    for (let s = 0; s < steps && !a.stuck; s++) {
      a.v.y -= 12 * dt / steps; a.m.position.addScaledVector(a.v, dt / steps);
      const q = a.m.position;
      const hit = mobs.find(m => m.alive && m.kind === 'zombie' && Math.hypot(q.x - m.body.p.x, q.z - m.body.p.z) < .5 && q.y > m.body.p.y && q.y < m.body.p.y + 1.9);
      if (hit) { hurtMob(hit, 5, q.clone().sub(a.v)); scene.remove(a.m); arrows.splice(i, 1); a.stuck = true; a.gone = true; break; }
      if (SOLID[get(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z))]) { a.stuck = true; a.life = Math.min(a.life, 2); beep(240, .04); }
    }
    if (!a.gone) a.m.lookAt(a.m.position.clone().add(a.v));
  }
}

// --- tocar zombies y lobos (devuelve true si el toque fue para ellos)
function advTap(rayc, hv, hitC) {
  if (!ADV) return false;
  const hm = mobs.length ? rayc.intersectObjects(mobs.map(m => m.model), true) : [];
  const mobHit = hm.length && (!hv || hm[0].distance < hv.t + .3) && (!hitC || hm[0].distance < hitC.distance) ? hm[0] : null;
  if (mobHit) {
    const m = mobHit.object.userData.mob; if (!m) return true;
    const d = m.body.p.distanceTo(player.body.p);
    if (m.kind === 'wolf') {
      if (m.tamed) { hearts(m.body.p); m.body.v.y = 4; beep(880, .08, 'sine'); return true; }
      if (d > 5) { toast('Acercate al lobo.'); return true; }
      if (adv.huesos < 1) { toast('Los lobos se amaestran con huesos 🦴. Los zombies los sueltan de noche.', 3000); return true; }
      if (tamedWolves().length >= 10) { toast('Ya tenés 10 lobos amigos.'); return true; }
      adv.huesos--; player.throwT = .3;
      if (Math.random() < .45) { m.tamed = true; m.model.userData.rig.collar.visible = true; adv.lobos = tamedWolves().length; hearts(m.body.p); hearts(m.body.p); toast('¡El lobo ahora es tu amigo! Te va a cuidar de los zombies.', 3000); [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f, .1, 'sine'), i * 90)); }
      else { for (let i = 0; i < 6; i++) particle(m.body.p.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3((Math.random() - .5), 1.5, (Math.random() - .5)), '#888', .1, .7, 0); toast('El lobo se comió el hueso pero todavía no confía. Probá con otro.', 2600); beep(300, .1); }
      updateAdvUI(); saveSoon(); return true;
    }
    // zombie
    if (adv.arma === 'arco') { shootArrow(m.body.p.clone().add(new THREE.Vector3(0, 1.1, 0))); return true; }
    if (d > 4) { toast('Acercate para pegarle.'); return true; }
    player.yaw = Math.atan2(m.body.p.x - player.body.p.x, m.body.p.z - player.body.p.z); player.throwT = .3;
    hurtMob(m, adv.arma === 'espada' ? 4 : 1, player.body.p); return true;
  }
  if (adv.arma === 'arco' && !hitC) {
    const t = hv ? new THREE.Vector3(hv.x + .5, hv.y + .5, hv.z + .5) : rayc.ray.origin.clone().addScaledVector(rayc.ray.direction, 40);
    shootArrow(t); return true;
  }
  return false;
}

// --- mesa de trabajo (en aventura el botón "Hacer" abre recetas)
const RECIPES = [
  { id: 'cubo', name: 'Cubo atrapador', icon: '🟫', need: { madera: 1, piedra: 1 }, make: () => { cubes++; } },
  { id: 'espada', name: 'Espada', icon: '🗡️', need: { madera: 1, piedra: 2 }, once: () => adv.espada, make: () => { adv.espada = true; adv.arma = 'espada'; } },
  { id: 'arco', name: 'Arco', icon: '🏹', need: { madera: 3, pasto: 2 }, once: () => adv.arco, make: () => { adv.arco = true; adv.arma = 'arco'; adv.flechas += 4; } },
  { id: 'flechas', name: '4 flechas', icon: '➶', need: { madera: 1, piedra: 1 }, make: () => { adv.flechas += 4; } }
];
const NEEDNAME = { madera: 'madera', piedra: 'piedra', pasto: 'pasto alto' };
function renderCraft() {
  const box = $('craftList'); box.innerHTML = '';
  RECIPES.forEach(r => {
    const have = r.once && r.once(), ok = !have && Object.keys(r.need).every(k => inv[k] >= r.need[k]);
    const b = document.createElement('button'); b.className = 'recipe' + (ok ? '' : ' off');
    b.innerHTML = '<i>' + r.icon + '</i><strong>' + r.name + '</strong><span>' + (have ? 'Ya la tenés' : Object.keys(r.need).map(k => r.need[k] + ' ' + NEEDNAME[k] + ' (tenés ' + inv[k] + ')').join(' + ')) + '</span>';
    b.addEventListener('click', () => {
      if (!ok) { beep(120, .1); $('craftMsg').textContent = have ? 'Ya tenés ' + r.name.toLowerCase() + '.' : 'Te falta material. Rompé bloques para juntar.'; return; }
      Object.keys(r.need).forEach(k => inv[k] -= r.need[k]); r.make();
      beep(520, .1); setTimeout(() => beep(780, .12), 90); $('craftMsg').textContent = '¡Hiciste ' + r.name.toLowerCase() + '!';
      showWeapon(); updateUI(); updateAdvUI(); renderCraft(); saveSoon();
    });
    box.appendChild(b);
  });
}
function openCraft() { if (!running) return; running = false; $('craftMsg').textContent = 'Elegí qué hacer.'; renderCraft(); $('craftOv').hidden = false; }
$('craftClose').addEventListener('click', () => { $('craftOv').hidden = true; running = true; last = performance.now(); });
function cycleWeapon() {
  const own = ['mano'].concat(adv.espada ? ['espada'] : [], adv.arco ? ['arco'] : []);
  if (own.length === 1) { toast('Hacé una espada o un arco con el botón "Hacer".', 2400); beep(120, .1); return; }
  adv.arma = own[(own.indexOf(adv.arma) + 1) % own.length]; showWeapon(); updateAdvUI(); beep(400, .05);
  toast(adv.arma === 'mano' ? 'Mano' : adv.arma === 'espada' ? 'Espada: tocá un zombie cerca para pegarle' : 'Arco: tocá donde quieras tirar una flecha', 1600);
}
$('armaBtn').addEventListener('click', cycleWeapon);
function updateAdvUI() {
  let h = ''; for (let i = 0; i < 10; i += 2) h += '<b class="' + (adv.hp >= i + 2 ? 'full' : adv.hp > i ? 'half' : '') + '"></b>';
  $('hearts').innerHTML = h;
  $('boneCount').textContent = adv.huesos; $('arrowCount').textContent = adv.flechas;
  $('clockIcon').textContent = isNight() ? '🌙' : '☀️';
  const br = IOS ? ' ' : '<br>'; // en iPhone el botón va arriba, en una sola línea
  $('armaBtn').innerHTML = adv.arma === 'mano' ? '✋' + br + 'Mano' : adv.arma === 'espada' ? '🗡️' + br + 'Espada' : '🏹' + br + 'Arco';
}
function setAdv(on, quiet) {
  ADV = on; document.body.classList.toggle('adv', on);
  $('craftBtn').innerHTML = IOS ? (on ? '🛠️ Hacer' : '🟫 Hacer cubo') : on ? 'Hacer<br>cosas' : 'Hacer<br>cubo';
  try { localStorage.setItem('bichos-modo', on ? 'aventura' : 'pokemon'); } catch (e) { }
  mobs.slice().forEach(removeMob); arrows.splice(0).forEach(a => scene.remove(a.m));
  if (on) { if (adv.hp <= 0) adv.hp = 10; spawnTamed(adv.lobos); }
  else tday = .3;
  wasNight = isNight(); lastLight = -1; updateSky(); showWeapon(); updateAdvUI();
  if (!quiet) toast(on ? 'Modo Aventura: de noche salen zombies. Hacé una espada en "Hacer".' : 'Modo Pokémon: siempre de día, tranquilo.', 3200);
}
function updateAdv(dt) {
  tday = (tday + dt / DAYLEN) % 1;
  hurtT -= dt; sinceHurt += dt;
  if (sinceHurt > 5 && adv.hp < 10 && (regenT -= dt) <= 0) { regenT = 3; adv.hp = Math.min(10, adv.hp + 1); updateAdvUI(); }
  const night = isNight();
  if (night !== wasNight) { wasNight = night; updateAdvUI(); toast(night ? '¡Se hizo de noche! Cuidado con los zombies 🧟' : '¡Amaneció! Los zombies se queman con el sol ☀️', 3200); beep(night ? 196 : 784, .3, 'triangle'); }
  if (night && (zSpawnT -= dt) <= 0) { zSpawnT = 3.5; if (mobs.filter(m => m.kind === 'zombie').length < 6) { const s = spotAround(14, 26); if (s) makeMob('zombie', s[0], s[1], s[2]); } }
  if ((wSpawnT -= dt) <= 0) { wSpawnT = 6; if (mobs.filter(m => m.kind === 'wolf' && !m.tamed).length < 3) { const s = spotAround(10, 26, (x, y, z) => nearType(x, y, z, 'arbol')); if (s) makeMob('wolf', s[0], s[1], s[2]); } }
  mobs.slice().forEach(m => { if (m.alive) updateMob(m, dt); });
  updateArrows(dt);
}

/* ================= Paw Patrol: cachorros que con un hueso son tus amigos ================= */
const PUPS = [
  { id: 'chase', name: 'Chase', fur: '#8a5a32', fur2: '#e8c89a', gear: '#1f4fb4', ears: 'up', say: '¡Chase está en camino!' },
  { id: 'marshall', name: 'Marshall', fur: '#f4f4f4', fur2: '#ffffff', gear: '#d8312a', ears: 'flop', spots: true, say: '¡Estoy encendido y listo!' },
  { id: 'skye', name: 'Skye', fur: '#d8b48a', fur2: '#f2e0c0', gear: '#ff7ab8', ears: 'flop', say: '¡Este cachorro va a volar!' },
  { id: 'rubble', name: 'Rubble', fur: '#c9a070', fur2: '#f2e6d0', gear: '#ffc61a', ears: 'small', say: '¡Rubble al rescate!' },
  { id: 'rocky', name: 'Rocky', fur: '#9a9a9a', fur2: '#e8e8e8', gear: '#3faa3f', ears: 'up', say: '¡No lo tires, reciclalo!' },
  { id: 'zuma', name: 'Zuma', fur: '#5a3a1e', fur2: '#7a5030', gear: '#f28a1a', ears: 'flop', say: '¡Vamos a zambullirnos!' },
  { id: 'everest', name: 'Everest', fur: '#a8b0b8', fur2: '#ffffff', gear: '#2ab8a8', ears: 'up', say: '¡Hielo o nieve, estoy lista!' },
  { id: 'tracker', name: 'Tracker', fur: '#c8a878', fur2: '#f0e0c0', gear: '#7a8a3a', ears: 'big', say: '¡Soy todo oídos!' },
  { id: 'rex', name: 'Rex', fur: '#e8d8b8', fur2: '#8a6a4a', gear: '#5ab84a', ears: 'flop', say: '¡Hora de los dinosaurios!' },
  { id: 'liberty', name: 'Liberty', fur: '#8a5a30', fur2: '#c08a5a', gear: '#b84ad8', ears: 'long', say: '¡Liberty lista para la ciudad!' },
  { id: 'ella', name: 'Ella', fur: '#f2e2c8', fur2: '#ffffff', gear: '#e8b830', ears: 'flop', say: '¡Gemelas poderosas en acción!' },
  { id: 'tuck', name: 'Tuck', fur: '#c8a070', fur2: '#f2e6d0', gear: '#e8b830', ears: 'flop', say: '¡Listo para el rescate!' }
];
const PUP = Object.fromEntries(PUPS.map(p => [p.id, p]));
function nameTag(text, col) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 2, 128, 28); g.fillStyle = col; g.fillRect(0, 2, 6, 28);
  g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(text, 66, 17);
  const tex = new THREE.CanvasTexture(cv); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1, .25, 1); return sp;
}
function makePup(d) {
  const g = new THREE.Group(), r = {};
  bx(g, .38, .34, .62, d.fur, 0, .44, 0); bx(g, .3, .2, .5, d.fur2, 0, .34, .02);
  bx(g, .42, .3, .44, d.gear, 0, .56, -.02); bx(g, .26, .2, .22, '#8a8a8a', 0, .74, -.08); // chaleco y mochila
  r.head = new THREE.Group(); r.head.position.set(0, .78, .34); g.add(r.head);
  bx(r.head, .44, .4, .38, d.fur, 0, .02, 0); bx(r.head, .24, .16, .18, d.fur2, 0, -.08, .24); bx(r.head, .1, .07, .05, '#1a1a1a', 0, -.03, .34);
  [-1, 1].forEach(k => { bx(r.head, .09, .1, .02, '#1a1a1a', k * .11, .06, .195); bx(r.head, .03, .03, .01, '#ffffff', k * .11 - .02, .09, .206); });
  const e = d.ears;
  [-1, 1].forEach(k => {
    if (e === 'up') bx(r.head, .1, .18, .08, d.fur, k * .15, .3, -.04);
    else if (e === 'big') bx(r.head, .2, .26, .06, d.fur, k * .26, .24, -.02);
    else if (e === 'small') bx(r.head, .1, .08, .1, d.fur2 === '#f2e6d0' ? '#a87a50' : d.fur, k * .2, .2, -.02);
    else bx(r.head, .08, e === 'long' ? .36 : .26, .14, d.fur === '#f4f4f4' ? '#2a2a2a' : d.fur2 === '#ffffff' ? d.fur : d.fur2, k * .25, e === 'long' ? -.04 : .02, -.02);
  });
  bx(r.head, .48, .12, .42, d.gear, 0, .25, -.01); bx(r.head, .34, .08, .3, d.gear, 0, .33, -.01); // casco
  bx(r.head, .12, .12, .02, '#ffd23f', 0, .25, .215, { emissive: '#806000' }); // placa
  bx(g, .16, .16, .04, '#ffd23f', 0, .58, .21, { emissive: '#806000' }); // placa en el collar
  if (d.spots) [[.12, .5, .2], [-.14, .46, -.1], [.1, .42, -.25]].forEach(([x, y, z]) => bx(g, .08, .08, .02, '#1a1a1a', x + (x > 0 ? .1 : -.1), y, z));
  r.legs = [[-.12, .2], [.12, .2], [-.12, -.2], [.12, -.2]].map(([x, z]) => { const l = new THREE.Group(); l.position.set(x, .3, z); g.add(l); bx(l, .1, .3, .1, d.fur, 0, -.15, 0); return l; });
  r.legL = r.legs[0]; r.legR = r.legs[1];
  r.tail = new THREE.Group(); r.tail.position.set(0, .56, -.32); g.add(r.tail); bx(r.tail, .08, .08, .26, d.fur, 0, 0, -.1); r.tail.rotation.x = .7;
  const tag = nameTag(d.name, d.gear); tag.position.set(0, 1.4, 0); g.add(tag);
  g.userData.rig = r; return g;
}

/* ================= pueblo: aldeanos, gallinas y el golem gigante ================= */
const town = [];
function makeVillager(k) {
  const g = new THREE.Group(), r = {}, ROBE = ['#7a4a2a', '#4a6a3a', '#5a4a8a', '#8a3a3a'][k % 4], SK = '#d9a07a';
  r.legL = new THREE.Group(); r.legL.position.set(-.12, .5, 0); g.add(r.legL); bx(r.legL, .22, .5, .24, '#3a2a1a', 0, -.25, 0);
  r.legR = new THREE.Group(); r.legR.position.set(.12, .5, 0); g.add(r.legR); bx(r.legR, .22, .5, .24, '#3a2a1a', 0, -.25, 0);
  bx(g, .54, .8, .34, ROBE, 0, .9, 0); bx(g, .62, .22, .3, ROBE, 0, 1.0, .2); // brazos cruzados
  bx(g, .5, .5, .46, SK, 0, 1.55, 0); bx(g, .12, .22, .12, '#c08060', 0, 1.42, .28); // cabeza y narizota
  bx(g, .52, .1, .48, '#5a3a20', 0, 1.82, 0);
  [-1, 1].forEach(s => { bx(g, .08, .06, .02, '#ffffff', s * .12, 1.6, .235); bx(g, .04, .06, .02, '#2a5a2a', s * .12, 1.6, .245); });
  bx(g, .54, .06, .03, '#2a1a10', 0, 1.7, .235); // cejas
  g.userData.rig = r; return g;
}
function makeChicken() {
  const g = new THREE.Group(), r = {};
  bx(g, .34, .3, .44, '#f6f6f2', 0, .38, 0);
  r.head = bx(g, .2, .26, .18, '#f6f6f2', 0, .62, .22); bx(g, .12, .06, .1, '#f2a020', 0, .6, .34); bx(g, .06, .1, .04, '#e0302a', 0, .53, .32); bx(g, .08, .08, .08, '#e0302a', 0, .78, .22);
  [-1, 1].forEach(s => bx(g, .02, .04, .04, '#111', s * .1, .66, .3));
  r.wingL = bx(g, .04, .2, .3, '#e6e6e0', -.19, .4, 0); r.wingR = bx(g, .04, .2, .3, '#e6e6e0', .19, .4, 0);
  r.legL = new THREE.Group(); r.legL.position.set(-.07, .24, 0); g.add(r.legL); bx(r.legL, .04, .24, .04, '#f2a020', 0, -.12, 0);
  r.legR = new THREE.Group(); r.legR.position.set(.07, .24, 0); g.add(r.legR); bx(r.legR, .04, .24, .04, '#f2a020', 0, -.12, 0);
  g.userData.rig = r; return g;
}
function makeGolem() {
  const g = new THREE.Group(), r = {}, IR = '#d6d0c4', IR2 = '#b8b0a2', VI = '#4a8a2a';
  r.legL = new THREE.Group(); r.legL.position.set(-.3, 1.0, 0); g.add(r.legL); bx(r.legL, .42, 1.0, .46, IR2, 0, -.5, 0);
  r.legR = new THREE.Group(); r.legR.position.set(.3, 1.0, 0); g.add(r.legR); bx(r.legR, .42, 1.0, .46, IR2, 0, -.5, 0);
  bx(g, .8, .3, .5, IR2, 0, 1.1, 0); bx(g, 1.4, .95, .8, IR, 0, 1.75, 0);
  bx(g, .3, .5, .05, VI, -.35, 1.7, .41); bx(g, .2, .3, .05, VI, .4, 1.9, .41); bx(g, .05, .5, .3, VI, .71, 1.6, .1);
  r.armL = new THREE.Group(); r.armL.position.set(-.85, 2.1, 0); g.add(r.armL); bx(r.armL, .32, 1.6, .4, IR, 0, -.8, 0);
  r.armR = new THREE.Group(); r.armR.position.set(.85, 2.1, 0); g.add(r.armR); bx(r.armR, .32, 1.6, .4, IR, 0, -.8, 0);
  bx(g, .56, .6, .56, IR, 0, 2.5, .05); bx(g, .14, .26, .12, IR2, 0, 2.38, .38); bx(g, .5, .08, .1, '#8a8478', 0, 2.62, .34);
  [-1, 1].forEach(s => bx(g, .1, .08, .02, '#7a1a1a', s * .14, 2.55, .335));
  g.userData.rig = r; return g;
}
// dinosaurios que cuidan el pueblo
function makeTrex() {
  const g = new THREE.Group(), r = {}, G = '#5f8a3a', G2 = '#4a6e2c', B2 = '#c8c08a';
  r.legL = new THREE.Group(); r.legL.position.set(-.4, 1.4, -.1); g.add(r.legL); bx(r.legL, .5, 1.0, .6, G2, 0, -.4, 0); bx(r.legL, .5, .2, .8, G2, 0, -1.3, .15); bx(r.legL, .4, .5, .4, G2, 0, -1.05, 0);
  r.legR = new THREE.Group(); r.legR.position.set(.4, 1.4, -.1); g.add(r.legR); bx(r.legR, .5, 1.0, .6, G2, 0, -.4, 0); bx(r.legR, .5, .2, .8, G2, 0, -1.3, .15); bx(r.legR, .4, .5, .4, G2, 0, -1.05, 0);
  bx(g, 1.1, 1.1, 1.8, G, 0, 1.9, 0); bx(g, .9, .8, 1.4, B2, 0, 1.6, .15); // cuerpo y panza
  bx(g, .8, .8, .7, G, 0, 2.5, .95); // cuello
  r.tail = new THREE.Group(); r.tail.position.set(0, 1.9, -.9); g.add(r.tail); bx(r.tail, .8, .7, 1.2, G, 0, 0, -.5); bx(r.tail, .5, .45, 1.1, G, 0, -.1, -1.5); bx(r.tail, .25, .25, .8, G, 0, -.2, -2.3);
  r.head = new THREE.Group(); r.head.position.set(0, 2.9, 1.2); g.add(r.head);
  bx(r.head, .9, .65, 1.25, G, 0, .1, .45); bx(r.head, .92, .1, .9, '#f2f2e0', 0, -.22, .6); // dientes
  [-1, 1].forEach(k => { bx(r.head, .06, .16, .16, '#ffd23f', k * .46, .28, .3); bx(r.head, .04, .1, .08, '#111', k * .48, .28, .33); });
  r.jaw = new THREE.Group(); r.jaw.position.set(0, -.25, .05); r.head.add(r.jaw); bx(r.jaw, .8, .25, 1.0, G2, 0, -.12, .45); bx(r.jaw, .78, .08, .8, '#f2f2e0', 0, .02, .5);
  [-1, 1].forEach(k => { const a = bx(g, .14, .4, .14, G2, k * .45, 1.8, .85); a.rotation.x = -.8; }); // bracitos
  [[.2, 2.5, -.3], [-.3, 2.2, .3], [.35, 1.6, -.5]].forEach(([x, y, z]) => bx(g, .2, .2, .02, G2, x > 0 ? .56 : -.56, y, z));
  g.userData.rig = r; return g;
}
function makeRaptor() {
  const g = new THREE.Group(), r = {}, O = '#b8743a', O2 = '#7a4a22', W = '#e8d8b8';
  r.legL = new THREE.Group(); r.legL.position.set(-.16, .75, 0); g.add(r.legL); bx(r.legL, .16, .5, .22, O2, 0, -.2, 0); bx(r.legL, .12, .35, .12, O2, 0, -.55, .05); bx(r.legL, .14, .08, .3, O2, 0, -.72, .12);
  r.legR = new THREE.Group(); r.legR.position.set(.16, .75, 0); g.add(r.legR); bx(r.legR, .16, .5, .22, O2, 0, -.2, 0); bx(r.legR, .12, .35, .12, O2, 0, -.55, .05); bx(r.legR, .14, .08, .3, O2, 0, -.72, .12);
  bx(g, .4, .42, .9, O, 0, .95, 0); bx(g, .3, .3, .6, W, 0, .85, .1);
  [-.3, 0, .3].forEach(z => bx(g, .42, .1, .1, O2, 0, 1.12, z)); // rayas
  bx(g, .26, .26, .4, O, 0, 1.2, .55);
  r.tail = new THREE.Group(); r.tail.position.set(0, 1.0, -.45); g.add(r.tail); bx(r.tail, .26, .24, .7, O, 0, 0, -.3); bx(r.tail, .14, .14, .7, O2, 0, .02, -.9);
  r.head = new THREE.Group(); r.head.position.set(0, 1.35, .75); g.add(r.head);
  bx(r.head, .3, .28, .55, O, 0, 0, .15); bx(r.head, .32, .05, .4, '#f2f2e0', 0, -.12, .25);
  [-1, 1].forEach(k => { bx(r.head, .04, .08, .08, '#ffd23f', k * .16, .06, .12); bx(r.head, .02, .05, .04, '#111', k * .17, .06, .14); });
  r.jaw = new THREE.Group(); r.jaw.position.set(0, -.13, .05); r.head.add(r.jaw); bx(r.jaw, .26, .08, .45, O2, 0, -.03, .2);
  [-1, 1].forEach(k => { const a = bx(g, .08, .3, .08, O2, k * .2, .95, .5); a.rotation.x = -.9; });
  g.userData.rig = r; return g;
}
const NPCDIM = { aldeano: [.3, 1.9, .9], gallina: [.2, .6, .5], pup: [.25, .95, .9], golem: [.6, 2.8, 1.8], trex: [.85, 3.3, 2.6], raptor: [.32, 1.5, 1] };
const DINO = { trex: { name: 'T-Rex', huesos: 2, col: '#5f8a3a' }, raptor: { name: 'Velociraptor', huesos: 1, col: '#b8743a' } };
function makeNpc(kind, x, y, z, k) {
  const dm = NPCDIM[kind];
  const n = { kind, k, model: kind === 'aldeano' ? makeVillager(k) : kind === 'gallina' ? makeChicken() : kind === 'pup' ? makePup(PUP[k]) : kind === 'trex' ? makeTrex() : kind === 'raptor' ? makeRaptor() : makeGolem(),
    body: newBody(dm[0], dm[1]),
    yaw: Math.random() * 6, t: 0, dir: new THREE.Vector3(), phase: 0, atkT: 0, gift: 0, home: k };
  n.body.p.set(x, y, z); n.body.jumpV = kind === 'golem' || kind === 'trex' ? 9 : 7.5; n.base = new THREE.Vector3(x, y, z);
  if (DINO[kind]) { const tag = nameTag(DINO[kind].name, DINO[kind].col); tag.position.set(0, dm[1] + .4, 0); n.model.add(tag); }
  if (kind === 'pup') { n.pup = PUP[k]; n.tamed = adv.pups.includes(k); }
  n.model.traverse(o => { o.userData.npc = n; }); scene.add(n.model); n.shadow = makeShadow(dm[2]);
  town.push(n); return n;
}
function spawnTown() {
  town.splice(0).forEach(n => { scene.remove(n.model); scene.remove(n.shadow); });
  if (!village) return;
  const v = village, rr = () => (Math.random() - .5) * 8;
  for (let i = 0; i < 4; i++) makeNpc('aldeano', v.x + rr(), v.y + .1, v.z + (Math.random() - .5) * 3, i);
  for (let i = 0; i < 5; i++) makeNpc('gallina', v.x + rr() * 1.4, v.y + .1, v.z + (Math.random() - .5) * 6, i);
  const p = adv.golem ? player.body.p : v;
  makeNpc('golem', p.x + 2, (surfaceY(p.x + 2, p.z + 2) || v.y) + .1, p.z + 2, 0);
  [['trex', 6, -4], ['raptor', -6, 4]].forEach(([k, ox, oz]) => { const q = adv.dinos.includes(k) ? player.body.p : v, x = q.x + ox, z = q.z + oz; makeNpc(k, x, (surfaceY(x, z) || v.y) + .1, z, 0); });
  spawnPups();
}
function spawnPups() {
  PUPS.forEach((d, i) => {
    let x, z, y = null;
    if (adv.pups.includes(d.id)) { const a = i * .9, pp = player.body.p; x = pp.x + Math.cos(a) * 4; z = pp.z + Math.sin(a) * 4; y = surfaceY(x, z); }
    for (let t = 0; t < 40 && !y; t++) { const a = Math.random() * 6.28, r = 6 + Math.random() * WX * .3; x = WX / 2 + Math.cos(a) * r; z = WZ / 2 + Math.sin(a) * r; const sy = surfaceY(x, z); if (sy && sy > SEA + 1) y = sy; }
    makeNpc('pup', x, (y || SEA + 3) + .1, z, d.id);
  });
}
const golem = () => town.find(n => n.kind === 'golem');
function npcWalk(n, tx, tz, speed, dt) {
  const dx = tx - n.body.p.x, dz = tz - n.body.p.z, d = Math.hypot(dx, dz) || 1, k = Math.min(1, dt * 6);
  n.body.v.x += (dx / d * speed - n.body.v.x) * k; n.body.v.z += (dz / d * speed - n.body.v.z) * k; n.tyaw = Math.atan2(dx, dz);
}
function npcWander(n, cx, cz, rad, speed, dt) {
  if (n.t <= 0) { n.t = 2 + Math.random() * 3; if (Math.random() < .35) n.dir.set(0, 0, 0); else { const a = Math.random() * 6.28; n.dir.set(Math.cos(a), 0, Math.sin(a)); } if (Math.hypot(n.body.p.x - cx, n.body.p.z - cz) > rad) n.dir.set(cx - n.body.p.x, 0, cz - n.body.p.z).normalize(); }
  if (n.dir.x || n.dir.z) npcWalk(n, n.body.p.x + n.dir.x, n.body.p.z + n.dir.z, speed, dt); else { n.body.v.x *= .8; n.body.v.z *= .8; }
}
const PHRASES = ['El T-Rex y el raptor cuidan el pueblo. ¡Les encantan los huesos!', '¡Los cachorros de la Patrulla Canina andan por la isla!', '¡Hola, explorador!', '¡Qué lindos tus Pokémon!', 'Hmmm… hmm.', '¡Cuidado con los zombies de noche!', '¿Viste el cohete? ¡Vuela altísimo!', 'Las gallinas se escaparon otra vez…', 'El golem nos cuida. ¡Es muy fuerte!'];
function updateNpc(n, dt) {
  const b = n.body, p = player.body.p, d = Math.hypot(p.x - b.p.x, p.z - b.p.z);
  if (collides(b, b.p.x, b.p.y, b.p.z)) b.p.y = Math.floor(b.p.y) + 1;
  n.t -= dt; n.atkT -= dt;
  if (n.kind === 'aldeano') {
    const h = village && village.houses[n.k % village.houses.length];
    if (ADV && isNight() && h) { // de noche se van a dormir a su casita
      if (!n.inside) { npcWalk(n, h.door[0], h.door[2], 1.8, dt); if (Math.hypot(h.door[0] - b.p.x, h.door[2] - b.p.z) < 1.3 || n.t < -25) { n.inside = true; n.model.visible = false; n.shadow.visible = false; } }
      else return;
    } else {
      if (n.inside) { n.inside = false; n.model.visible = true; if (h) b.p.set(h.door[0], h.door[1] + .1, h.door[2]); }
      if (d < 3) { b.v.x *= .7; b.v.z *= .7; n.tyaw = Math.atan2(p.x - b.p.x, p.z - b.p.z); n.t = Math.max(n.t, .5); } // se queda mirándote
      else if (village) npcWander(n, village.x, village.z, 8, 1.1, dt);
    }
  } else if (n.kind === 'gallina') {
    if (village) npcWander(n, village.x, village.z, 10, .9, dt);
    if (b.ground && (n.dir.x || n.dir.z) && Math.random() < dt * .6) b.v.y = 3;
  } else if (n.kind === 'pup') {
    if (n.tamed) {
      const z = ADV && nearestZombie(p, 14);
      if (z) { npcWalk(n, z.body.p.x, z.body.p.z, 5.6, dt); if (z.body.p.distanceTo(b.p) < 1.6 && n.atkT <= 0) { n.atkT = .8; hurtMob(z, 3, b.p); b.v.y = 4; beep(500, .05, 'square', .04); } }
      else {
        if (d > 26 || p.y - b.p.y > 8) { const a = Math.random() * 6.28, tx = p.x + Math.cos(a) * 4, tz = p.z + Math.sin(a) * 4; b.p.set(tx, (surfaceY(tx, tz) || p.y) + .2, tz); b.v.set(0, 0, 0); }
        n.roamT = (n.roamT || 0) - dt;
        if (!n.roam || n.roamT <= 0) { const a = Math.random() * 6.28, r = 3 + Math.random() * 4; n.roam = { x: Math.cos(a) * r, z: Math.sin(a) * r }; n.roamT = 3 + Math.random() * 4; }
        const gx = p.x + n.roam.x, gz = p.z + n.roam.z, gd = Math.hypot(gx - b.p.x, gz - b.p.z);
        if (surfaceY(gx, gz) === null) n.roamT = 0;
        if (gd > .8) npcWalk(n, gx, gz, d > 9 ? Math.min(7, 2 + d * .5) : Math.min(2.4, 1 + gd * .6), dt);
        else { b.v.x *= .8; b.v.z *= .8; if (Math.random() < dt) n.tyaw = Math.atan2(p.x - b.p.x, p.z - b.p.z); }
      }
    } else npcWander(n, n.base.x, n.base.z, 9, 1.3, dt);
    if (b.ground && Math.random() < dt * .15) b.v.y = 3.5; // saltitos de contento
  } else if (DINO[n.kind]) { // T-Rex y Velociraptor: cuidan el pueblo, o a vos si son tus amigos
    const tamed = adv.dinos.includes(n.kind), rex = n.kind === 'trex', home = village || n.base;
    const z = ADV && nearestZombie(tamed ? p : home, tamed ? 16 : 15);
    if (z) {
      npcWalk(n, z.body.p.x, z.body.p.z, rex ? 3.8 : 6.5, dt);
      if (z.body.p.distanceTo(b.p) < (rex ? 3 : 1.7) && n.atkT <= 0) { n.atkT = rex ? 1.4 : .7; n.bite = .4; hurtMob(z, rex ? 10 : 4, b.p); if (rex) { z.body.v.y = 9; beep(70, .35, 'sawtooth', .08); } else beep(600, .06, 'square', .05); }
    } else if (tamed) {
      if (d > 32) { const tx = p.x + 4, tz = p.z + 4; b.p.set(tx, (surfaceY(tx, tz) || p.y) + .2, tz); b.v.set(0, 0, 0); }
      n.roamT = (n.roamT || 0) - dt;
      if (!n.roam || n.roamT <= 0) { const a = Math.random() * 6.28, r = (rex ? 5 : 3) + Math.random() * 3; n.roam = { x: Math.cos(a) * r, z: Math.sin(a) * r }; n.roamT = 3 + Math.random() * 4; }
      const gx = p.x + n.roam.x, gz = p.z + n.roam.z, gd = Math.hypot(gx - b.p.x, gz - b.p.z);
      if (gd > 1) npcWalk(n, gx, gz, d > 10 ? (rex ? 5 : 7) : (rex ? 1.6 : 2.6), dt); else { b.v.x *= .8; b.v.z *= .8; }
    } else npcWander(n, home.x, home.z, 12, rex ? 1.2 : 2.2, dt);
  } else { // golem
    const guard = adv.golem, z = ADV && nearestZombie(guard ? p : b.p, guard ? 16 : 12);
    if (z) {
      npcWalk(n, z.body.p.x, z.body.p.z, 3.4, dt);
      if (z.body.p.distanceTo(b.p) < 2.3 && n.atkT <= 0) { n.atkT = 1.3; n.swing = .5; hurtMob(z, 8, b.p); z.body.v.y = 11; beep(90, .2, 'square', .08); }
    } else if (guard) {
      if (d > 32) { const tx = p.x + 3, tz = p.z + 3; b.p.set(tx, (surfaceY(tx, tz) || p.y) + .2, tz); b.v.set(0, 0, 0); }
      n.roamT = (n.roamT || 0) - dt;
      if (!n.roam || n.roamT <= 0) { const a = Math.random() * 6.28, r = 4 + Math.random() * 3; n.roam = { x: Math.cos(a) * r, z: Math.sin(a) * r }; n.roamT = 4 + Math.random() * 4; }
      const gx = p.x + n.roam.x, gz = p.z + n.roam.z, gd = Math.hypot(gx - b.p.x, gz - b.p.z);
      if (gd > 1) npcWalk(n, gx, gz, d > 10 ? 4.5 : 1.8, dt); else { b.v.x *= .8; b.v.z *= .8; }
    } else if (village) npcWander(n, village.x, village.z, 9, 1, dt);
  }
  // no meterse al agua
  if (b.v.x || b.v.z) { const l = Math.hypot(b.v.x, b.v.z) || 1, sy = surfaceY(b.p.x + b.v.x / l * .8, b.p.z + b.v.z / l * .8); if (sy === null) { b.v.x = -b.v.x; b.v.z = -b.v.z; n.dir.multiplyScalar(-1); } }
  moveBody(b, dt);
  if (n.tyaw !== undefined) n.yaw = angLerp(n.yaw, n.tyaw, Math.min(1, dt * 6));
  n.model.position.copy(b.p); n.model.rotation.y = n.yaw;
  const r = n.model.userData.rig, sp = Math.hypot(b.v.x, b.v.z); n.phase += dt * sp * (n.kind === 'gallina' ? 6 : n.kind === 'golem' ? 1.6 : 2.6);
  const sw = Math.sin(n.phase) * Math.min(1, sp / 1.5) * .6;
  r.legL.rotation.x = sw; r.legR.rotation.x = -sw;
  if (DINO[n.kind]) { n.bite = Math.max(0, (n.bite || 0) - dt); r.jaw.rotation.x = n.bite > 0 ? .7 * Math.sin(n.bite / .4 * Math.PI) : Math.max(0, Math.sin(performance.now() * .002 + n.phase)) * .08; r.tail.rotation.y = Math.sin(performance.now() * .003 + n.phase) * .25; r.head.rotation.y = Math.sin(performance.now() * .0015) * .15; }
  if (n.kind === 'golem') { n.swing = Math.max(0, (n.swing || 0) - dt); const up = n.swing > 0 ? -2.2 * Math.sin(n.swing / .5 * Math.PI) : 0; r.armL.rotation.x = -sw * .6 + up; r.armR.rotation.x = sw * .6 + up; }
  if (n.kind === 'pup') { r.legs[2].rotation.x = -sw; r.legs[3].rotation.x = sw; r.tail.rotation.y = Math.sin(performance.now() * (n.tamed ? .02 : .008) + n.phase) * .6; }
  if (n.kind === 'gallina') { const f = !b.ground ? Math.sin(performance.now() * .04) * .8 : 0; r.wingL.rotation.z = f; r.wingR.rotation.z = -f; r.head.rotation.x = sp < .2 && Math.sin(performance.now() * .003 + n.k) > .7 ? .6 : 0; }
  placeShadow(n.shadow, b.p, NPCDIM[n.kind][2]);
}
const pupFriends = () => town.filter(n => n.kind === 'pup' && n.tamed);
function tapNpc(n) {
  const d = n.body.p.distanceTo(player.body.p);
  if (n.kind === 'gallina') { n.body.v.y = 4.5; n.dir.set(Math.random() - .5, 0, Math.random() - .5).normalize(); n.t = 1.5; beep(1100, .05, 'square', .04); setTimeout(() => beep(900, .07, 'square', .04), 70); toast('¡Cocorocó! 🐔', 1000); return; }
  if (d > (DINO[n.kind] ? 11 : 7)) { toast('Acercate más.'); return; }
  if (n.kind === 'pup') {
    const pd = n.pup;
    if (n.tamed) { hearts(n.body.p); n.body.v.y = 5; toast(pd.name + ': "' + pd.say + '"', 2200); beep(880, .06, 'sine'); setTimeout(() => beep(1175, .08, 'sine'), 70); return; }
    if (adv.huesos < 1) { toast('Necesitás un hueso 🦴 para que ' + pd.name + ' sea tu amigo. Los aldeanos regalan huesos' + (ADV ? ' y los zombies los sueltan.' : '.'), 3200); beep(200, .1); return; }
    adv.huesos--; n.tamed = true; if (!adv.pups.includes(pd.id)) adv.pups.push(pd.id);
    hearts(n.body.p); hearts(n.body.p); n.body.v.y = 6; player.throwT = .3;
    toast('¡' + pd.name + ' es tu amigo! "' + pd.say + '"', 3200); [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => beep(f, .09, 'sine'), i * 80));
    if (PUPS.every(q => adv.pups.includes(q.id))) setTimeout(() => toast('¡Tenés a toda la Patrulla Canina! 🐾', 3500), 3300);
    updateAdvUI(); saveSoon(); return;
  }
  if (n.kind === 'aldeano') {
    hearts(n.body.p.clone().add(new THREE.Vector3(0, 1, 0))); beep(330, .08, 'triangle'); setTimeout(() => beep(260, .1, 'triangle'), 90);
    if (performance.now() - n.gift > 90000) {
      n.gift = performance.now(); const q = Math.random();
      if (q < .3) { adv.huesos += 3; toast('Aldeano: "Tomá 3 huesos 🦴 para los cachorros."', 2600); }
      else if (q < .55) { cubes += 2; toast('Aldeano: "¡Hola! Tomá, 2 cubos atrapadores."', 2600); }
      else if (q < .75) { inv.madera += 3; inv.piedra += 3; toast('Aldeano: "Tomá madera y piedra para construir."', 2600); }
      else if (q < .9 && ADV) { adv.flechas += 6; toast('Aldeano: "Para la noche: 6 flechas."', 2600); }
      else { gems++; toast('Aldeano: "¡Encontré esta gema 💎! Te la regalo."', 2600); }
      updateUI(); updateAdvUI(); saveSoon();
    } else toast('Aldeano: "' + PHRASES[Math.floor(Math.random() * PHRASES.length)] + '"', 2200);
    return;
  }
  if (DINO[n.kind]) {
    const dd = DINO[n.kind], rex = n.kind === 'trex';
    n.bite = .4; hearts(n.body.p.clone().add(new THREE.Vector3(0, rex ? 3 : 1.4, 0)));
    if (rex) [90, 70, 55].forEach((f, i) => setTimeout(() => beep(f, .3, 'sawtooth', .08), i * 160)); else [900, 700, 1100].forEach((f, i) => setTimeout(() => beep(f, .07, 'square', .05), i * 80));
    if (adv.dinos.includes(n.kind)) { toast(rex ? '¡ROOOAR! El T-Rex te cuida 🦖' : '¡Iiiik! El Velociraptor está atento 🦖', 2000); return; }
    if (adv.huesos < dd.huesos) { toast('El ' + dd.name + ' cuida el pueblo. Para que sea tu amigo dale ' + dd.huesos + (dd.huesos > 1 ? ' huesos' : ' hueso') + ' 🦴 (tenés ' + adv.huesos + ').', 3200); return; }
    adv.huesos -= dd.huesos; adv.dinos.push(n.kind); n.roamT = 0;
    toast('¡El ' + dd.name + ' es tu amigo! Te sigue y te cuida de los zombies 🦖', 3400);
    updateAdvUI(); saveSoon(); return;
  }
  // golem
  hearts(n.body.p.clone().add(new THREE.Vector3(0, 2, 0)));
  if (!adv.golem) { adv.golem = true; toast('¡El golem gigante te va a cuidar! Te sigue y aplasta zombies.', 3200); [196, 262, 330].forEach((f, i) => setTimeout(() => beep(f, .18, 'triangle'), i * 120)); }
  else { inv.flor++; toast('El golem te regaló una flor 🌹', 1800); beep(660, .1, 'sine'); updateUI(); }
  saveSoon();
}

/* ================= vehículos: moto, auto y cohete ================= */
const vehicles = [];
let riding = null, vehHintT = 0;
const VEH = {
  moto: { name: 'la moto', hw: .4, h: 1.1, top: 13, turn: 3.6, cam: 1.5 },
  auto: { name: 'el auto', hw: .75, h: 1.5, top: 10.5, turn: 2.6, cam: 3 },
  cohete: { name: 'el cohete', hw: .6, h: 3.6, top: 9, turn: 4, cam: 5 }
};
function wheel(p, x, y, z, r) { const w = new THREE.Group(); w.position.set(x, y, z); p.add(w); bx(w, .2, r * 2, r * 2, '#1e1e1e'); bx(w, .22, r, r, '#9a9a9a'); return w; }
function makeMoto() {
  const g = new THREE.Group(), r = { wheels: [] };
  r.wheels.push(wheel(g, 0, .3, .62, .3), wheel(g, 0, .3, -.6, .3));
  bx(g, .26, .3, 1.0, '#e0302a', 0, .62, 0); bx(g, .3, .22, .5, '#e0302a', 0, .8, .25); bx(g, .28, .12, .46, '#1e1e1e', 0, .82, -.18);
  bx(g, .08, .5, .08, '#888', 0, .85, .58); bx(g, .7, .07, .07, '#1e1e1e', 0, 1.1, .55); bx(g, .16, .14, .06, '#fff3a0', 0, .9, .66, { emissive: '#ffe066' });
  bx(g, .1, .1, .5, '#9a9a9a', .16, .45, -.35);
  g.userData.rig = r; return g;
}
function makeCar() {
  const g = new THREE.Group(), r = { wheels: [] };
  [[-.72, .75], [.72, .75], [-.72, -.8], [.72, -.8]].forEach(([x, z]) => r.wheels.push(wheel(g, x, .32, z, .32)));
  bx(g, 1.4, .55, 2.5, '#2e7bd6', 0, .62, 0); bx(g, 1.3, .55, 1.3, '#2e7bd6', 0, 1.15, -.15);
  bx(g, 1.32, .4, 1.1, '#bfe6ff', 0, 1.18, -.15, { transparent: true, opacity: .75 });
  bx(g, 1.42, .1, 2.52, '#1d5aa0', 0, .38, 0);
  [-1, 1].forEach(s => { bx(g, .26, .14, .04, '#fff3a0', s * .48, .7, 1.26, { emissive: '#ffe066' }); bx(g, .24, .12, .04, '#e0302a', s * .5, .7, -1.26, { emissive: '#900' }); });
  bx(g, .5, .06, .04, '#e8e8e8', 0, .5, 1.26);
  g.userData.rig = r; return g;
}
function makeRocket() {
  const g = new THREE.Group(), r = {};
  bx(g, .9, 2.0, .9, '#f2f2f2', 0, 1.6, 0); bx(g, .7, .5, .7, '#e0302a', 0, 2.85, 0); bx(g, .44, .4, .44, '#e0302a', 0, 3.3, 0); bx(g, .2, .3, .2, '#e0302a', 0, 3.62, 0);
  bx(g, .5, .5, .06, '#4aa3f0', 0, 2.1, .46); bx(g, .6, .6, .04, '#9a9a9a', 0, 2.1, .45);
  [[.55, 0, 0, 0], [-.55, 0, 0, 0], [0, 0, .55, 1], [0, 0, -.55, 1]].forEach(([x, , z, rot]) => { const f = bx(g, rot ? .1 : .4, .8, rot ? .4 : .1, '#e0302a', x, .7, z); f.rotation.y = rot ? 0 : 0; });
  bx(g, .7, .3, .7, '#666', 0, .45, 0);
  r.flame = new THREE.Group(); r.flame.position.set(0, .25, 0); g.add(r.flame);
  bx(r.flame, .5, .5, .5, '#ff8c2a', 0, -.15, 0, { emissive: '#ff6a00' }); bx(r.flame, .3, .5, .3, '#ffe066', 0, -.35, 0, { emissive: '#ffcc00' });
  r.flame.visible = false;
  g.userData.rig = r; return g;
}
function makeVehicle(kind, x, y, z, yaw) {
  const V = VEH[kind], v = { kind, V, model: kind === 'moto' ? makeMoto() : kind === 'auto' ? makeCar() : makeRocket(), body: newBody(V.hw, V.h), yaw: yaw || 0, spd: 0 };
  v.body.p.set(x, y, z); v.body.jumpV = 7.5;
  v.model.traverse(o => { o.userData.veh = v; }); scene.add(v.model); v.shadow = makeShadow(kind === 'auto' ? 2.2 : 1.2);
  v.model.position.copy(v.body.p); v.model.rotation.y = v.yaw;
  vehicles.push(v); return v;
}
function placeVehicles(saved) {
  vehicles.splice(0).forEach(v => { scene.remove(v.model); scene.remove(v.shadow); });
  if (saved && saved.length) {
    saved.forEach(s => { if (!savedTrack && track && s.k !== 'cohete') return; makeVehicle(s.k, s.p[0], s.p[1] + .2, s.p[2], s.y); });
    if (savedTrack || !track) return;
  }
  // moto y auto en la pista (la parte más cerca del pueblo o tuya)
  if (track) {
    const ref = village || player.body.p, a0 = Math.atan2(ref.z - track.cz, ref.x - track.cx);
    [['moto', 0], ['auto', .16]].forEach(([k, da]) => {
      if (vehicles.some(v => v.kind === k)) return;
      const a = a0 + da, i = Math.round(((a / (Math.PI * 2)) + 1) % 1 * track.N) % track.N;
      makeVehicle(k, track.cx + Math.cos(a) * track.R, Math.round(track.hh[i]) + 1.05, track.cz + Math.sin(a) * track.R, Math.atan2(-Math.sin(a), Math.cos(a)));
    });
    if (vehicles.some(v => v.kind === 'cohete')) return;
  }
  // al lado del pueblo si hay, si no cerca tuyo
  const base = village || player.body.p;
  ['moto', 'auto', 'cohete'].forEach((k, i) => {
    if (vehicles.some(v => v.kind === k)) return;
    let spot = null;
    for (let t = 0; t < 60 && !spot; t++) {
      const a = (i * 2.1) + t * .37, r = (village ? 11 : 5) + (t % 6), x = Math.floor(base.x + Math.cos(a) * r) + .5, z = Math.floor(base.z + Math.sin(a) * r) + .5;
      if (x < 3 || z < 3 || x > WX - 3 || z > WZ - 3) continue;
      const y = surfaceY(x, z); if (!y || y <= SEA + 1) continue;
      const tb = newBody(VEH[k].hw + .2, VEH[k].h); if (!collides(tb, x, y, z)) spot = [x, y, z];
    }
    if (spot) makeVehicle(k, spot[0], spot[1], spot[2], i);
  });
}
function readMove() { // dirección deseada según el joystick/teclas y hacia dónde mira la cámara
  let jx = joy.x, jy = joy.y;
  if (keys.KeyA || keys.ArrowLeft) jx -= 1; if (keys.KeyD || keys.ArrowRight) jx += 1; if (keys.KeyW || keys.ArrowUp) jy -= 1; if (keys.KeyS || keys.ArrowDown) jy += 1;
  const l = Math.hypot(jx, jy); if (l > 1) { jx /= l; jy /= l; }
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  const mx = fx * -jy + rx * jx, mz = fz * -jy + rz * jx; return { mx, mz, ml: Math.hypot(mx, mz) };
}
function enterVehicle(v) {
  if (riding || catching) return;
  riding = v; v.spd = 0; document.body.classList.add('riding');
  player.model.visible = v.kind === 'moto'; player.shadow.visible = false;
  $('jumpBtn').textContent = v.kind === 'cohete' ? 'Subir' : 'Saltar';
  toast(v.kind === 'cohete' ? '¡Al cohete! Mantené "Subir" para volar. "Bajar" para salir.' : 'Te subiste a ' + v.V.name + '. Mové el joystick para manejar.', 2800);
  beep(330, .08); setTimeout(() => beep(440, .1), 80);
}
function exitVehicle() {
  const v = riding; if (!v) return;
  riding = null; document.body.classList.remove('riding'); $('jumpBtn').textContent = 'Saltar';
  v.spd = 0; v.body.v.set(0, v.body.v.y, 0); v.model.userData.rig.flame && (v.model.userData.rig.flame.visible = false);
  // bajarse al costado
  const sx = Math.cos(v.yaw) * (v.V.hw + .9), sz = -Math.sin(v.yaw) * (v.V.hw + .9);
  let x = v.body.p.x + sx, z = v.body.p.z + sz, y = surfaceY(x, z);
  if (!y || collides(player.body, x, y, z)) { x = v.body.p.x; z = v.body.p.z; y = v.body.p.y + v.V.h; }
  player.body.p.set(x, y, z); player.body.v.set(0, 0, 0);
  player.model.visible = true; player.shadow.visible = true; beep(300, .08);
}
function updateVehicles(dt) {
  vehicles.forEach(v => {
    const b = v.body, r = v.model.userData.rig;
    if (collides(b, b.p.x, b.p.y, b.p.z)) b.p.y = Math.floor(b.p.y) + 1; // si quedó adentro de un bloque
    if (v !== riding) { b.fly = false; b.v.x *= .9; b.v.z *= .9; moveBody(b, dt); if (b.p.y < SEA + .9 && surfaceY(b.p.x, b.p.z) === null) { b.p.y = SEA + .9; b.v.y = 0; } } // en el agua flota
    else if (v.kind === 'cohete') {
      const { mx, mz, ml } = readMove(), up = jumpHeld || keys.Space;
      b.fly = true;
      b.v.y += ((up ? 7 : b.ground ? 0 : -4) - b.v.y) * Math.min(1, dt * 3); // soltando "Subir" baja despacito
      if (b.p.y > 70 && b.v.y > 0) b.v.y = 0;
      const air = !b.ground || up, sp = air ? v.V.top * Math.min(1, ml) : 0, k = Math.min(1, dt * 3);
      b.v.x += ((ml > .05 ? mx / ml * sp : 0) - b.v.x) * k; b.v.z += ((ml > .05 ? mz / ml * sp : 0) - b.v.z) * k;
      if (ml > .05 && air) v.yaw = angLerp(v.yaw, Math.atan2(mx, mz), Math.min(1, dt * v.V.turn));
      const wasGround = b.ground; moveBody(b, dt); b.ground = wasGround && !up ? true : b.ground;
      if (b.hit || collides(b, b.p.x, b.p.y - .05, b.p.z)) b.ground = true;
      r.flame.visible = up; if (up) { r.flame.scale.y = .8 + Math.random() * .6; if (Math.random() < .7) particle(b.p.clone().add(new THREE.Vector3((Math.random() - .5) * .4, 0, (Math.random() - .5) * .4)), new THREE.Vector3((Math.random() - .5), -3, (Math.random() - .5)), Math.random() < .5 ? '#ff8c2a' : '#aaaaaa', .18, .6, -2); if (Math.random() < dt * 8) beep(70 + Math.random() * 30, .05, 'sawtooth', .03); }
    } else {
      const { mx, mz, ml } = readMove();
      let want = 0;
      if (ml > .08) { const ty = Math.atan2(mx, mz), diff = Math.abs(angLerp(0, ty - v.yaw, 1)); v.yaw = angLerp(v.yaw, ty, Math.min(1, dt * v.V.turn * (.4 + Math.min(1, Math.abs(v.spd) / 4)))); want = v.V.top * Math.min(1, ml) * clamp(Math.cos(diff), .25, 1); }
      v.spd += (want - v.spd) * Math.min(1, dt * (want > v.spd ? 1.6 : 3));
      const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
      const ahead = surfaceY(b.p.x + fx * (v.V.hw + .9), b.p.z + fz * (v.V.hw + .9));
      if (ahead === null && v.spd > 0) { v.spd = 0; if (performance.now() - vehHintT > 3000) { vehHintT = performance.now(); toast('¡Agua! ' + (v.kind === 'moto' ? 'La moto' : 'El auto') + ' no nada.', 1500); } }
      b.v.x = fx * v.spd; b.v.z = fz * v.spd; b.fly = false;
      moveBody(b, dt);
      if (b.hit) v.spd *= .5;
      r.wheels.forEach(w => { w.rotation.x += v.spd * dt / .3; });
      if (Math.abs(v.spd) > 4 && Math.random() < dt * 3) beep(60 + v.spd * 6, .06, 'sawtooth', .025);
      if (ADV && Math.abs(v.spd) > 4) mobs.forEach(m => { if (m.kind === 'zombie' && m.alive && m.body.p.distanceTo(b.p) < v.V.hw + 1) hurtMob(m, 6, b.p); });
      if (v.kind === 'moto') v.model.rotation.z = 0;
    }
    v.model.position.copy(b.p); v.model.rotation.y = v.yaw;
    if (v === riding && v.kind === 'moto') v.model.rotation.z = angLerp(0, 0, 1);
    placeShadow(v.shadow, b.p, v.kind === 'auto' ? 2.2 : 1.2);
  });
  if (riding) {
    const v = riding, b = v.body;
    player.body.p.set(b.p.x, b.p.y + (v.kind === 'moto' ? .45 : v.kind === 'auto' ? .4 : 1.6), b.p.z); player.body.v.set(0, 0, 0);
    player.yaw = v.yaw;
    if (v.kind === 'moto') { const m = player.model, rig = m.userData.rig; m.position.copy(player.body.p); m.rotation.y = v.yaw; rig.legL.rotation.x = rig.legR.rotation.x = -1.3; rig.armL.rotation.x = rig.armR.rotation.x = -1.2; rig.armL.rotation.z = rig.armR.rotation.z = 0; }
    if (look.id === null && (Math.abs(v.spd) > 2 || (v.kind === 'cohete' && !b.ground))) camYaw = angLerp(camYaw, v.yaw + Math.PI, Math.min(1, dt * 1.2));
  } else if (performance.now() - vehHintT > 20000) {
    const near = vehicles.find(v => v.body.p.distanceTo(player.body.p) < 3);
    if (near) { vehHintT = performance.now(); toast('Tocá ' + near.V.name + ' para subirte 🚀', 2200); }
  }
}
// tocar aldeanos, gallinas, golem o vehículos (devuelve true si fue para ellos)
function townTap(rayc, hv, hitC) {
  const objs = town.filter(n => n.model.visible).map(n => n.model).concat(vehicles.filter(v => v !== riding).map(v => v.model));
  if (!objs.length) return false;
  const h = rayc.intersectObjects(objs, true)[0];
  if (!h || (hv && h.distance > hv.t + .3) || (hitC && hitC.distance < h.distance)) return false;
  const o = h.object.userData;
  if (o.veh) { if (o.veh.body.p.distanceTo(player.body.p) > 6) toast('Acercate a ' + o.veh.V.name + '.'); else enterVehicle(o.veh); return true; }
  if (o.npc) { tapNpc(o.npc); return true; }
  return false;
}
$('exitBtn').addEventListener('click', exitVehicle);

/* ================= pantalla completa y horizontal (celular) ================= */
const TOUCH = matchMedia('(pointer:coarse)').matches;
const canFull = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
function goFull() {
  if (!TOUCH) return;
  try {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } };
    if (req && !(document.fullscreenElement || document.webkitFullscreenElement)) { const r = req.call(el, { navigationUI: 'hide' }); if (r && r.then) r.then(lock).catch(() => { }); else lock(); }
    else lock();
  } catch (e) { }
}
if (TOUCH && canFull) $('fullBtn').hidden = false;
// si sale de pantalla completa, el próximo toque en el juego la vuelve a pedir
let fullTry = 0;
canvas.addEventListener('pointerdown', () => { if (TOUCH && canFull && running && !(document.fullscreenElement || document.webkitFullscreenElement) && performance.now() - fullTry > 4000) { fullTry = performance.now(); goFull(); } });
const IOS = /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !canFull);
const STANDALONE = navigator.standalone || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
// iPhone: menos botones a la derecha para que quede lugar para mirar con el dedo.
// "Hacer" y el arma pasan arriba, al lado de la Pokédex. (Android y compu quedan igual.)
if (IOS) {
  document.body.classList.add('ios'); document.documentElement.classList.add('iosbg');
  const top = $('bookBtn').parentNode; top.insertBefore($('craftBtn'), $('bookBtn')); top.insertBefore($('armaBtn'), $('bookBtn'));
  $('craftBtn').innerHTML = '🟫 Hacer cubo';
  if (!STANDALONE) $('iosTip').hidden = false;
  $('fullBtn').hidden = true; // Safari de iPhone no deja pantalla completa desde la página
}
$('fullBtn').addEventListener('click', goFull);
// si el celular está parado, pedir que lo giren
function checkTurn() { $('turnOv').hidden = !(TOUCH && $('title').hidden && innerHeight > innerWidth); }
addEventListener('resize', checkTurn); addEventListener('orientationchange', () => { setTimeout(checkTurn, 300); if (IOS) [100, 500, 1000].forEach(t => setTimeout(resize, t)); });

/* ================= arranque ================= */
resize();
if (!load()) { freshState(); newWorld(); }
buildAll();
spawnTown(); placeVehicles(savedVeh);
camYaw = player.yaw + Math.PI;
camTarget.set(player.body.p.x, player.body.p.y + 1.35, player.body.p.z);
MONS.forEach(monTexture); // empieza a bajar las imágenes
rebuildFollowers(); updateUI(); setMode('break');
for (let i = 0; i < 8; i++) spawnWild();
requestAnimationFrame(frame);
let hadSave = false; try { hadSave = !!localStorage.getItem(SAVE); } catch (e) { }
$('loadMsg').textContent = hadSave ? 'Tu isla te está esperando.' : 'Una isla nueva te está esperando.';
function start(aventura) {
  beep(523, .08); setTimeout(() => beep(784, .12), 90);
  goFull();
  $('title').hidden = true; running = true; last = performance.now(); checkTurn();
  setAdv(aventura, true);
  if (!adv.pupGift) { adv.pupGift = true; adv.huesos += 3; updateAdvUI(); setTimeout(() => toast('¡Llegó la Patrulla Canina a la isla! 🐾 Tenés 3 huesos 🦴: dale uno a un cachorro para que sea tu amigo.', 5000), 4000); }
  if (IOS && !STANDALONE) setTimeout(() => toast('Para jugar en pantalla completa en iPhone: Compartir ⬆️ → "Agregar a inicio"', 5000), 4200);
  toast(aventura ? (isNight() ? 'Modo Aventura: ¡es de noche! Cuidado con los zombies 🧟' : 'Modo Aventura: hacé una espada en "Hacer" antes de que llegue la noche') : Object.keys(dex).length ? '¡Bienvenido de vuelta!' : 'Buscá Pokémon en el pasto alto y tocalos para atraparlos', 3800);
  save();
}
$('playBtn').addEventListener('click', () => start(false));
$('advBtn').addEventListener('click', () => start(true));
try { if (localStorage.getItem('bichos-modo') === 'aventura') $('title').classList.add('lastAdv'); } catch (e) { }
$('switchMode').addEventListener('click', () => { $('dexOv').hidden = true; running = true; last = performance.now(); setAdv(!ADV); save(); });
window.__game = { get player() { return player; }, get wild() { return wild; }, get followers() { return followers; }, tapAt, throwAt };
})();
