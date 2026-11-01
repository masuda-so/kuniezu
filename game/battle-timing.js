"use strict";
/* 再生と年表の基準日、戦前出陣の大将、全合戦の要検証事項。 */
(function(){
function gregorianLunar(y,m,d){const row=TK.KOYOMI.m.find(r=>r[0]===y&&r[1]===m&&!r[2]);if(!row)throw Error('暦月不明');const dt=new Date((TK.KOYOMI.j0+row[3]+d-1-2440588)*86400000);return [dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate()];}
const gifu=TK.HIST.find(e=>e.title==='岐阜城の戦い');gifu.d=gregorianLunar(1600,8,23);gifu.source=TK.BATTLE_SOURCES.gifu.url;gifu.lunarDate=[1600,8,23];
const fushimi=TK.HIST.find(e=>e.title==='伏見城の戦い');
fushimi.marchWho='宇喜多秀家';fushimi.marchClan='ukita';fushimi.who='宇喜多秀家';fushimi.also=['小早川秀秋','島津義弘'];fushimi.kill=['鳥居元忠','内藤家長','内藤元長','松平家忠','松平近正'];
fushimi.text='西軍が木幡山の伏見城を攻め、旧暦8月1日に落城した。鳥居元忠・内藤家長父子・松平家忠らが戦死した。';
const se=TK.HIST.find(e=>e.title==='関ヶ原の戦い');se.also=[...new Set(TK.BATTLES[se.title].units.filter(u=>u.g!=='徳川家康'&&!/南宮山|不参戦/.test(u.role||'')).map(u=>u.g))];
for(const name of ['大津城の戦い','第二次上田合戦']){const ev=TK.HIST.find(e=>e.title===name);if(ev)ev.also=TK.BATTLES[name].units.filter(u=>u.side==='a'&&u.g!==ev.who).map(u=>u.g);}
const ueda=TK.HIST.find(e=>e.title==='第二次上田合戦');ueda.text='中山道を西上する徳川秀忠軍が、真田昌幸・信繁方の上田城と対峙する。';
const otsu=TK.HIST.find(e=>e.title==='大津城の戦い');otsu.d=gregorianLunar(1600,9,4);otsu.text='京極高次が大津城で籠城する。毛利元康・立花宗茂らの軍勢が攻城に向かう。';
const hasedo=TK.HIST.find(e=>e.title==='長谷堂城の戦い');if(hasedo)hasedo.d=gregorianLunar(1600,9,15);if(hasedo)hasedo.text='上杉方の直江兼続と最上方が出羽で戦う。長谷堂城の攻防と撤退は関ヶ原決戦とその敗報の後まで続くため、開始時点で撤退済みとは扱わない。';
// 一つの場面で始まりと結末を同日と表示しない。
Object.assign(TK.BATTLES['大津城の戦い'],{date:'慶長5年9月4日～15日（1600年10月10日～21日）',eventDate:[1600,10,21],calendar:[[0,'9月4日・籠城開始'],[70,'城内の攻防'],[100,'9月15日・開城'] ]});
Object.assign(TK.BATTLES['第二次上田合戦'],{date:'慶長5年9月・関ヶ原決戦前（1600年10月）',eventDate:[1600,10,21],replayBasis:'関ヶ原決戦日を区切りに振り返る表示です。上田の終戦日をこの日とするものではありません。',calendar:[[0,'9月上旬・上田方面'],[40,'上田で対峙'],[100,'秀忠軍は西へ・本戦には間に合わず']]});
Object.assign(TK.BATTLES['田辺城の戦い'],{date:'慶長5年7月～9月（1600年8月～10月）',calendar:[[0,'籠城開始'],[50,'包囲が続く'],[100,'勅命による和議・開城']]});
Object.assign(TK.BATTLES['長谷堂城の戦い'],{date:'慶長5年9月中旬～10月1日頃（1600年10月～11月）',replayBasis:'開始と撤退は概略の時点です。日別の全行動は未照合です。',calendar:[[0,'9月中旬・長谷堂への進攻'],[50,'長谷堂の攻防'],[100,'10月1日・西軍敗報後の撤退']],eventDate:gregorianLunar(1600,10,1)});
for(const title of ['第二次上田合戦','大津城の戦い','長谷堂城の戦い']){const ev=TK.HIST.find(e=>e.title===title),end=TK.BATTLES[title].eventDate;ev.hold=(end[0]-ev.d[0])*360+(end[1]-ev.d[1])*30+end[2]-ev.d[2];}
TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);
const catalog=G.buildBattleCatalog;
G.buildBattleCatalog=function(){catalog();TK.BATTLE_AUDIT=[];
 for(const [title,b] of Object.entries(TK.BATTLES)){
  b.beats.sort((a,b)=>a[0]-b[0]);const ev=TK.HIST.find(e=>e.title===title&&e.k!=='premarch');b.eventDate=b.eventDate||ev?.d?.slice();b.date=b.date||b.eventDate?.join('/')||'日付未確認';
  // 兵数を二重加算せず、従来の「A・B」一駒を人物名ごとに分ける。
  if(b.layoutStatus==='unresearched'&&!b._expanded){b._expanded=true;b.calendar=[[0,'参加勢力の比較（経過未復元）'],[100,'比較表示・終了']];const units=[];for(const old of b.units){const names=(old.g||old.n).split(/[・、]/).map(n=>n.trim()).filter(Boolean);names.forEach((n,i)=>units.push({...old,id:old.id+'-'+i,n,g:n,tr:names.length>1?0:old.tr,role:names.length>1?'個別兵数・配置未確認':'配置未確認',path:[[0,old.side==='a'?.27:.73,.2+(i+1)*.6/(names.length+1)]]}));}b.units=units;
   const match=title.match(/^(.+城)(?:の戦い|落城|開城)/);if(match&&!b.feats.some(f=>f.k==='castle'))b.feats.push({k:'castle',n:match[1]+'（位置・縄張未考証）',x:.5,y:.4,s:2});
  }
  const issues=[];if(!b.sources?.length)issues.push('個別の出典本文・頁が未照合');if(b.layoutStatus!=='sourced-schematic')issues.push('地形・城郭・全参加者の復元が未完了');else issues.push('概略配置。測量図・正確な移動時刻は未復元');
  for(const un of b.units){if(!un.role)un.role='配置・行動は模式化';let prev=-Infinity;for(const p of un.path||[]){if(p[0]<prev)issues.push('経路の時刻逆転:'+un.id);prev=p[0];}}
  b.audit=issues;TK.BATTLE_AUDIT.push({title,eventDate:b.eventDate||null,units:b.units.length,sourceIds:b.sources||[],issues});
 }
};
G.historicalGarrison=function(id){const s=G.S();if(id!=='kyo'||s.div?.tokugawa||s.div?.ishida||s.castles.kyo.owner!=='tokugawa')return null;const t=s.t;if(t<G.evT({d:[1600,7,1]})||t>=G.evT(fushimi))return null;return ['鳥居元忠','内藤家長','内藤元長','松平家忠','松平近正'];};
// 城の移転を記す take は史実の日に決着。別ルートでは通常の戦闘を続ける。
G.resolveHistoricalTake=function(ev,k){const s=G.S();return ev.k==='take'&&!ev.alt&&!ev.hold&&s.clans[k]?.alive&&!s.div[k]&&(ev.castles||[]).every(id=>s.castles[id]&&!s.div[s.castles[id].owner])&&!(ev.also||[]).some(n=>s.div[G.genByName(n)?.clan]);};
G.canReplayBattle=function(ev,b){const s=G.S();return ![ev.clan,b.sides.a.clan,b.sides.b.clan,...b.units.map(u=>u.clan),...b.units.map(u=>G.genByName(u.g)?.clan)].some(k=>k&&s.div[k]);};
const hist=G.hist;
G.hist=function(){const s=G.S();hist();
 for(const [title,b] of Object.entries(TK.BATTLES)){if(!b.eventDate)continue;const t=G.evT({d:b.eventDate});if(s.t!==t)continue;
 const ev=TK.HIST.find(e=>e.title===title&&e.k!=='premarch');if(!ev||G.evT(ev)>=t||s.cancel?.[title]||G.arcBlocked(ev))continue;
 if(!G.canReplayBattle(ev,b))continue;
 s.sceneQ=s.sceneQ||[];if(!s.sceneQ.some(q=>(typeof q==='string'?q:q.title)===title))s.sceneQ.push({title,t:s.t});
 }
};
})();
