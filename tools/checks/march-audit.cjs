/* 全期間の行軍を棚卸し。道筋の連結検査は、史料との一致を証明しない。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {G,TK}=require('./history-focus.cjs').model();
G.newGame('s1560','oda');G.S().player='__none';
const records=new Map(),rows=new Map(),issues=[],end=G.evT({d:[1615,12,1]});
function sample(){for(const u of G.documentedArmies?.()||[]){const p=G.historyPoint(u);assert.ok(p.slice(0,2).every(Number.isFinite));records.set(u.record.id,{title:u.until,commanders:u.commanders,troops:u.troops||null,sourceIds:u.record.source,position:G.historyPoint(u).slice(0,2),hasTravelPath:!!(u.record.track||u.record.stops),note:u.record.note});}
 for(const u of G.S().units){if(!u.hist||!u.until||u.until==='#hold')continue;
 const key=u.id+':'+u.until+':'+u.path.join('>');let r=rows.get(key);
 if(!r){r={title:u.until,commander:u.gens.map(id=>G.gen(id)?.n).filter(Boolean),troops:u.troops,clan:u.clan,path:u.path.map(id=>({id,name:G.cname(id)})),firstSeen:G.date(),scheduledArrival:u.schedule?.end!=null?G.date(u.schedule.end):null,
  roads:u.path.slice(1).map((b,i)=>{const e=G.EDGES[G.ekey(u.path[i],b)];assert.ok(e,'disconnected '+key);return {from:u.path[i],to:b,sea:e.sea,roads:e.roads||[],status:e.road?'街道データへの接続のみ確認・軍の通過史料は未照合':'軍の道筋未照合'};}),note:u.routeNote||'兵数は従来の配分値・目安を含む。全軍の実数とは扱わない。'};rows.set(key,r);}
 r.lastSeen=G.date();r.lastProgress={segment:u.seg,position:u.pos};
 if(!Number.isFinite(u.pos)||!Number.isFinite(u.troops))issues.push({title:u.until,kind:'invalid_number'});
}}
sample();let days=0;
while(G.S().t<end&&days++<21000){const previous=G.S().t;G.day();assert.ok(G.S().t>previous,'time stalled');sample();for(const q of ['evQ','sceneQ','battleQ','propQ','prisonQ'])G.S()[q]=[];}
assert.ok(G.S().t>=end);assert.equal(issues.length,0);
const covered=new Set([...rows.values()].map(r=>r.title));
const report={checked:'2026-10-31',period:'1560年5月〜1615年12月',scope:'実行中の経路・兵数・時点位置の棚卸し。行軍経路と在陣の位置表示を区別する。史料考証の完了率ではない',documentedPositions:[...records.values()],rows:[...rows.values()],
 battles:Object.keys(TK.BATTLES).map(title=>({title,marchObserved:covered.has(title)||[...records.values()].some(r=>r.title===title&&r.hasTravelPath),positionDisplay:[...records.values()].some(r=>r.title===title),status:[...records.values()].some(r=>r.title===title)?([...records.values()].find(r=>r.title===title).hasTravelPath?'出発・到着地を結ぶ概略表示。通過道は未復元':'在陣または事件当日の位置表示。出発地・経路は未復元'):covered.has(title)?'行軍表示あり・道筋と兵数は要史料照合':'独立した行軍表示を検出せず。守備・別戦線・欠落を要確認'})),issues};
fs.writeFileSync(path.resolve(__dirname,'../../data/audits/march-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS: '+days+' days; '+rows.size+' historical march records; '+covered.size+' event titles; no disconnected routes or invalid positions');
console.log('BATTLES_WITHOUT_MARCH',report.battles.filter(b=>!b.marchObserved).map(b=>b.title).join('・'));
