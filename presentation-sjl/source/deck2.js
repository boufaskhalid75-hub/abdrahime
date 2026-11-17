// SJL Group – 20-slide redesign
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fs = require("fs");
const fa = require("react-icons/fa6");
const { applyTheme } = require(process.env.SKILL + "/scripts/apply_theme.js");
const { addMotion } = require("./motion.js");

const OUT = "SJL_Digitalisation_Logistique_v2.pptx";
const THEME = {
  name: "SJL Logistique Premium", headFontFace: "Arial", bodyFontFace: "Calibri",
  colors: { dk1: "10243A", lt1: "FFFFFF", dk2: "4A5A6E", lt2: "F3F5F7", accent1: "F28C28", accent2: "10243A", accent3: "1B3A5C", accent4: "C5CFDB", accent5: "2E8B57", accent6: "D64545", hlink: "1B3A5C", folHlink: "6B7A90" },
};
const H = { navy: "10243A", navy2: "1B3A5C", orange: "F28C28", white: "FFFFFF", grey: "F3F5F7", line: "D5DCE5", green: "2E8B57", mute: "C5CFDB" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "La digitalisation de la fonction logistique au sein de SJL Group";
pres.subject = "ENCG – Module Digital Skills";
pres.author = "Étudiants ENCG – 1re année";
const C = pres.SchemeColor;
const W = 13.333, MX = 0.6, CW = W - 2 * MX, R = W - MX;
fs.mkdirSync("crop", { recursive: true });

// ---------- 3D icon tiles ----------
const TILE = {
  orange: { a: "#FFB466", b: "#E06D12", ic: "#FFFFFF" },
  navy: { a: "#2F5683", b: "#0C1C2F", ic: "#FFFFFF" },
  white: { a: "#FFFFFF", b: "#DCE3EC", ic: "#10243A" },
  green: { a: "#4CB97E", b: "#21704A", ic: "#FFFFFF" },
};
const tileCache = {};
async function tilePng(icon, style) {
  const k = icon + style;
  if (tileCache[k]) return tileCache[k];
  const t = TILE[style];
  const inner = RDS.renderToStaticMarkup(React.createElement(fa[icon], { color: t.ic, size: 120 }))
    .replace(/ (width|height)="[^"]*"/g, "").replace(/^<svg/, '<svg x="68" y="62" width="120" height="120"');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient>
  <linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dy="9"/><feComponentTransfer><feFuncA type="linear" slope=".35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="i" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/><feOffset dy="4"/><feComponentTransfer><feFuncA type="linear" slope=".3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <g filter="url(#s)"><rect x="18" y="12" width="220" height="220" rx="58" fill="url(#g)"/></g>
  <rect x="30" y="20" width="196" height="96" rx="46" fill="url(#h)"/>
  <rect x="18.5" y="12.5" width="219" height="219" rx="57.5" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
  <g filter="url(#i)">${inner}</g></svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return (tileCache[k] = "image/png;base64," + buf.toString("base64"));
}
async function tile(s, x, y, d, icon, style, name) {
  s.addImage({ data: await tilePng(icon, style), x, y, w: d, h: d, objectName: name || "tile", altText: "" });
}

// ---------- photos (pre-cropped to the exact frame) ----------
let cropN = 0;
async function photo(s, id, x, y, w, h, o = {}) {
  const f = `crop/${id}_${++cropN}.jpg`;
  const pxW = Math.round(w * 200), pxH = Math.round(h * 200);
  let im = sharp(`ph/${id}.jpg`); if (o.dim) im = im.modulate({ brightness: o.dim });
  let buf = await im.resize(pxW, pxH, { fit: "cover", position: o.pos || "centre" }).toBuffer();
  if (o.grad) {
    const g = `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#10243A" stop-opacity=".96"/><stop offset=".42" stop-color="#10243A" stop-opacity=".88"/><stop offset=".72" stop-color="#10243A" stop-opacity=".15"/><stop offset="1" stop-color="#10243A" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#a)"/></svg>`;
    buf = await sharp(buf).composite([{ input: Buffer.from(g) }]).toBuffer();
  }
  await sharp(buf).jpeg({ quality: 84 }).toFile(f);
  s.addImage({ path: f, x, y, w, h, objectName: o.name || "photo", altText: o.alt || "" });
  if (o.caption !== false) {
    const cw = o.capW || 2.15;
    const cy = o.capTop ? y + 0.12 : y + h - 0.42;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: cy, w: cw, h: 0.3, rectRadius: 0.15, fill: { color: H.navy, transparency: 25 }, line: { color: H.navy, width: 0 }, objectName: (o.name || "photo") + "_capbg" });
    T(s, o.capText || "Photo d'illustration · Pexels", { x: x + 0.12, y: cy, w: cw, h: 0.3, fontSize: 10, color: C.background1, align: "center", valign: "middle", objectName: (o.name || "photo") + "_cap" });
  }
}

// ---------- layouts ----------
function frame(name, bg, dark) {
  pres.defineSlideMaster({
    title: name, background: { color: bg },
    objects: [
      { placeholder: { options: { name: "kicker", type: "body", x: MX, y: 0.34, w: 9, h: 0.32, fontSize: 12, bold: true, color: C.accent1, charSpacing: 3, margin: 0, valign: "middle" }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.68, w: CW, h: 0.82, fontSize: 34, bold: true, color: dark ? C.background1 : C.text1, margin: 0, valign: "middle", align: "left" }, text: "" } },
      { text: { text: "SJL Group  ·  Digitalisation de la fonction logistique", options: { x: MX, y: 7.03, w: 8, h: 0.28, fontSize: 10, color: dark ? C.accent4 : C.text2, margin: 0 } } },
    ],
    slideNumber: { x: 12.23, y: 7.03, w: 0.5, h: 0.28, fontSize: 10, bold: true, color: C.accent1, align: "right", margin: 0 },
  });
}
frame("CONTENT_LIGHT", H.white, false);
frame("CONTENT_GREY", H.grey, false);
frame("CONTENT_DARK", H.navy, true);
pres.defineSlideMaster({ title: "COVER", background: { color: H.navy }, objects: [] });

// ---------- helpers ----------
function T(s, text, o) { s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontSize: 14, color: C.text2, valign: "top" }, o)); }
const shadow = () => ({ type: "outer", color: "10243A", opacity: 0.12, blur: 10, offset: 3, angle: 90 });
function card(s, x, y, w, h, fill, name, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: o.r ?? 0.1, fill: { color: fill, transparency: o.tr || 0 }, line: o.line ? { color: o.line, width: o.lw || 1, dashType: o.dash || "solid" } : { color: fill, width: 0 }, shadow: o.shadow ? shadow() : undefined, objectName: name || "card" });
}
function head(s, k, t) { s.addText(k, { placeholder: "kicker" }); s.addText(t, { placeholder: "title" }); }
function src(s, text, dark) { T(s, text, { x: MX, y: 6.68, w: CW, h: 0.26, fontSize: 10, italic: true, color: dark ? C.accent4 : C.text2, objectName: "source" }); }
const BADGE = { ok: ["✓ CONFIRMÉ CHEZ SJL", H.green, H.white], gen: ["TECHNOLOGIE GÉNÉRALE DU SECTEUR", "DCE3EC", H.navy], pot: ["◇ POTENTIEL · NON CONFIRMÉ CHEZ SJL", H.orange, H.white], ill: ["SCÉNARIO PÉDAGOGIQUE", H.orange, H.white] };
function badge(s, x, y, kind, w, name) {
  const [t, bg, fg] = BADGE[kind];
  w = w || (t.length * 0.085 + 0.35);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.32, rectRadius: 0.16, fill: { color: bg }, line: { color: bg, width: 0 }, objectName: (name || "badge") + "_bg" });
  T(s, t, { x, y, w, h: 0.32, fontSize: 11, bold: true, color: fg, align: "center", valign: "middle", charSpacing: 1, objectName: (name || "badge") + "_t" });
  return w;
}
function arrow(s, x1, y1, x2, y2, color, o = {}) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1, line: { color, width: o.w || 2, dashType: o.dash || "solid", endArrowType: o.noEnd ? undefined : "triangle", beginArrowType: o.both ? "triangle" : undefined }, objectName: o.name || "arrow" });
}
const notes = (s, t) => s.addNotes(t);

(async () => {
  let s;
  // ============ 1. COVER ============
  pres.addSection({ title: "Ouverture" });
  s = pres.addSlide({ masterName: "COVER", sectionTitle: "Ouverture" });
  await photo(s, "18446790", 0, 0, W, 7.5, { name: "!!truckPhoto", caption: false, pos: "right", grad: true, alt: "Camion semi-remorque blanc roulant sur une autoroute au coucher du soleil (photo d'illustration)" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 0.8, w: 3.35, h: 0.4, rectRadius: 0.2, fill: { color: H.orange }, line: { color: H.orange, width: 0 }, objectName: "coverBadge" });
  T(s, "ÉTUDE DE CAS · SJL GROUP", { x: 0.75, y: 0.8, w: 3.35, h: 0.4, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle", charSpacing: 2, objectName: "coverBadgeTxt" });
  T(s, "La digitalisation de la fonction logistique au sein de SJL Group", { x: 0.75, y: 1.45, w: 6.7, h: 2.55, fontSize: 40, bold: true, color: C.background1, fontFace: "Arial", valign: "bottom", objectName: "!!mainTitle" });
  T(s, "Évolution des méthodes de travail, technologies utilisées et perspectives de l'intelligence artificielle", { x: 0.75, y: 4.2, w: 6.3, h: 0.95, fontSize: 18, color: C.accent4 });
  T(s, [
    { text: "ENCG  ·  Module Digital Skills  ·  1re année", options: { bold: true, color: C.accent1, breakLine: true } },
    { text: "Réalisé par : [Noms des étudiants]", options: { breakLine: true } },
    { text: "Encadré par : [Nom de l'enseignant(e)]", options: { breakLine: true } },
    { text: "Année universitaire 2026 – 2027" },
  ], { x: 0.75, y: 5.45, w: 6.3, h: 1.35, fontSize: 14, color: C.background1, paraSpaceAfter: 3 });
  T(s, "Photo d'illustration · Pexels", { x: 10.9, y: 7.08, w: 2.2, h: 0.25, fontSize: 10, color: C.background1, align: "right" });
  notes(s, "Bonjour à toutes et à tous. Notre présentation porte sur la digitalisation de la fonction logistique au sein de SJL Group, un groupe de transport international et de logistique dont le siège est à Tanger.\n\nNous verrons comment les méthodes de travail ont évolué, quelles technologies sont utilisées, et ce que l'intelligence artificielle pourrait apporter demain.\n\nLa photo est une photo d'illustration : elle ne montre pas un camion de SJL.\n\n(À compléter : noms des étudiants et de l'enseignant.)");

  // ============ 2. INTRODUCTION ============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Ouverture" });
  head(s, "INTRODUCTION", "Contexte et objectifs");
  T(s, "Contexte", { x: MX, y: 1.75, w: 6, h: 0.38, fontSize: 20, bold: true, color: C.text1, fontFace: "Arial" });
  const ctx = [["FaEarthEurope", "Les échanges Europe – Afrique exigent des transports rapides et fiables."], ["FaMobileScreen", "Les clients veulent suivre leurs marchandises en temps réel."], ["FaLaptopCode", "Le numérique change la façon de planifier, de suivre et de décider."]];
  for (let i = 0; i < 3; i++) {
    const y = 2.25 + i * 0.7;
    await tile(s, MX, y, 0.58, ctx[i][0], i === 0 ? "orange" : "navy", "ctxT" + i);
    T(s, ctx[i][1], { x: MX + 0.78, y, w: 5.5, h: 0.58, fontSize: 15, valign: "middle" });
  }
  T(s, "Nos objectifs", { x: MX, y: 4.45, w: 6, h: 0.38, fontSize: 20, bold: true, color: C.text1, fontFace: "Arial" });
  const obj = ["Comprendre le rôle de la logistique", "Présenter SJL Group et ses activités", "Analyser ses outils numériques", "Explorer le potentiel de l'IA"];
  for (let i = 0; i < 4; i++) {
    const x = MX + (i % 2) * 3.13, y = 4.95 + Math.floor(i / 2) * 0.8;
    card(s, x, y, 3.0, 0.7, H.grey, "obj" + i);
    T(s, String(i + 1).padStart(2, "0"), { x: x + 0.18, y, w: 0.5, h: 0.7, fontSize: 18, bold: true, color: C.accent1, valign: "middle", fontFace: "Arial" });
    T(s, obj[i], { x: x + 0.7, y, w: 2.2, h: 0.7, fontSize: 14, bold: true, color: C.text1, valign: "middle" });
  }
  await photo(s, "18446790", 7.25, 1.75, 5.48, 4.75, { name: "!!truckPhoto", pos: "right", alt: "Camion semi-remorque sur autoroute (photo d'illustration)" });
  notes(s, "Le commerce entre l'Europe et l'Afrique du Nord repose largement sur le transport routier. Les clients attendent des livraisons rapides, fiables, et ils veulent savoir à tout moment où se trouve leur marchandise.\n\nDans ce contexte, le numérique devient indispensable pour planifier, suivre et décider.\n\nNos quatre objectifs : comprendre le rôle de la logistique, présenter SJL Group, analyser ses outils numériques, puis explorer le potentiel de l'intelligence artificielle.");

  // ============ 3. PROBLEM STATEMENT ============
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Ouverture" });
  head(s, "PROBLÉMATIQUE", "La question centrale");
  await photo(s, "9831438", 8.2, 0, 5.133, 7.5, { name: "probPhoto", caption: false, pos: "centre", dim: 0.85, alt: "Vue aérienne d'un camion sur une route à travers la forêt (photo d'illustration)" });
  T(s, "Photo d'illustration · Pexels", { x: 10.6, y: 7.08, w: 2.5, h: 0.25, fontSize: 10, color: C.background1, align: "right" });
  card(s, MX, 1.8, 7.2, 1.85, H.navy2, "!!questionCard");
  T(s, "“", { x: MX + 0.25, y: 1.78, w: 0.6, h: 0.8, fontSize: 60, bold: true, color: C.accent1, fontFace: "Arial" });
  T(s, "Comment la digitalisation transforme-t-elle la fonction logistique de SJL Group, et quelle place l'intelligence artificielle peut-elle y occuper demain ?", { x: MX + 0.9, y: 2.0, w: 6.1, h: 1.5, fontSize: 20, bold: true, color: C.background1, valign: "middle" });
  const sq = [["FaClockRotateLeft", "Comment travaillait-on avant le numérique ?"], ["FaGears", "Quels outils numériques SJL utilise-t-elle ?"], ["FaBrain", "Que pourrait apporter l'IA demain ?"]];
  for (let i = 0; i < 3; i++) {
    const y = 3.95 + i * 0.68, g = `anim${i + 1}_`;
    await tile(s, MX, y, 0.55, sq[i][0], "orange", g + "t");
    T(s, sq[i][1], { x: MX + 0.75, y, w: 6.4, h: 0.55, fontSize: 16, color: C.background1, valign: "middle", objectName: g + "q" });
  }
  T(s, [{ text: "Méthode : ", options: { bold: true, color: C.accent1 } }, { text: "analyse de sources publiques (site et LinkedIn de SJL, Conseil de la concurrence, IBM, DHL)." }], { x: MX, y: 6.05, w: 7.2, h: 0.5, fontSize: 14, color: C.accent4, objectName: "anim4_m" });
  notes(s, "Notre problématique est la suivante : comment la digitalisation transforme-t-elle la fonction logistique de SJL Group, et quelle place l'intelligence artificielle peut-elle y occuper demain ?\n\n[clic] Pour y répondre, nous verrons d'abord comment on travaillait avant le numérique. [clic] Ensuite, quels outils numériques SJL utilise réellement, selon ses sources publiques. [clic] Enfin, ce que l'IA pourrait apporter.\n\n[clic] Notre méthode : nous avons analysé uniquement des sources publiques. Nous n'avons pas réalisé d'entretien avec l'entreprise.");

  // ============ 4. COMPANY OVERVIEW ============
  pres.addSection({ title: "SJL Group" });
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "SJL Group" });
  head(s, "PRÉSENTATION DE L'ENTREPRISE", "SJL Group : histoire et identité");
  const facts = [["FaLocationDot", "Siège", "Tanger, Maroc"], ["FaRoad", "Corridor", "Europe ↔ Afrique"], ["FaCar", "Secteur clé", "Industrie automobile"], ["FaFlag", "Liaisons", "Europe – Maroc – Tunisie"]];
  for (let i = 0; i < 4; i++) {
    const x = MX + (i % 2) * 3.12, y = 1.75 + Math.floor(i / 2) * 1.37;
    card(s, x, y, 2.98, 1.22, H.white, "fact" + i, { shadow: true });
    await tile(s, x + 0.2, y + 0.25, 0.7, facts[i][0], i === 0 ? "orange" : "navy", "factT" + i);
    T(s, facts[i][1], { x: x + 1.08, y: y + 0.22, w: 1.8, h: 0.3, fontSize: 12, bold: true, color: C.accent1, charSpacing: 1 });
    T(s, facts[i][2], { x: x + 1.08, y: y + 0.52, w: 1.8, h: 0.55, fontSize: 16, bold: true, color: C.text1 });
  }
  await photo(s, "12876900", 7.0, 1.75, 5.73, 2.59, { name: "companyPhoto", alt: "Rangée de tracteurs routiers européens stationnés (photo d'illustration)" });
  // horizontal timeline
  s.addShape(pres.shapes.LINE, { x: 0.9, y: 5.08, w: 11.5, h: 0, line: { color: H.mute, width: 2 }, objectName: "tlLine" });
  const tl = [["1948 – 1949", "Création en Espagne de Transportes San José et Transportes López"], ["1986", "Début de l'activité au Maroc (Tremsa, future SJL Maghreb)"], ["2002", "Fusion : naissance du Groupe San José & López (SJL)"], ["Aujourd'hui", "Siège à Tanger, transport et logistique Europe – Afrique"]];
  for (let i = 0; i < 4; i++) {
    const x = MX + i * 3.1, g = `anim${i + 1}_`;
    T(s, tl[i][0], { x, y: 4.6, w: 2.9, h: 0.36, fontSize: 18, bold: true, color: C.accent1, fontFace: "Arial", objectName: g + "y" });
    s.addShape(pres.shapes.OVAL, { x: x + 0.02, y: 4.96, w: 0.24, h: 0.24, fill: { color: i === 3 ? H.orange : H.navy }, line: { color: H.white, width: 2 }, objectName: g + "dot" });
    T(s, tl[i][1], { x, y: 5.35, w: 2.85, h: 1.0, fontSize: 14, objectName: g + "d" });
  }
  src(s, "Sources : sjl-group.com (Histoire) ; Mediterrania Capital Partners (2017) ; page LinkedIn SJL ; Conseil de la concurrence (communiqué SJL Maghreb SA).");
  notes(s, "SJL signifie Groupe San José & López. Ses racines sont espagnoles : deux transporteurs créés en 1948 et 1949.\n\n[clic] En 1986, l'activité démarre au Maroc avec Tremsa, qui deviendra SJL Maghreb. [clic] En 2002, les deux sociétés fusionnent. [clic] Aujourd'hui, le siège est à Tanger et le groupe relie l'Europe et l'Afrique, avec une forte présence dans le secteur automobile.\n\nÀ savoir : le Conseil de la concurrence a publié un communiqué sur un projet de rachat de SJL Maghreb SA par la société The Capital Global Services Fintech SL. Nous ne citons ni chiffre d'affaires ni taille de flotte, car ces chiffres ne sont pas publiés de façon vérifiable.\n\nLa photo est une illustration, pas la flotte de SJL.");

  // ============ 5. ACTIVITIES & SERVICES ============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "SJL Group" });
  head(s, "ACTIVITÉS", "Les activités et services logistiques de SJL");
  const svc = [
    ["9195241", "FaTruckFast", "Transport international", "Camions complets (FTL), groupage et transport express entre l'Europe et l'Afrique du Nord."],
    ["17229385", "FaWarehouse", "Logistique & entreposage", "Tanger Med (7\u00A0500\u00A0m²), Tanger Automotive City (10\u00A0000\u00A0m²) et zone franche MEAD–TFZ (1\u00A0900\u00A0m²)."],
    ["9775922", "FaFileSignature", "Transit & douane", "Prise en charge des formalités d'import-export et du régime de zone franche."],
    ["6169635", "FaRoute", "Transport national", "Transport domestique et distribution au Maroc."],
  ];
  for (let i = 0; i < 4; i++) {
    const x = MX + i * 3.08, g = `anim${i + 1}_`;
    card(s, x, 1.75, 2.9, 4.72, H.grey, g + "c");
    await photo(s, svc[i][0], x, 1.75, 2.9, 2.3, { name: g + "p", capW: 1.95, capText: "Illustration · Pexels", capTop: true });
    await tile(s, x + 0.2, 3.72, 0.66, svc[i][1], i === 1 ? "orange" : "navy", g + "t");
    T(s, svc[i][2], { x: x + 0.2, y: 4.5, w: 2.55, h: 0.4, fontSize: 16, bold: true, color: C.text1, objectName: g + "n" });
    T(s, svc[i][3], { x: x + 0.2, y: 4.95, w: 2.55, h: 1.45, fontSize: 14, objectName: g + "d" });
  }
  src(s, "Sources : sjl-group.com (Nos services ; Transport FTL ; Express transport ; Centres logistiques). Photos d'illustration : ne montrent pas les sites ni la flotte de SJL.");
  notes(s, "SJL propose quatre grandes familles de services.\n\n[clic] D'abord le transport international : en camion complet, appelé FTL, en groupage — plusieurs clients dans une même remorque — et en express.\n\n[clic] Ensuite la logistique et l'entreposage, avec des centres à Tanger Med, Tanger Automotive City et dans la zone franche de Tanger. Les surfaces sont celles indiquées sur le site de SJL.\n\n[clic] Troisièmement, le transit et la douane, indispensables pour passer d'un continent à l'autre.\n\n[clic] Enfin, le transport national et la distribution au Maroc.\n\nLes photos sont des illustrations : ce ne sont pas les entrepôts de SJL.");

  // ============ 6. ROLE OF LOGISTICS ============
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "SJL Group" });
  head(s, "LA FONCTION LOGISTIQUE", "La logistique, moteur de la performance");
  const nodes = [["FaIndustry", "Fournisseur", "usine, exportateur"], ["FaTruck", "Prestataire logistique", "ex. SJL : transport, stockage, douane"], ["FaBuilding", "Client", "usine, distributeur"]];
  for (let i = 0; i < 3; i++) {
    const x = MX + i * 4.22, mid = i === 1;
    card(s, x, 1.75, 3.7, 1.25, mid ? H.navy : H.white, "anim1_n" + i, { shadow: true });
    await tile(s, x + 0.2, 1.97, 0.8, nodes[i][0], mid ? "orange" : "navy", "anim1_t" + i);
    T(s, nodes[i][1], { x: x + 1.2, y: 1.95, w: 2.4, h: 0.4, fontSize: 17, bold: true, color: mid ? C.background1 : C.text1, objectName: "anim1_l" + i });
    T(s, nodes[i][2], { x: x + 1.2, y: 2.35, w: 2.4, h: 0.55, fontSize: 14, color: mid ? C.accent4 : C.text2, objectName: "anim1_s" + i });
  }
  const flows = [["Flux physique : les marchandises", H.orange, "solid", false, false], ["Flux d'information : commandes, statuts, documents", H.navy2, "dash", true, false], ["Flux financier : factures, paiements", "8A97A8", "solid", false, true]];
  for (let i = 0; i < 3; i++) {
    const y = 3.35 + i * 0.42, g = `anim${i + 2}_`;
    if (flows[i][4]) arrow(s, R, y + 0.15, 5.25, y + 0.15, flows[i][1], { w: 2.5, name: g + "a" });
    else arrow(s, 5.25, y + 0.15, R, y + 0.15, flows[i][1], { w: 2.5, dash: flows[i][2], both: flows[i][3], name: g + "a" });
    T(s, flows[i][0], { x: MX, y, w: 4.5, h: 0.3, fontSize: 14, bold: true, color: C.text1, valign: "middle", objectName: g + "l" });
  }
  const pil = [["FaCoins", "Coûts", "Remplir les camions et réduire les trajets à vide."], ["FaClock", "Délais", "Ex. : une usine automobile en flux tendu attend des livraisons à l'heure."], ["FaCircleCheck", "Qualité", "Marchandises intactes, documents justes."], ["FaHeadset", "Service client", "Informer vite et répondre aux demandes."]];
  for (let i = 0; i < 4; i++) {
    const x = MX + i * 3.08, g = "anim5_";
    card(s, x, 4.75, 2.9, 1.75, H.white, g + "c" + i, { shadow: true });
    await tile(s, x + 0.18, 4.92, 0.55, pil[i][0], "orange", g + "t" + i);
    T(s, pil[i][1], { x: x + 0.88, y: 4.92, w: 1.9, h: 0.55, fontSize: 17, bold: true, color: C.text1, valign: "middle", objectName: g + "n" + i });
    T(s, pil[i][2], { x: x + 0.18, y: 5.55, w: 2.6, h: 0.9, fontSize: 14, objectName: g + "d" + i });
  }
  src(s, "Source : IBM – What is supply chain management? Schéma général de la chaîne logistique.");
  notes(s, "La logistique relie trois acteurs. [clic] Le fournisseur, le prestataire logistique — c'est le rôle de SJL — et le client.\n\n[clic] Entre eux circulent trois flux : le flux physique, c'est-à-dire les marchandises ; [clic] le flux d'information : commandes, statuts, documents — c'est lui que le numérique transforme le plus ; [clic] et le flux financier, qui va dans l'autre sens.\n\n[clic] La logistique agit sur quatre leviers de performance : les coûts, les délais, la qualité et le service client.\n\nExemple concret : une usine automobile travaille souvent en flux tendu, avec peu de stock. Si un camion arrive en retard, la production peut être perturbée. C'est pourquoi la fiabilité est essentielle.");

  // ============ 7. TRADITIONAL LOGISTICS ============
  pres.addSection({ title: "Transformation" });
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Transformation" });
  head(s, "AVANT LE NUMÉRIQUE", "La logistique traditionnelle");
  await photo(s, "7054757", MX, 1.75, 5.55, 4.75, { name: "!!photoAvant", alt: "Pile de dossiers papier sur un bureau (photo d'illustration)" });
  const trad = [["FaFileLines", "Documents papier", "Lettres de voiture, bons de livraison, documents douaniers imprimés."], ["FaPhone", "Téléphone et fax", "L'information circule lentement entre client, agence et chauffeur."], ["FaKeyboard", "Saisie manuelle", "Données recopiées dans des registres ou des tableurs isolés."], ["FaMapLocationDot", "Suivi limité", "Pour localiser un camion, il faut appeler le chauffeur."]];
  for (let i = 0; i < 4; i++) {
    const y = 1.75 + i * 0.83;
    await tile(s, 6.55, y + 0.04, 0.6, trad[i][0], "white", "trT" + i);
    T(s, [{ text: trad[i][1], options: { bold: true, color: C.text1, fontSize: 16, breakLine: true } }, { text: trad[i][2] }], { x: 7.35, y, w: 5.38, h: 0.78, fontSize: 14 });
  }
  card(s, 6.55, 5.18, 3.0, 1.32, "FDEBD9", "conseq");
  T(s, [{ text: "Conséquences", options: { bold: true, color: C.text1, breakLine: true } }, { text: "erreurs de saisie, retards d'information, faible visibilité." }], { x: 6.72, y: 5.27, w: 2.7, h: 1.15, fontSize: 14 });
  card(s, 9.73, 5.18, 3.0, 1.32, H.grey, "example");
  T(s, [{ text: "Exemple", options: { bold: true, color: C.accent1, breakLine: true } }, { text: "Pour connaître l'arrivée d'un camion : appeler le chauffeur, puis rappeler le client." }], { x: 9.9, y: 5.27, w: 2.7, h: 1.15, fontSize: 14 });
  src(s, "Description générale du secteur, et non de l'organisation passée de SJL.");
  notes(s, "Avant le numérique, la logistique reposait sur le papier et le téléphone.\n\nLes documents de transport étaient imprimés et classés. Les informations passaient par téléphone ou fax. Les données étaient recopiées à la main. Et pour localiser un camion, il fallait appeler le chauffeur.\n\nExemple : un client demande à quelle heure arrive sa marchandise. L'agent appelle le chauffeur, attend sa réponse, puis rappelle le client. Cela prend du temps et crée des erreurs.\n\nAttention : c'est une description générale du secteur, pas une description de SJL dans le passé.");

  // ============ 8. DIGITAL TRANSFORMATION ============
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Transformation" });
  head(s, "TRANSFORMATION DIGITALE", "De la logistique traditionnelle à la logistique digitale");
  await photo(s, "7054757", MX, 1.75, 2.9, 2.0, { name: "!!photoAvant", capW: 1.95, capText: "Illustration · Pexels" });
  await photo(s, "4483942", 9.83, 1.75, 2.9, 1.45, { name: "!!photoApres", capW: 1.95, capText: "Illustration · Pexels", pos: "top" });
  const st = [["FaFileLines", "Papier & téléphone", "Documents imprimés, appels, fax.", "D5DCE5", false], ["FaComputer", "Informatisation", "Ordinateurs, tableurs, e-mails.", "A9B7C8", false], ["FaTowerBroadcast", "Outils connectés", "TMS, GPS, informatique embarquée.", H.navy2, true], ["FaBrain", "Logistique intelligente", "Données analysées, IA (perspective).", H.orange, true]];
  for (let i = 0; i < 4; i++) {
    const x = MX + i * 3.08, hgt = 1.3 + i * 0.6, y = 6.45 - hgt, g = `anim${i + 1}_`;
    card(s, x, y, 2.9, hgt, st[i][3], g + "b", { r: 0.06 });
    await tile(s, x + 0.18, y + 0.18, 0.5, st[i][0], i === 3 ? "white" : (i === 2 ? "orange" : "navy"), g + "t");
    T(s, "ÉTAPE " + (i + 1), { x: x + 0.82, y: y + 0.18, w: 1.9, h: 0.25, fontSize: 11, bold: true, charSpacing: 2, color: st[i][4] ? C.background1 : C.text1, objectName: g + "k" });
    T(s, st[i][1], { x: x + 0.82, y: y + 0.42, w: 2.0, h: 0.3, fontSize: 15, bold: true, color: st[i][4] ? C.background1 : C.text1, objectName: g + "n" });
    T(s, st[i][2], { x: x + 0.18, y: y + 0.8, w: 2.6, h: 0.45, fontSize: 14, color: st[i][4] ? C.background1 : C.text1, objectName: g + "d" });
  }
  // SJL marker above step 3
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MX + 2 * 3.08 + 0.15, y: 3.2, w: 2.6, h: 0.4, rectRadius: 0.2, fill: { color: H.green }, line: { color: H.green, width: 0 }, objectName: "anim3_m" });
  T(s, "SJL aujourd'hui : outils confirmés", { x: MX + 2 * 3.08 + 0.15, y: 3.2, w: 2.6, h: 0.4, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "anim3_mt" });
  s.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: MX + 2 * 3.08 + 1.35, y: 3.6, w: 0.2, h: 0.12, rotate: 180, fill: { color: H.green }, line: { color: H.green, width: 0 }, objectName: "anim3_mp" });
  src(s, "Étapes générales de la digitalisation logistique. Position de SJL : outils confirmés par ses sources publiques (TMS, GPS, informatique embarquée).");
  notes(s, "La digitalisation est une transition progressive, en quatre étapes.\n\n[clic] Étape 1 : le papier et le téléphone. [clic] Étape 2 : l'informatisation, avec des ordinateurs, des tableurs et des e-mails, mais des outils encore isolés. [clic] Étape 3 : des outils connectés comme le TMS, le GPS et l'informatique embarquée. Selon ses sources publiques, SJL se situe à ce niveau. [clic] Étape 4 : la logistique intelligente, où les données sont analysées, voire exploitées par l'IA. Pour SJL, c'est une perspective.\n\nRemarquez la photo de gauche : le papier. À droite : un employé qui travaille avec une tablette et un scanner.");

  // ============ 9. BEFORE / AFTER ============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Transformation" });
  head(s, "AVANT / APRÈS", "Deux façons de travailler");
  const cA = MX, cB = 7.83, cwc = 4.9, cL = 5.65, cLw = 2.03;
  await photo(s, "7054757", cA, 1.7, cwc, 1.4, { name: "!!photoAvant", caption: false });
  await photo(s, "4483942", cB, 1.7, cwc, 1.4, { name: "!!photoApres", caption: false, pos: "top" });
  for (const [x, t, bg] of [[cA, "AVANT · méthodes traditionnelles", H.mute], [cB, "APRÈS · méthodes digitales", H.orange]]) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: 2.68, w: 3.3, h: 0.34, rectRadius: 0.17, fill: { color: bg }, line: { color: bg, width: 0 }, objectName: "hdr" + x });
    T(s, t, { x: x + 0.15, y: 2.68, w: 3.3, h: 0.34, fontSize: 13, bold: true, color: bg === H.orange ? C.background1 : C.text1, align: "center", valign: "middle" });
  }
  T(s, "Photos d'illustration · Pexels", { x: cL, y: 2.2, w: cLw, h: 0.5, fontSize: 10, italic: true, align: "center" });
  const rows = [["FaFileLines", "Documents", "Papier, classeurs, archives physiques", "Documents numériques partagés en ligne"], ["FaLocationDot", "Suivi", "Appels téléphoniques au chauffeur", "Géolocalisation GPS en temps réel"], ["FaCalendarDays", "Planification", "Tableaux manuels, expérience individuelle", "Planification centralisée dans un TMS"], ["FaUserTie", "Client", "Réponse tardive, peu de visibilité", "Statut des envois connu rapidement"], ["FaChartLine", "Décision", "Basée surtout sur l'intuition", "Basée sur les données et indicateurs"]];
  for (let i = 0; i < 5; i++) {
    const y = 3.3 + i * 0.66, g = `anim${i + 1}_`;
    card(s, cA, y, cwc, 0.56, H.grey, g + "a");
    T(s, rows[i][2], { x: cA + 0.2, y, w: cwc - 0.3, h: 0.56, fontSize: 14, valign: "middle", objectName: g + "at" });
    await tile(s, cL + 0.1, y + 0.04, 0.48, rows[i][0], "navy", g + "i");
    T(s, rows[i][1], { x: cL + 0.65, y, w: 1.35, h: 0.56, fontSize: 14, bold: true, color: C.text1, valign: "middle", objectName: g + "l" });
    card(s, cB, y, cwc, 0.56, H.navy, g + "b");
    T(s, rows[i][3], { x: cB + 0.2, y, w: cwc - 0.3, h: 0.56, fontSize: 14, bold: true, color: C.background1, valign: "middle", objectName: g + "bt" });
  }
  src(s, "Comparaison générale du secteur. Sources : IBM – Supply chain management ; IBM – Transportation management systems.");
  notes(s, "Cette comparaison résume la transformation, ligne par ligne.\n\n[clic] Les documents passent du papier au numérique. [clic] Le suivi des camions passe du téléphone au GPS en temps réel. [clic] La planification se fait dans un logiciel, le TMS. [clic] Le client connaît plus vite le statut de son envoi. [clic] Et les décisions s'appuient sur des données.\n\nMessage clé : la digitalisation ne change pas le métier — transporter des marchandises — elle change la façon de l'organiser.");

  // ============ 10. TECHNOLOGICAL FOUNDATION ============
  pres.addSection({ title: "Technologies" });
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Technologies" });
  head(s, "SOCLE TECHNOLOGIQUE", "L'architecture d'une logistique connectée");
  const layers = [
    ["FaChartPie", "Analyse & décision", [["Big Data", 0], ["Tableaux de bord", 0], ["IA (perspective)", 2]]],
    ["FaServer", "Plateformes", [["TMS", 1], ["WMS", 0], ["Cloud", 0]]],
    ["FaWifi", "Connectivité", [["Réseaux mobiles", 0], ["Internet", 0], ["Échange de données", 0]]],
    ["FaTruck", "Terrain", [["GPS", 1], ["Info. embarquée", 1], ["Capteurs IoT", 0]]],
  ];
  for (let i = 0; i < 4; i++) {
    const y = 1.75 + i * 1.08, g = `anim${4 - i}_`;
    card(s, MX, y, 10.35, 0.92, H.white, g + "bg", { shadow: true });
    card(s, MX, y, 2.75, 0.92, i === 3 ? H.navy2 : H.navy, g + "lb");
    await tile(s, MX + 0.15, y + 0.17, 0.58, layers[i][0], "orange", g + "t");
    T(s, layers[i][1], { x: MX + 0.85, y, w: 1.85, h: 0.92, fontSize: 15, bold: true, color: C.background1, valign: "middle", objectName: g + "n" });
    layers[i][2].forEach(([lbl, k], j) => {
      const cx = 3.6 + j * 2.47, fill = k === 1 ? H.orange : H.white, line = k === 1 ? H.orange : (k === 2 ? H.orange : H.line);
      card(s, cx, y + 0.17, 2.3, 0.58, fill, g + "c" + j, { line, lw: 1.25, dash: k === 2 ? "dash" : "solid" });
      T(s, (k === 1 ? "✓ " : "") + lbl, { x: cx, y: y + 0.17, w: 2.3, h: 0.58, fontSize: 14, bold: true, color: k === 1 ? C.background1 : C.text1, align: "center", valign: "middle", objectName: g + "ct" + j });
    });
  }
  card(s, 11.1, 1.75, 1.63, 4.16, H.navy, "anim5_cy");
  await tile(s, 11.53, 2.0, 0.78, "FaShieldHalved", "orange", "anim5_ct");
  T(s, [{ text: "Cyber-sécurité", options: { bold: true, fontSize: 16, color: C.background1, breakLine: true } }, { text: "protège chaque couche", options: { color: C.accent4 } }], { x: 11.18, y: 2.95, w: 1.47, h: 1.5, fontSize: 14, align: "center", objectName: "anim5_ctx" });
  // legend
  card(s, MX, 6.08, 0.32, 0.32, H.orange, "lg1", { r: 0.05 });
  T(s, "Confirmé chez SJL", { x: MX + 0.42, y: 6.08, w: 2.2, h: 0.32, fontSize: 14, valign: "middle", bold: true, color: C.text1 });
  card(s, 3.2, 6.08, 0.32, 0.32, H.white, "lg2", { r: 0.05, line: H.line });
  T(s, "Technologie générale", { x: 3.62, y: 6.08, w: 2.2, h: 0.32, fontSize: 14, valign: "middle" });
  card(s, 5.8, 6.08, 0.32, 0.32, H.white, "lg3", { r: 0.05, line: H.orange, dash: "dash" });
  T(s, "Perspective (non confirmée)", { x: 6.22, y: 6.08, w: 3, h: 0.32, fontSize: 14, valign: "middle" });
  src(s, "Schéma pédagogique inspiré d'IBM et DHL. Confirmé chez SJL : sjl-group.com (groupage, FTL) et plateforme SJL Tanger Med.");
  notes(s, "Voici l'architecture d'une logistique connectée, couche par couche, de bas en haut.\n\n[clic] Sur le terrain : les camions, le GPS, l'informatique embarquée, d'éventuels capteurs. [clic] La connectivité transporte les données : réseaux mobiles et Internet. [clic] Les plateformes les organisent : TMS, WMS, Cloud. [clic] En haut, on analyse les données pour décider : Big Data, tableaux de bord, et demain l'IA. [clic] La cybersécurité protège toutes les couches.\n\nLes cases orange sont les technologies confirmées chez SJL : GPS, informatique embarquée et TMS. Les autres sont des technologies générales du secteur. L'IA est en pointillés : c'est une perspective.");

  // ============ 11. GPS ============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Technologies" });
  head(s, "GÉOLOCALISATION", "Le GPS et la géolocalisation dans le transport");
  const gsteps = [["FaSatellite", "Satellites", "envoient des signaux"], ["FaSatelliteDish", "Boîtier GPS", "calcule la position du camion"], ["FaTowerCell", "Réseau mobile", "transmet la position"], ["FaDesktop", "Plateforme de suivi", "affiche la carte et l'heure d'arrivée"], ["FaUsers", "Agence & client", "suivent l'envoi"]];
  for (let i = 0; i < 5; i++) {
    const x = MX + i * 2.5, g = `anim${i + 1}_`;
    await tile(s, x + 0.72, 1.72, 0.78, gsteps[i][0], i === 1 ? "orange" : "navy", i === 1 ? "!!gpsDevice" : g + "t");
    T(s, gsteps[i][1], { x, y: 2.55, w: 2.25, h: 0.32, fontSize: 15, bold: true, color: C.text1, align: "center", objectName: g + "n" });
    T(s, gsteps[i][2], { x, y: 2.87, w: 2.25, h: 0.5, fontSize: 14, align: "center", objectName: g + "d" });
    if (i < 4) arrow(s, x + 1.62, 2.11, x + 3.12, 2.11, H.orange, { dash: "dash", name: g + "ar" });
  }
  s.addImage({ path: "img/gps.png", x: MX, y: 3.65, w: 3.8, h: 2.85, objectName: "!!gpsScreen", altText: "Illustration d'une tablette de suivi GPS : itinéraire, camion, heure d'arrivée estimée" });
  await photo(s, "9966011", 4.6, 3.65, 3.75, 2.85, { name: "gpsPhoto", capW: 1.95, capText: "Illustration · Pexels" });
  card(s, 8.55, 3.65, 4.18, 2.85, H.navy, "!!navyPanel");
  badge(s, 8.78, 3.85, "ok", 2.35, "gpsBadge");
  T(s, "SJL annonce une traçabilité et un suivi en temps réel par GPS et géolocalisation.", { x: 8.78, y: 4.3, w: 3.8, h: 0.75, fontSize: 14, color: C.background1, bold: true });
  T(s, [{ text: "Exemple", options: { bold: true, color: C.accent1, breakLine: true } }, { text: "Un client demande où est sa marchandise : l'agent répond en quelques secondes, sans appeler le chauffeur." }], { x: 8.78, y: 5.12, w: 3.8, h: 1.3, fontSize: 14, color: C.background1 });
  src(s, "Sources : sjl-group.com (Transport en groupage : suivi GPS et géolocalisation) ; IBM – Transportation management systems.");
  notes(s, "Comment fonctionne le GPS dans le transport ?\n\n[clic] Des satellites envoient des signaux. [clic] Le boîtier GPS installé dans le camion calcule sa position. [clic] Le réseau mobile transmet cette position. [clic] Une plateforme de suivi l'affiche sur une carte, avec une heure d'arrivée estimée. [clic] L'agence et, selon les cas, le client peuvent suivre l'envoi.\n\nChez SJL, c'est confirmé : l'entreprise annonce une traçabilité et un suivi en temps réel par GPS et géolocalisation.\n\nExemple : un client demande où se trouve sa marchandise. Grâce au GPS, l'agent répond en quelques secondes, sans appeler le chauffeur.");

  // ============ 12. TMS ============
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Technologies" });
  head(s, "TMS", "Le TMS : le cerveau du transport");
  await photo(s, "12969403", MX, 1.75, 3.6, 2.85, { name: "tmsPhoto", capW: 1.95, capText: "Illustration · Pexels" });
  card(s, MX, 4.78, 3.6, 1.72, H.navy, "!!navyPanel");
  badge(s, MX + 0.2, 4.95, "ok", 2.35, "tmsBadge");
  T(s, "Le TMS est cité par SJL (plateforme Tanger Med, offre d'emploi). Les modules utilisés ne sont pas publiés.", { x: MX + 0.2, y: 5.38, w: 3.25, h: 1.05, fontSize: 14, color: C.background1 });
  const cxH = 8.66, cyH = 4.15;
  s.addShape(pres.shapes.OVAL, { x: cxH - 0.85, y: cyH - 0.85, w: 1.7, h: 1.7, fill: { color: H.navy }, line: { color: H.orange, width: 4 }, shadow: shadow(), objectName: "tmsHub" });
  T(s, [{ text: "TMS", options: { bold: true, fontSize: 24, breakLine: true } }, { text: "Transport Management System", options: { fontSize: 10 } }], { x: cxH - 0.8, y: cyH - 0.55, w: 1.6, h: 1.1, color: C.background1, align: "center", valign: "middle", objectName: "tmsHubT" });
  await tile(s, cxH - 0.3, 1.72, 0.6, "FaSatelliteDish", "orange", "!!gpsDevice");
  T(s, "Données GPS et embarquées", { x: cxH - 1.3, y: 2.35, w: 2.6, h: 0.3, fontSize: 12, bold: true, align: "center", color: C.text1 });
  arrow(s, cxH, 2.68, cxH, cyH - 0.88, H.orange, { w: 2.5 });
  const mods = [["FaClipboardList", "Commandes", "Enregistrer les demandes"], ["FaCalendarCheck", "Planification", "Affecter camions et chauffeurs"], ["FaFileInvoice", "Documents", "Éditer les documents de transport"], ["FaRoute", "Suivi", "Statut des envois en temps réel"], ["FaReceipt", "Facturation", "Calculer et facturer"], ["FaChartColumn", "Indicateurs", "Délais, coûts, qualité"]];
  for (let i = 0; i < 6; i++) {
    const left = i < 3, x = left ? 4.55 : 10.07, y = 1.85 + (i % 3) * 1.6, g = `anim${(i % 3) + 1}_`;
    card(s, x, y, 2.66, 1.3, H.white, g + "m" + i, { shadow: true });
    await tile(s, x + 0.15, y + 0.18, 0.5, mods[i][0], "navy", g + "mt" + i);
    T(s, mods[i][1], { x: x + 0.75, y: y + 0.18, w: 1.85, h: 0.5, fontSize: 15, bold: true, color: C.text1, valign: "middle", objectName: g + "mn" + i });
    T(s, mods[i][2], { x: x + 0.15, y: y + 0.75, w: 2.45, h: 0.5, fontSize: 14, objectName: g + "md" + i });
    const yy = y + 0.65;
    if (left) arrow(s, x + 2.66, yy, cxH - 0.85 + (i % 3 === 1 ? 0 : 0.2), cyH + (i % 3 - 1) * 0.55, H.mute, { noEnd: true, name: g + "ml" + i });
    else arrow(s, cxH + 0.85 - (i % 3 === 1 ? 0 : 0.2), cyH + (i % 3 - 1) * 0.55, x, yy, H.mute, { noEnd: true, name: g + "ml" + i });
  }
  src(s, "Fonctions générales d'un TMS : IBM – Transportation management systems. Mention du TMS par SJL : offre.sjl-group.com ; offre d'emploi SJL (LinkedIn).");
  notes(s, "Le TMS, ou Transport Management System, est le logiciel qui organise le transport. On peut le voir comme le cerveau des opérations.\n\nIl reçoit les données du GPS et de l'informatique embarquée. [clic] Il enregistre les commandes et les suit. [clic] Il aide à planifier : quel camion, quel chauffeur, quel horaire, et il calcule la facturation. [clic] Il édite les documents et produit des indicateurs : délais, coûts, qualité.\n\nChez SJL, le TMS est confirmé : il est cité sur la page de la plateforme Tanger Med et dans une offre d'emploi. En revanche, SJL ne publie pas le détail des modules : ce schéma présente les fonctions générales d'un TMS.");

  // ============ 13. EMBEDDED IT ============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Technologies" });
  head(s, "INFORMATIQUE EMBARQUÉE", "Le camion connecté chez SJL");
  s.addImage({ path: "img/truck.png", x: 0.7, y: 1.85, w: 7.0, h: 2.625, objectName: "!!truck", altText: "Illustration d'un camion semi-remorque" });
  s.addShape(pres.shapes.OVAL, { x: 6.55, y: 2.15, w: 0.34, h: 0.34, fill: { color: H.orange }, line: { color: H.white, width: 2 }, objectName: "!!sensorA" });
  const emb = [["FaLocationDot", "Position du camion", "Envoyée vers le suivi GPS.", true], ["FaBoxOpen", "Suivi de l'expédition", "Statut connu à chaque étape.", true], ["FaComments", "Échanges chauffeur – agence", "Messages et consignes.", false], ["FaGaugeHigh", "Données du véhicule", "Conduite, consommation.", false]];
  for (let i = 0; i < 4; i++) {
    const x = MX + (i % 2) * 3.62, y = 4.75 + Math.floor(i / 2) * 0.9, g = `anim${i + 1}_`;
    await tile(s, x, y, 0.62, emb[i][0], emb[i][3] ? "orange" : "white", g + "t");
    T(s, [{ text: emb[i][1], options: { bold: true, color: C.text1, breakLine: true } }, { text: emb[i][2] }], { x: x + 0.78, y: y - 0.02, w: 2.75, h: 0.75, fontSize: 14, objectName: g + "x" });
  }
  card(s, 8.15, 1.75, 4.58, 4.75, H.navy, "!!navyPanel");
  await photo(s, "4824424", 8.15, 1.75, 4.58, 1.85, { name: "embPhoto", capW: 1.95, capText: "Illustration · Pexels", capTop: true, alt: "Tableau de bord d'un véhicule avec smartphone de navigation (photo d'illustration)" });
  badge(s, 8.4, 3.8, "ok", 2.35, "embBadge");
  T(s, "SJL indique que ses camions sont équipés d'une technologie embarquée utilisée pour suivre les expéditions.", { x: 8.4, y: 4.25, w: 4.1, h: 0.95, fontSize: 14, bold: true, color: C.background1 });
  T(s, [{ text: "Orange : ", options: { bold: true, color: C.accent1 } }, { text: "fonctions annoncées par SJL.", options: { breakLine: true } }, { text: "Blanc : ", options: { bold: true, color: C.background1 } }, { text: "fonctions courantes du secteur, non détaillées par SJL." }], { x: 8.4, y: 5.3, w: 4.1, h: 1.05, fontSize: 14, color: C.accent4 });
  src(s, "Source : sjl-group.com (Transport FTL : technologie embarquée). Fonctions courantes : publications sectorielles sur l'informatique embarquée.");
  notes(s, "L'informatique embarquée, ce sont les équipements numériques installés à bord du camion.\n\nChez SJL, c'est confirmé : l'entreprise indique que ses camions sont équipés d'une technologie embarquée utilisée pour suivre les expéditions.\n\n[clic] Concrètement, cela permet d'envoyer la position du camion, [clic] et de connaître le statut de l'expédition à chaque étape.\n\n[clic] Dans le secteur, ces systèmes servent souvent aussi aux échanges entre le chauffeur et l'agence, [clic] et à la remontée de données du véhicule. Mais SJL ne détaille pas ces fonctions : nous les présentons comme des usages courants, en blanc.");

  // ============ 14. IoT ============
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Technologies" });
  head(s, "INTERNET DES OBJETS", "L'IoT et la logistique connectée");
  badge(s, MX, 1.72, "gen", 3.3, "iotBadge");
  s.addImage({ path: "img/truck.png", x: MX, y: 2.2, w: 5.6, h: 2.1, objectName: "!!truck", altText: "Illustration d'un camion équipé de capteurs" });
  const sens = [[1.1, 2.35, "T°"], [3.0, 2.35, "Porte"], [5.25, 2.42, "GPS"], [2.2, 3.55, "Chocs"]];
  sens.forEach(([x, y, l], i) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: 0.62, h: 0.62, fill: { color: H.orange }, line: { color: H.white, width: 2.5 }, shadow: shadow(), objectName: i === 2 ? "!!sensorA" : "sensor" + i });
    T(s, l, { x: x - 0.1, y, w: 0.82, h: 0.62, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle" });
  });
  await photo(s, "1267327", MX, 4.55, 5.6, 1.95, { name: "iotPhoto", capW: 1.95, capText: "Illustration · Pexels" });
  const isteps = [["FaTemperatureHalf", "Le capteur mesure", "température, ouverture de porte, chocs, position"], ["FaWifi", "Le réseau transmet", "les données partent automatiquement"], ["FaCloud", "La plateforme analyse", "compare les mesures aux seuils prévus"], ["FaBell", "Une alerte est envoyée", "Ex. : la température d'une remorque frigorifique dépasse le seuil"]];
  for (let i = 0; i < 4; i++) {
    const y = 1.75 + i * 1.2, g = `anim${i + 1}_`;
    card(s, 6.6, y, 6.13, 1.05, H.white, g + "c", { shadow: true });
    await tile(s, 6.78, y + 0.2, 0.65, isteps[i][0], i === 3 ? "orange" : "navy", i === 2 ? "!!cloud" : g + "t");
    T(s, isteps[i][1], { x: 7.6, y: y + 0.12, w: 5.0, h: 0.35, fontSize: 16, bold: true, color: C.text1, objectName: g + "n" });
    T(s, isteps[i][2], { x: 7.6, y: y + 0.47, w: 5.0, h: 0.52, fontSize: 14, objectName: g + "d" });
  }
  src(s, "Technologie générale du secteur : son usage par SJL n'est pas confirmé publiquement. Sources : IBM – Supply chain management ; DHL.");
  notes(s, "L'Internet des objets, ou IoT, ce sont des objets équipés de capteurs qui envoient des données automatiquement.\n\nAttention : c'est une technologie générale du secteur. Nous n'avons pas trouvé de source confirmant son usage par SJL.\n\nSur un camion, on peut mesurer la température, l'ouverture des portes, les chocs ou la position.\n\n[clic] Le capteur mesure. [clic] Le réseau transmet. [clic] La plateforme compare les mesures aux seuils. [clic] Si un problème apparaît, une alerte est envoyée.\n\nExemple : pour des produits frais, une alerte prévient l'agence si la température de la remorque devient trop élevée.");

  // ============ 15. CLOUD / BIG DATA ============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Technologies" });
  head(s, "DONNÉES", "Cloud Computing, Big Data et analyse de données");
  const pipe = [["FaSatelliteDish", "Collecte", "GPS, TMS, capteurs"], ["FaCloud", "Stockage", "dans le Cloud"], ["FaDatabase", "Traitement", "Big Data"], ["FaChartLine", "Visualisation", "tableaux de bord"], ["FaLightbulb", "Décision", "agir plus vite"]];
  for (let i = 0; i < 5; i++) {
    const x = MX + i * 2.5, g = `anim${i + 1}_`;
    card(s, x, 1.75, 2.15, 1.7, i === 4 ? H.navy : H.grey, g + "c");
    await tile(s, x + 0.72, 1.88, 0.7, pipe[i][0], i === 1 ? "orange" : (i === 4 ? "orange" : "navy"), i === 1 ? "!!cloud" : g + "t");
    T(s, pipe[i][1], { x, y: 2.65, w: 2.15, h: 0.32, fontSize: 15, bold: true, align: "center", color: i === 4 ? C.background1 : C.text1, objectName: g + "n" });
    T(s, pipe[i][2], { x, y: 2.97, w: 2.15, h: 0.35, fontSize: 14, align: "center", color: i === 4 ? C.accent4 : C.text2, objectName: g + "d" });
    if (i < 4) s.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: x + 2.24, y: 2.5, w: 0.2, h: 0.2, rotate: 90, fill: { color: H.orange }, line: { color: H.orange, width: 0 }, objectName: g + "ar" });
  }
  const dc = [["Cloud Computing", "Logiciels et données hébergés sur Internet, accessibles partout.", "Une agence à Tanger et une agence en Espagne consultent les mêmes données."], ["Big Data", "De très grands volumes de données variées, produites en continu.", "Les positions GPS de toute une flotte, jour après jour."], ["Analyse de données", "Transformer les données en indicateurs utiles.", "Repérer les itinéraires où les retards sont fréquents."]];
  for (let i = 0; i < 3; i++) {
    const x = MX + i * 2.95, g = "anim6_";
    card(s, x, 3.7, 2.8, 2.8, H.white, g + "d" + i, { shadow: true, line: H.line });
    T(s, dc[i][0], { x: x + 0.2, y: 3.85, w: 2.45, h: 0.35, fontSize: 16, bold: true, color: C.text1, objectName: g + "dn" + i });
    T(s, dc[i][1], { x: x + 0.2, y: 4.22, w: 2.45, h: 0.95, fontSize: 14, objectName: g + "dd" + i });
    T(s, [{ text: "Exemple", options: { bold: true, color: C.accent1, breakLine: true } }, { text: dc[i][2], options: { italic: true } }], { x: x + 0.2, y: 5.2, w: 2.45, h: 1.2, fontSize: 14, objectName: g + "de" + i });
  }
  await photo(s, "5092815", 9.5, 3.7, 3.23, 2.8, { name: "cloudPhoto", capW: 1.95, capText: "Illustration · Pexels" });
  src(s, "Technologies générales du secteur ; leur usage chez SJL n'est pas détaillé publiquement. Source : IBM – Supply chain management.");
  notes(s, "Le Cloud, le Big Data et l'analyse de données forment une chaîne de valeur de la donnée.\n\n[clic] On collecte les données : GPS, TMS, capteurs. [clic] On les stocke dans le Cloud, accessible depuis Internet. [clic] On les traite, parfois en très grands volumes : c'est le Big Data. [clic] On les visualise dans des tableaux de bord. [clic] Et on décide plus vite.\n\n[clic] Trois définitions simples, avec un exemple pour chacune.\n\nCe sont des technologies générales : SJL ne publie pas le détail de leur usage. Mais elles montrent à quoi peuvent servir les données produites par le TMS et le GPS.");

  // ============ 16. ARTIFICIAL INTELLIGENCE ============
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Technologies" });
  head(s, "INTELLIGENCE ARTIFICIELLE", "L'IA dans la logistique moderne");
  badge(s, MX, 1.72, "pot", 3.75, "aiBadge");
  s.addImage({ path: "img/ai.png", x: MX, y: 2.2, w: 4.5, h: 3.375, objectName: "aiImg", altText: "Illustration : réseau de neurones alimentant une courbe de prévision" });
  card(s, MX, 5.75, 4.5, 0.75, H.navy2, "aiNote");
  T(s, "L'IA aurait besoin des données déjà produites par le TMS et le GPS.", { x: MX + 0.2, y: 5.75, w: 4.15, h: 0.75, fontSize: 14, color: C.background1, valign: "middle" });
  const ai = [["FaChartLine", "Analyse prédictive", "Anticiper un retard : trafic, attente au port, météo."], ["FaRoute", "Optimisation des itinéraires", "Choisir le trajet le plus rapide et le moins coûteux."], ["FaCalendarCheck", "Prévision de la demande", "Prévoir les volumes pour réserver camions et espace."], ["FaRobot", "Automatisation", "Lire les documents automatiquement, répondre aux clients (chatbot)."]];
  for (let i = 0; i < 4; i++) {
    const x = 5.45 + (i % 2) * 3.68, y = 1.72 + Math.floor(i / 2) * 2.42, g = `anim${i + 1}_`;
    card(s, x, y, 3.55, 2.27, H.navy2, g + "c", { line: H.orange, lw: 1.25, dash: "dash" });
    await tile(s, x + 0.22, y + 0.22, 0.68, ai[i][0], "orange", g + "t");
    T(s, ai[i][1], { x: x + 0.22, y: y + 1.0, w: 3.15, h: 0.4, fontSize: 17, bold: true, color: C.background1, objectName: g + "n" });
    T(s, ai[i][2], { x: x + 0.22, y: y + 1.42, w: 3.15, h: 0.75, fontSize: 14, color: C.accent4, objectName: g + "d" });
  }
  src(s, "Applications possibles : aucune source publique ne confirme l'usage de l'IA par SJL. Sources : IBM – Supply chain management ; DHL.", true);
  notes(s, "L'intelligence artificielle est une perspective. Nous n'avons trouvé aucune source publique indiquant que SJL utilise l'IA aujourd'hui. Les applications suivantes sont donc des possibilités.\n\n[clic] L'analyse prédictive : anticiper un retard grâce aux données de trafic, d'attente au port ou de météo. [clic] L'optimisation des itinéraires. [clic] La prévision de la demande, pour réserver à l'avance camions et espace d'entrepôt. [clic] L'automatisation : lecture automatique des documents, chatbot pour répondre aux clients.\n\nPoint important : l'IA a besoin de données. Les outils déjà utilisés par SJL — TMS et GPS — en produisent. Ils constituent donc une base pour l'IA de demain.");

  // ============ 17. PRACTICAL EXAMPLE ============
  pres.addSection({ title: "Cas pratique" });
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Cas pratique" });
  head(s, "EXEMPLE PRATIQUE", "Une expédition digitale, de la commande à la livraison");
  badge(s, MX, 1.68, "ill", 2.6, "exBadge");
  T(s, "Export de pièces automobiles de Tanger vers l'Espagne", { x: 3.4, y: 1.68, w: 7, h: 0.32, fontSize: 14, bold: true, color: C.text1, valign: "middle" });
  const ex = [
    ["12969403", "FaClipboardList", "Commande", "Le client demande un transport.", "TMS", "Ordre de transport"],
    ["12876900", "FaCalendarCheck", "Planification", "Choix du camion, du chauffeur et de l'horaire.", "TMS", "Planning"],
    ["15016531", "FaTruckRampBox", "Chargement", "Enlèvement à l'usine, documents préparés.", "Embarqué", "Statut «\u00A0chargé\u00A0»"],
    ["221322", "FaShip", "Traversée & douane", "Passage par Tanger Med et le détroit.", "GPS", "Position en temps réel"],
    ["6169635", "FaHandshake", "Livraison", "Remise au client, preuve de livraison.", "TMS", "Facture, indicateurs"],
  ];
  const ew = 2.3, eg = (CW - 5 * ew) / 4;
  for (let i = 0; i < 5; i++) {
    const x = MX + i * (ew + eg), g = `anim${i + 1}_`;
    card(s, x, 2.2, ew, 4.3, H.white, g + "c", { shadow: true });
    await photo(s, ex[i][0], x, 2.2, ew, 1.25, { name: g + "p", caption: false });
    await tile(s, x + 0.15, 3.12, 0.6, ex[i][1], i === 4 ? "orange" : "navy", g + "t");
    T(s, String(i + 1), { x: x + ew - 0.55, y: 3.55, w: 0.4, h: 0.4, fontSize: 22, bold: true, color: C.accent4, align: "right", fontFace: "Arial", objectName: g + "num" });
    T(s, ex[i][2], { x: x + 0.15, y: 3.8, w: ew - 0.3, h: 0.35, fontSize: 15, bold: true, color: C.text1, objectName: g + "n" });
    T(s, ex[i][3], { x: x + 0.15, y: 4.15, w: ew - 0.3, h: 0.95, fontSize: 14, objectName: g + "d" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: 5.15, w: 1.25, h: 0.32, rectRadius: 0.16, fill: { color: H.orange }, line: { color: H.orange, width: 0 }, objectName: g + "chip" });
    T(s, ex[i][4], { x: x + 0.15, y: 5.15, w: 1.25, h: 0.32, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle", objectName: g + "chipT" });
    T(s, [{ text: "Donnée : ", options: { bold: true, color: C.text1 } }, { text: ex[i][5], options: { italic: true } }], { x: x + 0.15, y: 5.55, w: ew - 0.3, h: 0.8, fontSize: 14, objectName: g + "dt" });
    if (i < 4) s.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: x + ew + eg / 2 - 0.09, y: 4.2, w: 0.18, h: 0.18, rotate: 90, fill: { color: H.orange }, line: { color: H.orange, width: 0 }, objectName: g + "ar" });
  }
  src(s, "Scénario illustratif construit avec les outils confirmés de SJL (TMS, informatique embarquée, GPS) : ce n'est pas une opération réelle documentée. Photos : Pexels.");
  notes(s, "Pour rendre tout cela concret, suivons un scénario pédagogique : un export de pièces automobiles de Tanger vers l'Espagne. Ce n'est pas une opération réelle de SJL, mais un exemple construit avec les outils confirmés.\n\n[clic] 1. Le client demande un transport : la commande est saisie dans le TMS. [clic] 2. Le TMS aide à choisir le camion, le chauffeur et l'horaire. [clic] 3. Au chargement, l'informatique embarquée met à jour le statut. [clic] 4. Pendant la traversée par Tanger Med et le détroit, le GPS donne la position en temps réel. [clic] 5. À la livraison, la preuve de livraison permet la facturation et alimente les indicateurs.\n\nÀ chaque étape, une donnée est créée : c'est cette donnée qui rend la logistique plus rapide et plus transparente.");

  // ============ 18. BENEFITS & CHALLENGES ============
  pres.addSection({ title: "Bilan et perspectives" });
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Bilan et perspectives" });
  head(s, "BILAN", "Bénéfices et défis de la digitalisation");
  const bc = [
    ["FaCircleCheck", "Bénéfices", "green", [["FaBolt", "Efficacité", "Moins de tâches manuelles et d'erreurs."], ["FaCoins", "Coûts maîtrisés", "Trajets et temps mieux utilisés."], ["FaMagnifyingGlassLocation", "Traçabilité", "Position et statut connus à tout moment."], ["FaFaceSmile", "Service client", "Information rapide et fiable."]]],
    ["FaTriangleExclamation", "Défis", "orange", [["FaShieldHalved", "Cybersécurité", "Protéger données et systèmes."], ["FaSackDollar", "Investissement", "Logiciels, équipements, maintenance."], ["FaUserGraduate", "Compétences", "Former le personnel aux outils."], ["FaPeopleArrows", "Changement", "Résistance et qualité des données."]]],
  ];
  for (let k = 0; k < 2; k++) {
    const x0 = MX + k * 6.2, g = `anim${k + 1}_`;
    card(s, x0, 1.75, 5.93, 4.75, H.grey, g + "bg");
    await tile(s, x0 + 0.25, 1.95, 0.7, bc[k][0], bc[k][2], g + "ht");
    T(s, bc[k][1], { x: x0 + 1.1, y: 1.95, w: 3, h: 0.7, fontSize: 22, bold: true, color: C.text1, valign: "middle", fontFace: "Arial", objectName: g + "h" });
    for (let j = 0; j < 4; j++) {
      const x = x0 + 0.25 + (j % 2) * 2.79, y = 2.9 + Math.floor(j / 2) * 1.75;
      card(s, x, y, 2.65, 1.55, H.white, g + "c" + j, { shadow: true });
      await tile(s, x + 0.15, y + 0.17, 0.5, bc[k][3][j][0], k === 0 ? "navy" : "orange", g + "t" + j);
      T(s, bc[k][3][j][1], { x: x + 0.75, y: y + 0.17, w: 1.8, h: 0.5, fontSize: 15, bold: true, color: C.text1, valign: "middle", objectName: g + "n" + j });
      T(s, bc[k][3][j][2], { x: x + 0.15, y: y + 0.78, w: 2.4, h: 0.7, fontSize: 14, objectName: g + "d" + j });
    }
  }
  src(s, "Analyse générale du secteur. Sources : IBM – Supply chain management ; IBM – Transportation management systems.");
  notes(s, "Faisons le bilan.\n\n[clic] Les bénéfices : plus d'efficacité, car il y a moins de tâches manuelles et d'erreurs ; des coûts mieux maîtrisés, car les trajets et le temps sont mieux utilisés ; une meilleure traçabilité ; et un client mieux informé.\n\n[clic] Mais il y a aussi des défis. La cybersécurité : plus de données, c'est plus de risques. L'investissement : logiciels, équipements, maintenance. Les compétences : il faut former le personnel. Et le changement : certaines personnes résistent, et les données doivent être de bonne qualité.\n\nNous ne donnons pas de chiffres, car aucune donnée publique ne mesure ces effets chez SJL.");

  // ============ 19. RECOMMENDATIONS ============
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Bilan et perspectives" });
  head(s, "RECOMMANDATIONS", "Recommandations et perspectives pour SJL");
  const road = [
    ["Court terme", H.navy2, [["FaUserGraduate", "Former les employés", "Ateliers sur le TMS, le GPS et les bons réflexes numériques."], ["FaShieldHalved", "Renforcer la cybersécurité", "Mots de passe, sauvegardes, sensibilisation."]]],
    ["Moyen terme", H.navy, [["FaChartColumn", "Exploiter les données", "Tableaux de bord sur les délais et les coûts."], ["FaBell", "Mieux informer le client", "Partage automatique du statut des envois."]]],
    ["Long terme", H.orange, [["FaFlask", "Tester l'IA", "Projet pilote : prévision des retards."], ["FaRoute", "Optimiser les trajets", "Outils d'optimisation d'itinéraires."]]],
  ];
  for (let i = 0; i < 3; i++) {
    const x = MX + i * 4.12, g = `anim${i + 1}_`;
    s.addShape(i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, { x, y: 1.75, w: 4.0, h: 0.7, fill: { color: road[i][1] }, line: { color: road[i][1], width: 0 }, objectName: g + "ch" });
    T(s, road[i][0], { x: x + 0.35, y: 1.75, w: 3.3, h: 0.7, fontSize: 18, bold: true, color: C.background1, align: "center", valign: "middle", objectName: g + "cht" });
    for (let j = 0; j < 2; j++) {
      const y = 2.7 + j * 1.9;
      card(s, x, y, 3.85, 1.75, H.white, g + "c" + j, { shadow: true });
      await tile(s, x + 0.2, y + 0.22, 0.62, road[i][2][j][0], i === 2 ? "orange" : "navy", g + "t" + j);
      T(s, road[i][2][j][1], { x: x + 1.0, y: y + 0.22, w: 2.7, h: 0.62, fontSize: 16, bold: true, color: C.text1, valign: "middle", objectName: g + "n" + j });
      T(s, road[i][2][j][2], { x: x + 0.2, y: y + 0.95, w: 3.45, h: 0.7, fontSize: 14, objectName: g + "d" + j });
    }
  }
  src(s, "Propositions du groupe d'étudiants, fondées sur notre analyse : ce ne sont pas des projets annoncés par SJL.");
  notes(s, "Voici nos recommandations, organisées en feuille de route. Ce sont nos propositions, pas des projets annoncés par SJL.\n\n[clic] À court terme : former les employés aux outils, et renforcer la cybersécurité avec des gestes simples — mots de passe, sauvegardes, sensibilisation.\n\n[clic] À moyen terme : mieux exploiter les données du TMS et du GPS dans des tableaux de bord, et informer automatiquement les clients du statut de leurs envois.\n\n[clic] À long terme : tester l'IA avec un petit projet pilote, par exemple la prévision des retards, puis optimiser les trajets.\n\nL'idée est d'avancer étape par étape, en partant des outils qui existent déjà.");

  // ============ 20. CONCLUSION & REFERENCES ============
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Bilan et perspectives" });
  head(s, "CONCLUSION", "Ce qu'il faut retenir");
  const keys = ["La digitalisation remplace le papier et le téléphone par des données en temps réel.", "SJL annonce publiquement un TMS, l'informatique embarquée et le suivi GPS.", "L'IA est une piste d'avenir, à construire avec la formation et la cybersécurité."];
  for (let i = 0; i < 3; i++) {
    const y = 1.8 + i * 1.3;
    T(s, String(i + 1).padStart(2, "0"), { x: MX, y, w: 0.9, h: 0.7, fontSize: 36, bold: true, color: C.accent1, fontFace: "Arial" });
    T(s, keys[i], { x: MX + 1.0, y: y + 0.05, w: 4.8, h: 1.05, fontSize: 17, color: C.background1 });
  }
  T(s, "Merci de votre attention — Questions ?", { x: MX, y: 5.85, w: 5.9, h: 0.5, fontSize: 20, bold: true, color: C.accent1, fontFace: "Arial" });
  card(s, 6.75, 1.72, 5.98, 4.85, H.navy2, "refs");
  T(s, "Références (liens cliquables)", { x: 6.97, y: 1.85, w: 5.5, h: 0.34, fontSize: 15, bold: true, color: C.background1 });
  const refs = [
    ["SJL Group – Site officiel", "https://sjl-group.com/"],
    ["SJL Group – History and highlights", "https://sjl-group.com/en/history"],
    ["SJL Group – Nos services transport et logistique", "https://sjl-group.com/fr/nos-services-transport-et-logistique"],
    ["SJL Group – Transport en groupage (suivi GPS)", "https://sjl-group.com/fr/transport-en-groupage"],
    ["SJL Group – Transport FTL (technologie embarquée)", "https://sjl-group.com/fr/transport-ftl"],
    ["SJL Group – Express transport", "https://sjl-group.com/es/express-transport"],
    ["SJL Group – Centres logistiques", "https://sjl-group.com/es/centros-logisticos"],
    ["SJL – Plateforme logistique Tanger Med (TMS/WMS)", "https://offre.sjl-group.com/fr/fr/5-raisons-de-choisir-la-plateforme-logistique-sjl-medhub-0"],
    ["SJL – Page LinkedIn officielle", "https://www.linkedin.com/company/sjlofficiel/"],
    ["Conseil de la concurrence – Communiqué SJL Maghreb SA", "https://conseil-concurrence.ma/communique-du-conseil-de-la-concurrence-relatif-au-projet-de-concentration-economique-qui-concerne-la-prise-du-controle-exclusif-par-la-societe-the-capital-global-services-fintech-sl-de/"],
    ["Mediterrania Capital Partners – Cession de SJL (2017)", "https://www.mcapitalp.com/wp-content/uploads/2017-04-10-Mediterrania-Capital-Partners-exits-SJL_EN-V5-FINAL-Mediterrania.pdf"],
    ["IBM – What is supply chain management?", "https://www.ibm.com/think/topics/supply-chain-management"],
    ["IBM – Transportation management systems", "https://www.ibm.com/think/topics/transportation-management-systems"],
    ["IBM – Warehouse management", "https://www.ibm.com/think/topics/warehouse-management"],
    ["DHL – Site officiel (insights logistiques)", "https://www.dhl.com/"],
    ["Pexels – Photos d'illustration (licence Pexels)", "https://www.pexels.com/license/"],
  ];
  T(s, refs.map((r, i) => ({ text: `${i + 1}. ${r[0]}`, options: { hyperlink: { url: r[1], tooltip: r[1] }, color: C.background1, breakLine: i < refs.length - 1 } })), { x: 6.97, y: 2.28, w: 5.6, h: 4.2, fontSize: 11.5, paraSpaceAfter: 2.2, color: C.background1 });
  src(s, "Sources consultées en novembre 2026. Bibliographie détaillée fournie séparément.", true);
  notes(s, "Pour conclure, trois idées à retenir.\n\nUn : la digitalisation remplace le papier et le téléphone par des données disponibles en temps réel.\n\nDeux : SJL annonce publiquement un TMS, une informatique embarquée et le suivi GPS. Ces outils améliorent la traçabilité et l'organisation.\n\nTrois : l'IA est une piste d'avenir. Elle pourra s'appuyer sur ces données, à condition de former le personnel et de renforcer la cybersécurité.\n\nToutes nos sources sont listées ici et sont cliquables. Merci de votre attention, nous sommes prêts à répondre à vos questions.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  const P = (n) => Array.from({ length: n }, (_, i) => `anim${i + 1}_`);
  await addMotion(OUT, {
    transitions: { 1: "fade", 2: "morph", 3: "morph", 4: "fade", 5: "morph", 6: "morph", 7: "fade", 8: "morph", 9: "morph", 10: "fade", 11: "morph", 12: "morph", 13: "morph", 14: "morph", 15: "morph", 16: "morph", 17: "fade", 18: "fade", 19: "morph", 20: "fade" },
    anim: { 3: P(4), 4: P(4).slice(1), 5: P(4), 6: P(5), 8: P(4), 9: P(5), 10: P(5), 11: P(5), 12: P(3), 13: P(4), 14: P(4), 15: P(6), 16: P(4), 17: P(5), 18: P(2), 19: P(3) },
  });
  console.log("written", OUT);
})();
