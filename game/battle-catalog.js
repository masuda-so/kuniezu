"use strict";
/* 合戦ごとに表示方式を変えず、未考証の配置は未考証と表示する。 */
(function(){
 G.buildBattleCatalog=function(){for(const ev of TK.HIST){const T=TK.BATTLE_TROOPS?.[ev.title];if(!T||T.skip||TK.BATTLES[ev.title])continue;
  const sides={},units=[];for(const [side,x,px] of [['a',T.a,.27],['b',T.b,.73]]){if(!x)continue;const lead=String(x.lead||'大将未確認'),clan=Object.keys(TK.CLANS).find(k=>TK.CLANS[k][0]===lead.replace(/家.*/,''))||(side==='a'?ev.clan:'')||'unknown';sides[side]={clan,n:side==='a'?'軍勢A（配置未考証）':'軍勢B（配置未考証）',tr:x.tr?'約'+x.tr.toLocaleString():'不明'};units.push({id:side,side,clan,n:lead,g:lead,tr:x.tr||0,arm:'yari',path:[[0,px,.5]]});}
  if(!sides.a)sides.a={clan:'unknown',n:'攻め手',tr:'不明'};if(!sides.b)sides.b={clan:'unknown',n:'守り手',tr:'不明'};
  TK.BATTLES[ev.title]={date:ev.d.join('/'),place:ev.site||'',at:ev.at||ev.castles?.[0],sides,units,feats:[],beats:[[0,ev.text||'']],layoutStatus:'unresearched',src:T.src||'個別出典未確認'};
 }
 for(const sc of Object.values(TK.BATTLES))sc.layoutStatus=sc.layoutStatus||'schematic';};
})();
