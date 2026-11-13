"use strict";
/* 編集済み経緯度の描画専用。水面の合成・補正・平滑化は準備時に済ませる。 */
(function(root){
 const day=value=>Array.isArray(value)?value[0]*10000+value[1]*100+value[2]:value;
 const mapDay=value=>{value=day(value);if(!Number.isFinite(value))throw Error('Expected map date');return value;};
 function create({project,Path=root.Path2D}){
  let rows=[],periods=[],revision=0;const listeners=new Set(),wholePaths=new Map();
  function compile(collection){
   if(collection.type!=='FeatureCollection'||!Array.isArray(collection.features))throw Error('Expected vector FeatureCollection');
   if(collection.crs||collection.coordinateReferenceSystem&&collection.coordinateReferenceSystem!=='OGC:CRS84')throw Error('Expected OGC:CRS84');
   const result=[];
   for(const f of collection.features){
    const p=f.properties||{},role=p.drawRole;if(!['land','water','shore','control'].includes(role))continue;
    if(role==='control'&&(typeof p.key!=='string'||!p.key))throw Error('Expected control key');
    const g=f.geometry;if(!g)continue;
    if(!['Polygon','MultiPolygon','LineString','MultiLineString'].includes(g.type))throw Error('Unsupported map geometry');
    if(role!=='shore'&&!g.type.includes('Polygon'))throw Error('Expected surface geometry');
    const rings=g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():[];
    for(const ring of rings)if(ring.length<4||ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw Error('Expected closed polygon ring');
    const polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:null;
    const projected=polygons?polygons.map(poly=>poly.map(ring=>ring.map(point=>position(point)))):g.type==='LineString'?[g.coordinates.map(position)]:g.coordinates.map(line=>line.map(position));
    const points=polygons?projected.flat(2):projected.flat();let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const [x,y] of points){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    if(!Number.isFinite(x0+y0+x1+y1))throw Error('Empty map geometry');
    const from=p.validFrom==null?-Infinity:day(p.validFrom),until=p.validUntil==null?Infinity:day(p.validUntil);
    if(!(from<until))throw Error('Invalid map period');
    result.push({id:f.id??p.id,key:p.key,role,polygons:!!polygons,coordinates:projected,bounds:[x0,y0,x1,y1],from,until,path:null});
   }
   return result;
  }
  function position(point){if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||Math.abs(point[0])>180||Math.abs(point[1])>90)throw Error('Expected longitude/latitude');const p=project(...point);if(!p.every(Number.isFinite))throw Error('Invalid projected position');return p;}
  // 複数地物の重なりを穴にしないよう外周・内周の描画方向だけをそろえる。
  // 正本の座標・頂点・地理形状は変えず、Canvasのnonzero規則で和集合を描く。
  function path(row){
   if(row.path)return row.path;const path=new Path();
   for(const poly of row.polygons?row.coordinates:[row.coordinates])for(let k=0;k<poly.length;k++){
    const ring=poly[k];if(!ring.length)continue;
    let area=0;if(row.polygons)for(let i=0,j=ring.length-1;i<ring.length;j=i++)area+=(ring[j][0]-ring[0][0])*(ring[i][1]-ring[0][1])-(ring[i][0]-ring[0][0])*(ring[j][1]-ring[0][1]);
    const reverse=row.polygons&&((area>0)!==(k===0));
    path.moveTo(...ring[0]);if(reverse){for(let i=ring.length-1;i>0;i--)path.lineTo(...ring[i]);}else{for(let i=1;i<ring.length;i++)path.lineTo(...ring[i]);}
    if(row.polygons)path.closePath();
   }
   return row.path=path;
  }
  const active=(row,date)=>row.from<=date&&date<row.until;
  function epoch(date){let lo=0,hi=periods.length;while(lo<hi){const mid=(lo+hi)>>1;if(periods[mid]<=date)lo=mid+1;else hi=mid;}return lo;}
  const intersects=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
  function selected(role,date,view){date=day(date);return rows.filter(row=>row.role===role&&active(row,date)&&(!view||intersects(row.bounds,view)));}
  function inRing(x,y,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  const containsRow=(row,x,y)=>row.coordinates.some(poly=>inRing(x,y,poly[0])&&!poly.slice(1).some(ring=>inRing(x,y,ring)));
  return {
   replace(collections){const next=collections.flatMap(compile);rows=next;periods=[...new Set(rows.flatMap(row=>[row.from,row.until]).filter(Number.isFinite))].sort((a,b)=>a-b);wholePaths.clear();revision++;for(const f of listeners)f();return next.length;},
   draw(context,role,date,view){const found=selected(role,date,view);for(const row of found){if(role==='shore')context.stroke(path(row));else context.fill(path(row),'nonzero');}return found.length;},
   path(role,date,view,keyFilter){date=mapDay(date);const key=role+':'+epoch(date);if(!view&&!keyFilter&&wholePaths.has(key))return wholePaths.get(key);const all=new Path();for(const row of selected(role,date,view))if(!keyFilter||keyFilter(row.key))all.addPath(path(row));if(!view&&!keyFilter){wholePaths.set(key,all);if(wholePaths.size>6)wholePaths.delete(wholePaths.keys().next().value);}return all;},
   keys(role,date,view){return selected(role,mapDay(date),view).map(row=>row.key);},
   contains(x,y,date){return selected('land',date,[x,y,x,y]).some(row=>containsRow(row,x,y));},
   controlAt(x,y,date){return selected('control',date,[x,y,x,y]).findLast(row=>containsRow(row,x,y))?.key||null;},
   paintControl(context,date,view,color){let count=0;for(const row of selected('control',date,view)){const rgba=color(row.key);if(!rgba)continue;context.fillStyle=`rgba(${rgba.slice(0,3).join(',')},${rgba[3]/255})`;context.fill(path(row),'nonzero');count++;}return count;},
   bounds(role,date){const found=selected(role,date);return found.length?[Math.min(...found.map(r=>r.bounds[0])),Math.min(...found.map(r=>r.bounds[1])),Math.max(...found.map(r=>r.bounds[2])),Math.max(...found.map(r=>r.bounds[3]))]:null;},
   epoch:date=>epoch(mapDay(date)),revision:()=>revision,onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
   stats:()=>({features:rows.length,paths:rows.filter(row=>row.path).length,revision})
  };
 }
 root.TKVectorMap={create};if(typeof module!=='undefined'&&module.exports)module.exports={create};
})(typeof window==='undefined'?globalThis:window);
