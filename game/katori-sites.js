"use strict";
/* 中世香取の海の周辺拠点。近世の建物を戦国期に先取りして描かない。 */
(function(){
 G.YOSHO_FX['社']={n:'神社',fx:'信仰・地域交流の拠点（軍事補正なし）'};G.YINC['社']=0;
 TK.RESEARCH_SOURCES.katoriShrines={author:'香取市・茨城大学図書館',title:'香取の海の中世史・常陸國絵図',url:'https://www.city.katori.lg.jp/culture_sport/bunkazai/isan/201-210.html',locator:'中世の内海と香取社の海夫。常陸國絵図の鹿嶋大明神の記載も比較。',scope:'寺社の存在と交通との関係。現存社殿の16世紀への遡及・神領境界・個別年代の軍事支配は示さない。',accessed:'2026-11-01'};
 for(const [name,lo,la,ref,desc] of [
 ['香取神宮',140.527725,35.886303,'120000196200','香取の海に関わる信仰・交通の拠点。海夫注文に水運拠点が現れる。現在の社殿の姿を1560年へ遡らせず、所在地の代表点を表示する。'],
 ['鹿島神宮',140.631517,35.968807,'080000180400','常陸一宮。古絵図では鹿嶋大明神と記される。現存の近世社殿を戦国期の建築として描かず、所在地の代表点を表示する。']]){
  if(TK.YOSHO.some(y=>y[0]===name))continue;TK.YOSHO.push([name,'社',lo,la,desc]);TK.SITE_STABLE_IDS[name]='yosho:'+name+':'+lo+':'+la;
  const record={kind:'facility',name,point:[lo,la],ref,url:'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/'+ref.slice(0,2)+'/'+ref+'.html'};TK.SITE_POSITION_EVIDENCE[name]=record;
  TK.CASTLE_EVIDENCE[name]={role:'地域の信仰・交流拠点',description:desc,source:record.url,checked:'2026-11-01'};
 }
})();
