/* 合戦の対象家・移転地・地形データ・密集駒の不具合を検査。起動不要。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {G,TK,TKLayout}=require('./history-focus.cjs').model();
const battles=Object.entries(TK.BATTLES);
assert.equal(battles.length,111);
for(const [title,b] of battles){
 assert.ok(Array.isArray(b.participantClans),title+' participation');
 for(const k of b.participantClans)assert.ok(TK.CLANS[k],title+' unknown faction '+k);
 const m=TK.BATTLE_ATLAS[title],d=JSON.parse(fs.readFileSync(path.join(__dirname,'../../game/atlas',m.file)));
 assert.equal(d.title,title);assert.equal(Buffer.from(d.heights,'base64').length,d.width*d.height*2);
 assert.ok(d.bounds[0]<d.bounds[2]&&d.bounds[1]>d.bounds[3]);
 for(const p of d.points)assert.ok(p.lon>=d.bounds[0]&&p.lon<=d.bounds[2]&&p.lat<=d.bounds[1]&&p.lat>=d.bounds[3]);
}
G.newGame('s1560','hojo');assert.equal(G.S().settings.scenes,'mine');
assert.equal(G.sceneIsRelevant(TK.BATTLES['桶狭間の戦い'],'hojo'),false);
assert.equal(G.sceneIsRelevant(TK.BATTLES['桶狭間の戦い'],'imagawa'),true);
for(const title of ['小田原城の戦い','第二次国府台合戦','三増峠の戦い','小田原征伐','韮山城の戦い'])assert.equal(G.sceneIsRelevant(TK.BATTLES[title],'hojo'),true,title);
assert.equal(G.sceneIsRelevant(TK.BATTLES['桶狭間の戦い'],null),false);
assert.equal(G.sceneIsRelevant(TK.BATTLES['桶狭間の戦い'],'__none'),false);
const old=JSON.parse(JSON.stringify(G.S()));delete old.settings.scenePolicyVersion;old.settings.scenes='all';G.setS(old);assert.equal(G.S().settings.scenes,'mine');
G.S().settings.scenes='all';G.setS(G.S());assert.equal(G.S().settings.scenes,'all');
const honno=TK.BATTLE_ATLAS['本能寺の変'].points;assert.equal(honno.length,1);assert.ok(honno[0].lon<135.76,'modern relocated temple must not be used');assert.equal(honno[0].source,'honnojiOldSite');
assert.equal(TK.BATTLES['関ヶ原の戦い'].units.filter(u=>/戸田(勝成|重政)/.test(u.g||u.n)).length,1);
const kizugawaTitle='木津川口の戦い';
const kizugawa=TK.BATTLES[kizugawaTitle];
const kizugawaEvent=TK.HIST.find(event=>event.title===kizugawaTitle);
assert.deepEqual(Array.from(kizugawa.eventDate),Array.from(TK.lunarDate(1614,11,19)));
assert.deepEqual(Array.from(kizugawaEvent.d),Array.from(kizugawa.eventDate));
assert.equal(kizugawaEvent.who,'蜂須賀至鎮');
assert.equal(kizugawaEvent.documentedMarch,true,'do not generate an unrecorded approach');
assert.deepEqual(Array.from(kizugawa.units.filter(unit=>unit.side==='a'),unit=>unit.g).sort(),
 ['蜂須賀至鎮','浅野長晟','池田忠雄'].sort());
assert.ok(kizugawa.atlasGroups.every(group=>!group.point),'no invented deployment coordinates');
const units=[0,1,2].map(i=>({id:8000+i,clan:'oda',gens:[],commanders:['織田信長'],troops:1000*(i+1),path:['gifu','kiyosu'],seg:0,state:'march',mission:'show',until:'test',pos:.5})),position=u=>[200+(u.id-8000)*2,200];
const before=JSON.stringify(units),groups=G.convoyLayout(units,1,(x,y)=>[x,y],position);assert.equal(JSON.stringify(units),before);assert.equal(groups.length,1);assert.equal(groups[0].u.id,8002);assert.equal(groups[0].members.length,3);assert.equal(groups[0].displayUnit.troops,6000);
const separate=G.convoyLayout(units,4,(x,y)=>[x*4,y*4],position);assert.equal(separate.length,3);assert.ok(separate.every(g=>g.members.length===1));
units[1].path=['kiyosu','okazaki'];assert.ok(G.convoyLayout(units,1,(x,y)=>[x,y],position).length>1);
console.log('PASS: 111 local relief maps, strict participants, Hojo filter, save policy, old Honnoji site, Toda alias, same-march convoy grouping and zoom separation');

const route=G.visualEdgeGeo('gifu','kiyosu');for(const f of [0,1]){const point=G.visualPathPoint(route,f),a=units.map(u=>({...u,path:['gifu','kiyosu']})),rows=G.convoyLayout(a,5,(x,y)=>[x*5,y*5],()=>point);assert.equal(new Set(rows.map(r=>r.x.toFixed(3)+','+r.y.toFixed(3))).size,3,'convoy stays separate at both road endpoints');}
