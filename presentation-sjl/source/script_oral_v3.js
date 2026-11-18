const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
  HeadingLevel, BorderStyle, Footer, PageNumber, PageBreak, TableLayoutType } = require("docx");

const NAVY = "0E3B2E", OR = "D62828", GREY = "F3F5F4", MUTE = "5C6B65";

const team = [
  ["Saad Boufas", "1 – 3", "Ouverture, sommaire, problématique", "2 min 30", "2:30"],
  ["Mouna", "4 – 7", "Présentation de SJL : identité, historique, plateformes, services", "3 min", "5:30"],
  ["Alae", "8 – 9", "La logistique : définition, flux, 5 B, processus", "3 min 30", "9:00"],
  ["Salma", "10 – 11", "Acteurs de la logistique et difficultés", "3 min", "12:00"],
  ["Fati", "12 – 14", "Digitalisation, avant/après, socle technologique", "3 min 30", "15:30"],
  ["Raghad", "15 – 17", "Technologies, parcours digital, outils de SJL", "3 min 30", "19:00"],
  ["Hiba", "18 – 21", "Impacts, KPI, SWOT, TOWS", "3 min", "22:00"],
  ["Saad Boufas", "22 – 26", "Défis, recommandations, conclusion, perspectives", "3 min", "25:00"],
];

const parts = [
  ["Saad Boufas – Slides 1 à 3 · Ouverture et problématique", "2 min 30", [
    ["Slide 1 – Couverture", [
      "Bonjour à toutes et à tous, bonjour Madame / Monsieur [nom de l'encadrant(e)].",
      "Nous sommes un groupe d'étudiants de première année à l'ENCG Tanger, et nous allons vous présenter notre projet du module Digital Skills : **la digitalisation de la logistique chez SJL Group**.",
      "SJL est un groupe de transport international et de logistique, d'origine espagnole, très présent à Tanger. Vous voyez d'ailleurs un de ses camions sur cette photo, aux couleurs rouge et vert du groupe.",
      "[slide suivante]"]],
    ["Slide 2 – Sommaire", [
      "Notre présentation suit sept étapes.",
      "[clic] D'abord l'introduction, puis la présentation de SJL, sa logistique, et enfin la digitalisation avec son socle technologique.",
      "[clic] Ensuite, nous verrons l'impact sur la performance, notre analyse stratégique, et nous terminerons par la conclusion et les perspectives.",
      "[slide suivante]"]],
    ["Slide 3 – Problématique et objectifs", [
      "Notre point de départ est une question : **comment la digitalisation peut-elle améliorer la performance logistique de SJL, notamment en matière de suivi des marchandises, de coordination des opérations et d'optimisation des délais ?**",
      "Cette question se divise en trois axes.",
      "[clic] Premier axe : le suivi des marchandises, c'est-à-dire savoir à tout moment où se trouve un envoi.",
      "[clic] Deuxième axe : la coordination des opérations, donc la communication entre les services et avec les partenaires.",
      "[clic] Troisième axe : l'optimisation des délais, pour réduire le temps entre la commande et la livraison.",
      "Pour commencer, Mouna va vous présenter le groupe SJL.",
      "[slide suivante – passer la parole à Mouna]"]],
  ]],
  ["Mouna – Slides 4 à 7 · Présentation de SJL", "3 min", [
    ["Slide 4 – Qui est SJL Group ?", [
      "Merci Saad. SJL, c'est le Groupe San José & López. C'est un groupe d'origine espagnole, spécialisé dans le transport international de marchandises et les services logistiques.",
      "Il a une présence importante au Maroc, notamment à Tanger, et il relie l'Europe et l'Afrique du Nord. Sur la carte, vous voyez l'Espagne, origine du groupe, Tanger, son grand pôle au Maroc, et la Tunisie, où il est présent depuis 2014.",
      "[clic] SJL travaille surtout pour des clients industriels de quatre secteurs : l'automobile, le textile, l'agroalimentaire et les biens de consommation.",
      "[slide suivante]"]],
    ["Slide 5 – Historique et évolution", [
      "L'histoire du groupe commence en Espagne.",
      "[clic] En 1948, création de Transportes Internacionales San José, et en 1949, de Transportes López.",
      "[clic] En 1986, l'activité démarre au Maroc avec Tremsa. Et en 2002, les deux entreprises fusionnent : c'est la naissance du groupe SJL.",
      "[clic] En 2005, SJL s'installe dans la Zone Franche de Tanger, puis en 2012, il lance ses activités logistiques à Tanger Med.",
      "[clic] En 2014, le groupe se développe en Tunisie, et en 2019, il ouvre une plateforme à Tanger Automotive City.",
      "[clic] En résumé, SJL est passé d'un simple transporteur international à un prestataire de solutions supply chain complètes.",
      "[slide suivante]"]],
    ["Slide 6 – Trois plateformes logistiques à Tanger", [
      "À Tanger, SJL dispose de trois plateformes.",
      "[clic] Tanger Automotive City, avec 10 000 mètres carrés, au plus près des usines automobiles.",
      "[clic] Tanger Med, avec 7 500 mètres carrés dans la zone portuaire, avec un accès direct aux flux d'import et d'export.",
      "[clic] Et MEAD, dans la zone franche de Tanger, avec 1 900 mètres carrés et des agents des douanes sur place.",
      "[slide suivante]"]],
    ["Slide 7 – Positionnement et services", [
      "SJL propose quatre familles de services.",
      "[clic] Le transport international et national : transport routier entre le Maroc et l'Europe, en chargement complet ou partiel.",
      "[clic] Le transit et les opérations douanières, y compris la gestion des retours.",
      "[clic] La préparation et le conditionnement : étiquetage, emballage et contrôle qualité.",
      "[clic] Et l'entreposage avec la gestion des stocks et la préparation des commandes.",
      "Pour bien comprendre ces services, Alae va maintenant vous expliquer ce qu'est la logistique.",
      "[slide suivante – passer la parole à Alae]"]],
  ]],
  ["Alae – Slides 8 et 9 · La logistique : définition, flux et processus", "3 min 30", [
    ["Slide 8 – Qu'est-ce que la logistique ?", [
      "Merci Mouna. Avant de parler de digitalisation, il faut bien comprendre ce qu'est la logistique.",
      "La logistique, c'est **l'ensemble des activités qui planifient, mettent en œuvre et contrôlent les flux, du fournisseur jusqu'au client final**. Autrement dit, ce n'est pas seulement le transport : c'est toute l'organisation qui permet à un produit d'arriver chez le client.",
      "Prenons un exemple simple : une usine automobile à Tanger doit envoyer des pièces à un client en Espagne. Il faut préparer la marchandise, réserver un camion, établir les documents, passer la douane, traverser le détroit et livrer à l'heure. Tout cela, c'est la logistique.",
      "[clic] La logistique gère trois flux en même temps. Le **flux physique** : ce sont les marchandises elles-mêmes, qui voyagent en camion et en bateau. Le **flux d'information** : les commandes, les statuts, les documents de transport et de douane. Et le **flux financier** : les factures et les paiements.",
      "Retenez bien le flux d'information : c'est lui que le numérique transforme le plus, et c'est le cœur de notre sujet.",
      "[clic] Les objectifs de la logistique sont clairs : réduire les coûts, améliorer la qualité de service, optimiser les stocks, réduire les délais, et gagner en fiabilité et en traçabilité.",
      "[clic] On les résume souvent avec la **règle des 5 B** : le bon produit, en bonne quantité, au bon endroit, au bon moment, au meilleur coût et avec le bon niveau de service. Si l'un de ces B manque, le client n'est pas satisfait. Par exemple, une livraison complète mais en retard peut arrêter une chaîne de production chez un client automobile.",
      "[slide suivante]"]],
    ["Slide 9 – Les étapes du processus logistique", [
      "Concrètement, la logistique suit un processus en huit étapes.",
      "[clic] Tout commence par la **prévision et la planification de la demande** : on estime les volumes à transporter et à stocker. Ensuite vient l'**approvisionnement**, avec le choix des fournisseurs et les achats. Puis la **réception et le contrôle** des marchandises, pour vérifier les quantités et leur état. Et enfin le **stockage et la gestion des stocks**, pour savoir à tout moment ce qui est disponible.",
      "[clic] La deuxième partie du processus va vers le client. La **préparation des commandes**, avec le picking et l'emballage. Le **transport et la distribution**. La **livraison au client**, avec la preuve de livraison. Et enfin le **service après-vente et la logistique inverse**, c'est-à-dire la gestion des retours.",
      "Ce qu'il faut comprendre, c'est que chaque étape produit des informations qui conditionnent la suivante. Une erreur au début, par exemple une mauvaise quantité à la réception, se répercute jusqu'au client. C'est pour cela que la circulation de l'information est si importante.",
      "Salma va maintenant vous présenter les acteurs de la logistique et les difficultés rencontrées.",
      "[slide suivante – passer la parole à Salma]"]],
  ]],
  ["Salma – Slides 10 et 11 · Acteurs et difficultés logistiques", "3 min", [
    ["Slide 10 – Les acteurs et services impliqués", [
      "Merci Alae. Une commande logistique ne dépend pas d'une seule personne : elle mobilise plusieurs services, sous l'autorité de la direction générale, qui définit la stratégie et supervise l'ensemble.",
      "[clic] D'abord, le **service commercial**, qui gère la relation client et identifie les besoins. Et le **service exploitation**, qui organise et coordonne les opérations de transport.",
      "[clic] Ensuite, le **service transport**, qui suit les moyens de transport, et le **service logistique**, qui gère les flux physiques et les marchandises dans les entrepôts.",
      "[clic] Il y a aussi le **service administratif**, qui traite les documents, et les **chauffeurs et livreurs**, qui assurent le transport physique et la livraison.",
      "[clic] Enfin, il y a les acteurs externes : les clients, les fournisseurs, les partenaires de transport et les partenaires douaniers.",
      "Vous voyez donc qu'une même commande traverse au moins six services et plusieurs partenaires. Si chacun n'a pas la même information au même moment, les erreurs et les retards apparaissent.",
      "[slide suivante]"]],
    ["Slide 11 – Les principales difficultés logistiques", [
      "Justement, quelles sont les difficultés d'un transporteur international comme SJL ?",
      "[clic] Première difficulté : les **retards de livraison**, à cause du trafic, de l'attente au port ou à la douane. Deuxième : la **coordination entre les services**, quand l'exploitation, le transport et l'administratif ne travaillent pas avec les mêmes informations. Troisième : le **manque de visibilité** sur les marchandises en transit. Sans outil, pour savoir où est un camion, il faut appeler le chauffeur.",
      "[clic] Quatrième difficulté : la **communication et la circulation de l'information**, quand les échanges passent par le téléphone et les e-mails, avec des ressaisies et des erreurs. Cinquième : la **gestion des imprévus et des coûts de transport**, par exemple un camion qui revient à vide ou une réorganisation de dernière minute. Et sixième : le **suivi des performances**, difficile sans données fiables et centralisées.",
      "Imaginez un client qui appelle pour savoir quand arrive sa marchandise. Sans outil numérique, l'agent doit appeler le chauffeur, attendre sa réponse, puis rappeler le client. Cela prend du temps et donne une mauvaise image.",
      "[clic] Ces difficultés sont précisément celles auxquelles la digitalisation cherche à répondre. Fati va vous expliquer comment.",
      "[slide suivante – passer la parole à Fati]"]],
  ]],
  ["Fati – Slides 12 à 14 · Digitalisation et socle technologique", "3 min 30", [
    ["Slide 12 – Digitalisation et transformation digitale", [
      "Merci Salma. On entend souvent les mots « digitalisation » et « transformation digitale », mais ils ne veulent pas dire exactement la même chose.",
      "[clic] La **digitalisation**, c'est utiliser les technologies numériques pour convertir, traiter et gérer des informations et des opérations sous forme numérique. Par exemple, remplacer un bon de livraison papier par un document numérique, ou un tableau à la main par un logiciel.",
      "[clic] La **transformation digitale** est plus large : c'est intégrer le numérique dans toute l'entreprise, pour transformer les méthodes de travail, les processus et parfois même le modèle économique. Chez SJL, c'est par exemple le passage d'un simple transporteur à un prestataire de solutions supply chain complètes.",
      "[clic] Dans la logistique, la digitalisation apporte quatre choses concrètes : le suivi des marchandises en temps réel, l'automatisation de certaines opérations, une meilleure gestion des stocks, et une communication facilitée entre tous les acteurs.",
      "[slide suivante]"]],
    ["Slide 13 – Avant / après la digitalisation", [
      "Pour bien voir le changement, comparons avant et après.",
      "[clic] Avant, les documents étaient en papier : on pouvait les perdre ou les remplir avec des erreurs. Après, ils sont numériques et partagés : tout le monde voit la même version.",
      "[clic] Avant, le suivi des stocks était manuel. Après, les stocks sont informatisés : on sait en quelques secondes ce qui est disponible.",
      "[clic] Avant, on communiquait par téléphone. Après, la communication est connectée : les informations circulent automatiquement entre les services.",
      "[clic] Avant, les commandes étaient traitées à la main. Après, certaines tâches sont automatisées, ce qui fait gagner du temps et réduit les erreurs.",
      "[clic] Et surtout, avant, la visibilité était limitée. Après, le suivi et la traçabilité sont améliorés : on sait où se trouve la marchandise à chaque étape.",
      "On passe donc d'une gestion principalement manuelle à une gestion connectée, automatisée et fondée sur les données.",
      "[slide suivante]"]],
    ["Slide 14 – Le socle technologique moderne", [
      "Cette transformation repose sur un socle de cinq technologies, qui fonctionnent ensemble.",
      "[clic] Le **cloud computing** : stocker les données et y accéder à distance, par Internet. Une agence à Tanger et une agence en Espagne peuvent ainsi voir les mêmes informations.",
      "[clic] Le **Big Data et l'analyse de données** : analyser de grandes quantités de données pour mieux décider, par exemple repérer les itinéraires où les retards sont fréquents.",
      "[clic] L'**Internet des objets**, ou IoT : des objets connectés qui collectent et transmettent des informations, comme un capteur de température dans une remorque.",
      "[clic] L'**intelligence artificielle** : prévoir la demande et aider à optimiser les opérations.",
      "[clic] Et la **cybersécurité**, qui protège les systèmes, les données et les échanges. Plus une entreprise est connectée, plus elle doit se protéger.",
      "Raghad va maintenant vous montrer comment ces technologies s'appliquent concrètement à la logistique, et chez SJL.",
      "[slide suivante – passer la parole à Raghad]"]],
  ]],
  ["Raghad – Slides 15 à 17 · Technologies, parcours digital et outils de SJL", "3 min 30", [
    ["Slide 15 – Les technologies appliquées à la logistique", [
      "Merci Fati. Dans la logistique, ce socle se traduit par des outils très concrets.",
      "[clic] Le **GPS** localise les véhicules et suit les trajets. L'**IoT** surveille les marchandises et les conditions de transport. Les **codes-barres et la RFID** identifient les marchandises et assurent leur traçabilité. Et le **cloud** permet de partager les informations logistiques.",
      "[clic] Il y a ensuite les grands logiciels métier. Le **WMS**, Warehouse Management System, gère les entrepôts et les stocks : il sait où se trouve chaque palette, et il peut organiser les emplacements selon une analyse ABC, c'est-à-dire mettre les produits les plus demandés aux endroits les plus accessibles. Le **TMS**, Transport Management System, planifie et suit le transport et optimise les itinéraires. Et l'**intelligence artificielle** aide à prévoir la demande et à optimiser les trajets.",
      "[slide suivante]"]],
    ["Slide 16 – Le parcours digital d'une commande", [
      "Pour comprendre comment ces outils travaillent ensemble, suivons une commande, étape par étape.",
      "[clic] Étape 1 : la commande du client est **enregistrée** dans le système.",
      "[clic] Étape 2 : le **WMS** localise le produit dans l'entrepôt et lance la préparation.",
      "[clic] Étape 3 : le **TMS** organise le transport : il choisit le camion, le chauffeur et l'horaire.",
      "[clic] Étape 4 : pendant le trajet, le **GPS** permet de suivre le véhicule en temps réel.",
      "[clic] Étape 5 : les informations de livraison sont actualisées et **communiquées au client**.",
      "Le message de cette slide est simple : de l'entrepôt au client, l'information est continue. Personne n'a besoin de rappeler qui que ce soit pour savoir où en est la commande.",
      "[slide suivante]"]],
    ["Slide 17 – La digitalisation chez SJL", [
      "Et chez SJL, concrètement ? Selon sa documentation officielle, le groupe s'appuie sur quatre outils principaux.",
      "[clic] Un **WMS**, pour gérer ses entrepôts et ses stocks, par exemple sur ses plateformes de Tanger.",
      "[clic] Un **TMS**, pour piloter les opérations et les flux de marchandises, et gérer le suivi du transport.",
      "[clic] Une **informatique embarquée** : des équipements numériques intégrés aux véhicules, pour suivre et piloter les flux en temps réel.",
      "[clic] Et des outils de **reporting et des tableaux de bord**, pour suivre les performances logistiques.",
      "[clic] Selon SJL, ces outils permettent un suivi des opérations plus fiable et de meilleurs échanges avec les clients. SJL annonce aussi le suivi GPS et la géolocalisation de ses envois.",
      "Précision importante : les autres technologies, comme l'IoT ou l'intelligence artificielle, sont des applications générales du secteur. Nous n'avons pas de source qui confirme qu'elles sont utilisées chez SJL.",
      "Hiba va maintenant vous présenter l'impact de tout cela sur la performance.",
      "[slide suivante – passer la parole à Hiba]"]],
  ]],
  ["Hiba – Slides 18 à 21 · Impacts, KPI, SWOT et TOWS", "3 min", [
    ["Slide 18 – Les impacts de la digitalisation", [
      "Merci Raghad. La digitalisation agit sur quatre dimensions de la performance.",
      "[clic] La **performance opérationnelle** : des temps de transit réduits, un espace de stockage optimisé et des précommandes traitées automatiquement.",
      "[clic] La **performance financière** : moins de stock immobilisé, des économies de carburant grâce aux routes optimisées, et moins de pénalités de retard.",
      "[clic] La **qualité et la satisfaction client** : une traçabilité de bout en bout et moins d'erreurs d'expédition.",
      "[clic] Et la dimension **stratégique et RSE** : anticiper les ruptures, mesurer l'empreinte carbone, et mieux résister aux chocs du marché.",
      "[slide suivante]"]],
    ["Slide 19 – Les leviers technologiques et les KPI", [
      "[clic] Deux leviers expliquent ces résultats : la fluidification des flux, grâce au WMS, au TMS et à l'IoT, et des décisions pilotées par la donnée.",
      "Pour mesurer la performance, on utilise des indicateurs, appelés KPI.",
      "[clic] L'**OTIF**, On Time In Full : le taux de livraisons complètes et à l'heure.",
      "[clic] Le **lead time** : le temps total d'exécution d'une commande.",
      "[clic] Et la **rotation des stocks** : le rythme auquel les stocks se renouvellent. SJL ne publie pas les valeurs de ces indicateurs.",
      "[slide suivante]"]],
    ["Slide 20 – Analyse SWOT", [
      "Voici notre analyse SWOT de la digitalisation chez SJL.",
      "[clic] Les **forces** : des outils structurants comme le WMS et le TMS, une traçabilité en temps réel et une culture du pilotage par les indicateurs.",
      "[clic] Les **faiblesses** : d'anciens et de nouveaux systèmes qui coexistent, des coûts d'investissement élevés et des compétences digitales inégales.",
      "[clic] Les **opportunités** : la logistique verte, l'IA prédictive et des portails partagés avec les partenaires.",
      "[clic] Les **menaces** : les cyber-risques, de nouveaux concurrents 100 % digitaux et les crises internationales.",
      "[slide suivante]"]],
    ["Slide 21 – Analyse stratégique TOWS", [
      "La matrice TOWS croise ces éléments pour en tirer des stratégies.",
      "[clic] Forces et opportunités : se différencier avec une offre bas-carbone, traçable et certifiée.",
      "[clic] Forces et menaces : sécuriser les données pour résister aux cyberattaques.",
      "[clic] Faiblesses et opportunités : moderniser progressivement les systèmes grâce aux API et au cloud.",
      "[clic] Faiblesses et menaces : former les équipes pour accompagner le changement.",
      "Saad va maintenant vous présenter les défis, nos recommandations et notre conclusion.",
      "[slide suivante – passer la parole à Saad]"]],
  ]],
  ["Saad Boufas – Slides 22 à 26 · Défis, recommandations et conclusion", "3 min", [
    ["Slide 22 – Les obstacles et défis", [
      "Merci Hiba. La digitalisation n'est pas sans difficultés.",
      "[clic] Il faut intégrer les systèmes anciens et les nouveaux outils.",
      "[clic] Il faut financer des investissements technologiques importants.",
      "[clic] Il faut que les équipes adoptent réellement les outils.",
      "[clic] Il faut protéger les données partagées.",
      "[clic] Et il faut faire évoluer les compétences de tous les collaborateurs.",
      "[slide suivante]"]],
    ["Slide 23 – Nos recommandations prioritaires", [
      "Pour répondre à ces défis, nous proposons quatre recommandations. Ce sont nos propositions, pas des projets annoncés par SJL.",
      "[clic] Un : l'interopérabilité, en connectant le WMS et le TMS aux systèmes des clients par des API, pour supprimer les saisies manuelles.",
      "[clic] Deux : la gouvernance des données et la cybersécurité, avec une politique « Zero Trust » et la formation de toutes les équipes.",
      "[clic] Trois : la conduite du changement, avec une « Académie Digitale SJL » et des interfaces plus simples.",
      "[clic] Quatre : l'IA au service d'une logistique éco-responsable, pour optimiser les trajets et réduire l'empreinte carbone.",
      "[slide suivante]"]],
    ["Slide 24 – Conclusion", [
      "Pour répondre à notre problématique :",
      "[clic] le suivi en temps réel répond au manque de visibilité sur les marchandises en transit ;",
      "[clic] les outils connectés, comme le WMS, le TMS et le reporting, améliorent la coordination entre les services ;",
      "[clic] et le pilotage par les données et les KPI permet de réduire les délais.",
      "[clic] La digitalisation est donc un levier stratégique de compétitivité et d'amélioration continue pour SJL.",
      "[slide suivante]"]],
    ["Slide 25 – Perspectives et ouverture", [
      "Et demain ? Quatre perspectives se dessinent.",
      "[clic] Une supply chain davantage connectée.",
      "[clic] Une meilleure exploitation des données.",
      "[clic] Une logistique plus intelligente grâce à l'IA.",
      "[clic] Une approche plus durable et éco-responsable.",
      "[clic] En résumé : vers un réseau logistique international connecté.",
      "[slide suivante]"]],
    ["Slide 26 – Merci", [
      "Merci pour votre attention. Nous sommes prêts à répondre à vos questions."]],
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
  new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: "8 présentateurs · 26 slides · environ 25 minutes", color: MUTE, size: 22 })] }),
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
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Script oral · SJL Group · ENCG Tanger · page ", size: 18, color: MUTE }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTE })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync("Script_oral_SJL_v3.docx", b); console.log("ok"); });
