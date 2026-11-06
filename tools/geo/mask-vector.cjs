/* PNG型紙の採用格子範囲を経緯度の面へ変換する。史実汀線の復元ではない。
   画素中心でなく四隅を使い、対角接触を別の面として保持する。
   呼出元は型紙と格子版の対応・SHAを検証してから渡す。 */
'use strict';
const area=ring=>{let sum=0;for(let i=0;i<ring.length-1;i++)sum+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];return sum/2;};
const inside=(ring,[x,y])=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [ax,ay]=ring[i],[bx,by]=ring[j];if((ay>y)!==(by>y)&&x<ax+(bx-ax)*(y-ay)/(by-ay))yes=!yes;}return yes;};
// A hole can touch the exterior at a grid vertex. Split that walk into simple
// rings instead of emitting a self-touching LinearRing or nudging coordinates.
function simpleRings(walk){
  const stack=[],positions=new Map(),rings=[];
  for(const point of walk){const key=point.join(',');
    if(positions.has(key)){
      const index=positions.get(key),ring=[...stack.slice(index),point];
      if(ring.length<4)throw Error('Degenerate boundary loop');rings.push(ring);
      for(let i=stack.length-1;i>index;i--)positions.delete(stack[i].join(','));
      stack.length=index+1;
    }else{positions.set(key,stack.length);stack.push(point);}
  }
  if(stack.length!==1)throw Error('Unclosed boundary walk');return rings;
}

function vectorize({width,height,values},projection,window,keys){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||values.length!==width*height)throw Error('Invalid mask dimensions');
  if(!Array.isArray(window)||window.length!==4||!window.every(Number.isSafeInteger)||window[0]<0||window[1]<0||window[2]!==width||window[3]!==height)throw Error('Mask window differs from dimensions');
  const {origin,stepUnits,K,CX,LON0,LAT0}=projection;
  if(!Array.isArray(origin)||origin.length!==2||![...origin,stepUnits,K,CX,LON0,LAT0].every(Number.isFinite)||stepUnits<=0||K<=0||CX<=0)throw Error('Invalid projection');
  if(!Array.isArray(keys)||!keys.length||keys.some(k=>typeof k!=='string'||!k)||new Set(keys).size!==keys.length)throw Error('Invalid mask keys');
  const groups=new Map(),at=(x,y)=>x<0||y<0||x>=width||y>=height?0:values[y*width+x];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const value=at(x,y);if(!Number.isInteger(value)||value<0||value>keys.length)throw Error('Mask value outside keys');if(!value)continue;
    if(!groups.has(value))groups.set(value,{edges:[],starts:new Map(),cells:0});
    const group=groups.get(value);group.cells++;
    function edge(ax,ay,bx,by,direction){const key=ax+','+ay,index=group.edges.length;group.edges.push({a:[ax,ay],b:[bx,by],direction,used:false});if(!group.starts.has(key))group.starts.set(key,[]);group.starts.get(key).push(index);}
    if(at(x,y-1)!==value)edge(x,y,x+1,y,0);
    if(at(x+1,y)!==value)edge(x+1,y,x+1,y+1,1);
    if(at(x,y+1)!==value)edge(x+1,y+1,x,y+1,2);
    if(at(x-1,y)!==value)edge(x,y+1,x,y,3);
  }
  const features=[];
  for(const [value,group] of [...groups].sort((a,b)=>a[0]-b[0])){
    const rings=[];
    for(const start of group.edges){
      if(start.used)continue;const ring=[start.a];let edge=start;
      for(;;){
        if(edge.used)throw Error('Repeated boundary edge');edge.used=true;ring.push(edge.b);
        if(edge.b[0]===start.a[0]&&edge.b[1]===start.a[1])break;
        const candidates=(group.starts.get(edge.b.join(','))||[]).map(i=>group.edges[i]).filter(e=>!e.used);
        if(!candidates.length)throw Error('Open mask boundary');
        // Screen-space clockwise right turn keeps diagonal pixels separate.
        const rank=[1,0,3,2],previous=edge.direction;
        candidates.sort((a,b)=>rank.indexOf((a.direction-previous+4)%4)-rank.indexOf((b.direction-previous+4)%4));
        edge=candidates[0];
      }
      for(const simple of simpleRings(ring)){const signed=area(simple);if(!signed)throw Error('Degenerate mask boundary');rings.push({ring:simple,area:signed});}
    }
    const polygons=rings.filter(r=>r.area>0).map(r=>({outer:r,holes:[]}));
    for(const hole of rings.filter(r=>r.area<0)){
      const [a,b]=hole.ring,dx=b[0]-a[0],dy=b[1]-a[1];
      const point=[(a[0]+b[0])/2+dy*1e-5,(a[1]+b[1])/2-dx*1e-5];
      const containers=polygons.filter(p=>inside(p.outer.ring,point)).sort((a,b)=>a.outer.area-b.outer.area);
      if(!containers.length)throw Error('Hole without enclosing mask exterior');containers[0].holes.push(hole);
    }
    const position=([column,row])=>{
      const x=origin[0]+(window[0]+column)*stepUnits,y=origin[1]+(window[1]+row)*stepUnits;
      const pair=[x/(K*CX)+LON0,LAT0-y/K];
      if(pair[0]<-180||pair[0]>180||pair[1]<-90||pair[1]>90)throw Error('Projected coordinates outside longitude/latitude');return pair;
    };
    const coordinates=polygons.map(p=>[p.outer,...p.holes].map(r=>r.ring.slice().reverse().map(position)));
    features.push({type:'Feature',properties:{maskValue:value,key:keys[value-1],cells:group.cells,role:'adopted-raster-extent',exactHistoricalShoreline:false,cellSizeMetres:projection.stepMetres??null},geometry:{type:'MultiPolygon',coordinates}});
  }
  return {type:'FeatureCollection',features};
}
module.exports={vectorize};
