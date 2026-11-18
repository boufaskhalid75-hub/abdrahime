// SJL Group – présentation "wa3ra" (palette SJL vert / rouge), 26 slides, Morph + icônes 3D
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fs = require("fs");
const fa = require("react-icons/fa6");
const { applyTheme } = require(process.env.SKILL + "/scripts/apply_theme.js");
const { addMotion } = require("./motion.js");

const OUT = "SJL_Digitalisation_Logistique_v3.pptx";
const THEME = {
  name: "SJL Vert Rouge", headFontFace: "Arial", bodyFontFace: "Calibri",
  colors: { dk1: "0E3B2E", lt1: "FFFFFF", dk2: "4F5D57", lt2: "F3F5F4", accent1: "D62828", accent2: "0E3B2E", accent3: "16503F", accent4: "C9D6D0", accent5: "2E8B57", accent6: "F2A33A", hlink: "16503F", folHlink: "6B7A75" },
};
const H = { green: "0E3B2E", green2: "16503F", green3: "1F6B53", red: "D62828", redD: "A61B1B", white: "FFFFFF", grey: "F3F5F4", line: "D6DFDB", mute: "C9D6D0", amber: "F2A33A", ok: "2E8B57" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "La digitalisation de la logistique chez SJL Group";
pres.subject = "ENCG Tanger – Module Digital Skills";
pres.author = "Groupe ENCG Tanger";
const C = pres.SchemeColor;
const W = 13.333, MX = 0.6, CW = W - 2 * MX, R = W - MX;
fs.mkdirSync("crop3", { recursive: true });
fs.mkdirSync("bg3", { recursive: true });

// ---------- backgrounds ----------
async function makeBgs() {
  const w = 2667, h = 1500;
  const routes = (c, op) => ["M1200 1500 C1500 1250 1750 1300 2000 1050 S2450 700 2667 640", "M1500 1500 C1750 1320 1950 1360 2180 1180 S2550 930 2667 900", "M900 1500 C1250 1380 1450 1180 1800 1130 S2300 1000 2667 1180"].map((d) => `<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="3"/>`).join("") + [[2000, 1050], [2180, 1180], [1800, 1130], [2450, 760]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${c}" fill-opacity="${op * 2}"/>`).join("");
  const dots = (c, op) => { let s = ""; for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) s += `<circle cx="${2330 + i * 38}" cy="${70 + j * 38}" r="3.2" fill="${c}" fill-opacity="${op}"/>`; return s; };
  const svgs = {
    light: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#FBFCFB"/><stop offset="1" stop-color="#ECF1EF"/></linearGradient><radialGradient id="o" cx="2667" cy="1500" r="1100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#D62828" stop-opacity=".07"/><stop offset="1" stop-color="#D62828" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#o)"/>${routes("#0E3B2E", 0.05)}${dots("#0E3B2E", 0.08)}`,
    grey: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6F8F7"/><stop offset=".55" stop-color="#F0F3F2"/><stop offset="1" stop-color="#E2E9E6"/></linearGradient><radialGradient id="o" cx="0" cy="1500" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#16503F" stop-opacity=".08"/><stop offset="1" stop-color="#16503F" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#o)"/>${routes("#0E3B2E", 0.06)}${dots("#0E3B2E", 0.09)}`,
    dark: `<defs><radialGradient id="g" cx="2100" cy="250" r="2300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1F6B53"/><stop offset=".45" stop-color="#124536"/><stop offset="1" stop-color="#08251C"/></radialGradient><radialGradient id="o" cx="150" cy="1500" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#D62828" stop-opacity=".18"/><stop offset="1" stop-color="#D62828" stop-opacity="0"/></radialGradient><linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".045"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#o)"/><polygon points="1500,0 1900,0 1100,1500 700,1500" fill="url(#beam)"/><polygon points="2050,0 2250,0 1450,1500 1250,1500" fill="url(#beam)"/>${routes("#C9D6D0", 0.1)}${dots("#C9D6D0", 0.16)}`,
  };
  for (const [k, s] of Object.entries(svgs)) await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${s}</svg>`)).png({ compressionLevel: 9 }).toFile(`bg3/${k}.png`);
}

// ---------- 3D icon tiles ----------
const TILE = {
  red: { a: "#FF6B6B", b: "#B01717", ic: "#FFFFFF" },
  green: { a: "#2F8A6B", b: "#0A2E23", ic: "#FFFFFF" },
  white: { a: "#FFFFFF", b: "#DDE6E2", ic: "#0E3B2E" },
  amber: { a: "#FFC46B", b: "#D9821A", ic: "#FFFFFF" },
};
const tileCache = {};
async function tilePng(icon, style) {
  const k = icon + style;
  if (tileCache[k]) return tileCache[k];
  const t = TILE[style];
  const inner = RDS.renderToStaticMarkup(React.createElement(fa[icon], { color: t.ic, size: 120 })).replace(/ (width|height)="[^"]*"/g, "").replace(/^<svg/, '<svg x="68" y="62" width="120" height="120"');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dy="9"/><feComponentTransfer><feFuncA type="linear" slope=".35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="i" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/><feOffset dy="4"/><feComponentTransfer><feFuncA type="linear" slope=".3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#s)"><rect x="18" y="12" width="220" height="220" rx="58" fill="url(#g)"/></g><rect x="30" y="20" width="196" height="96" rx="46" fill="url(#h)"/><rect x="18.5" y="12.5" width="219" height="219" rx="57.5" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/><g filter="url(#i)">${inner}</g></svg>`;
  return (tileCache[k] = "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64"));
}
async function tile(s, x, y, d, icon, style, name) { s.addImage({ data: await tilePng(icon, style), x, y, w: d, h: d, objectName: name || "tile", altText: "" }); }

// ---------- photos ----------
let cropN = 0;
async function photo(s, file, x, y, w, h, o = {}) {
  const f = `crop3/${++cropN}.jpg`, pw = Math.round(w * 200), ph = Math.round(h * 200);
  let im = sharp(`sjl/${file}`).resize(pw, ph, { fit: "cover", position: o.pos || "centre" });
  if (o.dim) im = im.modulate({ brightness: o.dim });
  if (o.grey) im = im.greyscale();
  let buf = await im.toBuffer();
  if (o.grad) {
    const g = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0A2E23" stop-opacity=".96"/><stop offset=".42" stop-color="#0A2E23" stop-opacity=".86"/><stop offset=".7" stop-color="#0A2E23" stop-opacity=".12"/><stop offset="1" stop-color="#0A2E23" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#a)"/></svg>`;
    buf = await sharp(buf).composite([{ input: Buffer.from(g) }]).toBuffer();
  }
  if (o.veil) buf = await sharp(buf).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}"><rect width="100%" height="100%" fill="#08251C" fill-opacity="${o.veil}"/></svg>`) }]).toBuffer();
  await sharp(buf).jpeg({ quality: 85 }).toFile(f);
  s.addImage({ path: f, x, y, w, h, objectName: o.name || "photo", altText: o.alt || "" });
}

// ---------- layouts ----------
function frame(name, img, dark) {
  pres.defineSlideMaster({
    title: name, background: { path: `bg3/${img}.png` },
    objects: [
      { placeholder: { options: { name: "kicker", type: "body", x: MX, y: 0.34, w: 9, h: 0.32, fontSize: 12, bold: true, color: C.accent1, charSpacing: 3, margin: 0, valign: "middle" }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.68, w: 10.6, h: 0.82, fontSize: 34, bold: true, color: dark ? C.background1 : C.text1, margin: 0, valign: "middle", align: "left" }, text: "" } },
      { text: { text: "SJL Group  ·  La digitalisation de la logistique  ·  ENCG Tanger", options: { x: MX, y: 7.03, w: 8, h: 0.28, fontSize: 10, color: dark ? C.accent4 : C.text2, margin: 0 } } },
    ],
    slideNumber: { x: 12.23, y: 7.03, w: 0.5, h: 0.28, fontSize: 10, bold: true, color: C.accent1, align: "right", margin: 0 },
  });
}
frame("CONTENT_LIGHT", "light", false);
frame("CONTENT_GREY", "grey", false);
frame("CONTENT_DARK", "dark", true);
pres.defineSlideMaster({ title: "COVER", background: { color: H.green }, objects: [] });
pres.defineSlideMaster({ title: "PHOTO", background: { color: H.green }, objects: [
  { placeholder: { options: { name: "kicker", type: "body", x: MX, y: 0.34, w: 9, h: 0.32, fontSize: 12, bold: true, color: "FF9A9A", charSpacing: 3, margin: 0, valign: "middle" }, text: "" } },
  { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.68, w: 10.6, h: 0.82, fontSize: 34, bold: true, color: C.background1, margin: 0, valign: "middle", align: "left" }, text: "" } },
], slideNumber: { x: 12.23, y: 7.03, w: 0.5, h: 0.28, fontSize: 10, bold: true, color: C.background1, align: "right", margin: 0 } });

// ---------- helpers ----------
function T(s, text, o) { s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontSize: 14, color: C.text2, valign: "top" }, o)); }
const shadow = () => ({ type: "outer", color: "0E3B2E", opacity: 0.14, blur: 10, offset: 3, angle: 90 });
function card(s, x, y, w, h, fill, name, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: o.r ?? 0.1, fill: { color: fill, transparency: o.tr || 0 }, line: o.line ? { color: o.line, width: o.lw || 1, dashType: o.dash || "solid" } : { color: fill, width: 0 }, shadow: o.shadow ? shadow() : undefined, objectName: name || "card" });
}
function head(s, k, t) { s.addText(k, { placeholder: "kicker" }); s.addText(t, { placeholder: "title" }); }
function src(s, text, dark) { T(s, text, { x: MX, y: 6.68, w: CW, h: 0.26, fontSize: 10, italic: true, color: dark ? C.accent4 : C.text2, objectName: "source" }); }
function pill(s, x, y, w, text, bg, fg, name, size = 11) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.32, rectRadius: 0.16, fill: { color: bg }, line: { color: bg, width: 0 }, objectName: (name || "pill") + "_bg" });
  T(s, text, { x, y, w, h: 0.32, fontSize: size, bold: true, color: fg, align: "center", valign: "middle", charSpacing: 1, objectName: (name || "pill") + "_t" });
}
function arrow(s, x1, y1, x2, y2, color, o = {}) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1, line: { color, width: o.w || 2, dashType: o.dash || "solid", endArrowType: o.noEnd ? undefined : "triangle" }, objectName: o.name || "arrow" });
}
// progress dots (7 parts), morph-linked
function progress(s, part, dark) {
  for (let i = 1; i <= 7; i++) {
    const active = i === part, x = 10.95 + (i - 1) * 0.24 + (i > part ? 0.22 : 0);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 0.44, w: active ? 0.4 : 0.13, h: 0.13, rectRadius: 0.065, fill: { color: active ? H.red : (dark ? "5E7D72" : "C9D6D0") }, line: { color: H.white, width: 0, transparency: 100 }, objectName: "!!dot" + i });
  }
}
const notes = (s, t) => s.addNotes(t);

// morph motif
const OFF_R = [W + 0.6, -0.5, 5.0], OFF_L = [-5.6, 3.0, 5.0];
const STATES = [
  { A: [W - 2.0, -1.7, 3.6], B: [-1.9, 5.4, 3.8], R: OFF_R },
  { A: [W - 1.9, 5.3, 3.4], B: [W - 1.2, -1.4, 2.6], R: OFF_R },
  { A: [W - 1.3, 2.4, 2.8], B: [W - 3.5, 6.4, 3.2], R: OFF_L },
  { A: [-1.6, 5.6, 3.4], B: [W - 2.2, -2.0, 3.8], R: OFF_L },
  { A: [W - 1.5, -1.0, 2.4], B: [W - 2.2, 5.6, 3.4], R: OFF_R },
  { A: [W - 5.0, 6.7, 3.0], B: [W - 1.6, -1.8, 3.4], R: OFF_R },
];
const HERO = { A: [10.9, 4.9, 3.0], B: [11.6, -2.1, 3.4], R: [7.9, -1.6, 7.2] };
function motif(s, i, dark, st) {
  st = st || STATES[(i - 1) % STATES.length];
  const [ax, ay, ad] = st.A, [bx, by, bd] = st.B, [rx, ry, rd] = st.R;
  s.addShape(pres.shapes.OVAL, { x: bx, y: by, w: bd, h: bd, fill: { color: dark ? "2F8A6B" : H.green, transparency: dark ? 60 : 93 }, line: { color: H.green, width: 0, transparency: 100 }, objectName: "!!orbB" });
  s.addShape(pres.shapes.OVAL, { x: ax, y: ay, w: ad, h: ad, fill: { color: H.red, transparency: dark ? 80 : 89 }, line: { color: H.red, width: 0, transparency: 100 }, objectName: "!!orbA" });
  s.addShape(pres.shapes.OVAL, { x: rx, y: ry, w: rd, h: rd, fill: { color: H.white, transparency: 100 }, line: { color: dark ? H.red : "EE9A9A", width: 1.5 }, objectName: "!!ring" });
}
const _addSlide = pres.addSlide.bind(pres);
let slideNo = 0;
pres.addSlide = (o) => { const s = _addSlide(o); slideNo++; if (!["COVER", "PHOTO"].includes(o.masterName)) motif(s, slideNo, o.masterName === "CONTENT_DARK"); return s; };
const P = (n) => Array.from({ length: n }, (_, i) => `anim${i + 1}_`);
const ANIM = {};

(async () => {
  await makeBgs();
  let s, n;
  const SEC = (t) => pres.addSection({ title: t });

  // ===== 1 COVER =====
  SEC("Introduction");
  s = pres.addSlide({ masterName: "COVER", sectionTitle: "Introduction" });
  await photo(s, "s5.jpg", 0, 0, W, 7.5, { name: "!!hero", grad: true, pos: "right", alt: "Camion et remorques SJL Group" });
  motif(s, 1, true, HERO);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 0.55, w: 2.9, h: 1.12, rectRadius: 0.12, fill: { color: H.white }, line: { color: H.white, width: 0 }, objectName: "logoBox" });
  s.addImage({ path: "sjl/logo.png", x: 0.9, y: 0.65, w: 2.6, h: 0.94, objectName: "logoENCG", altText: "Logo ENCG Tanger" });
  pill(s, 0.75, 2.0, 3.6, "DIGITAL SKILLS · RAPPORT DE PROJET", H.red, H.white, "coverPill");
  T(s, "La digitalisation de la logistique chez SJL Group", { x: 0.75, y: 2.45, w: 7.3, h: 1.85, fontSize: 38, bold: true, color: C.background1, fontFace: "Arial", valign: "middle", objectName: "!!mainTitle" });
  T(s, "Suivi des marchandises · Coordination des opérations · Optimisation des délais", { x: 0.75, y: 4.4, w: 6.2, h: 0.75, fontSize: 17, color: C.accent4 });
  T(s, [
    { text: "Réalisé par : ", options: { bold: true, color: C.accent1 } }, { text: "Saad Boufas · Mouna · Alae · Salma · Fati · Raghad · Hiba", options: { breakLine: true } },
    { text: "Encadré par : ", options: { bold: true, color: C.accent1 } }, { text: "[Nom de l'encadrant(e)]", options: { breakLine: true } },
    { text: "ENCG Tanger · 1re année · Année universitaire 2026 – 2027" },
  ], { x: 0.75, y: 5.45, w: 6.6, h: 1.2, fontSize: 14, color: C.background1, paraSpaceAfter: 4 });
  T(s, "Photo : SJL Group", { x: 10.9, y: 7.08, w: 2.2, h: 0.25, fontSize: 10, color: C.background1, align: "right" });
  notes(s, "Bonjour à toutes et à tous. Nous allons vous présenter notre projet du module Digital Skills : la digitalisation de la logistique chez SJL Group.\n\nSJL est un groupe de transport international et de logistique, d'origine espagnole, très présent à Tanger. Nous allons voir comment le numérique l'aide à mieux suivre les marchandises, mieux coordonner ses opérations et réduire ses délais.");

  // ===== 2 SOMMAIRE =====
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Introduction" });
  head(s, "SOMMAIRE", "Notre parcours en 7 étapes");
  const parts = ["Introduction et problématique", "Présentation de SJL", "La logistique de SJL", "Digitalisation et socle technologique", "Impact sur la performance", "Analyse stratégique", "Conclusion et perspectives"];
  for (let i = 0; i < 7; i++) {
    const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4, x = MX + col * 3.75, y = 1.85 + row * 1.15, g = `anim${col + 1}_`;
    card(s, x, y, 3.55, 0.95, H.green2, g + "c" + i, { tr: 10 });
    T(s, String(i + 1).padStart(2, "0"), { x: x + 0.2, y, w: 0.8, h: 0.95, fontSize: 28, bold: true, color: C.accent1, fontFace: "Arial", valign: "middle", objectName: g + "n" + i });
    T(s, parts[i], { x: x + 1.0, y, w: 2.45, h: 0.95, fontSize: 15, bold: true, color: C.background1, valign: "middle", objectName: g + "t" + i });
  }
  await photo(s, "trucks2.jpg", 8.25, 1.85, 4.48, 4.6, { name: "!!sidePhoto", pos: "centre", alt: "Deux camions SJL sur autoroute" });
  ANIM[2] = P(2);
  notes(s, "Voici notre plan. [clic] D'abord l'introduction, la présentation de SJL, sa logistique et sa digitalisation. [clic] Ensuite l'impact sur la performance, l'analyse stratégique, puis la conclusion.");

  // ===== 3 PROBLÉMATIQUE =====
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Introduction" });
  head(s, "PARTIE 1 · INTRODUCTION GÉNÉRALE", "Problématique et objectifs"); progress(s, 1);
  card(s, MX, 1.8, CW, 1.75, H.green, "!!quote", { shadow: true });
  T(s, "“", { x: MX + 0.3, y: 1.75, w: 0.7, h: 0.9, fontSize: 64, bold: true, color: C.accent1, fontFace: "Arial" });
  T(s, [
    { text: "Comment la digitalisation peut-elle améliorer la performance logistique de SJL, notamment en matière de " }, { text: "suivi des marchandises", options: { color: "FF8A8A" } }, { text: ", de " }, { text: "coordination des opérations", options: { color: "FF8A8A" } }, { text: " et d'" }, { text: "optimisation des délais", options: { color: "FF8A8A" } }, { text: " ?" },
  ], { x: MX + 1.1, y: 1.95, w: 10.8, h: 1.45, fontSize: 20, bold: true, color: C.background1, valign: "middle" });
  const ax3 = [["FaMagnifyingGlassLocation", "Suivi des marchandises", "Traçabilité et visibilité des marchandises en transit."], ["FaSitemap", "Coordination des opérations", "Communication fluide entre services et acteurs."], ["FaStopwatch", "Optimisation des délais", "Réduction des temps d'exécution des commandes."]];
  for (let i = 0; i < 3; i++) {
    const x = MX + i * 4.1, g = `anim${i + 1}_`;
    card(s, x, 3.85, 3.93, 2.6, H.white, g + "c", { shadow: true, line: H.line });
    await tile(s, x + 0.25, 4.1, 0.8, ax3[i][0], i === 1 ? "green" : "red", g + "i");
    T(s, "0" + (i + 1), { x: x + 2.9, y: 4.05, w: 0.8, h: 0.6, fontSize: 30, bold: true, color: C.accent4, align: "right", fontFace: "Arial", objectName: g + "n" });
    T(s, ax3[i][1], { x: x + 0.25, y: 5.05, w: 3.45, h: 0.45, fontSize: 18, bold: true, color: C.text1, objectName: g + "t" });
    T(s, ax3[i][2], { x: x + 0.25, y: 5.5, w: 3.45, h: 0.8, fontSize: 14, objectName: g + "d" });
  }
  ANIM[3] = P(3);
  notes(s, "Notre problématique : comment la digitalisation peut-elle améliorer la performance logistique de SJL, notamment en matière de suivi des marchandises, de coordination des opérations et d'optimisation des délais ?\n\n[clic] Premier axe : le suivi, c'est-à-dire savoir où est la marchandise. [clic] Deuxième axe : la coordination entre les services. [clic] Troisième axe : les délais.");

  // ===== 4 QUI EST SJL =====
  SEC("Présentation de SJL");
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Présentation de SJL" });
  head(s, "PARTIE 2 · PRÉSENTATION DE SJL", "Qui est SJL Group ?"); progress(s, 2);
  const who = [["FaEarthEurope", "Groupe d'origine espagnole", "Transport international de marchandises et services logistiques."], ["FaLocationDot", "Présence importante au Maroc", "Implantation notamment à Tanger."], ["FaRoute", "Europe ↔ Afrique du Nord", "Des solutions qui relient l'Europe et l'Afrique."]];
  for (let i = 0; i < 3; i++) {
    const y = 1.8 + i * 0.95;
    await tile(s, MX, y, 0.7, who[i][0], i === 1 ? "red" : "green", "who" + i);
    T(s, [{ text: who[i][1], options: { bold: true, fontSize: 17, color: C.text1, breakLine: true } }, { text: who[i][2] }], { x: MX + 0.9, y: y - 0.02, w: 5.6, h: 0.8, fontSize: 14 });
  }
  T(s, "CLIENTS INDUSTRIELS", { x: MX, y: 4.75, w: 4, h: 0.3, fontSize: 12, bold: true, color: C.accent1, charSpacing: 3 });
  ["Automobile", "Textile", "Agroalimentaire", "Biens de consommation"].forEach((c, i) => {
    const x = MX + (i % 2) * 3.1, y = 5.15 + Math.floor(i / 2) * 0.68, g = "anim1_";
    card(s, x, y, 2.95, 0.55, H.white, g + "ch" + i, { line: H.green3, lw: 1.25, r: 0.27 });
    T(s, c, { x, y, w: 2.95, h: 0.55, fontSize: 15, bold: true, color: C.text1, align: "center", valign: "middle", objectName: g + "cht" + i });
  });
  // schematic map
  card(s, 7.15, 1.8, 5.58, 4.75, H.green, "!!map", { shadow: true });
  s.addShape(pres.shapes.OVAL, { x: 7.45, y: 2.15, w: 5.0, h: 1.45, fill: { color: H.green2 }, line: { color: "8FB8A8", width: 1, dashType: "dash" }, objectName: "eu" });
  s.addShape(pres.shapes.OVAL, { x: 7.45, y: 4.1, w: 5.0, h: 1.6, fill: { color: H.green2 }, line: { color: "8FB8A8", width: 1, dashType: "dash" }, objectName: "af" });
  T(s, "E U R O P E", { x: 9.2, y: 2.22, w: 1.5, h: 0.28, fontSize: 11, bold: true, color: "8FB8A8", align: "center" });
  T(s, "A F R I Q U E   D U   N O R D", { x: 8.6, y: 5.35, w: 2.8, h: 0.28, fontSize: 11, bold: true, color: "8FB8A8", align: "center" });
  arrow(s, 8.32, 2.98, 8.42, 4.62, H.red, { dash: "dash", noEnd: true, w: 2 });
  arrow(s, 8.6, 4.75, 11.2, 4.55, "8FB8A8", { dash: "dash", noEnd: true, w: 1.5 });
  s.addShape(pres.shapes.OVAL, { x: 8.22, y: 2.85, w: 0.22, h: 0.22, fill: { color: "8FD3FF" }, line: { color: H.white, width: 1.5 } });
  T(s, [{ text: "Espagne", options: { bold: true, color: C.background1, breakLine: true } }, { text: "origine du groupe", options: { color: C.accent4 } }], { x: 8.55, y: 2.72, w: 2.5, h: 0.6, fontSize: 13 });
  s.addShape(pres.shapes.OVAL, { x: 8.2, y: 4.52, w: 0.42, h: 0.42, fill: { color: H.red }, line: { color: H.white, width: 2 }, objectName: "tanger" });
  T(s, [{ text: "Tanger", options: { bold: true, color: "FF8A8A", breakLine: true } }, { text: "Zone Franche · Tanger Med · Automotive City", options: { color: C.accent4 } }], { x: 8.0, y: 4.98, w: 4.0, h: 0.5, fontSize: 12 });
  s.addShape(pres.shapes.OVAL, { x: 11.1, y: 4.44, w: 0.22, h: 0.22, fill: { color: "8FD3FF" }, line: { color: H.white, width: 1.5 } });
  T(s, [{ text: "Tunisie", options: { bold: true, color: C.background1, breakLine: true } }, { text: "depuis 2014", options: { color: C.accent4 } }], { x: 11.38, y: 4.32, w: 1.3, h: 0.55, fontSize: 12 });
  T(s, "Carte schématique, non à l'échelle", { x: 7.4, y: 6.15, w: 4, h: 0.28, fontSize: 10, italic: true, color: C.accent4 });
  ANIM[4] = P(1);
  notes(s, "SJL est un groupe d'origine espagnole, spécialisé dans le transport international de marchandises et la logistique. Il est très présent au Maroc, notamment à Tanger, et relie l'Europe et l'Afrique du Nord, jusqu'en Tunisie depuis 2014.\n\n[clic] Ses clients sont surtout industriels : automobile, textile, agroalimentaire et biens de consommation.");

  // ===== 5 HISTORIQUE =====
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Présentation de SJL" });
  head(s, "PARTIE 2 · PRÉSENTATION DE SJL", "Historique et évolution"); progress(s, 2);
  s.addShape(pres.shapes.LINE, { x: MX, y: 3.95, w: CW, h: 0, line: { color: H.green3, width: 3 }, objectName: "!!tl" });
  const hist = [["1948", "Création de Transportes Internacionales San José"], ["1949", "Création de Transportes López"], ["1986", "Début de l'activité au Maroc via Tremsa"], ["2002", "Fusion : naissance du groupe SJL"], ["2005", "Installation dans la Zone Franche de Tanger"], ["2012", "Lancement des activités logistiques à Tanger Med"], ["2014", "Développement en Tunisie"], ["2019", "Plateforme logistique à Tanger Automotive City"]];
  const step = CW / 8;
  for (let i = 0; i < 8; i++) {
    const cx = MX + step * (i + 0.5), up = i % 2 === 0, g = `anim${Math.floor(i / 2) + 1}_`, key = i === 3;
    s.addShape(pres.shapes.OVAL, { x: cx - 0.15, y: 3.8, w: 0.3, h: 0.3, fill: { color: key ? H.red : H.green }, line: { color: H.white, width: 2.5 }, objectName: g + "dot" + i });
    s.addShape(pres.shapes.LINE, { x: cx, y: up ? 3.2 : 4.1, w: 0, h: 0.6, line: { color: H.mute, width: 1 }, objectName: g + "stem" + i });
    T(s, hist[i][0], { x: cx - 0.9, y: up ? 1.85 : 4.75, w: 1.8, h: 0.5, fontSize: 24, bold: true, color: key ? C.accent1 : C.text1, align: "center", fontFace: "Arial", objectName: g + "y" + i });
    T(s, hist[i][1], { x: cx - 0.85, y: up ? 2.35 : 5.25, w: 1.7, h: 0.85, fontSize: 13, align: "center", objectName: g + "d" + i });
  }
  card(s, 2.6, 6.05, 8.13, 0.5, H.green, "anim5_tag", { r: 0.25 });
  T(s, "D'un transporteur international à un prestataire de solutions supply chain intégrées", { x: 2.6, y: 6.05, w: 8.13, h: 0.5, fontSize: 14, bold: true, italic: true, color: C.background1, align: "center", valign: "middle", objectName: "anim5_tagT" });
  ANIM[5] = P(5);
  src(s, "Sources : sjl-group.com (History) ; notre présentation.");
  notes(s, "L'histoire de SJL commence en Espagne. [clic] En 1948 et 1949, deux transporteurs sont créés : San José et López. [clic] En 1986, l'activité démarre au Maroc, et en 2002 les deux sociétés fusionnent : c'est la naissance de SJL. [clic] En 2005, installation dans la zone franche de Tanger, puis en 2012 à Tanger Med. [clic] En 2014, développement en Tunisie et en 2019, nouvelle plateforme à Tanger Automotive City. [clic] SJL est passé du simple transport à des solutions supply chain complètes.");

  // ===== 6 PLATEFORMES =====
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Présentation de SJL" });
  head(s, "PARTIE 2 · PRÉSENTATION DE SJL", "Trois plateformes logistiques à Tanger"); progress(s, 2, true);
  await photo(s, "s5.jpg", MX, 1.8, 5.8, 4.75, { name: "!!sidePhoto", pos: "right", alt: "Flotte SJL" });
  T(s, "Photo : SJL Group", { x: MX + 0.15, y: 6.2, w: 2, h: 0.25, fontSize: 10, color: C.background1 });
  const sites = [["10 000 m²", "Tanger Automotive City", "Au plus près des usines automobiles"], ["7 500 m²", "Tanger Med (zone portuaire)", "Accès direct aux flux d'import-export"], ["1 900 m²", "MEAD – Tanger Free Zone", "Zone franche, agents des douanes sur place"]];
  for (let i = 0; i < 3; i++) {
    const y = 1.8 + i * 1.62, g = `anim${i + 1}_`;
    card(s, 6.75, y, 5.98, 1.45, H.green2, g + "c", { tr: 5 });
    await tile(s, 6.95, y + 0.3, 0.85, ["FaIndustry", "FaShip", "FaWarehouse"][i], i === 0 ? "red" : "green", g + "i");
    T(s, sites[i][0].replace(/ /g, " "), { x: 8.0, y: y + 0.15, w: 2.4, h: 0.65, fontSize: 28, bold: true, color: C.accent1, fontFace: "Arial", objectName: g + "n" });
    T(s, [{ text: sites[i][1], options: { bold: true, color: C.background1, breakLine: true } }, { text: sites[i][2], options: { color: C.accent4 } }], { x: 8.0, y: y + 0.78, w: 4.6, h: 0.6, fontSize: 14, objectName: g + "t" });
  }
  ANIM[6] = P(3);
  src(s, "Source : sjl-group.com, page « Centres logistiques ».", true);
  notes(s, "À Tanger, SJL dispose de trois plateformes. [clic] Tanger Automotive City, 10 000 mètres carrés, près des usines automobiles. [clic] Tanger Med, 7 500 mètres carrés, avec un accès direct au port. [clic] Et la zone franche MEAD, 1 900 mètres carrés, avec des agents des douanes sur place.");

  // ===== 7 SERVICES =====
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Présentation de SJL" });
  head(s, "PARTIE 2 · PRÉSENTATION DE SJL", "Positionnement et services de SJL"); progress(s, 2);
  const svc = [["FaTruckFast", "Transport international et national", ["Transport routier de marchandises", "Maroc ↔ Europe", "Chargements complets et partiels"]], ["FaFileSignature", "Transit et opérations douanières", ["Expéditions nationales et internationales", "Optimisation des opérations douanières", "Gestion des retours"]], ["FaBoxesPacking", "Préparation et conditionnement", ["Étiquetage (labeling)", "Emballage (packaging)", "Contrôle de la qualité"]], ["FaWarehouse", "Entreposage et gestion des stocks", ["Réception et stockage", "Gestion et suivi des stocks", "Préparation des commandes"]]];
  for (let i = 0; i < 4; i++) {
    const x = MX + i * 3.08, g = `anim${i + 1}_`;
    card(s, x, 1.8, 2.9, 4.7, i % 2 ? H.white : H.white, g + "c", { shadow: true, line: H.line });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.8, w: 2.9, h: 1.25, fill: { color: i % 2 ? H.green : H.red }, line: { color: i % 2 ? H.green : H.red, width: 0 }, objectName: g + "band" });
    await tile(s, x + 1.0, 2.15, 0.9, svc[i][0], "white", g + "i");
    T(s, svc[i][1], { x: x + 0.2, y: 3.25, w: 2.5, h: 0.75, fontSize: 16, bold: true, color: C.text1, objectName: g + "t" });
    T(s, svc[i][2].map((b, k) => ({ text: b, options: { bullet: { indent: 14 }, breakLine: k < 2 } })), { x: x + 0.2, y: 4.1, w: 2.55, h: 2.2, fontSize: 14, paraSpaceAfter: 6, objectName: g + "d" });
  }
  ANIM[7] = P(4);
  notes(s, "SJL propose quatre familles de services. [clic] Le transport international et national, en chargement complet ou partiel. [clic] Le transit et les opérations douanières. [clic] La préparation et le conditionnement : étiquetage, emballage, contrôle qualité. [clic] Et l'entreposage avec la gestion des stocks et la préparation des commandes.");

  // ===== 8 LOGISTIQUE / 5B =====
  SEC("La logistique de SJL");
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "La logistique de SJL" });
  head(s, "PARTIE 3 · LA LOGISTIQUE DE SJL", "Qu'est-ce que la logistique ?"); progress(s, 3, true);
  card(s, MX, 1.8, 6.0, 1.7, H.red, "def", { shadow: true });
  T(s, "DÉFINITION", { x: MX + 0.3, y: 1.92, w: 3, h: 0.3, fontSize: 12, bold: true, color: "FFD6D6", charSpacing: 3 });
  T(s, "Ensemble des activités qui planifient, mettent en œuvre et contrôlent les flux, du fournisseur jusqu'au client final.", { x: MX + 0.3, y: 2.25, w: 5.45, h: 1.15, fontSize: 18, bold: true, color: C.background1 });
  const flx = [["FaBoxesStacked", "Flux physiques", "red"], ["FaDatabase", "Flux d'information", "green"], ["FaCoins", "Flux financiers", "green"]];
  for (let i = 0; i < 3; i++) {
    const x = MX + i * 2.05, g = "anim1_";
    card(s, x, 3.7, 1.9, 1.35, H.green2, g + "f" + i);
    await tile(s, x + 0.65, 3.82, 0.6, flx[i][0], flx[i][2], g + "fi" + i);
    T(s, flx[i][1], { x, y: 4.5, w: 1.9, h: 0.4, fontSize: 14, bold: true, color: C.background1, align: "center", objectName: g + "ft" + i });
  }
  card(s, MX, 5.25, 6.0, 1.25, H.green2, "anim2_obj", { tr: 10 });
  T(s, [{ text: "Objectifs : ", options: { bold: true, color: C.accent1 } }, { text: "réduire les coûts · améliorer la qualité de service · optimiser les stocks · réduire les délais · gagner en fiabilité et traçabilité" }], { x: MX + 0.25, y: 5.25, w: 5.5, h: 1.25, fontSize: 14, color: C.background1, valign: "middle", objectName: "anim2_objT" });
  const cx5 = 9.95, cy5 = 4.3, r5 = 1.8;
  const b5 = [["Bon produit", H.white, C.text1], ["Bonne quantité", H.red, C.background1], ["Bon endroit", H.green3, C.background1], ["Bon moment", H.green2, C.background1], ["Meilleur coût et service", H.green3, C.background1]];
  for (let i = 0; i < 5; i++) {
    const a = (-90 + i * 72) * Math.PI / 180, x = cx5 + r5 * Math.cos(a), y = cy5 + r5 * Math.sin(a);
    arrow(s, cx5, cy5, x, y, "6FA8D0", { noEnd: true, w: 1.5, name: "anim3_l" + i });
  }
  s.addShape(pres.shapes.OVAL, { x: cx5 - 0.95, y: cy5 - 0.95, w: 1.9, h: 1.9, fill: { color: "0A2E23" }, line: { color: H.red, width: 3 }, shadow: shadow(), objectName: "anim3_hub" });
  T(s, "Règle des 5 B", { x: cx5 - 0.9, y: cy5 - 0.4, w: 1.8, h: 0.8, fontSize: 18, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "anim3_hubT" });
  for (let i = 0; i < 5; i++) {
    const a = (-90 + i * 72) * Math.PI / 180, x = cx5 + r5 * Math.cos(a), y = cy5 + r5 * Math.sin(a), g = "anim3_";
    s.addShape(pres.shapes.OVAL, { x: x - 0.68, y: y - 0.68, w: 1.36, h: 1.36, fill: { color: b5[i][1] }, line: { color: H.white, width: 1.5 }, shadow: shadow(), objectName: g + "b" + i });
    T(s, b5[i][0], { x: x - 0.62, y: y - 0.5, w: 1.24, h: 1.0, fontSize: 13, bold: true, color: b5[i][2], align: "center", valign: "middle", objectName: g + "bt" + i });
  }
  ANIM[8] = P(3);
  notes(s, "La logistique, c'est l'ensemble des activités qui planifient, mettent en œuvre et contrôlent les flux, du fournisseur jusqu'au client final.\n\n[clic] Elle gère trois flux : physiques, d'information et financiers. [clic] Ses objectifs : réduire les coûts et les délais, améliorer le service, optimiser les stocks, gagner en traçabilité. [clic] On les résume avec la règle des 5 B : le bon produit, en bonne quantité, au bon endroit, au bon moment, au meilleur coût.");

  // ===== 9 PROCESSUS =====
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "La logistique de SJL" });
  head(s, "PARTIE 3 · LA LOGISTIQUE DE SJL", "Les étapes du processus logistique"); progress(s, 3);
  const proc = [["FaChartLine", "Prévision et planification de la demande"], ["FaHandshake", "Approvisionnement", "choix des fournisseurs, achats"], ["FaClipboardCheck", "Réception et contrôle des marchandises"], ["FaBoxesStacked", "Stockage et gestion des stocks"], ["FaBoxOpen", "Préparation des commandes", "picking, emballage"], ["FaTruck", "Transport et distribution"], ["FaLocationDot", "Livraison au client"], ["FaRotate", "Service après-vente et logistique inverse", "retours"]];
  const pw = 2.82, pg = (CW - 4 * pw) / 3;
  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4), col = row === 0 ? i % 4 : 3 - (i % 4), x = MX + col * (pw + pg), y = row === 0 ? 1.85 : 4.3, g = `anim${row + 1}_`;
    card(s, x, y, pw, 2.05, row === 0 ? H.white : H.white, g + "c" + i, { shadow: true, line: H.line });
    T(s, String(i + 1), { x: x + 0.2, y: y + 0.15, w: 0.5, h: 0.5, fontSize: 24, bold: true, color: row === 0 ? C.accent1 : C.accent2, fontFace: "Arial", objectName: g + "n" + i });
    await tile(s, x + pw - 0.85, y + 0.15, 0.65, proc[i][0], row === 0 ? "red" : "green", g + "i" + i);
    T(s, proc[i][1], { x: x + 0.2, y: y + 0.85, w: pw - 0.4, h: 0.7, fontSize: 15, bold: true, color: C.text1, objectName: g + "t" + i });
    if (proc[i][2]) T(s, proc[i][2], { x: x + 0.2, y: y + 1.55, w: pw - 0.4, h: 0.35, fontSize: 13, italic: true, objectName: g + "d" + i });
    if (i % 4 < 3) { const ax = row === 0 ? x + pw + pg / 2 - 0.09 : x - pg / 2 - 0.09; s.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: ax, y: y + 0.93, w: 0.18, h: 0.18, rotate: row === 0 ? 90 : 270, fill: { color: H.red }, line: { color: H.red, width: 0 }, objectName: g + "ar" + i }); }
  }
  arrow(s, R - pw / 2, 3.9, R - pw / 2, 4.3, H.red, { name: "anim2_turn", w: 2 });
  ANIM[9] = P(2);
  notes(s, "Le processus logistique suit huit étapes. [clic] D'abord la prévision de la demande, l'approvisionnement, la réception et le contrôle, puis le stockage. [clic] Ensuite la préparation des commandes, le transport, la livraison, et enfin le service après-vente avec la gestion des retours. Chaque étape produit des informations utiles à la suivante.");

  // ===== 10 ACTEURS =====
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "La logistique de SJL" });
  head(s, "PARTIE 3 · LA LOGISTIQUE DE SJL", "Les acteurs et services impliqués"); progress(s, 3);
  card(s, 4.92, 1.75, 3.5, 0.9, H.green, "dg", { shadow: true });
  T(s, [{ text: "Direction générale", options: { bold: true, fontSize: 17, breakLine: true } }, { text: "Stratégie et supervision", options: { color: C.accent4 } }], { x: 4.92, y: 1.75, w: 3.5, h: 0.9, fontSize: 13, color: C.background1, align: "center", valign: "middle" });
  const act = [["FaHandshake", "Service commercial", "Relation client et besoins"], ["FaGears", "Service exploitation", "Coordination des opérations"], ["FaRoute", "Service transport", "Suivi des moyens de transport"], ["FaBoxesStacked", "Service logistique", "Gestion des flux physiques"], ["FaFileLines", "Service administratif", "Traitement documentaire"], ["FaIdCard", "Chauffeurs et livreurs", "Transport physique et livraison"]];
  const aw = 1.93, ag = (CW - 6 * aw) / 5;
  s.addShape(pres.shapes.LINE, { x: MX + aw / 2, y: 2.95, w: CW - aw, h: 0, line: { color: H.green3, width: 1.5 }, objectName: "bus" });
  s.addShape(pres.shapes.LINE, { x: W / 2, y: 2.65, w: 0, h: 0.3, line: { color: H.green3, width: 1.5 }, objectName: "busV" });
  for (let i = 0; i < 6; i++) {
    const x = MX + i * (aw + ag), g = `anim${Math.floor(i / 2) + 1}_`;
    s.addShape(pres.shapes.LINE, { x: x + aw / 2, y: 2.95, w: 0, h: 0.3, line: { color: H.green3, width: 1.5 }, objectName: g + "v" + i });
    card(s, x, 3.25, aw, 2.15, H.white, g + "c" + i, { shadow: true, line: H.line });
    await tile(s, x + aw / 2 - 0.35, 3.4, 0.7, act[i][0], i === 5 ? "red" : "green", g + "i" + i);
    T(s, act[i][1], { x: x + 0.1, y: 4.15, w: aw - 0.2, h: 0.55, fontSize: 14, bold: true, color: C.text1, align: "center", objectName: g + "t" + i });
    T(s, act[i][2], { x: x + 0.1, y: 4.7, w: aw - 0.2, h: 0.6, fontSize: 13, align: "center", objectName: g + "d" + i });
  }
  card(s, MX, 5.7, CW, 0.8, H.white, "anim4_p", { line: H.green3, dash: "dash", lw: 1.25 });
  await tile(s, MX + 0.2, 5.8, 0.6, "FaUsers", "red", "anim4_pi");
  T(s, [{ text: "Clients et partenaires  ", options: { bold: true, color: C.text1 } }, { text: "clients (commandes, réception) · fournisseurs · partenaires de transport · partenaires douaniers" }], { x: MX + 1.0, y: 5.7, w: 10.9, h: 0.8, fontSize: 14, valign: "middle", objectName: "anim4_pt" });
  ANIM[10] = P(4);
  notes(s, "Plusieurs acteurs interviennent sur une même commande, sous l'autorité de la direction générale. [clic] Le service commercial et l'exploitation. [clic] Le transport et la logistique. [clic] L'administratif et les chauffeurs. [clic] Sans oublier les clients et les partenaires externes, comme les transitaires en douane. Plus il y a d'acteurs, plus la coordination est importante.");

  // ===== 11 DIFFICULTÉS (photo bg) =====
  s = pres.addSlide({ masterName: "PHOTO", sectionTitle: "La logistique de SJL" });
  await photo(s, "s23.jpg", 0, 0, W, 7.5, { name: "!!bgPhoto", veil: 0.62, alt: "Conteneurs empilés" });
  head(s, "PARTIE 3 · LA LOGISTIQUE DE SJL", "Les principales difficultés logistiques"); progress(s, 3, true);
  const dif = [["FaClock", "Retards de livraison"], ["FaSitemap", "Difficultés de coordination entre les services"], ["FaEyeSlash", "Manque de visibilité sur les marchandises en transit"], ["FaCommentSlash", "Problèmes de communication et de circulation de l'information"], ["FaTriangleExclamation", "Gestion des imprévus et des coûts de transport"], ["FaChartLine", "Difficultés liées au suivi des performances"]];
  for (let i = 0; i < 6; i++) {
    const x = MX + (i % 3) * 4.1, y = 1.85 + Math.floor(i / 3) * 2.0, g = `anim${Math.floor(i / 3) + 1}_`;
    card(s, x, y, 3.93, 1.8, H.white, g + "c" + i, { tr: 6, shadow: true });
    await tile(s, x + 0.25, y + 0.25, 0.7, dif[i][0], "amber", g + "i" + i);
    T(s, "0" + (i + 1), { x: x + 2.9, y: y + 0.2, w: 0.8, h: 0.55, fontSize: 26, bold: true, color: C.accent2, align: "right", fontFace: "Arial", objectName: g + "n" + i });
    T(s, dif[i][1], { x: x + 0.25, y: y + 1.0, w: 3.45, h: 0.7, fontSize: 15, bold: true, color: C.text1, objectName: g + "t" + i });
  }
  T(s, "Ces difficultés sont précisément celles auxquelles la digitalisation cherche à répondre.", { x: MX, y: 6.05, w: CW, h: 0.45, fontSize: 16, italic: true, bold: true, color: "FFB4B4", objectName: "anim3_note" });
  ANIM[11] = P(3);
  notes(s, "Un transporteur international fait face à six grandes difficultés. [clic] Les retards, la coordination entre services et le manque de visibilité en transit. [clic] Les problèmes de communication, la gestion des imprévus et des coûts, et le suivi des performances. [clic] Ce sont précisément ces difficultés que la digitalisation cherche à résoudre.");

  // ===== 12 DIGITALISATION vs TRANSFORMATION =====
  SEC("Digitalisation");
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Digitalisation" });
  head(s, "PARTIE 4 · DIGITALISATION ET SOCLE TECHNOLOGIQUE", "Digitalisation et transformation digitale"); progress(s, 4);
  card(s, MX, 1.85, 5.6, 3.0, H.white, "anim1_c", { shadow: true, line: H.line });
  await tile(s, MX + 0.3, 2.1, 0.85, "FaDesktop", "green", "anim1_i");
  T(s, [{ text: "Digitalisation", options: { bold: true, fontSize: 22, color: C.text1, breakLine: true } }, { text: "OPÉRATIONS ET INFORMATIONS", options: { fontSize: 11, bold: true, color: C.accent1, charSpacing: 2 } }], { x: MX + 1.35, y: 2.1, w: 4, h: 0.9, objectName: "anim1_t" });
  T(s, "Utiliser les technologies numériques pour convertir, traiter et gérer des informations et des opérations sous forme numérique.", { x: MX + 0.3, y: 3.2, w: 5.0, h: 1.4, fontSize: 16, objectName: "anim1_d" });
  s.addShape(pres.shapes.OVAL, { x: 6.27, y: 2.95, w: 0.8, h: 0.8, fill: { color: H.red }, line: { color: H.white, width: 2 }, shadow: shadow(), objectName: "anim2_arrowC" });
  T(s, "→", { x: 6.27, y: 2.95, w: 0.8, h: 0.8, fontSize: 26, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "anim2_arrowT" });
  card(s, 7.13, 1.85, 5.6, 3.0, H.green, "anim2_c", { shadow: true });
  await tile(s, 7.43, 2.1, 0.85, "FaRotate", "red", "anim2_i");
  T(s, [{ text: "Transformation digitale", options: { bold: true, fontSize: 22, color: C.background1, breakLine: true } }, { text: "ENSEMBLE DE L'ENTREPRISE", options: { fontSize: 11, bold: true, color: "FF8A8A", charSpacing: 2 } }], { x: 8.48, y: 2.1, w: 4.1, h: 0.9, objectName: "anim2_t" });
  T(s, "Processus plus large : intégrer le numérique dans toute l'entreprise pour transformer méthodes de travail, processus et parfois même le modèle économique.", { x: 7.43, y: 3.2, w: 5.0, h: 1.5, fontSize: 16, color: C.background1, objectName: "anim2_d" });
  card(s, MX, 5.15, CW, 1.35, "E3ECE8", "anim3_b");
  T(s, "DANS LA LOGISTIQUE", { x: MX + 0.3, y: 5.27, w: 4, h: 0.3, fontSize: 12, bold: true, color: C.accent1, charSpacing: 3, objectName: "anim3_k" });
  T(s, "Suivi des marchandises en temps réel  ·  automatisation de certaines opérations  ·  meilleure gestion des stocks  ·  communication facilitée entre acteurs", { x: MX + 0.3, y: 5.6, w: 11.5, h: 0.75, fontSize: 16, bold: true, color: C.text1, objectName: "anim3_t" });
  ANIM[12] = P(3);
  notes(s, "Attention à ne pas confondre deux notions. [clic] La digitalisation : utiliser le numérique pour traiter les informations et les opérations. [clic] La transformation digitale : un changement plus large, qui touche toute l'entreprise, ses méthodes et parfois son modèle économique. [clic] En logistique, cela donne : suivi en temps réel, automatisation, meilleure gestion des stocks et communication facilitée.");

  // ===== 13 AVANT / APRÈS =====
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Digitalisation" });
  head(s, "PARTIE 4 · DIGITALISATION ET SOCLE TECHNOLOGIQUE", "Avant / après la digitalisation"); progress(s, 4);
  T(s, "A V A N T", { x: MX, y: 1.7, w: 5, h: 0.45, fontSize: 22, bold: true, color: C.text2 });
  T(s, "A P R È S", { x: 7.83, y: 1.7, w: 5, h: 0.45, fontSize: 22, bold: true, color: C.accent1 });
  const ba = [["FaFileLines", "Documents papier", "FaDesktop", "Documents numériques"], ["FaClipboardList", "Suivi manuel des stocks", "FaDatabase", "Stocks informatisés"], ["FaPhone", "Communication par téléphone", "FaWifi", "Communication connectée"], ["FaPen", "Traitement manuel des commandes", "FaGears", "Automatisation de certaines tâches"], ["FaEyeSlash", "Visibilité limitée", "FaLocationDot", "Suivi et traçabilité améliorés"]];
  for (let i = 0; i < 5; i++) {
    const y = 2.3 + i * 0.8, g = `anim${i + 1}_`;
    card(s, MX, y, 4.9, 0.65, "E6ECE9", g + "a");
    await tile(s, MX + 0.12, y + 0.08, 0.5, ba[i][0], "white", g + "ai");
    T(s, ba[i][1], { x: MX + 0.8, y, w: 4, h: 0.65, fontSize: 15, valign: "middle", objectName: g + "at" });
    s.addShape(pres.shapes.OVAL, { x: 6.42, y: y + 0.1, w: 0.45, h: 0.45, fill: { color: H.red }, line: { color: H.red, width: 0 }, objectName: g + "o" });
    T(s, "›", { x: 6.42, y: y + 0.07, w: 0.45, h: 0.45, fontSize: 20, bold: true, color: C.background1, align: "center", valign: "middle", objectName: g + "ot" });
    card(s, 7.83, y, 4.9, 0.65, H.green, g + "b", { shadow: true });
    await tile(s, 7.95, y + 0.08, 0.5, ba[i][2], "red", g + "bi");
    T(s, ba[i][3], { x: 8.63, y, w: 4, h: 0.65, fontSize: 15, bold: true, color: C.background1, valign: "middle", objectName: g + "bt" });
  }
  T(s, "D'une gestion principalement manuelle à une gestion connectée, automatisée et fondée sur les données", { x: MX, y: 6.4, w: CW, h: 0.4, fontSize: 15, bold: true, italic: true, color: C.text1, align: "center" });
  ANIM[13] = P(5);
  notes(s, "Comparons avant et après. [clic] Les documents papier deviennent numériques. [clic] Le suivi manuel des stocks devient informatisé. [clic] Le téléphone laisse la place à une communication connectée. [clic] Le traitement manuel des commandes est en partie automatisé. [clic] Et la visibilité limitée devient un suivi en temps réel. On passe d'une gestion manuelle à une gestion fondée sur les données.");

  // ===== 14 SOCLE (hub) =====
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Digitalisation" });
  head(s, "PARTIE 4 · DIGITALISATION ET SOCLE TECHNOLOGIQUE", "Le socle technologique moderne"); progress(s, 4, true);
  const hx = W / 2, hy = 4.35;
  const socle = [["FaCloud", "Cloud computing", "Stockage et accès aux données à distance, via Internet", 0, -2.0, "c"], ["FaDatabase", "Big Data et Data Analytics", "Analyse de grandes quantités de données pour décider", 3.0, -0.6, "r"], ["FaMicrochip", "Internet des objets (IoT)", "Objets connectés qui collectent et transmettent des informations", 2.3, 1.55, "r"], ["FaBrain", "Intelligence artificielle", "Prévisions et aide à l'optimisation des opérations", -2.3, 1.55, "l"], ["FaShieldHalved", "Cybersécurité", "Protection des systèmes, des données et des échanges", -3.0, -0.6, "l"]];
  socle.forEach(([, , , dx, dy], i) => arrow(s, hx, hy, hx + dx, hy + dy, "6FA8D0", { noEnd: true, w: 1.5, name: `anim${i + 1}_l` }));
  s.addShape(pres.shapes.OVAL, { x: hx - 1.05, y: hy - 1.05, w: 2.1, h: 2.1, fill: { color: H.green3 }, line: { color: H.red, width: 3 }, shadow: shadow(), objectName: "hub" });
  T(s, "SOCLE TECHNO-LOGIQUE", { x: hx - 0.95, y: hy - 0.5, w: 1.9, h: 1.0, fontSize: 15, bold: true, color: C.background1, align: "center", valign: "middle" });
  for (let i = 0; i < 5; i++) {
    const [ic, t, d, dx, dy, side] = socle[i], x = hx + dx, y = hy + dy, g = `anim${i + 1}_`;
    await tile(s, x - 0.45, y - 0.45, 0.9, ic, i % 2 ? "green" : "red", g + "i");
    const tx = side === "r" ? x + 0.55 : side === "l" ? x - 3.1 : x + 0.55, ty = side === "c" ? y - 0.45 : y - 0.4;
    T(s, [{ text: t, options: { bold: true, fontSize: 16, color: C.background1, breakLine: true } }, { text: d, options: { color: C.accent4 } }], { x: tx, y: ty, w: 2.5, h: 1.1, fontSize: 13, align: side === "l" ? "right" : "left", objectName: g + "t" });
  }
  ANIM[14] = P(5);
  notes(s, "La digitalisation repose sur un socle de cinq technologies. [clic] Le cloud, pour accéder aux données partout. [clic] Le Big Data, pour analyser de grandes quantités de données. [clic] L'Internet des objets, des capteurs connectés. [clic] L'intelligence artificielle, pour prévoir et optimiser. [clic] Et la cybersécurité, qui protège l'ensemble.");

  // ===== 15 TECHNOLOGIES APPLIQUÉES =====
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Digitalisation" });
  head(s, "PARTIE 4 · DIGITALISATION ET SOCLE TECHNOLOGIQUE", "Les technologies appliquées à la logistique"); progress(s, 4);
  const tech = [["FaLocationDot", "GPS", "Localisation des véhicules et suivi des trajets"], ["FaMicrochip", "IoT", "Surveillance des marchandises et des conditions de transport"], ["FaBarcode", "Codes-barres / RFID", "Identification et traçabilité des marchandises"], ["FaCloud", "Cloud", "Partage et accès aux informations logistiques"], ["FaWarehouse", "WMS", "Gestion des entrepôts et des stocks ; emplacements organisés selon l'analyse ABC"], ["FaRoute", "TMS", "Planification et suivi du transport, itinéraires optimisés en temps réel"], ["FaBrain", "Intelligence artificielle", "Prévision de la demande et optimisation des itinéraires"]];
  for (let i = 0; i < 7; i++) {
    const top = i < 4, w = top ? 2.9 : 3.93, x = top ? MX + i * 3.08 : MX + (i - 4) * 4.1, y = top ? 1.8 : 4.25, g = `anim${top ? 1 : 2}_`;
    card(s, x, y, w, 2.2, top ? H.white : H.green, g + "c" + i, { shadow: true, line: top ? H.line : undefined });
    await tile(s, x + 0.22, y + 0.22, 0.7, tech[i][0], top ? "green" : "red", g + "i" + i);
    T(s, tech[i][1], { x: x + 1.1, y: y + 0.22, w: w - 1.25, h: 0.7, fontSize: 18, bold: true, color: top ? C.text1 : C.background1, valign: "middle", objectName: g + "t" + i });
    T(s, tech[i][2], { x: x + 0.22, y: y + 1.05, w: w - 0.44, h: 1.05, fontSize: 14, color: top ? C.text2 : C.accent4, objectName: g + "d" + i });
  }
  ANIM[15] = P(2);
  notes(s, "Concrètement, quels outils ? [clic] Le GPS localise les véhicules, l'IoT surveille les conditions de transport, les codes-barres et la RFID identifient les marchandises, le cloud partage l'information. [clic] Le WMS gère l'entrepôt, le TMS gère le transport, et l'IA aide à prévoir la demande et optimiser les itinéraires.");

  // ===== 16 PARCOURS DIGITAL =====
  s = pres.addSlide({ masterName: "PHOTO", sectionTitle: "Digitalisation" });
  await photo(s, "s23.jpg", 0, 0, W, 7.5, { name: "!!bgPhoto", veil: 0.8, alt: "Conteneurs" });
  head(s, "PARTIE 4 · DIGITALISATION ET SOCLE TECHNOLOGIQUE", "Le parcours digital d'une commande"); progress(s, 4, true);
  s.addShape(pres.shapes.LINE, { x: 1.4, y: 4.0, w: 10.5, h: 0, line: { color: "6FC3E0", width: 2.5, dashType: "dash" }, objectName: "track" });
  const par = [["FaClipboardList", "Enregistrement de la commande", ""], ["FaWarehouse", "Le WMS localise le produit dans l'entrepôt", "WMS"], ["FaRoute", "Le TMS organise le transport", "TMS"], ["FaLocationDot", "Le GPS permet de suivre le véhicule", "GPS"], ["FaCircleCheck", "Les informations de livraison sont communiquées au client", ""]];
  for (let i = 0; i < 5; i++) {
    const cx = 1.4 + i * 2.625, g = `anim${i + 1}_`;
    if (par[i][2]) pill(s, cx - 0.5, 2.5, 1.0, par[i][2], H.amber, H.green, g + "tag", 12);
    s.addShape(pres.shapes.OVAL, { x: cx - 0.65, y: 3.35, w: 1.3, h: 1.3, fill: { color: "0A2E23" }, line: { color: "6FC3E0", width: 3 }, objectName: g + "o" });
    await tile(s, cx - 0.42, 3.58, 0.84, par[i][0], i === 4 ? "red" : "green", g + "i");
    T(s, String(i + 1), { x: cx - 0.4, y: 4.8, w: 0.8, h: 0.45, fontSize: 22, bold: true, color: C.accent6, align: "center", fontFace: "Arial", objectName: g + "n" });
    T(s, par[i][1], { x: cx - 1.2, y: 5.25, w: 2.4, h: 0.95, fontSize: 14, bold: true, color: C.background1, align: "center", objectName: g + "t" });
  }
  await tile(s, 2.45, 2.95, 0.5, "FaTruck", "amber", "!!truckTile");
  T(s, "De l'entrepôt au client : une information continue à chaque étape", { x: MX, y: 6.35, w: CW, h: 0.4, fontSize: 15, italic: true, color: "9FDCF0", align: "center" });
  ANIM[16] = P(5);
  notes(s, "Suivons une commande. [clic] Elle est d'abord enregistrée. [clic] Le WMS localise le produit dans l'entrepôt. [clic] Le TMS organise le transport. [clic] Le GPS permet de suivre le véhicule. [clic] Et le client reçoit les informations de livraison. Résultat : une information continue, de l'entrepôt jusqu'au client.");

  // ===== 17 DIGITALISATION CHEZ SJL =====
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Digitalisation" });
  head(s, "PARTIE 4 · DIGITALISATION ET SOCLE TECHNOLOGIQUE", "La digitalisation chez SJL"); progress(s, 4);
  pill(s, 9.5, 1.0, 3.2, "✓ OUTILS ANNONCÉS PAR SJL", H.ok, H.white, "okPill");
  const sjl = [["FaWarehouse", "WMS", "Gestion des entrepôts et des stocks"], ["FaRoute", "TMS", "Pilotage des opérations et des flux de marchandises ; gestion et suivi du transport"], ["FaLaptop", "Informatique embarquée", "Équipements numériques intégrés aux véhicules pour suivre et piloter les flux en temps réel"], ["FaChartPie", "Reporting et tableaux de bord", "Suivi des performances logistiques"]];
  for (let i = 0; i < 4; i++) {
    const x = MX + (i % 2) * 6.16, y = 1.8 + Math.floor(i / 2) * 1.75, g = `anim${i + 1}_`;
    card(s, x, y, 5.97, 1.55, H.white, g + "c", { shadow: true, line: H.line });
    await tile(s, x + 0.25, y + 0.32, 0.9, sjl[i][0], i % 3 === 0 ? "green" : "red", g + "i");
    T(s, [{ text: sjl[i][1], options: { bold: true, fontSize: 19, color: C.text1, breakLine: true } }, { text: sjl[i][2] }], { x: x + 1.35, y: y + 0.2, w: 4.45, h: 1.2, fontSize: 14, objectName: g + "t" });
  }
  card(s, MX, 5.4, CW, 0.75, H.green, "anim5_b", { shadow: true });
  T(s, [{ text: "Selon SJL : ", options: { bold: true, color: "FF8A8A" } }, { text: "un suivi des opérations plus fiable et de meilleurs échanges avec les clients — avec, en plus, le suivi GPS et la géolocalisation des envois." }], { x: MX + 0.3, y: 5.4, w: 11.6, h: 0.75, fontSize: 15, color: C.background1, valign: "middle", objectName: "anim5_t" });
  ANIM[17] = P(5);
  src(s, "Sources : documentation officielle de SJL (sjl-group.com, plateforme SJL Tanger Med). Les autres technologies (RFID, IoT, IA, cloud) sont des applications générales du secteur.");
  notes(s, "Et chez SJL, concrètement ? Selon sa documentation officielle, le groupe utilise quatre outils. [clic] Un WMS pour les entrepôts et les stocks. [clic] Un TMS pour piloter le transport. [clic] Une informatique embarquée dans les véhicules. [clic] Et des outils de reporting et tableaux de bord. [clic] SJL annonce aussi le suivi GPS des envois. Résultat selon SJL : un suivi plus fiable et de meilleurs échanges avec les clients.\n\nAttention : les autres technologies comme l'IoT ou l'IA sont générales au secteur, pas confirmées chez SJL.");

  // ===== 18 IMPACTS =====
  SEC("Impact");
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Impact" });
  head(s, "PARTIE 5 · IMPACT SUR LA PERFORMANCE", "Les impacts de la digitalisation"); progress(s, 5, true);
  const imp = [["FaGears", "Performance opérationnelle", "ERP · WMS · TMS · IoT", ["Temps de transit réduits", "Espace de stockage optimisé", "Précommandes traitées automatiquement"], "red"], ["FaCoins", "Performance financière", "IA prédictive · Big Data", ["Baisse du BFR (moins de stock immobilisé)", "Économies de carburant", "Moins de pénalités de retard"], "green"], ["FaFaceSmile", "Qualité et satisfaction client", "Portails clients SaaS · blockchain", ["Traçabilité de bout en bout", "Moins d'erreurs d'expédition (OTIF)", "Satisfaction client (NPS)"], "green"], ["FaLeaf", "Stratégique et RSE", "Jumeaux numériques · cloud", ["Pilotage préventif des ruptures", "Reporting carbone (logistique verte)", "Agilité face aux chocs de marché"], "red"]];
  for (let i = 0; i < 4; i++) {
    const x = MX + (i % 2) * 6.16, y = 1.8 + Math.floor(i / 2) * 2.38, g = `anim${i + 1}_`;
    card(s, x, y, 5.97, 2.2, H.green2, g + "c", { tr: 5 });
    await tile(s, x + 0.25, y + 0.3, 0.95, imp[i][0], imp[i][4], g + "i");
    T(s, [{ text: imp[i][1], options: { bold: true, fontSize: 18, color: C.background1, breakLine: true } }, { text: imp[i][2], options: { italic: true, color: C.accent4, fontSize: 12 } }], { x: x + 1.4, y: y + 0.2, w: 4.4, h: 0.75, objectName: g + "t" });
    T(s, imp[i][3].map((b, k) => ({ text: b, options: { bullet: { indent: 14 }, breakLine: k < 2 } })), { x: x + 1.4, y: y + 1.0, w: 4.4, h: 1.1, fontSize: 14, color: C.background1, paraSpaceAfter: 3, objectName: g + "d" });
  }
  ANIM[18] = P(4);
  src(s, "Leviers technologiques généraux du secteur ; leur mise en œuvre précise chez SJL n'est pas publiée.", true);
  notes(s, "La digitalisation agit sur quatre dimensions. [clic] Opérationnelle : des transits plus courts et des stocks mieux organisés. [clic] Financière : moins de stock immobilisé, moins de carburant, moins de pénalités. [clic] Qualité : une traçabilité complète et moins d'erreurs. [clic] Stratégique et RSE : anticiper les ruptures et mesurer l'empreinte carbone.");

  // ===== 19 KPI =====
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Impact" });
  head(s, "PARTIE 5 · IMPACT SUR LA PERFORMANCE", "Les leviers technologiques et les KPI"); progress(s, 5);
  const lev = [["FaBarsStaggered", "Fluidification des flux", "Le WMS réduit les déplacements en entrepôt, le TMS diminue le taux de retour à vide et l'IoT garantit la traçabilité des cargaisons sensibles."], ["FaDiagramProject", "Décisions pilotées par la donnée", "Les algorithmes prédictifs anticipent la demande et ajustent les stocks tampons, évitant surstockage et ruptures."]];
  for (let i = 0; i < 2; i++) {
    const y = 1.8 + i * 2.4, g = "anim1_";
    card(s, MX, y, 5.6, 2.2, H.white, g + "c" + i, { shadow: true, line: H.line });
    await tile(s, MX + 0.25, y + 0.25, 0.75, lev[i][0], "green", g + "i" + i);
    T(s, lev[i][1], { x: MX + 1.2, y: y + 0.25, w: 4.2, h: 0.75, fontSize: 18, bold: true, color: C.text1, valign: "middle", objectName: g + "t" + i });
    T(s, lev[i][2], { x: MX + 0.25, y: y + 1.1, w: 5.1, h: 1.0, fontSize: 14, objectName: g + "d" + i });
  }
  card(s, 6.5, 1.8, 6.23, 4.6, H.green, "dash", { shadow: true });
  T(s, "TABLEAU DE BORD LOGISTIQUE", { x: 6.8, y: 1.95, w: 5, h: 0.3, fontSize: 12, bold: true, color: "FF8A8A", charSpacing: 3 });
  const kpi = [["FaBullseye", "OTIF", "On Time In Full : taux de livraisons complètes et à l'heure"], ["FaStopwatch", "Lead time", "Temps global d'exécution de la commande"], ["FaRotate", "Rotation des stocks", "Rythme de renouvellement des stocks"]];
  for (let i = 0; i < 3; i++) {
    const y = 2.4 + i * 1.22, g = `anim${i + 2}_`;
    card(s, 6.75, y, 5.73, 1.05, H.green2, g + "c");
    await tile(s, 6.95, y + 0.15, 0.75, kpi[i][0], "red", g + "i");
    T(s, [{ text: kpi[i][1], options: { bold: true, fontSize: 20, color: C.background1, breakLine: true } }, { text: kpi[i][2], options: { color: C.accent4 } }], { x: 7.9, y: y + 0.08, w: 4.45, h: 0.9, fontSize: 13, objectName: g + "t" });
  }
  T(s, "Valeurs non communiquées publiquement par SJL.", { x: 6.8, y: 6.05, w: 5.6, h: 0.28, fontSize: 11, italic: true, color: C.accent4 });
  ANIM[19] = P(4);
  notes(s, "[clic] Deux grands leviers : la fluidification des flux grâce au WMS, au TMS et à l'IoT, et des décisions pilotées par la donnée.\n\nPour mesurer la performance, on suit trois indicateurs. [clic] L'OTIF : le taux de livraisons complètes et à l'heure. [clic] Le lead time : le temps total d'une commande. [clic] La rotation des stocks. SJL ne publie pas ses valeurs.");

  // ===== 20 SWOT =====
  SEC("Analyse stratégique");
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Analyse stratégique" });
  head(s, "PARTIE 6 · ANALYSE STRATÉGIQUE ET PERSPECTIVES", "Analyse SWOT de la digitalisation"); progress(s, 6);
  const sw = [["F", "FORCES (internes)", ["Outils structurants : WMS et TMS", "Traçabilité en temps réel (GPS, informatique embarquée)", "Culture de la donnée : pilotage des KPI"], H.green, H.white], ["W", "FAIBLESSES (internes)", ["Dette technique : systèmes anciens et cloud coexistent", "Coûts d'investissement élevés (automatisation)", "Adoption terrain : compétences inégales"], H.red, H.white], ["O", "OPPORTUNITÉS (externes)", ["Logistique verte : optimisation carbone (RSE)", "IA prédictive : demande et stocks anticipés", "Portails écosystème : échanges fluidifiés"], H.green3, H.white], ["T", "MENACES (externes)", ["Cyber-risques : flux de données partagés", "Acteurs disruptifs 100 % digitaux", "Chocs supply chain : instabilités géopolitiques"], "A61B1B", H.white]];
  for (let i = 0; i < 4; i++) {
    const x = MX + (i % 2) * 6.16, y = 1.8 + Math.floor(i / 2) * 2.38, g = `anim${i + 1}_`;
    card(s, x, y, 5.97, 2.2, sw[i][3], g + "c", { shadow: true });
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.22, w: 0.7, h: 0.7, fill: { color: H.white }, line: { color: H.white, width: 0 }, objectName: g + "o" });
    T(s, sw[i][0], { x: x + 0.25, y: y + 0.22, w: 0.7, h: 0.7, fontSize: 24, bold: true, color: C.text1, align: "center", valign: "middle", fontFace: "Arial", objectName: g + "l" });
    T(s, sw[i][1], { x: x + 1.15, y: y + 0.22, w: 4.6, h: 0.7, fontSize: 18, bold: true, color: C.background1, valign: "middle", objectName: g + "t" });
    T(s, sw[i][2].map((b, k) => ({ text: b, options: { bullet: { indent: 14 }, breakLine: k < 2 } })), { x: x + 0.3, y: y + 1.05, w: 5.45, h: 1.1, fontSize: 14, color: C.background1, paraSpaceAfter: 3, objectName: g + "d" });
  }
  ANIM[20] = P(4);
  notes(s, "Voici notre analyse SWOT. [clic] Forces : des outils structurants et une traçabilité en temps réel. [clic] Faiblesses : la coexistence d'anciens et de nouveaux systèmes, les coûts, et des compétences inégales. [clic] Opportunités : la logistique verte, l'IA prédictive et les portails partagés. [clic] Menaces : les cyber-risques, de nouveaux acteurs 100 % digitaux et les crises internationales.");

  // ===== 21 TOWS =====
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Analyse stratégique" });
  head(s, "PARTIE 6 · ANALYSE STRATÉGIQUE ET PERSPECTIVES", "Analyse stratégique TOWS"); progress(s, 6);
  T(s, "O P P O R T U N I T É S", { x: 1.9, y: 1.65, w: 5.3, h: 0.4, fontSize: 16, bold: true, color: C.accent3, align: "center" });
  T(s, "M E N A C E S", { x: 7.4, y: 1.65, w: 5.3, h: 0.4, fontSize: 16, bold: true, color: C.accent1, align: "center" });
  card(s, MX, 2.15, 1.15, 2.05, H.green, "rowF"); T(s, "FORCES", { x: MX + 0.575 - 1.025, y: 2.15 + 1.025 - 0.575, w: 2.05, h: 1.15, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", rotate: 270 });
  card(s, MX, 4.4, 1.15, 2.05, H.red, "rowW"); T(s, "FAIBLESSES", { x: MX + 0.575 - 1.025, y: 4.4 + 1.025 - 0.575, w: 2.05, h: 1.15, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", rotate: 270 });
  const tows = [["FaLeaf", "Différenciation par la donnée RSE", "Exploiter les données du TMS pour une offre bas-carbone, traçable et certifiée destinée aux grands comptes.", H.green3, true], ["FaShieldHalved", "Sécurisation et résilience", "Architecture « Zero Trust » sur les données de suivi et du TMS pour résister aux cyberattaques.", H.green, true], ["FaPlug", "Modernisation par API", "Remplacer progressivement les briques anciennes par des services cloud interconnectés : fin des silos.", "E3ECE8", false], ["FaUserGraduate", "Conduite du changement", "Programmes de montée en compétences (upskilling) pour lever les retards liés à la maîtrise des outils.", H.white, false]];
  for (let i = 0; i < 4; i++) {
    const x = 1.9 + (i % 2) * 5.5, y = 2.15 + Math.floor(i / 2) * 2.25, g = `anim${i + 1}_`, dk = tows[i][4];
    card(s, x, y, 5.33, 2.05, tows[i][3], g + "c", { shadow: true, line: dk ? undefined : H.line });
    await tile(s, x + 0.25, y + 0.25, 0.7, tows[i][0], dk ? "red" : "green", g + "i");
    T(s, tows[i][1], { x: x + 1.15, y: y + 0.25, w: 4.0, h: 0.7, fontSize: 17, bold: true, color: dk ? C.background1 : C.text1, valign: "middle", objectName: g + "t" });
    T(s, tows[i][2], { x: x + 0.25, y: y + 1.05, w: 4.85, h: 0.95, fontSize: 14, color: dk ? C.accent4 : C.text2, objectName: g + "d" });
  }
  ANIM[21] = P(4);
  notes(s, "La matrice TOWS croise le SWOT pour en tirer des stratégies. [clic] Forces et opportunités : se différencier avec une offre bas-carbone traçable. [clic] Forces et menaces : sécuriser les données. [clic] Faiblesses et opportunités : moderniser les systèmes avec des API. [clic] Faiblesses et menaces : former les équipes.");

  // ===== 22 DÉFIS (photo bg) =====
  s = pres.addSlide({ masterName: "PHOTO", sectionTitle: "Analyse stratégique" });
  await photo(s, "s28.jpg", 0, 0, W, 7.5, { name: "!!bgPhoto", veil: 0.55, grey: true, alt: "Porte-conteneurs à quai" });
  head(s, "PARTIE 6 · ANALYSE STRATÉGIQUE ET PERSPECTIVES", "Les obstacles et défis"); progress(s, 6, true);
  card(s, MX, 1.8, 3.9, 4.7, H.green, "defP", { shadow: true });
  await tile(s, MX + 1.35, 2.5, 1.2, "FaFlagCheckered", "red", "defI");
  T(s, "Les défis de la transformation digitale", { x: MX + 0.3, y: 3.95, w: 3.3, h: 1.4, fontSize: 22, bold: true, color: C.background1, align: "center", valign: "middle" });
  const def = [["FaPuzzlePiece", "Intégration des systèmes informatiques", "Coexistence de systèmes anciens et cloud (dette technique)"], ["FaCoins", "Investissements technologiques", "Budget initial élevé pour l'automatisation"], ["FaUsers", "Adoption des outils par les équipes", "Inégalités de compétences digitales"], ["FaLock", "Protection des données", "Cyber-risques liés aux flux de données partagés"], ["FaGraduationCap", "Évolution des compétences", "Montée en compétences et Académie Digitale SJL"]];
  for (let i = 0; i < 5; i++) {
    const y = 1.8 + i * 0.96, g = `anim${i + 1}_`;
    card(s, 4.75, y, 7.98, 0.82, H.white, g + "c", { tr: 4, shadow: true });
    await tile(s, 4.9, y + 0.11, 0.6, def[i][0], "red", g + "i");
    T(s, [{ text: def[i][1], options: { bold: true, fontSize: 16, color: C.text1, breakLine: true } }, { text: def[i][2] }], { x: 5.7, y: y + 0.06, w: 6.9, h: 0.72, fontSize: 13, valign: "middle", objectName: g + "t" });
  }
  ANIM[22] = P(5);
  notes(s, "La digitalisation rencontre cinq défis. [clic] Intégrer les anciens et les nouveaux systèmes. [clic] Financer les investissements. [clic] Faire adopter les outils par les équipes. [clic] Protéger les données. [clic] Et faire évoluer les compétences.");

  // ===== 23 RECOMMANDATIONS =====
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Analyse stratégique" });
  head(s, "PARTIE 6 · ANALYSE STRATÉGIQUE ET PERSPECTIVES", "Nos recommandations prioritaires"); progress(s, 6);
  const rec = [["FaNetworkWired", "Interopérabilité (API et cloud)", "Une couche d'échange par API pour connecter WMS et TMS aux ERP des clients et supprimer toute saisie manuelle."], ["FaShieldHalved", "Gouvernance data et cybersécurité", "Politique Zero Trust, tests d'intrusion réguliers et formation de 100 % des équipes au risque cyber."], ["FaGraduationCap", "Conduite du changement et UX", "Créer une « Académie Digitale SJL » et rendre les interfaces mobiles plus simples en entrepôt."], ["FaLeaf", "IA et logistique éco-responsable", "Algorithmes d'itinéraires et d'optimisation du remplissage pour réduire l'empreinte carbone."]];
  for (let i = 0; i < 4; i++) {
    const x = MX + i * 3.08, g = `anim${i + 1}_`;
    card(s, x, 1.8, 2.9, 4.65, i % 2 ? H.green : H.red, g + "c", { shadow: true });
    T(s, "0" + (i + 1), { x: x + 0.25, y: 2.0, w: 1.2, h: 0.7, fontSize: 34, bold: true, color: C.background1, fontFace: "Arial", objectName: g + "n" });
    await tile(s, x + 1.9, 1.98, 0.8, rec[i][0], "white", g + "i");
    T(s, rec[i][1], { x: x + 0.25, y: 3.0, w: 2.45, h: 0.85, fontSize: 17, bold: true, color: C.background1, objectName: g + "t" });
    T(s, rec[i][2], { x: x + 0.25, y: 3.95, w: 2.45, h: 2.35, fontSize: 14, color: C.background1, objectName: g + "d" });
  }
  ANIM[23] = P(4);
  src(s, "Propositions du groupe d'étudiants, fondées sur notre analyse : ce ne sont pas des projets annoncés par SJL.");
  notes(s, "Voici nos quatre recommandations, ce sont nos propositions. [clic] Un : connecter les outils de SJL aux systèmes des clients grâce aux API, pour supprimer les saisies manuelles. [clic] Deux : renforcer la sécurité des données et former toutes les équipes. [clic] Trois : créer une Académie Digitale SJL et simplifier les interfaces. [clic] Quatre : utiliser l'IA pour optimiser les trajets et réduire l'empreinte carbone.");

  // ===== 24 CONCLUSION =====
  SEC("Conclusion");
  s = pres.addSlide({ masterName: "PHOTO", sectionTitle: "Conclusion" });
  await photo(s, "trucks2.jpg", 0, 0, W, 7.5, { name: "!!bgPhoto", veil: 0.72, alt: "Camions SJL" });
  head(s, "PARTIE 7 · CONCLUSION GÉNÉRALE", "Conclusion et réponse à la problématique"); progress(s, 7, true);
  const cc = [["Suivi et traçabilité des marchandises", "Un suivi en temps réel répond au manque de visibilité sur les marchandises en transit."], ["Coordination entre les services", "Des outils connectés (WMS, TMS, reporting) fluidifient la circulation de l'information."], ["Délais et performance logistique", "Flux fluidifiés, décisions pilotées par la donnée, KPI suivis : OTIF et lead time."]];
  for (let i = 0; i < 3; i++) {
    const y = 1.85 + i * 1.1, g = `anim${i + 1}_`;
    card(s, MX, y, CW, 0.95, H.green2, g + "c", { tr: 8, line: "5FB8A0" });
    s.addShape(pres.shapes.OVAL, { x: MX + 0.2, y: y + 0.15, w: 0.65, h: 0.65, fill: { color: H.red }, line: { color: H.white, width: 1.5 }, objectName: g + "o" });
    T(s, "✓", { x: MX + 0.2, y: y + 0.15, w: 0.65, h: 0.65, fontSize: 20, bold: true, color: C.background1, align: "center", valign: "middle", objectName: g + "k" });
    T(s, [{ text: cc[i][0], options: { bold: true, fontSize: 17, color: C.background1, breakLine: true } }, { text: cc[i][1], options: { color: C.accent4 } }], { x: MX + 1.1, y: y + 0.08, w: 10.8, h: 0.8, fontSize: 14, valign: "middle", objectName: g + "t" });
  }
  card(s, MX, 5.35, CW, 1.15, H.red, "anim4_b", { shadow: true });
  T(s, "La digitalisation : un levier stratégique de compétitivité et d'amélioration continue pour SJL", { x: MX + 0.4, y: 5.35, w: 11.3, h: 1.15, fontSize: 22, bold: true, color: C.background1, valign: "middle", objectName: "anim4_t" });
  ANIM[24] = P(4);
  notes(s, "Pour répondre à notre problématique : [clic] le suivi en temps réel règle le manque de visibilité. [clic] Les outils connectés améliorent la coordination entre services. [clic] Et le pilotage par les données et les KPI réduit les délais. [clic] La digitalisation est donc un vrai levier de compétitivité pour SJL.");

  // ===== 25 PERSPECTIVES =====
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Conclusion" });
  head(s, "PARTIE 7 · CONCLUSION GÉNÉRALE", "Perspectives et ouverture"); progress(s, 7, true);
  const per = [["FaLink", "Une supply chain davantage connectée", "Interopérabilité API et cloud"], ["FaDatabase", "Une meilleure exploitation des données", "Big Data Analytics, gouvernance data"], ["FaBrain", "Une logistique plus intelligente", "IA prédictive, optimisation des itinéraires"], ["FaLeaf", "Une approche plus durable", "Logistique verte, reporting carbone"]];
  for (let i = 0; i < 4; i++) {
    const x = MX + i * 3.08, g = `anim${i + 1}_`;
    card(s, x, 1.85, 2.9, 3.6, i % 2 ? H.green2 : "8E1C1C", g + "c", { shadow: true, tr: 5 });
    await tile(s, x + 0.95, 2.1, 1.0, per[i][0], i % 2 ? "red" : "green", g + "i");
    T(s, per[i][1], { x: x + 0.2, y: 3.3, w: 2.5, h: 1.05, fontSize: 17, bold: true, color: C.background1, align: "center", valign: "middle", objectName: g + "t" });
    T(s, per[i][2], { x: x + 0.2, y: 4.4, w: 2.5, h: 0.85, fontSize: 14, color: C.accent4, align: "center", objectName: g + "d" });
  }
  card(s, MX, 5.75, CW, 0.75, H.red, "anim5_b", { shadow: true });
  T(s, "Vers un réseau logistique international connecté", { x: MX, y: 5.75, w: CW, h: 0.75, fontSize: 20, bold: true, italic: true, color: C.background1, align: "center", valign: "middle", objectName: "anim5_t" });
  ANIM[25] = P(5);
  notes(s, "Et demain ? Quatre perspectives. [clic] Une supply chain plus connectée. [clic] Une meilleure exploitation des données. [clic] Une logistique plus intelligente grâce à l'IA. [clic] Une approche plus durable. [clic] En résumé : vers un réseau logistique international connecté.");

  // ===== 26 MERCI =====
  s = pres.addSlide({ masterName: "COVER", sectionTitle: "Conclusion" });
  await photo(s, "s35.jpg", 0, 0, W, 7.5, { name: "!!hero", alt: "Camion SJL avec le message Merci pour votre attention" });
  pill(s, 0.6, 0.55, 2.4, "QUESTIONS ?", H.red, H.white, "qPill", 14);
  notes(s, "Merci pour votre attention. Nous sommes prêts à répondre à vos questions.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await addMotion(OUT, { transitions: Object.fromEntries(Array.from({ length: 26 }, (_, i) => [i + 1, "morph"])), anim: ANIM });
  console.log("written", OUT);
})();
