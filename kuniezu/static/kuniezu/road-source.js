"use strict";
/* 編集済み全街道の索引。準備時は検査だけを行い、投影は初回参照まで待つ。 */
(function(root){
 let byName=new Map(),views=new WeakMap(),ready=false,loaded=null;
 function install(collection){
  if(collection.type!=='FeatureCollection'||!Array.isArray(collection.features)||collection.crs||collection.coordinateReferenceSystem!=='OGC:CRS84')throw Error('Invalid canonical road collection');
  const ids=new Set(),next=new Map();
  for(const f of collection.features){
   const p=f.properties,g=f.geometry;
   if(f.type!=='Feature'||typeof f.id!=='string'||ids.has(f.id)||!p||typeof p.name!=='string'||!p.name||next.has(p.name)||p.drawRole!=='road-reference'||!['japan-strategy-map','outside-japan-strategy-map'].includes(p.strategyScope)||g?.type!=='LineString'||!Array.isArray(g.coordinates)||g.coordinates.length<2||g.coordinates.some(q=>!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite)||Math.abs(q[0])>180||Math.abs(q[1])>90))throw Error('Invalid canonical road feature');
   ids.add(f.id);next.set(p.name,f);
  }
  if(!next.size)throw Error('Empty canonical roads');
  byName=next;views=new WeakMap();ready=true;
  return collection;
 }
 function load(){if(!loaded){loaded=root.TKVectorAssets.load('physical/roads-reference.geojson').then(install);loaded.catch(()=>{});}return loaded;}
 function view(raw,project){
  if(!ready)throw Error('Canonical roads not ready');
  if(typeof project!=='function')throw Error('Road projection not ready');
  const feature=byName.get(raw.name);if(!feature)throw Error('Missing canonical road: '+raw.name);
  const cached=views.get(raw);if(cached?.project===project)return cached.view;
  const p=feature.properties,a=p.migrationAdoption||{},e=p.evidence||{};
  const pts=feature.geometry.coordinates.map(q=>{const value=project(...q);if(!Array.isArray(value)||value.length!==2||!value.every(Number.isFinite))throw Error('Invalid road projection');return value;});
  const value={...raw,pts,canonicalId:feature.id,strategyScope:p.strategyScope,evidence:a.modernReference?{...e,label:raw.name}:a.modernAligned?{...e,alignment:'史料の経由地を保持し、近接する近現代道の屈曲を局所参照'}:e};
  if(a.modernReference)value.modernReference=true;
  if(a.modernAligned)value.modernAligned=a.modernAligned;
  if(a.referenceCleanup)value.referenceCleanup=a.referenceCleanup;
  views.set(raw,{project,view:value});return value;
 }
 root.TKRoadSource={load,install,view,get loaded(){return loaded;},ready:()=>ready,feature:name=>byName.get(name),isStrategyRoad:name=>byName.get(typeof name==='string'?name:name.name)?.properties.strategyScope==='japan-strategy-map'};
})(window);
