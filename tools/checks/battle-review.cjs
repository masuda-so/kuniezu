/* 全カタログの構造と、史実／分岐・表示位置の回帰を検査。史実の考証そのものを代替しない。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const {G,TK}=require('./history-focus.cjs').model();
const serialized=JSON.stringify(TK.BATTLES);G.buildBattleCatalog();assert.equal(JSON.stringify(TK.BATTLES),serialized,'catalog must be idempotent');
for(const [title,b] of Object.entries(TK.BATTLES)){
 const ids=new Set(b.units.map(u=>u.id));assert.equal(ids.size,b.units.length,title+' duplicate');
 for(const u of b.units){assert.ok(u.g||u.n,title+' name');assert.ok(['a','b'].includes(u.side));let t=-1;for(const p of u.path){assert.ok(p.every(Number.isFinite));assert.ok(p[0]>=t&&p[0]<=100,title+' path');t=p[0];}}
 let t=-1;for(const beat of b.beats||[]){assert.ok(beat[0]>=t&&beat[0]<=100,title+' beats');t=beat[0];for(const id of beat[2]||[])assert.ok(ids.has(id),title+' missing '+id);}
 for(const id of b.sources||[])assert.ok((TK.RESEARCH_SOURCES?.[id]||TK.BATTLE_SOURCES[id])?.url?.startsWith('https://'),title+' source');
}
console.log('PASS: '+Object.keys(TK.BATTLES).length+' battle IDs, names, paths, beats, sources and repeat catalog build');
const requested='毛利輝元・石田三成・毛利秀元・宇喜多秀家・大谷吉継・小西行長・島津義弘・長宗我部盛親・安国寺恵瓊・小早川秀秋・脇坂安治・朽木元綱・赤座直保・小川祐忠・吉川広家・真田昌幸・真田信繁・上杉景勝・直江兼続・本庄繁長・毛利元康・立花宗茂・小野木重次・織田信包・前田茂勝・織田秀信・徳川家康・松平忠吉・黒田長政・藤堂高虎・浅野幸長・井伊直政・本多忠勝・福島正則・細川忠興・織田長益・徳川秀忠・榊原康政・仙石秀久・真田信幸・最上義光・伊達政宗・結城秀康・京極高次・細川幽斎'.split('・');
const rows=TK.CAMPAIGN_API.rows(4);for(const n of requested)assert.equal(rows.filter(r=>r.name===n).length,1,n);
assert.equal(rows.find(r=>r.name==='小早川秀秋').side,'a');assert.equal(rows.find(r=>r.name==='吉川広家').side,'b');
for(const n of ['毛利輝元','徳川秀忠','京極高次','細川幽斎','上杉景勝','直江兼続','本庄繁長'])assert.ok(!TK.BATTLES['関ヶ原の戦い'].units.some(u=>u.g===n),n+' must be in separate theatre');
console.log('PASS: all '+requested.length+' requested commanders in '+rows.length+' campaign roster, defection versus collusion and separate theatres');
const {arrange}=require(path.join(root,'kuniezu/static/kuniezu/battle-layout.js'));
for(const count of [1,8,40,100]){const items=Array.from({length:count},(_,id)=>({id,x:500,y:350})),out=arrange(items);assert.equal(out.length,count);for(let i=0;i<out.length;i++){assert.equal(out[i].anchorX,500);for(let j=i+1;j<out.length;j++)assert.ok(Math.abs(out[i].x-out[j].x)>=96||Math.abs(out[i].y-out[j].y)>=44);}}
console.log('PASS: coincident armies remain individually laid out without changing anchor coordinates');
G.newGame('s1600','tokugawa');const f=TK.HIST.find(e=>e.title==='伏見城の戦い'&&e.k==='take');let s=G.S();s.t=G.evT(f)-1;G.hist();
assert.equal(s.castles.kyo.owner,'tokugawa');assert.equal(G.genByName('鳥居元忠').loc,'kyo');assert.equal(G.historicalGarrison('kyo').length,5);
s.t++;G.applyEv(f);assert.equal(s.castles.kyo.owner,'ishida');assert.ok(s.gens.find(g=>g.n==='鳥居元忠').dead);assert.equal(G.historicalGarrison('kyo'),null);assert.equal(s.sceneQ.at(-1).title,f.title);assert.equal(s.sceneQ.at(-1).t,s.t);
console.log('PASS: Fushimi defenders, dated fall, death and scene together');
G.newGame('s1600','tokugawa');s=G.S();const g=TK.HIST.find(e=>e.title==='岐阜城の戦い'&&e.k!=='premarch'),kd=G.kyu(G.evT(g));assert.equal(kd.m,8);assert.equal(kd.d,23);
const winter=TK.HIST.find(e=>e.title==='大坂冬の陣'&&e.k!=='premarch');s.sceneQ=[];s.t=G.evT(winter);G.chron(winter,true);assert.equal(s.sceneQ.length,0,'no premature full winter replay');s.t=G.evT({d:TK.BATTLES[winter.title].eventDate});s.hi=TK.HIST.length;G.hist();assert.ok(s.sceneQ.some(q=>q.title===winter.title));
console.log('PASS: lunar Gifu date and multi-day battle replay waits until end');

// A documented sequence must not silently become geographic deployment data.
const schematic=TK.BATTLES['木津川口の戦い'];assert.ok(schematic.atlasSchematic);assert.equal(schematic.atlasUnits.length,0);assert.ok(schematic.atlasGroups.every(g=>!g.point&&!g.dock));
assert.deepEqual(Array.from(schematic.units).filter(u=>u.side==='a').map(u=>u.g).sort(),['浅野長晟','池田忠雄','蜂須賀至鎮'].sort());
for(const unit of schematic.units){assert.equal(unit.tr,0);assert.ok(schematic.atlasSchematic.paths[unit.id]);}
for(const [time,count] of [[0,4],[40,4],[79.999,4],[80,3],[100,3]])assert.equal(schematic.units.filter(u=>G.battleUnitVisible(schematic,u,time)).length,count);
assert.equal(G.battleActiveUnits(schematic,40).filter(id=>schematic.units.find(u=>u.id===id)?.side==='a').length,1);
console.log('PASS: documented attack sequence stays separate from geographic coordinates and unknown troop counts');
