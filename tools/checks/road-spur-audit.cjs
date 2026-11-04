/* 街道の「ひげ」（行って戻る短い枝）の棚卸し。頂点で向きが160°以上反転し、その前後が同じ道筋を逆にたどる区間を拾う。
   検出は候補であり、史実の支線（城への取付路など）か描画の誤りかは史料で個別に判断する。自動で削除しない。 */
const fs=require('node:fs'),path=require('node:path'),{G,TK,TKGEO}=require('./history-focus.cjs').model();
const km=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])*111.32/TKGEO.K,ll=p=>[+(TKGEO.LON0+p[0]/TKGEO.K/TKGEO.CX).toFixed(5),+(TKGEO.LAT0-p[1]/TKGEO.K).toFixed(5)];
const rows=[];
for(const raw of G.ROADS){const p=TK.roadDisplay(raw).pts;
 for(let i=1;i<p.length-1;i++){const a=p[i-1],b=p[i],c=p[i+1],v1=[b[0]-a[0],b[1]-a[1]],v2=[c[0]-b[0],c[1]-b[1]],L1=Math.hypot(...v1),L2=Math.hypot(...v2);if(L1<1e-9||L2<1e-9)continue;
  if((v1[0]*v2[0]+v1[1]*v2[1])/(L1*L2)>-Math.cos(20*Math.PI/180))continue;
  // 先端から両側へ、往路と復路の距離が 150m 以内である限り延ばす
  let k=1,len=0;const tol=0.15/111.32*TKGEO.K;while(i-k>=0&&i+k<p.length){const d=Math.hypot(p[i-k][0]-p[i+k][0],p[i-k][1]-p[i+k][1]);if(d>tol)break;len+=km(p[i-k+1],p[i-k]);k++;}
  const tipKm=Math.max(L1,L2)*111.32/TKGEO.K;rows.push({road:raw.name,vertex:i,tip:ll(b),spurKm:+Math.max(len,tipKm).toFixed(3),retraced:k-1});}}
rows.sort((a,b)=>b.spurKm-a.spurKm);
const out=path.join(__dirname,'../../data/audits/road-spur-audit.json');
fs.writeFileSync(out,JSON.stringify({generated:new Date().toISOString(),scope:'描画用の街道線で行って戻る短い枝の候補。史実の支線か描画の誤りかは未判定。',roads:G.ROADS.length,candidates:rows.length,over200m:rows.filter(r=>r.spurKm>=.2).length,rows},null,1)+'\n');
const by={};for(const r of rows.filter(r=>r.spurKm>=.2))by[r.road]=(by[r.road]||0)+1;
console.log('PASS: road spur inventory',rows.length,'candidates,',rows.filter(r=>r.spurKm>=.2).length,'over 200m in',Object.keys(by).length,'roads');
console.log(Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v])=>k+':'+v).join(' '));
console.log(rows.slice(0,12).map(r=>`${r.road} ${r.spurKm}km @${r.tip.join(',')}`).join('\n'));
