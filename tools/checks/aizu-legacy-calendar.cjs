/* 実際の修正前3モジュールから保存を作り、変更した年表順序の移行を検査。 */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),c=vm.createContext({console});c.window=c;
for(const m of fs.readFileSync(path.join(root,'game/index.html'),'utf8').matchAll(/<script src="([^"?]+)(?:\?v=[0-9a-f]+)?"/g)){
 const file=m[1];if(['ui.js','kb.js','bscene.js','terrain-tiles.js'].includes(file))continue;
 const archived=path.join(root,'data/inputs/aizu-ieyasu-review/legacy-runtime',file),p=fs.existsSync(archived)?archived:path.join(root,'game',file);vm.runInContext(fs.readFileSync(p,'utf8'),c,{filename:file});
}
c.G.build();c.G.buildBattleCatalog();c.G.newGame('s1600','tokugawa');c.G.S().player='__none';const target=c.G.evT({d:c.TK.lunarDate(1600,7,23)});
while(c.G.S().t<target){c.G.day();for(const q of ['evQ','sceneQ','battleQ','propQ','observerQ'])c.G.S()[q]=[];}
const save=JSON.parse(JSON.stringify(c.G.S()));assert.equal(save.movementGeometryVersion,16);assert.ok(save.chron.some(e=>e.title==='小山評定'&&e.ok));assert.ok(save.sites.some(e=>e.n==='小山'));
const {G,TK}=require('./history-focus.cjs').model(),before={t:save.t,castles:JSON.stringify(save.castles)};G.setS(save);assert.equal(G.S().t,before.t);assert.equal(JSON.stringify(G.S().castles),before.castles);assert.ok(!G.S().sites.some(e=>['小山','下野'].includes(e.n)&&e.y===1600));const i=TK.HIST.findIndex(e=>e.title==='小山評定');assert.ok(i>=G.S().hi,'corrected meeting still lies in the future');
const end=G.evT({d:TK.lunarDate(1600,7,25)});while(G.S().t<end){G.day();for(const q of ['evQ','sceneQ','battleQ','propQ','observerQ'])G.S()[q]=[];}
const meetings=G.S().chron.filter(e=>e.title==='小山評定'&&e.ok);assert.equal(meetings.length,1,'no duplicate legacy meeting');assert.equal(meetings[0].t,end);assert.ok(!G.S().sites.some(e=>['小山','下野'].includes(e.n)&&e.y===1600));
fs.writeFileSync(path.join(root,'data/audits/aizu-legacy-calendar-review.json'),JSON.stringify({legacyVersion:16,currentVersion:G.S().movementGeometryVersion,loadedDayPreserved:true,territoriesPreserved:true,falseBattleMarkersRemoved:true,meetingEntries:meetings.length,meetingDate:G.date()},null,2)+'\n');console.log('PASS: real version-16 calendar/army save migrates; false battle sites removed; corrected Oyama meeting stays unique');
