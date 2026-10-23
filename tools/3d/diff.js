const fs=require("fs");
const src=fs.readFileSync("stages.js","utf8").split("const D=")[0];
eval(src+`
const D="/Users/ezedefran/Library/CloudStorage/GoogleDrive-ezequiel.defrancisco@gmail.com/My Drive/2_Laburos/PORTFOLIO/WEB_EZE/3D/";
const a=fps(D+"07-completo.glb"), b=fps(D+"casa pacho_sketchup.glb");
const sa=new Map();a.forEach(x=>sa.set(x.fp,(sa.get(x.fp)||0)+1));
const used=new Map();const missing=[];
for(const {i,fp} of b){const k=used.get(fp)||0;used.set(fp,k+1);if((sa.get(fp)||0)<=k)missing.push(i);}
console.log("sketchup full nodes",b.length,"07 nodes",a.length,"in full but NOT in 07:",missing.length);
fs.writeFileSync("missing_in_07.json",JSON.stringify(missing));
`);
