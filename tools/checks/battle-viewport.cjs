/* Geographic projection, selection and district regression using the shared Canvas fixture. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {c,TK,G,make,counters,choices,clickBody,clickLabel,simple,distance,world,rows,decorations,TAKATENJIN_BOUNDS}=require('./fixtures/battle-atlas.cjs').createFixture();

(async()=>{
 const districtChecks=[];
 for(const title of ['関ヶ原の戦い','高天神城の戦い','長篠の戦い','大坂冬の陣']){
  const h=await make(title,390);h.ctrl.seek(50);const original=simple(h.ctrl.unitStates()),t=h.ctrl.t,buttons=h.views();const transitions=[];
  for(let i=0;i<buttons.length;i++){h.views()[i].onclick();const states=simple(h.ctrl.unitStates());assert.equal(h.ctrl.t,t,'district transition preserves time');assert.deepEqual(states.map(u=>[u.id,u.point,u.renderedPoint,u.status]),original.map(u=>[u.id,u.point,u.renderedPoint,u.status]),'district transition cannot move units');let selections=0;for(const u of states){h.ctrl.select(u.id);if(u.visible)assert.equal(h.ctrl.t,t);assert.ok(choices(h).some(e=>e.dataset.unitId===u.id));h.ctrl.seek(t);assert.deepEqual(simple(h.ctrl.unitStates()).map(u=>[u.id,u.point,u.renderedPoint,u.status]),original.map(u=>[u.id,u.point,u.renderedPoint,u.status]));selections++;}transitions.push({name:h.views()[i].textContent,individualSelections:selections,labelCount:h.ctrl.testBoxes().filter(b=>b.label).length});}
  districtChecks.push({title,viewCount:buttons.length,transitions,allUnitIds:original.map(u=>u.id)});h.ctrl.destroy();
 }
 for(const title of ['関ヶ原の戦い','高天神城の戦い']){
  const h=await make(title,940),sc=TK.BATTLES[title],bounds=TK.BATTLE_ATLAS[title].bounds,reference=new Map();let maxKm=0,bodyChecks=0,frameCount=0,offscreen=0;const held=title==='関ヶ原の戦い'?['mori','kikkawa','ankokuji','chosokabe','roster-長束正家']:[];
  for(const t of [0,20,50,80,100]){
   h.resize(940);h.ctrl.setViewport(1,0,0);h.ctrl.seek(t);for(const u of h.ctrl.unitStates())reference.set(t+'|'+u.id,u.renderedPoint);
   for(const width of [940,390,335,240]){
    h.resize(width);const {W,H}=h.ctrl.viewport();
    for(const [scale,ox,oy] of [[1,0,0],[1.8,.27,.2],[3.5,.8,.5]]){
     h.ctrl.setViewport(scale,W*ox,H*oy);h.ctrl.seek(t);const v=h.ctrl.viewport();
     for(const u of h.ctrl.unitStates()){
      const expected=reference.get(t+'|'+u.id);if(!expected)continue;
      const inverse=world(u.screenPoint,v,bounds);if(held.includes(u.id))assert.ok(distance(inverse,reference.get('0|'+u.id))<1e-8,'held unit remains at its initial point '+u.id);maxKm=Math.max(maxKm,distance(inverse,expected));assert.ok(distance(inverse,expected)<1e-8,title+' changed geography '+u.id);
      if(u.positionBasis==='recorded')assert.ok(distance(inverse,u.point)<1e-8,'recorded point changed');
      if(u.screenPoint[0]<0||u.screenPoint[0]>W||u.screenPoint[1]<0||u.screenPoint[1]>H)offscreen++;
     }
     bodyChecks+=counters(h,sc);decorations(h,title);frameCount++;
    }
   }
  }
  h.resize(335);h.ctrl.setViewport(1,0,0);h.ctrl.seek(20);
  if(title==='高天神城の戦い'){const txt=h.cv.context.texts.find(x=>x.text==='三井山砦');assert.ok(txt,'Mitsui label present');assert.ok(txt.y+txt.size/2<h.ctrl.viewport().H,'Mitsui label bottom safe');}
  assert.equal(frameCount,60);assert.ok(bodyChecks>0,title+' must draw troop counters');
  rows.push({title,frames:frameCount,bodyChecks,maxGeographicDifferenceKm:maxKm,offscreenStatesPreserved:offscreen,heldUnits:held});h.ctrl.destroy();
 }
 const schematic=await make('木津川口の戦い',335);schematic.ctrl.seek(80);const s=schematic.ctrl.unitStates();assert.ok(s.length>0&&s.every(u=>u.renderedPoint===null&&u.positionBasis==='schematic'));decorations(schematic,'木津川口模式図');assert.ok(counters(schematic,TK.BATTLES['木津川口の戦い'])>0);schematic.ctrl.destroy();
 // A sole group near each edge: body anchors remain exact; annotations fit; no hidden opposite-side assumptions.
 const fixtureTitle='viewport-edge-fixture';TK.BATTLE_ATLAS[fixtureTitle]={file:'fixture.json',bounds:[0,1,1,0],points:[{name:'下端地名',lon:.5,lat:.001}],geo:[.5,.5],label:'fixture'};
 TK.BATTLES[fixtureTitle]={title:fixtureTitle,units:[{id:'nw',g:'北西の隊',side:'a'},{id:'se',g:'南東の隊',side:'a'},{id:'se2',g:'同地点の隊',side:'a'}],atlasGroups:[{id:'nw',side:'a',point:[.001,.999],members:['nw']},{id:'se',side:'a',point:[.999,.001],members:['se','se2']}],beats:[]};
 const edge=await make(fixtureTitle,240);edge.ctrl.seek(20);decorations(edge,'edge fixture');counters(edge,TK.BATTLES[fixtureTitle]);const edgeStates=edge.ctrl.unitStates();assert.deepEqual(simple(edgeStates[1].screenPoint),simple(edgeStates[2].screenPoint),'overlap not displaced');edge.ctrl.destroy();
 const oneSide='one-side-fixture';TK.BATTLE_ATLAS[oneSide]={file:'one-side.json',bounds:[0,1,1,0],points:[],geo:[.5,.5],label:'fixture'};
 TK.BATTLES[oneSide]={title:oneSide,sides:{a:{clan:'tokugawa'},b:{clan:'takeda'}},units:[{id:'a',g:'既知地点',side:'a'},{id:'b',g:'推定の側',side:'b'}],atlasGroups:[{id:'a',side:'a',point:[.5,.5],members:['a']},{id:'b',side:'b',point:null,members:['b']}],beats:[[30,'',['a','b']]]};
 const one=await make(oneSide,940);one.ctrl.seek(50);const assumed=one.ctrl.unitStates().find(x=>x.id==='b');assert.equal(assumed.positionBasis,'estimated-placement');assert.ok(assumed.renderedPoint);assert.equal(assumed.point,null);assert.ok(counters(one,TK.BATTLES[oneSide])>0);
 clickBody(one,'est-b');assert.deepEqual(choices(one).map(x=>x.dataset.unitId),['b'],'estimated body selects its unit');
 clickLabel(one,'est-b');assert.deepEqual(choices(one).map(x=>x.dataset.unitId),['b'],'estimated label selects its unit');
 choices(one)[0].onclick();assert.equal(one.ctrl.testSelected(),'est-b');assert.equal(one.ctrl.unitStates().find(x=>x.id==='b').point,null);assert.equal(one.ctrl.unitStates().find(x=>x.id==='b').positionBasis,'estimated-placement');
 one.ctrl.select('b');assert.deepEqual(choices(one).map(x=>x.dataset.unitId),['b'],'existing public selection API remains valid');
 one.resize(335);one.ctrl.setViewport(2.3,20,30);one.ctrl.seek(50);const resizedAssumed=one.ctrl.unitStates().find(x=>x.id==='b');assert.ok(distance(assumed.renderedPoint,resizedAssumed.renderedPoint)<1e-8,'estimated placement remains view independent');counters(one,TK.BATTLES[oneSide]);one.ctrl.destroy();

 // Actual registered click handler and choice buttons, including mixed recorded/estimated overlap.
 const overlap='coincident-selection-fixture';TK.BATTLE_ATLAS[overlap]={file:'overlap.json',bounds:[0,1,1,0],points:[],geo:[.5,.5],label:'fixture'};
 TK.BATTLES[overlap]={title:overlap,units:[{id:'a',g:'同地点甲',side:'a'},{id:'b',g:'同地点乙',side:'a'}],atlasGroups:[{id:'both',side:'a',point:[.5,.5],members:['a','b']}],beats:[]};
 const same=await make(overlap,390);same.ctrl.seek(20);const sameBefore=simple(same.ctrl.unitStates());clickBody(same,'both-0');assert.deepEqual(choices(same).map(x=>x.dataset.unitId),['a','b']);
 for(const button of choices(same)){button.onclick();assert.deepEqual(simple(same.ctrl.unitStates()),sameBefore,'selection never displaces bodies');}counters(same,TK.BATTLES[overlap]);same.ctrl.destroy();
 const mixed=await make(oneSide,240);mixed.ctrl.seek(50);const mixedBefore=simple(mixed.ctrl.unitStates());clickBody(mixed,'est-b');assert.deepEqual(choices(mixed).map(x=>x.dataset.unitId).sort(),['a','b'],'all nearby recorded and estimated bodies are accessible');
 for(const button of choices(mixed)){button.onclick();assert.deepEqual(simple(mixed.ctrl.unitStates()),mixedBefore);}assert.equal(mixed.ctrl.unitStates().find(x=>x.id==='b').point,null);counters(mixed,TK.BATTLES[oneSide]);mixed.ctrl.destroy();
 const outside='outside-selection-fixture';TK.BATTLE_ATLAS[outside]={file:'outside.json',bounds:[0,1,1,0],points:[],geo:[.5,.5],label:'fixture'};
 TK.BATTLES[outside]={title:outside,units:[{id:'out',g:'画角外',side:'a'}],atlasGroups:[{id:'out',side:'a',point:[-.1,.5],members:['out']}],beats:[]};const out=await make(outside,390);out.ctrl.seek(20);assert.equal(counters(out,TK.BATTLES[outside]),0);assert.equal(out.cv.context.faces.length,0);assert.equal(out.cv.context.flags.length,0);assert.equal(out.ctrl.testBoxes().length,0);assert.ok(out.ctrl.unitStates()[0].screenPoint[0]<0);out.ctrl.destroy();

 const strokeStyles=[];
 for(const spec of [{name:'normal',extra:{},selected:false,fill:'#216d9f',outline:'#2a1d10'},{name:'selected',extra:{},selected:true,fill:'#216d9f',outline:'#e5ad3f'},{name:'dead',extra:{die:40},selected:false,fill:'#8a8174',outline:'#2a1d10'},{name:'turned',extra:{turn:[40,'a']},selected:false,fill:'#b47712',outline:'#2a1d10'}]){
  const title='placement-style-'+spec.name;TK.BATTLE_ATLAS[title]={...TK.BATTLE_ATLAS[oneSide],file:title+'.json'};TK.BATTLES[title]={...simple(TK.BATTLES[oneSide]),title};Object.assign(TK.BATTLES[title].units.find(u=>u.id==='b'),spec.extra);
  const h=await make(title,940);h.ctrl.seek(50);if(spec.selected)h.ctrl.select('b');counters(h,TK.BATTLES[title]);const stroke=h.cv.context.counterStrokes.find(x=>x.id==='est-b'),fill=h.cv.context.counterFills.find(x=>x.id==='est-b');assert.ok(stroke&&fill);assert.deepEqual(stroke.dash,[3,2]);assert.equal(stroke.color,spec.outline);assert.equal(fill.color,spec.fill);assert.equal(stroke.width,spec.selected?2.6:TK.BATTLES[title].beats.some(b=>b[0]<=50&&b[2]?.includes('b'))?2.4:1.7);assert.equal(h.ctrl.unitStates().find(x=>x.id==='b').point,null);strokeStyles.push({state:spec.name,dash:stroke.dash,fill:fill.color,outline:stroke.color});if(spec.name==='turned'){h.faceCalls.length=0;h.ctrl.select('b');assert.equal(h.faceCalls.find(f=>f.size===14)?.color,'#c83339','selection portrait follows the current side');}h.ctrl.destroy();
 }
 // An already open panel follows a turn without rebuilding its buttons; closed means closed.
 const turning=await make('placement-style-turned',940);turning.ctrl.seek(30);turning.ctrl.select('b');const panel=turning.stage.selection,button=choices(turning)[0],portrait=button.children.find(e=>e.tag==='img'),replaceCount=panel.replaceCount;
 const imageColor=()=>Buffer.from(portrait.src.split(',')[1],'base64').toString();assert.equal(imageColor(),'#216d9f','open before turn shows blue');assert.equal(panel.hidden,false);turning.faceCalls.length=0;
 turning.ctrl.seek(35);assert.equal(turning.faceCalls.filter(f=>f.size===14).length,0,'same side does not redraw selection portrait');
 turning.ctrl.seek(50);assert.equal(imageColor(),'#c83339','open panel updates blue to red across turn');assert.equal(turning.faceCalls.filter(f=>f.size===14).length,1,'one portrait update for turn');assert.strictEqual(choices(turning)[0],button,'choice button identity remains');assert.strictEqual(button.children.find(e=>e.tag==='img'),portrait,'image node identity remains');assert.equal(panel.replaceCount,replaceCount,'turn does not rebuild panel DOM');
 turning.ctrl.seek(50);assert.equal(turning.faceCalls.filter(f=>f.size===14).length,1,'same-time frame does not redraw selection portrait');
 turning.ctrl.seek(30);assert.equal(imageColor(),'#216d9f','reverse seek restores previous side');assert.equal(turning.faceCalls.filter(f=>f.size===14).length,2);assert.equal(panel.replaceCount,replaceCount);
 panel.children[0].children.find(e=>e.textContent==='閉じる').onclick();assert.equal(panel.hidden,true);assert.equal(turning.ctrl.testSelected(),null);turning.faceCalls.length=0;turning.ctrl.seek(50);turning.ctrl.seek(30);assert.equal(panel.hidden,true,'seek never reopens closed panel');assert.equal(turning.ctrl.testSelected(),null);assert.equal(turning.faceCalls.filter(f=>f.size===14).length,0,'closed panel does not regenerate portrait');assert.equal(panel.replaceCount,replaceCount);turning.ctrl.destroy();
 // Recorded anchors with inferred movement keep solid outlines, distinct from estimated placement.
 const moved='recorded-motion-style';TK.BATTLE_ATLAS[moved]={file:'moved.json',bounds:[0,1,1,0],points:[],geo:[.5,.5],label:'fixture'};TK.BATTLES[moved]={title:moved,units:[{id:'a',g:'記録地点甲',side:'a'},{id:'b',g:'記録地点乙',side:'b'}],atlasGroups:[{id:'a',side:'a',point:[.3,.5],members:['a']},{id:'b',side:'b',point:[.7,.5],members:['b']}],beats:[[30,'',['a','b']]]};const moving=await make(moved,940);moving.ctrl.seek(50);assert.ok(moving.ctrl.unitStates().every(u=>u.positionBasis==='estimated-motion'&&u.point));assert.ok(counters(moving,TK.BATTLES[moved])>0);assert.ok(moving.cv.context.counterStrokes.every(s=>s.dash.length===0));moving.ctrl.destroy();
 const report={districtChecks,passed:true,browserRun:false,newGameRun:false,dailySimulationRun:false,wholeMapDecoded:false,scope:'actual atlas draw commands for two geographic battles, one schematic, edge and one-side fixtures',rows,schematicHasNoGeographicPoint:true,estimatedPlacementDistinctFromRecordedPoint:true,edgeDecorationsInBounds:true,coincidentCountersNotDisplaced:true,estimatedBodiesChecked:true,allVisibleBodiesChecked:true,estimatedClickSelection:true,coincidentClickSelection:true,mixedClickSelection:true,offscreenBodiesNotClickable:true,estimatedPlacementStrokeStyles:strokeStyles,recordedMotionSolid:true,lineDashIsolation:true,selectionPanelFollowsTurn:true,selectionPanelReverseSeek:true,selectionPanelCloseStable:true,selectionPanelNoFrameRebuild:true,limits:['Canvas text metrics use deterministic character widths; actual font rendering needs a separate browser check.','This validates projections and draw command anchors, not historical truth of estimated motion.','Source movement geometry and historical source data were not modified.']};
 if(process.env.GAME_TEST_OUTPUT){const out=path.resolve(process.env.GAME_TEST_OUTPUT);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'battle-viewport.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
