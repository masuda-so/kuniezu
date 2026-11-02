"use strict";
(function(){
 TK.RESEARCH_SOURCES.imagawaDeparture={author:'愛知県・愛知県観光協会',title:'戦国武将観光パンフレット',url:'https://aichinow.pref.aichi.jp/show/data/guidebook/301/0/',locator:'今川義元の進軍ルート・永禄3年5月12日',accessed:'2026-11-01',scope:'駿府出陣日の通説を採用。各隊の逐日位置を確定する資料ではない。'};
 TK.RESEARCH_SOURCES.ishiyamaOpening={author:'大阪市立図書館',title:'大阪の歴史 9月13日',url:'https://www.oml.city.osaka.lg.jp/key/0913.html',locator:'1570年 石山本願寺勢が14日にかけて信長の陣を攻撃',scope:'石山合戦開始の旧暦日。',accessed:'2026-11-01'};
 const ishiyama=TK.HIST.find(e=>e.title==='石山合戦はじまる');if(ishiyama){ishiyama.d=TK.lunarDate(1570,9,13);ishiyama.source=TK.RESEARCH_SOURCES.ishiyamaOpening.url;ishiyama.text='本願寺勢が織田信長の陣を攻撃し、石山合戦が始まった。戦いは長期に及ぶ。';TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);}
 TK.SCEN.s1570.start=TK.lunarDate(1570,9,13);
 TK.SCEN.s1585.lead='羽柴秀吉は紀州を攻め、四国の長宗我部元親にも大軍を向ける構え。東では徳川家康が五か国を治め、信濃の真田昌幸は徳川・北条と対立する。九州では島津が大友を圧迫し、奥州では伊達政宗が家督を継いだ。';
 TK.SCEN.s1592.lead='豊臣秀吉は肥前名護屋に出兵の拠点を整え、諸大名に朝鮮への出兵を命じた。小西行長・加藤清正らが海を渡る準備を進め、朝鮮では李舜臣が水軍を整える。';
 TK.SCEN.s1560.title='桶狭間への進軍';
 TK.SCEN.s1575.lead='武田勝頼が長篠城を包囲し、医王寺山に本陣を置く。織田・徳川の援軍が救援へ向かい、設楽原での対陣へと進む。';
 TK.SCEN.s1575.title='長篠城の攻防';TK.SCEN.s1575.start=TK.lunarDate(1575,5,8);
 TK.SCEN.s1582.start=TK.lunarDate(1582,6,1);
 TK.SCEN.s1600.title='関ヶ原への道';TK.SCEN.s1600.start=TK.lunarDate(1600,6,16);
 TK.RESEARCH_SOURCES.nagashinoOpening={author:'新城市長篠城址史跡保存館',title:'展示解説',url:'https://www.city.shinshiro.lg.jp/mokuteki/shisetu/shiryokan/nagashinojyoshi/tenjikaisetsu.html',locator:'天正3年5月8日、勝頼が長篠城を包囲',accessed:'2026-11-01',scope:'包囲開始と本戦5月21日を区別。'};
 TK.RESEARCH_SOURCES.aizuDeparture={author:'大田原市',title:'慶長5年、那須の緊張',url:'https://www.city.ohtawara.tochigi.jp/docs/2020122100011/file_contents/all.pdf',locator:'6月16日家康大坂発、7月24日小山着',accessed:'2026-11-01',scope:'会津征伐の開始日。'};
 const isYoshimoto=u=>u.until==='桶狭間の戦い'&&(u.commanders||u.gens.map(id=>G.gen(id)?.n)).includes('今川義元');
 const approach=new WeakMap(),approachLine=u=>{if(!approach.has(u)){const site=G.YOSHO.find(y=>y.n==='沓掛城'),A=site?[site.x,site.y]:G.PJ(137.021826,35.068987);approach.set(u,G.visualBetween(A,G.PJ(136.967,35.058)));}return approach.get(u);};
 const previousArrival=G.battleArrivalPoint;G.battleArrivalPoint=function(u){if(isYoshimoto(u)){const y=G.YOSHO.find(y=>y.n==='沓掛城');return y?[y.x,y.y]:G.PJ(137.021826,35.068987);}return previousArrival(u);};
 const oldPoint=G.historyPoint,oldGeometry=G.historyGeometry,phase=G.marchPhase;
 const finalApproach=u=>isYoshimoto(u)&&u.schedule&&G.visualTime()>u.schedule.end;
 G.historyPoint=function(u){if(finalApproach(u)){const end=G.evT(TK.HIST.find(e=>e.title==='桶狭間の戦い'&&e.k!=='premarch'));return G.visualPathPoint(approachLine(u),(G.visualTime()-u.schedule.end)/Math.max(1,end-u.schedule.end));}return oldPoint(u);};
 G.historyGeometry=u=>finalApproach(u)?approachLine(u):oldGeometry(u);
 G.marchPhase=u=>finalApproach(u)?{key:'march',name:'行軍中'}:phase(u);
 const destination=G.marchDestination;G.marchDestination=u=>finalApproach(u)?'桶狭間':u.until==='長篠の戦い'&&u.gens.some(id=>G.gen(id)?.n==='武田勝頼')?'医王寺山・長篠城包囲陣':destination(u);
 const nagashinoPoint=()=>G.PJ(137.5598,34.9280),arrival=G.battleArrivalPoint;G.battleArrivalPoint=function(u){if(u.until==='長篠の戦い'&&u.gens.some(id=>G.gen(id)?.n==='武田勝頼'))return nagashinoPoint();return arrival(u);};
 const hp=G.historyPoint;G.historyPoint=function(u){if(u.until==='長篠の戦い'&&u.schedule&&G.visualTime()>=u.schedule.end&&u.gens.some(id=>G.gen(id)?.n==='武田勝頼'))return [...nagashinoPoint(),null];return hp(u);};
 TK.RESEARCH_SOURCES.nagashinoHQ={author:'新城市',title:'医王寺山 武田勝頼本陣跡',url:'https://www.city.shinshiro.lg.jp/kanko/meisyo/takedakatsuyori.html',locator:'長篠城の約600m北方、標高約120m',scope:'包囲時の本陣所在地。地図上は相対位置による概略。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.nagashinoArchives={author:'国立公文書館',title:'長篠の戦い',url:'https://www.archives.go.jp/exhibition/digital/ieyasu/contents1_06/',locator:'天正3年5月の長篠包囲・同月21日の本戦',scope:'包囲と本戦の時期。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.nagashinoShift={author:'新城市設楽原歴史資料館',title:'設楽原布陣図',url:'https://www.city.shinshiro.lg.jp/mokuteki/shisetu/shiryokan/shitaragahara/fujinzu.html',locator:'医王寺山から清井田・才ノ神への移陣',scope:'移陣の順序。点間の細かな通過線・再生配分は模式表現。医王寺山は長篠城の約600m北方を概略表示。',accessed:'2026-11-01'};
 TK.BATTLE_MOVEMENTS['長篠の戦い']=[{name:'武田勝頼',from:0,to:20,points:[[137.5598,34.9280],[137.533,34.93]],source:'nagashinoShift'}];
 const eventTime=G.visualEventTime;G.visualEventTime=e=>e.title==='長篠の戦い'&&e.who==='武田勝頼'?G.evT({d:TK.lunarDate(1575,5,8)}):eventTime(e);
 const schedule=G.scheduleHistorical;G.scheduleHistorical=function(u){if(u.until==='長篠の戦い'&&u.gens.some(id=>G.gen(id)?.n==='武田勝頼')){u.arrive=TK.lunarDate(1575,5,8);if(u.schedule)u.schedule.end=G.evT({d:u.arrive});}return schedule(u);};
 TK.SCEN.s1560.openingDate=TK.lunarDate(1560,5,12);
 TK.SCEN.s1560.lead='永禄三年五月十二日、今川義元が駿府を出陣。尾張へ向かう今川軍と、迎え撃つ織田家の動向を追う。';
 const catalog=G.buildBattleCatalog;G.buildBattleCatalog=function(){
  catalog();
  for(const sc of Object.values(TK.BATTLES))sc.sources=[...new Set([...(sc.sources||[]),...(TK.BATTLE_MOVEMENTS[sc.title]||[]).map(m=>m.source)])];
  const sc=TK.BATTLES['長篠の戦い'];
  if(sc){
   sc.date='天正三年五月八日～二十一日（1575年）';
   sc.sources=[...new Set([...sc.sources,'nagashinoOpening','nagashinoHQ','nagashinoArchives'])];
   sc.calendar=[[0,'五月八日・長篠城の包囲陣'],[20,'設楽原へ移陣'],[35,'五月二十一日・交戦'],[85,'武田勢の後退'],[100,'戦闘終了']];
   sc.beats=[[0,'勝頼は長篠城を包囲し、医王寺山に本陣を置く。'],[20,'織田・徳川の救援軍に対し、勝頼は設楽原へ本陣を移す。',['katsuyori']],[35,'両軍が交戦し、武田勢は織田・徳川方の陣へ攻めかかる。'],[65,'織田・徳川方は馬防柵と鉄砲を用いて武田勢の攻撃を防ぐ。'],[85,'武田方は多くの将兵を失い、後退する。'],[100,'長篠城の包囲は解かれ、織田・徳川方の勝利に終わる。']];
   sc.mapVisibleFrom={};
   for(const g of sc.atlasGroups||[])for(const id of g.members)sc.mapVisibleFrom[id]=id==='katsuyori'||/長篠城|城内/.test(g.label)?0:20;
  }
  for(const row of TK.BATTLE_AUDIT||[])row.sourceIds=TK.BATTLES[row.title]?.sources||row.sourceIds;
 };
 const geometryVersion=18,set=G.setS;
 G.setS=function(s){const result=set(s);if(!s||s.movementGeometryVersion===geometryVersion)return result;
  G._inSimulation=true;
  try{
   for(const u of s.units){
    if(!u.hist||u.record||!u.path?.length)continue;
    if(u.until==='#hold'&&!u.historyTitle){const names=u.commanders||u.gens.map(id=>G.gen(id)?.n),matches=TK.HIST.filter(e=>e.hold&&e.k!=='premarch'&&G.evT(e)===u.schedule?.end&&names.includes(e.marchWho||e.who));if(matches.length===1)u.historyTitle=matches[0].title;}
    const returning=u.histRet||u.state==='return',old=u.visualTravel,A=old?.line?.[0]||G.C[u.path[0]]&&[G.C[u.path[0]].x,G.C[u.path[0]].y],C=G.C[u.path.at(-1)];
    if(!returning)G.scheduleHistorical(u);
    if(!A||!C)continue;
    const B=returning?[C.x,C.y]:G.battleArrivalPoint(u)||[C.x,C.y];
    if(returning&&!old)u._visualRouteKey=null;
    if(old||u.schedule&&!returning)u.visualTravel={line:G.historyTravelLine(u,A,B),start:old?.start??u.schedule.start,end:returning?old.end:u.schedule?.end??old.end};
   }
   for(const g of s.gens){
    if(g.tr){const a=g.tr.line?.[0]||G.C[g.tr.p?.[0]]&&[G.C[g.tr.p[0]].x,G.C[g.tr.p[0]].y],b=g.tr.line?.at(-1)||G.C[g.tr.p?.at(-1)]&&[G.C[g.tr.p.at(-1)].x,G.C[g.tr.p.at(-1)].y];if(a&&b)g.tr.line=G.visualBetween(a,b);else g.tr=null;}
    const p=G.personPoint(g);if(p)g._visualPoint=p.slice(0,2);
   }
   s.movementGeometryVersion=geometryVersion;
  }finally{G._inSimulation=false;}
  return result;
 };
 const init=G.newGame;G.newGame=function(id,player){const s=init(id,player),date=TK.SCEN[id]?.openingDate;if(date){const end=G.evT({d:date}),owner=s.player;s.player='__none';while(s.t<end)G.day();s.player=owner;for(const q of ['sceneQ','evQ','battleQ','observerQ'])s[q]=[];G._inSimulation=true;try{G.trackContinuousMoves();}finally{G._inSimulation=false;}}s.movementGeometryVersion=geometryVersion;return s;};
})();

G.installIeyasu1600Itinerary?.();
