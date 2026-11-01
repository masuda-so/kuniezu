/* 記録接続・長篠の包囲日・軍生成時の未経過時間を実年表で検査。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),{G,TK}=require('./history-focus.cjs').model();
G.newGame('s1560','oda');G.S().player='__none';G.auditVisualMoves=true;
const key=d=>[d.y,d.m,d.d].join('-'),checks=new Map([['1569-9-30','織田信長'],['1584-12-15','筒井定次']]),results=[];let nagashino=false;
const end=G.evT({d:[1584,12,16]});while(G.S().t<end){const date=G.date(G.S().t+1),name=checks.get(key(date)),g=name&&G.genByName(name);let before;if(g){G._visualSampleTime=G.S().t+1;before=G.personPoint(g);delete G._visualSampleTime;}G.day();for(const q of ['evQ','sceneQ','battleQ','propQ','prisonQ','observerQ'])G.S()[q]=[];
 if(g){const after=G.personPoint(g),km=Math.hypot(after[0]-before[0],after[1]-before[1])*111.32/200;assert.ok(km<1e-6,name+' transition');const u=G.S().units.find(u=>u.gens.includes(g.id));if(name==='筒井定次'){assert.equal(u.pos,0);assert.equal(u.days,0);}results.push({name,date,km,unitDays:u?.days});}
 if(key(G.date())===TK.lunarDate(1575,5,8).join('-')){const g=G.genByName('武田勝頼'),u=G.S().units.find(u=>u.gens.includes(g.id));assert.ok(u?.schedule,'Katsuyori has departed before siege');assert.ok(u.schedule.start<=u.schedule.end);assert.equal(u.schedule.end,G.evT({d:TK.lunarDate(1575,5,8)}));const p=G.historyPoint(u),q=G.battleArrivalPoint(u);assert.ok(Math.hypot(p[0]-q[0],p[1]-q[1])<1e-6);nagashino=true;results.push({name:g.n,date:G.date(),start:u.schedule.start,end:u.schedule.end});}
}
assert.ok(nagashino);fs.writeFileSync('data/audits/sortie-transitions-review.json',JSON.stringify({scope:'記録接続と包囲開始・生成初日の位置。途中経路と出発日の史実確定ではない。',results},null,2));console.log('PASS: Nobunaga record handoff, Katsuyori siege chronology, Tsutsui zero elapsed day at creation');
