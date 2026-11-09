"use strict";
/* 既存の史実観察の保存に残る、確認済みの不適用だけを補正する。 */
(function(){
 const canonical=k=>k==='uesugi'?'nagao':k;
 G.canonicalClanId=canonical;
 const normalize=value=>{if(typeof value==='string')return value.split('|').map(canonical).join('|');if(Array.isArray(value)){for(let i=0;i<value.length;i++)value[i]=normalize(value[i]);return value;}if(value&&typeof value==='object'){for(const key of Object.keys(value)){const next=key.split('|').map(canonical).join('|'),v=normalize(value[key]);if(next!==key){if(Object.hasOwn(value,next))throw Error('上杉家識別子の重複: '+key);delete value[key];}value[next]=v;}}return value;};
 const normalizeLegacyState=s=>{if(s?.clans?.uesugi&&!s.clans.nagao){const migrated=normalize(JSON.parse(JSON.stringify(s)));Object.assign(s,migrated);}};
 for(const sc of Object.values(TK.SCEN))normalize(sc);
 for(const e of TK.SHOW||[])normalize(e);
 TK.CHRON_DUPLICATES=[];
 let submission=null;TK.HIST=TK.HIST.filter(e=>{if(e.k!=='submit'||e.clan!=='hashiba'||e.b!=='nagao'||e.d.join('/')!=='1586/7/1')return true;if(!submission){submission=e;return true;}TK.CHRON_DUPLICATES.push({kept:submission.title,removed:e.title,date:e.d.slice(),reason:'同日の同じ上杉家の帰属を二重登録'});return false;});
 const version=2,known=new Set(['甲越同盟','上杉の羽柴への帰属','長尾の羽柴への帰属','池田輝政の吉田入封']);
 // 直前版が生成した保存だけを同定し、後日に訂正した没日の間を補正する。
 const legacyDeathSignature=()=>{
  const previous=new Map((TK.VERIFIED_DEATH_DATE_CHANGES||[]).map(r=>[r.name,r.previousDate]));
  const rows=TK.HIST.map(e=>({...e,d:e.k==='death'&&previous.has(e.n)?previous.get(e.n):e.d}));
  rows.sort((a,b)=>a.d[0]-b.d[0]||a.d[1]-b.d[1]||a.d[2]-b.d[2]);
  let hash=rows.length;for(const e of rows){const text=(e.title||e.k)+e.d.join('');for(let i=0;i<text.length;i++)hash=(hash*31+text.charCodeAt(i))|0;}return hash;
 };
 G.repairVerifiedDeathDates=function(s){
  if(!s||s.verifiedDeathDateRepair===1||!TK.HISTORY_ONLY||Object.values(s.div||{}).some(Boolean)||(s.arcs||[]).length||(s.altQ||[]).length||Object.keys(s.branches||{}).length)return;
  if(s.hsig!==legacyDeathSignature())return;
  for(const row of TK.VERIFIED_DEATH_DATE_CHANGES||[]){
   const old=G.evT({d:row.previousDate}),now=G.evT({d:row.date}),event=TK.HIST.find(e=>e.k==='death'&&e.n===row.name);
   if(s.t<old||s.t>=now)continue;
   const g=s.gens.find(g=>g.n===row.name);
   // 所在や部隊を創作しない。通常の史実観察で居城にいた人物に限定する。
   if(!g?.dead||g.unit!=null||g.tr||!s.castles[g.loc])continue;
   g.dead=false;
   const clan=s.clans[g.clan],successor=event.to&&s.gens.find(p=>p.n===event.to);
   if(clan&&successor&&clan.leader===successor.id)clan.leader=g.id;
   s.chron=(s.chron||[]).filter(e=>!(e.t===old&&e.who===row.name&&e.text===(event.text||'')));
   const message=(event.title?event.title+'：':'')+(event.text||'');
   if(message)s.log=(s.log||[]).filter(e=>!(e.t===old&&e.kind==='big'&&e.msg===message));
  }
  s.verifiedDeathDateRepair=1;
 };
 G.repairHistoricalChronology=function(s){
  if(!s||Object.keys(s.div||{}).length)return;
  normalizeLegacyState(s);
  G.repairVerifiedDeathDates(s);
  if(s.chronologyRepairVersion===version)return;
  const failed=new Set([...(s.hFail||[]).map(e=>e.title),...(s.chron||[]).filter(e=>!e.ok).map(e=>e.title)]);
  const grant=TK.HIST.find(e=>e.title==='池田輝政の吉田入封'),until=TK.HIST.find(e=>e.title==='東海道の城を家康へ');
  if(failed.has(grant.title)&&s.t>=G.evT(grant)&&s.t<G.evT(until)&&s.clans.ikeda&&!s.clans.ikeda.alive&&s.castles.yoshida.owner==='hashiba'){
   const cl=s.clans.ikeda,g=s.gens.find(g=>g.id===cl.leader);
   if(g&&!g.dead&&g.clan===null&&g.ronin){cl.alive=true;cl.cap='yoshida';s.castles.yoshida.owner='ikeda';g.clan='ikeda';g.ronin=false;g.loc='yoshida';if(s.player==='ikeda'){s.extinct=0;s.over=null;}}
  }
  if(failed.has('甲越同盟')){const pact=TK.ALLIANCE_HISTORY.find(r=>r.name==='甲越同盟');if(pact&&s.t>=G.evT({d:pact.from})&&s.t<=G.evT({d:pact.to})&&s.clans.takeda?.alive&&s.clans.nagao?.alive){const key=G.ekey('takeda','nagao');s.ally[key]=1e9;s.rel[key]=Math.max(s.rel[key]||0,80);}}
  if(failed.has('上杉の羽柴への帰属')){const e=TK.HIST.find(e=>e.title==='上杉の羽柴への帰属');if(e&&s.t>=G.evT(e)&&s.t<G.evT({d:[1600,7,1]})&&s.clans.nagao?.alive&&s.clans.hashiba?.alive){s.vassal={...(s.vassal||{}),nagao:'hashiba'};s.ally[G.ekey('nagao','hashiba')]=1e9;}}
  for(const e of s.chron||[]){const updated=TK.HIST.find(r=>r.title===e.title);if(updated?.text&&/反映|誤表示|未照合|表示用|修正/.test(e.text||''))e.text=updated.text;if(!known.has(e.title))continue;const current=TK.HIST.find(r=>r.title===e.title);if(current?.text)e.text=current.text;if(!e.ok){e.ok=true;s.hNg=Math.max(0,(s.hNg||0)-1);s.hOk=(s.hOk||0)+1;}}
  s.hFail=(s.hFail||[]).filter(e=>!known.has(e.title));const seen=new Set();s.chron=(s.chron||[]).filter(e=>{if(!['上杉の羽柴への帰属','長尾の羽柴への帰属'].includes(e.title))return true;e.title='上杉の羽柴への帰属';e.text='上杉景勝が秀吉に従う。';const key=e.title+'|'+e.t;if(seen.has(key)){s.hOk=Math.max(0,(s.hOk||0)-1);return false;}seen.add(key);return true;});s.chronologyRepairVersion=version;
 };
 const set=G.setS;G.setS=function(s){if(s&&!Object.keys(s.div||{}).length)normalizeLegacyState(s);const r=set(s);G.repairHistoricalChronology(s);return r;};
 const init=G.newGame;G.newGame=function(...a){a[1]=canonical(a[1]);const s=init(...a);const latest=TK.HIST.filter(e=>e.k==='cname'&&e.clan==='nagao'&&G.evT(e)<=s.t).at(-1);if(s.clans.nagao&&latest)s.cnm.nagao=latest.name;s.chronologyRepairVersion=version;return s;};
})();
