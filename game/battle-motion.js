"use strict";
/* 合戦図の推定の動き。史料に動きの記録がない隊について、各隊の模式の経過（u.path：旧模式図の時刻・位置）を
   実地図の向きと縮尺へ合わせて、前進・押し合い・退却を生成する。位置の記録がない側は、位置の分かる側を基準に
   模式の陣形を地図へ置く（推定の配置）。どちらも「推定」として描き分け、史料の記録としては扱わない。
   史料の動き（TK.BATTLE_MOVEMENTS）がある隊はそちらを優先し、ここでは扱わない。 */
window.TKBattleMotion=(function(){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // 推定配置だけの画面余白。顔は左34px、幟は右37px/上41pxまで張り出す。
 function fitPlacement(p,W,H){const small=W<560,left=small?28:40,right=small?28:40,top=small?28:46,bottom=54;return [clamp(p[0],left,Math.max(left,W-right)),clamp(p[1],top,Math.max(top,H-bottom))];}
 const ease=f=>f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;
 // 模式の経過を t で補間する（区間ごとに緩急を付ける）。
 function at(path,t){if(!path?.length)return null;if(t<=path[0][0])return [path[0][1],path[0][2]];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(t<=b[0]){const f=ease((t-a[0])/Math.max(1e-6,b[0]-a[0]));return [a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];}}const l=path.at(-1);return [l[1],l[2]];}
 const centroid=ps=>ps.length?[ps.reduce((s,p)=>s+p[0],0)/ps.length,ps.reduce((s,p)=>s+p[1],0)/ps.length]:null;
 /* sc：合戦、base：位置の記録がある隊の画面座標 Map(id→[x,y])、W,H：画面の大きさ、home(side)：その陣営の本拠の画面座標、
    sourced：史料の動きがある隊の id 集合。返り値 pos(id,t) は推定の隊だけ座標を返し、それ以外は null。 */
 function plan(sc,base,W,H,home,sourced=new Set()){
  const units=sc.units.filter(u=>u.path?.length),start=u=>[u.path[0][1],u.path[0][2]];
  const sideUnits=s=>units.filter(u=>u.side===s);
  const sA=centroid(sideUnits('a').map(start)),sB=centroid(sideUnits('b').map(start));
  const gA=centroid(sc.units.filter(u=>u.side==='a'&&base.has(u.id)).map(u=>base.get(u.id))),gB=centroid(sc.units.filter(u=>u.side==='b'&&base.has(u.id)).map(u=>base.get(u.id)));
  const out={pos:()=>null,estimated:new Set(),placed:new Set(),basis:'none'};
  if(!sA||!sB||(!gA&&!gB))return generic(sc,base,W,H,home,sourced,out);
  const axS=[sB[0]-sA[0],sB[1]-sA[1]],lenS=Math.hypot(...axS);if(lenS<1e-3)return generic(sc,base,W,H,home,sourced,out);
  let axG,scale,anchorG,anchorS;
  if(gA&&gB&&Math.hypot(gB[0]-gA[0],gB[1]-gA[1])>8){axG=[gB[0]-gA[0],gB[1]-gA[1]];scale=Math.hypot(...axG)/lenS;out.basis='both-sides';anchorG=null;}
  else{
   // 片側だけ位置が分かる：相手は本拠の方角から来たとみなし、模式の両陣の間隔を画面幅の約4割に合わせる。
   const known=gA?'a':'b',other=known==='a'?'b':'a',kG=known==='a'?gA:gB,h=home(other);
   let dir=h?[kG[0]-h[0],kG[1]-h[1]]:null;if(!dir||Math.hypot(...dir)<1)dir=known==='a'?[-axS[0],-axS[1]]:axS;
   // dir は「相手から既知側へ」の向き。軸は a→b なので、既知側が b なら dir のまま、a なら反転。
   axG=known==='b'?dir:[-dir[0],-dir[1]];scale=Math.min(W,H)*.42/lenS;out.basis='one-side:'+known;anchorG=kG;anchorS=known==='a'?sA:sB;
  }
  scale=clamp(scale,Math.min(W,H)*.15,Math.min(W,H)*1.6);
  const th=Math.atan2(axG[1],axG[0])-Math.atan2(axS[1],axS[0]),c=Math.cos(th),s=Math.sin(th);
  const rot=v=>[(v[0]*c-v[1]*s)*scale,(v[0]*s+v[1]*c)*scale];
  const maxShift=Math.min(W,H)*.32,margin=24;
  const fit=p=>[clamp(p[0],margin,W-margin),clamp(p[1],margin,H-margin-30)];
  const byId=new Map(units.map(u=>[u.id,u]));
  for(const u of units){if(sourced.has(u.id))continue;if(base.has(u.id)){if(u.path.length>1)out.estimated.add(u.id);}else if(anchorG){out.estimated.add(u.id);out.placed.add(u.id);}}
  const gen=generic(sc,base,W,H,home,sourced,{pos:()=>null,estimated:new Set(),placed:new Set(),basis:''},out.estimated);for(const id of gen.estimated)out.estimated.add(id);for(const id of gen.placed)out.placed.add(id);
  out.pos=(id,t)=>{if(gen.estimated.has(id))return gen.pos(id,t);const u=byId.get(id);if(!u||!out.estimated.has(id))return null;const p=at(u.path,t);
   if(base.has(id)){const b=base.get(id),d=rot([p[0]-u.path[0][1],p[1]-u.path[0][2]]),m=Math.hypot(...d),k=m>maxShift?maxShift/m:1;return fit([b[0]+d[0]*k,b[1]+d[1]*k]);}
   const d=rot([p[0]-anchorS[0],p[1]-anchorS[1]]);return fitPlacement([anchorG[0]+d[0],anchorG[1]+d[1]],W,H);};
  return out;
 }
 /* 模式の経過がない隊の汎用の動き。位置の分かる隊は交戦の間に最寄りの敵へ3割ほど詰め、押し合い、退却・討死の時刻に従う。
    位置の記録がない側は、本拠の方角から相手の陣を半円に囲むように寄せる（攻め口・持場の推定）。 */
 function generic(sc,base,W,H,home,sourced,out,skip=new Set()){
  const S=Math.min(W,H),beats=sc.beats||[],firstClash=(beats.find(b=>b[2]?.length)||[])[0],t0=firstClash!=null?Math.max(4,firstClash-12):12,t1=t0+22;
  const mention=id=>{const b=beats.find(b=>b[2]?.includes(id));return b?b[0]:null;};
  const side=u=>u.side,enemyOf=s=>s==='a'?'b':'a';
  const located=sc.units.filter(u=>base.has(u.id)),bySide=s=>located.filter(u=>side(u)===s);
  const fit=p=>[clamp(p[0],24,W-24),clamp(p[1],24,H-54)];
  const plans=new Map();
  for(const u of located){if(sourced.has(u.id)||skip.has(u.id))continue;const b=base.get(u.id),foes=bySide(enemyOf(side(u)));if(!foes.length)continue;
   const tgt=foes.map(f=>base.get(f.id)).sort((p,q)=>Math.hypot(p[0]-b[0],p[1]-b[1])-Math.hypot(q[0]-b[0],q[1]-b[1]))[0],d=[tgt[0]-b[0],tgt[1]-b[1]],L=Math.hypot(...d);if(L<4)continue;
   const reach=Math.min(L*.32,S*.14),dir=[d[0]/L,d[1]/L],m=mention(u.id),ts=m!=null?Math.max(0,m-10):t0,te=m!=null?m+2:t1,seed=u.id.length*7+u.id.charCodeAt(u.id.length-1);
   plans.set(u.id,{b,dir,reach,ts,te,seed});}
  // 位置の記録がない隊：相手の陣（位置の分かる側の重心）を、本拠の方角から半円に囲む。
  for(const s of ['a','b']){const own=sc.units.filter(u=>side(u)===s&&!base.has(u.id)&&!sourced.has(u.id)&&!skip.has(u.id)&&!(u.path?.length>1));const foes=bySide(enemyOf(s));if(!own.length||!foes.length||bySide(s).length)continue;
   const c=[foes.reduce((n,f)=>n+base.get(f.id)[0],0)/foes.length,foes.reduce((n,f)=>n+base.get(f.id)[1],0)/foes.length],h=home(s);let dir=h?[h[0]-c[0],h[1]-c[1]]:[s==='a'?-1:1,0];const L=Math.hypot(...dir)||1;dir=[dir[0]/L,dir[1]/L];
   const base0=Math.atan2(dir[1],dir[0]),n=own.length;
   own.forEach((u,i)=>{const ang=base0+(n>1?(i/(n-1)-.5)*Math.PI*.9:0);plans.set(u.id,{ring:true,c,ang,r0:S*.3,r1:S*.07+i%2*S*.025,ts:t0,te:t1,seed:i*13+5});out.placed.add(u.id);});}
  for(const id of plans.keys())out.estimated.add(id);
  const units=new Map(sc.units.map(u=>[u.id,u]));
  out.pos=(id,t)=>{const p=plans.get(id);if(!p)return null;const u=units.get(id),f=ease(clamp((t-p.ts)/Math.max(1,p.te-p.ts),0,1)),stop=Math.min(u.die??101,u.rout??101),wob=t>p.te&&t<stop?Math.sin(t*.9+p.seed)*S*.008:0;
   if(p.ring){const r=p.r0+(p.r1-p.r0)*f-wob,back=u.rout!=null&&t>u.rout?ease(clamp((t-u.rout)/14,0,1))*S*.2:0;return fitPlacement([p.c[0]+Math.cos(p.ang)*(r+back),p.c[1]+Math.sin(p.ang)*(r+back)],W,H);}
   let k=p.reach*f+wob;if(u.die!=null&&t>=u.die)k=p.reach*ease(clamp((u.die-p.ts)/Math.max(1,p.te-p.ts),0,1));
   let x=p.b[0]+p.dir[0]*k,y=p.b[1]+p.dir[1]*k;if(u.rout!=null&&t>u.rout&&!(u.die!=null&&t>=u.die)){const r=ease(clamp((t-u.rout)/14,0,1))*S*.16;x-=p.dir[0]*r;y-=p.dir[1]*r;}
   return fit([x,y]);};
  if(!out.basis)out.basis=plans.size?'generic':'none';
  return out;
 }
 return {plan,at,fitPlacement};
})();
