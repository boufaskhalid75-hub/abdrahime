const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");
const { applyTheme } = require(process.env.SKILL + "/scripts/apply_theme.js");
const { addMotion } = require("./motion.js");

const OUT = "SJL_Digitalisation_Logistique.pptx";
const THEME = {
  name: "SJL Logistique",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "0B1F3A", lt1: "FFFFFF", dk2: "44546A", lt2: "F2F4F7",
    accent1: "F28C28", accent2: "0B1F3A", accent3: "1F4E8C", accent4: "C9D2DD",
    accent5: "2E8B57", accent6: "D64545", hlink: "1F4E8C", folHlink: "6B7A90",
  },
};
const HEX = { navy: "0B1F3A", orange: "F28C28", white: "FFFFFF", sky: "A9C1E0", green: "2E8B57" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "La digitalisation de la fonction logistique au sein de SJL Group";
pres.subject = "ENCG – Module Digital Skills";
pres.author = "Étudiants ENCG – 1re année";
const C = pres.SchemeColor;
const W = 13.333, MX = 0.6, CW = W - 2 * MX;

// ---------- icons ----------
const iconCache = {};
async function icon(name, hex) {
  const k = name + hex;
  if (!iconCache[k]) {
    const svg = RDS.renderToStaticMarkup(React.createElement(fa[name], { color: "#" + hex, size: 256 }));
    const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
    iconCache[k] = "image/png;base64," + buf.toString("base64");
  }
  return iconCache[k];
}
const shadow = () => ({ type: "outer", color: "0B1F3A", opacity: 0.14, blur: 8, offset: 3, angle: 90 });

// ---------- layouts ----------
function frame(name, bg, dark) {
  pres.defineSlideMaster({
    title: name,
    background: { color: bg },
    objects: [
      { placeholder: { options: { name: "kicker", type: "body", x: MX, y: 0.32, w: 9, h: 0.34, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2, margin: 0, valign: "middle" }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.66, w: CW, h: 0.8, fontSize: 32, bold: true, color: dark ? C.background1 : C.text1, margin: 0, valign: "middle", align: "left" }, text: "" } },
      { text: { text: "SJL Group · Digitalisation de la fonction logistique", options: { x: MX, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: dark ? C.accent4 : C.text2, margin: 0 } } },
    ],
    slideNumber: { x: 12.23, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: dark ? C.accent4 : C.text2, align: "right", margin: 0 },
  });
}
frame("CONTENT_LIGHT", "FFFFFF", false);
frame("CONTENT_GREY", "F2F4F7", false);
frame("CONTENT_DARK", "0B1F3A", true);
pres.defineSlideMaster({ title: "COVER", background: { color: "0B1F3A" }, objects: [] });

// ---------- helpers ----------
function T(slide, text, o) { slide.addText(text, Object.assign({ isTextBox: true, margin: 0, fontSize: 14, color: C.text2, valign: "top" }, o)); }
function card(slide, x, y, w, h, fill, name, noShadow) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: fill, width: 0 }, shadow: noShadow ? undefined : shadow(), objectName: name });
}
async function circIcon(slide, x, y, d, fill, ic, icHex, name) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: name + "_c" });
  const p = d * 0.27;
  slide.addImage({ data: await icon(ic, icHex), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, objectName: name + "_i", altText: "" });
}
function src(slide, text, dark) { T(slide, text, { x: MX, y: 6.6, w: CW, h: 0.28, fontSize: 10, italic: true, color: dark ? C.accent4 : C.text2 }); }
function head(slide, kicker, title) {
  slide.addText(kicker, { placeholder: "kicker" });
  slide.addText(title, { placeholder: "title" });
}

(async () => {
  // =============== 1. COVER ===============
  pres.addSection({ title: "Ouverture" });
  let s = pres.addSlide({ masterName: "COVER", sectionTitle: "Ouverture" });
  s.addImage({ path: "img/cover.png", x: 0, y: 0, w: W, h: 7.5, objectName: "!!coverImage", altText: "Camion moderne connecté devant un port à conteneurs au crépuscule, avec un réseau de données au-dessus" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 0.8, w: 3.55, h: 0.42, rectRadius: 0.21, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: "badge" });
  T(s, "ÉTUDE DE CAS · SJL GROUP", { x: 0.7, y: 0.8, w: 3.55, h: 0.42, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", charSpacing: 2 });
  T(s, "La digitalisation de la fonction logistique au sein de SJL Group", { x: 0.7, y: 1.55, w: 6.6, h: 2.3, fontSize: 38, bold: true, color: C.background1, fontFace: "Arial", valign: "bottom", objectName: "coverTitle" });
  T(s, "Évolution des méthodes de travail, technologies utilisées et perspectives de l'intelligence artificielle", { x: 0.7, y: 4.05, w: 5.7, h: 1.0, fontSize: 18, color: C.accent4 });
  T(s, [
    { text: "ENCG · Module Digital Skills · 1re année", options: { bold: true, color: C.accent1, breakLine: true } },
    { text: "Réalisé par : [Noms des étudiants]", options: { breakLine: true } },
    { text: "Encadré par : [Nom de l'enseignant(e)]", options: { breakLine: true } },
    { text: "Année universitaire 2026 – 2027" },
  ], { x: 0.7, y: 5.45, w: 6.0, h: 1.4, fontSize: 14, color: C.background1, paraSpaceAfter: 3 });
  s.addNotes("Bonjour à toutes et à tous. Notre présentation porte sur la digitalisation de la fonction logistique au sein de SJL Group, une entreprise de transport international et de logistique basée à Tanger.\n\nNous allons voir comment les méthodes de travail ont évolué, quelles technologies sont utilisées aujourd'hui, et quelles perspectives l'intelligence artificielle peut offrir.\n\nL'image illustre notre sujet : un camion, un port, et au-dessus un réseau de données. C'est exactement le lien entre transport physique et numérique.\n\n(À compléter : noms des étudiants et de l'enseignant.)");

  // =============== 2. INTRODUCTION ===============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Ouverture" });
  head(s, "INTRODUCTION", "Pourquoi digitaliser la logistique ?");
  T(s, "Contexte", { x: MX, y: 1.7, w: 6, h: 0.4, fontSize: 20, bold: true, color: C.text1, fontFace: "Arial" });
  const ctx = [
    ["FaEarthEurope", "Les flux Europe – Afrique exigent rapidité, fiabilité et transparence."],
    ["FaMobileScreen", "Les clients veulent suivre leurs marchandises en temps réel."],
    ["FaLaptopCode", "Le numérique change la façon de planifier, suivre et décider."],
  ];
  for (let i = 0; i < 3; i++) {
    const y = 2.25 + i * 0.72;
    await circIcon(s, MX, y, 0.55, C.accent2, ctx[i][0], HEX.white, "ctx" + i);
    T(s, ctx[i][1], { x: MX + 0.75, y, w: 5.5, h: 0.55, fontSize: 15, valign: "middle" });
  }
  T(s, "Objectifs", { x: MX, y: 4.5, w: 6, h: 0.4, fontSize: 20, bold: true, color: C.text1, fontFace: "Arial" });
  const obj = ["Comprendre le rôle de la logistique", "Analyser les outils numériques de SJL", "Explorer le potentiel de l'IA"];
  for (let i = 0; i < 3; i++) {
    const x = MX + i * 2.12;
    card(s, x, 5.05, 1.97, 1.3, "F2F4F7", "obj" + i, true);
    T(s, String(i + 1).padStart(2, "0"), { x: x + 0.18, y: 5.17, w: 1, h: 0.4, fontSize: 20, bold: true, color: C.accent1, fontFace: "Arial" });
    T(s, obj[i], { x: x + 0.18, y: 5.6, w: 1.65, h: 0.68, fontSize: 14, bold: true, color: C.text1 });
  }
  s.addImage({ path: "img/control.png", x: 7.25, y: 1.7, w: 5.48, h: 3.0, sizing: { type: "cover", w: 5.48, h: 3.0 }, objectName: "!!heroImage", altText: "Salle de contrôle logistique : écrans de suivi d'itinéraires, de volumes et de statuts" });
  card(s, 7.25, 4.9, 5.48, 1.45, "0B1F3A", "problem");
  T(s, "PROBLÉMATIQUE", { x: 7.5, y: 5.02, w: 5, h: 0.3, fontSize: 12, bold: true, color: C.accent1, charSpacing: 2 });
  T(s, "Comment la digitalisation transforme-t-elle la logistique de SJL Group, et quelle place l'IA peut-elle occuper demain ?", { x: 7.5, y: 5.35, w: 5.05, h: 0.9, fontSize: 16, bold: true, color: C.background1 });
  s.addNotes("La logistique est au cœur d'une entreprise de transport : sans organisation, un camion part vide, arrive en retard ou perd des documents.\n\nAujourd'hui, les clients veulent savoir à tout moment où se trouve leur marchandise. Le numérique devient donc indispensable.\n\nNos trois objectifs : comprendre le rôle de la logistique, analyser les outils numériques de SJL, puis explorer le potentiel de l'IA.\n\nNotre problématique : comment la digitalisation transforme-t-elle la logistique de SJL Group, et quelle place l'IA peut-elle occuper demain ?\n\nNote : le document Word de référence n'a pas été fourni ; le contenu s'appuie sur les sources publiques citées en fin de présentation.");

  // =============== 3. COMPANY ===============
  pres.addSection({ title: "L'entreprise" });
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "L'entreprise" });
  head(s, "PRÉSENTATION DE L'ENTREPRISE", "SJL Group : un acteur du corridor Europe – Afrique");
  card(s, MX, 1.7, 4.55, 4.75, "0B1F3A", "!!navyPanel");
  T(s, "Repères historiques", { x: MX + 0.3, y: 1.9, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.background1, fontFace: "Arial" });
  const tl = [
    ["1948 – 1949", "Création en Espagne de Transportes San José et Transportes López"],
    ["1986", "Début de l'activité au Maroc (Tremsa, future SJL Maghreb)"],
    ["2002", "Fusion : naissance du Groupe San José & López (SJL)"],
    ["Aujourd'hui", "Siège à Tanger, liaisons Europe – Maroc – Tunisie"],
  ];
  s.addShape(pres.shapes.LINE, { x: MX + 0.42, y: 2.55, w: 0, h: 3.3, line: { color: C.accent4, width: 1.5 }, objectName: "tlLine" });
  for (let i = 0; i < 4; i++) {
    const y = 2.45 + i * 1.0;
    s.addShape(pres.shapes.OVAL, { x: MX + 0.32, y: y + 0.06, w: 0.2, h: 0.2, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 } });
    T(s, tl[i][0], { x: MX + 0.75, y, w: 3.6, h: 0.32, fontSize: 15, bold: true, color: C.accent1 });
    T(s, tl[i][1], { x: MX + 0.75, y: y + 0.32, w: 3.65, h: 0.6, fontSize: 14, color: C.background1 });
  }
  const svc = [
    ["FaTruckFast", "Transport international", "Camions complets (FTL) et groupage entre l'Europe et l'Afrique du Nord."],
    ["FaWarehouse", "Logistique & entreposage", "Centres à Tanger Med, Tanger Automotive City et zone franche de Tanger."],
    ["FaFileSignature", "Transit & douane", "Prise en charge des formalités d'import et d'export."],
    ["FaRoute", "Transport national", "Transport domestique et distribution au Maroc."],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 5.45 + (i % 2) * 3.7, y = 1.7 + Math.floor(i / 2) * 1.75;
    card(s, x, y, 3.58, 1.6, "FFFFFF", "svc" + i);
    await circIcon(s, x + 0.22, y + 0.25, 0.6, C.accent2, svc[i][0], HEX.white, "svcI" + i);
    T(s, svc[i][1], { x: x + 1.0, y: y + 0.22, w: 2.45, h: 0.4, fontSize: 16, bold: true, color: C.text1 });
    T(s, svc[i][2], { x: x + 1.0, y: y + 0.62, w: 2.45, h: 0.85, fontSize: 14 });
  }
  const facts = [["Tanger", "Siège du groupe"], ["Europe ↔ Afrique", "Corridor principal"], ["Automobile", "Secteur clé servi"]];
  const fw = [1.8, 2.9, 2.28];
  for (let i = 0, x = 5.45; i < 3; x += fw[i] + 0.15, i++) {
    card(s, x, 5.25, fw[i], 1.2, "FFFFFF", "fact" + i);
    T(s, facts[i][0], { x: x + 0.2, y: 5.37, w: fw[i] - 0.3, h: 0.5, fontSize: 18, bold: true, color: C.accent1, fontFace: "Arial" });
    T(s, facts[i][1], { x: x + 0.2, y: 5.88, w: fw[i] - 0.3, h: 0.4, fontSize: 14 });
  }
  src(s, "Sources : sjl-group.com (Histoire ; Nos services ; Centres logistiques) ; Mediterrania Capital Partners (2017) ; page LinkedIn SJL.");
  s.addNotes("SJL, c'est le Groupe San José & López. Ses racines sont espagnoles : deux transporteurs créés en 1948 et 1949, qui ont fusionné en 2002.\n\nLe groupe est présent au Maroc depuis 1986 et son siège est aujourd'hui à Tanger. Sa spécialité : le transport routier international entre l'Europe et l'Afrique du Nord, notamment pour le secteur automobile.\n\nSes activités : transport international en camion complet ou en groupage, logistique et entreposage à Tanger Med et Tanger Automotive City, transit et douane, et transport national.\n\nÀ savoir : en 2024, le Conseil de la concurrence a publié un communiqué sur un projet de rachat de SJL Maghreb SA par la société The Capital Global Services Fintech SL. Nous ne donnons pas de chiffres d'affaires, car ils ne sont pas publiés de façon fiable.");

  // =============== 4. LOGISTICS OPERATIONS ===============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "L'entreprise" });
  head(s, "LA FONCTION LOGISTIQUE", "Les opérations logistiques et le flux des marchandises");
  T(s, [
    { text: "Pour un transporteur, la logistique garantit ", options: {} },
    { text: "le bon produit, au bon endroit, au bon moment, au meilleur coût.", options: { bold: true, color: C.text1 } },
  ], { x: MX, y: 1.62, w: CW, h: 0.45, fontSize: 17 });
  const steps = [
    ["FaClipboardList", "Commande & planification", "Demande du client, choix du camion et de l'itinéraire."],
    ["FaTruckRampBox", "Enlèvement", "Chargement chez le fournisseur ou à l'usine."],
    ["FaBoxesStacked", "Stockage & préparation", "Réception en entrepôt, stockage, préparation des envois."],
    ["FaShip", "Transport & douane", "Trajet routier, traversée maritime, formalités douanières."],
    ["FaHandshake", "Livraison & suivi", "Remise au client, preuve de livraison, facturation."],
  ];
  const sw = 2.13, sg = (CW - 5 * sw) / 4;
  for (let i = 0; i < 5; i++) {
    const x = MX + i * (sw + sg), g = `anim${i + 1}_`;
    card(s, x, 2.4, sw, 2.75, "F2F4F7", g + "card", true);
    await circIcon(s, x + 0.2, 2.6, 0.62, i === 4 ? C.accent1 : C.accent2, steps[i][0], HEX.white, g + "ic");
    T(s, String(i + 1), { x: x + sw - 0.6, y: 2.6, w: 0.4, h: 0.5, fontSize: 26, bold: true, color: C.accent4, align: "right", fontFace: "Arial", objectName: g + "n" });
    T(s, steps[i][1], { x: x + 0.2, y: 3.38, w: sw - 0.35, h: 0.62, fontSize: 16, bold: true, color: C.text1, objectName: g + "t" });
    T(s, steps[i][2], { x: x + 0.2, y: 4.02, w: sw - 0.35, h: 1.05, fontSize: 14, objectName: g + "d" });
    if (i < 4) s.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: x + sw + sg / 2 - 0.08, y: 3.67, w: 0.2, h: 0.2, rotate: 90, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: g + "arrow" });
  }
  const flux = [["FaBoxOpen", "Flux physique", "les marchandises"], ["FaCircleNodes", "Flux d'information", "documents, statuts, suivi"], ["FaCoins", "Flux financier", "facturation, paiements"]];
  for (let i = 0; i < 3; i++) {
    const x = MX + i * 4.12, g = "anim6_";
    card(s, x, 5.5, 3.88, 0.88, i === 1 ? "0B1F3A" : "FFFFFF", g + "f" + i);
    if (i !== 1) s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.5, w: 3.88, h: 0.88, rectRadius: 0.08, fill: { color: "FFFFFF", transparency: 100 }, line: { color: "C9D2DD", width: 1 }, objectName: g + "fl" + i });
    await circIcon(s, x + 0.2, 5.65, 0.58, i === 1 ? C.accent1 : C.accent2, flux[i][0], HEX.white, g + "fi" + i);
    T(s, [{ text: flux[i][1], options: { bold: true, breakLine: true, color: i === 1 ? C.background1 : C.text1 } }, { text: flux[i][2], options: { color: i === 1 ? C.accent4 : C.text2 } }], { x: x + 0.95, y: 5.58, w: 2.8, h: 0.72, fontSize: 14, valign: "middle", objectName: g + "ft" + i });
  }
  s.addNotes("La logistique, c'est organiser le parcours d'une marchandise du fournisseur jusqu'au client : le bon produit, au bon endroit, au bon moment, au meilleur coût.\n\n[clic] Étape 1 : on reçoit la commande et on planifie le camion et l'itinéraire. [clic] Étape 2 : l'enlèvement, c'est-à-dire le chargement. [clic] Étape 3 : stockage et préparation en entrepôt. [clic] Étape 4 : le transport, avec pour SJL la traversée du détroit et la douane. [clic] Étape 5 : la livraison et le suivi.\n\n[clic] Trois flux circulent en parallèle : physique, d'information et financier. C'est surtout le flux d'information que la digitalisation transforme.");

  // =============== 5. TRADITIONAL ===============
  pres.addSection({ title: "Transformation" });
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Transformation" });
  head(s, "AVANT LE NUMÉRIQUE", "La logistique traditionnelle");
  s.addImage({ path: "img/paper.png", x: MX, y: 1.7, w: 5.6, h: 4.2, objectName: "!!heroImage", altText: "Bureau logistique traditionnel : classeurs, bons de livraison papier, téléphone fixe et calendrier" });
  T(s, "Description générale du secteur, avant les outils numériques", { x: MX, y: 6.02, w: 5.6, h: 0.3, fontSize: 12, italic: true });
  const trad = [
    ["FaFileLines", "Documents papier", "Lettres de voiture, bons de livraison et documents douaniers imprimés."],
    ["FaPhone", "Téléphone et fax", "L'information circule lentement entre client, agence et chauffeur."],
    ["FaKeyboard", "Saisie manuelle", "Données recopiées dans des registres ou des tableurs isolés."],
    ["FaMapLocationDot", "Suivi limité", "Pour localiser un camion, il faut appeler le chauffeur."],
  ];
  for (let i = 0; i < 4; i++) {
    const y = 1.7 + i * 0.93;
    await circIcon(s, 6.65, y + 0.05, 0.6, C.accent4, trad[i][0], HEX.navy, "tr" + i);
    T(s, [{ text: trad[i][1], options: { bold: true, color: C.text1, fontSize: 16, breakLine: true } }, { text: trad[i][2] }], { x: 7.45, y, w: 5.28, h: 0.8, fontSize: 14 });
  }
  card(s, 6.65, 5.5, 6.08, 0.95, "FDEBD9", "conseq", true);
  await circIcon(s, 6.85, 5.66, 0.62, C.accent1, "FaTriangleExclamation", HEX.white, "cq");
  T(s, [{ text: "Conséquences : ", options: { bold: true, color: C.text1 } }, { text: "erreurs de saisie, retards d'information et faible visibilité pour le client." }], { x: 7.65, y: 5.55, w: 4.95, h: 0.85, fontSize: 15, valign: "middle" });
  s.addNotes("Avant le numérique, la logistique reposait sur le papier et le téléphone.\n\nLes documents de transport étaient imprimés et classés. Les informations passaient par téléphone ou fax. Les données étaient recopiées à la main, ce qui crée des erreurs. Et pour savoir où était un camion, il fallait appeler le chauffeur.\n\nRésultat : erreurs, retards d'information et peu de visibilité pour le client.\n\nAttention : c'est une description générale du secteur, pas une description détaillée de SJL dans le passé.");

  // =============== 6. BEFORE / AFTER ===============
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Transformation" });
  head(s, "TRANSFORMATION", "Avant / après la digitalisation");
  const cx0 = MX, cw0 = 2.35, cxA = 3.15, cwA = 4.5, cxB = 8.23, cwB = 4.5;
  card(s, cxA, 1.65, cwA, 0.62, "C9D2DD", "hA", true);
  await circIcon(s, cxA + 0.15, 1.71, 0.5, C.background1, "FaFileLines", HEX.navy, "hAi");
  T(s, "AVANT · méthodes traditionnelles", { x: cxA + 0.8, y: 1.65, w: 3.6, h: 0.62, fontSize: 15, bold: true, color: C.text1, valign: "middle" });
  card(s, cxB, 1.65, cwB, 0.62, "0B1F3A", "hB", true);
  await circIcon(s, cxB + 0.15, 1.71, 0.5, C.accent1, "FaLaptop", HEX.white, "hBi");
  T(s, "APRÈS · méthodes digitales", { x: cxB + 0.8, y: 1.65, w: 3.6, h: 0.62, fontSize: 15, bold: true, color: C.background1, valign: "middle" });
  const rows = [
    ["Documents", "Papier, classeurs, archives physiques", "Documents numériques partagés en ligne"],
    ["Suivi des camions", "Appels téléphoniques au chauffeur", "Géolocalisation GPS en temps réel"],
    ["Planification", "Tableaux manuels, expérience individuelle", "Planification centralisée dans un TMS"],
    ["Information client", "Réponse tardive, peu de visibilité", "Suivi des envois et alertes rapides"],
    ["Décision", "Basée surtout sur l'intuition", "Basée sur les données et tableaux de bord"],
  ];
  for (let i = 0; i < 5; i++) {
    const y = 2.42 + i * 0.83, g = `anim${i + 1}_`;
    T(s, rows[i][0], { x: cx0, y, w: cw0, h: 0.7, fontSize: 16, bold: true, color: C.text1, valign: "middle", objectName: g + "l" });
    card(s, cxA, y, cwA, 0.7, "FFFFFF", g + "a", true);
    T(s, rows[i][1], { x: cxA + 0.25, y, w: cwA - 0.4, h: 0.7, fontSize: 14, valign: "middle", objectName: g + "at" });
    await circIcon(s, 7.78 - 0.04, y + 0.17, 0.36, C.accent1, "FaArrowRight", HEX.white, g + "ar");
    card(s, cxB, y, cwB, 0.7, "FFFFFF", g + "b");
    T(s, rows[i][2], { x: cxB + 0.25, y, w: cwB - 0.4, h: 0.7, fontSize: 14, bold: true, color: C.accent3, valign: "middle", objectName: g + "bt" });
  }
  src(s, "Comparaison générale du secteur, illustrée par les outils présentés dans les slides suivantes. Source : IBM – Supply chain management ; TMS.");
  s.addNotes("Cette comparaison résume la transformation.\n\n[clic] Les documents passent du papier au numérique. [clic] Le suivi des camions passe du téléphone au GPS en temps réel. [clic] La planification se fait dans un logiciel, le TMS. [clic] Le client est informé plus vite. [clic] Et surtout, les décisions s'appuient sur des données et non plus seulement sur l'intuition.\n\nMessage clé : la digitalisation ne change pas le métier — transporter des marchandises — elle change la manière de l'organiser.");

  // =============== 7. TECH FOUNDATION ===============
  pres.addSection({ title: "Technologies" });
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Technologies" });
  head(s, "SOCLE TECHNOLOGIQUE", "Cinq technologies au cœur de la logistique moderne");
  const tech = [
    ["FaCloud", "Cloud Computing", "Utiliser des logiciels et des données via Internet.", "Accéder au même outil depuis toutes les agences."],
    ["FaDatabase", "Big Data", "Analyser de très grands volumes de données.", "Étudier l'historique des délais par itinéraire."],
    ["FaTowerBroadcast", "IoT", "Des objets connectés envoient des données.", "Un capteur mesure la température d'une remorque."],
    ["FaBrain", "Intelligence artificielle", "Des systèmes apprennent à partir des données.", "Prévoir un retard avant qu'il arrive."],
    ["FaShieldHalved", "Cybersécurité", "Protéger les systèmes et les données.", "Bloquer un accès frauduleux au système de suivi."],
  ];
  const tw = 2.25, tg = (CW - 5 * tw) / 4;
  for (let i = 0; i < 5; i++) {
    const x = MX + i * (tw + tg), g = `anim${i + 1}_`;
    card(s, x, 1.7, tw, 4.05, "13315C", g + "c", true);
    await circIcon(s, x + 0.22, 1.92, 0.7, C.accent1, tech[i][0], HEX.white, g + "i");
    T(s, tech[i][1], { x: x + 0.22, y: 2.78, w: tw - 0.4, h: 0.65, fontSize: 17, bold: true, color: C.background1, valign: "middle", objectName: g + "n" });
    T(s, tech[i][2], { x: x + 0.22, y: 3.48, w: tw - 0.4, h: 0.95, fontSize: 14, color: C.background1, objectName: g + "d" });
    T(s, [{ text: "Exemple", options: { bold: true, color: C.accent1, breakLine: true } }, { text: tech[i][3], options: { color: C.accent4 } }], { x: x + 0.22, y: 4.45, w: tw - 0.4, h: 1.2, fontSize: 14, objectName: g + "e" });
  }
  card(s, MX, 5.95, CW, 0.55, "F28C28", "anim6_base", true);
  T(s, "Socle commun : les DONNÉES — collectées, partagées, analysées et protégées", { x: MX, y: 5.95, w: CW, h: 0.55, fontSize: 16, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "anim6_baseT" });
  src(s, "Technologies générales du secteur ; leur usage chez SJL n'est pas confirmé publiquement (sauf outils de la slide 9). Sources : IBM ; DHL.", true);
  s.addNotes("Voici les cinq technologies qui forment le socle de la logistique moderne.\n\nLe Cloud permet d'utiliser un logiciel via Internet, depuis n'importe quelle agence. Le Big Data permet d'analyser de grandes quantités de données. L'IoT, l'Internet des objets, ce sont des capteurs connectés, par exemple sur une remorque. L'intelligence artificielle apprend à partir des données pour prévoir. Et la cybersécurité protège tout cet ensemble.\n\n[clic sur chaque carte, puis sur le socle] Point commun : les données. Sans données fiables, aucune de ces technologies n'est utile.\n\nAttention : ce sont des technologies générales du secteur. On ne dit pas que SJL les utilise toutes.");

  // =============== 8. DIGITAL TOOLS ===============
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Technologies" });
  head(s, "OUTILS NUMÉRIQUES", "Les outils digitaux de la logistique");
  s.addImage({ path: "img/gps.png", x: MX, y: 1.7, w: 5.2, h: 3.9, objectName: "!!heroImage", altText: "Tablette affichant une carte de suivi GPS : itinéraire, position du camion et heure d'arrivée estimée" });
  card(s, MX, 5.8, 5.2, 0.7, "FDEBD9", "toolNote", true);
  T(s, "Outils courants du secteur. Ceux confirmés chez SJL sont présentés à la slide suivante.", { x: MX + 0.2, y: 5.8, w: 4.85, h: 0.7, fontSize: 14, color: C.text1, valign: "middle" });
  const tools = [
    ["FaLocationDot", "GPS", "Localiser les véhicules en temps réel.", "prévenir le client d'un retard."],
    ["FaWifi", "RFID", "Identifier les marchandises par ondes radio.", "lire une palette à l'entrée de l'entrepôt."],
    ["FaWarehouse", "WMS", "Logiciel de gestion d'entrepôt.", "savoir où se trouve chaque palette."],
    ["FaTruck", "TMS", "Logiciel de gestion du transport.", "planifier les trajets et affecter les camions."],
    ["FaCloud", "Cloud", "Logiciels et données accessibles en ligne.", "partager un document avec client et agence."],
  ];
  for (let i = 0; i < 5; i++) {
    const y = 1.7 + i * 0.97;
    await circIcon(s, 6.2, y + 0.08, 0.62, i === 3 ? C.accent1 : C.accent2, tools[i][0], HEX.white, "tool" + i);
    T(s, [
      { text: tools[i][1] + "  ", options: { bold: true, color: C.text1, fontSize: 17 } },
      { text: tools[i][2], options: { breakLine: true } },
      { text: "Ex. : ", options: { bold: true, color: C.accent1 } },
      { text: tools[i][3], options: { italic: true } },
    ], { x: 7.0, y, w: 5.73, h: 0.82, fontSize: 14, valign: "middle" });
  }
  src(s, "Sources : IBM – Transportation management systems ; IBM – Warehouse management ; IBM – Supply chain management.");
  s.addNotes("Passons aux outils concrets.\n\nLe GPS localise les camions en temps réel : on peut prévenir un client d'un retard. La RFID identifie les marchandises grâce à des étiquettes radio, sans scanner chaque colis. Le WMS gère l'entrepôt : il sait où se trouve chaque palette. Le TMS gère le transport : il aide à planifier les trajets et à affecter les camions. Enfin, le Cloud rend ces logiciels accessibles partout.\n\nCe sont des outils courants dans le secteur. Dans la slide suivante, on regarde uniquement ceux que SJL a annoncés publiquement.");

  // =============== 9. SJL CASE ===============
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Technologies" });
  head(s, "ÉTUDE DE CAS · SJL GROUP", "Les technologies confirmées chez SJL");
  s.addImage({ path: "img/tms.png", x: MX, y: 1.7, w: 4.35, h: 3.26, objectName: "!!heroImage", altText: "Écran de logiciel TMS : indicateurs, graphique d'activité et liste de statuts des expéditions (illustration)" });
  card(s, MX, 5.15, 4.35, 1.3, "FFFFFF", "wmsNote");
  T(s, [{ text: "À noter", options: { bold: true, color: C.accent1, breakLine: true } }, { text: "La page de la plateforme SJL Tanger Med cite aussi des outils « TMS/WMS ». Leur fonctionnement détaillé n'est pas publié." }], { x: MX + 0.2, y: 5.25, w: 3.95, h: 1.12, fontSize: 14 });
  const sjl = [
    ["FaTruck", "TMS", "Transport Management System", "Planifier et suivre les opérations de transport.", "Chargements et trajets mieux organisés."],
    ["FaMicrochip", "Informatique embarquée", "Technologie à bord des camions", "Suivre les expéditions depuis le véhicule.", "Données du terrain remontées vers l'agence."],
    ["FaSatelliteDish", "Suivi GPS", "Géolocalisation en temps réel", "Localiser les envois à chaque étape.", "Traçabilité et information client rapide."],
  ];
  const kw = 2.38, kx0 = 5.25, kg = (W - MX - kx0 - 3 * kw) / 2;
  for (let i = 0; i < 3; i++) {
    const x = kx0 + i * (kw + kg), g = `anim${i + 1}_`;
    card(s, x, 1.7, kw, 4.75, "FFFFFF", g + "c");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.2, y: 1.88, w: 1.42, h: 0.34, rectRadius: 0.17, fill: { color: C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: g + "bdg" });
    T(s, "✓ CONFIRMÉ", { x: x + 0.2, y: 1.88, w: 1.42, h: 0.34, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle", objectName: g + "bdgT" });
    await circIcon(s, x + 0.2, 2.42, 0.7, C.accent2, sjl[i][0], HEX.white, g + "i");
    T(s, [{ text: sjl[i][1], options: { bold: true, fontSize: 18, color: C.text1, breakLine: true } }, { text: sjl[i][2], options: { fontSize: 12, italic: true } }], { x: x + 0.2, y: 3.25, w: kw - 0.35, h: 1.05, objectName: g + "n" });
    T(s, [{ text: "Rôle", options: { bold: true, color: C.accent3, breakLine: true } }, { text: sjl[i][3] }], { x: x + 0.2, y: 4.4, w: kw - 0.35, h: 0.95, fontSize: 14, objectName: g + "r" });
    T(s, [{ text: "Bénéfice", options: { bold: true, color: C.accent1, breakLine: true } }, { text: sjl[i][4] }], { x: x + 0.2, y: 5.4, w: kw - 0.35, h: 0.95, fontSize: 14, objectName: g + "b" });
  }
  src(s, "Sources : sjl-group.com (Transport en groupage ; Transport FTL) ; offre.sjl-group.com (plateforme SJL Tanger Med) ; offre d'emploi SJL publiée sur LinkedIn.");
  s.addNotes("Voici le cœur de notre étude : les technologies que SJL annonce publiquement.\n\n[clic] Le TMS, logiciel de gestion du transport : il sert à planifier et suivre les opérations. Il est cité sur la page de la plateforme Tanger Med et dans une offre d'emploi SJL.\n\n[clic] L'informatique embarquée : SJL indique que ses camions sont équipés d'une technologie embarquée pour suivre les expéditions.\n\n[clic] Le suivi GPS et la géolocalisation : SJL les présente comme un avantage de traçabilité et de suivi en temps réel.\n\nÀ noter : la page Tanger Med mentionne aussi un WMS, mais SJL ne détaille pas son fonctionnement. Nous restons donc prudents. L'écran à gauche est une illustration, pas une capture du logiciel de SJL.");

  // =============== 10. AI ===============
  pres.addSection({ title: "Perspectives" });
  s = pres.addSlide({ masterName: "CONTENT_LIGHT", sectionTitle: "Perspectives" });
  head(s, "PERSPECTIVES", "L'intelligence artificielle : un potentiel pour demain");
  s.addImage({ path: "img/ai.png", x: MX, y: 1.7, w: 4.6, h: 3.45, objectName: "!!heroImage", altText: "Réseau de neurones alimentant une courbe de prévision avec zone d'incertitude" });
  card(s, MX, 5.3, 4.6, 1.15, "F2F4F7", "legend", true);
  T(s, [
    { text: "✓ Confirmé chez SJL : ", options: { bold: true, color: C.accent5 } }, { text: "TMS, informatique embarquée, GPS", options: { breakLine: true } },
    { text: "◇ Potentiel : ", options: { bold: true, color: C.accent1 } }, { text: "applications d'IA ci-contre" },
  ], { x: MX + 0.2, y: 5.38, w: 4.3, h: 1.0, fontSize: 14, valign: "middle", paraSpaceAfter: 4 });
  const ai = [
    ["FaChartLine", "Analyse prédictive", "Anticiper un retard : trafic, attente au port, météo."],
    ["FaRoute", "Optimisation des itinéraires", "Choisir le trajet le plus rapide et le moins coûteux."],
    ["FaCalendarCheck", "Prévision de la demande", "Prévoir les volumes pour réserver camions et espace."],
    ["FaRobot", "Automatisation", "Lire les documents automatiquement, répondre aux clients (chatbot)."],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 5.55 + (i % 2) * 3.65, y = 1.7 + Math.floor(i / 2) * 2.4, g = `anim${i + 1}_`;
    card(s, x, y, 3.53, 2.25, "FFFFFF", g + "c", true);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.53, h: 2.25, rectRadius: 0.08, fill: { color: "FFFFFF", transparency: 100 }, line: { color: "F28C28", width: 1.25, dashType: "dash" }, objectName: g + "o" });
    await circIcon(s, x + 0.22, y + 0.22, 0.62, C.accent1, ai[i][0], HEX.white, g + "i");
    T(s, "POTENTIEL", { x: x + 2.2, y: y + 0.3, w: 1.15, h: 0.3, fontSize: 11, bold: true, color: C.accent1, align: "right", charSpacing: 1, objectName: g + "p" });
    T(s, ai[i][1], { x: x + 0.22, y: y + 0.98, w: 3.15, h: 0.42, fontSize: 17, bold: true, color: C.text1, objectName: g + "n" });
    T(s, ai[i][2], { x: x + 0.22, y: y + 1.4, w: 3.15, h: 0.75, fontSize: 14, objectName: g + "d" });
  }
  src(s, "Applications possibles, non annoncées par SJL. Sources : IBM – Supply chain management ; DHL (publications sur les tendances logistiques).");
  s.addNotes("L'intelligence artificielle est une perspective. Nous n'avons trouvé aucune source publique indiquant que SJL utilise l'IA aujourd'hui. Ce sont donc des pistes possibles.\n\n[clic] L'analyse prédictive : anticiper un retard grâce aux données de trafic, d'attente au port ou de météo. [clic] L'optimisation des itinéraires : choisir le trajet le plus rapide et le moins coûteux. [clic] La prévision de la demande : prévoir les volumes pour réserver à l'avance les camions et l'espace d'entrepôt. [clic] L'automatisation : lire automatiquement les documents ou répondre aux clients avec un chatbot.\n\nPoint important : l'IA aurait besoin des données déjà produites par le TMS et le GPS. Les outils actuels de SJL sont donc une base pour l'IA de demain.");

  // =============== 11. BENEFITS / CHALLENGES / RECO ===============
  s = pres.addSlide({ masterName: "CONTENT_GREY", sectionTitle: "Perspectives" });
  head(s, "BILAN", "Bénéfices, défis et recommandations");
  const cols = [
    ["FaCircleCheck", "Bénéfices", C.accent5, "2E8B57", [["Efficacité", "moins de tâches manuelles"], ["Réduction des coûts", "trajets et temps mieux utilisés"], ["Traçabilité", "suivi des envois en temps réel"], ["Service client", "information plus rapide"]]],
    ["FaTriangleExclamation", "Défis", C.accent1, "F28C28", [["Cybersécurité", "protéger données et systèmes"], ["Investissement", "coût des logiciels et équipements"], ["Compétences", "besoin de former le personnel"], ["Changement", "résistance et qualité des données"]]],
    ["FaLightbulb", "Recommandations", C.accent2, "0B1F3A", [["Former", "les employés aux outils numériques"], ["Sécuriser", "accès, sauvegardes, sensibilisation"], ["Tester l'IA", "par petits projets pilotes"], ["Exploiter", "les données du TMS et du GPS"]]],
  ];
  const bw = 3.88, bg = (CW - 3 * bw) / 2;
  for (let i = 0; i < 3; i++) {
    const x = MX + i * (bw + bg), g = `anim${i + 1}_`;
    card(s, x, 1.7, bw, 4.75, "FFFFFF", g + "c");
    await circIcon(s, x + 0.25, 1.92, 0.66, cols[i][2], cols[i][0], HEX.white, g + "i");
    T(s, cols[i][1], { x: x + 1.1, y: 1.92, w: bw - 1.3, h: 0.66, fontSize: 20, bold: true, color: C.text1, valign: "middle", fontFace: "Arial", objectName: g + "h" });
    const items = cols[i][4];
    for (let j = 0; j < 4; j++) {
      const y = 2.85 + j * 0.88;
      s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.1, w: 0.14, h: 0.14, fill: { color: cols[i][2] }, line: { color: cols[i][2], width: 0 }, objectName: g + "dot" + j });
      T(s, [{ text: items[j][0], options: { bold: true, color: C.text1, breakLine: true } }, { text: items[j][1] }], { x: x + 0.6, y, w: bw - 0.8, h: 0.78, fontSize: 15, objectName: g + "t" + j });
    }
  }
  src(s, "Bénéfices et défis : analyse générale du secteur (IBM). Recommandations : propositions du groupe d'étudiants.");
  s.addNotes("Faisons le bilan.\n\n[clic] Les bénéfices : plus d'efficacité, moins de coûts grâce à des trajets mieux organisés, une meilleure traçabilité et un client mieux informé.\n\n[clic] Les défis : la cybersécurité, car plus de données signifie plus de risques ; le coût des investissements ; le besoin de compétences ; et la résistance au changement.\n\n[clic] Nos recommandations : former les employés, renforcer la cybersécurité, tester l'IA par petits projets pilotes, et mieux exploiter les données déjà produites par le TMS et le GPS.\n\nCes recommandations sont nos propositions, pas des projets annoncés par SJL.");

  // =============== 12. CONCLUSION & REFERENCES ===============
  pres.addSection({ title: "Conclusion" });
  s = pres.addSlide({ masterName: "CONTENT_DARK", sectionTitle: "Conclusion" });
  head(s, "CONCLUSION", "Ce qu'il faut retenir");
  const keys = [
    "La digitalisation remplace le papier et le téléphone par des données en temps réel.",
    "SJL annonce publiquement un TMS, l'informatique embarquée et le suivi GPS.",
    "L'IA est une piste d'avenir, à construire avec formation et cybersécurité.",
  ];
  for (let i = 0; i < 3; i++) {
    const y = 1.75 + i * 1.3;
    T(s, String(i + 1).padStart(2, "0"), { x: MX, y, w: 0.9, h: 0.7, fontSize: 34, bold: true, color: C.accent1, fontFace: "Arial" });
    T(s, keys[i], { x: MX + 1.0, y: y + 0.05, w: 4.75, h: 1.0, fontSize: 17, color: C.background1 });
  }
  T(s, "Merci de votre attention — Questions ?", { x: MX, y: 5.85, w: 5.8, h: 0.5, fontSize: 20, bold: true, color: C.accent1, fontFace: "Arial" });
  card(s, 6.75, 1.7, 5.98, 4.8, "13315C", "refs", true);
  T(s, "Références (liens cliquables)", { x: 6.97, y: 1.82, w: 5.5, h: 0.36, fontSize: 15, bold: true, color: C.background1 });
  const refs = [
    ["SJL Group – Site officiel", "https://sjl-group.com/"],
    ["SJL Group – History and highlights", "https://sjl-group.com/en/history"],
    ["SJL Group – Nos services transport et logistique", "https://sjl-group.com/fr/nos-services-transport-et-logistique"],
    ["SJL Group – Transport en groupage (suivi GPS)", "https://sjl-group.com/fr/transport-en-groupage"],
    ["SJL Group – Transport FTL (technologie embarquée)", "https://sjl-group.com/fr/transport-ftl"],
    ["SJL Group – Centres logistiques", "https://www.sjl-group.com/fr/centres-logistiques"],
    ["SJL – Plateforme logistique Tanger Med (TMS/WMS)", "https://offre.sjl-group.com/fr/fr/5-raisons-de-choisir-la-plateforme-logistique-sjl-medhub-0"],
    ["SJL – Page LinkedIn officielle", "https://www.linkedin.com/company/sjlofficiel"],
    ["Conseil de la concurrence – Communiqué SJL Maghreb SA", "https://conseil-concurrence.ma/communique-du-conseil-de-la-concurrence-relatif-au-projet-de-concentration-economique-qui-concerne-la-prise-du-controle-exclusif-par-la-societe-the-capital-global-services-fintech-sl-de/"],
    ["Mediterrania Capital Partners – Cession de SJL (2017)", "https://www.mcapitalp.com/wp-content/uploads/2017-04-10-Mediterrania-Capital-Partners-exits-SJL_EN-V5-FINAL-Mediterrania.pdf"],
    ["IBM – What is supply chain management?", "https://www.ibm.com/think/topics/supply-chain-management"],
    ["IBM – Transportation management systems", "https://www.ibm.com/think/topics/transportation-management-systems"],
    ["IBM – Warehouse management", "https://www.ibm.com/think/topics/warehouse-management"],
    ["DHL – Site officiel (insights logistiques)", "https://www.dhl.com/"],
  ];
  T(s, refs.map((r, i) => ({ text: `${i + 1}. ${r[0]}`, options: { hyperlink: { url: r[1], tooltip: r[1] }, color: C.background1, breakLine: i < refs.length - 1 } })),
    { x: 6.97, y: 2.3, w: 5.6, h: 4.05, fontSize: 12, paraSpaceAfter: 3, color: C.background1 });
  src(s, "Consultation des sources : novembre 2026. Bibliographie complète fournie séparément.", true);
  s.addNotes("Pour conclure, trois idées à retenir.\n\nUn : la digitalisation remplace le papier et le téléphone par des données disponibles en temps réel.\n\nDeux : SJL annonce publiquement l'utilisation d'un TMS, d'une informatique embarquée et du suivi GPS. Ce sont des outils concrets qui améliorent la traçabilité et l'organisation.\n\nTrois : l'IA est une piste d'avenir. Elle pourrait s'appuyer sur ces données, à condition de former le personnel et de renforcer la cybersécurité.\n\nToutes nos sources sont listées ici et sont cliquables. Merci de votre attention, nous sommes prêts à répondre à vos questions.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  await addMotion(OUT, {
    // transitions: "morph" or "fade"
    transitions: { 1: "fade", 2: "fade", 3: "morph", 4: "morph", 5: "fade", 6: "morph", 7: "fade", 8: "morph", 9: "morph", 10: "fade", 11: "morph", 12: "fade" },
    // progressive appearance: click groups by objectName prefix
    anim: { 4: ["anim1_", "anim2_", "anim3_", "anim4_", "anim5_", "anim6_"], 6: ["anim1_", "anim2_", "anim3_", "anim4_", "anim5_"], 7: ["anim1_", "anim2_", "anim3_", "anim4_", "anim5_", "anim6_"], 9: ["anim1_", "anim2_", "anim3_"], 10: ["anim1_", "anim2_", "anim3_", "anim4_"], 11: ["anim1_", "anim2_", "anim3_"] },
  });
  console.log("written", OUT);
})();
