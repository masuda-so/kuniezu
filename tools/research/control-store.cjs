/* 支配の記録（data/research/curated/control/）の入力の検査。
   形は docs/designs/territory-control.md の「記録の単位」と「日付の幅」、対象と導出の置き換えは
   docs/designs/county-territory.md。導出（城ごとの区間）は史実 DB の書き出し（PR 6）が行い、ここでは行わない。
   照らす相手（出典・命題・場所・家・城）は引数で受け、ゲームを読み込まない。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

// 旧暦の表（宣明暦）だけを読む。KOYOMI.m は [年, 月, 閏(1), 朔日の j0 からの差]。
let koyomi=null;
function table(){
 if(koyomi)return koyomi;
 const c=vm.createContext({});c.window=c;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../kuniezu/static/kuniezu/koyomi.js'),'utf8'),c);
 const {j0,m}=c.TK.KOYOMI,rows=new Map();
 m.forEach((r,i)=>rows.set(r[0]+'-'+r[1]+'-'+r[2],{start:j0+r[3],days:i+1<m.length?m[i+1][3]-r[3]:null}));
 koyomi={rows,firstYear:m[0][0],lastYear:m[m.length-1][0]};return koyomi;
}
// 暦の表から年の両端を出せる最後の年（翌年の正月朔日が表にある年）。
const LAST_YEAR=1622;
function lunarJd(y,mo,d,leap=false){
 const t=table();if(!Number.isInteger(y)||y<t.firstYear||y>LAST_YEAR)throw Error('暦の表の外の年: '+y);
 const r=t.rows.get(y+'-'+mo+'-'+(leap?1:0));if(!r)throw Error(`暦の表に無い月: ${y}年${leap?'閏':''}${mo}月`);
 if(!Number.isInteger(d)||d<1||r.days==null||d>r.days)throw Error(`月の日数を超える日: ${y}年${leap?'閏':''}${mo}月${d}日`);
 return r.start+d-1;
}
const yearStart=y=>lunarJd(y,1,1),yearEnd=y=>{if(y+1>LAST_YEAR+1)throw Error('暦の表の外の年: '+y);return table().rows.get((y+1)+'-1-0').start-1;};

const POINT_KINDS={
 'dated-event':{fields:['date','leapMonth'],calendar:'Japanese-lunisolar',precision:'day'},
 'year-window':{fields:['year'],calendar:'Japanese-year',precision:'year'},
 'described-period':{fields:['label','indexYears','boundsAreHistoricalStartEnd'],calendar:'Japanese-era-description',precision:'period'},
};
const TIME_KEYS=new Set(['kind','calendar','precision','date','leapMonth','year','label','indexYears','boundsAreHistoricalStartEnd','from','to']);
function pointSpan(t,{endsOnly=false}={}){
 const spec=POINT_KINDS[t?.kind];
 if(!spec||endsOnly&&t.kind==='described-period')throw Error('未対応の日付の形: '+JSON.stringify(t?.kind));
 const allowed=new Set(['kind','calendar','precision',...spec.fields]);
 for(const k of Object.keys(t))if(TIME_KEYS.has(k)&&!allowed.has(k))throw Error(`日付の形 ${t.kind} に合わない項目: ${k}`);
 if(t.calendar!==spec.calendar||t.precision!==spec.precision)throw Error(`日付の暦・精度が形 ${t.kind} と合わない`);
 if(t.kind==='dated-event'){
  const d=t.date;if(!Array.isArray(d)||d.length!==3||!d.every(Number.isInteger)||typeof t.leapMonth!=='boolean')throw Error('旧暦の年月日・閏月の旗が不正');
  const jd=lunarJd(d[0],d[1],d[2],t.leapMonth);return {earliest:jd,latest:jd,year:d[0]};
 }
 if(t.kind==='year-window'){if(!Number.isInteger(t.year))throw Error('年が不正');return {earliest:yearStart(t.year),latest:yearEnd(t.year),year:t.year};}
 const y=t.indexYears;
 if(typeof t.label!=='string'||!t.label.trim()||t.boundsAreHistoricalStartEnd!==false||!Array.isArray(y)||y.length!==2||!y.every(Number.isInteger)||y[0]>y[1])throw Error('期間の呼び名が不正');
 return {earliest:yearStart(y[0]),latest:yearEnd(y[1]),year:y[0]};
}
// 日付の幅：最早日と最遅日（ユリウス通日、両端を含む）。year は id に使う最早日の年（旧暦の年）。
function span(time){
 if(!time||typeof time!=='object'||Array.isArray(time))throw Error('日付が必要');
 if(time.kind==='dated-components')throw Error('dated-components は受けない。年ごとに記録を分ける');
 if('from' in time||'to' in time){
  if(Object.keys(time).some(k=>k!=='from'&&k!=='to'))throw Error('期間は from と to だけを持つ');
  const a=pointSpan(time.from,{endsOnly:true}),b=pointSpan(time.to,{endsOnly:true});
  if(a.earliest>b.latest)throw Error('期間の始まりが終わりより後');
  return {earliest:a.earliest,latest:b.latest,year:a.year,period:true};
 }
 return {...pointSpan(time),period:false};
}

const VOCAB={
 type:['change','observation'],
 value:['held','contested','undetermined','not-applicable'],
 cause:['fall','surrender','handover','transfer','succession','construction','abandonment','allegiance'],
 dateKind:['event','order','entry','listing-only'],
 evidenceDepth:['kobun-heading','public-secondary-read','primary-text-read'],
};
const COMMON=['id','type','site','time','summary','checked','checkedBy','evidenceDepth','source','locator','alsoSources','claim','place','variantOf','uncertainty'];
const KEYS={change:new Set([...COMMON,'from','to','cause','dateKind']),observation:new Set([...COMMON,'value','holder','claimants','boundsAsserted','searched'])};
const text=v=>typeof v==='string'&&v.trim().length>0;
// 確かな観察：幅が 1 日の時点か、出典が両端を述べた期間。窓（それ以外）は根拠にしない。
const certain=r=>r.type==='observation'&&(r.span.period?r.boundsAsserted===true:r.span.earliest===r.span.latest);
const overlap=(a,b)=>a.span.earliest<=b.span.latest&&b.span.earliest<=a.span.latest;
// 記録の id からファイル名：control: を除き、: を _ に替える（城の鍵に : を含むものがあるため）。
const fileNameFor=id=>id.slice('control:'.length).replaceAll(':','_')+'.json';

function validateRecord(r,ctx){
 const fail=msg=>{throw Error(msg+': '+(r?.id||'(id なし)'));};
 if(!r||typeof r!=='object'||Array.isArray(r))fail('記録がオブジェクトでない');
 if(!VOCAB.type.includes(r.type))fail('type が change・observation でない');
 for(const k of Object.keys(r))if(!KEYS[r.type].has(k))fail('知らない項目 '+k);
 if(!text(r.site)||!ctx.siteIds.has(r.site))fail('site が日本の城の鍵（castle:<id>）でない');
 let s;try{s=span(r.time);}catch(e){fail('日付: '+e.message);}
 const m=/^control:(.+)-(\d{4})-(\d+)$/.exec(r.id||'');
 if(!m||m[1]!==r.site.slice('castle:'.length))fail('id が control:<城>-<最早日の年>-<連番> の形でない');
 if(Number(m[2])!==s.year)fail('id の年が日付の最早日の年と合わない');
 if(!text(r.summary))fail('summary が必要');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.checked||''))fail('checked は YYYY-MM-DD');
 if(!text(r.checkedBy))fail('checkedBy が必要');
 const clan=v=>typeof v==='string'&&v.startsWith('clan:')&&ctx.clanKeys.has(v.slice(5));
 const needsSource=!(r.type==='observation'&&r.value==='undetermined');
 if(needsSource){
  if(!VOCAB.evidenceDepth.includes(r.evidenceDepth))fail('evidenceDepth が語彙の外');
  if(!ctx.sources.has(r.source))fail('source が登録済みの出典でない');
  if(!text(r.locator))fail('locator が必要');
 }else if(r.source!==undefined||r.locator!==undefined||r.evidenceDepth!==undefined)fail('undetermined は searched を出典の代わりにする');
 if(r.alsoSources!==undefined&&(!Array.isArray(r.alsoSources)||!r.alsoSources.length||r.alsoSources.some(a=>!ctx.sources.has(a?.source)||!text(a?.locator)||Object.keys(a).some(k=>k!=='source'&&k!=='locator'))))fail('alsoSources は登録済みの出典と箇所の組の一覧');
 if(r.claim!==undefined&&!ctx.claimIds.has(r.claim))fail('claim が既存の命題でない');
 if(r.place!==undefined&&!ctx.placeIds.has(r.place))fail('place が登録済みの場所でない');
 if(r.uncertainty!==undefined&&!text(r.uncertainty))fail('uncertainty は文');
 if(r.variantOf!==undefined&&(!Array.isArray(r.variantOf)||!r.variantOf.length||r.variantOf.some(v=>!text(v)||v===r.id)))fail('variantOf は他の記録の id の一覧');
 if(r.type==='change'){
  if(s.period)fail('変化の日付は期間でなく時点');
  if(!(clan(r.from)||r.from==='unknown'||r.from==='none'))fail('from が家の ID・unknown・none でない');
  if(!(clan(r.to)||r.to==='none'))fail('to が家の ID・none でない');
  if(r.from===r.to)fail('from と to が同じ');
  if(!VOCAB.cause.includes(r.cause))fail('cause が語彙の外');
  if(!VOCAB.dateKind.includes(r.dateKind))fail('dateKind が語彙の外');
 }else{
  if(!VOCAB.value.includes(r.value))fail('value が語彙の外');
  if(r.value==='held'?!clan(r.holder):r.holder!==undefined)fail('holder は held のときだけ、家の ID');
  if(r.value==='contested'?!(Array.isArray(r.claimants)&&r.claimants.length>=2&&r.claimants.every(clan)&&new Set(r.claimants).size===r.claimants.length):r.claimants!==undefined)fail('claimants は contested のときだけ、2 つ以上の家の ID');
  if(s.period?typeof r.boundsAsserted!=='boolean':r.boundsAsserted!==undefined)fail('boundsAsserted は期間のときだけ必須');
  if(r.value==='undetermined'){
   if(!s.period||r.boundsAsserted!==true)fail('undetermined は期間で、boundsAsserted は true');
   if(!Array.isArray(r.searched)||!r.searched.length)fail('undetermined には searched が要る');
   for(const q of r.searched){
    if(!ctx.sources.has(q?.source)||!text(q.query)||!/^\d{4}-\d{2}-\d{2}$/.test(q.date||'')||!Array.isArray(q.years)||q.years.length!==2||!q.years.every(Number.isInteger)||q.years[0]>q.years[1]||Object.keys(q).some(k=>!['source','query','date','years'].includes(k)))fail('searched の要素は source・query・date・years');
   }
   const lo=Math.min(...r.searched.map(q=>q.years[0])),hi=Math.max(...r.searched.map(q=>q.years[1]));
   let cover;try{cover=[yearStart(lo),yearEnd(hi)];}catch(e){fail('searched の年: '+e.message);}
   if(s.earliest<cover[0]||s.latest>cover[1])fail('undetermined の期間が searched の覆う年代からはみ出す');
  }else if(r.searched!==undefined)fail('searched は undetermined のときだけ');
 }
 return {...r,span:{earliest:s.earliest,latest:s.latest,period:s.period}};
}

function sameResult(a,b){
 if(a.value!==b.value)return false;
 if(a.value==='held')return a.holder===b.holder;
 if(a.value==='contested')return [...a.claimants].sort().join()===[...b.claimants].sort().join();
 return true;
}
// 全件の間の決まり：id の重複、variantOf の相互性、拒む組み合わせ 2 種類、同じ日のつながらない変化（警告）。
function validateSet(rows){
 const byId=new Map(),warnings=[];
 for(const r of rows){if(byId.has(r.id))throw Error('id が重複: '+r.id);byId.set(r.id,r);}
 for(const r of rows)for(const v of r.variantOf||[]){
  const o=byId.get(v);if(!o)throw Error('variantOf の相手が無い: '+r.id+' → '+v);
  if(o.site!==r.site)throw Error('variantOf の相手が別の城: '+r.id+' → '+v);
  if(!(o.variantOf||[]).includes(r.id))throw Error('variantOf が片側だけ: '+r.id+' → '+v);
 }
 const variants=(a,b)=>(a.variantOf||[]).includes(b.id);
 const bySite=new Map();for(const r of rows){if(!bySite.has(r.site))bySite.set(r.site,[]);bySite.get(r.site).push(r);}
 for(const list of bySite.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
  const a=list[i],b=list[j];if(variants(a,b)||!overlap(a,b))continue;
  if(certain(a)&&certain(b)&&a.value!=='undetermined'&&b.value!=='undetermined'&&!sameResult(a,b))throw Error(`確かな観察が重なり結果が違う（直すか variantOf で結ぶ）: ${a.id} と ${b.id}`);
  for(const [u,o] of [[a,b],[b,a]]){
   if(u.type!=='observation'||u.value!=='undetermined')continue;
   if(o.type==='change'||certain(o)&&o.value!=='undetermined')throw Error(`undetermined の期間の中に分かっている日がある（期間をその日で切る）: ${u.id} と ${o.id}`);
  }
  if(a.type==='change'&&b.type==='change'&&a.span.earliest===a.span.latest&&b.span.earliest===b.span.latest&&a.span.earliest===b.span.earliest&&a.to!==b.from&&b.to!==a.from)warnings.push(`同じ日につながらない変化が 2 件: ${a.id} と ${b.id}`);
 }
 return warnings;
}

function readDir(dir){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort().map(n=>({r:JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),name:n}));
}
// records を直接渡すか（検査の固定の入力）、controlDir から読む。
function loadControl({controlDir,records,sources,claimIds=new Set(),placeIds=new Set(),clanKeys,siteIds}){
 const ctx={sources:sources instanceof Set?sources:new Set(Object.keys(sources||{})),claimIds,placeIds,clanKeys,siteIds};
 const input=records?records.map(r=>({r,name:null})):readDir(controlDir);
 const rows=input.map(({r,name})=>{
  const row=validateRecord(r,ctx);
  if(name&&name!==fileNameFor(r.id))throw Error(`ファイル名が id と合わない（${fileNameFor(r.id)} にする）: ${name}`);
  return row;
 }).sort((a,b)=>a.site<b.site?-1:a.site>b.site?1:a.span.earliest-b.span.earliest||(a.id<b.id?-1:1));
 return {records:rows,warnings:validateSet(rows)};
}
// 郡の形の属性から、日本の城の鍵の一覧（朝鮮の城は郡を持たないので入らない）。
function japanCastleKeys(file=path.join(__dirname,'../../kuniezu/map/admin/gun-shapes.geojson')){
 return new Set(JSON.parse(fs.readFileSync(file,'utf8')).features.flatMap(f=>f.properties.castles||[]));
}
module.exports={loadControl,span,lunarJd,fileNameFor,japanCastleKeys,LAST_YEAR};
