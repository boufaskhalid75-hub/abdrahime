const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
  HeadingLevel, BorderStyle, Footer, PageNumber, PageBreak, TableLayoutType } = require("docx");

const NAVY = "10243A", OR = "F28C28", GREY = "F3F5F7", MUTE = "6B7A90";

const team = [
  ["Saad Boufas", "1 – 2", "Ouverture, contexte et objectifs", "2 min", "2:00"],
  ["Mouna", "3 – 4", "Problématique, histoire de SJL", "2 min 30", "4:30"],
  ["Alae", "5 – 6", "Services de SJL, rôle de la logistique", "3 min 30", "8:00"],
  ["Salma", "7 – 9", "Logistique traditionnelle, digitalisation, avant/après", "4 min", "12:00"],
  ["Fati", "10 – 13", "Architecture, GPS, TMS, informatique embarquée", "5 min", "17:00"],
  ["Raghad", "14 – 15", "IoT, Cloud, Big Data", "2 min 30", "19:30"],
  ["Hiba", "16 – 17", "Intelligence artificielle, cas pratique", "3 min", "22:30"],
  ["Saad Boufas", "18 – 20", "Bilan, recommandations, conclusion", "2 min 30", "25:00"],
];

// parts: [title, [ [slideTitle, [lines...]], ... ]]
const parts = [
  ["Saad Boufas – Slides 1 et 2 · Ouverture", "2 min", [
    ["Slide 1 – Couverture", [
      "Bonjour à toutes et à tous.",
      "Aujourd'hui, nous allons vous présenter notre projet du module Digital Skills.",
      "Notre sujet est : **la digitalisation de la fonction logistique au sein de SJL Group**. Nous allons parler de l'évolution des méthodes de travail, des technologies utilisées et des perspectives de l'intelligence artificielle.",
      "SJL Group est un groupe de transport international et de logistique dont le siège est à Tanger.",
      "[slide suivante]"]],
    ["Slide 2 – Contexte et objectifs", [
      "Pourquoi ce sujet ? Aujourd'hui, les échanges entre l'Europe et l'Afrique du Nord passent beaucoup par la route. Les clients veulent des transports rapides et fiables.",
      "Ils veulent aussi savoir, à tout moment, où se trouve leur marchandise. Le numérique change donc la façon de planifier, de suivre et de décider.",
      "Notre présentation a quatre objectifs : comprendre le rôle de la logistique, présenter SJL Group, analyser ses outils numériques, et explorer le potentiel de l'intelligence artificielle.",
      "Pour commencer, Mouna va vous présenter notre problématique.",
      "[slide suivante – passer la parole à Mouna]"]],
  ]],
  ["Mouna – Slides 3 et 4 · Problématique et histoire de SJL", "2 min 30", [
    ["Slide 3 – La question centrale", [
      "Merci Saad. Notre problématique est la suivante : **comment la digitalisation transforme-t-elle la fonction logistique de SJL Group, et quelle place l'intelligence artificielle peut-elle y occuper demain ?**",
      "Pour y répondre, nous allons suivre trois questions.",
      "[clic] D'abord : comment travaillait-on avant le numérique ?",
      "[clic] Ensuite : quels outils numériques SJL utilise-t-elle réellement ?",
      "[clic] Enfin : que pourrait apporter l'IA demain ?",
      "[clic] Notre méthode : nous avons analysé uniquement des sources publiques, comme le site et la page LinkedIn de SJL, le Conseil de la concurrence, IBM et DHL. Nous n'avons pas fait d'entretien avec l'entreprise.",
      "[slide suivante]"]],
    ["Slide 4 – SJL Group : histoire et identité", [
      "SJL signifie Groupe San José & López. Son siège est à Tanger, et il relie l'Europe et l'Afrique, avec une forte présence dans l'industrie automobile.",
      "Son histoire commence en Espagne, avec deux transporteurs créés en 1948 et en 1949.",
      "[clic] En 1986, l'activité démarre au Maroc avec Tremsa, qui deviendra SJL Maghreb.",
      "[clic] En 2002, les deux sociétés fusionnent : c'est la naissance du Groupe San José & López.",
      "[clic] Aujourd'hui, le groupe fait du transport et de la logistique entre l'Europe et l'Afrique.",
      "Alae va maintenant vous présenter les services de SJL.",
      "[slide suivante – passer la parole à Alae]"]],
  ]],
  ["Alae – Slides 5 et 6 · Services et rôle de la logistique", "3 min 30", [
    ["Slide 5 – Les activités et services de SJL", [
      "Merci Mouna. SJL propose quatre grandes familles de services.",
      "[clic] D'abord, le transport international : en camion complet, appelé FTL, quand un client réserve tout le camion ; en groupage, quand plusieurs clients partagent la même remorque ; et en express, quand la marchandise est urgente.",
      "Le groupage est intéressant pour les petites quantités : le client ne paie qu'une partie du camion, et le transporteur remplit mieux sa remorque.",
      "[clic] Ensuite, la logistique et l'entreposage, avec des centres à Tanger Med, à Tanger Automotive City et dans la zone franche de Tanger. Ces sites sont placés près du port et des usines automobiles, là où les marchandises arrivent et partent.",
      "[clic] Troisièmement, le transit et la douane, indispensables pour passer d'un continent à l'autre. Un document douanier mal rempli peut bloquer un camion pendant des heures.",
      "[clic] Enfin, le transport national et la distribution au Maroc.",
      "L'idée importante : un client peut confier presque toute sa chaîne logistique à un seul prestataire, du transport à la douane et au stockage.",
      "[slide suivante]"]],
    ["Slide 6 – La logistique, moteur de la performance", [
      "Mais d'abord, qu'est-ce que la logistique ? C'est l'organisation du parcours d'une marchandise, du fournisseur jusqu'au client. Son objectif se résume en une phrase : le bon produit, au bon endroit, au bon moment, au meilleur coût.",
      "[clic] La logistique relie trois acteurs : le fournisseur, comme une usine ou un exportateur ; le prestataire logistique – c'est le rôle de SJL ; et le client, par exemple une usine en Europe.",
      "[clic] Entre eux circulent trois flux. Le flux physique : ce sont les marchandises elles-mêmes, qui voyagent en camion et en bateau.",
      "[clic] Le flux d'information : les commandes, les statuts, les documents de transport et de douane. Ce flux va dans les deux sens. C'est lui que le numérique transforme le plus, et c'est le cœur de notre sujet.",
      "[clic] Et le flux financier : les factures et les paiements, qui vont du client vers le prestataire et le fournisseur.",
      "[clic] Une bonne logistique améliore la performance de l'entreprise sur quatre leviers.",
      "**Les coûts :** remplir les camions et éviter de rouler à vide.",
      "**Les délais :** livrer à l'heure. Par exemple, une usine automobile travaille souvent en flux tendu, avec très peu de stock. Si un camion arrive en retard, la production peut être perturbée.",
      "**La qualité :** des marchandises intactes et des documents justes.",
      "**Le service client :** informer vite et répondre aux demandes.",
      "En résumé : pour un transporteur comme SJL, la logistique n'est pas seulement une question de camions, c'est aussi une question d'information. Salma va vous expliquer comment on travaillait avant le numérique.",
      "[slide suivante – passer la parole à Salma]"]],
  ]],
  ["Salma – Slides 7 à 9 · Du traditionnel au digital", "4 min", [
    ["Slide 7 – La logistique traditionnelle", [
      "Merci Alae. Avant le numérique, la logistique reposait sur le papier et le téléphone.",
      "Les documents de transport étaient imprimés et classés : lettres de voiture, bons de livraison, documents douaniers. Les informations passaient par téléphone ou par fax. Les données étaient recopiées à la main, parfois plusieurs fois. Et pour savoir où était un camion, il fallait appeler le chauffeur.",
      "Imaginez : un client demande à quelle heure arrive sa marchandise. L'agent appelle le chauffeur, attend, puis rappelle le client. Cela prend du temps.",
      "Les conséquences sont claires : des erreurs de saisie, des retards d'information, et un client qui voit mal où en est son envoi. Quand les volumes augmentent, ce système devient difficile à gérer.",
      "Attention : c'est une description générale du secteur, pas une description de SJL dans le passé.",
      "[slide suivante]"]],
    ["Slide 8 – La transition vers le digital", [
      "Alors, qu'est-ce que la digitalisation ? C'est l'utilisation d'outils numériques pour transformer les méthodes de travail. Ce n'est pas seulement mettre un ordinateur à la place du papier : c'est faire circuler les données automatiquement entre le camion, l'agence et le client.",
      "Pourquoi les entreprises se digitalisent-elles ? Parce que les clients veulent plus de visibilité, parce que la concurrence oblige à être plus rapide, et parce que les volumes à gérer augmentent.",
      "Cette transformation s'est faite en quatre étapes.",
      "[clic] Étape 1 : le papier et le téléphone, que nous venons de voir.",
      "[clic] Étape 2 : l'informatisation. On utilise des ordinateurs, des tableurs et des e-mails. C'est un progrès, mais chaque outil reste isolé : il faut encore recopier les informations d'un fichier à l'autre.",
      "[clic] Étape 3 : les outils connectés, comme le TMS, le GPS et l'informatique embarquée. Ici, les données circulent seules, en temps réel. Selon ses sources publiques, SJL se situe à ce niveau.",
      "[clic] Étape 4 : la logistique intelligente. Les données ne servent plus seulement à suivre, mais à prévoir et à décider, parfois avec l'IA. Pour SJL, c'est une perspective.",
      "(optionnel) Regardez les photos : à gauche le papier, à droite un employé avec une tablette et un scanner.",
      "[slide suivante]"]],
    ["Slide 9 – Avant / après", [
      "Comparons maintenant les deux façons de travailler, ligne par ligne.",
      "[clic] Les documents passent du papier aux documents numériques partagés. On ne perd plus un bon de livraison, et tout le monde voit la même version.",
      "[clic] Le suivi des camions passe du téléphone au GPS en temps réel. On sait où est le camion sans déranger le chauffeur.",
      "[clic] La planification se fait dans un logiciel, le TMS, au lieu de tableaux manuels qui dépendent de l'expérience d'une seule personne.",
      "[clic] Le client connaît plus vite le statut de son envoi, ce qui renforce sa confiance.",
      "[clic] Et les décisions s'appuient sur des données et des indicateurs, plus seulement sur l'intuition.",
      "Retenez ceci : la digitalisation ne change pas le métier, qui reste de transporter des marchandises. Elle change la façon de l'organiser : plus vite, avec moins d'erreurs et plus de transparence. Fati va vous présenter les technologies qui rendent cela possible.",
      "[slide suivante – passer la parole à Fati]"]],
  ]],
  ["Fati – Slides 10 à 13 · Architecture, GPS, TMS et informatique embarquée", "5 min", [
    ["Slide 10 – L'architecture d'une logistique connectée", [
      "Merci Salma. Pour comprendre les technologies, imaginons un bâtiment à quatre étages. On le lit de bas en haut.",
      "[clic] En bas, le terrain : les camions, le GPS, l'informatique embarquée et, éventuellement, des capteurs.",
      "[clic] Ensuite, la connectivité : les réseaux mobiles et Internet, qui transportent les données.",
      "[clic] Puis les plateformes, qui organisent les données : le TMS, le WMS et le Cloud.",
      "[clic] En haut, l'analyse et la décision : le Big Data, les tableaux de bord et, demain, l'IA.",
      "[clic] À droite, la cybersécurité protège tous les étages.",
      "Les cases orange sont confirmées chez SJL : le GPS, l'informatique embarquée et le TMS. Les autres sont des technologies générales du secteur.",
      "[slide suivante]"]],
    ["Slide 11 – Le GPS et la géolocalisation", [
      "Commençons par le GPS. Comment ça marche ?",
      "[clic] Des satellites envoient des signaux.",
      "[clic] Le boîtier GPS du camion calcule sa position.",
      "[clic] Le réseau mobile transmet cette position.",
      "[clic] Une plateforme de suivi l'affiche sur une carte, avec l'heure d'arrivée estimée.",
      "[clic] Et l'agence peut suivre l'envoi, et selon les cas le client aussi.",
      "Chez SJL, c'est confirmé : l'entreprise annonce un suivi en temps réel par GPS et géolocalisation. Exemple : un client demande où est sa marchandise ; l'agent répond en quelques secondes, sans appeler le chauffeur.",
      "Passons maintenant au TMS, le logiciel qui organise tout le transport.",
      "[slide suivante]"]],
    ["Slide 12 – Le TMS : le cerveau du transport", [
      "Le TMS, ou Transport Management System, est le logiciel qui organise le transport. On peut le voir comme le cerveau des opérations.",
      "Il reçoit les données du GPS et de l'informatique embarquée, comme le montre la flèche en haut.",
      "[clic] Il enregistre les commandes des clients et suit le statut des envois.",
      "[clic] Il aide à planifier : quel camion, quel chauffeur, quel horaire. Il calcule aussi la facturation.",
      "[clic] Il édite les documents de transport et produit des indicateurs : délais, coûts, qualité.",
      "Chez SJL, le TMS est confirmé : il est cité sur la page de la plateforme Tanger Med et dans une offre d'emploi. Mais SJL ne publie pas le détail des modules : ce schéma présente les fonctions générales d'un TMS.",
      "[slide suivante]"]],
    ["Slide 13 – Le camion connecté chez SJL", [
      "L'informatique embarquée, ce sont les équipements numériques installés à bord du camion.",
      "Chez SJL, c'est confirmé : l'entreprise indique que ses camions sont équipés d'une technologie embarquée pour suivre les expéditions.",
      "[clic] Concrètement, cela permet d'envoyer la position du camion…",
      "[clic] … et de connaître le statut de l'expédition à chaque étape. Ces deux fonctions sont en orange : elles sont annoncées par SJL.",
      "[clic] Dans le secteur, ces systèmes servent souvent aussi aux échanges entre le chauffeur et l'agence…",
      "[clic] … et à la remontée de données du véhicule. Ces fonctions sont en blanc : SJL ne les détaille pas.",
      "Raghad va maintenant vous parler de l'Internet des objets et des données.",
      "[slide suivante – passer la parole à Raghad]"]],
  ]],
  ["Raghad – Slides 14 et 15 · IoT, Cloud et Big Data", "2 min 30", [
    ["Slide 14 – L'IoT et la logistique connectée", [
      "Merci Fati. L'Internet des objets, ou IoT, ce sont des objets équipés de capteurs qui envoient des données automatiquement.",
      "Attention : c'est une technologie générale du secteur. Nous n'avons pas trouvé de source qui confirme son usage chez SJL.",
      "Sur un camion, on peut mesurer la température, l'ouverture des portes, les chocs ou la position.",
      "[clic] Le capteur mesure.",
      "[clic] Le réseau transmet les données.",
      "[clic] La plateforme compare les mesures aux seuils prévus.",
      "[clic] Si un problème apparaît, une alerte est envoyée. Par exemple, pour des produits frais, l'agence est prévenue si la remorque devient trop chaude.",
      "[slide suivante]"]],
    ["Slide 15 – Cloud Computing, Big Data et analyse de données", [
      "Toutes ces données doivent être stockées et exploitées. C'est le rôle d'une chaîne en cinq étapes.",
      "[clic] On collecte les données : GPS, TMS, capteurs.",
      "[clic] On les stocke dans le Cloud, c'est-à-dire sur des serveurs accessibles par Internet.",
      "[clic] On les traite, parfois en très grands volumes : c'est le Big Data.",
      "[clic] On les affiche dans des tableaux de bord.",
      "[clic] Et on décide plus vite.",
      "[clic] Trois exemples simples : avec le Cloud, une agence à Tanger et une agence en Espagne voient les mêmes données. Le Big Data, ce sont les positions GPS de toute une flotte, jour après jour. Et l'analyse permet de repérer les itinéraires où les retards sont fréquents.",
      "Hiba va vous parler de l'intelligence artificielle.",
      "[slide suivante – passer la parole à Hiba]"]],
  ]],
  ["Hiba – Slides 16 et 17 · IA et cas pratique", "3 min", [
    ["Slide 16 – L'IA dans la logistique moderne", [
      "Merci Raghad. L'intelligence artificielle, ce sont des systèmes qui apprennent à partir de données pour prévoir ou automatiser.",
      "Point important : nous n'avons trouvé aucune source publique indiquant que SJL utilise l'IA aujourd'hui. Ce que nous présentons, ce sont des possibilités pour l'avenir.",
      "[clic] L'analyse prédictive : anticiper un retard grâce aux données de trafic, d'attente au port ou de météo.",
      "[clic] L'optimisation des itinéraires : choisir le trajet le plus rapide et le moins coûteux.",
      "[clic] La prévision de la demande : réserver à l'avance les camions et l'espace d'entrepôt.",
      "[clic] L'automatisation : lire les documents automatiquement, ou répondre aux clients avec un chatbot.",
      "L'IA a besoin de données. Or le TMS et le GPS de SJL en produisent déjà : ils sont une base pour l'IA de demain.",
      "[slide suivante]"]],
    ["Slide 17 – Exemple pratique : de la commande à la livraison", [
      "Pour rendre tout cela concret, suivons un scénario pédagogique : un export de pièces automobiles de Tanger vers l'Espagne. Ce n'est pas une opération réelle de SJL, mais un exemple construit avec ses outils confirmés.",
      "[clic] Étape 1 : le client demande un transport. La commande est saisie dans le TMS.",
      "[clic] Étape 2 : le TMS aide à choisir le camion, le chauffeur et l'horaire.",
      "[clic] Étape 3 : au chargement, l'informatique embarquée met à jour le statut : « chargé ».",
      "[clic] Étape 4 : pendant le passage par Tanger Med et le détroit, le GPS donne la position en temps réel.",
      "[clic] Étape 5 : à la livraison, la preuve de livraison permet de facturer.",
      "À chaque étape, une donnée est créée. C'est elle qui rend la logistique plus rapide et plus transparente. Saad va conclure.",
      "[slide suivante – passer la parole à Saad]"]],
  ]],
  ["Saad Boufas – Slides 18 à 20 · Bilan, recommandations, conclusion", "2 min 30", [
    ["Slide 18 – Bénéfices et défis", [
      "Merci Hiba. Faisons le bilan.",
      "[clic] Les bénéfices : plus d'efficacité, car il y a moins de tâches manuelles ; des coûts mieux maîtrisés ; une meilleure traçabilité ; et un client mieux informé.",
      "[clic] Mais il y a aussi des défis : la cybersécurité, car plus de données, c'est plus de risques ; le coût des investissements ; le besoin de former le personnel ; et la résistance au changement.",
      "[slide suivante]"]],
    ["Slide 19 – Recommandations", [
      "Voici nos recommandations. Ce sont nos propositions, pas des projets annoncés par SJL.",
      "[clic] À court terme : former les employés aux outils, et renforcer la cybersécurité avec des gestes simples.",
      "[clic] À moyen terme : mieux exploiter les données du TMS et du GPS dans des tableaux de bord, et informer automatiquement les clients.",
      "[clic] À long terme : tester l'IA avec un petit projet pilote, comme la prévision des retards, puis optimiser les trajets.",
      "[slide suivante]"]],
    ["Slide 20 – Ce qu'il faut retenir", [
      "Pour conclure, trois idées.",
      "**Un :** la digitalisation remplace le papier et le téléphone par des données en temps réel.",
      "**Deux :** SJL annonce publiquement un TMS, une informatique embarquée et le suivi GPS.",
      "**Trois :** l'IA est une piste d'avenir, qui demande de la formation et de la cybersécurité.",
      "Toutes nos sources sont listées à droite. Merci de votre attention."]],
  ]],
];

// inline **bold** parser
function runs(text, base = {}) {
  const out = [];
  text.split(/(\*\*[^*]+\*\*)/).forEach((seg) => {
    if (!seg) return;
    if (seg.startsWith("**")) out.push(new TextRun({ text: seg.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: seg, ...base }));
  });
  return out;
}
function line(t) {
  if (/^\[slide suivante/.test(t)) {
    return new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 60, after: 200 },
      children: [new TextRun({ text: "▶ " + t.slice(1, -1).toUpperCase(), bold: true, size: 18, color: NAVY, characterSpacing: 20 })] });
  }
  if (t.startsWith("[clic]")) {
    return new Paragraph({ spacing: { after: 100 }, indent: { left: 360 },
      children: [new TextRun({ text: "CLIC  ", bold: true, color: OR, size: 18 }), ...runs(t.slice(7))] });
  }
  if (t.startsWith("(optionnel)")) {
    return new Paragraph({ spacing: { after: 100 }, indent: { left: 360 },
      children: [new TextRun({ text: "Optionnel  ", bold: true, color: MUTE, size: 18 }), ...runs(t.slice(12), { italics: true, color: MUTE })] });
  }
  return new Paragraph({ spacing: { after: 100 }, indent: { left: 360 }, children: runs(t) });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "D5DCE5" };
const borders = { top: border, bottom: border, left: border, right: border };
const colW = [1900, 900, 4126, 1100, 1000]; // sums to 9026 (A4 with 1" margins)
function cell(text, w, head, shade) {
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: head ? NAVY : (shade ? GREY : "FFFFFF") },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: head, color: head ? "FFFFFF" : "1B2A40", size: 20 })] })] });
}
const table = new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: colW, layout: TableLayoutType.FIXED,
  rows: [
    new TableRow({ tableHeader: true, children: ["Présentateur", "Slides", "Thème", "Durée", "Fin vers"].map((t, i) => cell(t, colW[i], true)) }),
    ...team.map((r, k) => new TableRow({ children: r.map((t, i) => cell(t, colW[i], false, k % 2 === 1)) })),
  ] });

const children = [
  new Paragraph({ children: [new TextRun({ text: "ENCG · MODULE DIGITAL SKILLS · 1RE ANNÉE", bold: true, color: OR, size: 20, characterSpacing: 40 })], spacing: { after: 120 } }),
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Script oral de la présentation")] }),
  new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: "La digitalisation de la fonction logistique au sein de SJL Group", size: 28, color: NAVY })] }),
  new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: "8 présentateurs · 20 slides · environ 25 minutes", color: MUTE, size: 22 })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Répartition et minutage")] }),
  table,
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Légende")] }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "CLIC  ", bold: true, color: OR, size: 18 }), new TextRun("appuyer une fois sur la flèche droite : un élément apparaît.")] }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "▶ SLIDE SUIVANTE  ", bold: true, color: NAVY, size: 18 }), new TextRun("passer à la slide suivante (transition Morph).")] }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Optionnel  ", bold: true, color: MUTE, size: 18 }), new TextRun("phrase à sauter si le temps manque.")] }),
];
parts.forEach(([title, dur, slides]) => {
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Durée : " + dur, bold: true, color: OR, size: 20 })] }));
  slides.forEach(([st, lines]) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(st)] }));
    lines.forEach((l) => children.push(line(l)));
  });
});
children.push(new Paragraph({ spacing: { before: 240 }, shading: { type: ShadingType.CLEAR, color: "auto", fill: GREY },
  children: [new TextRun({ text: "Questions du public : ", bold: true }), new TextRun("chacun répond aux questions sur ses propres slides. Sur l'IA chez SJL : « Nous n'avons trouvé aucune source publique qui la confirme ; c'est pourquoi nous la présentons comme une perspective. »")] }));

const doc = new Document({
  creator: "Groupe ENCG", title: "Script oral – SJL Group",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22, color: "1B2A40" }, paragraph: { spacing: { line: 288 } } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: "Arial", size: 48, bold: true, color: NAVY }, paragraph: { spacing: { before: 0, after: 120 }, keepNext: true } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Arial", size: 30, bold: true, color: NAVY }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: OR, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Arial", size: 24, bold: true, color: OR }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Script oral · SJL Group · page ", size: 18, color: MUTE }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTE })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync("Script_oral_SJL.docx", b); console.log("ok"); });
