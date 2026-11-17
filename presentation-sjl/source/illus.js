// Generates the deck's explanatory illustrations as high-resolution PNGs.
const sharp = require("sharp");
const fs = require("fs");
fs.mkdirSync("img", { recursive: true });

const NAVY = "#10243A", NAVY2 = "#1B3A5C", BLUE = "#1F4E8C", SKY = "#A9C1E0",
  OR = "#F28C28", OR2 = "#D9701A", GREY = "#F2F4F7", G2 = "#DDE3EB", G3 = "#A9B4C4", INK = "#1B2A40";

function truck(tx, ty, s, o = {}) {
  const tr = o.trailer || "#FFFFFF", cab = o.cab || NAVY2;
  return `<g transform="translate(${tx},${ty}) scale(${s})">
  <ellipse cx="380" cy="262" rx="400" ry="14" fill="#000" opacity=".25"/>
  <rect x="0" y="0" width="560" height="205" rx="8" fill="${tr}"/>
  ${[1,2,3,4,5,6,7].map(i=>`<line x1="${i*70}" y1="8" x2="${i*70}" y2="197" stroke="#000" stroke-opacity=".06" stroke-width="3"/>`).join("")}
  <rect x="0" y="150" width="560" height="14" fill="${OR}"/>
  <rect x="0" y="168" width="560" height="5" fill="${NAVY}"/>
  <rect x="10" y="205" width="745" height="22" fill="${INK}"/>
  <path d="M572 34 h118 q34 0 46 30 l30 84 v78 h-194 z" fill="${cab}"/>
  <path d="M676 54 h24 q18 0 26 18 l20 56 h-70 z" fill="#BFD6EE"/>
  <path d="M684 60 h14 l6 0 l-14 64 h-10 z" fill="#fff" opacity=".35"/>
  <rect x="590" y="54" width="70" height="60" rx="4" fill="#fff" opacity=".12"/>
  <line x1="668" y1="54" x2="668" y2="222" stroke="#000" stroke-opacity=".25" stroke-width="3"/>
  <rect x="700" y="190" width="70" height="16" rx="3" fill="${G3}"/>
  <rect x="745" y="160" width="20" height="12" rx="3" fill="#FFE2A8"/>
  <rect x="582" y="40" width="10" height="186" fill="${INK}" opacity=".5"/>
  <rect x="760" y="60" width="8" height="40" rx="3" fill="${INK}"/>
  ${[90,160,560,630,715].map(cx=>`<circle cx="${cx}" cy="232" r="31" fill="#0E1726"/><circle cx="${cx}" cy="232" r="14" fill="${G3}"/><circle cx="${cx}" cy="232" r="5" fill="${INK}"/>`).join("")}
  </g>`;
}

function pin(x, y, s = 1, c = OR) {
  return `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 0 c-14 -18 -22 -28 -22 -40 a22 22 0 0 1 44 0 c0 12 -8 22 -22 40 z" fill="${c}"/><circle cx="0" cy="-40" r="8" fill="#fff"/></g>`;
}

const svgs = {};

// 1. COVER — dusk port scene with a connected truck
svgs.cover = { w: 1920, h: 1080, svg: `
<defs>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06142A"/><stop offset=".55" stop-color="${NAVY2}"/><stop offset="1" stop-color="#3A5F91"/></linearGradient>
 <radialGradient id="glow" cx="1350" cy="700" r="700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${OR}" stop-opacity=".75"/><stop offset=".45" stop-color="${OR}" stop-opacity=".18"/><stop offset="1" stop-color="${OR}" stop-opacity="0"/></radialGradient>
 <linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16243A"/><stop offset="1" stop-color="#050C18"/></linearGradient>
</defs>
<rect width="1920" height="1080" fill="url(#sky)"/>
<rect width="1920" height="1080" fill="url(#glow)"/>
<circle cx="1350" cy="700" r="80" fill="#FFB766" opacity=".85"/>
${Array.from({length:60},(_,i)=>`<circle cx="${(i*317)%1920}" cy="${(i*131)%420}" r="${i%3?1.2:2}" fill="#fff" opacity="${.25+(i%4)*.12}"/>`).join("")}
<!-- network overlay -->
${[[900,180],[1080,120],[1250,210],[1420,140],[1600,230],[1760,160],[1150,330],[1500,350],[1700,380]].map(([x,y],i,a)=>a.slice(i+1).filter(([x2,y2])=>Math.hypot(x2-x,y2-y)<260).map(([x2,y2])=>`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${SKY}" stroke-opacity=".35" stroke-width="2"/>`).join("")+`<circle cx="${x}" cy="${y}" r="6" fill="${i%3===0?OR:SKY}"/><circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${SKY}" stroke-opacity=".3" stroke-width="2"/>`).join("")}
<!-- port silhouettes -->
<g fill="#0A1A31" opacity=".95">
 ${[1000,1180,1560,1740].map(x=>`<rect x="${x}" y="470" width="14" height="300"/><rect x="${x+90}" y="470" width="14" height="300"/><rect x="${x-60}" y="460" width="260" height="22"/><rect x="${x+150}" y="430" width="120" height="16"/><rect x="${x+40}" y="400" width="30" height="62"/><line x1="${x+55}" y1="400" x2="${x+260}" y2="440" stroke="#0A1A31" stroke-width="5"/><rect x="${x+20}" y="482" width="6" height="90"/>`).join("")}
</g>
<g opacity=".9">
 ${Array.from({length:14},(_,i)=>{const cols=["#2C4A73","#3E5F8C","#B5651E","#24406A","#7A4A2A"];return [0,1,2].map(r=>`<rect x="${880+i*72}" y="${690-r*34-(i%3)*0}" width="68" height="32" fill="${cols[(i+r*2)%5]}"/>`).join("")}).join("")}
</g>
<rect x="0" y="760" width="1920" height="20" fill="#0B2547"/>
<rect x="0" y="780" width="1920" height="300" fill="url(#road)"/>
${Array.from({length:12},(_,i)=>`<rect x="${i*180}" y="925" width="100" height="8" fill="${OR}" opacity=".8"/>`).join("")}
${truck(1010, 650, 1.05, {cab: NAVY2})}
<!-- GPS link from truck to network -->
<defs><linearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0B1F3A" stop-opacity=".97"/><stop offset=".38" stop-color="#0B1F3A" stop-opacity=".9"/><stop offset=".6" stop-color="#0B1F3A" stop-opacity="0"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#fadeL)"/>
<path d="M1690 660 C1700 520 1690 440 1700 380" stroke="${OR}" stroke-width="4" stroke-dasharray="10 10" fill="none"/>
<circle cx="1690" cy="660" r="12" fill="${OR}"/><circle cx="1690" cy="660" r="26" fill="none" stroke="${OR}" stroke-width="3" opacity=".6"/><circle cx="1690" cy="660" r="42" fill="none" stroke="${OR}" stroke-width="2" opacity=".3"/>
`};

// 2. CONTROL ROOM
svgs.control = { w: 1200, h: 900, svg: `
<rect width="1200" height="900" fill="${NAVY}"/>
<rect y="640" width="1200" height="260" fill="#071529"/>
<g>
 <rect x="80" y="70" width="500" height="270" rx="10" fill="#0F2B52" stroke="${BLUE}" stroke-width="4"/>
 <rect x="100" y="90" width="460" height="230" fill="#123665"/>
 ${[[130,140],[200,260],[320,200],[420,280],[500,130]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="${SKY}"/>`).join("")}
 <path d="M120 300 L180 250 L260 270 L330 190 L420 220 L530 120" stroke="${OR}" stroke-width="6" fill="none" stroke-linecap="round"/>
 ${pin(530,128,1)}${pin(120,305,.8,SKY)}
 <path d="M100 160 Q 220 120 330 170 T 560 150" stroke="${SKY}" stroke-opacity=".35" stroke-width="10" fill="none"/>
 <rect x="620" y="70" width="500" height="270" rx="10" fill="#0F2B52" stroke="${BLUE}" stroke-width="4"/>
 <rect x="640" y="90" width="460" height="230" fill="#123665"/>
 ${[0,1,2,3,4,5,6].map(i=>`<rect x="${670+i*60}" y="${300-[90,140,110,170,150,190,210][i]}" width="36" height="${[90,140,110,170,150,190,210][i]}" fill="${i===6?OR:SKY}" opacity="${i===6?1:.8}"/>`).join("")}
 <rect x="80" y="370" width="320" height="200" rx="10" fill="#0F2B52" stroke="${BLUE}" stroke-width="4"/>
 ${[0,1,2,3,4].map(i=>`<rect x="105" y="${395+i*34}" width="160" height="16" rx="4" fill="${SKY}" opacity=".7"/><circle cx="${360}" cy="${403+i*34}" r="8" fill="${i===2?OR:"#4CC38A"}"/>`).join("")}
 <rect x="440" y="370" width="320" height="200" rx="10" fill="#0F2B52" stroke="${BLUE}" stroke-width="4"/>
 <circle cx="600" cy="470" r="70" fill="none" stroke="${SKY}" stroke-opacity=".3" stroke-width="26"/>
 <circle cx="600" cy="470" r="70" fill="none" stroke="${OR}" stroke-width="26" stroke-dasharray="330 440" transform="rotate(-90 600 470)"/>
 <rect x="800" y="370" width="320" height="200" rx="10" fill="#0F2B52" stroke="${BLUE}" stroke-width="4"/>
 <polyline points="825,540 870,500 915,515 960,460 1005,470 1050,420 1095,400" stroke="${OR}" stroke-width="6" fill="none"/>
 <polyline points="825,550 870,530 915,535 960,510 1005,515 1050,490 1095,485" stroke="${SKY}" stroke-width="4" fill="none" opacity=".7"/>
</g>
<!-- desk + operators -->
<path d="M0 700 L1200 700 L1200 760 L0 760 Z" fill="#1B2F4E"/>
${[260,600,940].map(x=>`<circle cx="${x}" cy="610" r="42" fill="#050E1C"/><path d="M${x-80} 700 q0 -70 80 -70 q80 0 80 70 z" fill="#050E1C"/><rect x="${x-110}" y="660" width="70" height="44" rx="4" fill="#24508A"/><rect x="${x+40}" y="660" width="70" height="44" rx="4" fill="#24508A"/>`).join("")}
`};

// 3. WAREHOUSE
svgs.warehouse = { w: 1200, h: 900, svg: `
<rect width="1200" height="900" fill="#E9EEF4"/>
<rect y="0" width="1200" height="110" fill="#D5DDE7"/>
${[0,1,2,3,4,5].map(i=>`<rect x="${40+i*200}" y="30" width="120" height="40" rx="6" fill="#fff" opacity=".8"/>`).join("")}
<rect y="720" width="1200" height="180" fill="#C9D2DD"/>
<rect y="780" width="1200" height="10" fill="${OR}" opacity=".7"/>
${[60,640].map(rx=>`<g>
 <rect x="${rx}" y="150" width="14" height="580" fill="${BLUE}"/><rect x="${rx+486}" y="150" width="14" height="580" fill="${BLUE}"/><rect x="${rx+243}" y="150" width="14" height="580" fill="${BLUE}"/>
 ${[300,470,640].map(y=>`<rect x="${rx}" y="${y}" width="500" height="12" fill="${OR}"/>`).join("")}
 ${[300,470,640].map((y,r)=>[0,1].map(b=>{const bx=rx+20+b*243;return `<rect x="${bx}" y="${y-12}" width="210" height="12" fill="#8C6B4A"/>`+[0,1,2].map(k=>`<rect x="${bx+6+k*68}" y="${y-12-(r===1&&k===2?0:90)}" width="64" height="${r===1&&k===2?0:90}" fill="${(k+b+r)%2?"#D9A066":"#C98B4E"}"/><rect x="${bx+28+k*68}" y="${y-102}" width="20" height="${r===1&&k===2?0:90}" fill="#fff" opacity=".18"/>`).join("")}).join("")).join("")}
</g>`).join("")}
<!-- forklift -->
<g transform="translate(470,560)">
 <rect x="0" y="40" width="150" height="100" rx="12" fill="${OR}"/>
 <rect x="20" y="-40" width="10" height="90" fill="${INK}"/><rect x="110" y="-40" width="10" height="90" fill="${INK}"/><rect x="20" y="-46" width="100" height="10" fill="${INK}"/>
 <rect x="35" y="-10" width="70" height="50" fill="#BFD6EE" opacity=".6"/>
 <rect x="150" y="-60" width="12" height="200" fill="${INK}"/><rect x="162" y="120" width="90" height="10" fill="${INK}"/>
 <rect x="170" y="40" width="80" height="78" fill="#C98B4E"/><rect x="162" y="118" width="96" height="6" fill="#8C6B4A"/>
 <rect x="182" y="58" width="40" height="22" fill="#fff"/>${[0,1,2,3,4,5,6].map(i=>`<rect x="${186+i*5}" y="62" width="${i%2?2:3}" height="14" fill="${INK}"/>`).join("")}
 <circle cx="35" cy="150" r="28" fill="#0E1726"/><circle cx="125" cy="150" r="22" fill="#0E1726"/>
</g>
<!-- scanner signal -->
<g transform="translate(980,560)"><rect x="0" y="0" width="80" height="130" rx="14" fill="${NAVY}"/><rect x="12" y="14" width="56" height="60" rx="6" fill="#4CC38A"/>
 ${[1,2,3].map(i=>`<path d="M${-10*i} ${40-12*i} q${-18*i} ${30+12*i} 0 ${60+24*i}" stroke="${OR}" stroke-width="5" fill="none" opacity="${1-i*.25}"/>`).join("")}</g>
`};

// 4. TRADITIONAL PAPERWORK
svgs.paper = { w: 1200, h: 900, svg: `
<rect width="1200" height="900" fill="#E9EEF4"/>
<rect y="620" width="1200" height="280" fill="#C8B9A6"/><rect y="610" width="1200" height="18" fill="#B3A28C"/>
<!-- stacked folders -->
${[0,1,2,3,4,5].map(i=>`<rect x="${90+(i%2)*8}" y="${560-i*36}" width="330" height="34" rx="4" fill="${["#7D8DA3","#A9B4C4","#5E7089","#C3CBD6","#8796AA","#6A7C95"][i]}"/>`).join("")}
<!-- papers -->
<g transform="translate(470,250) rotate(-6)"><rect width="300" height="390" fill="#fff" stroke="${G2}" stroke-width="3"/>
 <rect x="30" y="30" width="160" height="22" fill="${NAVY}" opacity=".8"/>${Array.from({length:10},(_,i)=>`<rect x="30" y="${80+i*28}" width="${i%3?240:180}" height="10" fill="${G3}"/>`).join("")}
 <circle cx="230" cy="330" r="40" fill="none" stroke="#C0392B" stroke-width="5" opacity=".7"/></g>
<g transform="translate(560,300) rotate(5)"><rect width="300" height="390" fill="#FBFBFB" stroke="${G2}" stroke-width="3"/>
 <text x="30" y="60" font-family="Arial" font-weight="bold" font-size="23" fill="${INK}">BON DE LIVRAISON</text>
 ${Array.from({length:6},(_,i)=>`<rect x="30" y="${90+i*40}" width="240" height="30" fill="none" stroke="${G3}" stroke-width="2"/><rect x="40" y="${100+i*40}" width="${60+(i*37)%120}" height="10" fill="${G3}"/>`).join("")}
 <path d="M40 360 q30 -30 60 0 t60 0 t60 -10" stroke="${BLUE}" stroke-width="4" fill="none"/></g>
<!-- old phone -->
<g transform="translate(900,470)"><rect width="220" height="150" rx="24" fill="${INK}"/><path d="M-10 20 q120 -80 240 0 l-20 40 q-100 -50 -200 0 z" fill="#2E3E56"/>
 ${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${55+c*40}" y="${70+r*24}" width="28" height="16" rx="4" fill="${G3}"/>`).join("")).join("")}
 <path d="M10 40 q-60 40 -40 120" stroke="${INK}" stroke-width="6" fill="none"/></g>
<!-- sticky notes + calendar -->
<rect x="920" y="140" width="200" height="220" fill="#fff" stroke="${G2}" stroke-width="3"/><rect x="920" y="140" width="200" height="46" fill="#C0392B" opacity=".85"/>
${Array.from({length:20},(_,i)=>`<rect x="${934+(i%5)*37}" y="${200+Math.floor(i/5)*38}" width="28" height="28" fill="${i===13?OR:G2}"/>`).join("")}
<rect x="130" y="150" width="130" height="130" fill="#FFD36B" transform="rotate(-8 195 215)"/><rect x="250" y="190" width="120" height="120" fill="${OR}" opacity=".85" transform="rotate(6 310 250)"/>
<!-- question marks: info delay -->
<text x="800" y="230" font-family="Arial" font-weight="bold" font-size="90" fill="${OR}" opacity=".9">?</text>
`};

// 5. GPS TABLET
svgs.gps = { w: 1200, h: 900, svg: `
<rect width="1200" height="900" fill="${GREY}"/>
<rect x="70" y="80" width="1060" height="740" rx="48" fill="${INK}"/>
<rect x="110" y="120" width="980" height="660" rx="12" fill="#E7EEF6"/>
<clipPath id="scr"><rect x="110" y="120" width="980" height="660" rx="12"/></clipPath>
<g clip-path="url(#scr)">
 <path d="M110 560 Q 300 520 420 600 T 700 780 L110 780 Z" fill="#BFD6EE"/>
 ${Array.from({length:9},(_,i)=>`<line x1="${110+i*120}" y1="120" x2="${60+i*130}" y2="780" stroke="#fff" stroke-width="${i%3?6:14}"/>`).join("")}
 ${Array.from({length:6},(_,i)=>`<line x1="110" y1="${150+i*120}" x2="1090" y2="${110+i*125}" stroke="#fff" stroke-width="${i%2?6:14}"/>`).join("")}
 ${Array.from({length:14},(_,i)=>`<rect x="${150+(i*157)%640}" y="${170+(i*97)%460}" width="70" height="46" rx="4" fill="#D6E0EC"/>`).join("")}
 <path d="M190 690 C 260 600 300 560 380 520 S 520 420 560 360 S 700 250 800 220" stroke="${OR}" stroke-width="12" fill="none" stroke-linecap="round"/>
 <path d="M190 690 C 260 600 300 560 380 520 S 470 450 500 420" stroke="${NAVY}" stroke-width="12" fill="none" stroke-linecap="round"/>
 <circle cx="500" cy="420" r="30" fill="${NAVY}"/><circle cx="500" cy="420" r="52" fill="${NAVY}" opacity=".18"/>
 <rect x="486" y="410" width="28" height="18" rx="3" fill="#fff"/><rect x="507" y="404" width="10" height="16" rx="2" fill="#fff"/>
 ${pin(800,225,1.4)}${pin(190,695,1.1,BLUE)}
 <!-- side panel -->
 <rect x="830" y="420" width="240" height="340" rx="14" fill="#fff"/>
 <rect x="852" y="444" width="140" height="18" rx="4" fill="${NAVY}"/>
 <text x="852" y="520" font-family="Arial" font-weight="bold" font-size="44" fill="${OR}">ETA</text>
 <rect x="952" y="490" width="96" height="28" rx="6" fill="#4CC38A"/>
 ${[0,1,2].map(i=>`<rect x="852" y="${560+i*56}" width="196" height="12" rx="4" fill="${G2}"/><rect x="852" y="${560+i*56}" width="${[150,90,170][i]}" height="12" rx="4" fill="${[BLUE,OR,BLUE][i]}"/><rect x="852" y="${582+i*56}" width="110" height="10" rx="4" fill="${G3}"/>`).join("")}
</g>
<circle cx="1110" cy="450" r="8" fill="#2E3E56"/>
`};

// 6. TMS DASHBOARD MONITOR
svgs.tms = { w: 1200, h: 900, svg: `
<rect width="1200" height="900" fill="${GREY}"/>
<rect x="520" y="700" width="160" height="110" fill="${G3}"/><rect x="400" y="800" width="400" height="26" rx="10" fill="${G3}"/>
<rect x="60" y="60" width="1080" height="660" rx="24" fill="${INK}"/>
<rect x="90" y="90" width="1020" height="600" rx="6" fill="#F7F9FC"/>
<rect x="90" y="90" width="1020" height="64" fill="${NAVY}"/>
<text x="120" y="133" font-family="Arial" font-weight="bold" font-size="28" fill="#fff">TMS</text>
${[0,1,2].map(i=>`<rect x="${200+i*110}" y="112" width="90" height="20" rx="10" fill="${i===0?OR:"#24508A"}"/>`).join("")}
${[0,1,2,3].map(i=>`<rect x="${115+i*248}" y="180" width="226" height="120" rx="10" fill="#fff" stroke="${G2}" stroke-width="3"/>
 <rect x="${135+i*248}" y="200" width="110" height="14" rx="4" fill="${G3}"/>
 <rect x="${135+i*248}" y="236" width="${[120,90,140,70][i]}" height="40" rx="6" fill="${i===1?OR:NAVY}"/>`).join("")}
<rect x="115" y="325" width="560" height="340" rx="10" fill="#fff" stroke="${G2}" stroke-width="3"/>
${[0,1,2,3,4,5,6,7].map(i=>{const h=[120,170,140,210,180,240,200,260][i];return `<rect x="${150+i*62}" y="${640-h}" width="40" height="${h}" rx="4" fill="${i===7?OR:BLUE}"/>`}).join("")}
<line x1="140" y1="642" x2="650" y2="642" stroke="${G3}" stroke-width="3"/>
<rect x="700" y="325" width="385" height="340" rx="10" fill="#fff" stroke="${G2}" stroke-width="3"/>
${[0,1,2,3,4,5].map(i=>`<rect x="725" y="${355+i*50}" width="70" height="14" rx="4" fill="${NAVY}" opacity=".75"/><rect x="810" y="${355+i*50}" width="${[160,120,180,140,100,170][i]}" height="14" rx="4" fill="${G2}"/><circle cx="1055" cy="${362+i*50}" r="10" fill="${["#4CC38A","#4CC38A",OR,"#4CC38A","#D64545","#4CC38A"][i]}"/>`).join("")}
`};

// 7. IOT CONNECTED TRUCK
svgs.iot = { w: 1200, h: 800, svg: `
<rect width="1200" height="800" fill="${NAVY}"/>
${Array.from({length:30},(_,i)=>`<circle cx="${(i*173)%1200}" cy="${(i*97)%320}" r="2" fill="${SKY}" opacity=".35"/>`).join("")}
<rect y="620" width="1200" height="180" fill="#071529"/>
${truck(180, 380, 1.05, {cab: BLUE})}
<!-- cloud -->
<g transform="translate(600,120)"><path d="M-110 40 a60 60 0 0 1 30 -110 a80 80 0 0 1 150 -10 a60 60 0 0 1 40 120 z" fill="#fff"/><path d="M-40 10 l30 -30 l30 30 m-30 -30 v60" stroke="${BLUE}" stroke-width="10" fill="none" stroke-linecap="round"/></g>
${[[300,420,"T°"],[560,470,"km/h"],[920,450,"GPS"]].map(([x,y,l],i)=>`<line x1="${x}" y1="${y}" x2="${560+i*40}" y2="170" stroke="${OR}" stroke-width="4" stroke-dasharray="10 9"/><circle cx="${x}" cy="${y}" r="40" fill="${OR}"/><circle cx="${x}" cy="${y}" r="58" fill="none" stroke="${OR}" stroke-width="3" opacity=".5"/><text x="${x}" y="${y+12}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${l.length>2?28:32}" fill="#fff">${l}</text>`).join("")}
`};

// 8. AI / PREDICTIVE
svgs.ai = { w: 1200, h: 900, svg: `
<rect width="1200" height="900" fill="${NAVY}"/>
${(()=>{const L=[[150,[220,360,500,640]],[330,[180,320,460,600,740]],[510,[260,420,580]]];let s="";
 for(let a=0;a<L.length-1;a++)for(const y1 of L[a][1])for(const y2 of L[a+1][1])s+=`<line x1="${L[a][0]}" y1="${y1}" x2="${L[a+1][0]}" y2="${y2}" stroke="${SKY}" stroke-opacity=".28" stroke-width="2"/>`;
 for(const y2 of L[2][1]) s+=`<line x1="510" y1="${y2}" x2="640" y2="440" stroke="${OR}" stroke-opacity=".6" stroke-width="3"/>`;
 L.forEach(([x,ys],a)=>ys.forEach((y,i)=>s+=`<circle cx="${x}" cy="${y}" r="22" fill="${(a+i)%3===0?OR:"#24508A"}" stroke="${SKY}" stroke-width="3"/>`));return s;})()}
<path d="M630 440 l40 0" stroke="${OR}" stroke-width="6"/><path d="M665 425 l20 15 l-20 15 z" fill="${OR}"/>
<rect x="700" y="200" width="440" height="480" rx="20" fill="#fff"/>
<rect x="730" y="230" width="180" height="18" rx="6" fill="${NAVY}"/>
<line x1="740" y1="620" x2="1110" y2="620" stroke="${G3}" stroke-width="3"/>
<path d="M940 470 L1010 420 L1100 360 L1100 480 L1010 500 L940 500 Z" fill="${OR}" opacity=".2"/>
<polyline points="750,560 800,520 850,540 900,480 940,485" stroke="${BLUE}" stroke-width="7" fill="none" stroke-linejoin="round"/>
<polyline points="940,485 1010,460 1100,420" stroke="${OR}" stroke-width="7" fill="none" stroke-dasharray="14 10"/>
<line x1="940" y1="270" x2="940" y2="620" stroke="${G3}" stroke-width="2" stroke-dasharray="6 6"/>
<circle cx="1100" cy="420" r="12" fill="${OR}"/>
<rect x="960" y="270" width="140" height="40" rx="8" fill="${OR}"/><text x="1030" y="298" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="22" fill="#fff">Prévision</text>
`};

svgs.truck = { w: 800, h: 300, svg: truck(10, 10, 1, {cab: NAVY2}).replace('<ellipse cx="380" cy="262" rx="400" ry="14" fill="#000" opacity=".25"/>','<ellipse cx="380" cy="262" rx="390" ry="12" fill="#000" opacity=".18"/>') };
(async () => {
  for (const [k, { w, h, svg }] of Object.entries(svgs)) {
    const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg>`;
    await sharp(Buffer.from(full), { density: 144 }).resize(w * 1.5 > 2400 ? 2400 : Math.round(w * 1.5)).png().toFile(`img/${k}.png`);
    console.log("ok", k);
  }
})();
