/* castle-regions.cjs の比較出力（境の線）を、2城の領域へ反映したデータを作る。
   2城の領域の和（外枠）は変えず、その中を新しい境の線で二つに分ける。結果は game/castle-regions-data.js に書き、
   game/castle-regions.js が読み込み時に TKGEO.terr と TKGEO.edges を置き換える（geo.js 本体は書き換えない）。
   多角形の演算には polygon-clipping を使う：  POLYGON_CLIPPING=<node_modules/polygon-clipping のパス> node tools/geo/apply-castle-regions.cjs hikuma-kakegawa */
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../..');
const pc=require(process.env.POLYGON_CLIPPING||'polygon-clipping');const {TKGEO}=require(path.join(root,'tools/checks/history-focus.cjs')).model();
const ids=process.argv.slice(2);if(!ids.length)throw Error('usage: apply-castle-regions.cjs <a-b> ...');
const outFile=path.join(root,'game/castle-regions-data.js');
const prev=fs.existsSync(outFile)?JSON.parse(fs.readFileSync(outFile,'utf8').replace(/^[^=]*=/,'').replace(/;\s*$/,'')):{regions:{}};
const toPoly=rings=>rings.map(r=>{const o=[];for(let i=0;i<r.length;i+=2)o.push([r[i],r[i+1]]);o.push(o[0]);return o;});
const fromMulti=mp=>mp.map(poly=>poly.map(ring=>ring.slice(0,-1).flatMap(p=>[+p[0].toFixed(2),+p[1].toFixed(2)])));
for(const key of ids){const o=JSON.parse(fs.readFileSync(path.join(root,'data/inputs/castle-regions',key+'.json'),'utf8'));const {a,b,line}=o;
 const A=TKGEO.terr[a].map(toPoly),B=TKGEO.terr[b].map(toPoly),U=pc.union(...A,...B);
 // 境の線の a 側を囲う大きな多角形：線の終点から a の城の方向へ大きく回り込み、始点へ戻る
 let xs=[],ys=[];for(const poly of U)for(const ring of poly)for(const p of ring){xs.push(p[0]);ys.push(p[1]);}
 const minX=Math.min(...xs)-50,maxX=Math.max(...xs)+50,minY=Math.min(...ys)-50,maxY=Math.max(...ys)+50;
 const ca=TKGEO.cpos?.[a]||null,s=line[0],e=line.at(-1);
 // a の城が線の左右どちらにあるか（線の両端を結ぶ向きに対する外積）で回り込む側を決める
 const [ax,ay]=ca||[s[0]-1,s[1]],side=Math.sign((e[0]-s[0])*(ay-s[1])-(e[1]-s[1])*(ax-s[0]));
 const extend=(p,q)=>{const dx=q[0]-p[0],dy=q[1]-p[1],L=Math.hypot(dx,dy)||1;return [q[0]+dx/L*400,q[1]+dy/L*400];};
 const sOut=extend(line[1],s),eOut=extend(line.at(-2),e);
 const dir=[e[0]-s[0],e[1]-s[1]],nrm=[-dir[1]*side,dir[0]*side],nl=Math.hypot(...nrm)||1,far=[nrm[0]/nl*2000,nrm[1]/nl*2000];
 const W=[[sOut,...line,eOut,[eOut[0]+far[0],eOut[1]+far[1]],[sOut[0]+far[0],sOut[1]+far[1]],sOut]];
 const newA=pc.intersection(U,[W]),newB=pc.difference(U,[W]);
 const area=mp=>mp.reduce((n,poly)=>n+poly.reduce((m,r,i)=>{let s2=0;for(let k=0;k<r.length-1;k++)s2+=r[k][0]*r[k+1][1]-r[k+1][0]*r[k][1];return m+(i?-1:1)*Math.abs(s2)/2;},0),0);
 const before=[area(A.map(p=>[p[0]]).flatMap(x=>x).map(r=>[r])),area(B.map(p=>[p[0]]).flatMap(x=>x).map(r=>[r]))],after=[area(newA),area(newB)];
 if(Math.abs(after[0]+after[1]-area(U))>1)throw Error('area mismatch');
 prev.regions[key]={a,b,terr:{[a]:fromMulti(newA),[b]:fromMulti(newB)},edge:[line.flatMap(p=>[p[0],p[1]])],basis:o.basis,method:o.method,sourceIds:o.sourceIds,confidence:o.confidence,note:o.note,areaBefore:before.map(v=>+v.toFixed(1)),areaAfter:after.map(v=>+v.toFixed(1))};
 console.log(key,'area',before.map(v=>v.toFixed(0)).join('/'),'->',after.map(v=>v.toFixed(0)).join('/'));
}
fs.writeFileSync(outFile,'"use strict";\n/* tools/geo/apply-castle-regions.cjs が生成。地形の越えにくさによる推定境（史料の領界ではない）。手で編集しない。 */\nTK.CASTLE_REGIONS='+JSON.stringify(prev)+';\n');
