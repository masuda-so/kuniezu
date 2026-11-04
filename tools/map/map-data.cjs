/* 地図の正本 game/map_data/ の読み書き（Paradox/CK3 の公開されている map_data の名前と書式に合わせる）。
   provinces.png   全域1枚の領域画像（RGB）。1画素＝100m の格子、色が区画を表す。
   definition.csv  見出しなし。1行目は予約の `0;0;0;0;x;x;`、以下 `id;R;G;B;name;x;`。name は区画キー（sea・unassigned・castle:…・lake:…・neutral:…）。
   default.map     CK3 の文法（key = "値"、key = LIST { … }）。definitions・provinces と、海（sea_zones）・湖（lakes）の id。
   projection.json 本作だけの情報：経緯度→格子の変換（CK3 の地図は経緯度を持たない）。
   Web 配信用のタイル（game/map/）は tools/map/build-map-tiles.cjs がここから作る生成物。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function parseDefaultMap(text){const out={};const s=text.replace(/#[^\n]*/g,'');
 for(const m of s.matchAll(/(\w+)\s*=\s*LIST\s*\{([^}]*)\}/g))out[m[1]]=m[2].trim().split(/\s+/).filter(Boolean).map(Number);
 for(const m of s.matchAll(/(\w+)\s*=\s*RANGE\s*\{\s*(\d+)\s+(\d+)\s*\}/g)){const a=+m[2],b=+m[3];out[m[1]]=(out[m[1]]||[]).concat(Array.from({length:b-a+1},(_,i)=>a+i));}
 for(const m of s.matchAll(/(\w+)\s*=\s*"([^"]*)"/g))out[m[1]]=m[2];return out;}
// at(dir)：別の置き場（検査用の小さな正本など）を読む。既定は game/map_data。
function at(dir){const files={provinces:path.join(dir,'provinces.png'),definition:path.join(dir,'definition.csv'),defaultMap:path.join(dir,'default.map'),projection:path.join(dir,'projection.json')};
// 区画の一覧。rows[id] = {id, rgb, key, kind}（kind は default.map の sea_zones→sea、lakes→lake、ほかは land）。
function readDefinition(){const dm=parseDefaultMap(fs.readFileSync(files.defaultMap,'utf8')),sea=new Set(dm.sea_zones||[]),lake=new Set(dm.lakes||[]);
 const rows=[];for(const l of fs.readFileSync(files.definition,'utf8').split(/\r?\n/)){if(!l.trim())continue;const p=l.split(';');const id=+p[0];if(!id)continue;
  rows[id]={id,rgb:[+p[1],+p[2],+p[3]],key:p[4],kind:sea.has(id)?'sea':lake.has(id)?'lake':'land'};}
 const byRGB=new Map(),byKey=new Map();for(const r of rows)if(r){const c=r.rgb.join(',');if(byRGB.has(c))throw Error('色が重なる '+c);byRGB.set(c,r);if(byKey.has(r.key))throw Error('キーが重なる '+r.key);byKey.set(r.key,r);}
 return {rows,byRGB,byKey,defaultMap:dm};}
// defs：[{id,rgb,key,kind}]（id は 1 から）。definition.csv と default.map を書く。
function writeDefinition(defs){const lines=['0;0;0;0;x;x;'];for(const d of [...defs].sort((a,b)=>a.id-b.id)){if(!(d.id>=1))throw Error('id は1から');lines.push(`${d.id};${d.rgb[0]};${d.rgb[1]};${d.rgb[2]};${d.key};x;`);}
 fs.writeFileSync(files.definition,lines.join('\n')+'\n');
 const list=k=>defs.filter(d=>d.kind===k).map(d=>d.id).sort((a,b)=>a-b).join(' ');
 fs.writeFileSync(files.defaultMap,`# 地図の正本の一覧（Crusader Kings III の map_data/default.map の書式に合わせる）。\n# 海と湖の区画はここで示し、ほかは陸。経緯度の変換は projection.json（本作だけの情報）。\ndefinitions = "definition.csv"\nprovinces = "provinces.png"\n\nsea_zones = LIST { ${list('sea')} }\nlakes = LIST { ${list('lake')} }\n`);}
const readProjection=()=>JSON.parse(fs.readFileSync(files.projection,'utf8'));
// 正本3点の確認値（生成物がどの正本から作られたかを示す）
const sourceSha256=()=>crypto.createHash('sha256').update(['provinces','definition','defaultMap','projection'].map(k=>sha(files[k])).join('\n')).digest('hex');
return {dir,files,readDefinition,writeDefinition,readProjection,sourceSha256};}
module.exports={root,sha,parseDefaultMap,at,...at(path.join(root,'game/map_data'))};
