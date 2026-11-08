/* 合戦の対象家・移転地・地形データ・密集駒の不具合を検査。起動不要。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {G,TK,TKLayout}=require('./history-focus.cjs').model();
const battles=Object.entries(TK.BATTLES);
const scoped=Object.values(TK.CONFLICT_CATALOG||{}).filter(r=>r.scene);
assert.equal(battles.filter(([,b])=>!b.conflictId).length,111);
assert.equal(battles.length,111+scoped.length);
for(const [title,b] of battles){
 assert.ok(Array.isArray(b.participantClans),title+' participation');
 for(const k of b.participantClans)assert.ok(TK.CLANS[k],title+' unknown faction '+k);
 const m=TK.BATTLE_ATLAS[title],d=JSON.parse(fs.readFileSync(path.join(__dirname,'../../kuniezu/static/kuniezu/atlas',m.file)));
 const reused=TK.CONFLICT_CATALOG?.[title]?.scene;
 assert.equal(d.title,reused?.terrainFile?title:reused?.sourceTitle||title);assert.equal(Buffer.from(d.heights,'base64').length,d.width*d.height*2);
 assert.ok(d.bounds[0]<d.bounds[2]&&d.bounds[1]>d.bounds[3]);
 if(reused?.bounds){assert.deepEqual(Array.from(m.bounds),Array.from(reused.bounds),title+' local bounds');assert.ok(m.bounds[0]>=d.bounds[0]&&m.bounds[2]<=d.bounds[2]&&m.bounds[1]<=d.bounds[1]&&m.bounds[3]>=d.bounds[3],title+' crop stays inside source relief');}
 else assert.deepEqual(Array.from(m.bounds),d.bounds,title+' relief and projected points share the same bounds');
 for(const p of d.points)assert.ok(p.lon>=d.bounds[0]&&p.lon<=d.bounds[2]&&p.lat<=d.bounds[1]&&p.lat>=d.bounds[3]);
}
const takatenjin=TK.BATTLE_ATLAS['高天神城の戦い'],takatenjinData=JSON.parse(fs.readFileSync(path.join(__dirname,'../../kuniezu/static/kuniezu/atlas',takatenjin.file)));
for(const [name,lon,lat] of TK.TAKATENJIN_FORTS){
 assert.ok(lon>takatenjin.bounds[0]&&lon<takatenjin.bounds[2]&&lat<takatenjin.bounds[1]&&lat>takatenjin.bounds[3],name+' included without moving its source point');
 assert.ok(takatenjin.points.some(p=>p.name===name&&p.lon===lon&&p.lat===lat),name+' source point preserved');
}
assert.ok(TK.BATTLES['高天神城の戦い'].atlasGroups.every(g=>!g.precision.includes('表示範囲外')),'Takatenjin deployment not clipped');
assert.ok(takatenjinData.elevationSource?.tiles?.length,'Takatenjin elevation keeps source checksums');
// Verify the new frame against retained source tiles, rather than a stretched old grid.
const crypto=require('node:crypto'),decodePNG=require('../geo/png-decode.cjs'),dem=new Map();
for(const tile of takatenjinData.elevationSource.tiles){const file=path.join(__dirname,'../../data/inputs/battle-atlas-dem',tile.key.join('-')+'.png'),bytes=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),tile.sha256);const image=decodePNG(bytes);assert.equal(image.width,256);assert.equal(image.height,256);dem.set(tile.key.join('-'),image);}
const grid=Buffer.from(takatenjinData.heights,'base64'),bb=takatenjinData.bounds,zoom=2**takatenjinData.zoom;
const evenRound=n=>{const lo=Math.floor(n);return n-lo===.5?lo+lo%2:Math.round(n);};
for(let y=0;y<takatenjinData.height;y++)for(let x=0;x<takatenjinData.width;x++){
 const lon=bb[0]+(bb[2]-bb[0])*x/(takatenjinData.width-1),lat=bb[1]+(bb[3]-bb[1])*y/(takatenjinData.height-1),tx=(lon+180)/360*zoom,ty=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*zoom;
 const ix=Math.floor(tx),iy=Math.floor(ty),image=dem.get([takatenjinData.zoom,ix,iy].join('-'));assert.ok(image,'source tile for '+x+','+y);
 const px=Math.min(255,Math.floor((tx-ix)*256)),py=Math.min(255,Math.floor((ty-iy)*256)),i=(py*256+px)*4;
 assert.equal(grid.readUInt16LE((y*takatenjinData.width+x)*2),Math.max(0,Math.min(65535,evenRound(image.data[i]*256+image.data[i+1]+image.data[i+2]/256))),'source elevation '+x+','+y);
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
console.log('PASS: '+battles.length+' battle views with 111 retained local relief maps, strict participants, Hojo filter, save policy, old Honnoji site, Toda alias, same-march convoy grouping and zoom separation');

const route=G.visualEdgeGeo('gifu','kiyosu');for(const f of [0,1]){const point=G.visualPathPoint(route,f),a=units.map(u=>({...u,path:['gifu','kiyosu']})),rows=G.convoyLayout(a,5,(x,y)=>[x*5,y*5],()=>point);assert.equal(new Set(rows.map(r=>r.x.toFixed(3)+','+r.y.toFixed(3))).size,3,'convoy stays separate at both road endpoints');}
