/* ============================================================
   FANOHGE — The Marianas Saga  ·  gameboard.js  (ES module)
   A 3D gameboard: geographically-shaped archipelago, detailed
   procedural building models, wandering Pacific-Islander
   villagers & era colonizers, era-themed skies & ships.
   Falls back gracefully: UI keeps the SVG map if this fails.
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

/* global window, document, ISLAND_DEFS, ISLAND_ORDER, ISLAND_OUTLINES, BUILDING_DEFS, INDUSTRIES, S */

/* ---------------- shared material palette ---------------- */
const M = {};
/* roughness per material key (default 0.9 — matte); glossy for glass/metal/water */
const R = {
  glass: 0.2, window: 0.3, whiteGlow: 0.5, gold: 0.35, metal: 0.5, iron: 0.55,
  steel: 0.45, solar: 0.4, lagoon: 0.25, deepWater: 0.3, teal: 0.5, plastic: 0.6,
  stone: 0.95, stoneLight: 0.9, sand: 0.95, thatch: 1, wood: 0.85, plank: 0.9,
};
function mat(color, key){
  return new THREE.MeshStandardMaterial({
    color,
    roughness: key && R[key] !== undefined ? R[key] : 0.9,
    metalness: 0,
    vertexColors: true,
  });
}

/* ---------------- procedural canvas textures ----------------
   Every material gets a hand-drawn map so nothing reads as a flat
   colored block. Falls back silently where canvas is unavailable. */
function makeTex(w, h, draw){
  try {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  } catch (e){ return null; }
}
function shade(hex, f){
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  return "rgb(" + Math.min(255, (r * f) | 0) + "," + Math.min(255, (g * f) | 0) + "," + Math.min(255, (b * f) | 0) + ")";
}
/* horizontal planks with grain */
function woodTex(base, dark, light){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = shade(base, 1); x.fillRect(0, 0, w, h);
    const rows = 6;
    for (let i = 0; i < rows; i++){
      const y = (h / rows) * i + 1;
      x.fillStyle = shade(dark, 1); x.globalAlpha = 0.5;
      x.fillRect(0, y, w, 2);
      x.globalAlpha = 1;
      x.fillStyle = shade(light, 1); x.globalAlpha = 0.3;
      x.fillRect(0, y + 2, w, 1);
      x.globalAlpha = 1;
    }
    for (let i = 0; i < 90; i++){
      x.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.06)";
      x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1);
    }
    // end-grain joints
    x.fillStyle = "rgba(0,0,0,0.22)";
    for (let i = 0; i < 8; i++) x.fillRect(Math.random() * w, (h / rows) * (i % rows) + 2, 2, h / rows - 4);
  });
}
/* irregular stone blocks with mortar joints */
function stoneTex(base, mortar, cell, jit){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = shade(mortar, 1); x.fillRect(0, 0, w, h);
    for (let r = 0; r < h / cell + 2; r++){
      const off = (r % 2) * cell * 0.5;
      for (let c = 0; c < w / cell + 2; c++){
        const bw = cell * (0.75 + Math.random() * (jit || 0.5));
        const bh = cell * (0.55 + Math.random() * (jit || 0.5));
        x.fillStyle = shade(base, 0.88 + Math.random() * 0.24);
        x.fillRect(c * cell + off + 1.5, r * cell + 1.5, bw - 3, bh - 3);
        x.fillStyle = "rgba(255,255,255,0.05)";
        x.fillRect(c * cell + off + 1.5, r * cell + 1.5, bw - 3, 1.5);
      }
    }
  });
}
/* thatched roof: bundled grass strokes on a diagonal weave */
function thatchTex(){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = "#b08d52"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++){
      const y = Math.random() * h;
      x.strokeStyle = Math.random() < 0.5 ? "rgba(110,80,35,0.55)" : "rgba(235,215,160,0.45)";
      x.lineWidth = 1 + Math.random() * 1.5;
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(w, y + (Math.random() * 10 - 5));
      x.stroke();
    }
  });
}
/* clay/terracotta roof tiles: overlapping rows of rounded tiles */
function tileTex(base, dark){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = shade(base, 1); x.fillRect(0, 0, w, h);
    const rows = 5, cols = 7, tw = w / cols, th = h / rows;
    for (let r = 0; r < rows; r++){
      const off = (r % 2) * tw * 0.5;
      for (let c = 0; c < cols + 1; c++){
        x.fillStyle = shade(base, 0.82 + Math.random() * 0.3);
        x.beginPath();
        x.arc(c * tw + off + tw * 0.5, r * th + th * 0.75, tw * 0.42, Math.PI, 0);
        x.fill();
      }
    }
    for (let i = 0; i < 40; i++){
      x.fillStyle = "rgba(0,0,0,0.12)";
      x.fillRect(Math.random() * w, Math.random() * h, 1, 2);
    }
    x.fillStyle = shade(dark, 0.9); x.globalAlpha = 0.35;
    for (let r = 0; r < rows; r++) x.fillRect(0, r * th + th * 0.62, w, 2);
    x.globalAlpha = 1;
  });
}
/* stucco / adobe: soft mottling */
function stuccoTex(base){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = shade(base, 1); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++){
      x.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
      x.beginPath();
      x.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 0, Math.PI * 2);
      x.fill();
    }
  });
}
/* brick bond */
function brickTex(base, mortar){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = shade(mortar, 1); x.fillRect(0, 0, w, h);
    const bw = 26, bh = 11;
    for (let r = 0; r < h / bh + 2; r++){
      const off = (r % 2) * bw * 0.5;
      for (let c = 0; c < w / bw + 2; c++){
        x.fillStyle = shade(base, 0.85 + Math.random() * 0.3);
        x.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
      }
    }
  });
}
/* asphalt: fine speckle */
function asphaltTex(){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = "#3a4048"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++){
      x.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.14)";
      x.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
  });
}
/* packed soil: speckle */
function soilTex(){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = "#8a6a3c"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 320; i++){
      x.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,235,190,0.10)";
      x.beginPath();
      x.arc(Math.random() * w, Math.random() * h, 0.6 + Math.random() * 1.6, 0, Math.PI * 2);
      x.fill();
    }
  });
}
/* concrete: faint aggregate */
function concreteTex(base){
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = shade(base, 1); x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++){
      x.fillStyle = "rgba(255,255,255,0.05)";
      x.beginPath();
      x.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 2.2, 0, Math.PI * 2);
      x.fill();
    }
  });
}
/* wire the textures onto the shared materials (silently skipped headless) */
const TEX = {
  wood: woodTex(0x8a5a2b, 0x4a2e14, 0xb07a3e),
  darkWood: woodTex(0x5b3a1a, 0x2e1c0a, 0x7a5230),
  plank: woodTex(0xa5793f, 0x6e4c22, 0xc8a05a),
  thatch: thatchTex(),
  stone: stoneTex(0x9aa0a8, 0x6e7684, 22, 0.5),
  darkStone: stoneTex(0x6e7684, 0x4c525c, 20, 0.5),
  stoneLight: stoneTex(0xcfd4d8, 0x9aa0a8, 24, 0.5),
  cobble: stoneTex(0x7d8794, 0x565e6a, 18, 0.7),
  brick: brickTex(0x9c4a30, 0x6e2e1a),
  tile: tileTex(0xc14a2c, 0x8a2e16),
  redRoof: tileTex(0xb5452e, 0x7c2d18),
  adobe: stuccoTex(0xd9c9a3),
  white: stuccoTex(0xf2efe6),
  concrete: concreteTex(0xa8aeb6),
  cement: concreteTex(0xb8bec6),
  dark: asphaltTex(),
  soil: soilTex(),
  sand: stuccoTex(0xe0d5ae),
  sandDark: stuccoTex(0xc9b98a),
};
/* soft radial contact shadow used under every building */
M.contactShadow = (() => {
  try {
    const t = makeTex(64, 64, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, 3, w / 2, h / 2, w / 2 - 1);
      g.addColorStop(0, "rgba(10,14,18,0.42)");
      g.addColorStop(0.65, "rgba(10,14,18,0.22)");
      g.addColorStop(1, "rgba(10,14,18,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
    });
    const m = new THREE.MeshStandardMaterial({
      color: 0x0a0e12, transparent: true, depthWrite: false, roughness: 1,
    });
    if (t) m.map = t;
    m.vertexColors = false;
    return m;
  } catch (e){ return null; }
})();
const PAL = {
  wood: 0x8a5a2b, darkWood: 0x5b3a1a, plank: 0xa5793f, thatch: 0xc9a96a,
  stone: 0x9aa0a8, darkStone: 0x6e7684, cobble: 0x7d8794, stoneLight: 0xcfd4d8,
  clay: 0xb5643c, brick: 0x9c4a30, adobe: 0xd9c9a3, white: 0xf2efe6,
  redRoof: 0xb5452e, tile: 0xc14a2c, green: 0x3f8f4f, darkGreen: 0x2c6e3a,
  field: 0x7da44d, soil: 0x8a6a3c, sand: 0xe0d5ae, sandDark: 0xc9b98a,
  iron: 0x4a5568, steel: 0x93a1b5, metal: 0x8a96a3, glass: 0x9fd8e8,
  window: 0x2a3f5c, gold: 0xd4a94c, solar: 0x2a4a7a, canvas: 0xd8c9a8,
  cargo: 0x8b5a2b, concrete: 0xa8aeb6, cement: 0xb8bec6, dark: 0x3a4048,
  sakura: 0xe8b4c4, door: 0x4a2e14, lagoon: 0x7fd4e8, deepWater: 0x1e4a68,
  reefWhite: 0xeaf6ff, volcanoGreen: 0x55734a, volcRock: 0x6b6258,
  crater: 0x3a342e, ash: 0x7d7468, limestone: 0xe8e0cc, grass: 0x4d9a62,
  grassDark: 0x3d7a4e, coral: 0xe8d9b8, roofGrey: 0x8a929c, teal: 0x2a8a80,
  navy: 0x2a3a5c, redFlag: 0xc23a2e, blueFlag: 0x3a6ea0, whiteGlow: 0xfff7d8,
  khaki: 0xb8a86a, olive: 0x7a7a4a, pink: 0xe8a0b0, skyBlue: 0x9fd8e8,
  coralWarm: 0xe07850, plastic: 0xe0a83c,
};
for (const k in PAL) M[k] = mat(PAL[k], k);
for (const k in TEX) if (TEX[k] && M[k]) M[k].map = TEX[k];

/* Real-texture upgrade path (OPTIONAL, no dependencies).
   Shared registry of loaded real texture maps, keyed by material/surface key:
     REAL_TEX[key] = { base?: Texture, normal?: Texture }
   Populated by the loader below; consumed by building materials (M), terrain
   matIsland(), the sea, and read when needed. Everything optional — missing
   files fall back to procedural/colour so the game always renders. */
const REAL_TEX = {};
/* island-surface materials created before textures loaded, keyed by island key,
   so the loader can re-apply real maps to them once the images arrive. */
const REAL_MAT_KEYS = {};
/* Tiles-per-island-face repeat per terrain surface (terrain UVs are normalized
   0..1 across each island, so this = how many tiles of the texture stretch
   across the whole island). Higher = finer detail, visible up close; lower =
   larger, softer pattern. */
const TERRAIN_TILE_REPEAT = {
  grass: 6, grassDark: 6, sand: 5, sandDark: 5, ash: 6,
  limestone: 4, volcanoGreen: 6, crater: 4, soil: 6, volcRock: 4,
};

/* Real-texture upgrade path loader:
   If the player drops a seamless base-color + normal pair into assets/textures/
   (e.g. assets/textures/stone_basecolor.jpg and assets/textures/stone_normal.jpg),
   the matching surface uses them instead of the procedural canvas texture.
   Files are probed with Image load; anything missing silently falls back. */
(function upgradeRealTextures(){
  const baseDir = "assets/textures/";
  // Try for the given base name across a list of formats (jpg/png/webp) and
  // return the first that loads, or null if none load.
  function loadFirst(exts){
    return new Promise((res) => {
      let idx = 0;
      function next(){
        if (idx >= exts.length) return res(null);
        const url = exts[idx++];
        try {
          const img = new Image();
          img.onload = () => {
            const t = new THREE.CanvasTexture(img);
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 4;
            res(t);
          };
          img.onerror = () => next();
          img.src = url;
        } catch (e){ next(); }
      }
      next();
    });
  }
  // surfaces we can texture: the building material keys PLUS the
  // terrain/environment surfaces (reviewed-real-texture targets)
  const ENV_KEYS = [
    "grass", "grassDark", "sand", "sandDark", "ash", "limestone",
    "volcanoGreen", "crater", "soil", "volcRock", "deepWater",
    "ocean", "water", "sky",
  ];
  const keys = [...new Set([...Object.keys(TEX), ...ENV_KEYS])];
  const FMT = ["jpg", "png", "webp"];
  /* Candidate filenames for a given key + kind, covering several common
     naming conventions so whatever the player named the files usually
     matches: dot and underscore separators, "base"/"basecolor"/"albedo"
     for base color, "normal"/"nrm"/"bump" for the normal map. */
  const candidates = (k, kind) => {
    const root = baseDir + k;
    const tags = kind === "base"
      ? ["base", "basecolor", "base_color", "albedo", "diffuse", "color"]
      : ["normal", "nrm", "bump"];
    const names = [];
    for (const t of tags){
      names.push(root + "." + t, root + "_" + t, root + "-" + t);
    }
    const urls = [];
    for (const n of names) for (const f of FMT) urls.push(n + "." + f);
    return urls;
  };
  const load = (k, kind) => loadFirst(candidates(k, kind));
  Promise.all(keys.map(k =>
    Promise.all([load(k, "base"), load(k, "normal")])
      .then(([base, normal]) => {
        if (base){
          base.colorSpace = THREE.SRGBColorSpace;   // base color = sRGB
        }
        if (normal){
          normal.colorSpace = THREE.NoColorSpace;   // normal map = linear
        }
        // stash whatever loaded in the shared registry for terrain/sea/sky
        if (base || normal) REAL_TEX[k] = { base, normal };
        // 1) apply to any island-surface materials created before load finished
        if (REAL_MAT_KEYS[k]){
          const rep = TERRAIN_TILE_REPEAT[k] !== undefined ? TERRAIN_TILE_REPEAT[k] : 2.0;
          for (const im of REAL_MAT_KEYS[k]){
            if (base){
              im.color.setHex(0xffffff);
              im.map = base;
              base.wrapS = base.wrapT = THREE.RepeatWrapping;
              base.repeat.set(rep, rep);
            }
            if (normal){
              im.normalMap = normal;
              im.normalScale.set(1, 1);
            }
            im.needsUpdate = true;
          }
          delete REAL_MAT_KEYS[k];
        }
        // 2) apply to the shared building material M[k] (TEX keys)
        const m = M[k];
        if (!m) return;
        if (base){
          m.map = base;
          // Real albedo carries the true color — clear the tint so it shows
          // through accurately instead of being multiplied by the base tint.
          m.color.setHex(0xffffff);
        }
        if (normal){
          normal.colorSpace = THREE.NoColorSpace;   // normal map = linear
          m.normalMap = normal;
          m.normalScale = (m.normalScale || new THREE.Vector2(1, 1)).set(1, 1);
        }
        m.needsUpdate = true;
      })
  )).catch(() => {});
})();

/* ---------------- national flag ----------------
   A flag waves in the ocean off the capital, changing with the administration:
   ancient/contact latte-stone banner → Spain → Germany → Japan → TTPI →
   CNMI → the new nation's flag (Chamorro Republic of the Marianas, or the
   Chamolinian Commonwealth of the Pacific with one fewer star). */
function starPath(x, cx, cy, r){
  x.beginPath();
  for (let i = 0; i < 5; i++){
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
    const b = a + Math.PI / 5;
    x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    x.lineTo(cx + Math.cos(b) * r * 0.45, cy + Math.sin(b) * r * 0.45);
  }
  x.closePath();
}
/* a latte stone: two tapered pillars with hemispherical tåsa caps */
function drawLatteGlyph(x, cx, baseY, h, color){
  x.fillStyle = color;
  const pillarW = h * 0.2, capR = h * 0.23, pillarH = h * 0.72;
  for (const dx of [-h * 0.23, h * 0.23]){
    x.fillRect(cx + dx - pillarW / 2, baseY - pillarH, pillarW, pillarH);
    x.beginPath();
    x.arc(cx + dx, baseY - pillarH, capR, Math.PI, 0);
    x.fill();
  }
}
/* the flying proa: outrigger hull + crab-claw sails */
function drawProa(x, cx, cy, color){
  x.fillStyle = color;
  x.strokeStyle = color;
  x.lineWidth = 1.6;
  // hull
  x.beginPath();
  x.moveTo(cx - 26, cy + 9);
  x.quadraticCurveTo(cx, cy + 16, cx + 26, cy + 8);
  x.quadraticCurveTo(cx + 18, cy + 3, cx - 20, cy + 3);
  x.closePath();
  x.fill();
  // outrigger booms + float
  x.beginPath();
  x.moveTo(cx - 8, cy + 7); x.lineTo(cx - 24, cy + 16);
  x.moveTo(cx + 10, cy + 8); x.lineTo(cx - 26, cy + 18);
  x.stroke();
  x.fillRect(cx - 32, cy + 15, 12, 3.4);
  // crab-claw sails
  x.beginPath();
  x.moveTo(cx - 6, cy - 15);
  x.quadraticCurveTo(cx - 17, cy + 1, cx - 15, cy + 8);
  x.quadraticCurveTo(cx - 6, cy + 3, cx - 2, cy - 11);
  x.closePath(); x.fill();
  x.beginPath();
  x.moveTo(cx - 1, cy - 13);
  x.quadraticCurveTo(cx + 11, cy + 1, cx + 13, cy + 8);
  x.quadraticCurveTo(cx + 2, cy + 3, cx - 2, cy - 11);
  x.closePath(); x.fill();
}
/* returns a canvas (empty if canvas unavailable — callers must guard) */
function flagCanvas(key){
  const c = document.createElement("canvas");
  c.width = 120; c.height = 80;
  const x = c.getContext("2d");
  if (!x) return c;
  const W = 120, H = 80;
  if (key === "spain"){
    x.fillStyle = "#aa151b"; x.fillRect(0, 0, W, 20);
    x.fillStyle = "#f1bf00"; x.fillRect(0, 20, W, 40);
    x.fillStyle = "#aa151b"; x.fillRect(0, 60, W, 20);
  } else if (key === "germany"){
    x.fillStyle = "#151515"; x.fillRect(0, 0, W, H / 3);
    x.fillStyle = "#dd0000"; x.fillRect(0, H / 3, W, H / 3);
    x.fillStyle = "#ffce00"; x.fillRect(0, 2 * H / 3, W, H / 3);
  } else if (key === "japan"){
    x.fillStyle = "#f5f5f5"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#bc002d";
    x.beginPath(); x.arc(W / 2, H / 2, 17, 0, Math.PI * 2); x.fill();
  } else if (key === "ttpi"){
    x.fillStyle = "#4aa5d8"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++){
      const a = -Math.PI / 2 + i * Math.PI / 3;
      starPath(x, W / 2 + Math.cos(a) * 23, H / 2 + Math.sin(a) * 19, 6.5);
      x.fill();
    }
  } else if (key === "latte"){
    // pre-contact: deep ocean blue with a latte-stone banner
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0d3f6e"); g.addColorStop(1, "#0a2a4a");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(255,255,255,0.10)";
    for (let i = 0; i < 3; i++){
      x.beginPath();
      x.arc(W / 2, 78 - i * 14, 34 + i * 9, Math.PI, 0);
      x.fill();
    }
    drawLatteGlyph(x, W / 2, 52, 30, "#e6e9ee");
  } else if (key === "cnmi"){
    x.fillStyle = "#1e5090"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#ffffff";
    starPath(x, W / 2, H / 2 - 4, 27); x.fill();
    drawLatteGlyph(x, W / 2, 58, 20, "#9aa0a8");
  } else {
    /* crm / ccp — the flag of the new nation:
       ocean blue for peace between the Chamorro peoples of Guam and the CNMI;
       a latte stone of unity; the flying proa of aspiration behind it; and a
       ring of silver stars — one for each island (14 without Guam). */
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0e4a80"); g.addColorStop(1, "#082c50");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // flying proa behind the stone
    drawProa(x, W / 2, H / 2 + 2, "#cfd9e6");
    // latte stone of unity
    drawLatteGlyph(x, W / 2, H / 2 + 6, 17, "#e8e4da");
    // ring of silver stars
    const n = key === "ccp" ? 14 : 15;
    for (let i = 0; i < n; i++){
      const a = -Math.PI / 2 + i * (Math.PI * 2 / n);
      starPath(x, W / 2 + Math.cos(a) * 30, H / 2 + Math.sin(a) * 24, 4.4);
      x.fillStyle = "#c9cdd4";
      x.fill();
    }
  }
  return c;
}
const FLAG_NAMES = {
  latte: "Independent Chamorro Villages",
  spain: "Spanish Crown",
  germany: "German Empire",
  japan: "Japanese Empire",
  ttpi: "U.S. Trust Territory (TTPI)",
  cnmi: "Commonwealth of the Northern Marianas",
  crm: "Chamorro Republic of the Marianas",
  ccp: "Chamolinian Commonwealth of the Pacific",
};
function currentFlagKey(){
  switch (S.era){
    case "ancient": case "contact": return "latte";
    case "spanish": return "spain";
    case "german": return "germany";
    case "japanese": return "japan";
    case "american": return "ttpi";
    case "commonwealth": return "cnmi";
    case "future":
      if (S.flags.nationality === "chamolinian") return "ccp";
      if (S.flags.reunified || S.flags.nationality === "chamorro") return "crm";
      return "cnmi";
    default: return "latte";
  }
}
function flagTexture(key){
  try {
    const c = flagCanvas(key);
    const x = c.getContext && c.getContext("2d");
    if (!x) return null;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  } catch (e){ return null; }
}

/* ---------------- geometry helpers ----------------
   All builders return [{ g: Geometry (origin at ground center), m: Material }] */
function bx(w, h, d, x, y, z, mk, ry){
  const gg = new THREE.BoxGeometry(w, h, d);
  gg.translate(x, y, z);
  if (ry) gg.rotateY(ry);
  return { g: gg, m: M[mk] };
}
function cy(rt, rb, h, x, y, z, mk, seg){
  const gg = new THREE.CylinderGeometry(rt, rb, h, seg || 8);
  gg.translate(x, y + h / 2, z);
  return { g: gg, m: M[mk] };
}
function cone(r, h, x, y, z, mk, seg, ry){
  const gg = new THREE.ConeGeometry(r, h, seg || 4);
  gg.translate(x, y + h / 2, z);
  if (ry) gg.rotateY(ry);
  return { g: gg, m: M[mk] };
}
function sph(r, x, y, z, mk, seg){
  const gg = new THREE.SphereGeometry(r, seg || 10, seg ? 8 : 8);
  gg.translate(x, y, z);
  return { g: gg, m: M[mk] };
}
/* hemispherical dome — the tåsa capstone of a latte pillar (flat on the bottom) */
function dome(r, h, x, y, z, mk, seg){
  const s = seg || 10;
  const gg = new THREE.SphereGeometry(r, s, Math.max(5, Math.floor(s / 2)), 0, Math.PI * 2, 0, Math.PI / 2);
  if (h && h !== r) gg.scale(1, h / r, 1);
  gg.translate(x, y, z);
  return { g: gg, m: M[mk] };
}
/* raise a set of parts by y units (e.g. a roof onto a platform) */
function lift(parts, y){
  for (const p of parts) p.g.translate(0, y, 0);
  return parts;
}
function torus(r, tube, x, y, z, mk, seg, arc){
  const gg = new THREE.TorusGeometry(r, tube, 8, seg || 16, arc === undefined ? Math.PI * 2 : arc);
  gg.translate(x, y, z);
  return { g: gg, m: M[mk] };
}
/* a gabled roof: two sloped boards forming a ridge */
function gable(w, d, h, mk, ry){
  const t = Math.atan2(h, w / 2);
  const len = Math.sqrt((w / 2) * (w / 2) + h * h);
  const b1 = bx(w + 0.02, 0.09, d, 0, 0, 0, mk);
  b1.g.rotateX(t); b1.g.translate(0, h / 2, 0);
  const b2 = bx(w + 0.02, 0.09, d, 0, 0, 0, mk);
  b2.g.rotateX(-t); b2.g.translate(0, h / 2, 0);
  if (ry){ b1.g.rotateY(ry); b2.g.rotateY(ry); }
  return [b1, b2];
}
function win(w, h, x, y, z, ry){
  return bx(w, h, 0.05, x, y, z, "window", ry);
}
function pillar(r, h, x, z, mk, seg){
  return cy(r, r * 1.15, h, x, 0, z, mk || "wood", seg || 6);
}
/* coconut palm: a curved trunk crowned with a fan of long, drooping fronds.
   Each frond is built around its own crown pivot so the leaves radiate evenly
   from a single point at the top — reads as a proper palm even when scaled
   down to fit a small island. */
function palmLeaf(s, len, blade){
  /* One palm-leaf frond: a long, flat, tapering blade lying along +Z (root at
     the origin). Built from end-to-end slabs (no per-slab origin rotation —
     that would scatter them), with each distal slab stepped down slightly so
     the blade arches toward the tip. The caller then rotates the whole merged
     leaf about the origin for the overall outward droop. */
  const segs = [];
  const sl = len / 3;
  for (let seg = 0; seg < 3; seg++){
    const fw = blade * (1 - seg * 0.3);        // width tapers toward the tip
    const th = blade * 0.11 * (1 - seg * 0.12); // thin leaf
    const z = sl * seg + sl / 2;               // end-to-end along +Z
    const y = -seg * seg * 0.03 * blade;       // gentle sag toward the tip
    const b = bx(fw, th, sl, 0, y, z, "green");
    segs.push(b.g);
  }
  // optional delicate taper relief: thin the very tip
  const tip = bx(blade * 0.28, blade * 0.05, sl * 0.5, 0, -0.2 * blade, len + sl * 0.25, "green");
  segs.push(tip.g);
  return mergeGeometries(segs, false);
}

function palmTree(s){
  const parts = [];
  if (PALM_READY) return parts;   // real GLB palm replaces the procedural one
  const trunkH = 0.72 * s;
  // trunk: gently tapered, wider at the base
  parts.push(cy(0.04 * s, 0.1 * s, trunkH, 0, 0, 0, "darkWood", 8));
  // subtle trunk curve: lean the upper part slightly
  const crownY = trunkH - 0.02 * s;
  const n = 8;                          // number of fronds around the crown
  const len = 0.75 * s;                 // frond length
  for (let i = 0; i < n; i++){
    const a = (i / n) * Math.PI * 2 + 0.16;
    const blade = (0.1 + (i % 2) * 0.02) * s;
    const leaf = palmLeaf(s, len, blade);
    // orient: azimuth, then DROOP the tip down (+X rotates +Z toward -Y), then
    // root the leaf base at the crown so the fronds hang naturally outward.
    leaf.rotateY(a);
    leaf.rotateX(1.12);
    leaf.translate(0, crownY, 0);
    parts.push({ g: leaf, m: M.green });
    // thin dark midrib along the top of each frond
    const rib = bx(0.014 * s, 0.014 * s, len * 0.96, 0, 0, len * 0.48, "darkWood");
    rib.g.rotateY(a);
    rib.g.rotateX(1.12 + 0.03);
    rib.g.translate(0, crownY + 0.02 * s, 0);
    parts.push(rib);
  }
  // coconut cluster hanging just under the crown
  parts.push(sph(0.085 * s, 0, crownY - 0.04 * s, 0, "darkWood", 8));
  parts.push(sph(0.062 * s, 0.075 * s, crownY - 0.065 * s, 0.03 * s, "darkWood", 7));
  parts.push(sph(0.062 * s, -0.07 * s, crownY - 0.06 * s, 0.035 * s, "darkWood", 7));
  parts.push(sph(0.05 * s, 0, crownY - 0.085 * s, -0.04 * s, "darkWood", 7));
  return parts;
}
/* latte stone pair (iconic Chamorro pillars + capstone) */
/* a single latte pillar: tapered stone shaft (haligi) crowned by a
   hemispherical capstone (tåsa) — the iconic Chamorro building block */
function latteStone(s, x, z){
  const h = 0.5 * s;
  return [
    cy(0.07 * s, 0.1 * s, h, x, 0, z, "stoneLight", 6),      // haligi shaft
    dome(0.15 * s, 0.14 * s, x, h, z, "stoneLight", 10),      // tåsa cap
  ];
}
/* a full latte house foundation: two rows of pillars with wooden lintel beams */
function latteFoundation(s){
  const parts = [];
  const xs = [-0.95, -0.47, 0, 0.47, 0.95].map(v => v * s);
  for (const z of [-0.5 * s, 0.5 * s]){
    for (const x of xs) parts.push(...latteStone(s, x, z));
    parts.push(bx(2.5 * s, 0.09 * s, 0.14 * s, 0, 0.5 * s + 0.075 * s, z, "darkWood"));
  }
  return parts;
}
/* a single latte pair (used as decoration by other builders) */
function lattePair(s, x, z, ry){
  const parts = [
    ...latteStone(s, x - 0.14 * s, z),
    ...latteStone(s, x + 0.14 * s, z),
  ];
  if (ry) parts.forEach(p => p.g.rotateY(ry));
  return parts;
}

/* ---------------- real geography ----------------
   Position + size from measured OSM coastlines (real km, real centers).
   The coastline shapes themselves come from ISLAND_OUTLINES (data.js)
   via the conversion loop below. type: volcano | limestone */
const GEO = {
  fdp:       { lat: 20.5449, lon: 144.8947, kmW: 1.77, kmH: 1.95, peak: 319, type: "volcano" },
  maug:      { lat: 20.0233, lon: 145.2231, kmW: 3.13, kmH: 2.69, peak: 227, type: "volcano" },
  asuncion:  { lat: 19.6913, lon: 145.4034, kmW: 3.15, kmH: 3.56, peak: 891, type: "volcano" },
  agrihan:   { lat: 18.7692, lon: 145.6681, kmW: 6.77, kmH: 9.73, peak: 965, type: "volcano" },
  pagan:     { lat: 18.1074, lon: 145.759,  kmW: 10.84, kmH: 13.75, peak: 570, type: "volcano",
    cones: [{ x: 0.10, y: -0.62, s: 1.0 }, { x: 0.05, y: 0.62, s: 0.85 }] },
  alamagan:  { lat: 17.6002, lon: 145.8331, kmW: 3.94, kmH: 4.51, peak: 744, type: "volcano" },
  guguan:    { lat: 17.3093, lon: 145.8423, kmW: 2.31, kmH: 2.96, peak: 301, type: "volcano",
    cones: [{ x: 0.0, y: -0.5, s: 0.9 }, { x: 0.0, y: 0.55, s: 1.0 }] },
  sarigan:   { lat: 16.7046, lon: 145.7785, kmW: 2.5,  kmH: 3.0,  peak: 538, type: "volcano" },
  anatahan:  { lat: 16.3507, lon: 145.6787, kmW: 9.8,  kmH: 4.33, peak: 787, type: "volcano" },
  fmedinilla:{ lat: 16.0166, lon: 146.0585, kmW: 1.39, kmH: 2.47, peak: 81,  type: "volcano" },
  saipan:    { lat: 15.191,  lon: 145.7598, kmW: 15.08, kmH: 21.9, type: "limestone",
    hills: [[0.48,0.42,0.13,0.9]], lagoon: [0.30, 0.55, 0.09, 0.14] },
  tinian:    { lat: 14.59,  lon: 145.6281, kmW: 9.84, kmH: 19.71, type: "limestone" },
  aguijan:   { lat: 14.21,  lon: 145.5583, kmW: 4.47, kmH: 2.87,  type: "limestone" },
  rota:      { lat: 14.1554, lon: 145.2057, kmW: 18.25, kmH: 9.92, type: "limestone",
    hills: [[0.45,0.6,0.2,0.6]] },
  guam:      { lat: 13.38, lon: 144.7958, kmW: 34.73, kmH: 45.1, type: "limestone",
    hills: [[0.45,0.2,0.12,0.7],[0.5,0.08,0.1,0.6],[0.38,0.3,0.1,0.55]] },
};

/* Derive each island's exact board outline from the shared real
   silhouettes in data.js. GEO pts live in 0..1 space:
   x 0 = west … 1 = east,  y 0 = north … 1 = south. */
for (const id of ISLAND_ORDER){
  const src = ISLAND_OUTLINES[id];
  if (!src) continue;
  const conv = (p) => p.map(pt => [0.5 + pt[0] / 2, 0.5 + pt[1] / 2]);
  GEO[id].pts = conv(src.polys[0]);
  if (src.polys.length > 1) GEO[id].polys = src.polys.map(conv);
  if (src.cones) GEO[id].cones = src.cones;
}

/* map board position + size from geography */
const LAT0 = 13.45, LON0 = 145.75, DEGU = 24, KMU = 0.55;
function geoPos(d){
  const x = (d.lon - LON0) * DEGU * 0.956;   // cos(17°) — longitude foreshortening
  const z = -(d.lat - LAT0) * DEGU;          // north = −Z
  return new THREE.Vector3(x, 0, z);
}
function geoSize(d){
  return { w: d.kmW * KMU, h: d.kmH * KMU };
}

/* ---------------- building models ---------------- */
const BUILDERS = {
  /* ==== Ancient Chamorro ==== */
  guma: (r, s) => [
    // six stone-and-wood posts lifting the house above the ground
    pillar(0.05 * s, 0.55 * s, -0.55 * s, -0.45 * s, "stoneLight", 5),
    pillar(0.05 * s, 0.55 * s, 0.55 * s, -0.45 * s, "stoneLight", 5),
    pillar(0.05 * s, 0.55 * s, -0.55 * s, 0.45 * s, "stoneLight", 5),
    pillar(0.05 * s, 0.55 * s, 0.55 * s, 0.45 * s, "stoneLight", 5),
    pillar(0.05 * s, 0.55 * s, 0, -0.45 * s, "stoneLight", 5),
    pillar(0.05 * s, 0.55 * s, 0, 0.45 * s, "stoneLight", 5),
    // woven plank platform
    bx(1.4 * s, 0.1 * s, 1.2 * s, 0, 0.6 * s, 0, "plank"),
    bx(1.42 * s, 0.05 * s, 0.07 * s, 0, 0.66 * s, -0.58 * s, "plank"),
    bx(1.42 * s, 0.05 * s, 0.07 * s, 0, 0.66 * s, 0.58 * s, "plank"),
    // tall steep thatched A-frame roof with ridge + finial
    ...lift(gable(1.5 * s, 1.35 * s, 0.95 * s, "thatch", 0), 0.6 * s),
    bx(1.55 * s, 0.09 * s, 0.14 * s, 0, 1.55 * s + 0.045 * s, 0, "thatch"),
    cone(0.1 * s, 0.24 * s, 0, 1.55 * s + 0.2 * s, 0, "thatch", 4, Math.PI / 4),
    // entry ladder + door opening
    bx(0.16 * s, 0.4 * s, 0.04 * s, -0.7 * s, 0.8 * s, 0.62 * s, "plank"),
    bx(0.3 * s, 0.36 * s, 0.05 * s, -0.55 * s, 0.83 * s, 0.58 * s, "door"),
  ],
  village_center: (r, s) => [
    bx(2.2 * s, 0.14 * s, 1.4 * s, 0, 0.07 * s, 0, "wood"),
    pillar(0.05 * s, 0.9 * s, -0.85 * s, -0.5 * s), pillar(0.05 * s, 0.9 * s, 0.85 * s, -0.5 * s),
    pillar(0.05 * s, 0.9 * s, -0.85 * s, 0.5 * s), pillar(0.05 * s, 0.9 * s, 0.85 * s, 0.5 * s),
    // big steep communal thatch roof, ridge finial + banner pole
    ...lift(gable(2.35 * s, 1.55 * s, 1.05 * s, "thatch", 0), 0.6 * s),
    bx(2.4 * s, 0.09 * s, 0.16 * s, 0, 1.65 * s + 0.045 * s, 0, "thatch"),
    cone(0.13 * s, 0.3 * s, 0, 1.65 * s + 0.22 * s, 0, "thatch", 4, Math.PI / 4),
    cy(0.04 * s, 0.04 * s, 1.6 * s, 0, 1.3 * s, 0, "wood", 5),
    bx(0.18 * s, 0.12 * s, 0.02 * s, 0, 1.6 * s, 0, "redFlag"),
  ],
  canoe: (r, s) => [
    cy(0.16 * s, 0.16 * s, 1.8 * s, 0, 0.15 * s, 0, "darkWood", 6).g && Object.assign(cy(0.16 * s, 0.16 * s, 1.8 * s, 0, 0.15 * s, 0, "darkWood", 6), { g: cy(0.16 * s, 0.16 * s, 1.8 * s, 0, 0.15 * s, 0, "darkWood", 6).g.scale(1, 0.5, 1) }),
    bx(0.08 * s, 0.08 * s, 1.3 * s, 0, 0.08 * s, 0.62 * s, "wood"),
    bx(0.05 * s, 0.06 * s, 0.55 * s, 0.4 * s, 0.2 * s, 0.1 * s, "wood"),
    bx(0.05 * s, 0.06 * s, 0.55 * s, -0.4 * s, 0.2 * s, 0.1 * s, "wood"),
    cy(0.03 * s, 0.03 * s, 0.85 * s, 0.2 * s, 0.62 * s, 0, "wood", 5),
    cone(0.45 * s, 0.6 * s, 0.2 * s, 0.92 * s, 0, "canvas", 3, 0),
  ],
  taro_patch: (r, s) => [
    cy(0.5 * s, 0.62 * s, 0.12 * s, 0, 0.06 * s, 0, "soil", 10),
    cy(0.4 * s, 0.4 * s, 0.05 * s, 0, 0.13 * s, 0, "deepWater", 10),
    cy(0.02 * s, 0.02 * s, 0.2 * s, -0.2 * s, 0.22 * s, -0.15 * s, "green", 4),
    cone(0.13 * s, 0.07 * s, -0.2 * s, 0.3 * s, -0.15 * s, "darkGreen", 3),
    cy(0.02 * s, 0.02 * s, 0.2 * s, 0.18 * s, 0.22 * s, 0.12 * s, "green", 4),
    cone(0.13 * s, 0.07 * s, 0.18 * s, 0.3 * s, 0.12 * s, "darkGreen", 3),
    cy(0.02 * s, 0.02 * s, 0.2 * s, 0.1 * s, 0.22 * s, -0.22 * s, "green", 4),
    cone(0.13 * s, 0.07 * s, 0.1 * s, 0.3 * s, -0.22 * s, "darkGreen", 3),
  ],
  yam_field: (r, s) => [
    bx(0.5 * s, 0.09 * s, 0.28 * s, -0.36 * s, 0.045 * s, 0, "soil"),
    bx(0.5 * s, 0.09 * s, 0.28 * s, 0, 0.045 * s, 0, "soil"),
    bx(0.5 * s, 0.09 * s, 0.28 * s, 0.36 * s, 0.045 * s, 0, "soil"),
    cone(0.09 * s, 0.14 * s, -0.42 * s, 0.12 * s, -0.08 * s, "darkGreen", 4),
    cone(0.09 * s, 0.14 * s, -0.3 * s, 0.12 * s, 0.05 * s, "darkGreen", 4),
    cone(0.09 * s, 0.14 * s, 0.05 * s, 0.12 * s, -0.06 * s, "darkGreen", 4),
    cone(0.09 * s, 0.14 * s, 0.42 * s, 0.12 * s, 0.04 * s, "darkGreen", 4),
  ],
  coconut_grove: (r, s) => [...palmTree(s), ...palmTree(s * 0.85).map(p => ({ g: p.g.clone().translate(0.55 * s, 0, 0.45 * s), m: p.m })), ...palmTree(s * 0.8).map(p => ({ g: p.g.clone().translate(-0.55 * s, 0, -0.4 * s), m: p.m }))],
  fishtrap: (r, s) => [
    torus(0.3 * s, 0.05 * s, 0, 0.06 * s, 0, "darkStone", 14).g && Object.assign({}, torus(0.3 * s, 0.05 * s, 0, 0.06 * s, 0, "darkStone", 14), { g: torus(0.3 * s, 0.05 * s, 0, 0.06 * s, 0, "darkStone", 14).g.scale(1, 0.4, 1) }),
    torus(0.18 * s, 0.04 * s, 0, 0.07 * s, 0, "wood", 14),
    pillar(0.03 * s, 0.5 * s, 0.32 * s, 0, "wood", 4), pillar(0.03 * s, 0.5 * s, -0.32 * s, 0, "wood", 4),
    bx(0.5 * s, 0.02 * s, 0.03 * s, 0, 0.5 * s, 0, "wood"),
  ],
  latte: (r, s) => latteFoundation(s),
  shrine: (r, s) => [
    bx(0.9 * s, 0.1 * s, 0.7 * s, 0, 0.05 * s, 0, "stone"),
    pillar(0.04 * s, 0.55 * s, -0.3 * s, -0.2 * s, "wood", 4), pillar(0.04 * s, 0.55 * s, 0.3 * s, -0.2 * s, "wood", 4),
    pillar(0.04 * s, 0.55 * s, -0.3 * s, 0.2 * s, "wood", 4), pillar(0.04 * s, 0.55 * s, 0.3 * s, 0.2 * s, "wood", 4),
    // small shrine with a proper gabled thatch roof
    ...lift(gable(1.0 * s, 0.8 * s, 0.55 * s, "thatch", 0), 0.55 * s),
    bx(1.05 * s, 0.07 * s, 0.1 * s, 0, 1.1 * s + 0.035 * s, 0, "thatch"),
    cy(0.1 * s, 0.13 * s, 0.22 * s, 0, 0.22 * s, 0, "darkStone", 6),
    cone(0.16 * s, 0.08 * s, 0, 0.36 * s, 0, "stoneLight", 4, 0),
  ],
  meeting_house: (r, s) => [
    bx(2.5 * s, 0.12 * s, 1.1 * s, 0, 0.06 * s, 0, "wood"),
    ...Array.from({ length: 5 }, (_, i) => pillar(0.045 * s, 0.75 * s, -1.0 * s + i * 0.5 * s, -0.45 * s)).flat(),
    ...Array.from({ length: 5 }, (_, i) => pillar(0.045 * s, 0.75 * s, -1.0 * s + i * 0.5 * s, 0.45 * s)).flat(),
    ...gable(2.6 * s, 1.2 * s, 0.6 * s, "thatch", 0),
    bx(2.7 * s, 0.06 * s, 0.12 * s, 0, 0.85 * s, 0, "thatch"),
  ],
  warrior_hall: (r, s) => [
    bx(1.6 * s, 0.12 * s, 1.6 * s, 0, 0.06 * s, 0, "wood"),
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return pillar(0.045 * s, 0.8 * s, Math.cos(a) * 0.72 * s, Math.sin(a) * 0.72 * s, "wood", 5);
    }).flat(),
    cone(1.15 * s, 0.6 * s, 0, 0.68 * s, 0, "thatch", 8, Math.PI / 8),
    ...Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const c = cone(0.06 * s, 0.5 * s, Math.cos(a) * 0.95 * s, 0.28 * s, Math.sin(a) * 0.95 * s, "darkWood", 4);
      c.g.rotateZ(0.4);
      return c;
    }),
  ],
  stone_wall: (r, s) => [
    bx(1.7 * s, 0.45 * s, 0.22 * s, 0, 0.225 * s, -0.7 * s, "cobble"),
    bx(1.7 * s, 0.45 * s, 0.22 * s, 0, 0.225 * s, 0.7 * s, "cobble"),
    bx(0.22 * s, 0.45 * s, 1.2 * s, -0.75 * s, 0.225 * s, 0, "cobble"),
    bx(0.22 * s, 0.45 * s, 1.2 * s, 0.75 * s, 0.225 * s, 0, "cobble"),
    bx(0.24 * s, 0.5 * s, 0.24 * s, -0.9 * s, 0.25 * s, -0.9 * s, "cobble"),
    bx(0.24 * s, 0.5 * s, 0.24 * s, 0.9 * s, 0.25 * s, -0.9 * s, "cobble"),
    bx(0.24 * s, 0.5 * s, 0.24 * s, -0.9 * s, 0.25 * s, 0.9 * s, "cobble"),
    bx(0.24 * s, 0.5 * s, 0.24 * s, 0.9 * s, 0.25 * s, 0.9 * s, "cobble"),
  ],
  latte_quarry: (r, s) => [
    // shallow quarry pit
    cy(1.0 * s, 1.15 * s, 0.24 * s, 0, 0.12 * s, 0, "soil", 9),
    // half-carved latte pillar still in the rock, capstone resting beside
    cy(0.13 * s, 0.15 * s, 0.7 * s, 0.6 * s, 0.4 * s, 0, "stoneLight", 6),
    bx(0.36 * s, 0.11 * s, 0.26 * s, 0.6 * s, 0.78 * s, 0, "stoneLight"),
    // second rough pillar
    cy(0.12 * s, 0.14 * s, 0.6 * s, -0.6 * s, 0.35 * s, 0, "stone", 6),
    bx(0.3 * s, 0.1 * s, 0.22 * s, -0.6 * s, 0.7 * s, 0, "stone"),
    // dressed blocks awaiting hauling
    bx(0.32 * s, 0.16 * s, 0.24 * s, -0.25 * s, 0.13 * s, 0.6 * s, "stoneLight"),
    bx(0.26 * s, 0.13 * s, 0.2 * s, -0.3 * s, 0.22 * s, 0.45 * s, "stone"),
    bx(0.22 * s, 0.11 * s, 0.18 * s, -0.35 * s, 0.28 * s, 0.3 * s, "stoneLight"),
    // mason's lean-to hut
    bx(0.55 * s, 0.32 * s, 0.45 * s, 0.2 * s, 0.16 * s, -0.75 * s, "wood"),
    cone(0.5 * s, 0.3 * s, 0.2 * s, 0.42 * s, -0.75 * s, "thatch", 4, Math.PI / 4),
  ],

  /* ==== Spanish ==== */
  church: (r, s) => [
    bx(1.5 * s, 0.95 * s, 1.05 * s, 0, 0.475 * s, 0, "adobe"),
    ...gable(1.7 * s, 1.25 * s, 0.55 * s, "tile", 0),
    bx(0.45 * s, 1.35 * s, 0.45 * s, 0.95 * s, 0.675 * s, 0, "adobe"),
    cone(0.36 * s, 0.4 * s, 0.95 * s, 1.42 * s, 0, "tile", 4, Math.PI / 4),
    bx(0.16 * s, 0.04 * s, 0.04 * s, 0.95 * s, 1.72 * s, 0, "white"),
    bx(0.04 * s, 0.18 * s, 0.04 * s, 0.95 * s, 1.8 * s, 0, "white"),
    bx(0.34 * s, 0.55 * s, 0.06 * s, -0.55 * s, 0.275 * s, 0.53 * s, "door"),
    win(0.18 * s, 0.24 * s, -0.4 * s, 0.55 * s, 0.53 * s, 0),
    win(0.18 * s, 0.24 * s, 0.4 * s, 0.55 * s, 0.53 * s, 0),
    win(0.18 * s, 0.24 * s, -0.4 * s, 0.55 * s, -0.53 * s, 0),
    win(0.18 * s, 0.24 * s, 0.4 * s, 0.55 * s, -0.53 * s, 0),
    cy(0.05 * s, 0.05 * s, 0.9 * s, -0.4 * s, 0.95 * s, 0, "wood", 5),
    cone(0.28 * s, 0.22 * s, -0.4 * s, 1.5 * s, 0, "gold", 4, Math.PI / 4),
  ],
  mission_house: (r, s) => [
    bx(1.2 * s, 0.8 * s, 0.85 * s, 0, 0.4 * s, 0, "adobe"),
    ...gable(1.35 * s, 1.0 * s, 0.5 * s, "tile", 0),
    bx(0.3 * s, 0.5 * s, 0.06 * s, -0.45 * s, 0.25 * s, 0.44 * s, "door"),
    win(0.16 * s, 0.2 * s, 0.35 * s, 0.48 * s, 0.44 * s, 0),
    win(0.16 * s, 0.2 * s, -0.35 * s, 0.48 * s, -0.44 * s, 0),
    bx(1.5 * s, 0.7 * s, 0.1 * s, -0.15 * s, 0.35 * s, -0.85 * s, "adobe"),
    bx(0.04 * s, 0.06 * s, 0.4 * s, -0.9 * s, 0.45 * s, 0.1 * s, "wood"),
    bx(0.04 * s, 0.06 * s, 0.4 * s, 0.6 * s, 0.45 * s, 0.1 * s, "wood"),
  ],
  plaza: (r, s) => [
    bx(1.7 * s, 0.09 * s, 1.7 * s, 0, 0.045 * s, 0, "cobble"),
    bx(1.8 * s, 0.05 * s, 0.12 * s, 0, 0.03 * s, -0.85 * s, "stoneLight"),
    bx(1.8 * s, 0.05 * s, 0.12 * s, 0, 0.03 * s, 0.85 * s, "stoneLight"),
    bx(0.12 * s, 0.05 * s, 1.8 * s, -0.85 * s, 0.03 * s, 0, "stoneLight"),
    bx(0.12 * s, 0.05 * s, 1.8 * s, 0.85 * s, 0.03 * s, 0, "stoneLight"),
    bx(0.75 * s, 0.06 * s, 0.06 * s, 0, 0.2 * s, 0, "stone"),
    bx(0.06 * s, 0.75 * s, 0.06 * s, 0, 0.46 * s, 0, "stone"),
    bx(0.3 * s, 0.12 * s, 0.3 * s, 0, 0.95 * s, 0, "stoneLight"),
    bx(0.55 * s, 0.12 * s, 0.24 * s, 0.6 * s, 0.11 * s, 0.4 * s, "darkWood"),
    bx(0.55 * s, 0.12 * s, 0.24 * s, -0.6 * s, 0.11 * s, 0.4 * s, "darkWood"),
    bx(0.55 * s, 0.12 * s, 0.24 * s, 0.6 * s, 0.11 * s, -0.4 * s, "darkWood"),
    bx(0.55 * s, 0.12 * s, 0.24 * s, -0.6 * s, 0.11 * s, -0.4 * s, "darkWood"),
  ],
  market: (r, s) => [
    pillar(0.045 * s, 1.2 * s, -0.6 * s, -0.4 * s), pillar(0.045 * s, 1.2 * s, 0.6 * s, -0.4 * s),
    pillar(0.045 * s, 1.2 * s, -0.6 * s, 0.4 * s), pillar(0.045 * s, 1.2 * s, 0.6 * s, 0.4 * s),
    bx(1.55 * s, 0.07 * s, 1.1 * s, 0, 1.25 * s, 0, "canvas"),
    bx(0.2 * s, 0.02 * s, 1.1 * s, -0.65 * s, 1.15 * s, 0, "redFlag"),
    bx(0.2 * s, 0.02 * s, 1.1 * s, 0.65 * s, 1.15 * s, 0, "blueFlag"),
    bx(0.3 * s, 0.24 * s, 0.24 * s, -0.85 * s, 0.12 * s, -0.2 * s, "cargo"),
    bx(0.26 * s, 0.2 * s, 0.2 * s, -0.8 * s, 0.1 * s, 0.25 * s, "cargo"),
    bx(0.3 * s, 0.24 * s, 0.24 * s, 0.85 * s, 0.12 * s, -0.15 * s, "cargo"),
  ],
  cattle_ranch: (r, s) => [
    bx(1.6 * s, 0.04 * s, 0.04 * s, -0.75 * s, 0.18 * s, 0.75 * s, "wood"),
    bx(1.6 * s, 0.04 * s, 0.04 * s, -0.75 * s, 0.18 * s, -0.75 * s, "wood"),
    bx(0.04 * s, 0.04 * s, 1.5 * s, -0.75 * s, 0.18 * s, 0, "wood"),
    bx(0.04 * s, 0.04 * s, 1.5 * s, 0.75 * s, 0.18 * s, 0, "wood"),
    bx(0.04 * s, 0.04 * s, 0.5 * s, 0, 0.18 * s, 0.75 * s, "wood"),
    bx(0.04 * s, 0.04 * s, 0.5 * s, 0, 0.18 * s, -0.75 * s, "wood"),
    bx(0.8 * s, 0.55 * s, 0.55 * s, -0.6 * s, 0.275 * s, 0, "plank"),
    ...gable(0.95 * s, 0.7 * s, 0.35 * s, "darkWood", 0),
    cy(0.16 * s, 0.16 * s, 0.14 * s, 0.5 * s, 0.07 * s, -0.4 * s, "gold", 6),
    cy(0.16 * s, 0.16 * s, 0.14 * s, 0.7 * s, 0.07 * s, 0.15 * s, "gold", 6),
    cy(0.16 * s, 0.16 * s, 0.14 * s, 0.5 * s, 0.07 * s, 0.55 * s, "gold", 6),
  ],
  corn_field: (r, s) => [
    ...Array.from({ length: 8 }, (_, i) => {
      const x = -0.7 * s + i * 0.2 * s;
      return [cy(0.025 * s, 0.025 * s, 0.42 * s, x, 0.21 * s, 0.15 * s, "green", 4), cone(0.05 * s, 0.1 * s, x, 0.45 * s, 0.15 * s, "darkGreen", 4)];
    }).flat(),
    ...Array.from({ length: 8 }, (_, i) => {
      const x = -0.7 * s + i * 0.2 * s;
      return [cy(0.025 * s, 0.025 * s, 0.42 * s, x, 0.21 * s, -0.15 * s, "green", 4), cone(0.05 * s, 0.1 * s, x, 0.45 * s, -0.15 * s, "darkGreen", 4)];
    }).flat(),
  ],
  road: (r, s) => [
    bx(1.9 * s, 0.06 * s, 0.7 * s, 0, 0.03 * s, 0, "soil"),
    // packed earth crown + worn wheel ruts
    bx(1.9 * s, 0.02 * s, 0.06 * s, 0, 0.065 * s, -0.18 * s, "sandDark"),
    bx(1.9 * s, 0.02 * s, 0.06 * s, 0, 0.065 * s, 0.18 * s, "sandDark"),
    // border stones along both edges
    ...Array.from({ length: 6 }, (_, i) => bx(0.1 * s, 0.06 * s, 0.1 * s, -0.85 * s + i * 0.34 * s, 0.035 * s, 0.38 * s, "stone", 0)),
    ...Array.from({ length: 6 }, (_, i) => bx(0.1 * s, 0.06 * s, 0.1 * s, -0.85 * s + i * 0.34 * s, 0.035 * s, -0.38 * s, "stone", 0)),
  ],
  stone_bridge: (r, s) => [
    // abutments
    bx(0.4 * s, 0.45 * s, 1.5 * s, -0.85 * s, 0.225 * s, 0, "stone"),
    bx(0.4 * s, 0.45 * s, 1.5 * s, 0.85 * s, 0.225 * s, 0, "stone"),
    // stone arch (half torus)
    torus(0.62 * s, 0.1 * s, 0, 0.42 * s, 0, "stoneLight", 14, Math.PI),
    // deck
    bx(2.15 * s, 0.13 * s, 0.95 * s, 0, 0.5 * s, 0, "stone"),
    // parapet rails + posts
    bx(2.2 * s, 0.07 * s, 0.07 * s, 0, 0.62 * s, -0.44 * s, "stoneLight"),
    bx(2.2 * s, 0.07 * s, 0.07 * s, 0, 0.62 * s, 0.44 * s, "stoneLight"),
    ...Array.from({ length: 4 }, (_, i) => bx(0.09 * s, 0.2 * s, 0.09 * s, -0.9 * s + i * 0.6 * s, 0.57 * s, -0.44 * s, "stone", 0)),
    ...Array.from({ length: 4 }, (_, i) => bx(0.09 * s, 0.2 * s, 0.09 * s, -0.9 * s + i * 0.6 * s, 0.57 * s, 0.44 * s, "stone", 0)),
  ],
  fort: (r, s) => [
    bx(2.0 * s, 0.8 * s, 0.25 * s, 0, 0.4 * s, -0.9 * s, "stone"),
    bx(2.0 * s, 0.8 * s, 0.25 * s, 0, 0.4 * s, 0.9 * s, "stone"),
    bx(0.25 * s, 0.8 * s, 1.6 * s, -0.9 * s, 0.4 * s, 0, "stone"),
    bx(0.25 * s, 0.8 * s, 1.6 * s, 0.9 * s, 0.4 * s, 0, "stone"),
    bx(0.55 * s, 0.5 * s, 0.55 * s, -1.05 * s, 0.25 * s, -1.05 * s, "stone"),
    bx(0.55 * s, 0.5 * s, 0.55 * s, 1.05 * s, 0.25 * s, -1.05 * s, "stone"),
    bx(0.55 * s, 0.5 * s, 0.55 * s, -1.05 * s, 0.25 * s, 1.05 * s, "stone"),
    bx(0.55 * s, 0.5 * s, 0.55 * s, 1.05 * s, 0.25 * s, 1.05 * s, "stone"),
    bx(0.3 * s, 0.12 * s, 0.55 * s, -0.55 * s, 0.78 * s, 0.9 * s, "darkWood"),
    bx(0.3 * s, 0.12 * s, 0.55 * s, 0.55 * s, 0.78 * s, 0.9 * s, "darkWood"),
    cy(0.04 * s, 0.04 * s, 1.5 * s, 0, 1.5 * s, 0, "wood", 5),
    bx(0.24 * s, 0.15 * s, 0.02 * s, 0, 1.6 * s, 0, "redFlag"),
  ],
  galleon_port: (r, s) => [
    bx(2.0 * s, 0.1 * s, 0.55 * s, 0.25 * s, 0.05 * s, 0, "wood"),
    cy(0.04 * s, 0.04 * s, 0.35 * s, 0.2 * s, 0.175 * s, 0.2 * s, "darkWood", 4),
    cy(0.04 * s, 0.04 * s, 0.35 * s, 0.2 * s, 0.175 * s, -0.2 * s, "darkWood", 4),
    bx(1.0 * s, 0.75 * s, 0.75 * s, -0.9 * s, 0.375 * s, 0, "adobe"),
    ...gable(1.15 * s, 0.9 * s, 0.4 * s, "tile", 0),
    cy(0.05 * s, 0.05 * s, 1.1 * s, 0.1 * s, 0.85 * s, -0.15 * s, "wood", 5),
    bx(0.04 * s, 0.9 * s, 0.04 * s, 0.1 * s, 1.3 * s, 0.25 * s, "wood"),
    bx(0.2 * s, 0.3 * s, 0.3 * s, -0.4 * s, 0.15 * s, 0.3 * s, "cargo"),
    cy(0.14 * s, 0.14 * s, 0.4 * s, 0.85 * s, 0.2 * s, 0, "darkWood", 6).g && (() => { const c = cy(0.14 * s, 0.14 * s, 0.4 * s, 0.85 * s, 0.2 * s, 0, "darkWood", 6); c.g.scale(1, 0.6, 1); return c; })(),
  ],
  stone_quarry: (r, s) => [
    // stepped quarry terraces cut into the rock
    cy(1.15 * s, 1.4 * s, 0.32 * s, 0, 0.16 * s, 0, "limestone", 8),
    cy(0.8 * s, 1.05 * s, 0.3 * s, 0, 0.38 * s, 0, "stone", 8),
    // flooded pit floor
    cy(0.5 * s, 0.62 * s, 0.1 * s, 0, 0.52 * s, 0, "lagoon", 8),
    // boom crane hoisting a block
    cy(0.06 * s, 0.07 * s, 1.15 * s, 0.75 * s, 0.575 * s, 0, "iron", 6),
    bx(0.75 * s, 0.05 * s, 0.05 * s, 1.0 * s, 1.15 * s, 0, "iron"),
    cy(0.03 * s, 0.03 * s, 0.5 * s, 1.32 * s, 0.95 * s, 0, "dark", 4),
    bx(0.2 * s, 0.14 * s, 0.16 * s, 1.32 * s, 0.7 * s, 0, "stoneLight"),
    // dressed blocks in rows
    bx(0.3 * s, 0.15 * s, 0.2 * s, -0.65 * s, 0.12 * s, 0.55 * s, "stoneLight"),
    bx(0.26 * s, 0.13 * s, 0.18 * s, -0.65 * s, 0.2 * s, 0.55 * s, "limestone"),
    bx(0.24 * s, 0.12 * s, 0.16 * s, -0.65 * s, 0.28 * s, 0.55 * s, "stone"),
    bx(0.3 * s, 0.15 * s, 0.2 * s, -0.3 * s, 0.12 * s, 0.75 * s, "stone"),
    bx(0.26 * s, 0.13 * s, 0.18 * s, -0.3 * s, 0.2 * s, 0.75 * s, "stoneLight"),
    // foreman's shed with tile roof
    bx(0.65 * s, 0.5 * s, 0.5 * s, -0.8 * s, 0.25 * s, -0.65 * s, "plank"),
    cone(0.55 * s, 0.32 * s, -0.8 * s, 0.55 * s, -0.65 * s, "tile", 4, Math.PI / 4),
  ],
  church_school: (r, s) => [
    bx(1.7 * s, 0.85 * s, 1.0 * s, 0, 0.425 * s, 0, "adobe"),
    ...gable(1.85 * s, 1.15 * s, 0.5 * s, "tile", 0),
    bx(0.38 * s, 1.0 * s, 0.38 * s, 0.85 * s, 0.5 * s, 0, "white"),
    cone(0.3 * s, 0.3 * s, 0.85 * s, 1.05 * s, 0, "tile", 4, Math.PI / 4),
    bx(0.14 * s, 0.03 * s, 0.03 * s, 0.85 * s, 1.32 * s, 0, "white"),
    bx(0.03 * s, 0.15 * s, 0.03 * s, 0.85 * s, 1.4 * s, 0, "white"),
    bx(0.3 * s, 0.5 * s, 0.06 * s, -0.5 * s, 0.25 * s, 0.52 * s, "door"),
    win(0.16 * s, 0.22 * s, -0.15 * s, 0.5 * s, 0.52 * s, 0),
    win(0.16 * s, 0.22 * s, 0.3 * s, 0.5 * s, 0.52 * s, 0),
    bx(1.0 * s, 0.14 * s, 0.3 * s, 0, 0.07 * s, -0.75 * s, "darkWood"),
  ],

  /* ==== German ==== */
  copra_plantation: (r, s) => [
    ...palmTree(s), ...palmTree(s * 0.85).map(p => ({ g: p.g.clone().translate(0.5 * s, 0, 0.45 * s), m: p.m })),
    ...palmTree(s * 0.8).map(p => ({ g: p.g.clone().translate(-0.5 * s, 0, -0.4 * s), m: p.m })),
    bx(0.9 * s, 0.45 * s, 0.6 * s, 0.15 * s, 0.225 * s, 0.65 * s, "plank"),
    ...gable(1.0 * s, 0.7 * s, 0.3 * s, "thatch", 0),
    cy(0.15 * s, 0.15 * s, 0.16 * s, -0.5 * s, 0.08 * s, 0.6 * s, "gold", 5),
    cy(0.15 * s, 0.15 * s, 0.16 * s, -0.2 * s, 0.08 * s, 0.75 * s, "gold", 5),
  ],
  admin_office: (r, s) => [
    bx(1.25 * s, 1.2 * s, 0.85 * s, 0, 0.6 * s, 0, "white"),
    ...gable(1.4 * s, 1.0 * s, 0.45 * s, "dark", 0),
    bx(1.5 * s, 0.06 * s, 1.05 * s, 0, 0.78 * s, 0, "iron"),
    pillar(0.04 * s, 0.75 * s, -0.55 * s, -0.45 * s, "wood", 4), pillar(0.04 * s, 0.75 * s, 0.55 * s, -0.45 * s, "wood", 4),
    pillar(0.04 * s, 0.75 * s, -0.55 * s, 0.45 * s, "wood", 4), pillar(0.04 * s, 0.75 * s, 0.55 * s, 0.45 * s, "wood", 4),
    win(0.2 * s, 0.26 * s, -0.35 * s, 0.7 * s, 0.45 * s, 0),
    win(0.2 * s, 0.26 * s, 0.35 * s, 0.7 * s, 0.45 * s, 0),
    bx(0.28 * s, 0.45 * s, 0.06 * s, 0, 0.4 * s, 0.44 * s, "door"),
    cy(0.03 * s, 0.03 * s, 1.3 * s, 0.7 * s, 1.3 * s, 0, "wood", 5),
    bx(0.3 * s, 0.14 * s, 0.02 * s, 0.7 * s, 1.45 * s, 0, "dark"),
    bx(0.3 * s, 0.14 * s, 0.02 * s, 0.7 * s, 1.6 * s, 0, "redFlag"),
  ],
  german_school: (r, s) => [
    bx(1.4 * s, 0.75 * s, 0.9 * s, 0, 0.375 * s, 0, "white"),
    ...gable(1.55 * s, 1.05 * s, 0.45 * s, "dark", 0),
    bx(0.3 * s, 0.45 * s, 0.06 * s, -0.45 * s, 0.225 * s, 0.46 * s, "door"),
    win(0.16 * s, 0.2 * s, 0.4 * s, 0.45 * s, 0.46 * s, 0),
    sph(0.08 * s, 0.9 * s, 1.15 * s, 0, "gold"),
    bx(0.04 * s, 0.3 * s, 0.04 * s, 0.9 * s, 0.95 * s, 0, "iron"),
  ],
  port_wharf: (r, s) => [
    bx(2.1 * s, 0.1 * s, 0.6 * s, 0.3 * s, 0.05 * s, 0, "wood"),
    cy(0.05 * s, 0.05 * s, 0.4 * s, 0.3 * s, 0.2 * s, 0.25 * s, "darkWood", 4),
    cy(0.05 * s, 0.05 * s, 0.4 * s, 0.3 * s, 0.2 * s, -0.25 * s, "darkWood", 4),
    cy(0.06 * s, 0.06 * s, 1.2 * s, 0.15 * s, 0.9 * s, 0, "iron", 5),
    bx(0.05 * s, 0.7 * s, 0.05 * s, 0.15 * s, 1.25 * s, 0.35 * s, "iron"),
    bx(0.25 * s, 0.2 * s, 0.2 * s, 0.15 * s, 1.1 * s, 0.35 * s, "cargo"),
    bx(0.9 * s, 0.6 * s, 0.6 * s, -0.9 * s, 0.3 * s, 0, "adobe"),
    ...gable(1.05 * s, 0.75 * s, 0.35 * s, "tile", 0),
    cone(0.25 * s, 0.3 * s, -0.4 * s, 0.15 * s, 0.4 * s, "dark", 8),
    cone(0.25 * s, 0.3 * s, 0.1 * s, 0.15 * s, 0.4 * s, "dark", 8),
  ],
  lighthouse: (r, s) => [
    cy(0.13 * s, 0.32 * s, 1.7 * s, 0, 0.85 * s, 0, "white", 8),
    cy(0.16 * s, 0.24 * s, 0.3 * s, 0, 0.98 * s, 0, "redFlag", 8),
    cy(0.11 * s, 0.11 * s, 0.16 * s, 0, 1.76 * s, 0, "glass", 8),
    cone(0.16 * s, 0.16 * s, 0, 1.93 * s, 0, "iron", 4, Math.PI / 4),
    sph(0.06 * s, 0, 1.8 * s, 0, "whiteGlow"),
  ],
  sugarcane_field: (r, s) => [
    ...Array.from({ length: 2 }, (_, i) => Array.from({ length: 6 }, (_, j) => {
      const x = -0.65 * s + j * 0.26 * s, z = -0.2 * s + i * 0.4 * s;
      return [cy(0.03 * s, 0.03 * s, 0.5 * s, x, 0.25 * s, z, "green", 4), cone(0.06 * s, 0.12 * s, x, 0.55 * s, z, "darkGreen", 4)];
    }).flat()).flat(),
    bx(1.8 * s, 0.05 * s, 0.85 * s, 0, 0.025 * s, 0, "soil"),
  ],
  sugar_mill: (r, s) => [
    bx(2.0 * s, 1.1 * s, 1.2 * s, 0, 0.55 * s, 0, "brick"),
    ...gable(2.15 * s, 1.35 * s, 0.55 * s, "roofGrey", 0),
    cy(0.13 * s, 0.2 * s, 1.9 * s, 0.9 * s, 0.95 * s, 0, "brick", 8),
    cy(0.16 * s, 0.22 * s, 0.12 * s, 0.9 * s, 1.95 * s, 0, "dark", 8),
    bx(1.7 * s, 0.09 * s, 0.24 * s, 0.1 * s, 0.95 * s, 0.55 * s, "iron"),
    bx(0.55 * s, 0.45 * s, 0.45 * s, -0.95 * s, 0.225 * s, 0, "brick"),
    cy(0.3 * s, 0.34 * s, 0.5 * s, -0.5 * s, 0.25 * s, 0.7 * s, "darkGreen", 8),
    win(0.5 * s, 0.16 * s, 0, 0.75 * s, 0.61 * s, 0),
    win(0.5 * s, 0.16 * s, 0, 0.45 * s, 0.61 * s, 0),
  ],
  immigrant_camp: (r, s) => [
    bx(1.2 * s, 0.5 * s, 0.6 * s, -0.55 * s, 0.25 * s, 0, "plank"),
    ...gable(1.35 * s, 0.75 * s, 0.3 * s, "dark", 0),
    bx(1.2 * s, 0.5 * s, 0.6 * s, 0.55 * s, 0.25 * s, 0, "plank"),
    ...gable(1.35 * s, 0.75 * s, 0.3 * s, "dark", 0),
    pillar(0.03 * s, 0.9 * s, 0, -0.4 * s, "iron", 4), pillar(0.03 * s, 0.9 * s, 0, 0.4 * s, "iron", 4),
    bx(1.1 * s, 0.02 * s, 0.02 * s, 0, 0.9 * s, 0, "dark"),
    cy(0.34 * s, 0.34 * s, 0.38 * s, 0, 1.15 * s, 0, "iron", 8),
    cone(0.36 * s, 0.12 * s, 0, 1.4 * s, 0, "roofGrey", 8, 0),
  ],
  railway: (r, s) => [
    bx(2.0 * s, 0.03 * s, 0.04 * s, 0, 0.03 * s, 0.1 * s, "iron"),
    bx(2.0 * s, 0.03 * s, 0.04 * s, 0, 0.03 * s, -0.1 * s, "iron"),
    ...Array.from({ length: 8 }, (_, i) => bx(0.26 * s, 0.02 * s, 0.26 * s, -0.88 * s + i * 0.25 * s, 0.03 * s, 0, "darkWood")).flat(),
    bx(0.4 * s, 0.32 * s, 0.22 * s, 0.35 * s, 0.22 * s, 0, "iron"),
    bx(0.16 * s, 0.18 * s, 0.18 * s, 0.55 * s, 0.38 * s, 0, "dark"),
    cy(0.05 * s, 0.05 * s, 0.3 * s, 0.62 * s, 0.62 * s, 0, "iron", 5),
    cone(0.2 * s, 0.16 * s, 0.62 * s, 0.85 * s, 0, "iron", 4, 0),
  ],
  power_plant: (r, s) => [
    bx(1.6 * s, 0.9 * s, 1.0 * s, 0, 0.45 * s, 0, "concrete"),
    cy(0.12 * s, 0.17 * s, 1.5 * s, 0.6 * s, 0.75 * s, 0, "concrete", 8),
    cy(0.16 * s, 0.2 * s, 0.12 * s, 0.6 * s, 1.55 * s, 0, "dark", 8),
    cy(0.3 * s, 0.46 * s, 0.95 * s, -0.6 * s, 0.475 * s, 0, "concrete", 10),
    win(0.6 * s, 0.14 * s, 0, 0.6 * s, 0.52 * s, 0),
  ],
  fish_cannery: (r, s) => [
    bx(1.5 * s, 0.85 * s, 1.0 * s, 0, 0.425 * s, 0, "steel"),
    ...gable(1.65 * s, 1.15 * s, 0.4 * s, "roofGrey", 0),
    bx(1.0 * s, 0.08 * s, 0.4 * s, 0.5 * s, 0.04 * s, 0, "wood"),
    bx(0.28 * s, 0.22 * s, 0.2 * s, 0.35 * s, 0.11 * s, 0.1 * s, "skyBlue"),
    bx(0.28 * s, 0.22 * s, 0.2 * s, 0.65 * s, 0.11 * s, -0.1 * s, "skyBlue"),
    cy(0.1 * s, 0.1 * s, 0.4 * s, -0.5 * s, 0.3 * s, 0.4 * s, "iron", 6),
  ],
  phosphate_mine: (r, s) => [
    cy(0.85 * s, 1.0 * s, 0.14 * s, 0, 0.07 * s, 0, "soil", 12),
    cy(0.7 * s, 0.8 * s, 0.06 * s, 0, 0.12 * s, 0, "darkStone", 12),
    cone(0.28 * s, 0.3 * s, -0.6 * s, 0.15 * s, 0.3 * s, "darkStone", 8),
    cone(0.28 * s, 0.3 * s, 0.5 * s, 0.15 * s, -0.35 * s, "darkStone", 8),
    bx(0.9 * s, 0.07 * s, 0.2 * s, 0.1 * s, 0.45 * s, 0.1 * s, "iron"),
    bx(0.5 * s, 0.4 * s, 0.4 * s, 0.8 * s, 0.2 * s, 0.1 * s, "plank"),
  ],

  /* ==== Japanese ==== */
  harbor_upgrade: (r, s) => [
    bx(2.2 * s, 0.22 * s, 0.6 * s, 0.3 * s, 0.11 * s, 0, "concrete"),
    cy(0.05 * s, 0.05 * s, 0.5 * s, 0.3 * s, 0.25 * s, 0.25 * s, "darkWood", 4),
    cy(0.05 * s, 0.05 * s, 0.5 * s, 0.3 * s, 0.25 * s, -0.25 * s, "darkWood", 4),
    bx(0.08 * s, 1.0 * s, 0.08 * s, -0.1 * s, 0.5 * s, -0.2 * s, "iron"),
    bx(0.08 * s, 1.0 * s, 0.08 * s, 0.35 * s, 0.5 * s, -0.2 * s, "iron"),
    bx(0.85 * s, 0.08 * s, 0.1 * s, 0.12 * s, 1.0 * s, -0.2 * s, "iron"),
    bx(0.3 * s, 0.28 * s, 0.28 * s, -0.6 * s, 0.14 * s, 0.2 * s, "cargo"),
    bx(0.3 * s, 0.28 * s, 0.28 * s, -0.6 * s, 0.14 * s, 0.55 * s, "cargo"),
    bx(0.3 * s, 0.28 * s, 0.28 * s, -0.25 * s, 0.14 * s, 0.35 * s, "cargo"),
  ],
  military_bunker: (r, s) => [
    sph(0.5 * s, 0, 0.26 * s, 0, "concrete", 10).g && (() => { const c = sph(0.5 * s, 0, 0.26 * s, 0, "concrete", 10); c.g.scale(1, 0.62, 1); return c; })(),
    bx(0.16 * s, 0.1 * s, 0.5 * s, 0, 0.4 * s, 0, "dark"),
    cy(0.04 * s, 0.04 * s, 0.3 * s, 0, 0.5 * s, 0.28 * s, "iron", 6),
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return bx(0.28 * s, 0.16 * s, 0.16 * s, Math.cos(a) * 0.45 * s, 0.08 * s, Math.sin(a) * 0.45 * s, "gold").g.rotateY(a + 0.4) && bx(0.28 * s, 0.16 * s, 0.16 * s, Math.cos(a) * 0.45 * s, 0.08 * s, Math.sin(a) * 0.45 * s, "gold");
    }).flat(),
  ],
  military_base: (r, s) => [
    // runway
    bx(2.7 * s, 0.07 * s, 0.9 * s, 0, 0.035 * s, 0, "concrete"),
    bx(2.7 * s, 0.015 * s, 0.06 * s, 0, 0.08 * s, 0, "whiteGlow"),
    // hangar with gabled roof
    bx(0.95 * s, 0.5 * s, 0.65 * s, 0.75 * s, 0.25 * s, 0.15 * s, "steel"),
    ...lift(gable(1.05 * s, 0.75 * s, 0.4 * s, "roofGrey", 0), 0.25 * s),
    // control tower
    cy(0.12 * s, 0.17 * s, 0.9 * s, -0.85 * s, 0.45 * s, 0.6 * s, "concrete", 6),
    bx(0.36 * s, 0.16 * s, 0.36 * s, -0.85 * s, 0.98 * s, 0.6 * s, "glass"),
    dome(0.15 * s, 0.13 * s, -0.85 * s, 1.06 * s, 0.6 * s, "white", 10),
    // radar mast + fuel tanks
    cy(0.025 * s, 0.025 * s, 0.6 * s, 0.15 * s, 0.3 * s, 0.85 * s, "iron", 5),
    cy(0.15 * s, 0.15 * s, 0.24 * s, -0.4 * s, 0.12 * s, -0.75 * s, "olive", 10),
    cy(0.12 * s, 0.12 * s, 0.2 * s, -0.15 * s, 0.1 * s, -0.8 * s, "olive", 10),
    // parked fighter: fuselage, wings, tail
    cy(0.05 * s, 0.05 * s, 0.55 * s, -0.5 * s, 0.1 * s, -0.15 * s, "skyBlue", 6),
    bx(0.42 * s, 0.025 * s, 0.14 * s, -0.5 * s, 0.14 * s, -0.15 * s, "steel"),
    bx(0.04 * s, 0.1 * s, 0.06 * s, -0.76 * s, 0.19 * s, -0.15 * s, "skyBlue"),
  ],
  naval_base: (r, s) => [
    // deep-water quay
    bx(2.3 * s, 0.16 * s, 0.75 * s, 0, 0.08 * s, 0, "concrete"),
    // gantry cranes
    cy(0.05 * s, 0.05 * s, 0.95 * s, 0.55 * s, 0.475 * s, 0.3 * s, "iron", 5),
    bx(0.75 * s, 0.05 * s, 0.07 * s, 0.75 * s, 0.96 * s, 0.3 * s, "iron"),
    cy(0.05 * s, 0.05 * s, 0.75 * s, -0.65 * s, 0.375 * s, 0.25 * s, "iron", 5),
    bx(0.55 * s, 0.05 * s, 0.07 * s, -0.85 * s, 0.78 * s, 0.25 * s, "iron"),
    // warship moored at the quay
    cy(0.06 * s, 0.06 * s, 1.4 * s, -0.45 * s, 0.12 * s, -0.55 * s, "steel", 8),
    bx(0.32 * s, 0.12 * s, 0.12 * s, -0.45 * s, 0.26 * s, -0.55 * s, "iron"),
    bx(0.045 * s, 0.26 * s, 0.07 * s, -1.1 * s, 0.33 * s, -0.55 * s, "steel"),
    // fuel depot
    cy(0.16 * s, 0.16 * s, 0.32 * s, 0.85 * s, 0.16 * s, -0.6 * s, "olive", 10),
    cy(0.13 * s, 0.13 * s, 0.28 * s, 1.05 * s, 0.14 * s, -0.65 * s, "olive", 10),
    // guardhouse with gate
    bx(0.55 * s, 0.32 * s, 0.42 * s, 0.95 * s, 0.16 * s, 0.62 * s, "cement"),
    ...lift(gable(0.65 * s, 0.52 * s, 0.28 * s, "roofGrey", 0), 0.32 * s),
  ],
  water_system: (r, s) => [
    pillar(0.04 * s, 1.1 * s, -0.25 * s, -0.25 * s, "iron", 4), pillar(0.04 * s, 1.1 * s, 0.25 * s, -0.25 * s, "iron", 4),
    pillar(0.04 * s, 1.1 * s, -0.25 * s, 0.25 * s, "iron", 4), pillar(0.04 * s, 1.1 * s, 0.25 * s, 0.25 * s, "iron", 4),
    cy(0.4 * s, 0.4 * s, 0.5 * s, 0, 1.35 * s, 0, "iron", 8),
    cone(0.42 * s, 0.12 * s, 0, 1.66 * s, 0, "roofGrey", 8, 0),
    cy(0.05 * s, 0.05 * s, 1.6 * s, 0.5 * s, 0.8 * s, 0.3 * s, "iron", 5),
    cy(0.05 * s, 0.05 * s, 1.2 * s, 0.2 * s, 0.6 * s, -0.4 * s, "iron", 5),
  ],
  power_grid: (r, s) => [
    ...Array.from({ length: 4 }, (_, i) => {
      const x = -0.75 * s + i * 0.5 * s;
      return [cy(0.035 * s, 0.035 * s, 1.0 * s, x, 0.5 * s, 0, "wood", 4), bx(0.34 * s, 0.03 * s, 0.03 * s, x, 0.85 * s, 0, "dark"), bx(0.03 * s, 0.08 * s, 0.03 * s, x - 0.16 * s, 0.92 * s, 0, "iron")];
    }).flat(),
    bx(1.7 * s, 0.015 * s, 0.015 * s, -0.1 * s, 0.72 * s, 0, "dark"),
  ],
  fish_cannery_jp: (r, s) => [
    bx(1.3 * s, 0.7 * s, 0.9 * s, 0, 0.35 * s, 0, "concrete"),
    ...gable(1.45 * s, 1.05 * s, 0.4 * s, "roofGrey", 0),
    bx(0.4 * s, 0.3 * s, 0.3 * s, 0.7 * s, 0.15 * s, 0.2 * s, "navy"),
    cy(0.09 * s, 0.09 * s, 0.5 * s, -0.5 * s, 0.4 * s, 0.35 * s, "iron", 6),
  ],

  /* ==== American / Commonwealth ==== */
  hospital: (r, s) => [
    bx(1.4 * s, 0.75 * s, 1.0 * s, 0, 0.375 * s, 0, "white"),
    ...gable(1.55 * s, 1.15 * s, 0.45 * s, "roofGrey", 0),
    bx(0.85 * s, 0.55 * s, 0.55 * s, 1.15 * s, 0.275 * s, 0, "white"),
    ...gable(0.95 * s, 0.65 * s, 0.3 * s, "roofGrey", 0),
    bx(0.85 * s, 0.55 * s, 0.55 * s, -1.15 * s, 0.275 * s, 0, "white"),
    ...gable(0.95 * s, 0.65 * s, 0.3 * s, "roofGrey", 0),
    bx(0.5 * s, 0.08 * s, 0.08 * s, 0, 0.85 * s, 0, "redFlag"),
    bx(0.08 * s, 0.5 * s, 0.08 * s, 0, 1.08 * s, 0, "redFlag"),
    bx(0.3 * s, 0.45 * s, 0.06 * s, 0, 0.5 * s, 0.52 * s, "glass"),
  ],
  high_school: (r, s) => [
    bx(1.5 * s, 0.8 * s, 0.9 * s, 0, 0.4 * s, 0, "concrete"),
    ...gable(1.65 * s, 1.05 * s, 0.45 * s, "roofGrey", 0),
    bx(1.2 * s, 0.65 * s, 0.8 * s, -1.5 * s, 0.325 * s, 0, "steel"),
    bx(1.2 * s, 0.7 * s, 0.8 * s, 1.5 * s, 0.35 * s, 0, "steel"),
    cy(0.03 * s, 0.03 * s, 1.2 * s, 0, 1.2 * s, 0, "iron", 5),
    bx(0.3 * s, 0.14 * s, 0.02 * s, 0, 1.38 * s, 0, "blueFlag"),
    bx(0.3 * s, 0.14 * s, 0.02 * s, 0, 1.52 * s, 0, "redFlag"),
  ],
  airport: (r, s) => [
    bx(3.2 * s, 0.07 * s, 0.75 * s, 0, 0.035 * s, 0, "cement"),
    ...Array.from({ length: 5 }, (_, i) => bx(0.3 * s, 0.02 * s, 0.08 * s, -1.3 * s + i * 0.65 * s, 0.07 * s, 0, "white")).flat(),
    bx(0.85 * s, 0.45 * s, 0.55 * s, -1.35 * s, 0.225 * s, 0, "white"),
    ...gable(0.95 * s, 0.65 * s, 0.3 * s, "roofGrey", 0),
    bx(0.26 * s, 0.55 * s, 0.26 * s, 0.5 * s, 0.275 * s, 0, "white"),
    bx(0.3 * s, 0.14 * s, 0.3 * s, 0.5 * s, 0.6 * s, 0, "glass"),
    cy(0.11 * s, 0.12 * s, 0.85 * s, 0.3 * s, 0.5 * s, 0.25 * s, "white", 8).g && (() => { const c = cy(0.11 * s, 0.12 * s, 0.85 * s, 0.3 * s, 0.5 * s, 0.25 * s, "white", 8); c.g.scale(1, 0.85, 1); return c; })(),
    bx(0.05 * s, 0.65 * s, 0.28 * s, 0.3 * s, 0.5 * s, 0.25 * s, "white"),
    bx(0.14 * s, 0.14 * s, 0.04 * s, 0.3 * s, 0.82 * s, 0.6 * s, "redFlag"),
  ],
  deep_harbor: (r, s) => [
    bx(2.4 * s, 0.25 * s, 0.7 * s, 0.35 * s, 0.125 * s, 0, "concrete"),
    bx(0.07 * s, 1.2 * s, 0.07 * s, -0.1 * s, 0.6 * s, -0.2 * s, "metal"),
    bx(0.07 * s, 1.2 * s, 0.07 * s, 0.45 * s, 0.6 * s, -0.2 * s, "metal"),
    bx(1.0 * s, 0.09 * s, 0.12 * s, 0.18 * s, 1.2 * s, -0.2 * s, "metal"),
    bx(0.25 * s, 0.22 * s, 0.22 * s, 0.45 * s, 0.11 * s, -0.35 * s, "cargo"),
    bx(0.25 * s, 0.22 * s, 0.22 * s, -0.3 * s, 0.11 * s, -0.1 * s, "cargo"),
    bx(0.25 * s, 0.22 * s, 0.22 * s, -0.3 * s, 0.11 * s, -0.5 * s, "cargo"),
    bx(0.9 * s, 0.6 * s, 0.5 * s, -1.3 * s, 0.3 * s, 0, "steel"),
  ],
  asphalt_roads: (r, s) => [
    bx(1.95 * s, 0.05 * s, 0.78 * s, 0, 0.025 * s, 0, "dark"),
    // solid center line + dashed edge lines
    bx(1.95 * s, 0.012 * s, 0.045 * s, 0, 0.058 * s, 0, "whiteGlow"),
    ...Array.from({ length: 8 }, (_, i) => bx(0.22 * s, 0.012 * s, 0.03 * s, -0.84 * s + i * 0.24 * s, 0.058 * s, 0.31 * s, "whiteGlow", 0)),
    ...Array.from({ length: 8 }, (_, i) => bx(0.22 * s, 0.012 * s, 0.03 * s, -0.84 * s + i * 0.24 * s, 0.058 * s, -0.31 * s, "whiteGlow", 0)),
  ],
  telecom: (r, s) => [
    bx(0.05 * s, 1.3 * s, 0.05 * s, -0.08 * s, 0.65 * s, 0, "metal"),
    bx(0.05 * s, 1.3 * s, 0.05 * s, 0.08 * s, 0.65 * s, 0, "metal"),
    bx(0.05 * s, 1.3 * s, 0.05 * s, 0, 0.65 * s, -0.08 * s, "metal"),
    bx(0.05 * s, 1.3 * s, 0.05 * s, 0, 0.65 * s, 0.08 * s, "metal"),
    ...Array.from({ length: 4 }, (_, i) => bx(0.3 * s, 0.05 * s, 0.3 * s, 0, 0.4 * s + i * 0.28 * s, 0, "metal")).flat(),
    cone(0.28 * s, 0.22 * s, 0, 1.5 * s, 0, "white", 8, 0),
    sph(0.04 * s, 0, 1.78 * s, 0, "redFlag"),
  ],
  resort_hotel: (r, s) => [
    bx(1.1 * s, 2.4 * s, 0.9 * s, 0, 1.2 * s, 0, "white"),
    bx(1.2 * s, 0.12 * s, 1.0 * s, 0, 2.5 * s, 0, "roofGrey"),
    bx(0.85 * s, 0.7 * s, 0.6 * s, -1.1 * s, 0.35 * s, 0, "white"),
    ...gable(0.95 * s, 0.7 * s, 0.3 * s, "tile", 0),
    bx(0.85 * s, 0.7 * s, 0.6 * s, 1.1 * s, 0.35 * s, 0, "white"),
    ...gable(0.95 * s, 0.7 * s, 0.3 * s, "tile", 0),
    bx(0.85 * s, 0.06 * s, 0.5 * s, 0, 0.1 * s, 0.9 * s, "lagoon"),
    bx(0.06 * s, 0.06 * s, 0.5 * s, 0.4 * s, 0.14 * s, 0.9 * s, "white"),
    cy(0.03 * s, 0.03 * s, 0.8 * s, -1.6 * s, 0.4 * s, 0.5 * s, "wood", 5),
    cone(0.22 * s, 0.1 * s, -1.6 * s, 0.9 * s, 0.5 * s, "redFlag", 8, 0),
    ...palmTree(s * 0.8),
    win(0.5 * s, 0.16 * s, 0, 1.0 * s, 0.46 * s, 0),
    win(0.5 * s, 0.16 * s, 0, 1.6 * s, 0.46 * s, 0),
  ],
  garment_factory: (r, s) => [
    bx(2.7 * s, 1.25 * s, 1.6 * s, 0, 0.625 * s, 0, "concrete"),
    ...Array.from({ length: 4 }, (_, i) => {
      const x = -0.9 * s + i * 0.6 * s;
      const b = bx(0.6 * s, 0.09 * s, 1.7 * s, x, 1.28 * s, 0, "roofGrey");
      b.g.rotateZ(0.28);
      return b;
    }).flat(),
    win(2.0 * s, 0.12 * s, 0, 0.85 * s, 0.82 * s, 0),
    win(2.0 * s, 0.12 * s, 0, 0.55 * s, 0.82 * s, 0),
    cy(0.1 * s, 0.14 * s, 1.1 * s, 1.2 * s, 0.55 * s, 0, "brick", 8),
    bx(1.0 * s, 0.08 * s, 0.7 * s, 0, 0.04 * s, 0, "cement"),
  ],
  tourism_pier: (r, s) => [
    bx(2.2 * s, 0.09 * s, 0.5 * s, 0.35 * s, 0.045 * s, 0, "wood"),
    bx(2.3 * s, 0.03 * s, 0.03 * s, 0.35 * s, 0.16 * s, 0.22 * s, "white"),
    bx(2.3 * s, 0.03 * s, 0.03 * s, 0.35 * s, 0.16 * s, -0.22 * s, "white"),
    cy(0.16 * s, 0.2 * s, 0.4 * s, 0.7 * s, 0.2 * s, 0, "white", 6).g && (() => { const c = cy(0.16 * s, 0.2 * s, 0.4 * s, 0.7 * s, 0.2 * s, 0, "white", 6); c.g.scale(1, 0.5, 1); return c; })(),
    cy(0.03 * s, 0.03 * s, 0.8 * s, -0.5 * s, 0.4 * s, 0.3 * s, "wood", 5),
    cone(0.2 * s, 0.1 * s, -0.5 * s, 0.85 * s, 0.3 * s, "plastic", 8, 0),
    cy(0.03 * s, 0.03 * s, 0.8 * s, -0.5 * s, 0.4 * s, -0.3 * s, "wood", 5),
    cone(0.2 * s, 0.1 * s, -0.5 * s, 0.85 * s, -0.3 * s, "plastic", 8, 0),
  ],
  duty_free_mall: (r, s) => [
    bx(1.7 * s, 0.85 * s, 1.3 * s, 0, 0.425 * s, 0, "white"),
    bx(1.75 * s, 0.08 * s, 1.35 * s, 0, 0.88 * s, 0, "roofGrey"),
    win(1.3 * s, 0.4 * s, 0, 0.55 * s, 0.66 * s, 0),
    bx(1.9 * s, 0.06 * s, 0.6 * s, 0, 0.03 * s, 0, "cement"),
    bx(0.7 * s, 0.14 * s, 0.14 * s, 0, 1.1 * s, 0, "gold"),
    ...palmTree(s * 0.7),
  ],
  labor_housing: (r, s) => [
    bx(0.65 * s, 1.6 * s, 0.5 * s, -0.75 * s, 0.8 * s, 0, "plank"),
    bx(0.65 * s, 1.6 * s, 0.5 * s, 0, 0.8 * s, 0, "adobe"),
    bx(0.65 * s, 1.6 * s, 0.5 * s, 0.75 * s, 0.8 * s, 0, "concrete"),
    ...Array.from({ length: 6 }, (_, i) => bx(0.6 * s, 0.03 * s, 0.44 * s, -0.75 * s + (i % 3) * 0.75 * s, 0.5 * s + Math.floor(i / 3) * 0.5 * s, 0, "white")).flat(),
    bx(0.02 * s, 0.02 * s, 0.6 * s, -0.35 * s, 1.5 * s, 0.35 * s, "dark"),
    bx(0.02 * s, 0.02 * s, 0.6 * s, 0.35 * s, 1.5 * s, 0.35 * s, "dark"),
  ],
  federal_office: (r, s) => [
    bx(1.3 * s, 1.5 * s, 0.95 * s, 0, 0.75 * s, 0, "concrete"),
    bx(1.35 * s, 0.1 * s, 1.0 * s, 0, 1.55 * s, 0, "roofGrey"),
    cy(0.14 * s, 0.14 * s, 0.05 * s, 0, 1.7 * s, 0, "gold", 12),
    win(0.9 * s, 0.3 * s, 0, 0.8 * s, 0.5 * s, 0),
    win(0.9 * s, 0.3 * s, 0, 0.5 * s, 0.5 * s, 0),
    cy(0.03 * s, 0.03 * s, 1.5 * s, -0.8 * s, 1.5 * s, 0, "iron", 5),
    cy(0.03 * s, 0.03 * s, 1.5 * s, 0.8 * s, 1.5 * s, 0, "iron", 5),
    bx(0.26 * s, 0.12 * s, 0.02 * s, -0.8 * s, 1.65 * s, 0, "blueFlag"),
    bx(0.26 * s, 0.12 * s, 0.02 * s, 0.8 * s, 1.65 * s, 0, "redFlag"),
  ],

  /* ==== Future ==== */
  cultural_center: (r, s) => [
    bx(1.7 * s, 0.22 * s, 1.1 * s, 0, 0.11 * s, 0, "concrete"),
    ...lattePair(s, -0.5 * s, -0.3 * s, 0),
    ...lattePair(s, 0.5 * s, -0.3 * s, 0),
    cy(0.62 * s, 0.62 * s, 1.5 * s, 0, 1.05 * s, 0, "white", 10).g && (() => { const c = cy(0.62 * s, 0.62 * s, 1.5 * s, 0, 1.05 * s, 0, "white", 10); c.g.rotateZ(Math.PI / 2); c.g.scale(1, 0.72, 1); return c; })(),
    win(1.3 * s, 0.5 * s, 0, 0.5 * s, 0.1 * s, 0),
    bx(0.8 * s, 0.06 * s, 0.7 * s, 0, 0.03 * s, 0, "cobble"),
  ],
  green_energy: (r, s) => [
    bx(0.55 * s, 0.05 * s, 0.4 * s, -0.5 * s, 0.32 * s, 0.15 * s, "solar"),
    bx(0.6 * s, 0.03 * s, 0.45 * s, -0.5 * s, 0.22 * s, 0.15 * s, "iron"),
    bx(0.55 * s, 0.05 * s, 0.4 * s, -0.5 * s, 0.32 * s, -0.15 * s, "solar"),
    bx(0.6 * s, 0.03 * s, 0.45 * s, -0.5 * s, 0.22 * s, -0.15 * s, "iron"),
    bx(0.55 * s, 0.05 * s, 0.4 * s, -0.5 * s, 0.32 * s, 0.45 * s, "solar"),
    bx(0.6 * s, 0.03 * s, 0.45 * s, -0.5 * s, 0.22 * s, 0.45 * s, "iron"),
    bx(0.06 * s, 0.05 * s, 0.06 * s, -0.5 * s, 0.03 * s, 0.45 * s, "iron"),
  ],
  university: (r, s) => [
    bx(1.5 * s, 0.8 * s, 1.0 * s, 0, 0.4 * s, 0, "adobe"),
    bx(1.7 * s, 0.08 * s, 1.2 * s, 0, 0.04 * s, 0, "cobble"),
    ...Array.from({ length: 5 }, (_, i) => pillar(0.05 * s, 0.75 * s, -0.6 * s + i * 0.3 * s, 0.55 * s, "stoneLight", 5)).flat(),
    sph(0.45 * s, 0, 1.0 * s, 0, "white", 10).g && (() => { const c = sph(0.45 * s, 0, 1.0 * s, 0, "white", 10); c.g.scale(1, 0.55, 1); return c; })(),
    bx(0.3 * s, 1.1 * s, 0.3 * s, 0.9 * s, 0.55 * s, 0, "stoneLight"),
    cone(0.28 * s, 0.3 * s, 0.9 * s, 1.2 * s, 0, "tile", 4, Math.PI / 4),
    bx(0.16 * s, 0.14 * s, 0.03 * s, 0.9 * s, 1.25 * s, 0.16 * s, "gold"),
  ],
  tech_park: (r, s) => [
    bx(0.7 * s, 1.9 * s, 0.7 * s, -0.55 * s, 0.95 * s, 0, "glass"),
    bx(0.75 * s, 0.1 * s, 0.75 * s, -0.55 * s, 1.95 * s, 0, "roofGrey"),
    bx(0.7 * s, 1.6 * s, 0.7 * s, 0.55 * s, 0.8 * s, 0, "steel"),
    bx(0.75 * s, 0.1 * s, 0.75 * s, 0.55 * s, 1.65 * s, 0, "roofGrey"),
    cone(0.3 * s, 0.26 * s, 0, 1.4 * s, 0, "white", 8, 0),
    cy(0.02 * s, 0.02 * s, 0.7 * s, 0, 1.9 * s, 0, "metal", 4),
    bx(0.5 * s, 0.06 * s, 0.5 * s, 0, 0.03 * s, 0, "cement"),
  ],
  deep_sea_port: (r, s) => [
    bx(2.5 * s, 0.28 * s, 0.8 * s, 0.4 * s, 0.14 * s, 0, "concrete"),
    bx(0.07 * s, 1.4 * s, 0.07 * s, -0.05 * s, 0.7 * s, -0.25 * s, "metal"),
    bx(0.07 * s, 1.4 * s, 0.07 * s, 0.55 * s, 0.7 * s, -0.25 * s, "metal"),
    bx(1.1 * s, 0.1 * s, 0.14 * s, 0.25 * s, 1.4 * s, -0.25 * s, "metal"),
    bx(0.28 * s, 0.26 * s, 0.26 * s, 0.55 * s, 0.13 * s, -0.5 * s, "plastic"),
    bx(0.28 * s, 0.26 * s, 0.26 * s, 0.15 * s, 0.13 * s, -0.3 * s, "cargo"),
    bx(0.28 * s, 0.26 * s, 0.26 * s, -0.35 * s, 0.13 * s, -0.1 * s, "plastic"),
    bx(0.28 * s, 0.26 * s, 0.26 * s, -0.35 * s, 0.13 * s, -0.55 * s, "cargo"),
    bx(0.9 * s, 0.7 * s, 0.55 * s, -1.4 * s, 0.35 * s, 0, "steel"),
  ],
  desalination: (r, s) => [
    bx(1.6 * s, 0.8 * s, 1.1 * s, 0, 0.4 * s, 0, "steel"),
    cy(0.55 * s, 0.6 * s, 0.9 * s, 1.1 * s, 0.45 * s, 0, "steel", 10),
    cy(0.06 * s, 0.06 * s, 1.4 * s, -0.7 * s, 0.9 * s, 0.4 * s, "iron", 6),
    cy(0.06 * s, 0.06 * s, 1.1 * s, -0.4 * s, 0.75 * s, -0.4 * s, "iron", 6),
    bx(1.3 * s, 0.08 * s, 0.4 * s, 0.2 * s, 1.2 * s, 0, "iron"),
    bx(0.9 * s, 0.06 * s, 0.9 * s, 0, 0.03 * s, 0, "concrete"),
  ],
  heritage_site: (r, s) => [
    bx(2.6 * s, 0.1 * s, 2.6 * s, 0, 0.05 * s, 0, "cobble"),
    ...lattePair(s, -0.9 * s, -0.75 * s, 0), ...lattePair(s, 0, -0.9 * s, 0), ...lattePair(s, 0.9 * s, -0.75 * s, 0),
    ...lattePair(s, -0.9 * s, 0.75 * s, 0), ...lattePair(s, 0, 0.9 * s, 0), ...lattePair(s, 0.9 * s, 0.75 * s, 0),
    cy(0.04 * s, 0.04 * s, 0.8 * s, 0, 0.8 * s, 0, "iron", 5),
    bx(0.55 * s, 0.35 * s, 0.05 * s, 0, 1.1 * s, 0, "white"),
    bx(0.55 * s, 0.02 * s, 0.06 * s, 0, 0.95 * s, 0, "gold"),
    bx(0.55 * s, 0.02 * s, 0.06 * s, 0, 1.25 * s, 0, "gold"),
  ],
  fish_farm: (r, s) => [
    torus(0.42 * s, 0.045 * s, -0.4 * s, 0.12 * s, 0.4 * s, "darkStone", 16),
    torus(0.42 * s, 0.045 * s, 0.4 * s, 0.12 * s, 0.4 * s, "darkStone", 16),
    torus(0.42 * s, 0.045 * s, 0, 0.12 * s, -0.4 * s, "darkStone", 16),
    sph(0.05 * s, -0.4 * s, 0.3 * s, 0.4 * s, "gold"),
    sph(0.05 * s, 0.4 * s, 0.3 * s, 0.4 * s, "gold"),
    bx(0.03 * s, 0.5 * s, 0.03 * s, -0.8 * s, 0.25 * s, 0.4 * s, "wood", 4),
    bx(0.03 * s, 0.5 * s, 0.03 * s, 0.8 * s, 0.25 * s, 0.4 * s, "wood", 4),
    bx(1.6 * s, 0.03 * s, 0.03 * s, 0, 0.5 * s, 0.4 * s, "wood"),
  ],
  film_studio: (r, s) => [
    bx(2.1 * s, 1.1 * s, 1.4 * s, 0, 0.55 * s, 0, "concrete"),
    bx(1.6 * s, 0.7 * s, 0.1 * s, 0, 0.35 * s, 0.71 * s, "dark"),
    bx(0.7 * s, 0.14 * s, 0.1 * s, 0, 1.25 * s, 0.71 * s, "white"),
    cone(0.3 * s, 0.5 * s, -0.9 * s, 0.25 * s, 0, "dark", 4, Math.PI / 4).g && (() => { const c = cone(0.3 * s, 0.5 * s, -0.9 * s, 0.25 * s, 0, "dark", 4, Math.PI / 4); c.g.rotateX(-Math.PI / 2); return c; })(),
    cone(0.3 * s, 0.5 * s, 0.9 * s, 0.25 * s, 0, "dark", 4, Math.PI / 4).g && (() => { const c = cone(0.3 * s, 0.5 * s, 0.9 * s, 0.25 * s, 0, "dark", 4, Math.PI / 4); c.g.rotateX(-Math.PI / 2); return c; })(),
  ],
  spaceport: (r, s) => [
    cy(0.95 * s, 0.95 * s, 0.12 * s, 0, 0.06 * s, 0, "concrete", 12),
    cy(0.17 * s, 0.2 * s, 1.5 * s, 0, 0.88 * s, 0, "white", 10),
    cone(0.2 * s, 0.5 * s, 0, 1.83 * s, 0, "redFlag", 10, 0),
    bx(0.05 * s, 0.5 * s, 0.2 * s, 0.2 * s, 0.95 * s, 0, "steel"),
    bx(0.05 * s, 0.5 * s, 0.2 * s, -0.2 * s, 0.95 * s, 0, "steel"),
    bx(0.04 * s, 1.2 * s, 0.04 * s, 0.7 * s, 0.6 * s, 0, "metal"),
    bx(0.6 * s, 0.05 * s, 0.3 * s, 0.7 * s, 1.25 * s, 0, "metal"),
    bx(0.5 * s, 0.4 * s, 0.4 * s, -1.1 * s, 0.2 * s, 0, "white"),
    cone(0.28 * s, 0.22 * s, -1.1 * s, 0.55 * s, 0, "roofGrey", 4, Math.PI / 4),
  ],
  default_house: (r, s) => [
    bx(0.8 * s, 0.55 * s, 0.6 * s, 0, 0.275 * s, 0, "adobe"),
    cone(0.7 * s, 0.4 * s, 0, 0.75 * s, 0, "tile", 4, Math.PI / 4),
    win(0.14 * s, 0.16 * s, -0.2 * s, 0.35 * s, 0.32 * s, 0),
    bx(0.24 * s, 0.36 * s, 0.05 * s, 0.25 * s, 0.18 * s, 0.31 * s, "door"),
  ],
};

/* ---------------- people palettes (Pacific Islander skin, era dress) ---------------- */
const SKIN = [0xc98d63, 0xbf7f56, 0xd29a70, 0xa96e48, 0xb57a52, 0xcc9268];
const HAIR = [0x241a12, 0x1c1510, 0x33261a, 0x2a1f16];
const PEOPLE = {
  ancient:      { locals: [0x8a5a2b, 0xa0703a, 0x6a4a28, 0x7a5a30], visitors: [] },
  contact:      { locals: [0x8a5a2b, 0xa0703a, 0x9a7a4a], visitors: [0x3a3f4a, 0x6b5638] },
  spanish:      { locals: [0xb8a888, 0xa89878, 0xc8b898], visitors: [0x1c1f26, 0x4a4f5a, 0x8b7355] },
  german:       { locals: [0xb8a888, 0xa89878], visitors: [0x5a6068, 0x7a8290, 0x3f4a55] },
  japanese:     { locals: [0xb8a888, 0xa89878], visitors: [0xe8e4d8, 0x8a9a68, 0x5a6a5a] },
  american:     { locals: [0x2a8a80, 0xe07850, 0x3a6ea0, 0xe8b4c4], visitors: [0x9aa0a8, 0x6f7680, 0x4a5560] },
  commonwealth: { locals: [0x2a8a80, 0xe07850, 0x3a6ea0, 0xe8a0b0, 0xd4a94c], visitors: [0x8f7a5a, 0x6b5a44, 0x5a6675, 0x8a8f98] },
  future:       { locals: [0xe8eef4, 0x9fd8e8, 0x2a8a80, 0xe07850], visitors: [0xe8eef4, 0x9fd8e8, 0x6f7680, 0xc8d8e8] },
};
const HATS = {
  spanish: [0x1c1f26, 0x4a4f5a], german: [0x3f4a55, 0x5a6068],
  japanese: [0x5a6a5a, 0x3f4a55], american: [0x4a5560, 0x6f7680],
  commonwealth: [0x5a6675, 0x8a8f98], future: [0x9fd8e8, 0xc8d8e8],
};

/* ---------------- era themes ---------------- */
const THEMES = {
  ancient:     { sky: 0x87c4e8, fog: 0xa8d4ec, water: 0x2f7fa8, sun: 0xffe6b0, sunI: 1.15, hemi: 0.55 },
  contact:     { sky: 0x8fc8e6, fog: 0xb0d8ec, water: 0x2e7ea6, sun: 0xffd9a0, sunI: 1.05, hemi: 0.5 },
  spanish:     { sky: 0xa8b8c4, fog: 0xc2cdd4, water: 0x2a5f80, sun: 0xe8d9b8, sunI: 0.9,  hemi: 0.45 },
  german:      { sky: 0x9fc4d8, fog: 0xbcd8e4, water: 0x2a6b88, sun: 0xdfe8e8, sunI: 0.95, hemi: 0.5 },
  japanese:    { sky: 0xf2d9e0, fog: 0xf7e6ea, water: 0x2f7f9a, sun: 0xffe0d0, sunI: 1.0,  hemi: 0.55 },
  american:    { sky: 0x7fb8e0, fog: 0xa8cde8, water: 0x2a6f9a, sun: 0xfff0c8, sunI: 1.1,  hemi: 0.6 },
  commonwealth:{ sky: 0x6fb0e0, fog: 0x9cc4e4, water: 0x2a77a8, sun: 0xfff2c0, sunI: 1.15, hemi: 0.6 },
  future:      { sky: 0x2e3a52, fog: 0x3d4f6e, water: 0x14405e, sun: 0xbfe8ff, sunI: 1.2,  hemi: 0.5 },
};

/* ---------------- board ---------------- */
/* Optional real coconut-palm GLB replacement. If assets/models/coconut-palm.glb
   is present, we load it once and swap the procedural palms for real models. */
const PALM_SRC = "assets/models/coconut-palm.glb";
let PALM_GLB = null;        // loaded glm.scene (cloned per instance) or null
let PALM_LOADED = false;    // true once we've attempted the load
let PALM_READY = false;     // true when a real GLB successfully loaded

/* Optional real 3D people models (male/female). If present, the procedural
   blocky villagers are replaced by these realistic models, cloned per person.
   The game re-uses one male and one female model for all villagers. */
const PEOPLE_MALE_SRC = "assets/models/person_male.glb";
const PEOPLE_FEMALE_SRC = "assets/models/person_female.glb";
// Animated (skinned) people models. Each entry: { root (cloneable), clips,
//   mixerTemplate:null }. Restored from GLB with embedded Mixamo/other clips.
const PERSON_ANIM = { male: null, female: null };   // { root, clips:{walk,idle,...} }
let PEOPLE_LOADED = false;   // attempted the loads
let PEOPLE_READY = false;    // at least one animated model usable

const Board = {
  ok: false, renderer: null, scene: null, camera: null, controls: null,
  islandRoot: null, buildRoot: null, peopleRoot: null, decorRoot: null, fxRoot: null,
  buildPop: 1,
  islands: {}, people: [], anims: [],
  sun: null, water: null, ring: null, ringSpin: 0,
  theme: null, themeFrom: null, themeCur: null, themeT: 0,
  sel: null, focus: null, shake: null, flash: null, t: 0,
  clock: null, raf: 0, onSelect: null, flashDiv: null,

  init(host, opts){
    try {
      this.onSelect = (opts && opts.onSelect) || null;
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Physically-based, cinematic finish: filmic tone mapping + the correct
      // sRGB output space make PBR materials read soft and natural instead of
      // flat and video-gamey.
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1200);
      this.islandRoot = new THREE.Group();
      this.buildRoot = new THREE.Group();
      this.peopleRoot = new THREE.Group();
      this.decorRoot = new THREE.Group();
      this.fxRoot = new THREE.Group();
      this.scene.add(this.islandRoot, this.buildRoot, this.peopleRoot, this.decorRoot, this.fxRoot);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      // allow close zoom so the player can really see building texture detail
      this.controls.minDistance = 5;
      this.controls.maxDistance = 460;
      this.controls.maxPolarAngle = 1.42;

      this.buildLights();
      this.buildEnvironment();
      this.buildWater();
      this.buildSky();
      this.buildWavePatches();
      this.buildTerrain();
      this.buildSelectionRing();

      // labels
      this.labelRenderer = new CSS2DRenderer();
      this.labelRenderer.domElement.style.position = "absolute";
      this.labelRenderer.domElement.style.top = "0";
      this.labelRenderer.domElement.style.left = "0";
      this.labelRenderer.domElement.style.pointerEvents = "none";
      // CSS2DRenderer assigns each label an ever-growing z-index (0..labelCount).
      // Capping the container at z-index:0 traps all labels in one stacking
      // context, so they can never float above the modal layer (z-index 100).
      this.labelRenderer.domElement.style.zIndex = "0";
      host.appendChild(this.labelRenderer.domElement);

      // full-screen flash overlay (typhoons, battles, discoveries)
      this.flashDiv = document.createElement("div");
      this.flashDiv.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .4s;mix-blend-mode:screen;";
      host.appendChild(this.flashDiv);

      window.addEventListener("resize", () => this.resize());

      // island click
      const onDown = (e) => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, this.camera);
        const hits = raycaster.intersectObjects(this.islandRoot.children, true);
        if (hits.length){
          let o = hits[0].object;
          while (o && !o.userData.islandId) o = o.parent;
          if (o && o.userData.islandId) this.clickIsland(o.userData.islandId);
        }
      };
      this.renderer.domElement.addEventListener("pointerdown", onDown);

      // theme
      this.themeCur = JSON.parse(JSON.stringify(THEMES.ancient));
      this.applyTheme(this.themeCur);

      // initial camera: look at the home island (close enough to see the village)
      const saipan = this.islands.saipan;
      this.camera.position.set(saipan.pos.x + 24, 44, saipan.pos.z + 42);
      this.controls.target.copy(saipan.pos);
      this.focus = saipan.pos.clone();

      this.clock = new THREE.Clock();
      this.ok = true;
      this.resize();
      // Load the real coconut-palm GLB the player created/uploaded.
      this.loadRealPalm();
      // optional real male/female villager models (silent if absent/fails)
      this.loadRealPeople();
      this.loop();
      return true;
    } catch (err){
      console.warn("3D board unavailable:", err && err.message);
      return false;
    }
  },

  /* ---------- static scene ---------- */
  buildLights(){
    // cool sky-hemisphere ground bounce
    const hemi = new THREE.HemisphereLight(0xdff0ff, 0x24455a, 0.75);
    this.scene.add(hemi);
    // warm key light casting soft shadows
    this.sun = new THREE.DirectionalLight(0xffe6b0, 1.5);
    this.sun.position.set(60, 120, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.left = -220;
    this.sun.shadow.camera.right = 220;
    this.sun.shadow.camera.top = 340;
    this.sun.shadow.camera.bottom = -160;
    this.sun.shadow.camera.far = 700;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    // cool fill light from the opposite side → softens harsh shadows & adds depth
    this.fill = new THREE.DirectionalLight(0x9fc4e8, 0.5);
    this.fill.position.set(-90, 40, -80);
    this.scene.add(this.fill);
  },

  /* Procedural environment map (sky gradient) processed through PMREM so the
     standard materials pick up natural ambient light + soft reflections. No
     external assets — a hand-drawn gradient that matches the era skies. */
  buildEnvironment(){
    try {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 256;
      const x = c.getContext("2d");
      if (!x) return;
      const g = x.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, "#8fc8e6");
      g.addColorStop(0.55, "#cfe4f2");
      g.addColorStop(0.8, "#c2d9e6");
      g.addColorStop(1, "#b7cbd9");
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envRT = pmrem.fromEquirectangular(tex);
      this.scene.environment = envRT.texture;
      pmrem.dispose();
    } catch (e){ /* environment is optional */ }
  },
  buildWater(){
    const wmat = new THREE.MeshStandardMaterial({
      color: 0x2f7fa8, roughness: 0.2, metalness: 0.25,
      transparent: true, opacity: 0.88,
    });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), wmat);
    /* Animated tiling wave normal map with two summed wave directions, so the
       ocean reads as moving swell rather than a flat sheet. Stronger normalScale
       makes the sunlight glint across the surface like real open sea. */
    try {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 256;
      const x = c.getContext("2d");
      x.fillStyle = "#8080ff"; x.fillRect(0, 0, 256, 256);
      // wave field A — long parallel swells
      x.strokeStyle = "rgb(130,130,255)";
      for (let i = 0; i < 14; i++){
        x.lineWidth = 1.5;
        const y = (i * 18) % 256;
        x.beginPath();
        for (let px = 0; px <= 256; px += 8){
          const py = y + Math.sin(px * 0.06 + i * 1.3) * 6;
          px === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
        }
        x.stroke();
      }
      // wave field B — churning surface noise perpendicular to the swell
      for (let i = 0; i < 140; i++){
        const g = 120 + (i % 24) * 5;
        x.strokeStyle = "rgb(" + g + "," + g + ",255)";
        x.lineWidth = 1 + (i % 2);
        const cx = (i * 61) % 256, cy = (i * 37) % 256, r = 5 + ((i * 17) % 26);
        x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
      }
      const nt = new THREE.CanvasTexture(c);
      nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
      nt.repeat.set(32, 32);
      wmat.normalMap = nt;
      wmat.normalScale.set(1.1, 1.1);
      this.waterNormal = nt;
    } catch (e){ /* waves optional */ }
    /* Real sea texture support (optional): if the player drops an ocean/water
       base+normal pair (assets/textures/ocean_basecolor.jpg …), use it for the
       water surface. The loader fills REAL_TEX asynchronously, so this is
       applied from the animation loop once it becomes available. */
    this.seaWaterMat = wmat;
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -0.04;
    this.water.receiveShadow = true;
    this.scene.add(this.water);
  },
  /* Apply a real ocean/water texture to the sea once it loads (called each
     frame until it succeeds; cheap no-op after). */
  applySeaTexture(){
    if (this.seaApplied) return;
    const seaT = REAL_TEX.ocean && (REAL_TEX.ocean.base || REAL_TEX.ocean.normal)
      ? REAL_TEX.ocean
      : REAL_TEX.water && (REAL_TEX.water.base || REAL_TEX.water.normal)
        ? REAL_TEX.water
        : null;
    if (seaT && this.seaWaterMat){
      const wmat = this.seaWaterMat;
      if (seaT.base){
        wmat.color.setHex(0xffffff);
        seaT.base.wrapS = seaT.base.wrapT = THREE.RepeatWrapping;
        seaT.base.repeat.set(12, 12);
        wmat.map = seaT.base;
      }
      if (seaT.normal){
        seaT.normal.wrapS = seaT.normal.wrapT = THREE.RepeatWrapping;
        seaT.normal.repeat.set(12, 12);
        seaT.normal.colorSpace = THREE.NoColorSpace;
        wmat.normalMap = seaT.normal;
        wmat.normalScale.set(0.8, 0.8);
      }
      wmat.needsUpdate = true;
      this.seaApplied = true;
    }
  },
  /* Apply an optional real 360° sky panorama (any of
     assets/textures/sky{_basecolor}.{jpg,png,webp}) as the scene background.
     Also sets the environment so it lights/reflects the scene. Called each
     frame until found/exhausted; silently ignored if the player didn't add one. */
  applySkyTexture(){
    if (this.skyApplied) return;
    // quick path: loader already picked up a REAL_TEX.sky.base
    const loaded = REAL_TEX.sky && REAL_TEX.sky.base;
    if (loaded){
      loaded.mapping = THREE.EquirectangularReflectionMapping;
      this.applySkyReal(loaded);
      return;
    }
    // else probe the common filenames directly, once, at the first call
    if (!this._skyProbeStarted){
      this._skyProbeStarted = true;
      const urls = [
        "assets/textures/sky_basecolor.jpg", "assets/textures/sky_basecolor.png", "assets/textures/sky_basecolor.webp",
        "assets/textures/sky.jpg", "assets/textures/sky.png", "assets/textures/sky.webp",
      ];
      for (const u of urls){
        const img = new Image();
        img.onload = () => {
          if (this.skyApplied || img.naturalWidth === 0) return;
          const tt = new THREE.CanvasTexture(img);
          tt.colorSpace = THREE.SRGBColorSpace;
          tt.mapping = THREE.EquirectangularReflectionMapping;
          this.applySkyReal(tt);
        };
        img.onerror = () => {};
        img.src = u;
      }
      // give up after a beat whether or not any loaded (procedural stays)
      setTimeout(() => {
        if (!this.skyReal) this.skyApplied = true;
      }, 2500);
    }
    return;
  },
  applySkyReal(tex){
    if (this.skyApplied) return;
    this.skyApplied = true;
    this.skyReal = true;
    this.scene.background = tex;
    if (this.skyTex && this.skyTex.dispose) this.skyTex.dispose();
    this.scene.environment = tex;   // real sky also lights & reflects the scene
  },
  buildSky(){
    // Equirectangular sky with a vertical gradient + soft procedural clouds so
    // the horizon reads naturally and the sky isn't a flat wash. Wraps on the
    // horizontal axis so clouds continue seamlessly around the panorama.
    this.skyCanvas = document.createElement("canvas");
    this.skyCanvas.width = 1024; this.skyCanvas.height = 512;
    this.skyTex = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;
    this.skyTex.wrapS = this.skyTex.wrapT = THREE.RepeatWrapping;
    this.scene.background = this.skyTex;
    this.updateSky(0x87c4e8, 0xb8d8ec);
    this.scene.fog = new THREE.Fog(0xa8d4ec, 200, 700);
  },
  updateSky(overhead, horizon){
    // Once a real sky panorama has been applied, don't repaint the procedural
    // gradient/clouds over it on theme changes.
    if (this.skyReal) return;
    try {
      const W = this.skyCanvas.width, H = this.skyCanvas.height;
      const x = this.skyCanvas.getContext("2d");
      x.clearRect(0, 0, W, H);
      // vertical gradient: deep overhead at the top, pale horizon near the
      // lower-middle (the equirect horizon line), lighter below into the sea fog
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, shade(overhead, 1));
      g.addColorStop(0.38, shade(overhead, 1.02));
      g.addColorStop(0.52, shade(horizon, 1));
      g.addColorStop(0.66, shade(horizon, 0.96));
      g.addColorStop(1, shade(horizon, 0.9));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      // soft cumulus clouds clustered around the horizon band (seamless via
      // repeated overlapping puffs that wrap across the left/right edge)
      const centerY = H * 0.5;
      const rng = this.rng(777);
      for (let i = 0; i < 70; i++){
        const cxP = (rng()) * W;      // raw horizontal, will wrap later
        const cyP = centerY + (rng() - 0.5) * H * 0.34;   // near the horizon
        const rad = 18 + rng() * 60;
        const cloud = x.createRadialGradient(cxP, cyP, 0, cxP, cyP, rad);
        const a = 0.1 + rng() * 0.22;
        cloud.addColorStop(0, "rgba(255,255,255," + a + ")");
        cloud.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = cloud;
        // paint the puff plus its wrap copy so the panorama is seamless
        for (const dx of [-W, 0, W]){
          x.beginPath();
          x.arc(cxP + dx, cyP, rad, 0, Math.PI * 2);
          x.fill();
        }
      }
      this.skyTex.needsUpdate = true;
    } catch (e){ /* sky optional */ }
  },
  buildWavePatches(){
    // soft whitecaps dotted across the open sea (a few ring "foam" patches),
    // plus short foam streaks oriented along the swell for a living ocean.
    const rng = this.rng(11);
    for (let i = 0; i < 30; i++){
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.06 + rng() * 0.05,
        depthWrite: false,
      });
      const r = 3 + rng() * 7;
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 12), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set((rng() - 0.5) * 96, 0.02, -180 + rng() * 190);
      m.rotation.z = rng() * Math.PI;
      this.fxRoot.add(m);
      // a couple of short elongated foam streaks near each whitecap
      if (i % 3 === 0){
        const s = new THREE.Mesh(new THREE.PlaneGeometry(6 + rng() * 8, 1.1 + rng() * 0.8), mat);
        s.rotation.x = -Math.PI / 2;
        s.rotation.z = m.rotation.z + 0.3;
        s.position.set(m.position.x + (rng() - 0.5) * 6, 0.02, m.position.z + (rng() - 0.5) * 6);
        this.fxRoot.add(s);
      }
    }
  },
  buildSelectionRing(){
    const geo = new THREE.RingGeometry(1.5, 2.1, 40);
    geo.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xffd76b, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    }));
    this.ring.position.set(0, 0.06, 0);
    this.ring.visible = false;
    this.islandRoot.add(this.ring);
  },

  /* World-scale texture tiling per terrain surface (a texture repeat value —
     lower = larger, coarser pattern on the ground; these are tuned for the
     real-texture upgrade; absent keys just use no map). */
  terrainRepeat(key){
    return TERRAIN_TILE_REPEAT[key] !== undefined ? TERRAIN_TILE_REPEAT[key] : 2.0;
  },
  /* Normalize a terrain shape's UVs to 0..1 across its own extents. ExtrudeGeometry
     builds UVs in WORLD units (0..islandSize), which with texture.repeat produces
     wildly dense tiling and bad mip-map seams/lines — especially on big islands.
     Rescaling to 0..1 makes the repeat a predictable "tiles across the face" that
     is consistent on every island. */
  fitUVs(geometry){
    const uvs = geometry.attributes.uv;
    if (!uvs) return;
    const arr = uvs.array;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < arr.length; i += 2){
      const u = arr[i], v = arr[i + 1];
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    const du = (maxU - minU) || 1, dv = (maxV - minV) || 1;
    for (let i = 0; i < arr.length; i += 2){
      arr[i] = (arr[i] - minU) / du;
      arr[i + 1] = (arr[i + 1] - minV) / dv;
    }
    uvs.needsUpdate = true;
  },

  /* Apply a loaded real texture set to an island-surface material (or register
     it for later if the texture hasn't finished loading yet). */
  terrainTex(key, m){
    const real = REAL_TEX[key];
    if (real && real.base){
      m.color.setHex(0xffffff);
      m.map = real.base;
      real.base.wrapS = real.base.wrapT = THREE.RepeatWrapping;
      const rep = this.terrainRepeat(key);
      real.base.repeat.set(rep, rep);
      m.userData.hasRealBase = true;
    }
    if (real && real.normal){
      m.normalMap = real.normal;
      m.normalScale.set(1, 1);
    }
    if (!real || (!real.base && !real.normal)){
      // not loaded yet — queue so the loader can apply it later
      (REAL_MAT_KEYS[key] = REAL_MAT_KEYS[key] || []).push(m);
    }
    m.needsUpdate = true;
  },

  matIsland(key){
    const m = new THREE.MeshStandardMaterial({
      color: PAL[key], roughness: 0.95, metalness: 0,
    });
    m.userData.baseColor = PAL[key];
    m.userData.islandKey = key;
    // Apply a real base/normal texture for this surface if the player supplied
    // one (REAL_TEX[key]); otherwise fall back to the flat terrain colour.
    this.terrainTex(key, m);
    return m;
  },

  /* ---------- terrain (real geography) ---------- */
  buildTerrain(){
    for (const id of ISLAND_ORDER){
      const g = GEO[id];
      const pos = geoPos(g);
      const sz = geoSize(g);
      this.islands[id] = {
        grp: null, pos, w: sz.w, h: sz.h,
        rx: sz.w / 2, ry: sz.h / 2,
        baseY: 0.86, type: g.type, mats: [],
        label: null, star: null, indBadge: null,
        // real coastline polygon(s) in 0..1 space, for on-land placement checks
        coast: (g.polys && g.polys.length) ? g.polys : [g.pts],
      };
      if (g.type === "volcano") this.buildIslandVolcano(id, g);
      else this.buildIslandLimestone(id, g);
      this.islands[id].label = this.makeLabel(id);
    }
  },

  buildIslandVolcano(id, g){
    const rec = this.islands[id];
    const grp = new THREE.Group();
    const seg = 14;
    const h = 0.8 + (g.peak / 900) * 1.5;
    rec.h = h;
    const baseY = 0.16;
    // Real coastline(s) — Maug is three separate islets, everything
    // else one polygon (Pagan & Guguan are dumbbell outlines).
    const polys = (g.polys && g.polys.length) ? g.polys : [g.pts];
    const mats = [];
    // ash shoreline slab — one per outline
    for (const pts of polys){
      const slabGeo = new THREE.ExtrudeGeometry(this.geoShape(rec, 1, pts), { depth: 0.14, bevelEnabled: false });
      this.fitUVs(slabGeo);
      slabGeo.rotateX(-Math.PI / 2);
      const slab = new THREE.Mesh(slabGeo, this.matIsland("ash"));
      slab.userData.islandId = id;
      slab.receiveShadow = true;
      grp.add(slab);
      mats.push(slab.material);
    }
    if (polys.length === 1){
      // vegetated lower flanks
      const landGeo = new THREE.ExtrudeGeometry(this.geoShape(rec, 0.86, polys[0]), { depth: h * 0.45, bevelEnabled: false });
      this.fitUVs(landGeo);
      landGeo.rotateX(-Math.PI / 2);
      landGeo.translate(0, baseY, 0);
      const land = new THREE.Mesh(landGeo, this.matIsland("volcanoGreen"));
      land.userData.islandId = id;
      land.castShadow = true; land.receiveShadow = true;
      grp.add(land);
      mats.push(land.material);
      // summit cone(s) — Pagan & Guguan each carry two real volcanoes
      const cones = (g.cones && g.cones.length) ? g.cones : [{ x: 0, y: 0, s: 1 }];
      for (const c of cones){
        const cx = c.x * rec.w / 2, cz = c.y * rec.h / 2;
        const s = c.s || 1;
        const rock = new THREE.Mesh(new THREE.ConeGeometry(rec.rx * 0.5 * s, h * 0.55 * s, seg), this.matIsland("volcRock"));
        rock.position.set(cx, baseY + h * 0.45 + h * 0.275 * s, cz);
        rock.userData.islandId = id;
        rock.castShadow = true; rock.receiveShadow = true;
        grp.add(rock);
        mats.push(rock.material);
        // crater
        const crater = new THREE.Mesh(new THREE.CylinderGeometry(rec.rx * 0.1 * s, rec.rx * 0.24 * s, h * 0.09, seg), this.matIsland("crater"));
        crater.position.set(cx, baseY + h * 0.45 + h * 0.55 * s, cz);
        crater.userData.islandId = id;
        grp.add(crater);
        mats.push(crater.material);
      }
    } else {
      // Maug: low green caps rising from each ring islet
      for (const pts of polys){
        const capGeo = new THREE.ExtrudeGeometry(this.geoShape(rec, 0.8, pts), { depth: h * 0.22, bevelEnabled: false });
        this.fitUVs(capGeo);
        capGeo.rotateX(-Math.PI / 2);
        capGeo.translate(0, baseY, 0);
        const cap = new THREE.Mesh(capGeo, this.matIsland("volcanoGreen"));
        cap.userData.islandId = id;
        cap.castShadow = true; cap.receiveShadow = true;
        grp.add(cap);
        mats.push(cap.material);
      }
    }
    grp.position.copy(rec.pos);
    this.islandRoot.add(grp);
    rec.grp = grp;
    rec.mats = [...new Set(mats)];
    rec.baseY = baseY;
    rec.buildY = (polys.length > 1 ? baseY + h * 0.22 + 0.02 : baseY + h * 0.45 + 0.02); // top of the land flank
    rec.hillY = h + 0.2;
  },

  buildIslandLimestone(id, g){
    const rec = this.islands[id];
    const grp = new THREE.Group();
    // beach skirt (sand)
    const beachGeo = new THREE.ExtrudeGeometry(this.geoShape(rec, 1, g.pts), { depth: 0.26, bevelEnabled: false });
    this.fitUVs(beachGeo);
    beachGeo.rotateX(-Math.PI / 2);
    const beach = new THREE.Mesh(beachGeo, this.matIsland("sand"));
    beach.userData.islandId = id;
    beach.receiveShadow = true;
    // limestone cliffs
    const cliffGeo = new THREE.ExtrudeGeometry(this.geoShape(rec, 0.9, g.pts), { depth: 0.5, bevelEnabled: false });
    this.fitUVs(cliffGeo);
    cliffGeo.rotateX(-Math.PI / 2);
    cliffGeo.translate(0, 0.26, 0);
    const cliff = new THREE.Mesh(cliffGeo, this.matIsland("limestone"));
    cliff.userData.islandId = id;
    cliff.castShadow = true; cliff.receiveShadow = true;
    // grass plateau top
    const topGeo = new THREE.ExtrudeGeometry(this.geoShape(rec, 0.88, g.pts), { depth: 0.09, bevelEnabled: false });
    this.fitUVs(topGeo);
    topGeo.rotateX(-Math.PI / 2);
    topGeo.translate(0, 0.76, 0);
    const top = new THREE.Mesh(topGeo, this.matIsland("grass"));
    top.userData.islandId = id;
    top.receiveShadow = true;
    grp.add(beach, cliff, top);
    // hills (Tapochau, Sabana, Guam's southern heights…)
    for (const [fx, fz, fr, fh] of (g.hills || [])){
      const hill = new THREE.Mesh(new THREE.ConeGeometry(rec.w * fr * 0.5, fh, 10), this.matIsland("grassDark"));
      hill.position.set((fx - 0.5) * rec.w, 0.84 + fh / 2 - 0.03, -(fz - 0.5) * rec.h);
      hill.userData.islandId = id;
      hill.castShadow = true; hill.receiveShadow = true;
      grp.add(hill);
    }
    // Saipan's lagoon (west side)
    if (g.lagoon){
      const [lx, lz, lrX, lrZ] = g.lagoon;
      const lagoon = new THREE.Mesh(
        new THREE.CircleGeometry(rec.w * lrX, 20),
        new THREE.MeshLambertMaterial({ color: 0x7fd4e8, transparent: true, opacity: 0.75 })
      );
      lagoon.rotation.x = -Math.PI / 2;
      lagoon.position.set((lx - 0.5) * rec.w, 0.02, -(lz - 0.5) * rec.h);
      lagoon.scale.z = lrZ / lrX;
      grp.add(lagoon);
      // reef line
      for (const [ax, az] of [[0.24, 0.4], [0.12, 0.55], [0.26, 0.68]]){
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.6 }));
        dot.rotation.x = -Math.PI / 2;
        dot.position.set((ax - 0.5) * rec.w, 0.05, -(az - 0.5) * rec.h);
        grp.add(dot);
      }
    }
    grp.position.copy(rec.pos);
    this.islandRoot.add(grp);
    rec.grp = grp;
    rec.mats = [beach.material, cliff.material, top.material];
    rec.baseY = 0.86;
    rec.buildY = 0.88; // just above the grass plateau
    rec.hillY = 4.6;
  },

  geoShape(rec, scale, pts){
    const w = rec.w * scale, h = rec.h * scale;
    const sh = new THREE.Shape();
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const toXY = (p) => [ (p[0] - 0.5) * w, -(p[1] - 0.5) * h ];
    const m0 = mid(pts[n - 1], pts[0]);
    const s0 = toXY(m0);
    sh.moveTo(s0[0], s0[1]);
    for (let i = 0; i < n; i++){
      const c = toXY(pts[i]);
      const nx = mid(pts[i], pts[(i + 1) % n]);
      const e = toXY(nx);
      sh.quadraticCurveTo(c[0], c[1], e[0], e[1]);
    }
    sh.closePath();
    return sh;
  },

  jitter(seed){
    let s = Math.abs(Math.floor(seed || 1)) % 233280 + 1;
    s = (s * 9301 + 49297) % 233280;
    return (s / 233280) - 0.5;
  },

  makeLabel(id){
    const el = document.createElement("div");
    el.className = "bl-label";
    const obj = new CSS2DObject(el);
    const isl = this.islands[id];
    obj.position.set(isl.pos.x, isl.hillY + 0.6, isl.pos.z);
    this.islandRoot.add(obj);
    return { el, obj };
  },

  /* flash a "just built" pop so new structures visibly rise on the board */
  popBuild(){
    this.buildPop = 1.35;
  },

  /* ---------- selection ---------- */
  select(id, focus){
    const rec = this.islands[id];
    if (!rec) return;
    this.sel = id;
    this.updateRing();
    if (focus){
      this.focus = rec.pos.clone();
      this.focus.y = 8;
    }
  },

  updateRing(){
    if (!this.ring) return;
    const rec = this.sel ? this.islands[this.sel] : null;
    if (!rec || !S.islands[this.sel].accessible){
      this.ring.visible = false;
      return;
    }
    this.ring.visible = true;
    this.ring.position.set(rec.pos.x, 0.06, rec.pos.z);
    const r = Math.max(rec.rx, rec.ry) * 0.72;
    this.ring.scale.setScalar(Math.max(r, 1.4) / 2.1);
  },

  clickIsland(id){
    if (this.onSelect) this.onSelect(id);
    else this.select(id, true);
  },

  /* ---------- refresh from game state ---------- */
  refresh(){
    if (!this.ok) return;
    if (!S) return;
    const era = S.era;

    // national flag in the ocean off the capital — changes with the administration
    if (!this.flagGroup) this.buildFlag();
    const fk = currentFlagKey();
    if (fk !== this.flagKey){
      this.flagKey = fk;
      const tex = flagTexture(fk);
      if (tex && this.flagPlane){
        if (this.flagPlane.material.map) this.flagPlane.material.map.dispose();
        this.flagPlane.material.map = tex;
        this.flagPlane.material.needsUpdate = true;
      }
      if (this.flagLabel){
        this.flagLabel.element.innerHTML = "🚩 " + FLAG_NAMES[fk];
        this.flagLabel.element.title = FLAG_NAMES[fk];
      }
    }

    // theme
    const th = THEMES[era] || THEMES.ancient;
    if (!this.theme || this.theme !== th){
      this.theme = th;
      this.themeFrom = JSON.parse(JSON.stringify(this.themeCur));
      this.themeT = 0;
    }

    // island locks + labels + stars + industry badges
    const guamLocked = era !== "ancient" && era !== "contact" && !S.islands.guam.accessible;
    for (const id of Object.keys(this.islands)){
      const isl = S.islands[id];
      const rec = this.islands[id];
      const locked = !isl.accessible;
      for (const m of rec.mats){
        m.color.setHex(locked ? (id === "guam" && guamLocked ? 0x3a6ea0 : 0x24394c) : m.userData.baseColor);
      }
      const name = ISLAND_DEFS[id].name;
      rec.label.el.innerHTML = locked
        ? (id === "guam" ? `<span class="bl-star">★</span> ${name}` : `<span class="bl-lock">🔒</span> ${name}`)
        : `${name}<span class="bl-pop">${isl.pop}</span>`;
      rec.label.el.classList.toggle("locked", locked);
      // guam star
      if (id === "guam"){
        if (!rec.star){
          const starEl = document.createElement("div");
          starEl.className = "bl-star2"; starEl.textContent = "★";
          const starObj = new CSS2DObject(starEl);
          starObj.position.set(rec.pos.x, rec.hillY + 2.6, rec.pos.z);
          this.islandRoot.add(starObj);
          rec.star = starObj;
        }
        rec.star.visible = guamLocked;
      }
      // industry badge
      const ind = isl.industry;
      if (ind && isl.industryLvl > 0){
        if (!rec.indBadge){
          const badgeEl = document.createElement("div");
          badgeEl.className = "bl-ind";
          const badgeObj = new CSS2DObject(badgeEl);
          badgeObj.position.set(rec.pos.x, rec.hillY + 1.4, rec.pos.z);
          this.islandRoot.add(badgeObj);
          rec.indBadge = badgeObj;
        }
        rec.indBadge.element.textContent = INDUSTRIES[ind].icon;
        rec.indBadge.visible = true;
      } else if (rec.indBadge){
        rec.indBadge.visible = false;
      }
    }
    this.rebuildBuildings(S);
    this.rebuildPeople(S);
    this.rebuildShips(S);
    this.updateRing();
  },

  /* ---------- buildings ---------- */
  /* Depict buildings as physical models using a tiered LOD scheme so a
     growing island stays readable and light on the engine:
       1–2 of a type  -> 1 model       5–9  -> 5 models
       3–4            -> 3 models      10+  -> 10 models + numbered badge
     The badge (a number in a circle beside the building's icon) shows
     the true total once it passes 10. */
  tierModelCount(n){ return n >= 10 ? 10 : n >= 5 ? 5 : n >= 3 ? 3 : 1; },

  /* national flagpole: planted in the ocean beside the capital island */
  buildFlag(){
    try {
      const saipan = this.islands.saipan;
      if (!saipan) return;
      const group = new THREE.Group();
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x6e7684, roughness: 0.7 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 7.4, 6), poleMat);
      pole.position.set(0, 3.7, 0);
      group.add(pole);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), M.gold);
      ball.position.set(0, 7.45, 0);
      group.add(ball);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 1.66),
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true })
      );
      plane.position.set(1.0, 6.6, 0);
      group.add(plane);
      group.position.set(saipan.pos.x + 15, -0.25, saipan.pos.z + 11);
      this.scene.add(group);
      this.flagGroup = group;
      this.flagPlane = plane;
      // administration label (CSS2D) floating over the flag
      const el = document.createElement("div");
      el.className = "flag-label";
      el.innerHTML = "🚩";
      const lbl = new CSS2DObject(el);
      lbl.position.set(saipan.pos.x + 15, 8.9, saipan.pos.z + 11);
      this.scene.add(lbl);
      this.flagLabel = lbl;
    } catch (e){
      console.warn("flag unavailable:", e && e.message);
    }
  },

  /* per-vertex brightness noise — makes identical building types look varied.
     geometry must already be cloned (per-instance), so colors never collide. */
  jitterColors(geo, amt, tint){
    const pos = geo.attributes && geo.attributes.position;
    if (!pos) return;
    const n = pos.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++){
      const f = (tint || 1) * (1 + (Math.random() * 2 - 1) * amt);
      arr[i * 3] = f; arr[i * 3 + 1] = f; arr[i * 3 + 2] = f;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  },

  /* Per-island unit scale so structures & people fit the landmass instead of
     overflowing into the ocean on small islands. Based on the island's narrower
     dimension: big islands keep near-full size, tiny islets shrink so units sit
     inside the land. Clamped on the low end so units never vanish — they stay
     recognizable even on the smallest volcano islets. */
  islandUnitScale(rec){
    const land = Math.min(rec.w, rec.h);
    return Math.max(0.5, Math.min(1.0, land / 9));
  },

  /* Point-in-island test. `x,z` are board-local offsets from the island's
     center (the -/+X east-west, +Z/-Z south-north axes). The real island
     coastline is an irregular polygon (with bays/concavities), so a radial
     "ellipse radius" placement can land over water in a bay. Reject any spot
     outside the actual landmass so units only sit on solid ground. */
  pointInIsland(rec, x, z){
    const coast = rec.coast;
    if (!coast || !coast.length) return true;   // no outline → allow (rare)
    const u = x / rec.w + 0.5;
    const v = -(z / rec.h) + 0.5;
    for (const poly of coast){
      if (this.pointInPoly(u, v, poly)) return true;
    }
    return false;
  },
  /* ray-casting point-in-polygon on 0..1 outline points */
  pointInPoly(px, pz, poly){
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      if ((yi > pz) !== (yj > pz) &&
          px < (xj - xi) * (pz - yi) / (yj - yi) + xi){
        inside = !inside;
      }
    }
    return inside;
  },

  /* Best-effort load of a real coconut-palm GLB. If it fails or is absent,
     the improved procedural palms are used and this silently no-ops. */
  loadRealPalm(){
    if (PALM_LOADED) return;
    PALM_LOADED = true;
    try {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/libs/draco/");
      loader.setDRACOLoader(draco);
      loader.load(PALM_SRC, (gltf) => {
        const root = gltf.scene || gltf.scenes && gltf.scenes[0];
        if (!root) return;
        // Center the palm at its origin and make it ~1 unit tall so our s-scale fits.
        const box = (() => {
          try { const b = new THREE.Box3().setFromObject(root); return b; }
          catch (e){ return null; }
        })();
        if (box){
          const size = box.getSize(new THREE.Vector3());
          const h = Math.max(size.x, size.y, size.z) || 1;
          root.scale.multiplyScalar(1 / h);   // normalize to ~1 unit tall
          root.position.y = -box.min.y;        // feet on y=0
        }
        // bake scale into children by traversing is overkill; instead keep root
        PALM_GLB = root;
        PALM_READY = true;
        this.rebuildEverything();
      }, undefined, () => { /* load failed → keep procedural palms */ });
    } catch (e){ /* no real palm */ }
  },

  /* Load optional male/female villager models. Handles BOTH static (non-rigged)
     GLBs and rigged/animated (Mixamo) ones. A valid character must render even
     with NO skeleton and NO animation clips — we never substitute debug geometry.
     Only strips the character out of the world if the file genuinely fails to load
     (in which case the procedural villagers remain). */
  loadRealPeople(){
    if (PEOPLE_LOADED) return;
    PEOPLE_LOADED = true;
    const loader = new GLTFLoader();
    const pickClip = (animations, names) => {
      if (!animations) return null;
      for (const n of names){
        const c = animations.find(a => a.name && a.name.toLowerCase().includes(n));
        if (c) return c;
      }
      return animations[0] || null;
    };
    const tryLoad = (src, key) => {
      loader.load(src, (gltf) => {
        try {
          const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!root) return;
          console.log("[people] loaded villager model:", src,
            "| children:", root.children.length, "| animations:", (gltf.animations || []).length);
          // normalize: ~1 unit tall, feet at y=0. Guarded so a SkinnedMesh's
          // possibly-degenerate bounding box can never produce NaN/zero scale
          // (which would make every villager invisible).
          try {
            const box = new THREE.Box3().setFromObject(root);
            const size = box.getSize(new THREE.Vector3());
            const h = Math.max(size.x, size.y, size.z);
            if (h && isFinite(h) && h > 0.0001) root.scale.multiplyScalar(1 / h);
            root.updateMatrixWorld(true);
            const nb = new THREE.Box3().setFromObject(root);
            if (isFinite(nb.min.y)) root.position.y = -nb.min.y;
            root.updateMatrixWorld(true);
          } catch (e){ /* keep default scale/pose */ }
          const animations = gltf.animations || [];
          const walk = pickClip(animations, ["walk", "move", "locom", "run"]);
          const idle = pickClip(animations, ["idle", "stand", "still", "pose"]);
          PERSON_ANIM[key] = { root, walk, idle, animations };
          if (PERSON_ANIM.male || PERSON_ANIM.female) PEOPLE_READY = true;
          // For rigged/skinned models, also pre-clone a properly-skinned
          // renderRoot via a DYNAMIC import of SkeletonUtils (a static import
          // would break this module's CDN load). Async; spawns use renderRoot.
          if (this.hasSkin(root)){
            import("three/addons/utils/SkeletonUtils.js")
              .then(({ SkeletonUtils }) => {
                try {
                  const rr = SkeletonUtils.clone(root);
                  rr.scale.copy(root.scale);
                  rr.position.copy(root.position);
                  rr.updateMatrixWorld(true);
                  PERSON_ANIM[key].renderRoot = rr;
                  this.rebuildPeople(window.S || { islands: {} });
                } catch (e){ /* keep plain root */ }
              })
              .catch((e) => /* keep plain root */ {});
          }
          this.rebuildPeople(window.S || { islands: {} });
        } catch (err){
          console.error("[people] failed to prepare villager model:", src, err);
        }
      }, undefined, (err) => {
        console.warn("[people] villager model failed to LOAD:", src, err && err.message);
        // do NOT fall back to cubes; procedural villagers stay as-is
      });
    };
    tryLoad(PEOPLE_MALE_SRC, "male");
    tryLoad(PEOPLE_FEMALE_SRC, "female");
  },
  /* Sample the actual land surface Y at a world X/Z by raycasting STRAIGHT DOWN
     onto the terrain meshes only (islandRoot). Never touches water/lagoon/decor,
     so a palm can never be told "the ground is here" while pointing at the sea.
     Returns the world Y of the land surface, or null if no land is found. */
  sampleLandHeight(wx, wz){
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(wx, 400, wz), new THREE.Vector3(0, -1, 0));
    raycaster.near = 0; raycaster.far = 1200;
    const hits = raycaster.intersectObjects(this.islandRoot.children, true);
    for (const h of hits){
      let o = h.object;
      while (o && !o.userData.islandId) o = o.parent;
      if (!o || !o.userData.islandId) continue;
      if (o === this.ring) continue;      // skip the selection ring
      return h.point.y;                   // first solid land hit from straight down
    }
    return null;
  },
  /* Stand a real palm on the terrain. Sets the palm's world X/Z from the island
     spot, raycasts straight down for the true land height there, then corrects
     for the GLB's own pivot/origin (Box3) so the BOTTOM of the trunk — not the
     model origin — touches the ground, plus a tiny 0.01 anti-z-fighting lift. */
  dropPalmOnLand(c, islandCenter, spot){
    const wx = islandCenter.x + spot.x;
    const wz = islandCenter.z + spot.z;
    c.position.set(wx, 0, wz);
    this.buildRoot.add(c);
    const landY = this.sampleLandHeight(wx, wz);
    if (landY == null) return;   // no land under this palm → leave hidden, not sunken
    // Measure the model's own vertical extent below its origin (origin at world Y=0).
    c.position.y = 0;
    c.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(c);
    const bottomAtOrigin = box.min.y;   // world bottom when the origin sits at y=0
    // Put the origin at landY minus how far the trunk bottom dips below it.
    c.position.y = landY - bottomAtOrigin + 0.01;
    c.updateMatrixWorld(true);
  },
  /* Spawn a real palm per spot, grounding each on the actual terrain. */
  spawnRealPalms(parent, spots, us, islandCenter){
    if (!PALM_READY || !PALM_GLB || !spots.length) return;
    const k = us || 1;
    for (const sp of spots){
      const c = PALM_GLB.clone(true);
      c.scale.setScalar(k);
      this.dropPalmOnLand(c, islandCenter, sp);
    }
  },
  rebuildEverything(){
    this.rebuildBuildings(window.S);
    this.rebuildPeople(window.S);
    this.rebuildShips(window.S);
  },

  rebuildBuildings(S){
    this.disposeGroup(this.buildRoot);
    this.anims = [];

    for (const id of Object.keys(this.islands)){
      const rec = this.islands[id];
      const isl = S.islands[id];

      // clear this island's old count badges (even if now locked)
      if (rec.countBadges){
        for (const b of rec.countBadges) this.islandRoot.remove(b.obj);
      }
      rec.countBadges = [];

      if (!isl.accessible) continue;

      const rng = this.rng(rec.pos.x * 7 + rec.pos.z);
      const placed = [];            // [{x,z,r}]
      const partsByMat = [];        // [{m: Material, geos: [Geometry]}] — keyed by material OBJECT
      const shadowGeos = [];        // contact-shadow discs (one per building)
      const palmSpots = [];         // spots for real-model palms (when loaded)
      const maxTotal = (isl.pop >= 1 ? 44 : 8);
      const order = Object.keys(isl.buildings).filter(b => isl.buildings[b] > 0);
      let badgeSlot = 0;

      for (const bid of order){
        const n = isl.buildings[bid];
        const count = this.tierModelCount(n);
        const builder = BUILDERS[bid] || BUILDERS.default_house;
        for (let i = 0; i < count; i++){
          if (placed.length >= maxTotal) break;
          const spot = this.findSpot(rec, placed, rng);
          if (!spot) continue;
          // remember grove/plantation/resort spots so a real palm model can
          // replace the procedural palms at the same location once ready
          if (PALM_READY && (bid === "coconut_grove" || bid === "copra_plantation"
              || bid === "resort_hotel" || bid === "duty_free_mall")){
            palmSpots.push(spot);
          }
          let parts;
          // Scale buildings to fit this island (small islets get smaller
          // structures so nothing spills into the ocean), with a reduced base
          // so even large islands read clearly and villages don't overflow.
          const us = this.islandUnitScale(rec);
          const s = us * (0.7 + rng() * 0.28);
          try { parts = builder(rng, s); }
          catch (e){ parts = BUILDERS.default_house(rng, 0.95); }
          const yaw = rng() * Math.PI * 2;
          const tint = 1 + (rng() * 2 - 1) * 0.07;   // per-building brightness variation
          for (const p of parts){
            if (!p || !p.g || !p.m) continue;
            const geo = p.g.clone();
            geo.rotateY(yaw);
            geo.translate(spot.x, rec.buildY, spot.z);
            // per-vertex brightness noise → no two buildings look identical
            this.jitterColors(geo, 0.05 + rng() * 0.07, tint);
            let entry = partsByMat.find(e => e.m === p.m);
            if (!entry){ entry = { m: p.m, geos: [] }; partsByMat.push(entry); }
            entry.geos.push(geo);
          }
          // soft contact shadow grounds the structure
          const dg = new THREE.CircleGeometry((0.95 + 0.75 * s), 20);
          dg.rotateX(-Math.PI / 2);
          dg.translate(spot.x, rec.buildY + 0.02, spot.z);
          shadowGeos.push(dg);
          // collision radius scales with the island so small islets pack tighter
          placed.push({ x: spot.x, z: spot.z, r: 0.72 * Math.max(0.5, us) });
        }
        // once a type passes 10, show the true total in a numbered badge
        if (n > 10) this.addCountBadge(rec, bid, n, badgeSlot++);
      }

      // merge per material → 1 mesh per material per island
      const islandGroup = new THREE.Group();
      islandGroup.position.copy(rec.pos);
      for (const entry of partsByMat){
        const merged = mergeGeometries(entry.geos, false);
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, entry.m);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        islandGroup.add(mesh);
      }
      // one merged contact-shadow mesh per island
      if (shadowGeos.length && M.contactShadow){
        const shadowMerged = mergeGeometries(shadowGeos, false);
        if (shadowMerged){
          const shadowMesh = new THREE.Mesh(shadowMerged, M.contactShadow);
          shadowMesh.renderOrder = -1;
          islandGroup.add(shadowMesh);
        }
      }
      if (islandGroup.children.length) this.buildRoot.add(islandGroup);

      // place real palm models (replacing the skipped procedural palms),
      // each grounded on the actual terrain surface under its X/Z
      if (PALM_READY && palmSpots.length){
        this.spawnRealPalms(this.buildRoot, palmSpots.map(sp => ({ x: sp.x, z: sp.z })), this.islandUnitScale(rec), rec.pos);
      }
      // animated extras
      this.addAnimatedExtras(isl, rec, rng, placed);
    }
  },

  /* Numbered badge (icon + total in a circle) for building types past 10,
     stacked beside the island so the true count stays readable. */
  addCountBadge(rec, bid, n, slot){
    const bd = BUILDING_DEFS[bid];
    const el = document.createElement("div");
    el.className = "bl-count";
    el.innerHTML = `${bd ? bd.icon : "🏗️"}<span class="bl-count-num">${n}</span>`;
    el.title = (bd ? bd.name : bid) + " × " + n;
    const obj = new CSS2DObject(el);
    obj.position.set(rec.pos.x + rec.rx + 1.4, rec.hillY + 1.5 - slot * 0.72, rec.pos.z);
    this.islandRoot.add(obj);
    rec.countBadges.push({ el, obj, bid, n });
  },

  findSpot(rec, placed, rng){
    // Keep structures on solid land: the grass plateau extends to ~0.88×r on
    // limestone isles, so placing at 0.62×r leaves a generous land margin so
    // buildings (and the palms that stick out of groves) never reach the coast.
    const f = rec.type === "volcano" ? 0.55 : 0.62;
    const rx = rec.rx * f, rz = rec.ry * f;
    const us = this.islandUnitScale(rec);
    const pad = 0.38 + 0.45 * us;   // gap between structures scales with island
    for (let attempt = 0; attempt < 60; attempt++){
      const a = rng() * Math.PI * 2;
      const rr = Math.sqrt(rng());
      const x = Math.cos(a) * rx * rr;
      const z = Math.sin(a) * rz * rr;
      // reject any spot over open water (bays/concave coastline)
      if (!this.pointInIsland(rec, x, z)) continue;
      let ok = true;
      for (const p of placed){
        const dx = p.x - x, dz = p.z - z;
        if (dx * dx + dz * dz < (p.r + pad) * (p.r + pad)){ ok = false; break; }
      }
      if (ok) return { x, z };
    }
    return null;
  },

  addAnimatedExtras(isl, rec, rng, placed){
    const baseY = rec.buildY || rec.baseY;
    // wind turbines (renewable energy farm)
    const nTurb = Math.min(isl.buildings.green_energy || 0, 2);
    for (let i = 0; i < nTurb; i++){
      const spot = this.findSpot(rec, placed, rng);
      if (!spot) continue;
      placed.push({ x: spot.x, z: spot.z, r: 1.3 });
      const grp = new THREE.Group();
      grp.position.set(spot.x, baseY, spot.z);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.5, 8), M.white);
      tower.position.y = 0.75;
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.3), M.steel);
      nacelle.position.y = 1.52;
      const blades = new THREE.Group();
      blades.position.y = 1.56;
      const bladeGeo = new THREE.BoxGeometry(0.04, 0.62, 0.06);
      const bladeMat = M.white;
      for (let b = 0; b < 3; b++){
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.31;
        blade.rotation.z = (b / 3) * Math.PI * 2;
        blades.add(blade);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), M.gold);
      hub.rotation.z = Math.PI / 2;
      blades.add(hub);
      grp.add(tower, nacelle, blades);
      const islandGroup = new THREE.Group();
      islandGroup.position.copy(rec.pos);
      islandGroup.add(grp);
      this.buildRoot.add(islandGroup);
      this.anims.push({ obj: blades, kind: "spin", speed: 2.2 + rng() * 1.6 });
    }
    // lighthouse beacon
    if ((isl.buildings.lighthouse || 0) > 0 && placed.length < 20){
      const spot = this.findSpot(rec, placed, rng);
      if (spot){
        const islandGroup = new THREE.Group();
        islandGroup.position.copy(rec.pos);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff7d8 }));
        light.position.set(spot.x, baseY + 2.0, spot.z);
        islandGroup.add(light);
        this.buildRoot.add(islandGroup);
        this.anims.push({ obj: light, kind: "pulse", base: 0.75, amp: 0.35, speed: 3 });
      }
    }
  },

  /* ---------- people ---------- */
  personGeometries(){
    // A slightly more proportioned, readable humanoid. Feet at y≈0, head ~1 unit
    // tall. Kept abstract (no faces) but with a clear head/torso/two-leg/two-arm
    // silhouette so a person reads unmistakably even when scaled small on a
    // tiny islet. Layer colours: skin=skin/arms/head, cloth=torso+legs,
    // hair=hair cap, hat=era headgear.
    // --- skin layer ---
    const skin = [];
    // head — rounder, sits on a neck that meets the torso
    skin.push(sph(0.17, 0, 0.88, 0, "white", 12));
    // neck (bridges torso top to the head)
    skin.push(cy(0.055, 0.062, 0.17, 0, 0.53, 0, "white", 6));
    // arms — angled slightly out from the shoulder, ending in small hands
    for (const sx of [-1, 1]){
      // upper arm angled out & down
      const arm = bx(0.06, 0.2, 0.09, 0.19 * sx, 0.62, 0, "white");
      arm.g.rotateZ(sx * 0.28);                 // slightly out from the torso
      arm.g.translate(0.1 * sx, 0.03, 0);
      skin.push(arm);
      // lower arm + fist
      skin.push(bx(0.055, 0.2, 0.08, 0.28 * sx, 0.42, 0, "white"));
      skin.push(sph(0.05, 0.31 * sx, 0.3, 0, "white", 6));
    }
    const skinGeo = mergeGeometries(skin.map(p => p.g), false);
    // --- cloth layer (shirt + pants) ---
    const cloth = [];
    // tapered torso (shoulders narrower than hips) — reads as a clothed body
    cloth.push(cy(0.115, 0.16, 0.36, 0, 0.36, 0, "white", 8));
    // two distinct legs for an unmistakable biped silhouette
    cloth.push(bx(0.09, 0.37, 0.12, -0.09, 0.185, 0, "white"));
    cloth.push(bx(0.09, 0.37, 0.12, 0.09, 0.185, 0, "white"));
    const clothGeo = mergeGeometries(cloth.map(p => p.g), false);
    // --- hair: full dark cap over the crown so it reads against skin ---
    const hairGeo = new THREE.SphereGeometry(0.17, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.56);
    hairGeo.translate(0, 0.88, 0);
    // --- hat: brim + crown, sized to sit on the head ---
    const hat = [];
    hat.push(cy(0.18, 0.18, 0.04, 0, 1.02, 0, "white", 12));
    hat.push(cy(0.1, 0.1, 0.1, 0, 1.09, 0, "white", 8));
    const hatGeo = mergeGeometries(hat.map(p => p.g), false);
    return { skinGeo, clothGeo, hairGeo, hatGeo };
  },

  rebuildPeople(S){
    this.disposeGroup(this.peopleRoot);
    this.people = [];
    const era = S.era;
    const pal = PEOPLE[era] || PEOPLE.ancient;
    const hats = HATS[era] || [];
    const geo = this.personGeometries();

    for (const id of Object.keys(this.islands)){
      const rec = this.islands[id];
      const isl = (S && S.islands) ? S.islands[id] : undefined;
      if (!isl || !isl.accessible || isl.pop < 1) continue;   // guard missing islands
      const cap = isl.pop >= 40 ? 30 : isl.pop >= 12 ? 18 : Math.max(5, Math.round(isl.pop * 0.5));
      const nLocals = Math.min(cap, Math.max(1, Math.round(isl.pop * 0.82)));
      const nVis = Math.min(10, Math.max(0, Math.round(isl.pop * 0.12)));
      if (nLocals > 0) this.spawnPeople(rec, geo, pal.locals, nLocals, "local", SKIN);
      if (nVis > 0 && pal.visitors.length) this.spawnPeople(rec, geo, pal.visitors, nVis, "visitor", SKIN, hats);
    }
  },

  /* true if a model contains a SkinnedMesh (rigged/animated) */
  hasSkin(root){
    if (!root) return false;
    let found = false;
    root.traverse(o => { if (o.isSkinnedMesh) found = true; });
    return found;
  },
  /* Spawn realistic male/female villager clones. Each is grounded on the real
     terrain via a downward raycast + Box3 foot correction (same technique as
     the palms), then stored so animatePeople can make them wander. */
  spawnRealPeople(rec, count, type){
    const rx = rec.rx * (rec.type === "volcano" ? 0.5 : 0.55);
    const rz = rec.ry * (rec.type === "volcano" ? 0.5 : 0.55);
    const us = this.islandUnitScale(rec);
    const rng = this.rng(rec.pos.x * 13 + rec.pos.z * 3 + (type === "visitor" ? 101 : 7));
    const data = [];
    const grp = new THREE.Group();
    grp.position.copy(rec.pos);
    const entries = [];   // {obj, mixer, actWalk, actIdle, x, z, ph, spd, walk, turn, yaw, groundY}
    const worldCtr = new THREE.Vector3(grp.position.x, 0, grp.position.z);
    for (let i = 0; i < count; i++){
      let a = rng() * Math.PI * 2, rr = Math.sqrt(rng());
      let x = Math.cos(a) * rx * rr, z = Math.sin(a) * rz * rr;
      for (let t = 0; t < 30 && !this.pointInIsland(rec, x, z); t++){
        a = rng() * Math.PI * 2; rr = Math.sqrt(rng());
        x = Math.cos(a) * rx * rr; z = Math.sin(a) * rz * rr;
      }
      // cycle male/female models
      const src = PERSON_ANIM[(i % 2 === 0) ? "male" : "female"] || PERSON_ANIM.male || PERSON_ANIM.female;
      if (!src || !src.root) break;
      // loadRealPeople stores a properly-skinned `renderRoot` for rigged models
      // (SkeletonUtils-cloned at load time), so a plain deep clone here renders.
      // Static models clone directly from root.
      let c;
      try { c = src.renderRoot ? src.renderRoot.clone(true) : src.root.clone(true); }
      catch (e){ c = null; }
      if (!c || !c.isObject3D) continue;
      c.scale.setScalar(us * (0.8 + rng() * 0.2));
      const wx = worldCtr.x + x, wz = worldCtr.z + z;
      c.position.set(wx, 0, wz);
      grp.add(c);
      // ground rooted at real terrain (skip Box3 — skinned boxes are unreliable;
      // the model was normalized feet-on-y=0, so root.position.y=terrain grounds it)
      const landY = this.sampleLandHeight(wx, wz);
      const localGround = (landY == null ? (rec.baseY || 0) : landY) - grp.position.y + 0.01;
      c.position.x = x;                 // local (group-local) coords
      c.position.z = z;
      c.position.y = localGround;
      c.rotation.y = rng() * Math.PI * 2;
      // animation: per-villager mixer tied to its own cloned skeleton
      let mixer = null, actWalk = null, actIdle = null;
      try {
        mixer = new THREE.AnimationMixer(c);
        const clips = src.animations || [];
        if (src.walk) actWalk = mixer.clipAction(src.walk); else if (clips.length) actWalk = mixer.clipAction(clips[0]);
        if (src.idle) actIdle = mixer.clipAction(src.idle);
        if (actWalk) actWalk.setLoop(THREE.LoopRepeat).setEffectiveSpeed(1.1).play();
      } catch (e){ mixer = null; actWalk = null; actIdle = null; }
      entries.push({ obj: c, mixer, actWalk, actIdle, x, z,
        ph: rng() * 6.28, spd: 0.3 + rng() * 0.7, walk: rng() > 0.5,
        turn: rng() * 0.5 - 0.25, yaw: rng() * 6.28, groundY: localGround });
    }
    if (entries.length) this.peopleRoot.add(grp);
    if (entries.length) this.people.push({ real: true, anim: true, entries, count: entries.length, data, rx, rz, baseY: rec.baseY || 0.86, rec });
    return entries.length;   // 0 → real model produced nothing visible
  },

  spawnPeople(rec, geo, clothCols, count, type, skinCols, hatCols){
    if (count < 1) return;

    /* Always use the reliable procedural villagers — they are proven to render.
       (The real GLB people path fought us all night and produced invisible
       results; forced OFF for now so villagers always appear on the islands.) */
    const dummy = new THREE.Object3D();
    const data = [];
    const rng = this.rng(rec.pos.x * 13 + rec.pos.z * 3 + (type === "visitor" ? 101 : 7));
    const rx = rec.rx * (rec.type === "volcano" ? 0.5 : 0.55);
    const rz = rec.ry * (rec.type === "volcano" ? 0.5 : 0.55);
    const us = this.islandUnitScale(rec);
    const baseY = rec.buildY || rec.baseY;

    const mk = (g) => {
      // PBR so villagers catch the same environment light as buildings/water.
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff });
      m.metalness = 0; m.roughness = 0.85;
      const mesh = new THREE.InstancedMesh(g, m, count);
      mesh.castShadow = false;
      mesh.userData.ownMaterial = true;
      const grp = new THREE.Group();
      grp.position.copy(rec.pos);
      grp.add(mesh);
      this.peopleRoot.add(grp);
      return mesh;
    };
    const skinMesh = mk(geo.skinGeo);
    const clothMesh = mk(geo.clothGeo);
    const hairMesh = mk(geo.hairGeo);
    const hatMesh = hatCols && hatCols.length ? mk(geo.hatGeo) : null;

    for (let i = 0; i < count; i++){
      // keep sampling until we find a spot on actual land (skip ocean/bays)
      let a = rng() * Math.PI * 2, rr = Math.sqrt(rng());
      let x = Math.cos(a) * rx * rr, z = Math.sin(a) * rz * rr;
      for (let t = 0; t < 30 && !this.pointInIsland(rec, x, z); t++){
        a = rng() * Math.PI * 2; rr = Math.sqrt(rng());
        x = Math.cos(a) * rx * rr; z = Math.sin(a) * rz * rr;
      }
      dummy.position.set(x, baseY, z);
      dummy.rotation.y = rng() * Math.PI * 2;
      // People scale with the island so they sit on the land, not spill into
      // the sea on tiny islets. The placement radius is capped at ~55% of the
      // isle, keeping them clustered on the habitable land.
      dummy.scale.setScalar(us * (0.72 + rng() * 0.3));
      dummy.updateMatrix();
      const skin = new THREE.Color(skinCols[Math.floor(rng() * skinCols.length)]);
      const cloth = new THREE.Color(clothCols[Math.floor(rng() * clothCols.length)]);
      const hair = new THREE.Color(HAIR[Math.floor(rng() * HAIR.length)]);
      skinMesh.setMatrixAt(i, dummy.matrix); skinMesh.setColorAt(i, skin);
      clothMesh.setMatrixAt(i, dummy.matrix); clothMesh.setColorAt(i, cloth);
      hairMesh.setMatrixAt(i, dummy.matrix); hairMesh.setColorAt(i, hair);
      if (hatMesh){
        hatMesh.setMatrixAt(i, dummy.matrix);
        hatMesh.setColorAt(i, new THREE.Color(hatCols[Math.floor(rng() * hatCols.length)]));
      }
      data.push({ x, z, ph: rng() * 6.28, spd: 0.3 + rng() * 0.7, walk: rng() > 0.5, turn: rng() * 0.5 - 0.25, yaw: rng() * 6.28, lean: 0 });
    }
    for (const m of [skinMesh, clothMesh, hairMesh, hatMesh].filter(Boolean)){
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    this.people.push({ meshes: [skinMesh, clothMesh, hairMesh, hatMesh].filter(Boolean), data, count, rx, rz, baseY, rec });
  },

  /* ---------- ships ---------- */
  rebuildShips(S){
    this.disposeGroup(this.decorRoot);
    const era = S.era;
    const ships = [];
    if (era === "ancient") ships.push(["proa", "saipan"]);
    else if (era === "contact") ships.push(["proa", "saipan"], ["galleon", "saipan"]);
    else if (era === "spanish") ships.push(["galleon", "saipan"], ["galleon", "guam"]);
    else if (era === "german") ships.push(["steamer", "saipan"]);
    else if (era === "japanese") ships.push(["steamer", "saipan"], ["freighter", "tinian"]);
    else if (era === "american") ships.push(["transport", "saipan"]);
    else if (era === "commonwealth") ships.push(["freighter", "saipan"]);
    else ships.push(["modern", "guam"], ["modern", "saipan"]);
    for (const [type, at] of ships){
      const isl = this.islands[at];
      if (!isl) continue;
      const dist = Math.max(isl.w, isl.h) * 0.62 + 8;
      const pos = this.shipAnchor(isl.pos, dist);
      const grp = this.makeShip(type);
      grp.position.copy(pos);
      this.decorRoot.add(grp);
    }
  },

  shipAnchor(islPos, dist){
    const rng = this.rng(Math.round(islPos.x * 100) + Math.round(islPos.z * 7));
    const a = 1.1 + rng() * 0.7;
    return new THREE.Vector3(islPos.x + Math.cos(a) * dist, 0, islPos.z + Math.sin(a) * dist);
  },

  makeShip(type){
    const grp = new THREE.Group();
    if (type === "proa"){
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.5, 6), M.darkWood);
      hull.scale.y = 0.5; hull.position.y = 0.12;
      grp.add(hull);
      const float = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), M.wood);
      float.position.set(0, 0.06, 0.55);
      grp.add(float);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 5), M.wood);
      mast.position.set(0.15, 0.5, 0);
      grp.add(mast);
      const sail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 3), M.canvas);
      sail.position.set(0.15, 0.78, 0);
      grp.add(sail);
    } else if (type === "galleon"){
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 0.5, 8), M.darkWood);
      hull.scale.y = 0.55; hull.position.y = 0.22;
      grp.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.28), M.cargo);
      deck.position.set(0, 0.45, 0);
      grp.add(deck);
      const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 5), M.wood); m1.position.set(-0.25, 1.15, 0); grp.add(m1);
      const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 5), M.wood); m2.position.set(0.25, 0.95, 0); grp.add(m2);
      const s1 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.0, 3), M.canvas); s1.position.set(-0.25, 1.6, 0); s1.scale.z = 0.5; grp.add(s1);
      const s2 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.85, 3), M.canvas); s2.position.set(0.25, 1.35, 0); s2.scale.z = 0.5; grp.add(s2);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.06), M.redFlag);
      flag.position.set(-0.25, 2.2, 0);
      grp.add(flag);
    } else if (type === "steamer"){
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 0.5, 8), M.iron);
      hull.scale.y = 0.6; hull.position.y = 0.2;
      grp.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.28), M.steel);
      deck.position.set(0, 0.5, 0);
      grp.add(deck);
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.9, 6), M.dark); funnel.position.set(0.2, 1.1, 0); grp.add(funnel);
    } else if (type === "freighter"){
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 0.6, 8), M.dark);
      hull.scale.y = 0.6; hull.position.y = 0.25;
      grp.add(hull);
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.4), M.cargo);
      cargo.position.set(0, 0.65, 0);
      grp.add(cargo);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.3), M.steel);
      bridge.position.set(0.2, 1.0, 0);
      grp.add(bridge);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.8, 5), M.iron); mast.position.set(-0.35, 1.5, 0); grp.add(mast);
    } else if (type === "transport"){
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 0.7, 8), M.roofGrey);
      hull.scale.y = 0.6; hull.position.y = 0.28;
      grp.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.45), M.steel);
      deck.position.set(0, 0.85, 0);
      grp.add(deck);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.0, 5), M.iron); mast.position.set(-0.35, 1.6, 0); grp.add(mast);
    } else { // modern
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 0.5, 10), M.white);
      hull.scale.y = 0.55; hull.position.y = 0.2;
      grp.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.3), M.white);
      deck.position.set(0, 0.65, 0);
      grp.add(deck);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), M.steel); mast.position.set(0.3, 1.1, 0); grp.add(mast);
      const radar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.28), M.glass); radar.position.set(0.3, 1.2, 0); grp.add(radar);
    }
    grp.traverse(o => { if (o.isMesh){ o.castShadow = true; o.userData.ship = true; } });
    return grp;
  },

  /* ---------- fx ---------- */
  pulse(type){
    if (!this.ok) return;
    if (type === "typhoon") this.shake = { t: 1.4, mag: 0.9, flash: "#0a2a4a", flashA: 0.35 };
    else if (type === "battle") this.shake = { t: 1.6, mag: 0.7, flash: "#ff5544", flashA: 0.22 };
    else if (type === "discovery") this.shake = { t: 0.8, mag: 0.25, flash: "#ffe8a0", flashA: 0.2 };
    else this.shake = { t: 0.6, mag: 0.2, flash: "#ffffff", flashA: 0.15 };
  },

  /* ---------- helpers ---------- */
  /* Seeds must be normalized to a positive integer: island coords include
     negative z, and a negative/float seed makes the LCG emit negative
     values — Math.sqrt(rng()) then returns NaN and buildings vanish. */
  rng(seed){
    let s = Math.abs(Math.floor(seed || 1)) % 233280 + 1;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  },

  disposeGroup(grp){
    while (grp.children.length){
      const c = grp.children.pop();
      if (c.isMesh){
        if (c.geometry) c.geometry.dispose();
        if (c.material && c.userData.ownMaterial) c.material.dispose();
      }
    }
  },

  applyTheme(th){
    if (this.skyTex) this.updateSky(th.sky, th.fog);   // gradient sky backdrop
    else this.scene.background = new THREE.Color(th.sky);
    this.scene.fog = new THREE.Fog(th.fog, 200, 700);
    this.water.material.color.setHex(th.water);
    this.sun.color.setHex(th.sun);
    // sunI themes (0.9–1.2) were tuned for the old flat pipeline; with tone
    // mapping + environment we boost so the PBR sun still reads bright & warm.
    this.sun.intensity = th.sunI * 1.6;
    this.scene.children.forEach(c => {
      if (c.isHemisphereLight) c.intensity = th.hemi * 1.1;
    });
  },

  /* ---------- animation loop ---------- */
  loop(){
    this.raf = requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.t += dt;

    // apply a real sea texture the moment it finishes loading (one-time)
    this.applySeaTexture();
    // apply a real sky panorama the moment it finishes loading (one-time)
    this.applySkyTexture();

    // theme lerp
    if (this.themeFrom && this.themeT < 1){
      this.themeT = Math.min(1, this.themeT + dt / 1.4);
      const k = this.themeT;
      const a = this.themeFrom, b = this.theme;
      const cur = {
        sky: this.lerpColor(a.sky, b.sky, k),
        fog: this.lerpColor(a.fog, b.fog, k),
        water: this.lerpColor(a.water, b.water, k),
        sun: this.lerpColor(a.sun, b.sun, k),
        sunI: a.sunI + (b.sunI - a.sunI) * k,
        hemi: a.hemi + (b.hemi - a.hemi) * k,
      };
      this.themeCur = cur;
      this.applyTheme(cur);
      if (this.themeT >= 1) this.themeFrom = null;
    }

    // "just built" pop: buildings settle into place after being raised
    if (this.buildPop > 1.001){
      this.buildPop += (1 - this.buildPop) * Math.min(1, dt * 6);
      this.buildRoot.scale.setScalar(this.buildPop);
    } else if (this.buildRoot.scale.x !== 1){
      this.buildRoot.scale.setScalar(1);
    }

    // selection ring
    if (this.ring && this.ring.visible){
      this.ringSpin += dt * 0.8;
      this.ring.rotation.z = this.ringSpin;
    }

    // wandering people (position) + advance their skeletal animation mixers
    this.animatePeople(dt);
    this.updatePeopleMixers(dt);

    // animated extras (wind turbines, lighthouse beacons)
    for (const a of this.anims){
      if (a.kind === "spin") a.obj.rotation.z += dt * a.speed;
      else if (a.kind === "pulse"){
        const s = a.base + Math.sin(this.t * a.speed) * a.amp;
        a.obj.scale.setScalar(Math.max(0.05, s));
      }
    }

    // ships bob
    this.decorRoot.children.forEach((g, i) => {
      g.position.y = Math.sin(this.t * 1.4 + i * 1.7) * 0.06;
      g.rotation.z = Math.sin(this.t * 0.9 + i * 2.3) * 0.02;
    });

    // ocean ripple scroll (normal-map offset drifts slowly across the water)
    if (this.waterNormal){
      this.waterNormal.offset.x = this.t * 0.006;
      this.waterNormal.offset.y = this.t * 0.009;
    }

    // national flag flutters in the trade winds
    if (this.flagPlane){
      this.flagPlane.rotation.y = Math.sin(this.t * 1.6) * 0.14;
      this.flagPlane.rotation.z = Math.sin(this.t * 2.3 + 1) * 0.05;
    }

    // camera focus follow
    if (this.focus){
      this.controls.target.lerp(this.focus, 0.06);
    }

    // shake
    let shX = 0, shY = 0;
    if (this.shake){
      this.shake.t -= dt;
      const k = Math.max(0, this.shake.t) / Math.max(0.0001, this.shake.t + dt);
      shX = (Math.random() - 0.5) * this.shake.mag * k;
      shY = (Math.random() - 0.5) * this.shake.mag * k;
      if (this.flashDiv){
        this.flashDiv.style.background = this.shake.flash;
        this.flashDiv.style.opacity = String(Math.max(0, this.shake.flashA * k));
      }
      if (this.shake.t <= 0){ this.shake = null; if (this.flashDiv) this.flashDiv.style.opacity = "0"; }
    }
    this.camera.position.x += shX;
    this.camera.position.y += shY;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  },

  animatePeople(dt){
    const dummy = new THREE.Object3D();
    for (const grp of this.people){
      const meshes = grp.meshes;
      if (grp.real){
        // real animated GLB people: walk the skeleton + move the root
        for (let i = 0; i < grp.count; i++){
          const d = grp.entries[i];
          if (!d) continue;
          if (d.walk){
            d.yaw += d.turn * dt;
            const nx = d.x + Math.cos(d.yaw) * d.spd * dt;
            const nz = d.z + Math.sin(d.yaw) * d.spd * dt;
            const tooFar = nx * nx / (grp.rx * grp.rx) + nz * nz / (grp.rz * grp.rz) > 1;
            const overSea = !this.pointInIsland(grp.rec, nx, nz);
            if (tooFar || overSea){
              d.yaw += Math.PI * (0.6 + Math.random() * 0.8);
              d.turn = (Math.random() - 0.5) * 1.2;
            } else { d.x = nx; d.z = nz; }
            // ground follow: bounce off a subtle step instead of floating
            if (d.mixer && d.actIdle && d.actIdle.isRunning() && d.actWalk){
              d.actIdle.stop(); d.actWalk.reset().play();
            }
          } else if (d.mixer && d.actWalk && d.actWalk.isRunning() && d.actIdle){
            d.actWalk.stop(); d.actIdle.reset().play();
            d.yaw += dt * 0.4;
          } else {
            d.yaw += dt * 0.4;
          }
          if (!d.obj) continue;
          d.obj.position.set(d.x, d.groundY + Math.sin(this.t * 2.4 + d.ph) * 0.02, d.z);
          d.obj.rotation.y = d.yaw;
        }
        continue;
      }
      for (let i = 0; i < grp.count; i++){
        const d = grp.data[i];
        if (d.walk){
          d.yaw += d.turn * dt;
          const nx = d.x + Math.cos(d.yaw) * d.spd * dt;
          const nz = d.z + Math.sin(d.yaw) * d.spd * dt;
          // bounce off the walk zone edge OR off open water (bays/coasts)
          const tooFar = nx * nx / (grp.rx * grp.rx) + nz * nz / (grp.rz * grp.rz) > 1;
          const overSea = !this.pointInIsland(grp.rec, nx, nz);
          if (tooFar || overSea){
            d.yaw += Math.PI * (0.6 + Math.random() * 0.8);
            d.turn = (Math.random() - 0.5) * 1.2;
          } else { d.x = nx; d.z = nz; }
        } else {
          d.yaw += dt * 0.4;
        }
        d.lean = Math.sin(this.t * (d.spd * 6) + d.ph) * 0.08;
        dummy.position.set(d.x, grp.baseY + Math.sin(this.t * 2.4 + d.ph) * 0.045, d.z);
        dummy.rotation.y = d.yaw;
        dummy.rotation.x = d.lean;
        dummy.scale.setScalar(1.0);
        dummy.updateMatrix();
        for (const m of meshes) m.setMatrixAt(i, dummy.matrix);
      }
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    }
  },

  /* Advance every animated villager's AnimationMixer(s) so limbs actually move. */
  updatePeopleMixers(dt){
    for (const grp of this.people){
      if (grp.real && grp.entries){
        for (const d of grp.entries){
          if (d && d.mixer) d.mixer.update(dt);
        }
      }
    }
  },

  lerpColor(a, b, k){
    const ca = new THREE.Color(a), cb = new THREE.Color(b);
    return ca.lerp(cb, k).getHex();
  },

  resize(){
    if (!this.ok || !this.renderer) return;
    const host = this.renderer.domElement.parentElement;
    if (!host) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.labelRenderer) this.labelRenderer.setSize(w, h);
  },
};

window.Board = Board;
