"use strict";
/* 郡の区分と城の保有で領土を塗る（docs/designs/county-territory.md 技術計画 3・4）。
   郡の形は kuniezu/map/admin/gun-*.geojson（CODH 旧国・旧郡境界の加工、CC BY-NC 4.0）。
   郡の色はその日の城の持ち主から規則で決め、ゲームの状態は変えない。
   雲は持ち主を規則で導けない郡を示すだけで、シミュレーションには使わない。 */
(function(root){
 const FILES=['admin/gun-shapes.geojson','admin/gun-cells.geojson','admin/gun-exceptions.geojson','admin/gun-edges.geojson'];
 const BASIS_TEXT={'castle-point':'郡の中の城の持ち主から','province-uniform':'国の城がすべて同じ家','exception':'例外','underived':'持ち主を決められない'};
 const day=d=>d[0]*10000+d[1]*100+d[2];

 // 城の鍵（castle:<id>）からその日の持ち主を返す。行軍拠点の城は S.castles、それ以外は G.yOwner。
 // 存在する期間の外の城は null（数えない）。主城・支城の呼び分けはこの関数の中だけに置く。
 function installCastleOwner(G){
  let byId=null;
  G.castleOwner=function(key,state=G.S?.()){
   if(!state||typeof key!=='string'||!key.startsWith('castle:'))return null;
   const id=key.slice(7);if(state.castles?.[id])return {owner:state.castles[id].owner,waypoint:true};
   if(!byId){byId=new Map();for(const y of G.YOSHO||[])if(y.kind==='城')byId.set(y.id,y);}
   const site=byId.get(id);if(!site||!G.yActive?.(site))return null;
   return {owner:G.yOwner(site),waypoint:false};
  };
  G.castlePosition=function(key){
   if(typeof key!=='string'||!key.startsWith('castle:'))return null;const id=key.slice(7);
   if(G.C?.[id])return [G.C[id].x,G.C[id].y];
   if(!byId){byId=new Map();for(const y of G.YOSHO||[])if(y.kind==='城')byId.set(y.id,y);}
   const site=byId.get(id);return site?[site.x,site.y]:null;
  };
 }

 // その日の郡と区画ごとの色の元を決める（技術計画 3 の規則）。純粋な計算なので検査からも呼ぶ。
 function decide({counties,cellsByGun,exceptionsByGun,ownerOf,date,positionOf=()=>null}){
  const n=day(date),result=new Map(),kuniOwners=new Map();
  const ownersIn=keys=>keys.map(ownerOf).filter(Boolean);
  for(const c of counties){const owners=ownersIn(c.castles);const list=kuniOwners.get(c.kuni)||[];list.push(...owners);kuniOwners.set(c.kuni,list);}
  for(const c of counties){
   const ex=(exceptionsByGun.get(c.id)||[]).find(e=>(e.from==null||day(e.from)<=n)&&(e.to==null||n<day(e.to)));
   const owners=ownersIn(c.castles);
   if(ex&&(ex.rule==='context'||ex.rule==='neutral-without-castle'&&!owners.length)){result.set(c.id,{basis:'exception',context:ex.key});continue;}
   if(owners.length){
    const clans=[...new Set(owners.map(o=>o.owner))];
    if(clans.length===1){result.set(c.id,{basis:'castle-point',clan:clans[0]});continue;}
    // 区画の城がその日に数えられない（存在する期間の外）ときは、同じ郡で最も近い数えられる城の持ち主で塗る。
    const cells=new Map(),counted=c.castles.filter(k=>ownerOf(k));
    for(const cell of cellsByGun.get(c.id)||[]){const o=ownerOf(cell.castle);if(o){cells.set(cell.castle,o.owner);continue;}
     const here=positionOf(cell.castle);let best=counted[0],bd=Infinity;
     if(here)for(const k of counted){const p=positionOf(k);if(!p)continue;const d=(p[0]-here[0])**2+(p[1]-here[1])**2;if(d<bd){bd=d;best=k;}}
     if(best)cells.set(cell.castle,ownerOf(best).owner);}
    result.set(c.id,{basis:'castle-point',clan:null,cells,clans});continue;
   }
   const clans=[...new Set((kuniOwners.get(c.kuni)||[]).map(o=>o.owner))];
   result.set(c.id,clans.length===1?{basis:'province-uniform',clan:clans[0],single:(kuniOwners.get(c.kuni)||[]).length===1}:{basis:'underived',clan:null});
  }
  return result;
 }

 function cloudTile(){
  const size=256,canvas=root.document.createElement('canvas');canvas.width=canvas.height=size;const x=canvas.getContext('2d');
  let seed=17;const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
  for(let i=0;i<46;i++){const cx=rnd()*size,cy=rnd()*size,r=18+rnd()*42;for(const dx of [-size,0,size])for(const dy of [-size,0,size]){const g=x.createRadialGradient(cx+dx,cy+dy,0,cx+dx,cy+dy,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(cx+dx-r,cy+dy-r,r*2,r*2);}}
  return canvas;
 }

 function create({G,project,date,assets=root.TKVectorAssets,onReady=()=>{},onChange=()=>{}}){
  installCastleOwner(G);
  const map=root.TKVectorMap.create({project}),lines=root.TKVectorMap.create({project});let ready=false,counties=[],byId=new Map(),cellsByGun=new Map(),exceptionsByGun=new Map(),tile=null,memo={key:null,value:null};
  const loaded=(async()=>{
   const [shapes,cells,exceptions,edges]=await Promise.all(FILES.map(f=>assets.load(f)));
   counties=shapes.features.map(f=>({id:f.properties.id,name:f.properties.name,kuni:f.properties.kuni,kuniName:f.properties.kuniName,castles:f.properties.castles}));
   byId=new Map(counties.map(c=>[c.id,c]));
   for(const f of cells.features){const list=cellsByGun.get(f.properties.gun)||[];list.push({castle:f.properties.castle});cellsByGun.set(f.properties.gun,list);}
   for(const f of exceptions.features){const list=exceptionsByGun.get(f.properties.gun)||[];list.push(f.properties);exceptionsByGun.set(f.properties.gun,list);}
   const asControl=(features,keyOf)=>features.map(f=>({...f,properties:{drawRole:'control',key:keyOf(f.properties)}}));
   map.replace([
    {type:'FeatureCollection',coordinateReferenceSystem:'OGC:CRS84',features:asControl(shapes.features,p=>'gun:'+p.id)},
    {type:'FeatureCollection',coordinateReferenceSystem:'OGC:CRS84',features:asControl(cells.features,p=>'cell:'+p.gun+'|'+p.castle)}
   ]);
   // 境の線は描画器では線の役（shore）として持ち、鍵に両側の単位（gun:… か cell:…）を入れる。
   lines.replace([{type:'FeatureCollection',coordinateReferenceSystem:'OGC:CRS84',features:edges.features.map(f=>({...f,properties:{drawRole:'shore',key:f.properties.a+'||'+f.properties.b}}))}]);
   ready=true;onReady();onChange();
  })();
  loaded.catch(()=>{});
  function state(){
   const S=G.S?.();if(!S||!ready)return null;const d=date(),key=day(d)+'|'+JSON.stringify(S.branches||{})+'|'+G.CL.map(c=>S.castles[c.id]?.owner).join(',')+'|'+Object.keys(S.clans||{}).filter(k=>S.clans[k]?.alive).join(',');
   if(memo.key!==key){const value=decide({counties,cellsByGun,exceptionsByGun,ownerOf:k=>G.castleOwner(k,S),positionOf:G.castlePosition,date:d});
    // 塗りが変わったときだけ変わる要約。描き直しの合図に使う（日付そのものは入れない）。
    const sig=[...value].map(([id,v])=>id+':'+v.basis+':'+(v.clan||v.context||'')+(v.cells?':'+[...v.cells].map(e=>e.join('=')).join(','):'')).join(';');
    memo={key,value,sig};}
   return memo.value;
  }
  return {
   loaded,ready:()=>ready,
   signature:()=>{state();return memo.sig||'';},
   // 指した所の家（家を選ぶ画面で使う）。郡なら郡の家、区画ならその区画の家。決められなければ null。
   clanAt(x,y){const decided=state();if(!decided)return null;const key=map.controlAt(x,y,date());if(!key)return null;if(key.startsWith('gun:')){const v=decided.get(key.slice(4));return v?.clan||null;}const [gun,castle]=key.slice(5).split('|');return decided.get(gun)?.cells?.get(castle)||null;},
   // owners の色の層として、陸で切り抜かれた中に塗る。clanColor(k) と contextColor(key) は [r,g,b,a]。
   paint(c,view,{clanColor,contextColor,cloudScale=1}){
    const decided=state();if(!decided)return false;const d=date();
    map.paintControl(c,d,view,key=>{
     if(key.startsWith('gun:')){const v=decided.get(key.slice(4));if(!v)return null;if(v.basis==='exception')return contextColor(v.context);return v.clan?clanColor(v.clan):null;}
     const [gun,castle]=key.slice(5).split('|');const v=decided.get(gun);if(!v||v.clan||!v.cells)return null;const owner=v.cells.get(castle);return owner?clanColor(owner):null;
    });
    const under=map.path('control',d,view,key=>key.startsWith('gun:')&&decided.get(key.slice(4))?.basis==='underived');
    tile??=cloudTile();const pattern=c.createPattern(tile,'repeat');pattern.setTransform(new root.DOMMatrix([cloudScale,0,0,cloudScale,0,0]));
    c.save();c.fillStyle=pattern;c.fill(under,'nonzero');c.restore();
    return true;
   },
   // 境の線。両側の持ち主が同じなら、郡の境だけを細く引く（同じ家の区画どうしの間には引かない）。
   // 持ち主が違えば style(a,b)（今の城の領域の国境と同じ描き方）で引く。持ち主の分からない側には引かない。
   strokeBorders(c,view,{thin,style}){
    const decided=state();if(!decided)return false;const d=date(),ownerOf=unit=>{
     if(unit.startsWith('gun:')){const v=decided.get(unit.slice(4));return v?.basis==='exception'?null:v?.clan||null;}
     const [gun,castle]=unit.slice(5).split('|');return decided.get(gun)?.cells?.get(castle)||null;};
    const groups=new Map(),sameCounty=[];
    for(const key of lines.keys('shore',d,view)){
     const [a,b]=key.split('||'),oa=ownerOf(a),ob=ownerOf(b);
     if(oa&&ob&&oa!==ob){const pair=oa<ob?oa+'|'+ob:ob+'|'+oa;if(!groups.has(pair))groups.set(pair,{a:oa,b:ob,keys:new Set()});groups.get(pair).keys.add(key);continue;}
     const ga=a.startsWith('gun:')?a.slice(4):a.slice(5).split('|')[0],gb=b.startsWith('gun:')?b.slice(4):b.slice(5).split('|')[0];
     if(ga!==gb)sameCounty.push(key);
    }
    const same=new Set(sameCounty);c.save();thin(c);c.stroke(lines.path('shore',d,view,key=>same.has(key)));c.restore();
    for(const g of groups.values()){c.save();style(c,g.a,g.b);c.stroke(lines.path('shore',d,view,key=>g.keys.has(key)));c.restore();}
    return true;
   },
   // 指した所の郡の説明（画面の文言は設計書の「画面の文言」）。
   infoAt(x,y,clanName){
    const decided=state();if(!decided)return null;const key=map.controlAt(x,y,date());if(!key)return null;
    const gun=key.startsWith('gun:')?key.slice(4):key.slice(5).split('|')[0],county=byId.get(gun),v=decided.get(gun);if(!county||!v)return null;
    let owner='領地不明';if(v.basis==='exception')owner='例外：'+(v.context||'');else if(v.clan)owner=clanName(v.clan);else if(v.cells){const castle=key.startsWith('cell:')?key.slice(5).split('|')[1]:null,o=castle&&v.cells.get(castle);owner=o?clanName(o):v.clans.map(clanName).join('・');}
    const basis=BASIS_TEXT[v.basis]+(v.single?'（国の城が 1 つ）':'');
    return {gun,title:`${county.name}郡（${county.kuniName}国）`,role:owner,description:basis};
   },
   decide:value=>decide(value)
  };
 }
 root.TKCounty={create,decide,installCastleOwner};
 if(typeof module!=='undefined'&&module.exports)module.exports={create,decide,installCastleOwner};
})(typeof window==='undefined'?globalThis:window);
