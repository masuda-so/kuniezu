"use strict";
/* 編集済みGeoJSONを共通描画器へ接続する。実行時の形状補正はしない。 */
(function(root){
 const knownKorea=new Set(["busan", "ulsan", "jinju", "daegu", "sangju", "jeonju", "namwon", "suncheon", "chungju", "gongju", "hanseong", "gaeseong", "wonju", "haeju", "pyongyang", "uiju", "hamhung", "jeju", "yosho:奉恩寺（修道山）:127.057:37.51517", "yosho:奉先寺:127.1835518:37.7473504", "yosho:海印寺（蔵経施設）:128.0980383:35.8010416", "yosho:東萊邑城:129.091:35.207", "yosho:子城台・釜山鎮支城:129.06:35.135", "yosho:楽安邑城:127.339:34.908", "yosho:幸州山城:126.825:37.597", "yosho:景福宮:126.977:37.579", "yosho:閑山島水軍陣:128.473:34.787", "yosho:頭龍浦統制営:128.422:34.846", "yosho:蔚山倭城（島山城）:129.335:35.553", "yosho:西生浦倭城:129.328:35.386", "yosho:順天倭城:127.58:34.902", "yosho:泗川倭城（船津里城）:128.039:35.004"]);
 const expected=[['physical/land.geojson','land',new Set(['Polygon','MultiPolygon'])],['physical/water.geojson','water',new Set(['Polygon','MultiPolygon'])],['physical/coastline.geojson','shore',new Set(['LineString','MultiLineString'])],['physical/water-evidence.geojson','evidence',new Set(['Point','Polygon'])]];
 function create({project,date,onReady=()=>{},onChange=()=>{},assets=root.TKVectorAssets}){
  const source=root.TKVectorMap.create({project}),terrain=root.TKVectorMap.create({project}),evidenceModel=root.TKVectorMap.create({project});let evidenceLabels=[],landRows=[];const labelMemo=new WeakMap(),seaLayers=new WeakMap();let ready=false,manifest=null;
  const day=()=>date();
  const overlap=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
  function pointBounds(points){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of points){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}return [x0,y0,x1,y1];}
  function segmentHit(a,b,c,d){const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);if(!overlap(pointBounds([a,b]),pointBounds([c,d])))return false;const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),x=cross(c,d,b);return (u===0||v===0||Math.sign(u)!==Math.sign(v))&&(w===0||x===0||Math.sign(w)!==Math.sign(x));}
  function lineTouchesLand(points){if(!ready||!points?.length)return false;const n=day(),date=n[0]*10000+n[1]*100+n[2],bounds=pointBounds(points),rows=landRows.filter(r=>r.from<=date&&date<r.until&&overlap(r.bounds,bounds));if(!rows.length)return false;
   if(points.some(p=>source.contains(p[0],p[1],n)))return true;
   // Endpoint-outside segments can cross a small island: exact segment/ring test, no resampling.
   for(const row of rows){row.rings??=row.raw.map(ring=>ring.map(point=>project(...point)));for(let i=1;i<points.length;i++)for(const ring of row.rings)for(let j=1;j<ring.length;j++)if(segmentHit(points[i-1],points[i],ring[j-1],ring[j]))return true;}return false;}
  function labelVisible(record,geometries){const key=source.revision()+':'+source.epoch(day()),old=labelMemo.get(record);if(old?.key===key)return old.visible;const visible=geometries.some(g=>lineTouchesLand(Array.isArray(g)?g:g.points));labelMemo.set(record,{key,visible});return visible;}
  const loaded=(async()=>{
   manifest=await assets.manifest();
   const collections=await Promise.all(expected.map(async([file,role,types])=>{
    const data=await assets.load(file);
    for(const feature of data.features){const actual=feature.properties?.drawRole;if(feature.type!=='Feature'||!types.has(feature.geometry?.type)||(role==='evidence'?!(actual==='water-label'&&feature.geometry.type==='Point'||actual==='inferred-water'&&feature.geometry.type==='Polygon'):actual!==role))throw Error('Unexpected role/type: '+file);}
    return data;
   }));
   // Compile into temporary instances first. Main renderer never observes partial files.
   const terrainCollection={type:'FeatureCollection',coordinateReferenceSystem:'OGC:CRS84',features:collections[0].features.filter(f=>f.properties.allowTerrainInference!==false)};
   const evidence=collections[3];evidenceLabels=evidence.features.filter(f=>f.properties.drawRole==='water-label');evidenceModel.replace([{type:'FeatureCollection',coordinateReferenceSystem:'OGC:CRS84',features:evidence.features.filter(f=>f.properties.drawRole==='inferred-water').map(f=>({...f,properties:{...f.properties,drawRole:'water'}}))}]);landRows=collections[0].features.flatMap(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(raw=>{const b=pointBounds(raw.flat()),a=project(b[0],b[3]),z=project(b[2],b[1]),p=f.properties,from=p.validFrom||[-999999,1,1],until=p.validUntil||[999999,1,1];return {raw,bounds:[a[0],a[1],z[0],z[1]],from:from[0]*10000+from[1]*100+from[2],until:until[0]*10000+until[1]*100+until[2]};}));terrain.replace([terrainCollection]);source.replace(collections.slice(0,3));ready=true;onReady();onChange();return source;
  })();
  // Keep the promise rejected for boot to show its existing reload UI; prevent early unhandled rejection.
  loaded.catch(()=>{});
  return {loaded,labelVisible,ready:()=>ready,revision:source.revision,epoch:()=>source.epoch(day()),
   land:()=>source.path('land',day()),water:()=>source.path('water',day()),
   contains:(x,y)=>ready&&source.contains(x,y,day()),bounds:()=>source.bounds('land',day()),
   drawEvidence(c,view,z){c.save();c.fillStyle='rgba(118,166,186,.28)';evidenceModel.draw(c,'water',day(),view);if(z>1)for(const f of evidenceLabels){const prop=f.properties,now=day(),n=now[0]*10000+now[1]*100+now[2],from=prop.validFrom||[1560,1,1],until=prop.validUntil||[1616,1,1];if(n<from[0]*10000+from[1]*100+from[2]||n>=until[0]*10000+until[1]*100+until[2])continue;const [x,y]=project(...f.geometry.coordinates);c.font=`${10/z}px sans-serif`;c.fillStyle='#315766';c.fillText(prop.label||prop.name||'',x,y);}c.restore();},
   drawWater(c,view){source.draw(c,'water',day(),view);},strokeShore(c,view){source.draw(c,'shore',day(),view);},
   onLand(c,draw){c.save();c.clip(source.path('land',day()),'nonzero');try{draw(c);}finally{c.restore();}},
   offLand(c,draw){
    let layer=seaLayers.get(c.canvas);if(!layer){const canvas=document.createElement('canvas');layer={canvas,context:canvas.getContext('2d')};seaLayers.set(c.canvas,layer);}
    const canvas=layer.canvas,x=layer.context;if(canvas.width!==c.canvas.width)canvas.width=c.canvas.width;if(canvas.height!==c.canvas.height)canvas.height=c.canvas.height;
    x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,canvas.width,canvas.height);x.save();x.setTransform(c.getTransform());draw(x);
    x.globalAlpha=1;x.globalCompositeOperation='destination-out';x.fill(source.path('land',day()),'nonzero');x.restore();
    c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(canvas,0,0);c.restore();
   },
   paintLand(c,{flat,view,z,dpr,relief,owners,tint}){
    c.save();c.clip(source.path('land',day()),'nonzero');c.fillStyle=flat?'#fbfaf6':'#ece2c6';c.fill(source.path('land',day()),'nonzero');
    if(!flat&&relief){c.save();c.clip(terrain.path('land',day()),'nonzero');relief(c,view,z,dpr);c.restore();}
    if(owners)owners(c,view,z,dpr);if(!flat&&tint){c.save();c.globalCompositeOperation='multiply';c.fillStyle=tint;c.fillRect(view[0],view[1],view[2]-view[0],view[3]-view[1]);c.restore();}c.restore();
    c.save();c.fillStyle=flat?'#aac4df':'#a7d1df';source.draw(c,'water',day(),view);c.restore();
   },
   strategyCastle(C){return !!C&&!knownKorea.has(C.id)&&!Object.hasOwn(root.TK.KOREA_NODES||{},C.id)&&C.id!=='jeju';},
   strategySite(site){return !!site&&!knownKorea.has(site.id)&&!['朝鮮','朝鮮国','韓国','Joseon','Korea','KR'].includes(site.country||site.region||site.nation)&&!Object.hasOwn(root.TK.KOREA_NODES||{},site.at)&&site.at!=='jeju'&&!Object.hasOwn(root.TK.KOREA_SITES||{},site.n);},
   strategyLabel(label){return !((label.contextKey&&label.contextKey!=='context:ainu')||(label.regionKey&&label.regionKey!=='context:ainu')||label.regionKey?.startsWith('korea')||label.contextKey?.startsWith('korea')||['朝鮮','済州','漢城','平壌','平安','黄海','京畿','咸鏡','忠清','慶尚','全羅','江原'].includes(label.n||label.name));},
   stats:source.stats};
 }
 root.TKVectorUI={create};
})(window);
