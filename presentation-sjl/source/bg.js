// Modern slide backgrounds: soft gradients + faint connected-route motif
const sharp = require("sharp");
const fs = require("fs");
fs.mkdirSync("bg", { recursive: true });
const W = 2667, H = 1500;

function routes(color, op) {
  // faint flowing route lines + nodes, bottom-right weighted
  const paths = [
    "M1200 1500 C1500 1250 1750 1300 2000 1050 S2450 700 2667 640",
    "M1500 1500 C1750 1320 1950 1360 2180 1180 S2550 930 2667 900",
    "M900 1500 C1250 1380 1450 1180 1800 1130 S2300 1000 2667 1180",
  ];
  const nodes = [[2000, 1050], [2180, 1180], [1800, 1130], [2450, 760], [2550, 960]];
  return paths.map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="3"/>`).join("") +
    nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${color}" fill-opacity="${op * 2.2}"/><circle cx="${x}" cy="${y}" r="26" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="2"/>`).join("");
}
function dots(color, op, x0, y0, cols, rows, step) {
  let s = "";
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) s += `<circle cx="${x0 + i * step}" cy="${y0 + j * step}" r="3.2" fill="${color}" fill-opacity="${op}"/>`;
  return s;
}

const bgs = {
  light: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#FBFCFD"/><stop offset="1" stop-color="#EEF2F6"/></linearGradient>
    <radialGradient id="o" cx="2667" cy="1500" r="1100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F28C28" stop-opacity=".10"/><stop offset="1" stop-color="#F28C28" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#o)"/>${routes("#10243A", 0.05)}${dots("#10243A", 0.07, 2330, 70, 8, 5, 38)}`,
  grey: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6F8FA"/><stop offset=".55" stop-color="#F1F4F7"/><stop offset="1" stop-color="#E4EAF1"/></linearGradient>
    <radialGradient id="o" cx="0" cy="1500" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1B3A5C" stop-opacity=".07"/><stop offset="1" stop-color="#1B3A5C" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#o)"/>${routes("#10243A", 0.06)}${dots("#10243A", 0.08, 2330, 70, 8, 5, 38)}`,
  dark: `<defs><radialGradient id="g" cx="2100" cy="250" r="2300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#22466F"/><stop offset=".45" stop-color="#14304F"/><stop offset="1" stop-color="#0A1828"/></radialGradient>
    <radialGradient id="o" cx="150" cy="1500" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F28C28" stop-opacity=".16"/><stop offset="1" stop-color="#F28C28" stop-opacity="0"/></radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".045"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#o)"/>
    <polygon points="1500,0 1900,0 1100,1500 700,1500" fill="url(#beam)"/><polygon points="2050,0 2250,0 1450,1500 1250,1500" fill="url(#beam)"/>
    ${routes("#A9C1E0", 0.10)}${dots("#A9C1E0", 0.16, 2330, 70, 8, 5, 38)}`,
};
(async () => {
  for (const [k, svg] of Object.entries(bgs)) {
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`)).png({ compressionLevel: 9 }).toFile(`bg/${k}.png`);
    console.log("bg", k);
  }
})();
