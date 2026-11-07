/* 表示範囲の採用記録から、戦役の入口と局地戦の既存素材を接続する。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
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
 }
 return data;
}
function render(data){validate(data);return '"use strict";\n/* tools/research/export-conflicts.cjs から生成。編集正本は data/research/conflicts.json。 */\n(function(){\nconst records='+JSON.stringify(data.conflicts)+';\nconst byId=new Map(records.map(r=>[r.id,r]));\nTK.CONFLICT_CATALOG=Object.fromEntries(records.map(r=>[r.title,{...r,children:(r.children||[]).map(id=>{const c=byId.get(id);return {title:c.title,sceneTitle:c.scene?c.title:c.existingSceneTitle,note:c.summary};})}]));\nfunction attachScenes(){for(const r of records){if(!r.scene)continue;const original=TK.BATTLES[r.scene.sourceTitle],meta=TK.BATTLE_ATLAS[r.scene.sourceTitle];if(!original||!meta)throw Error("Missing conflict material: "+r.id);if(TK.BATTLES[r.title]&&TK.BATTLES[r.title].conflictId!==r.id)throw Error("Duplicate conflict title: "+r.title);const sourceIds=r.sources.map((s,i)=>{const id="conflict:"+r.id+":"+i;TK.RESEARCH_SOURCES[id]=s;return id;});TK.BATTLES[r.title]={...original,title:r.title,date:r.scene.date,place:r.scene.scope,conflictId:r.id,sources:[...new Set([...(original.sources||[]),...sourceIds])]};TK.BATTLE_ATLAS[r.title]={...meta};}}\nconst build=G.buildBattleCatalog;G.buildBattleCatalog=function(...args){for(const r of records)if(r.scene&&TK.BATTLES[r.title]?.conflictId===r.id)delete TK.BATTLES[r.title];const result=build.apply(this,args);attachScenes();return result;};\n})();\n';}
if(require.main===module){
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/research/conflicts.json'),'utf8')),out=path.join(root,'kuniezu/static/kuniezu/battle-conflicts.js'),text=render(data);
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(out,'utf8'),text,'conflict runtime must match its source');else fs.writeFileSync(out,text);
 console.log('PASS: conflict identities, hierarchy and generated display registry');
}
module.exports={validate,render};
