"use strict";
/* 代表家紋。形の細部・旗の使用時期は家中でも異なるため、各隊の識別印として使う。 */
(function(){
 const aliases={nobukatsu:'oda',nobutaka:'oda',nagao:'uesugi'};TK.KAMON_IMAGES=new Map();
 G.armyCrestKey=u=>{const names=u.commanders||u.gens.map(id=>G.gen(id)?.n);return names.some(n=>/明智光秀/.test(n))&&/本能寺|山崎/.test(u.until||u.historyTitle||'')?'akechi':u.clan;};
 G.kamonKey=k=>aliases[k]||k;G.kamonRecord=k=>TK.KAMON_FILES[G.kamonKey(k)]||null;
 G.kamonImage=k=>TK.KAMON_IMAGES.get(G.kamonKey(k))||null;
 G.kamonDisplaySource=k=>G.kamonImage(k)?.displaySource||G.kamonRecord(k)?.src;
 function normalize(im){
  const scratch=document.createElement('canvas');scratch.width=scratch.height=512;const c=scratch.getContext('2d',{willReadFrequently:true}),scale=Math.min(512/im.naturalWidth,512/im.naturalHeight);
  c.drawImage(im,(512-im.naturalWidth*scale)/2,(512-im.naturalHeight*scale)/2,im.naturalWidth*scale,im.naturalHeight*scale);
  const pixels=c.getImageData(0,0,512,512).data;let x0=512,y0=512,x1=-1,y1=-1;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;if(pixels[i+3]<32||Math.min(pixels[i],pixels[i+1],pixels[i+2])>245)continue;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<x0)return im;
  const out=document.createElement('canvas');out.width=out.height=256;const d=out.getContext('2d'),w=x1-x0+1,h=y1-y0+1,s=236/Math.max(w,h);
  d.drawImage(scratch,x0,y0,w,h,(256-w*s)/2,(256-h*s)/2,w*s,h*s);out.displaySource=out.toDataURL();return out;
 }
 if(typeof Image!=='undefined')for(const [k,r]of Object.entries(TK.KAMON_FILES)){const im=new Image();im.onload=()=>{let display=im;try{display=normalize(im);}catch(_){}TK.KAMON_IMAGES.set(k,display);if(window.TKUI){TKUI.baseDirty=true;TKUI.api?.renderAll();}};im.src=r.src;}
 TK.PORTRAIT_ALIAS['島左近']='島清興';TK.PORTRAIT_ALIAS['島左近清興']='島清興';TK.PORTRAIT_ALIAS['島清興（左近）']='島清興';
 TK.EXTRA_PORTRAITS['島清興']={src:'portraits/島清興.jpg',crop:[300,410,250,250],size:[724,1052],source:'https://commons.wikimedia.org/wiki/File:Shima_Sakon.jpg',note:'落合芳幾による後世の浮世絵。生前の肖像ではない。'};
 const identity=G.armyIdentity;
 TK.RESEARCH_SOURCES.sanadaSplit={author:'上田市立博物館',title:'真田信之',url:'https://museum.umic.jp/jinbutu/data/053.html',locator:'1600年、信之は東軍、昌幸・信繁は西軍',accessed:'2026-11-01',scope:'家の系譜と、当該出陣の陣営を区別する。'};
 G.armyIdentity=function(u){const names=u.commanders||u.gens.map(id=>G.gen(id)?.n),y=G.date().y,base=identity(u);let command=u.commandClan||u.clan,name=base.name,color=base.color;
  if(names.some(n=>n==='明智光秀')&&/本能寺|山崎/.test(u.until||u.historyTitle||'')){command='akechi';name='明智勢';color='#347d9a';}
  else if(y===1600&&names.some(n=>/真田信幸|真田信之/.test(n))){command='tokugawa';name='徳川方・真田信幸隊';color=G.CC('tokugawa');}
  else if(y===1600&&/関ヶ原|上田|会津|小山/.test(u.until||'')){if(names.some(n=>/真田昌幸|真田信繁|石田三成|大谷吉継|宇喜多秀家|小西行長/.test(n))){command='ishida';color='#7650a2';name='西軍・'+names[0]+'隊';}else if(names.some(n=>/徳川|井伊直政|福島正則|黒田長政|藤堂高虎|細川忠興|池田輝政|浅野幸長|本多忠勝|山内一豊/.test(n))){command='tokugawa';color=G.CC('tokugawa');name='東軍・'+names[0]+'隊';}}
  return {...base,name,color,command,family:u.clan};
 };
})();
