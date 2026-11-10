'use strict';
// 確認状態の棚卸し。座標/出典IDの存在を史実照合済みとは扱わない。
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),startedAt=new Date().toISOString(),start=performance.now();
const {TK}=require('../checks/history-focus.cjs').model(),loaded=performance.now();
const rows=Object.entries(TK.BATTLES).map(([title,scene])=>{
 const atlas=TK.BATTLE_ATLAS?.[title],groups=scene.atlasGroups||[],units=scene.units||[];
 const located=new Set(groups.filter(g=>g.point).flatMap(g=>g.members));
 const sourced=units.filter(u=>(TK.BATTLE_MOVEMENTS?.[title]||[]).some(m=>m.name===(u.g||u.n)));
 return {title,sharedAtlas:scene.displayPolicy==='atlas'&&!!atlas,atlasPlan:!!scene.atlasPlan,
  terrainFile:atlas?.file||null,terrainPresent:!!atlas?.file&&fs.existsSync(path.join(root,'kuniezu/static/kuniezu/atlas',atlas.file)),
  layoutStatus:scene.layoutStatus||'unspecified',evidenceScope:scene.evidenceScope||'unspecified',
  unitCount:units.length,groupCount:groups.length,pointGroups:groups.filter(g=>g.point).length,
  unitsInPointGroups:located.size,unitsWithPaths:units.filter(u=>u.path?.length).length,
  unitsWithMovingPaths:units.filter(u=>u.path?.length>1).length,unitsMatchingSourceMovement:sourced.length};
});
const count=key=>Object.fromEntries([...new Set(rows.map(r=>r[key]))].map(k=>[k,rows.filter(r=>r[key]===k).length]));
const result={startedAt,endedAt:new Date().toISOString(),sourceCommit:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 scope:'Shared infrastructure and data presence only; not historical verification or complete UI acceptance',
 countBasis:'Unit counts are occurrences across scenes, not distinct historical armies or people',
 modelLoadMs:loaded-start,aggregationAndMetadataMs:performance.now()-loaded,
 totals:{scenes:rows.length,sharedAtlas:rows.filter(r=>r.sharedAtlas).length,terrainPresent:rows.filter(r=>r.terrainPresent).length,
  uniqueTerrainFiles:new Set(rows.map(r=>r.terrainFile).filter(Boolean)).size,layoutStatus:count('layoutStatus'),evidenceScope:count('evidenceScope'),
  units:rows.reduce((n,r)=>n+r.unitCount,0),unitsInPointGroups:rows.reduce((n,r)=>n+r.unitsInPointGroups,0),
  scenesWithSourceMovement:rows.filter(r=>r.unitsMatchingSourceMovement).length,unitsWithSourceMovement:rows.reduce((n,r)=>n+r.unitsMatchingSourceMovement,0)},rows};
result.endedAt=new Date().toISOString();
if(process.env.GAME_TEST_OUTPUT){fs.mkdirSync(process.env.GAME_TEST_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.GAME_TEST_OUTPUT,'battle-inventory.json'),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({sourceCommit:result.sourceCommit,modelLoadMs:result.modelLoadMs,aggregationAndMetadataMs:result.aggregationAndMetadataMs,totals:result.totals},null,2));
