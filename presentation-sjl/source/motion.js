// Post-processes a pptxgenjs deck: adds Morph / Fade transitions and click-by-click fade-in builds.
const JSZip = require("jszip");
const fs = require("fs");

const MORPH = `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159"><p:transition spd="slow" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" p14:dur="1600"><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>`;
const FADE = `<p:transition spd="med"><p:fade/></p:transition>`;

function timing(groups) {
  // groups: [{ ids:[...], spIds:[...] }] ; one click per group, all shapes of a group fade in together
  let id = 3;
  const clicks = groups.map((g) => {
    const outer = id++, inner = id++;
    const effects = g.ids.map((spid, k) => {
      const e = id++, s1 = id++, s2 = id++;
      return `<p:par><p:cTn id="${e}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" ${g.spIds.includes(spid) ? 'grpId="0" ' : ""}nodeType="${k === 0 ? "clickEffect" : "withEffect"}"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr><p:cTn id="${s1}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set><p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${s2}" dur="500"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>`;
    }).join("");
    return `<p:par><p:cTn id="${outer}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="${inner}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${effects}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
  }).join("");
  const bld = groups.flatMap((g) => g.spIds).map((s) => `<p:bldP spid="${s}" grpId="0" animBg="1"/>`).join("");
  return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${clicks}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>${bld ? `<p:bldLst>${bld}</p:bldLst>` : ""}</p:timing>`;
}

async function addMotion(file, { transitions, anim }) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const n of Object.keys(transitions)) {
    const path = `ppt/slides/slide${n}.xml`;
    let xml = await zip.file(path).async("string");
    if (xml.includes("<p:transition") || xml.includes("<p:timing")) throw new Error("already has motion: " + path);
    let extra = transitions[n] === "morph" ? MORPH : FADE;
    if (anim[n]) {
      const groups = anim[n].map((prefix) => {
        const ids = [], spIds = [];
        // match each shape/picture's cNvPr, noting whether it is a p:sp (needs bldP)
        const re = /<p:(sp|pic)>\s*<p:nv(?:Sp|Pic)Pr>\s*<p:cNvPr id="(\d+)" name="([^"]*)"/g;
        let m;
        while ((m = re.exec(xml))) if (m[3].startsWith(prefix)) { ids.push(m[2]); if (m[1] === "sp") spIds.push(m[2]); }
        if (!ids.length) throw new Error(`no shapes for ${prefix} on slide ${n}`);
        return { ids, spIds };
      });
      extra += timing(groups);
    }
    if (!xml.includes("</p:clrMapOvr>")) throw new Error("no clrMapOvr in " + path);
    xml = xml.replace("</p:clrMapOvr>", "</p:clrMapOvr>" + extra);
    zip.file(path, xml);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}
module.exports = { addMotion };
