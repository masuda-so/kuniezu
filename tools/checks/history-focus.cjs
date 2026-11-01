/* 現行の読み込み順で史実専用版を検証。サーバーの操作はしない。 */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
function model(){const c=vm.createContext({console});c.window=c;const html=fs.readFileSync(path.join(root,'game/index.html'),'utf8');
 for(const file of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1])){const src=fs.readFileSync(path.join(root,'game',file),'utf8');new vm.Script(src,{filename:file});if(!['ui.js','kb.js','bscene.js','terrain-tiles.js'].includes(file))vm.runInContext(src,c,{filename:file});}
 c.G.build();c.G.buildBattleCatalog();return c;
}
module.exports={model};
if(require.main===module){const {G,TK}=model();
 const clear=()=>{const s=G.S();s.evQ=[];s.sceneQ=[];s.battleQ=[];s.propQ=[];};
 const advance=d=>{const end=G.evT({d});while(G.S().t<end){G.day();clear();}};
 assert.equal(TK.HISTORY_ONLY,true);assert.equal(TK.FORKS.length,0);assert.equal(typeof G.altResolve,'function');
 G.newGame('s1560','oda');G.S().player='__none';
 const im=G.S().units.find(u=>u.clan==='imagawa');assert.equal(im.pos,0);assert.equal(im.state,'march');assert.deepEqual([G.date().y,G.date().m,G.date().d],Array.from(TK.lunarDate(1560,5,12)));
 advance(Array.from(TK.lunarDate(1560,5,12)));assert.equal(im.pos,0);advance(TK.lunarDate(1560,5,18));assert.equal(im.pos,1);assert.equal(im.state,'camp');assert.ok(G.historyPoint(im));
 assert.ok(!G.allied('oda','tokugawa'));advance([1561,5,16]);assert.ok(!G.allied('imagawa','tokugawa'));assert.ok(!G.S().vassal.tokugawa);
 advance([1562,2,16]);assert.ok(G.allied('oda','tokugawa'));assert.ok(!G.allied('imagawa','tokugawa'));
 console.log('PASS: Imagawa departs on registered day, arrives at Kutsukake; Ieyasu breaks with Imagawa before Kiyosu');
 // 1562年の状態から続け、甲州征伐前を検査する（s1582は征伐後の開始配置）。
 for(const [lunar,id] of [[[1582,2,14],'iida'],[[1582,3,2],'takato']]){const date=TK.lunarDate(...lunar),t=G.evT({d:date});while(G.S().t<t-1){G.day();clear();}assert.notEqual(G.S().castles[id].owner,'oda',id+' premature');G.day();clear();assert.equal(G.S().castles[id].owner,'oda');if(id==='iida')assert.notEqual(G.S().castles.takato.owner,'oda');}
 advance(TK.lunarDate(1582,3,11));assert.ok(G.S().gens.find(g=>g.n==='武田勝頼').dead);assert.equal(G.kyu().d,11);
 const yam=TK.HIST.find(e=>e.title==='山崎の戦い'&&e.k!=='premarch'),end=G.evT(yam);let seen=false;
 while(G.S().t<end){G.day();const u=G.S().units.find(u=>u.until==='山崎の戦い'&&u.gens.some(id=>G.gen(id)?.n==='羽柴秀吉'));if(u){seen=true;assert.ok(u.schedule);assert.ok(u.schedule.end<=end);}
  for(const q of G.S().sceneQ||[])assert.ok((q.title||q)!=='山崎の戦い'||G.S().t===end);clear();}
 assert.ok(seen,'Hideyoshi returns before Yamazaki');assert.equal(G.kyu().m,6);assert.equal(G.kyu().d,13);
 console.log('PASS: Kai campaign staged; victory dates follow lunar records; Hideyoshi return is scheduled before Yamazaki');
 const tanabe=TK.HIST.find(e=>e.title==='田辺城の戦い');assert.ok(tanabe);assert.ok(G.evT({d:TK.BATTLES[tanabe.title].eventDate})>G.evT(tanabe));assert.ok(!TK.HIST.find(e=>e.title==='信貴山城の戦い').text.includes('自爆した'));
 assert.ok(TK.ROADS.find(r=>r[0]==='東海道')[1].every(p=>p[0]>136.8),'Tokaido no longer duplicates Minoji to Ogaki');
 G.newGame('s1560','oda');const before=JSON.stringify(G.S());assert.equal(G.attackBranch('x').ok,false);G.launch('oda','kiyosu','gifu',[],5000,'attack');G.diverge('oda');assert.equal(JSON.stringify(G.S()),before);
 const alt=JSON.parse(before);alt.div.oda=1;assert.throws(()=>G.setS(alt),/非史実/);assert.equal(JSON.stringify(G.S()),before);
 const unit={food:10000,troops:5000,days:0},edge=Object.values(G.EDGES).find(e=>!e.sea);const good=G.marchFactors(unit,edge.a,edge.b),bad=G.marchFactors({...unit,food:0,days:60,troops:50000},edge.a,edge.b);assert.ok(bad.days>good.days);
 console.log('PASS: alternate actions unavailable, old divergent save rejected without mutation, logistics factors');
 for(const sid of Object.keys(TK.SCEN)){G.newGame(sid,'oda');G.S().player='__none';for(let i=0;i<720;i++){G.day();clear();const s=G.S();for(const u of s.units){assert.ok(Number.isFinite(u.pos),sid+' position');for(let j=1;j<u.path.length;j++)assert.ok(G.EDGES[G.ekey(u.path[j-1],u.path[j])],sid+' connected route');}assert.equal(s.evQ.length,0);}
  for(const c of Object.values(G.S().castles)){assert.ok(G.S().clans[c.owner]?.alive,sid+' owner');assert.ok(c.troops>=0&&Number.isFinite(c.troops));}console.log('PASS: '+sid+' 720 days');}
 const report={generated:'2026-10-31',title:'天下分け目の国絵図',battles:TK.BATTLE_AUDIT,roads:TK.ROAD_EVIDENCE,
  campaigns:TK.HIST.filter(e=>e.k!=='premarch'&&e.castles?.length>1).map(e=>({title:e.title||null,date:e.d,castles:e.castles,type:e.admin?'行政移転':e.peace?.length?'戦闘と開城が混在':'複数拠点の移転',status:e.source?'出典あり・個々の日付要照合':'個々の占領日未照合'})),
  armyNumbers:Object.entries(TK.BATTLE_TROOPS).map(([title,v])=>({title,a:v.a,b:v.b,status:v.certainty,source:v.sources||v.src})),
  sources:TK.RESEARCH_SOURCES};fs.writeFileSync(path.join(root,'data/audits/history-focus-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS: all registered battles, roads, multicapture events and troop totals audited to data/audits/history-focus-audit.json');
}
