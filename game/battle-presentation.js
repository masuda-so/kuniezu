"use strict";
window.TKBattlePresentation={
 view(sc){
  if(sc.displayPolicy==='castle-reference')return {...sc,units:[],rain:null,fog:null,beats:(sc.beats||[]).map(b=>b.slice(0,2)),mapTitle:'城郭参考図'};
  if(sc.displayPolicy!=='site-map')return sc;
  const geo=[136.462,35.366,3.6],aspect=.68,p=G.PJ(geo[0],geo[1]),w=geo[2]*TKGEO.K/111.32,h=w*aspect;
  const ids=['mitsunari','kuroda','ieyasu','otani','shimazu','ukita','konishi'];
  const names=['石田三成','黒田長政','徳川家康','大谷吉継','島津義弘','宇喜多秀家','小西行長'];
  const units=(TK.BATTLE_SITES['関ヶ原の戦い']||[]).map((s,i)=>{const q=G.PJ(s.lon,s.lat),n=s.n.split('陣')[0];return {id:ids[i],n,g:names[i],side:[0,3,4,5,6].includes(i)?'b':'a',clan:s.clan,tr:0,arm:'yari',path:[[0,.5+(q[0]-p[0])/w,.5+(q[1]-p[1])/h]],role:'現在の陣跡標示・移動なし'};});
  return {...sc,geo,aspect,cartographic:true,units,feats:[],beats:(sc.beats||[]).map(b=>b.slice(0,2)),rain:null,fog:null,plan:false,mapTitle:'確認した陣跡の位置図',mapNote:'現在の陣跡と現代標高の比較'};
 },
 // 図のない合戦も経過の再生と自動終了を統一。戦闘座標や射線は作らない。
 record(cv,sc,opt){let t=0,speed=1,playing=false,ended=false,last=0,raf,beat=-1;
  const emit=()=>{opt.onProgress?.(t);const beats=(sc.beats||[]).filter(b=>b[0]<=t),b=beats.length-1;if(b!==beat){beat=b;opt.onBeat?.(b>=0?{t:beats[b][0],txt:beats[b][1]}:null);}};
  // 再生中だけ毎フレーム進める。止めている間・終了後はループを回さない（発熱の原因だった）。
  function step(now){raf=0;if(!playing){last=0;return;}if(last){t=Math.min(100,t+Math.min(.1,(now-last)/1000)*speed*100/(opt.dur||30));emit();if(t>=100){playing=false;ended=true;last=0;opt.onEnd?.();opt.onState?.();return;}}last=now;raf=requestAnimationFrame(step);}
  const run=()=>{if(!raf){last=0;raf=requestAnimationFrame(step);}};
  return {play(){if(t>=100)t=0;playing=true;ended=false;emit();run();opt.onState?.();},pause(){playing=false;opt.onState?.();},toggle(){playing?this.pause():this.play();},get playing(){return playing;},get t(){return t;},get ended(){return ended;},get speed(){return speed;},setSpeed(v){speed=v;opt.onState?.();},seek(v){t=Math.max(0,Math.min(100,v));ended=t>=100;emit();},unitStates(){return [];},select(){},toggleRoutes(){return false;},destroy(){playing=false;if(raf)cancelAnimationFrame(raf);raf=0;}};
 }
};
