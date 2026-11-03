/* 史料で区別した包囲・救援・撤退・開城と、共通の表示期間を検査。サーバー操作・監査出力なし。 */
'use strict';
const assert=require('node:assert/strict');
const {G,TK}=require('./history-focus.cjs').model();
const array=value=>Array.from(value);
const names=units=>array(units).map(u=>u.g||u.n).sort();
const visible=(scene,t)=>names(scene.units.filter(u=>G.battleUnitVisible(scene,u,t)));
const unit=(scene,name)=>{
 const matches=scene.units.filter(u=>u.g===name);
 assert.equal(matches.length,1,scene.title+' one record for '+name);
 return matches[0];
};
const chronology=(title,lunar,source)=>{
 const events=TK.HIST.filter(e=>e.title===title&&e.k!=='premarch');
 assert.equal(events.length,1,title+' unique historical event');
 const event=events[0];
 assert.deepEqual(array(event.lunarDate),lunar,title+' source lunar date');
 assert.deepEqual(array(event.d),array(TK.lunarDate(...lunar)),title+' calendar conversion');
 assert.equal(event.source,source,title+' source');
 return event;
};

// 佐用町「上月城と上月合戦」、信長公記巻十二（十三・十五）、三重県資料PDF5頁。
const sayo='https://www.town.sayo.lg.jp/cms-sypher/www/info/detail.jsp?id=11722';
const chronicle='https://ja.wikisource.org/wiki/信長公記';
const mie='https://www.pref.mie.lg.jp/common/content/001067704.pdf';
for(const [title,date,source] of [
 ['毛利方が上月城を包囲',[1578,4,18],sayo],
 ['上月城の救援軍が高倉山に着陣',[1578,5,4],sayo],
 ['羽柴秀吉が高倉山から撤退',[1578,6,26],sayo],
 ['滝川一益が有岡城の外郭を破る',[1579,10,15],chronicle],
 ['鍋島勝茂が安濃津城を攻める',[1600,8,22],mie],
 ['毛利勢が安濃津城を攻める',[1600,8,24],mie]
])assert.equal(chronology(title,date,source).k,'note',title+' stage is not a second battle');

const specs=[
 {title:'上月城の戦い',date:[1578,7,5],source:sayo,names:['吉川元春','小早川隆景','尼子勝久','山中幸盛','羽柴秀吉','荒木村重'],dates:['4月18日','5月4日','6月26日','7月5日']},
 {title:'有岡城の戦い',date:[1579,11,19],source:chronicle,names:['滝川一益','織田信澄','荒木久左衛門','渡辺勘太夫','野村丹後','雑賀勢'],dates:['10月15日','11月19日']},
 {title:'安濃津城の戦い',date:[1600,8,25],source:mie,names:['毛利秀元','吉川広家','鍋島勝茂','長束正家','安国寺恵瓊','富田信高','分部光嘉'],dates:['8月22日','8月24日','8月25日']}
];
for(const spec of specs){
 const event=chronology(spec.title,spec.date,spec.source),scene=TK.BATTLES[spec.title];
 assert.deepEqual(array(scene.eventDate),array(event.d),spec.title+' replay follows its resolution date');
 assert.equal(event.documentedMarch,true,spec.title+' no invented approach from administration castle');
 assert.ok(!event.also?.length,spec.title+' no legacy duplicate contingent');
 assert.deepEqual(names(scene.units),spec.names.slice().sort(),spec.title+' sourced roster');
 assert.ok(scene.beats.length>=4,spec.title+' siege phases');
 assert.ok(!/開城|明け渡|降伏|終わった/.test(scene.beats[0][1]),spec.title+' no resolution at opening');
 assert.equal(scene.beats.at(-1)[0],100,spec.title+' resolution at final phase');
 assert.match(scene.beats.at(-1)[1],/開城|明け渡|警固/,spec.title+' final event');
 for(const date of spec.dates)assert.ok(scene.calendar.some(([,label])=>label.includes(date)),spec.title+' calendar includes '+date);
 assert.ok(scene.units.every(u=>u.tr===0),spec.title+' force totals not assigned to each commander');
 const members=scene.atlasGroups.flatMap(g=>g.members);
 assert.equal(members.length,scene.units.length,spec.title+' roster coverage');
 assert.equal(new Set(members).size,members.length,spec.title+' no duplicate member');
 for(const u of scene.units)assert.ok(TK.RESEARCH_SOURCES[u.source]||TK.BATTLE_SOURCES[u.source],spec.title+' unit source '+u.g);
 const bounds=TK.BATTLE_ATLAS[spec.title].bounds;
 for(const group of scene.atlasGroups){
  assert.ok(!group.precision.includes('表示範囲外'),spec.title+' no clipped sourced placement');
  if(group.point){const [lon,lat]=group.point;assert.ok(lon>=bounds[0]&&lon<=bounds[2]&&lat<=bounds[1]&&lat>=bounds[3],spec.title+' placement in atlas');}
 }
}

const kozuki=TK.BATTLES['上月城の戦い'];
for(const name of ['羽柴秀吉','荒木村重']){
 const u=unit(kozuki,name);
 assert.equal(G.battleUnitVisible(kozuki,u,24.999),false,name+' before relief');
 assert.equal(G.battleUnitVisible(kozuki,u,25),true,name+' relief arrives');
 assert.equal(G.battleUnitVisible(kozuki,u,77.999),true,name+' relief before withdrawal');
 assert.equal(G.battleUnitVisible(kozuki,u,78),false,name+' relief ends');
 assert.equal(G.battleUnitVisible(kozuki,u,78.001),false,name+' no reappearance');
 assert.equal(G.battleUnitVisible(kozuki,u,100),false,name+' absent at surrender');
 const group=kozuki.atlasGroups.find(g=>g.members.includes(u.id));
 assert.deepEqual(array(group.point),[134.35666,34.97853],name+' Takakurayama site table point');
}
assert.ok(kozuki.participantClans.includes('oda'),'Oda player belongs to relief side');
assert.equal(unit(kozuki,'尼子勝久').die,100,'Katsuhisa death belongs to final phase');
assert.ok(unit(kozuki,'山中幸盛').die==null,'Yamanaka is not killed in the surrender scene');
assert.ok(!TK.HIST.find(e=>e.title==='上月城の戦い'&&e.k!=='premarch').kill.includes('山中幸盛'),'Yamanaka survives the surrender event');
chronology('山中幸盛が阿井の渡しで討たれる',[1578,7,17],'https://www.city.takahashi.lg.jp/site/bichu-matsuyama/nenpyou.html');

const arioka=TK.BATTLES['有岡城の戦い'];
assert.ok(!arioka.units.some(u=>u.g==='荒木村重'||u.g==='織田信長'),'end-period Arioka roster excludes departed Murashige and the old aggregate Nobunaga force');
for(const name of ['渡辺勘太夫','野村丹後','雑賀勢']){
 const u=unit(arioka,name);
 assert.equal(G.battleUnitVisible(arioka,u,0),true,name+' outer-defence phase');
 assert.equal(G.battleUnitVisible(arioka,u,19.999),true,name+' before outer defence falls');
 assert.equal(G.battleUnitVisible(arioka,u,20),false,name+' outer defence lost');
 assert.equal(G.battleUnitVisible(arioka,u,20.001),false,name+' no stale fort garrison');
}
const kuzaemon=unit(arioka,'荒木久左衛門'),nobusumi=unit(arioka,'織田信澄');
assert.equal(G.battleUnitVisible(arioka,kuzaemon,99.999),true);
assert.equal(G.battleUnitVisible(arioka,kuzaemon,100),false,'Kuzaemon has left for Amagasaki');
assert.equal(G.battleUnitVisible(arioka,kuzaemon,100.001),false);
assert.equal(G.battleUnitVisible(arioka,nobusumi,99.999),false,'Nobusumi does not enter before surrender');
assert.equal(G.battleUnitVisible(arioka,nobusumi,100),true,'from 100 is visible at the final frame');
assert.equal(arioka.mapExitLabels[kuzaemon.id],'尼崎へ退出');
assert.deepEqual(visible(arioka,100),['滝川一益','織田信澄'].sort(),'guarding force replaces the departing garrison');

const anotsu=TK.BATTLES['安濃津城の戦い'];
for(const [name,from] of [['鍋島勝茂',20],['毛利秀元',60],['吉川広家',60]]){
 const u=unit(anotsu,name);
 assert.equal(G.battleUnitVisible(anotsu,u,from-.001),false,name+' before its mapped phase');
 assert.equal(G.battleUnitVisible(anotsu,u,from),true,name+' mapped phase begins');
 assert.equal(G.battleUnitVisible(anotsu,u,100),true,name+' remains in event roster');
}
for(const name of ['長束正家','安国寺恵瓊','富田信高','分部光嘉'])assert.equal(G.battleUnitVisible(anotsu,unit(anotsu,name),0),true,name+' present in the opening stage');
assert.notEqual(unit(anotsu,'鍋島勝茂').clan,'mori','Nabeshima does not inherit a Mori family mark');
assert.deepEqual(array(G.battleActiveUnits(anotsu,20)),['a-nabeshima','b-0']);
assert.deepEqual(array(G.battleActiveUnits(anotsu,60)),[],'previous combat pair ends at the next narrative phase');
assert.deepEqual(array(G.battleActiveUnits(anotsu,100)),[],'no fighting after peace');

// 長篠などのmapVisibleFromと個別のfromを併用しても、遅い方の着陣からだけ表示する。
const sample={id:'sample',from:30},window={mapVisibleFrom:{sample:40},mapVisibleUntil:{sample:60}};
for(const [t,expected] of [[29.999,false],[30,false],[39.999,false],[40,true],[59.999,true],[60,false],[60.001,false]])
 assert.equal(G.battleUnitVisible(window,sample,t),expected,'combined visibility boundary '+t);
assert.equal(G.battleUnitVisible({mapVisibleUntil:{sample:0}},{id:'sample'},0),false,'until zero is not treated as missing');
assert.equal(G.battleUnitVisible({},{id:'sample'},100),true,'units with no end stay visible');
const beats={beats:[[0,'開始'],[10,'交戦',['left','right']],[30,'移動'],[50,'別の交戦',['third','fourth']],[60,'和議',[]]]};
for(const [t,expected] of [[0,[]],[10,['left','right']],[29.999,['left','right']],[30,[]],[49,[]],[50,['third','fourth']],[60,[]],[100,[]]])
 assert.deepEqual(array(G.battleActiveUnits(beats,t)),expected,'combat does not outlive its phase '+t);

const snapshot=()=>JSON.stringify(specs.map(({title})=>({scene:TK.BATTLES[title],troops:TK.BATTLE_TROOPS[title]})));
const before=snapshot();
for(let i=0;i<3;i++){G.buildBattleCatalog();assert.equal(snapshot(),before,'catalog rebuild '+(i+1)+' is stable');}
console.log('PASS: three sourced siege chronologies and rosters; dated relief, fort loss and handover; inclusive arrival/exclusive exit; final-frame guard; combat reset; three stable catalog rebuilds');
