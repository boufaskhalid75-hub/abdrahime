// Rapport de projet SJL – générateur Word (docx-js). Usage: node build.js [pages.json]
const fs = require("fs");
const path = require("path");
const D = require("docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
  BorderStyle, Footer, PageNumber, PageBreak, ImageRun, TabStopType, TableLayoutType, VerticalAlign, LevelFormat,
  PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader, HeightRule } = D;

const IMG = path.join(__dirname, "img");
const PAGES = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2])) : {};

const NAVY = "1F4E79", BLUE = "2E75B6", LIGHT = "DEEAF6", ZEBRA = "F2F7FC", ACC = "8EB4E3", INK = "222222", MUTE = "666666", OR = "C55A11";
const FONT = "Calibri";
const CW = 9070; // content width (A4, 2.5 cm margins)

// ---------- inline **bold** / *italic* ----------
function runs(text, base = {}) {
  const out = [];
  String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach((s) => {
    if (!s) return;
    if (s.startsWith("**")) out.push(new TextRun({ text: s.slice(2, -2), bold: true, ...base }));
    else if (s.startsWith("*")) out.push(new TextRun({ text: s.slice(1, -1), italics: true, ...base }));
    else out.push(new TextRun({ text: s, ...base }));
  });
  return out;
}
const toc = [];
let fig = 0;
const body = [];
const add = (...x) => body.push(...x);

function H1(text, opts = {}) {
  toc.push([1, text]);
  if (!opts.noBreak) add(new Paragraph({ children: [new PageBreak()] }));
  add(new Paragraph({
    spacing: { before: 0, after: 240 }, keepNext: true,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    border: { left: { style: BorderStyle.SINGLE, size: 48, color: ACC, space: 6 } },
    indent: { left: 120, right: 1200 },
    children: [new TextRun({ text: " " + text, bold: true, color: "FFFFFF", size: 32, font: FONT })],
  }));
}
function H2(text) {
  toc.push([2, text]);
  add(new Paragraph({
    spacing: { before: 280, after: 120 }, keepNext: true,
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: BLUE, space: 8 } }, indent: { left: 160 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 26, font: FONT })],
  }));
}
function H3(text) {
  add(new Paragraph({ spacing: { before: 200, after: 80 }, keepNext: true, children: [new TextRun({ text, bold: true, color: BLUE, size: 23 })] }));
}
function P(text, o = {}) {
  add(new Paragraph({ alignment: o.align || AlignmentType.JUSTIFIED, spacing: { after: 140, line: 300 }, children: runs(text, o.run || {}) }));
}
function Note(text) {
  add(new Paragraph({ spacing: { before: 60, after: 160 }, children: runs(text, { italics: true, color: MUTE, size: 19 }) }));
}
function Bullets(items) {
  items.forEach((t) => add(new Paragraph({ numbering: { reference: "fleche", level: 0 }, spacing: { after: 80, line: 290 }, children: runs(t) })));
  add(new Paragraph({ spacing: { after: 60 }, children: [] }));
}
const bd = { style: BorderStyle.SINGLE, size: 4, color: "9DC3E6" };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
function cell(text, w, o = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders, verticalAlign: o.vAlign || VerticalAlign.TOP,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: o.fill || "FFFFFF" },
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: (Array.isArray(text) ? text : [text]).map((t) => new Paragraph({ spacing: { after: 30, line: 260 }, alignment: o.align, children: runs(t, { size: 19, color: o.color || INK, bold: o.bold }) })),
  });
}
function Tbl(headers, rows, widths, o = {}) {
  const sum = widths.reduce((a, b) => a + b, 0);
  const W = widths.map((w) => Math.round((w / sum) * CW));
  W[W.length - 1] += CW - W.reduce((a, b) => a + b, 0);
  add(new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: W, layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, W[i], { fill: NAVY, color: "FFFFFF", bold: true })) }),
      ...rows.map((r, k) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, W[i], { fill: i === 0 && o.firstCol !== false ? LIGHT : (k % 2 ? ZEBRA : "FFFFFF"), bold: i === 0 && o.firstCol !== false })) })),
    ],
  }));
  add(new Paragraph({ spacing: { after: 160 }, children: [] }));
}
function Callout(title, text) {
  add(new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA },
      borders: { left: { style: BorderStyle.SINGLE, size: 36, color: BLUE }, top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: "EAF1FB" }, margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, bold: true, color: NAVY, size: 21 })] }),
        ...(Array.isArray(text) ? text : [text]).map((t) => new Paragraph({ spacing: { after: 40, line: 280 }, children: runs(t, { size: 21 }) }))],
    })] })],
  }));
  add(new Paragraph({ spacing: { after: 160 }, children: [] }));
}
function Figure(file, wIn, caption) {
  const buf = fs.readFileSync(path.join(IMG, file));
  const { w, h } = imgSize(file);
  const wp = Math.round(wIn * 96), hp = Math.round(wp * h / w);
  fig++;
  add(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
    children: [new ImageRun({ type: file.endsWith(".png") ? "png" : "jpg", data: buf, transformation: { width: wp, height: hp }, altText: { title: caption, description: caption, name: file } })] }));
  add(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Figure ${fig} – ${caption}`, italics: true, color: MUTE, size: 18 })] }));
}
function imgSize(file) {
  const b = fs.readFileSync(path.join(IMG, file));
  if (file.endsWith(".png")) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  let i = 2; while (i < b.length) { const m = b[i + 1]; const len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }; i += 2 + len; }
}
function Tiles(items) {
  const w = Math.floor(CW / items.length);
  const W = items.map(() => w); W[W.length - 1] += CW - w * items.length;
  add(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: W, layout: TableLayoutType.FIXED, rows: [new TableRow({ children: items.map(([big, small], i) => new TableCell({
    width: { size: W[i], type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER, margins: { top: 140, bottom: 140, left: 80, right: 80 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: big, bold: true, color: NAVY, size: 34 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: small, color: MUTE, size: 17 })] })] })) })] }));
  add(new Paragraph({ spacing: { after: 160 }, children: [] }));
}
function Swot(q) {
  const half = CW / 2;
  const box = (title, color, fill, items) => new TableCell({ width: { size: half, type: WidthType.DXA }, borders, shading: { type: ShadingType.CLEAR, color: "auto", fill }, margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: [new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: title, bold: true, color, size: 23 })] }),
      ...items.map((t) => new Paragraph({ numbering: { reference: "puce", level: 0 }, spacing: { after: 40, line: 260 }, children: runs(t, { size: 19 }) }))] });
  add(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [half, half], layout: TableLayoutType.FIXED, rows: [
    new TableRow({ children: [box("Forces (internes)", "38761D", "EAF5E4", q.F), box("Faiblesses (internes)", OR, "FCEEE4", q.W)] }),
    new TableRow({ children: [box("Opportunités (externes)", NAVY, "EAF1FB", q.O), box("Menaces (externes)", "A61C1C", "F9E6E6", q.T)] }),
  ] }));
  add(new Paragraph({ spacing: { after: 160 }, children: [] }));
}

// ===================== CONTENU =====================
// --- Remerciements
H1("Remerciements", { noBreak: true });
P("Au terme de ce travail, nous tenons à exprimer notre profonde gratitude à toutes les personnes qui ont contribué, de près ou de loin, à la réalisation de ce rapport.");
P("Nous remercions tout d'abord notre encadrant(e), [Nom de l'encadrant(e)], pour son sérieux, son exigence et la qualité de son accompagnement tout au long du module Digital Skills. Ses conseils et ses remarques constructives ont été déterminants pour structurer notre réflexion et améliorer la qualité de ce travail.");
P("Nous remercions également le groupe SJL, dont les informations publiques (site officiel, documentation de services, page LinkedIn) nous ont permis de comprendre son organisation, ses métiers et les outils numériques qu'il met en œuvre.");
P("Nos remerciements s'adressent enfin aux membres de notre groupe. Leur implication, leur esprit d'équipe et leur complémentarité ont rendu cette expérience aussi enrichissante sur le plan humain que sur le plan académique.");
P("À toutes et à tous, nous disons sincèrement merci.");

// --- Résumé
H1("Résumé");
P("Ce rapport présente un projet réalisé dans le cadre du module **Digital Skills** sur la **digitalisation de la fonction logistique au sein de SJL Group**, groupe de transport international et de logistique d'origine espagnole, implanté à Tanger et spécialisé dans les échanges entre l'Europe et l'Afrique du Nord.");
P("Notre point de départ est une question de gestion : **comment la digitalisation peut-elle améliorer la performance logistique de SJL, notamment en matière de suivi des marchandises, de coordination des opérations et d'optimisation des délais ?** Pour y répondre, nous avons d'abord défini les notions clés (logistique, processus logistique, digitalisation, socle technologique), puis présenté SJL, ses services, son organisation et les difficultés propres à son métier.");
P("Notre analyse montre que SJL s'appuie sur des outils numériques structurants : un **WMS** pour la gestion des entrepôts et des stocks, un **TMS** pour le pilotage du transport, une **informatique embarquée** dans les véhicules, le **suivi GPS** des envois et des outils de **reporting**. Ces outils répondent directement aux trois axes de la problématique : la traçabilité en temps réel, la circulation de l'information entre les services et la maîtrise des délais.");
P("Le diagnostic SWOT et TOWS fait toutefois apparaître des limites : coexistence de systèmes anciens et récents, coûts d'investissement élevés, compétences digitales inégales et risques de cybersécurité. Nous proposons donc quatre recommandations prioritaires — interopérabilité par API et cloud, gouvernance des données et cybersécurité, conduite du changement avec une « Académie Digitale SJL », intelligence artificielle au service d'une logistique éco-responsable — organisées dans une feuille de route sur quatre trimestres.");
add(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Mots-clés : ", bold: true, color: NAVY }), new TextRun({ text: "digitalisation, logistique, SJL Group, WMS, TMS, informatique embarquée, traçabilité, performance logistique, KPI, transformation digitale.", color: BLUE })] }));

// --- Sommaire (rempli en 2e passe)
H1("Sommaire");
body.push("__TOC__");

// --- Abréviations
H1("Liste des abréviations");
Tbl(["Sigle", "Signification"], [
  ["API", "Application Programming Interface : interface qui permet à deux logiciels d'échanger des données automatiquement"],
  ["BFR", "Besoin en fonds de roulement"],
  ["ERP", "Enterprise Resource Planning : progiciel de gestion intégré"],
  ["GPS", "Global Positioning System : système de géolocalisation par satellites"],
  ["IA", "Intelligence artificielle"],
  ["IoT", "Internet of Things : Internet des objets (capteurs et équipements connectés)"],
  ["KPI", "Key Performance Indicator : indicateur clé de performance"],
  ["NPS", "Net Promoter Score : indicateur de satisfaction et de recommandation client"],
  ["OTIF", "On Time In Full : taux de livraisons complètes et à l'heure"],
  ["RFID", "Radio Frequency Identification : identification par radiofréquence"],
  ["RSE", "Responsabilité sociétale des entreprises"],
  ["SaaS", "Software as a Service : logiciel accessible en ligne, par abonnement"],
  ["SJL", "Groupe San José & López"],
  ["SWOT", "Strengths, Weaknesses, Opportunities, Threats : forces, faiblesses, opportunités, menaces"],
  ["TMS", "Transport Management System : logiciel de gestion du transport"],
  ["TOWS", "Matrice qui croise les éléments du SWOT pour en déduire des stratégies"],
  ["UX", "User Experience : expérience utilisateur"],
  ["WMS", "Warehouse Management System : logiciel de gestion d'entrepôt"],
], [1, 4]);

// --- Introduction
H1("Introduction générale");
P("Dans le transport de marchandises, la performance ne dépend plus seulement du nombre de camions ou de la taille des entrepôts. Elle dépend de plus en plus de la **qualité de l'information** : savoir où se trouve une marchandise, coordonner les services qui interviennent sur une même commande, anticiper un retard avant qu'il ne pénalise le client.");
P("Le Maroc, et en particulier la région de Tanger, occupe une position stratégique entre l'Europe et l'Afrique. Le port de Tanger Med et les zones industrielles qui l'entourent, notamment dans le secteur automobile, génèrent des flux importants qui exigent des prestataires logistiques rapides, fiables et transparents. Dans ce contexte, **SJL Group**, présent au Maroc depuis 1986, s'est transformé d'un transporteur international en un prestataire de solutions supply chain intégrées.");
P("Cette évolution s'appuie sur la digitalisation. Encore faut-il comprendre ce qu'elle change concrètement, quels outils elle mobilise et quelles limites elle rencontre. C'est l'objet de notre projet, qui s'articule autour de la question suivante : **comment la digitalisation peut-elle améliorer la performance logistique de SJL, notamment en matière de suivi des marchandises, de coordination des opérations et d'optimisation des délais ?**");
P("Pour y répondre, ce rapport est organisé en sept parties : le cadre théorique, le contexte et la démarche du projet, la présentation de SJL, la problématique, la digitalisation mise en place chez SJL, son impact sur la performance, et enfin notre analyse stratégique et nos recommandations.");

// --- Partie 1
H1("Partie 1 – Cadre théorique");
H2("1.1 La logistique : définition et flux");
P("La logistique est l'**ensemble des activités qui planifient, mettent en œuvre et contrôlent les flux, du fournisseur jusqu'au client final**. Elle ne se limite pas au transport : elle couvre aussi l'approvisionnement, le stockage, la préparation des commandes, la livraison et le retour des produits.");
P("Ces activités organisent trois flux complémentaires :");
Tbl(["Flux", "Contenu", "Exemple chez un transporteur"], [
  ["Flux physique", "Les marchandises elles-mêmes", "Une remorque de pièces automobiles entre Tanger et l'Espagne"],
  ["Flux d'information", "Commandes, statuts, documents, données de suivi", "Ordre de transport, position GPS, documents douaniers"],
  ["Flux financier", "Factures, paiements, coûts", "Facturation de la prestation après preuve de livraison"],
], [1.1, 1.6, 2.3]);
P("L'objectif de la logistique se résume par la **règle des 5 B** : le **bon produit**, en **bonne quantité**, au **bon endroit**, au **bon moment**, au **meilleur coût** et avec le niveau de service attendu. Elle vise ainsi à réduire les coûts, améliorer la qualité de service, optimiser les stocks, réduire les délais et gagner en fiabilité et en traçabilité.");
Figure("5b.jpg", 5.4, "Définition de la logistique et règle des 5 B (source : notre présentation)");

H2("1.2 Le processus logistique");
P("Le processus logistique suit une chaîne d'étapes successives. Chaque étape produit des informations qui conditionnent la suivante : une erreur en amont se répercute jusqu'au client.");
Tbl(["N°", "Étape", "Contenu"], [
  ["1", "Prévision et planification de la demande", "Anticiper les volumes à transporter et à stocker"],
  ["2", "Approvisionnement", "Choix des fournisseurs, achats"],
  ["3", "Réception et contrôle", "Vérification des quantités et de l'état des marchandises"],
  ["4", "Stockage et gestion des stocks", "Rangement, suivi des quantités et des emplacements"],
  ["5", "Préparation des commandes", "Picking, emballage, étiquetage"],
  ["6", "Transport et distribution", "Acheminement routier ou multimodal"],
  ["7", "Livraison au client", "Remise de la marchandise, preuve de livraison"],
  ["8", "Service après-vente et logistique inverse", "Gestion des retours"],
], [0.4, 2, 2.6]);

H2("1.3 Digitalisation et transformation digitale");
P("Ces deux notions sont proches mais ne sont pas identiques :");
Tbl(["Notion", "Définition", "Portée"], [
  ["Digitalisation", "Utiliser les technologies numériques pour convertir, traiter et gérer des informations et des opérations sous forme numérique", "Opérations et informations"],
  ["Transformation digitale", "Intégrer le numérique dans toute l'entreprise pour transformer les méthodes de travail, les processus et parfois le modèle économique", "Ensemble de l'entreprise"],
], [1.2, 3, 1.2]);
P("Dans la logistique, la digitalisation se traduit concrètement par le **suivi des marchandises en temps réel**, l'**automatisation** de certaines opérations, une **meilleure gestion des stocks** et une **communication facilitée** entre les acteurs.");

H2("1.4 Le socle technologique des entreprises modernes");
P("La digitalisation repose sur un socle de cinq technologies, qui se complètent :");
Tbl(["Technologie", "Rôle", "Exemple en logistique"], [
  ["Cloud computing", "Stockage et accès aux données à distance, via Internet", "Partager les mêmes informations entre agences et clients"],
  ["Big Data et Data Analytics", "Collecte et analyse de grandes quantités de données pour faciliter les décisions", "Analyser l'historique des délais par itinéraire"],
  ["Internet des objets (IoT)", "Objets et équipements connectés qui collectent et transmettent des informations", "Capteur de température dans une remorque"],
  ["Intelligence artificielle (IA)", "Analyse des données, prévisions et aide à l'optimisation des opérations", "Prévoir la demande, optimiser les itinéraires"],
  ["Cybersécurité", "Protection des systèmes, des données et des échanges numériques", "Sécuriser l'accès au TMS et aux données clients"],
], [1.3, 2, 2]);

H2("1.5 Les technologies appliquées à la logistique");
Tbl(["Outil", "Fonction principale"], [
  ["GPS", "Localisation des véhicules et suivi des trajets"],
  ["IoT", "Surveillance des marchandises et des conditions de transport"],
  ["Codes-barres / RFID", "Identification et traçabilité des marchandises"],
  ["Cloud", "Partage et accès aux informations logistiques"],
  ["WMS", "Gestion des entrepôts et des stocks ; emplacements organisés, par exemple selon une analyse ABC"],
  ["TMS", "Planification et suivi du transport, optimisation des itinéraires"],
  ["Intelligence artificielle", "Prévision de la demande (*demand forecasting*) et optimisation des itinéraires"],
], [1.2, 4]);
Callout("Ce qu'il faut retenir", "La digitalisation logistique transforme surtout le **flux d'information** : elle rend visibles, partagées et exploitables les données que produisent chaque étape du processus et chaque acteur de la chaîne.");

// --- Partie 2
H1("Partie 2 – Contexte, objectifs et démarche du projet");
H2("2.1 Contexte du projet");
P("Ce projet s'inscrit dans le module **Digital Skills** de première année à l'ENCG Tanger. Il consiste à étudier une organisation réelle, à analyser la place du numérique dans l'une de ses fonctions et à formuler des propositions d'amélioration. Nous avons choisi la **fonction logistique de SJL Group**, acteur du transport international basé à Tanger, dont le métier repose directement sur la coordination de flux entre plusieurs pays.");
H2("2.2 Objectifs");
Bullets([
  "Comprendre l'organisation de SJL, ses métiers et ses services logistiques.",
  "Identifier les principales difficultés logistiques auxquelles un transporteur international est confronté.",
  "Analyser les outils numériques utilisés par SJL et leur apport au suivi des marchandises, à la coordination et aux délais.",
  "Évaluer l'impact de la digitalisation sur la performance, puis formuler des recommandations concrètes et réalistes.",
]);
H2("2.3 Démarche suivie");
Tbl(["N°", "Étape", "Contenu"], [
  ["1", "Choix du sujet", "La digitalisation de la fonction logistique chez SJL Group."],
  ["2", "Recherche documentaire", "Site officiel de SJL, page LinkedIn, communiqués publics, publications d'IBM et de DHL sur la supply chain."],
  ["3", "Analyse de l'existant", "Services, organisation, processus logistique, outils numériques déployés."],
  ["4", "Diagnostic stratégique", "Analyse des impacts, indicateurs de performance, SWOT et TOWS de la digitalisation."],
  ["5", "Propositions", "Recommandations prioritaires et feuille de route de mise en œuvre."],
  ["6", "Restitution", "Présentation orale de 35 slides et rédaction du présent rapport."],
], [0.4, 1.5, 3.6]);
Note("Limite de la démarche : l'étude repose sur des sources publiques ; elle n'a pas donné lieu à un entretien avec les équipes de SJL. Les valeurs des indicateurs de performance de l'entreprise ne sont pas publiées.");

// --- Partie 3
H1("Partie 3 – Présentation de SJL Group");
H2("3.1 Identité du groupe");
P("**SJL (Groupe San José & López)** est un groupe d'origine espagnole spécialisé dans le **transport international de marchandises et les services logistiques**. Il occupe une **présence importante au Maroc**, avec une implantation à Tanger, et propose des solutions qui relient l'**Europe et l'Afrique du Nord** (Maroc et Tunisie).");
Tiles([["1948", "origines du groupe"], ["2002", "naissance de SJL"], ["3", "plateformes à Tanger"], ["10 000 m²", "Tanger Automotive City"]]);
Figure("fleet.jpg", 6.0, "Flotte de SJL : tracteurs et semi-remorques aux couleurs du groupe (source : notre présentation)");
P("SJL travaille principalement pour des **clients industriels** de quatre secteurs : l'**automobile**, le **textile**, l'**agroalimentaire** et les **biens de consommation**.");

H2("3.2 Historique et évolution");
Tbl(["Année", "Étape"], [
  ["1948", "Création de Transportes Internacionales San José"],
  ["1949", "Création de Transportes López"],
  ["1986", "Début de l'activité au Maroc via Tremsa (future SJL Maghreb)"],
  ["2002", "Fusion des deux entreprises : naissance du groupe SJL"],
  ["2005", "Installation dans la Zone Franche de Tanger"],
  ["2012", "Lancement des activités logistiques à Tanger Med"],
  ["2014", "Développement en Tunisie"],
  ["2019", "Nouvelle plateforme logistique à Tanger Automotive City"],
], [1, 5]);
P("Cette chronologie montre le passage **d'un transporteur international à un prestataire de solutions supply chain intégrées** : au transport se sont ajoutés le stockage, la préparation de commandes et les opérations douanières.");

H2("3.3 Implantations logistiques au Maroc");
Tbl(["Site", "Surface", "Particularité"], [
  ["Tanger Automotive City", "10 000 m²", "À proximité des usines automobiles"],
  ["Tanger Med (zone portuaire)", "7 500 m²", "Accès direct aux flux d'import-export, régime de zone franche"],
  ["MEAD – Tanger Free Zone", "1 900 m²", "Zone franche de Tanger, agents des douanes sur place"],
], [2, 1, 3]);
Note("Source : sjl-group.com, page « Centres logistiques ».");

H2("3.4 Positionnement et services");
Tbl(["Service", "Activités"], [
  ["Transport international et national", "Transport routier de marchandises entre le Maroc et l'Europe ; chargements complets et partiels (groupage)"],
  ["Transit et opérations douanières", "Expéditions nationales et internationales ; optimisation des opérations douanières ; gestion des retours"],
  ["Préparation et conditionnement", "Étiquetage (*labeling*), emballage (*packaging*), contrôle de la qualité"],
  ["Entreposage et gestion des stocks", "Réception et stockage ; gestion et suivi des stocks ; préparation des commandes"],
], [1.6, 4]);

H2("3.5 Organisation et acteurs de la logistique");
P("La fonction logistique mobilise plusieurs services, placés sous l'autorité de la direction générale, ainsi que des partenaires externes :");
Tbl(["Acteur", "Rôle"], [
  ["Direction générale", "Stratégie et supervision"],
  ["Service commercial", "Relation client et identification des besoins"],
  ["Service exploitation", "Organisation et coordination des opérations de transport"],
  ["Service transport", "Organisation et suivi des moyens de transport"],
  ["Service logistique", "Gestion des flux physiques et des marchandises"],
  ["Service administratif", "Traitement administratif et documentaire"],
  ["Chauffeurs et livreurs", "Transport physique et livraison"],
  ["Clients et partenaires", "Clients (commandes, réception), fournisseurs, partenaires de transport et partenaires douaniers"],
], [1.6, 4]);
Callout("Ce qu'il faut retenir", "Une même commande traverse au moins six services et plusieurs partenaires externes. La qualité de la **coordination** entre ces acteurs est donc un facteur clé de la performance de SJL — et le terrain naturel de la digitalisation.");

// --- Partie 4
H1("Partie 4 – La problématique");
H2("4.1 Contexte de départ");
P("Le métier de SJL combine des distances longues, une traversée maritime, des formalités douanières et des clients industriels exigeants, souvent organisés en flux tendus. Chaque commande implique de nombreux acteurs et de nombreux documents. Dans ce contexte, la moindre perte d'information peut se traduire par un retard, un surcoût ou une insatisfaction du client.");
H2("4.2 Les principales difficultés logistiques");
Tbl(["N°", "Difficulté", "Manifestation"], [
  ["01", "Retards de livraison", "Attente au port ou à la frontière, aléas de trafic, mauvaise anticipation"],
  ["02", "Coordination entre services", "Commercial, exploitation, transport et administratif ne disposent pas toujours de la même information au même moment"],
  ["03", "Manque de visibilité en transit", "Difficulté à connaître la position et le statut d'une marchandise sans appeler le chauffeur"],
  ["04", "Communication et circulation de l'information", "Échanges par téléphone ou e-mail, ressaisies, risques d'erreurs"],
  ["05", "Imprévus et coûts de transport", "Trajets à vide, réorganisations de dernière minute, pénalités de retard"],
  ["06", "Suivi des performances", "Indicateurs difficiles à consolider sans données fiables et centralisées"],
], [0.4, 1.7, 3.4]);
H2("4.3 Les conséquences");
Tbl(["Conséquence", "Explication"], [
  ["Client moins bien informé", "Le client ne connaît pas l'heure d'arrivée réelle de sa marchandise."],
  ["Coûts supplémentaires", "Trajets à vide, carburant, pénalités de retard, temps passé en vérifications."],
  ["Risque pour les clients industriels", "Une usine en flux tendu peut voir sa production perturbée par un retard."],
  ["Pilotage difficile", "Sans données fiables, les décisions reposent sur l'expérience plutôt que sur des indicateurs."],
], [1.6, 4]);
H2("4.4 Notre problématique");
Callout("Problématique", "Comment la digitalisation peut-elle améliorer la performance logistique de SJL, notamment en matière de **suivi des marchandises**, de **coordination des opérations** et d'**optimisation des délais** ?");
Tbl(["Axe", "Enjeu"], [
  ["01 · Suivi des marchandises", "Traçabilité et visibilité en transit"],
  ["02 · Coordination des opérations", "Communication entre services et acteurs"],
  ["03 · Optimisation des délais", "Réduction des temps d'exécution"],
], [1.6, 3]);

// --- Partie 5
H1("Partie 5 – La digitalisation de la logistique chez SJL");
H2("5.1 Avant et après la digitalisation");
Tbl(["Avant", "Après"], [
  ["Documents papier", "Documents numériques"],
  ["Suivi manuel des stocks", "Stocks informatisés"],
  ["Communication par téléphone", "Communication connectée"],
  ["Traitement manuel des commandes", "Automatisation de certaines tâches"],
  ["Visibilité limitée", "Suivi et traçabilité améliorés"],
], [1, 1], { firstCol: true });
P("On passe ainsi **d'une gestion principalement manuelle à une gestion connectée, automatisée et fondée sur les données**.");

H2("5.2 Les outils numériques de SJL");
P("Selon la documentation officielle de SJL, le groupe s'appuie sur les outils suivants :");
Tbl(["Outil", "Rôle", "Apport à la problématique"], [
  ["WMS", "Gestion des entrepôts et des stocks", "Stocks fiables, préparation plus rapide (axe 3 : délais)"],
  ["TMS", "Pilotage des opérations et des flux ; gestion et suivi du transport", "Planification et partage de l'information (axe 2 : coordination)"],
  ["Informatique embarquée", "Équipements numériques intégrés aux véhicules pour suivre et piloter les flux en temps réel", "Remontée d'informations depuis le terrain (axe 1 : suivi)"],
  ["Suivi GPS et géolocalisation", "Localisation des envois en temps réel", "Traçabilité et information client (axe 1 : suivi)"],
  ["Reporting et tableaux de bord", "Suivi des performances logistiques", "Pilotage par les indicateurs (axes 2 et 3)"],
], [1.3, 2.2, 2.2]);
P("Selon SJL, ces outils permettent **un suivi des opérations plus fiable et de meilleurs échanges avec les clients**.");
Note("Sources : sjl-group.com (Transport FTL, Transport en groupage) ; page de la plateforme SJL Tanger Med (TMS/WMS). Les autres technologies citées dans ce rapport (codes-barres/RFID, IoT, IA, cloud) sont des applications générales du secteur, non mentionnées comme outils déployés chez SJL.");

H2("5.3 Le parcours digital d'une commande");
P("Le schéma suivant montre comment les outils s'enchaînent, de l'entrepôt au client, pour assurer une **information continue à chaque étape** :");
Figure("parcours.jpg", 6.0, "Le parcours digital d'une commande (source : notre présentation)");
Tbl(["Étape", "Ce qui se passe", "Outil"], [
  ["1", "Enregistrement de la commande", "TMS / système de gestion"],
  ["2", "Le WMS localise le produit dans l'entrepôt", "WMS"],
  ["3", "Le TMS organise le transport", "TMS"],
  ["4", "Le GPS permet de suivre le véhicule", "GPS, informatique embarquée"],
  ["5", "Les informations de livraison sont actualisées et communiquées au client", "Reporting, échanges client"],
], [0.5, 3.4, 1.6]);

H2("5.4 Évaluation de la solution en place");
P("Les outils de SJL répondent aux besoins fondamentaux d'un transporteur international : ils structurent l'information, soutiennent la coordination et rendent les envois traçables. Ils constituent une base solide, que nous ne proposons pas de remplacer.");
P("Plusieurs points restent néanmoins à renforcer : l'**intégration** entre outils récents et systèmes plus anciens, l'**échange automatique de données** avec les systèmes des clients, l'**homogénéité des compétences** des utilisateurs et la **protection des données** partagées. Ces points sont analysés dans les parties suivantes.");

// --- Partie 6
H1("Partie 6 – Impact sur la performance");
H2("6.1 Les impacts de la digitalisation");
P("La digitalisation agit sur quatre dimensions de la performance. Les leviers technologiques cités ci-dessous sont ceux du secteur ; leur mise en œuvre précise chez SJL n'est pas publiée.");
Tbl(["Dimension", "Leviers technologiques", "Effets attendus"], [
  ["Performance opérationnelle", "ERP, WMS, TMS, IoT (RFID, capteurs)", ["Temps de traversée et de transit réduits", "Espace de stockage optimisé", "Précommandes traitées automatiquement"]],
  ["Performance financière", "IA prédictive, Big Data Analytics", ["Baisse du BFR (moins de stock immobilisé)", "Économies de carburant (routes optimisées)", "Moins de pénalités de retard"]],
  ["Qualité et satisfaction client", "Portails clients SaaS, blockchain", ["Visibilité et traçabilité de bout en bout", "Moins d'erreurs d'expédition (OTIF)", "Satisfaction client améliorée (NPS)"]],
  ["Stratégique et RSE", "Jumeaux numériques, cloud", ["Pilotage préventif des ruptures", "Reporting carbone (logistique verte)", "Agilité face aux chocs de marché"]],
], [1.4, 1.6, 2.6]);
H2("6.2 Les leviers technologiques et les KPI");
Bullets([
  "**Fluidification des flux :** le WMS réduit les déplacements en entrepôt, le TMS diminue le taux de retour à vide et l'IoT garantit la traçabilité des cargaisons sensibles.",
  "**Décisions pilotées par la donnée :** les algorithmes prédictifs anticipent la demande et ajustent les stocks tampons, évitant surstockage et ruptures.",
]);
Tbl(["Indicateur (KPI)", "Ce qu'il mesure", "Lien avec la problématique"], [
  ["OTIF (On Time In Full)", "Taux de livraisons complètes et à l'heure", "Délais et fiabilité"],
  ["Lead time", "Temps global d'exécution de la commande", "Délais"],
  ["Rotation des stocks", "Rythme de renouvellement des stocks", "Efficacité de l'entreposage"],
], [1.5, 2.2, 1.8]);
Note("Les valeurs de ces indicateurs chez SJL ne sont pas communiquées publiquement.");
H2("6.3 Lien entre difficultés et solutions digitales");
Tbl(["Difficulté", "Réponse digitale", "Effet recherché"], [
  ["Manque de visibilité en transit", "GPS, informatique embarquée", "Position et statut connus en temps réel"],
  ["Coordination entre services", "TMS, WMS, reporting partagé", "Une seule information, partagée par tous"],
  ["Retards de livraison", "Planification TMS, suivi GPS, indicateurs", "Anticipation et réaction rapide"],
  ["Circulation de l'information", "Documents numériques, échanges connectés", "Moins de ressaisies et d'erreurs"],
  ["Coûts et imprévus", "Optimisation des itinéraires, réduction des retours à vide", "Coûts maîtrisés"],
  ["Suivi des performances", "Tableaux de bord et KPI", "Pilotage fondé sur les données"],
], [1.7, 2, 1.8]);

// --- Partie 7
H1("Partie 7 – Analyse stratégique et recommandations");
H2("7.1 Analyse SWOT de la digitalisation");
Swot({
  F: ["Outils structurants : WMS et TMS", "Traçabilité en temps réel (GPS, informatique embarquée)", "Culture du pilotage par les indicateurs (reporting)"],
  W: ["Dette technique : systèmes anciens et récents coexistent", "Coûts d'investissement élevés (automatisation)", "Adoption terrain : compétences digitales inégales"],
  O: ["Logistique verte : optimisation carbone (RSE)", "IA prédictive : demande et stocks anticipés", "Portails partagés avec l'écosystème : échanges fluidifiés"],
  T: ["Cyber-risques liés aux flux de données partagés", "Acteurs « disruptifs » 100 % digitaux", "Chocs supply chain et instabilités géopolitiques"],
});
H2("7.2 Analyse stratégique TOWS");
P("La matrice TOWS croise les éléments du SWOT pour en déduire quatre orientations stratégiques :");
Tbl(["", "Opportunités", "Menaces"], [
  ["Forces", "**Différenciation par la donnée RSE :** exploiter les données TMS (et, à terme, IoT) pour une offre bas-carbone, traçable et certifiée destinée aux grands comptes.", "**Sécurisation et résilience :** architecture « Zero Trust » sur les données TMS et de suivi pour résister aux cyberattaques."],
  ["Faiblesses", "**Modernisation par API :** remplacer progressivement les briques anciennes par des services cloud interconnectés, pour mettre fin aux silos.", "**Conduite du changement :** programmes de montée en compétences (*upskilling*) pour réduire les retards liés à une maîtrise insuffisante des outils."],
], [0.8, 2.4, 2.4]);
H2("7.3 Les obstacles et défis");
Tbl(["Défi", "Explication"], [
  ["Intégration des systèmes informatiques", "Coexistence de systèmes anciens et cloud (dette technique)"],
  ["Investissements technologiques", "Budget initial élevé pour l'automatisation"],
  ["Adoption des outils par les équipes", "Inégalités de compétences digitales entre agents"],
  ["Protection des données", "Cyber-risques liés aux flux de données partagés"],
  ["Évolution des compétences", "Besoin de formation continue (upskilling)"],
], [2, 3.5]);

H2("7.4 Nos recommandations prioritaires");
P("Nos quatre recommandations répondent directement aux faiblesses et aux menaces identifiées. Il s'agit de **propositions du groupe**, et non de projets annoncés par SJL.");
H3("Recommandation 1 : interopérabilité (API et cloud)");
P("Développer une couche d'échange unifiée, fondée sur des API, pour connecter le WMS et le TMS aux systèmes (ERP) des clients et **supprimer les saisies manuelles**. Chaque commande et chaque statut seraient transmis automatiquement, sans ressaisie.");
H3("Recommandation 2 : gouvernance des données et cybersécurité");
P("Adopter une politique « Zero Trust » (aucun accès accordé par défaut), réaliser des tests d'intrusion réguliers et **former 100 % des équipes** au phishing et au risque cyber. Désigner des responsables de la qualité des données pour chaque domaine (commandes, stocks, transport).");
H3("Recommandation 3 : conduite du changement et UX");
P("Créer une **« Académie Digitale SJL »** pour former les équipes par métier, et améliorer la **convivialité des interfaces mobiles** utilisées en entrepôt et par les chauffeurs. Un outil simple à utiliser est un outil mieux utilisé.");
Tbl(["Public", "Contenu de formation", "Format"], [
  ["Agents d'exploitation et transport", "Utilisation avancée du TMS, lecture des indicateurs", "Ateliers pratiques sur l'outil"],
  ["Équipes d'entrepôt", "WMS, scan, inventaires", "Formation sur le terrain, tutoriels mobiles"],
  ["Chauffeurs", "Informatique embarquée, bonnes pratiques de saisie", "Sessions courtes, aide intégrée"],
  ["Tous les collaborateurs", "Cybersécurité, protection des données", "Module obligatoire"],
], [1.6, 2.2, 1.7]);
H3("Recommandation 4 : IA et logistique éco-responsable");
P("Intégrer des algorithmes d'**optimisation des itinéraires** et du **taux de remplissage** des camions, afin de réduire les kilomètres parcourus à vide et l'**empreinte carbone** (RSE). Commencer par un projet pilote sur une ligne régulière, par exemple Tanger – Espagne.");

H2("7.5 Feuille de route de mise en œuvre");
Tbl(["Trimestre", "Phase", "Actions"], [
  ["T1", "Cadrage", "Mesurer les KPI de référence (OTIF, lead time, retours à vide) ; recenser les saisies manuelles ; désigner les responsables."],
  ["T2", "Lancement", "Lancer l'Académie Digitale SJL ; module cybersécurité obligatoire ; premiers connecteurs API avec un client pilote."],
  ["T3", "Déploiement", "Étendre les échanges API ; améliorer les interfaces mobiles ; pilote d'optimisation des itinéraires."],
  ["T4", "Mesure", "Mesurer l'impact sur les KPI ; ajuster ; étendre aux autres lignes et clients."],
], [0.8, 1, 4]);
H2("7.6 Indicateurs de suivi suggérés");
Tbl(["Indicateur", "Ce qu'il mesure", "Cible"], [
  ["OTIF", "Livraisons complètes et à l'heure", "À définir après la mesure de référence (T1)"],
  ["Lead time", "Durée totale d'une commande", "À définir après la mesure de référence (T1)"],
  ["Taux de retour à vide", "Part des kilomètres parcourus sans chargement", "À définir après la mesure de référence (T1)"],
  ["Taux de saisies manuelles", "Part des données ressaisies à la main", "En baisse continue"],
  ["Collaborateurs formés", "Part des équipes ayant suivi les modules", "100 % pour la cybersécurité"],
], [1.4, 2.2, 2]);
H2("7.7 Risques et conditions de réussite");
Tbl(["Risque", "Origine", "Réponse proposée"], [
  ["Résistance au changement", "Habitudes de travail installées", "Académie Digitale, ambassadeurs, communication sur l'utilité"],
  ["Coût des projets", "Investissements en logiciels et intégration", "Déploiement progressif, priorité aux gains rapides"],
  ["Cyberattaque", "Données partagées avec clients et partenaires", "Zero Trust, formation, tests d'intrusion"],
  ["Données de mauvaise qualité", "Saisies incomplètes ou tardives", "Responsables data, saisie à la source, contrôles automatiques"],
], [1.4, 1.9, 2.3]);
P("Deux conditions de réussite s'ajoutent : le **soutien explicite de la direction** et la **mesure régulière des résultats**, sans laquelle il est impossible de démontrer les gains obtenus.");

// --- Conclusion
H1("Conclusion générale");
P("Ce projet nous a permis d'observer, sur un cas réel, comment la digitalisation transforme la fonction logistique d'un transporteur international. Chez SJL Group, elle accompagne le passage d'un métier de transporteur à celui de prestataire de solutions supply chain intégrées.");
P("Pour répondre à notre problématique :");
Bullets([
  "**Suivi et traçabilité des marchandises :** le suivi en temps réel (GPS, informatique embarquée) répond au manque de visibilité sur les marchandises en transit.",
  "**Coordination entre les services :** des outils connectés (WMS, TMS, reporting) fluidifient la circulation de l'information entre les services et avec les clients.",
  "**Délais et performance logistique :** des flux fluidifiés, des décisions pilotées par la donnée et des KPI suivis (OTIF, lead time) permettent de réduire les temps d'exécution.",
]);
P("La digitalisation apparaît ainsi comme **un levier stratégique de compétitivité et d'amélioration continue pour SJL**. Elle ne se limite toutefois pas à l'installation de logiciels : son efficacité dépend de l'intégration des systèmes, de la sécurité des données et des compétences des équipes. C'est pourquoi nos recommandations associent technologie (API, cloud, IA) et dimension humaine (Académie Digitale, conduite du changement).");
P("En perspective, quatre évolutions se dessinent : une **supply chain davantage connectée** (interopérabilité API et cloud), une **meilleure exploitation des données** (Big Data, gouvernance), une **logistique plus intelligente** (IA prédictive, optimisation des itinéraires) et une **approche plus durable** (logistique verte, reporting carbone) — vers un **réseau logistique international connecté**.");

// --- Annexes
H1("Annexes");
H2("Annexe 1 : sources du rapport");
Bullets([
  "Support de présentation du projet : « La digitalisation de la logistique – SJL Group » (35 slides).",
  "SJL Group – site officiel : https://sjl-group.com/ (pages Histoire, Nos services, Transport FTL, Transport en groupage, Express transport, Centres logistiques).",
  "SJL – plateforme logistique Tanger Med : https://offre.sjl-group.com/",
  "SJL – page LinkedIn officielle : https://www.linkedin.com/company/sjlofficiel/",
  "Conseil de la concurrence (Maroc) – communiqué relatif au projet de concentration concernant SJL Maghreb SA : https://conseil-concurrence.ma/",
  "IBM – What is supply chain management? : https://www.ibm.com/think/topics/supply-chain-management",
  "IBM – Transportation management systems : https://www.ibm.com/think/topics/transportation-management-systems",
  "IBM – Warehouse management : https://www.ibm.com/think/topics/warehouse-management",
  "DHL – publications sur les tendances logistiques : https://www.dhl.com/",
]);
H2("Annexe 2 : synthèse du plan de la présentation");
Tbl(["Partie", "Contenu"], [
  ["1. Introduction générale", "Problématique et objectifs : suivi des marchandises, coordination des opérations, optimisation des délais."],
  ["2. Présentation de SJL", "Identité, clients industriels, historique (1948–2019), positionnement et services."],
  ["3. La logistique de SJL", "Définition et règle des 5 B, processus logistique en 8 étapes, acteurs, difficultés logistiques."],
  ["4. Digitalisation et socle technologique", "Digitalisation et transformation digitale, avant/après, socle technologique, technologies appliquées, parcours digital d'une commande, outils de SJL."],
  ["5. Impact sur la performance", "Impacts opérationnels, financiers, qualité et RSE ; leviers et KPI (OTIF, lead time, rotation des stocks)."],
  ["6. Analyse stratégique et perspectives", "SWOT, TOWS, obstacles et défis, recommandations prioritaires."],
  ["7. Conclusion générale", "Réponse à la problématique, perspectives et ouverture."],
], [1.8, 4]);
H2("Annexe 3 : acteurs et services impliqués");
Figure("acteurs.jpg", 6.0, "Les acteurs et services impliqués dans la logistique de SJL (source : notre présentation)");

// ===================== DOCUMENT =====================
function tocParas() {
  const out = [];
  toc.filter(([, t]) => t !== "Sommaire").forEach(([lvl, t]) => {
    const pg = PAGES[t] != null ? String(PAGES[t]) : "0";
    out.push(new Paragraph({
      spacing: { before: lvl === 1 ? 110 : 0, after: lvl === 1 ? 20 : 0 }, indent: { left: lvl === 1 ? 0 : 400 },
      tabStops: [{ type: TabStopType.RIGHT, position: CW, leader: "dot" }],
      children: [new TextRun({ text: t, bold: lvl === 1, color: lvl === 1 ? BLUE : INK, size: lvl === 1 ? 21 : 18 }), new TextRun({ text: "\t" + pg, bold: lvl === 1, color: lvl === 1 ? BLUE : INK, size: lvl === 1 ? 21 : 18 })],
    }));
  });
  return out;
}
const mainChildren = [];
body.forEach((b) => { if (b === "__TOC__") mainChildren.push(...tocParas()); else mainChildren.push(b); });

// ---- cover
const PW = 11906;
const logo = fs.readFileSync(path.join(IMG, "logo.png"));
const fleetW = fs.readFileSync(path.join(IMG, "fleet_wide.jpg"));
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const nob = { top: none, bottom: none, left: none, right: none };
const coverCell = (children, w, fill, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: nob, shading: { type: ShadingType.CLEAR, color: "auto", fill }, margins: { top: o.mt ?? 0, bottom: o.mb ?? 0, left: o.ml ?? 0, right: o.mr ?? 0 }, columnSpan: o.span, verticalAlign: o.v, children });
const lbl = (t) => new Paragraph({ spacing: { before: 200, after: 40 }, children: [new TextRun({ text: t, bold: true, color: BLUE, size: 19, characterSpacing: 60 })] });
const val = (t) => new Paragraph({ spacing: { after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ACC, space: 6 } }, children: [new TextRun({ text: t, size: 21 })] });
const members = ["Saad Boufas", "Mouna", "Alae", "Salma", "Fati", "Raghad", "Hiba"];
const L = 6100, Rw = PW - L;
const cover = new Table({ width: { size: PW, type: WidthType.DXA }, columnWidths: [L, Rw], layout: TableLayoutType.FIXED, rows: [
  new TableRow({ height: { value: 1700, rule: HeightRule.EXACT }, children: [coverCell([new Paragraph({ spacing: { before: 200 }, children: [new ImageRun({ type: "png", data: logo, transformation: { width: 290, height: 105 }, altText: { title: "Logo ENCG Tanger", description: "Logo ENCG Tanger", name: "logo" } })] })], PW, "FFFFFF", { span: 2, ml: 500 })] }),
  new TableRow({ height: { value: 4300, rule: HeightRule.EXACT }, children: [coverCell([
    new Paragraph({ spacing: { before: 900, after: 200 }, children: [new TextRun({ text: "RAPPORT DE PROJET", bold: true, color: "BDD7EE", size: 24, characterSpacing: 200 })] }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "La digitalisation de la logistique chez SJL Group", bold: true, color: "FFFFFF", size: 48 })] }),
    new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACC, space: 10 } }, indent: { right: 3200 }, children: [] }),
    new Paragraph({ children: [new TextRun({ text: "Suivi des marchandises, coordination des opérations et optimisation des délais", italics: true, color: "DEEAF6", size: 24 })] }),
  ], PW, NAVY, { span: 2, ml: 1100, mr: 900 })] }),
  new TableRow({ height: { value: 2700, rule: HeightRule.EXACT }, children: [coverCell([new Paragraph({ children: [new ImageRun({ type: "jpg", data: fleetW, transformation: { width: 794, height: 327 }, altText: { title: "Flotte SJL", description: "Camion et remorques SJL", name: "fleet" } })] })], PW, "FFFFFF", { span: 2 })] }),
  new TableRow({ height: { value: 7520, rule: HeightRule.EXACT }, children: [
    coverCell([lbl("RÉALISÉ PAR"), ...members.map((m) => new Paragraph({ numbering: { reference: "fleche", level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: m, size: 22 })] }))], L, "FFFFFF", { ml: 1100, mt: 200 }),
    coverCell([lbl("ENCADRÉ PAR"), val("[Nom de l'encadrant(e)]"), lbl("MODULE"), val("Digital Skills"), lbl("FILIÈRE"), val("1re année – ENCG Tanger"), lbl("ANNÉE UNIVERSITAIRE"), val("2026 – 2027")], Rw, "DEEAF6", { ml: 500, mr: 700, mt: 200 }),
  ] }),
  new TableRow({ height: { value: 500, rule: HeightRule.EXACT }, children: [coverCell([new Paragraph({ children: [] })], PW, BLUE, { span: 2 })] }),
] });

const doc = new Document({
  creator: "Groupe ENCG Tanger", title: "Rapport de projet – La digitalisation de la logistique chez SJL Group",
  numbering: { config: [
    { reference: "fleche", levels: [{ level: 0, format: LevelFormat.BULLET, text: "➢", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "puce", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } }, run: { color: BLUE } } }] },
  ] },
  styles: { default: { document: { run: { font: FONT, size: 22, color: INK } } } },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } } }, children: [cover] },
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1134, left: 1418, right: 1418, footer: 600 } } },
      footers: { default: new Footer({ children: [new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 6 } }, tabStops: [{ type: TabStopType.RIGHT, position: CW }],
        children: [new TextRun({ text: "Rapport de projet · SJL Group – Digitalisation de la logistique", size: 17, color: MUTE }), new TextRun({ text: "\tPage ", size: 17, color: MUTE }), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: MUTE })] })] }) },
      children: mainChildren },
  ],
});
fs.writeFileSync(path.join(__dirname, "toc.json"), JSON.stringify(toc.filter(([, t]) => t !== "Sommaire").map(([, t]) => t)));
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(path.join(__dirname, "Rapport_SJL_Digitalisation_Logistique.docx"), b); console.log("ok", toc.length); });
