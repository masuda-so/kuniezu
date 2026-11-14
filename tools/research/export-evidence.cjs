/* RAG候補に実装データを混ぜて史実としない。確定した命題と実装の棚卸しを別保存。 */
const fs=require('node:fs'),crypto=require('node:crypto');const {G,TK}=require('../checks/history-focus.cjs').model();G.newGame('s1560','oda');const dir='data/research';fs.mkdirSync(dir,{recursive:true});
const jsonl=(file,rows)=>fs.writeFileSync(dir+'/'+file,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
const {facts,sources}=require('./evidence-store.cjs').loadEvidence({claimDir:dir+'/curated/claims',sourceDir:dir+'/curated/sources',baseSources:TK.RESEARCH_SOURCES,knownWaterKeys:require('./evidence-store.cjs').catalogWaterKeys('docs/work/catalog.jsonl')});
const locations=require('./location-store.cjs').loadLocations({root:dir+'/curated',sources});
jsonl('people.jsonl',locations.people);jsonl('places.jsonl',locations.places);jsonl('location-observations.jsonl',locations.locations);
jsonl('sources.jsonl',Object.entries(sources).map(([id,s])=>({id,...s,sourceType:s.sourceType||(/city\.|pref\.|museum|archives|ac\.jp|go\.jp|go\.kr|ac\.kr|\.gov\//.test(s.url||'')?'institutional':'other'),recordType:'source-metadata',verifiedScope:s.scope||null,retained:'bibliographic-metadata-and-paraphrased-claims'})));
jsonl('claims.jsonl',facts);
// 支配の記録（docs/designs/county-territory.md の PR 4）。0 件でも書く。
const control=require('./control-store.cjs').loadControl({controlDir:dir+'/curated/control',sources,claimIds:new Set(facts.map(f=>f.id)),placeIds:new Set(locations.places.map(p=>p.id)),clanKeys:new Set(Object.keys(TK.CLANS)),siteIds:require('./control-store.cjs').japanCastleKeys()});
for(const w of control.warnings)console.error('警告: '+w);
jsonl('control.jsonl',control.records);
jsonl('implemented-events.jsonl',TK.HIST.filter(e=>e.k!=='premarch').map((e,i)=>({id:'event:'+i,title:e.title||null,date:e.d,kind:e.k,clan:e.clan||null,castles:e.castles||[],people:['death','appear','rename','move','leave'].includes(e.k)?[].concat(e.n||(e.g?String(e.g).split('|')[0]:[])).filter(Boolean):[],sourceIds:e.sourceIds||[],sourceUrl:e.source||null,recordType:'implementation-record',status:'not-a-verified-historical-claim'})));
jsonl('implemented-sites.jsonl',[...G.CL.map(c=>({id:'node:'+c.id,name:c.n1,kind:'castle-node',point:[c.x/200/.809016994+129.2,41.75-c.y/200],roleBasis:'regional-management-node'})),...G.YOSHO.map(y=>({id:y.id,name:y.n,kind:y.kind,point:[y.x/200/.809016994+129.2,41.75-y.y/200],fromYear:y.y0||null,toYear:y.y1||null,activityPeriods:TK.SITE_ACTIVITY?.[y.id]||TK.SITE_ACTIVITY?.[y.n]||null,roleBasis:G.castleEvidence?.(y)?.role||TK.CASTLE_EVIDENCE[y.n]?.role||'castle-or-facility'}))].map(r=>({...r,recordType:'implementation-record',status:'position-and-period-require-separate-evidence'})));
// ゲームの武将（全シナリオの開始時と、年表で登場する人）。生年は比較値（ゲームの値、出典で確かめていない）。
{const people=new Map(),add=(name,born,first)=>{if(!name)return;const p=people.get(name)||{name,born:null,firstSeen:first};if(p.born==null&&Number.isFinite(born)&&born>0)p.born=born;people.set(name,p);};
 for(const sc of Object.keys(TK.SCEN).sort()){G.newGame(sc,'oda');for(const g of G.S().gens)add(g.n,g.born,sc);}
 // 年表で武将を生む所：appear の g と、newclan・death などの appear（ゲームの mkGen と同じく @ の配置を除く）。
 for(const e of TK.HIST)for(const str of [].concat(e.k==='appear'&&e.g?e.g:[],e.appear||[])){const [n,,,,,born]=String(str).split('@')[0].split('|');add(n,+born,e.k+':'+e.d.join('-'));}
 const renamed=new Map();for(const e of TK.HIST)if(e.k==='rename'&&e.n&&e.to)renamed.set(e.to,e.n);
 jsonl('implemented-people.jsonl',[...people.values()].sort((a,b)=>a.name<b.name?-1:1).map(p=>({id:'game-person:'+p.name,name:p.name,born:p.born,firstSeen:p.firstSeen,renamedFrom:renamed.get(p.name)||null,recordType:'implementation-record',status:'not-a-verified-historical-claim'})));
 G.newGame('s1560','oda');}
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.jsonl'));fs.writeFileSync(dir+'/manifest.json',JSON.stringify({date:new Date().toISOString().slice(0,10),version:4,curatedInputs:'curated/{claims,sources,people,places,locations,control}/*.json',scope:'日本・朝鮮・明の全施設・人物の網羅を証明するものではない。既存登録と確認済み史実命題を分離。',schema:{entity:'安定ID',predicate:'一命題',validYears:'史実の適用年代',source:'出典ID',locator:'該当箇所',gameBindings:'実装の参照先',activityPeriods:'実装上の稼働期間（開始年を含み終了年を含まない）。史実命題とは分離',status:'確定範囲'},files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(dir+'/'+file)).digest('hex')}))},null,2));console.log('exported',facts.length,'verified atomic claims,',control.records.length,'control records,',locations.locations.length,'location observations and',files.length,'JSONL files');
