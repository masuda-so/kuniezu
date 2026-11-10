/* 現行モデルの登録対象を追加する。既存行・担当・完了証拠は変更しない。 */
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const idFor=(kind,key)=>kind+'-'+crypto.createHash('sha256').update(String(key)).digest('hex').slice(0,12);
const connectionKey=e=>[e.a,e.b].sort().join('|');
function runtimeTargets(G,TK,period,conflicts=[]){
 if(!Array.isArray(period)||period.length!==2||!period.every(Number.isInteger)||period[0]>period[1])throw Error('invalid inventory period');
 const sites=[...G.CL.map(c=>({id:c.id,name:c.n1})),...G.YOSHO.map(c=>({id:c.id,name:c.n}))];
 const siteIds=new Set(sites.map(s=>s.id));
 const connections=Object.values(G.EDGES||{}).map(e=>({a:e.a,b:e.b,sea:!!e.sea}));
 if(connections.some(e=>typeof e.a!=='string'||typeof e.b!=='string'||e.a===e.b||!siteIds.has(e.a)||!siteIds.has(e.b)))throw Error('invalid runtime connection');
 if(new Set(connections.map(connectionKey)).size!==connections.length)throw Error('duplicate runtime connection');
 const sceneTitles=Object.keys(TK.BATTLES);
 const sceneInfo=sceneTitles.map(title=>{
  const matches=conflicts.filter(r=>(r.existingSceneTitle||r.title)===title);
  if(matches.length>1)throw Error('ambiguous conflict scene: '+title);
  const conflict=matches[0];
  return {title,classification:conflict?.kind||'unclassified-scene',conflictId:conflict?.id||null};
 });
 const rows=sites.map(s=>({id:idFor('site',s.id),kind:'site',subject:s.name,area:'history',requestIds:['H01','H02'],acceptance:['位置の同定と出典',`${period[0]}～${period[1]}年内の存在・名称・領主と主支城の役割`,'実装との差異の修正','該当年代の表示確認'],context:{siteId:s.id,positionReference:null,periodStatus:'not-fully-verified',inventoryBasis:'runtime-registration-not-historical-verification',strategyScope:'not-asserted-by-inventory'}}));
 rows.push(...sceneInfo.map(s=>({id:idFor('battle',s.title),kind:'battle',subject:s.title,area:'battles',requestIds:['B01','B02'],acceptance:['同時期の参加者と別戦線を区別','地形・城郭・河川・布陣の出典','経過・内応・移陣と再生の対応','読込・顔・駒・全幅・自然終了を実画面確認'],context:{inventoryBasis:'runtime-registration-not-historical-verification',sceneClassification:s.classification,conflictId:s.conflictId}})));
 rows.push(...connections.map(e=>({id:idFor('link',e.a+'|'+e.b),kind:'link',subject:e.a+' → '+e.b,area:'movement',requestIds:['M01','M02'],acceptance:['陸路・海路・渡河・峠の区別','直線代替と寄城の妥当性','同じ道路線で描画と移動','停止・日跨ぎ・帰還・保存復元で連続'],context:{...e,basis:'registered-game-connection-not-proven-historical',inventoryBasis:'runtime-registration-not-historical-verification',strategyScope:'not-asserted-by-inventory'}})));
 for(const r of rows)if(!r.subject||r.kind==='site'&&!r.context.siteId)throw Error('invalid runtime target');
 if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('duplicate runtime target');
 return {rows,sites,scenes:sceneInfo,connections};
}
function appendTargets(catalog,targets){
 const existing=new Map(catalog.map(r=>[r.id,r]));
 if(existing.size!==catalog.length)throw Error('duplicate existing task ID');
 const priorConnections=new Map();
 for(const row of catalog.filter(r=>r.kind==='link')){
  const key=connectionKey(row.context);
  if(priorConnections.has(key))throw Error('duplicate existing connection');
  priorConnections.set(key,row);
 }
 const seen=new Set(),added=[];
 for(const row of targets.rows){
  if(seen.has(row.id))throw Error('duplicate incoming task ID');seen.add(row.id);
  let prior=existing.get(row.id);
  if(prior&&row.kind==='link'&&(prior.kind!=='link'||connectionKey(prior.context)!==connectionKey(row.context)))throw Error('task ID collision: '+row.id);
  // 接続の端点順が逆になっても、既存の担当と証拠を持つIDを使う。
  if(!prior&&row.kind==='link')prior=priorConnections.get(connectionKey(row.context));
  if(prior){
   if(prior.kind!==row.kind||prior.kind==='site'&&prior.context?.siteId!==row.context?.siteId||prior.kind==='battle'&&prior.subject!==row.subject)throw Error('task ID collision: '+row.id);
   seen.add(prior.id);
  }else added.push(row);
 }
 const rows=[...catalog,...added],counts={};
 for(const r of rows)counts[r.kind]=(counts[r.kind]||0)+1;
 const absent=catalog.filter(r=>['site','battle','link'].includes(r.kind)&&!seen.has(r.id)).map(r=>({id:r.id,kind:r.kind,subject:r.subject,siteId:r.context?.siteId||null}));
 return {rows,added,counts,inventory:{scope:'registered sites, scenes and connections only; not a historical completion check or strategic-map selection',sha256:crypto.createHash('sha256').update(JSON.stringify({sites:targets.sites,scenes:targets.scenes,connections:targets.connections})).digest('hex'),registeredSites:targets.sites.length,registeredScenes:targets.scenes.length,registeredConnections:targets.connections.length,sceneClassifications:targets.scenes.filter(s=>s.classification!=='unclassified-scene'),unclassifiedSceneCount:targets.scenes.filter(s=>s.classification==='unclassified-scene').length,retainedSnapshotTargetsAbsentFromRuntime:absent}};
}
function writeCatalogPair({catalogPath,manifestPath,catalogText,manifestText,expectedCatalog,expectedManifest}){
 const dir=path.dirname(catalogPath);
 if(dir!==path.dirname(manifestPath))throw Error('catalog and manifest must share a directory');
 const staging=fs.mkdtempSync(path.join(dir,'.catalog-sync-'));
 try{
  const stagedCatalog=path.join(staging,'catalog'),stagedManifest=path.join(staging,'manifest');
  fs.writeFileSync(stagedCatalog,catalogText,{flag:'wx'});fs.writeFileSync(stagedManifest,manifestText,{flag:'wx'});
  if(fs.readFileSync(catalogPath,'utf8')!==expectedCatalog||fs.readFileSync(manifestPath,'utf8')!==expectedManifest)throw Error('catalog inputs changed during synchronization');
  fs.renameSync(stagedCatalog,catalogPath);fs.renameSync(stagedManifest,manifestPath);
 }finally{fs.rmSync(staging,{recursive:true,force:true});}
}
module.exports={runtimeTargets,appendTargets,idFor,writeCatalogPair};
