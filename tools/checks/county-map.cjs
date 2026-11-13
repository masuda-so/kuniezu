/* 郡の塗りの規則（docs/designs/county-territory.md 技術計画 3）を固定の状態で確かめ、
   コミット済みの郡の形とゲームの城で、基準の日付の根拠の種類ごとの郡の数を数える。
   --write <ファイル> で数を JSON に書く（CI の成果物。コミットしない）。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const {decide}=require('../../kuniezu/static/kuniezu/county-map.js');

// 1. 規則の各場合
{
 const counties=[
  {id:'G1',kuni:'K1',castles:['castle:a']},                 // 城のある郡
  {id:'G2',kuni:'K1',castles:[]},                           // 国の城がすべて同じ家
  {id:'G3',kuni:'K2',castles:['castle:b','castle:c']},      // 持ち主の違う城（区画）
  {id:'G4',kuni:'K2',castles:[]},                           // 国の城が分かれている（未導出）
  {id:'G5',kuni:'K3',castles:[]},                           // 国に城が無い（未導出）
  {id:'G6',kuni:'K4',castles:[]},                           // 例外（context）
  {id:'G7',kuni:'K5',castles:[]},                           // 例外（城の無い日だけ中立）
  {id:'G8',kuni:'K5',castles:['castle:d']},                 // 例外（城がある日は規則どおり）
  {id:'G9',kuni:'K6',castles:['castle:gone']},              // 存在しない城は数えない
 ];
 const owners={'castle:a':'oda','castle:b':'oda','castle:c':'saito','castle:d':'mori'};
 const ownerOf=k=>owners[k]?{owner:owners[k]}:null;
 const cellsByGun=new Map([['G3',[{castle:'castle:b'},{castle:'castle:c'}]]]);
 const exceptionsByGun=new Map([['G6',[{rule:'context',key:'context:ainu',from:null,to:null}]],['G7',[{rule:'neutral-without-castle',key:'neutral:佐渡'}]],['G8',[{rule:'neutral-without-castle',key:'neutral:佐渡'}]]]);
 const r=decide({counties,cellsByGun,exceptionsByGun,ownerOf,date:[1560,6,5]});
 assert.deepEqual(r.get('G1'),{basis:'castle-point',clan:'oda'});
 assert.deepEqual(r.get('G2'),{basis:'province-uniform',clan:'oda',single:true});
 assert.equal(r.get('G3').clan,null);assert.deepEqual([...r.get('G3').cells],[['castle:b','oda'],['castle:c','saito']]);
 assert.equal(r.get('G4').basis,'underived');assert.equal(r.get('G5').basis,'underived');
 assert.deepEqual(r.get('G6'),{basis:'exception',context:'context:ainu'});
 assert.deepEqual(r.get('G7'),{basis:'exception',context:'neutral:佐渡'});
 assert.deepEqual(r.get('G8'),{basis:'castle-point',clan:'mori'});
 assert.equal(r.get('G9').basis,'underived');
 // 例外の期間：to は含まない
 const ex=new Map([['G1',[{rule:'context',key:'context:ryukyu',from:null,to:[1609,1,1]}]]]);
 assert.equal(decide({counties,cellsByGun,exceptionsByGun:ex,ownerOf,date:[1608,12,30]}).get('G1').basis,'exception');
 assert.equal(decide({counties,cellsByGun,exceptionsByGun:ex,ownerOf,date:[1609,1,1]}).get('G1').basis,'castle-point');
 // 区画の城が数えられないときは、同じ郡で最も近い数えられる城の持ち主
 const three=[{id:'H1',kuni:'K9',castles:['castle:p','castle:q','castle:r']}];
 const own3={'castle:p':'oda','castle:q':'saito'},pos={'castle:p':[0,0],'castle:q':[10,0],'castle:r':[9,0]};
 const r3=decide({counties:three,cellsByGun:new Map([['H1',three[0].castles.map(castle=>({castle}))]]),exceptionsByGun:new Map(),ownerOf:k=>own3[k]?{owner:own3[k]}:null,positionOf:k=>pos[k],date:[1560,1,1]});
 assert.deepEqual([...r3.get('H1').cells],[['castle:p','oda'],['castle:q','saito'],['castle:r','saito']]);
 console.log('PASS: county rules (castle point, province uniform, cells, inactive cell castle, underived, exceptions and their period, missing castles)');
}

// 2. 城の鍵から持ち主：行軍拠点の城、存在する支城、存在しない支城
{
 const {installCastleOwner}=require('../../kuniezu/static/kuniezu/county-map.js');
 const site={id:'yosho:甲:1:1',kind:'城',x:5,y:6,active:true},gone={id:'yosho:乙:2:2',kind:'城',x:7,y:8,active:false};
 const G={YOSHO:[site,gone],C:{a:{x:1,y:2}},yActive:y=>y.active,yOwner:()=>'takeda'};installCastleOwner(G);
 const S={castles:{a:{owner:'oda'}}};
 assert.deepEqual(G.castleOwner('castle:a',S),{owner:'oda',waypoint:true});
 assert.deepEqual(G.castleOwner('castle:yosho:甲:1:1',S),{owner:'takeda',waypoint:false});
 assert.equal(G.castleOwner('castle:yosho:乙:2:2',S),null);
 assert.deepEqual(G.castlePosition('castle:a'),[1,2]);assert.deepEqual(G.castlePosition('castle:yosho:甲:1:1'),[5,6]);
 console.log('PASS: castle owners for march-node castles, active and inactive other castles');
}

// 3. コミット済みの郡の形とゲームの城で、基準の日付の数
{
 const {model}=require('./history-focus.cjs');const {G,TK}=model();
 require('../../kuniezu/static/kuniezu/county-map.js').installCastleOwner(G);
 const read=f=>JSON.parse(fs.readFileSync(path.join(root,'kuniezu/map/admin',f),'utf8'));
 const counties=read('gun-shapes.geojson').features.map(f=>f.properties);
 const cellsByGun=new Map();for(const f of read('gun-cells.geojson').features){const l=cellsByGun.get(f.properties.gun)||[];l.push({castle:f.properties.castle});cellsByGun.set(f.properties.gun,l);}
 const exceptionsByGun=new Map();for(const f of read('gun-exceptions.geojson').features){const l=exceptionsByGun.get(f.properties.gun)||[];l.push(f.properties);exceptionsByGun.set(f.properties.gun,l);}
 const known=new Set([...TK.CASTLES.map(c=>'castle:'+c[0]),...G.YOSHO.filter(y=>y.kind==='城').map(y=>'castle:'+y.id)]);
 for(const c of counties)for(const k of c.castles)assert.ok(known.has(k),'unknown castle key '+k);
 const report={generated:'tools/checks/county-map.cjs',note:'ゲームの今の城の持ち主（史料とは未照合）による数。',dates:[]};
 const count=(S,d)=>{const r=decide({counties,cellsByGun,exceptionsByGun,ownerOf:k=>G.castleOwner(k,S),positionOf:G.castlePosition,date:d});assert.equal([...r.values()].length,counties.length);const counts={};for(const v of r.values())counts[v.basis]=(counts[v.basis]||0)+1;return counts;};
 for(const sid of Object.keys(TK.SCEN).sort()){
  G.newGame(sid,'oda');const S=G.S(),d=G.date();
  report.dates.push({scenario:sid,date:[d.y,d.m,d.d],counts:count(S,[d.y,d.m,d.d])});
 }
 // 1615 年末（s1600 から日送り）
 G.newGame('s1600','oda');G.S().player='__none';const end=G.evT({d:[1615,12,31]});while(G.S().t<end){G.day();const S=G.S();S.evQ=[];S.sceneQ=[];S.battleQ=[];S.propQ=[];}
 {const d=G.date();report.dates.push({scenario:'s1600 → 1615 年末',date:[d.y,d.m,d.d],counts:count(G.S(),[d.y,d.m,d.d])});}
 const i=process.argv.indexOf('--write');if(i>0)fs.writeFileSync(process.argv[i+1],JSON.stringify(report,null,1)+'\n');
 for(const row of report.dates)console.log(row.scenario,row.date.join('-'),JSON.stringify(row.counts));
 console.log('PASS: committed county shapes name only game castles; every county gets a basis at each scenario start');
}
