/* 表示範囲の採用記録から、戦役の入口と局地戦の既存素材を接続する。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const {filterLocalScene}=require('./local-battle-scene.cjs');
function validate(data){
 assert.equal(data.schemaVersion,1);
 const ids=new Map(),titles=new Set();
 for(const r of data.conflicts){
  assert.ok(/^(campaign|battle):/.test(r.id));assert.ok(['campaign','battle'].includes(r.kind));
  assert.ok(r.id.startsWith(r.kind+':'));assert.ok(r.title&&!titles.has(r.title));assert.ok(!ids.has(r.id));
  assert.ok(r.sources?.length&&r.sources.every(s=>s.author&&s.title&&s.url?.startsWith('https://')&&s.locator&&s.scope));
  ids.set(r.id,r);titles.add(r.title);
 }
 for(const r of data.conflicts){
  if(r.kind==='campaign'){
   assert.ok(r.children?.length);assert.equal(new Set(r.children).size,r.children.length);
   for(const id of r.children){const child=ids.get(id);assert.ok(child&&child.parent===r.id&&child.kind==='battle');}
  }else if(r.parent){const parent=ids.get(r.parent);assert.ok(parent?.kind==='campaign'&&parent.children.includes(r.id));}
  if(r.scene){assert.equal(r.kind,'battle');assert.ok(r.scene.sourceTitle&&r.scene.date&&r.scene.scope);}
  if(r.scene?.bounds){const b=r.scene.bounds;assert.equal(b.length,4);assert.ok(b.every(Number.isFinite)&&b[0]<b[2]&&b[1]>b[3]);}
  if(r.scene?.eventDate)assert.ok(r.scene.eventDate.length===3&&r.scene.eventDate.every(Number.isInteger));
  if(r.scene?.terrainFile)assert.match(r.scene.terrainFile,/^[a-z0-9][a-z0-9-]*\.json$/);
  for(const p of r.scene?.relatedPeople||[])assert.ok(p.n&&p.role&&Number.isInteger(p.sourceIndex)&&r.sources[p.sourceIndex]);
  if(r.autoSceneTitle){assert.equal(r.kind,'campaign');assert.ok(r.children.some(id=>ids.get(id)?.title===r.autoSceneTitle&&ids.get(id)?.scene?.eventDate));}
 }
 return data;
}
function render(data){validate(data);return `"use strict";
/* tools/research/export-conflicts.cjs から生成。編集正本は data/research/conflicts.json。 */
(function(){
const records=${JSON.stringify(data.conflicts)};
${filterLocalScene.toString()}
const byId=new Map(records.map(r=>[r.id,r]));
TK.CONFLICT_CATALOG=Object.fromEntries(records.map(r=>[r.title,{...r,children:(r.children||[]).map(id=>{const c=byId.get(id);return {title:c.title,sceneTitle:c.scene?c.title:c.existingSceneTitle,note:c.summary};})}]));
function attachScenes(){for(const r of records){
 if(!r.scene)continue;
 const original=TK.BATTLES[r.scene.sourceTitle],meta=TK.BATTLE_ATLAS[r.scene.sourceTitle];
 if(!original||!meta)throw Error("Missing conflict material: "+r.id);
 if(TK.BATTLES[r.title]&&TK.BATTLES[r.title].conflictId!==r.id)throw Error("Duplicate conflict title: "+r.title);
 const sourceIds=r.sources.map((s,i)=>{const id="conflict:"+r.id+":"+i;TK.RESEARCH_SOURCES[id]=s;return id;});
 const local=r.scene.selection?filterLocalScene(original,{...r.scene.selection,childTitle:r.title,date:r.scene.date,scope:r.scene.scope}).scene:original;
 const bounds=r.scene.bounds||meta.bounds;
 if(bounds[0]<meta.bounds[0]||bounds[1]>meta.bounds[1]||bounds[2]>meta.bounds[2]||bounds[3]<meta.bounds[3])throw Error("Local frame outside source: "+r.id);
 TK.BATTLES[r.title]={...local,title:r.title,date:r.scene.date,place:r.scene.scope,conflictId:r.id,eventDate:r.scene.eventDate||local.eventDate,sources:[...new Set([...(original.sources||[]),...sourceIds])]};
 if(r.scene.relatedPeople)TK.BATTLES[r.title].relatedPeople=r.scene.relatedPeople.map(p=>({n:p.n,role:p.role,source:sourceIds[p.sourceIndex]}));
 if(r.scene.selection){TK.BATTLES[r.title].dur=(original.dur||44)*(r.scene.selection.sourceClockWindow[1]-r.scene.selection.sourceClockWindow[0])/100;TK.BATTLE_MOVEMENTS[r.title]=[];}
 const aspect=r.scene.bounds?(bounds[1]-bounds[3])/((bounds[2]-bounds[0])*Math.cos((bounds[1]+bounds[3])*Math.PI/360)):meta.aspect;
 TK.BATTLE_ATLAS[r.title]={...meta,...(r.scene.terrainFile?{file:r.scene.terrainFile,geo:[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2,(bounds[2]-bounds[0])*111.32*Math.cos((bounds[1]+bounds[3])*Math.PI/360)],label:r.scene.scope}:{}),bounds,...(aspect?{aspect}:{}),points:(meta.points||[]).filter(p=>p.lon>=bounds[0]&&p.lon<=bounds[2]&&p.lat<=bounds[1]&&p.lat>=bounds[3])};
}}
const build=G.buildBattleCatalog;
G.buildBattleCatalog=function(...args){for(const r of records)if(r.scene&&TK.BATTLES[r.title]?.conflictId===r.id)delete TK.BATTLES[r.title];const result=build.apply(this,args);attachScenes();return result;};
G.sceneTitleForEvent=function(title,triggerT){const r=TK.CONFLICT_CATALOG[title];if(r?.kind!=='campaign')return title;const child=r.autoSceneTitle&&TK.BATTLES[r.autoSceneTitle],date=child?.eventDate;return date&&G.S()&&Number.isFinite(triggerT)&&Math.floor(triggerT)===G.evT({d:date})&&TK.HIST.some(e=>e.title===title&&e.k!=='premarch'&&e.d?.join(',')===date.join(','))?r.autoSceneTitle:null;};
})();
`;}
if(require.main===module){
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/research/conflicts.json'),'utf8')),out=path.join(root,'kuniezu/static/kuniezu/battle-conflicts.js'),text=render(data);
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(out,'utf8'),text,'conflict runtime must match its source');else fs.writeFileSync(out,text);
 console.log('PASS: conflict identities, hierarchy and generated display registry');
}
module.exports={validate,render};
