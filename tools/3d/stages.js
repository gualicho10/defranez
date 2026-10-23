const fs=require("fs");
function load(f){const fd=fs.openSync(f,"r");const h=Buffer.alloc(20);fs.readSync(fd,h,0,20,0);const len=h.readUInt32LE(12);const jb=Buffer.alloc(len);fs.readSync(fd,jb,0,len,20);fs.closeSync(fd);return JSON.parse(jb.toString());}
function mul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function local(n){if(n.matrix)return n.matrix;const t=n.translation||[0,0,0],q=n.rotation||[0,0,0,1],s=n.scale||[1,1,1];const[x,y,z,w]=q;
return[(1-2*(y*y+z*z))*s[0],(2*(x*y+z*w))*s[0],(2*(x*z-y*w))*s[0],0,(2*(x*y-z*w))*s[1],(1-2*(x*x+z*z))*s[1],(2*(y*z+x*w))*s[1],0,(2*(x*z+y*w))*s[2],(2*(y*z-x*w))*s[2],(1-2*(x*x+y*y))*s[2],0,t[0],t[1],t[2],1];}
function fps(f){const j=load(f);const out=[];
function walk(i,M){const n=j.nodes[i];const W=mul(M,local(n));
if(n.mesh!==undefined){const bb=[1e30,1e30,1e30,-1e30,-1e30,-1e30];let vc=0;for(const p of j.meshes[n.mesh].primitives){const a=j.accessors[p.attributes.POSITION];vc+=a.count;
for(let c=0;c<8;c++){const v=[c&1?a.max[0]:a.min[0],c&2?a.max[1]:a.min[1],c&4?a.max[2]:a.min[2]];const w=[0,1,2].map(r=>W[r]*v[0]+W[4+r]*v[1]+W[8+r]*v[2]+W[12+r]);for(let k=0;k<3;k++){bb[k]=Math.min(bb[k],w[k]);bb[k+3]=Math.max(bb[k+3],w[k]);}}}
out.push({i,fp:vc+"|"+bb.map(v=>v.toFixed(2)).join(",")});}
(n.children||[]).forEach(c=>walk(c,W));}
j.scenes[j.scene||0].nodes.forEach(i=>walk(i,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]));return out;}
const D="/Users/ezedefran/Library/CloudStorage/GoogleDrive-ezequiel.defrancisco@gmail.com/My Drive/2_Laburos/PORTFOLIO/WEB_EZE/3D/";
const files=["01-terreno.glb","02-camino y platea.glb","03-estructura-madera.glb","04-revestimiento-completo.glb","05-deck-arboles.glb","06-techosyaberturas.glb","07-completo.glb"];
const sets=files.map(f=>{const m=new Map();fps(D+f).forEach(x=>m.set(x.fp,(m.get(x.fp)||0)+1));return m;});
const last=fps(D+files[6]);const used=new Map();const stage={};const cnt=new Array(8).fill(0);
for(const {i,fp} of last){const k=used.get(fp)||0;used.set(fp,k+1);let s=files.length;for(let a=0;a<files.length;a++){if((sets[a].get(fp)||0)>k){s=a+1;break;}}stage[i]=s;cnt[s]++;}
console.log("meshes per stage (1..7):",cnt.slice(1).join(", "),"of",last.length);
// how many meshes of each earlier file did NOT match a node in 07 (would be lost)
sets.forEach((m,a)=>{let miss=0;for(const [fp,c] of m){const have=(sets[6].get(fp)||0);if(have<c)miss+=c-have;}console.log(files[a],"unmatched in 07:",miss);});
fs.writeFileSync(process.argv[2],JSON.stringify(stage));
