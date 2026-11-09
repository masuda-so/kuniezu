'use strict';
/* 宣言された初期画角と、手動選択後の再サイズを既存Canvas VMで検査。実ブラウザは起動しない。 */
const path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.GAME_REPO_ROOT||path.resolve(__dirname,'../..');
const {c:atlasContext,TK,make,simple}=require(path.join(root,'tools/checks/fixtures/battle-atlas.cjs')).createFixture({actualBounds:true});
const titles=['関ヶ原の戦い','桶狭間の戦い'],phases=[0,25,50,75,100],rows=[];
const states=h=>simple(h.ctrl.unitStates().map(u=>[u.id,u.point,u.renderedPoint,u.status]));
const coordinates=title=>JSON.stringify({bounds:TK.BATTLE_ATLAS[title].bounds,points:TK.BATTLE_ATLAS[title].points,landmarks:TK.BATTLES[title].atlasLandmarks,groups:TK.BATTLES[title].atlasGroups,units:TK.BATTLES[title].units,movements:TK.BATTLE_MOVEMENTS?.[title]});
const frame=(h,v)=>{const q=h.ctrl.viewport();assert(Math.abs(q.VS-v.s)<1e-9);assert(Math.abs(q.VX-v.x)<1e-7);assert(Math.abs(q.VY-v.y)<1e-7);};
(async()=>{
 let samples=0,focusChecks=0;
 for(const title of titles)for(const width of [940,335]){
  const meta=TK.BATTLE_ATLAS[title],spec=meta.viewPresentation;
  assert(spec?.views?.length&&spec.initialView,'required live metadata missing: '+title);
  const initialSpec=spec.views.find(v=>v.id===spec.initialView);assert(initialSpec,'initial ID missing: '+title);
  const before=coordinates(title),h=await make(title,width);
  try{
   const first=h.ctrl.viewport(),expected=globalView(initialSpec,title,first);frame(h,expected);assert(first.VS>1,'initial view is a detail');
   for(const t of phases){
    h.ctrl.seek(t);const truth=states(h);
    h.views()[0].onclick();assert.equal(h.ctrl.viewport().VS,1);
    h.resize(width===940?850:390);assert.equal(h.ctrl.viewport().VS,1,'manual overview survives resize');assert.equal(h.ctrl.t,t);assert.deepEqual(states(h),truth);
    const district=h.views().find(b=>b.textContent===initialSpec.name);assert(district);district.onclick();frame(h,globalView(initialSpec,title,h.ctrl.viewport()));
    h.resize(width);frame(h,globalView(initialSpec,title,h.ctrl.viewport()));assert.equal(h.ctrl.t,t);assert.deepEqual(states(h),truth);
    const target=h.ctrl.unitStates().find(u=>u.visible&&u.screenPoint);assert(target,'a visible troop remains selectable');h.ctrl.select(target.id);
    const header=h.stage.selection.querySelector('.atlas-selection-header'),focus=header.children.find(e=>e.textContent==='この周辺を見る');assert(focus);focus.onclick();const focused=h.ctrl.viewport();
    h.resize(width===940?900:360);assert(h.views().some(b=>b.textContent==='選択部隊の周辺'));assert(h.ctrl.viewport().VS>=focused.VS);assert.equal(h.ctrl.t,t);assert.deepEqual(states(h),truth);assert(h.ctrl.testSelected()!=null);
    h.views()[0].onclick();h.resize(width);assert.equal(h.ctrl.viewport().VS,1,'return to overview stays chosen');assert.deepEqual(states(h),truth);samples++;focusChecks++;
   }
   assert.equal(coordinates(title),before,'display operations never rewrite inputs');rows.push({title,width,initialScale:first.VS,phases:phases.length});
  }finally{h.ctrl.destroy();}
 }
 // Two-item navigation is a fixture only: use the real declared view and points,
 // restrict the cloned recorded groups to one so automatic districts cannot mask pruning.
 const original='関ヶ原の戦い',title='declared-one-view-fixture',sc=simple(TK.BATTLES[original]),meta=simple(TK.BATTLE_ATLAS[original]);
 sc.title=title;sc.atlasGroups=sc.atlasGroups.slice(0,1);meta.viewPresentation.views=meta.viewPresentation.views.filter(v=>v.id===meta.viewPresentation.initialView);
 TK.BATTLES[title]=sc;TK.BATTLE_ATLAS[title]=meta;
 const h=await make(title,940);try{assert.equal(h.views().length,2,'overview plus one declared district survives pruning');assert(h.ctrl.viewport().VS>1);h.views()[0].onclick();h.resize(850);assert.equal(h.ctrl.viewport().VS,1);}finally{h.ctrl.destroy();delete TK.BATTLES[title];delete TK.BATTLE_ATLAS[title];}
 const local=await make('設楽原の戦い',940);try{local.ctrl.seek(50);assert(local.ctrl.testBoxes().some(b=>b.label),'local full extent keeps readable commander names');}finally{local.ctrl.destroy();}
 console.log('PASS: '+JSON.stringify({samples,focusChecks,rows,twoViewRetention:true,liveMetadata:true,geographyAndTimeUnchanged:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
function globalView(spec,title,{W,H}){
 // make installs the production atlas API into this fixture's context. Its pure
 // helper is reachable through the shared fixture's c (no source replacement).
 return fixtureApi().landmarkView(spec,TK.BATTLES[title],TK.BATTLE_ATLAS[title],W,H);
}
function fixtureApi(){return atlasContext.window.TKBattleAtlas;}
