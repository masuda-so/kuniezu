const assert=require('node:assert/strict'),{G,TK}=require('./history-focus.cjs').model();
const title='備中高松城の水攻め',name='羽柴秀吉';
G.newGame('s1582','oda');
const army=()=>G.S().units.find(u=>u.gens.some(id=>G.gen(id)?.n===name));
const u=army(),target=G.PJ(133.828068,34.686228);
assert.equal(u.until,'#hold');assert.equal(u.historyTitle,title);
assert.ok(Math.hypot(...G.historyPoint(u).slice(0,2).map((v,i)=>v-target[i]))<1e-6,'opening siege army is at Ishii, not Matsuyama');
const old=JSON.parse(JSON.stringify(G.S())),v=old.units.find(v=>v.id===u.id);old.movementGeometryVersion=17;delete v.historyTitle;
v.visualTravel.line[v.visualTravel.line.length-1]=[G.C.bmatsuyama.x,G.C.bmatsuyama.y];
const before={t:old.t,castles:JSON.stringify(old.castles),troops:v.troops};G.setS(old);
assert.equal(old.movementGeometryVersion,27);assert.equal(v.historyTitle,title);assert.equal(old.t,before.t);assert.equal(JSON.stringify(old.castles),before.castles);assert.equal(v.troops,before.troops);
assert.ok(Math.hypot(...G.historyPoint(v).slice(0,2).map((x,i)=>x-target[i]))<1e-6,'legacy camp destination migrated');
let maxJump=0,previous=G.personPoint(G.genByName(name)),seenYamazaki=false;
for(let day=0;day<30;day++){G.day();for(const q of ['evQ','sceneQ','battleQ','propQ'])G.S()[q]=[];const p=G.personPoint(G.genByName(name));maxJump=Math.max(maxJump,Math.hypot(p[0]-previous[0],p[1]-previous[1])*111.32/200);previous=p;const a=army();if(a?.until==='山崎の戦い')seenYamazaki=true;}
assert.ok(seenYamazaki);assert.ok(maxJump<75,'no one-day teleport above 75km: '+maxJump);
console.log(JSON.stringify({pass:true,opening:'旧暦1582年6月1日・石井山',legacyVersion:22,maxDailyKm:maxJump}));
