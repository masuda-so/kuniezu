/* 網羅的な棚卸し。構造検査の合格を史実の裏付けと扱わない。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const {TK,G}=require('./history-focus.cjs').model();const issues=[],people=new Map();
function person(str,where){if(typeof str!=='string')return;const p=str.split('|'),name=p[0];if(!name)return;const birth=p.length>=6?parseInt(p[5],10):null;
 if(!people.has(name))people.set(name,{name,birthYear:Number.isFinite(birth)?birth:null,deathYear:TK.DEATH_Y?.[name]||null,status:'unverified',sources:[],recordLocations:[],birthYearVariants:[]});
 const r=people.get(name);r.recordLocations.push(where);if(Number.isFinite(birth)&&!r.birthYearVariants.includes(birth))r.birthYearVariants.push(birth);if(r.birthYear==null&&Number.isFinite(birth))r.birthYear=birth;
}
for(const sc of Object.values(TK.SCEN))for(const [at,group] of Object.entries(sc.gens||{}))for(const str of group)person(str,'scenario:'+sc.id+':'+at);
for(const e of TK.HIST){if(e.g)person(e.g,'event:'+e.title+':'+e.d.join('/'));for(const s of e.appear||[])person(s,'event:'+e.title+':'+e.d.join('/'));for(const s of e.gens||[])person(s,'event:'+e.title+':'+e.d.join('/'));}
for(const p of people.values())if(p.birthYearVariants.length>1)issues.push({kind:'conflicting_birth_years',name:p.name,years:p.birthYearVariants});
for(const p of people.values())if(p.birthYear&&p.deathYear&&p.birthYear>p.deathYear)issues.push({kind:'birth_after_death',...p});
const facilities=TK.YOSHO.map(y=>({name:y[0],kind:y[1],description:y[4],startYear:y[5],endYear:y[6],status:TK.CASTLE_EVIDENCE?.[y[0]]?'partially_verified':'unverified',evidence:TK.CASTLE_EVIDENCE?.[y[0]]||null}));
const events=TK.HIST.filter(e=>e.k!=='premarch').map(e=>({title:e.title||'',kind:e.k,date:e.d,person:e.who||e.n||'',status:e.evidenceStatus||'unverified',source:e.source||'',battleSource:TK.BATTLES[e.title]?.src||''}));
const battles=Object.entries(TK.BATTLES).map(([title,b])=>{const ids=new Set(b.units.map(u=>u.id));for(const beat of b.beats||[])for(const id of beat[2]||[])if(!ids.has(id))issues.push({kind:'missing_battle_unit',title,id});return {title,layoutStatus:b.layoutStatus,source:b.src||'',sourceLinks:(b.sources||[]).map(id=>(TK.RESEARCH_SOURCES?.[id]||TK.BATTLE_SOURCES[id])),review:b.audit||[],units:b.units.length,features:b.feats.length};});
const scenarios=[];for(const id of Object.keys(TK.SCEN)){G.newGame(id,'oda');const S=G.S();scenarios.push({id,date:G.date(),territoryNodes:G.CL.map(c=>({castle:G.cname(c.id),owner:S.castles[c.id].owner,capital:S.clans[S.castles[c.id].owner]?.cap===c.id,status:'territory_and_historical_role_unverified'}))});for(const g of S.gens)if(g.born>G.date().y&&!g.dead)issues.push({kind:'person_not_yet_born',scenario:id,name:g.n,birth:g.born,year:G.date().y});}
const report={checkedAt:'2026-10-31',scope:'structure_and_source_inventory; not full historical verification',counts:{events:events.length,people:people.size,facilities:facilities.length,battles:battles.length,forks:TK.FORKS.length,fictionalIncidents:TK.INCIDENTS.length,issues:issues.length},issues,events,people:[...people.values()],facilities,battles,scenarios};
fs.writeFileSync(path.join(root,'data/audits/history-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.counts,null,2));console.log('Wrote data/audits/history-audit.json; unverified entries remain explicitly unverified.');
