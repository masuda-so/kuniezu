"use strict";
/* © OpenStreetMap contributors, ODbL 1.0. 現代歩行道路の比較線。1572年の道路中心線ではない。 */
TK.KIZAKIBARU_REFERENCE_ROUTE=[[130.867591,32.054126],[130.869148,32.053334],[130.869139,32.053315],[130.869158,32.053173],[130.869204,32.052785],[130.869237,32.052582],[130.869297,32.052227],[130.869297,32.052182],[130.869462,32.051067],[130.869502,32.050982],[130.869727,32.050689],[130.870058,32.050321],[130.870202,32.050228],[130.870561,32.050047],[130.870553,32.050021],[130.870447,32.049111],[130.870445,32.048732],[130.870452,32.047819],[130.870439,32.047246],[130.870435,32.046694],[130.870423,32.046073],[130.870423,32.046033],[130.868051,32.046071],[130.868046,32.045863],[130.867033,32.045887],[130.866466,32.045889],[130.866339,32.04589],[130.865193,32.045904],[130.86506,32.045903],[130.864785,32.045571],[130.864112,32.044679],[130.86342,32.043728],[130.863363,32.043666],[130.863296,32.043595],[130.863227,32.043521],[130.863039,32.043429],[130.862822,32.043357],[130.862674,32.043299],[130.862589,32.043205],[130.862561,32.042885],[130.862128,32.042874],[130.86202,32.042869],[130.861845,32.042861],[130.861594,32.042854],[130.861173,32.042789],[130.860914,32.042744],[130.860238,32.042535],[130.860049,32.042475],[130.859501,32.042319],[130.858952,32.042116],[130.85833,32.041879],[130.857575,32.041585],[130.857191,32.041439],[130.857105,32.041405],[130.856735,32.041265],[130.856651,32.041239],[130.856576,32.041209],[130.855605,32.04084],[130.855566,32.040827],[130.855533,32.040812],[130.855519,32.040809],[130.855488,32.040794],[130.855446,32.040774],[130.855288,32.040707],[130.855056,32.040627],[130.854553,32.040436],[130.854196,32.040295],[130.853991,32.040221],[130.853958,32.04021],[130.853925,32.0402],[130.853329,32.039973],[130.85323,32.039934],[130.852205,32.039539],[130.852126,32.039511],[130.851941,32.039443],[130.851795,32.039387],[130.851285,32.039196],[130.851152,32.039145],[130.850326,32.038825],[130.850226,32.038791],[130.850127,32.038751],[130.849638,32.038571],[130.849565,32.038543],[130.849532,32.038526],[130.848759,32.038231],[130.84846,32.038099],[130.848386,32.038077],[130.848038,32.037962],[130.847681,32.037827],[130.847641,32.037821],[130.846909,32.037576],[130.846825,32.037849],[130.846564,32.037843],[130.846252,32.03785],[130.8458,32.037893],[130.845512,32.037952],[130.845059,32.038037],[130.844554,32.038185],[130.844539,32.038306],[130.844433,32.038363],[130.844333,32.038385],[130.844168,32.038408],[130.843824,32.03847],[130.8435,32.03856],[130.84348,32.038566],[130.843051,32.038701],[130.842972,32.038735],[130.842866,32.038808],[130.842706,32.039096],[130.842443,32.039017],[130.8424,32.038979],[130.842292,32.039074],[130.841996,32.039389],[130.841782,32.039606],[130.841695,32.039693],[130.841464,32.039839],[130.841193,32.039941],[130.840782,32.040005],[130.840458,32.040017],[130.840213,32.039956],[130.840033,32.039924],[130.839748,32.039936],[130.839496,32.04],[130.839296,32.040066],[130.839071,32.040185],[130.838781,32.040392],[130.838501,32.040607],[130.838408,32.040653],[130.838284,32.040704],[130.837725,32.040766],[130.836998,32.040871],[130.83651,32.040911],[130.836021,32.040967],[130.835452,32.041012],[130.834992,32.041105],[130.834901,32.040927],[130.834114,32.040707],[130.833673,32.04058],[130.833209,32.04047],[130.832938,32.04042],[130.832661,32.040361],[130.832043,32.040911],[130.831818,32.041095],[130.831654,32.041196],[130.831471,32.041295],[130.831243,32.041382],[130.831048,32.041436],[130.830902,32.041454],[130.830809,32.041461],[130.830659,32.04145],[130.830549,32.041429],[130.830393,32.041418],[130.830148,32.041429],[130.83012518518,32.041051361571]];
"use strict";
/* 木崎原：確認した出発拠点と交戦地を、その日の表示時間内で結ぶ。
 * 日内の速度配分と現代比較道路は推定。史料の時刻・1572年の実測道とはしない。 */
(function(){
 const title='木崎原の戦い',id='kizakibaru-local',names=['島津忠平','島津義弘'];
 const canonical=n=>TK.PORTRAIT_ALIAS[n]||n,isPerson=g=>names.includes(g?.n);
 const date=TK.lunarDate(1572,5,4),next=TK.lunarDate(1572,5,5);
 const origin=[130.867591,32.054126],field=[130.83012518518,32.041051361571];
 const source='shimazuIinoResidence',routeSource='kizakibaruModernRoute';
 TK.RESEARCH_SOURCES.iinoMapPoint={author:'人文学オープンデータ共同利用センター（CODH）',title:'日本歴史地名大系 施設・地点項目・宮崎県一覧',url:'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/46/index.html',locator:'飯野城跡・460000138600',scope:'CC BY 4.0。東経130.867591・北緯32.054126の代表点。城域・城門・出陣路の実測値ではない。',accessed:'2026-11-02'};
 TK.SITE_POS['木崎原']=field.slice();
 TK.RESEARCH_SOURCES[routeSource]={author:'OpenStreetMap contributors / OSRM',title:'飯野城―木崎原の現代歩行道路比較',url:'https://routing.openstreetmap.de/routed-foot/route/v1/driving/130.867591,32.054126;130.83012518518,32.041051361571?overview=full&geometries=geojson&steps=false&continue_straight=false',locator:'2026-11-02取得・152道路点、両端の代表点接続',scope:'ODbL 1.0。現代道路の参考線。1572年の通過線・渡河位置・出発到着時刻を確定しない。',accessed:'2026-11-02'};
 const ev=TK.HIST.find(e=>e.title===title&&e.k!=='premarch');if(ev)ev.documentedMarch=true;
 const record={id,title,clan:'shimazu',names:['島津忠平'],troops:300,from:'uchi',to:'uchi',start:date,depart:date,end:next,track:[origin,field],source:[source,'kizakiSite','iinoMapPoint',routeSource],originName:'飯野城',note:'飯野城から木崎原へ。日内の進行と通過路は、記録された順序を現代道路で補間した参考表示。',destination:'木崎原'};
 TK.DOCUMENTED_MARCHES.push(record);
 const start=()=>G.evT({d:date}),finish=()=>G.evT({d:next}),active=()=>G.S().t>=start()&&G.S().t<finish();
 const line=TK.KIZAKIBARU_REFERENCE_ROUTE.map(([lo,la])=>[(lo-TKGEO.LON0)*TKGEO.K*TKGEO.CX,(TKGEO.LAT0-la)*TKGEO.K]);
 // 22km/日は既存の表示係数。日付付きの史実観測ではなく日内補間の尺。
 const duration=()=>Math.max(.05,Math.min(.9,G.visualPathLength(line)*111.32/200/22));
 const oldBase=G.personBasePoint;
 G.personBasePoint=function(g){const y=G.kyu().y;if(isPerson(g)&&g.clan==='shimazu'&&g.loc==='uchi'&&y>=1565&&y<1590){const p=G.PJ(...origin);return {x:p[0],y:p[1]};}return oldBase?.(g);};
 // 史料による本拠のない人、移封済みの人、他の軍の位置へは干渉しない。
 const obsolete=u=>u.hist&&(u.until&&u.until!=='#hold'?u.until:u.historyTitle)===title&&(u.commanders||u.gens.map(id=>G.gen(id)?.n)).some(n=>canonical(n)===canonical('島津義弘'));
 const native=G.visibleNativeArmies;G.visibleNativeArmies=()=>native().filter(u=>!obsolete(u));
 const armies=G.documentedArmies;G.documentedArmies=function(){return armies().filter(u=>u.record?.id!==id||active()).map(u=>u.record?.id===id?{...u,state:G.visualTime()<start()+duration()?'march':'camp'}:u);};
 const point=G.historyPoint,geometry=G.historyGeometry,phase=G.marchPhase;
 G.marchPhase=u=>u.record?.id===id?(G.visualTime()<start()+duration()?{key:'march',name:'行軍中'}:{key:'camp',name:'着陣・滞陣'}):phase(u);
 G.historyPoint=u=>u.record?.id===id?G.visualPathPoint(line,(G.visualTime()-start())/duration(),true):point(u);
 G.historyGeometry=u=>u.record?.id===id?line:geometry(u);
 // 復帰も同じ道路切出し算法で接続する。地域別の経路探索は追加しない。
 TK.LOCAL_MOVEMENT_ROUTES=TK.LOCAL_MOVEMENT_ROUTES||[];TK.LOCAL_MOVEMENT_ROUTES.push({id,points:line,maxConnection:.1});
 const set=G.setS;
 G.setS=function(s){const r=set(s);if(!s||s.kizakibaruDisplayVersion===1)return r;
  // 自動生成された誤経路だけを除く。生成時に拠点兵数を引いていない表示軍である。
  const removed=s.units.filter(obsolete),ids=new Set(removed.map(u=>u.id));
  for(const g of s.gens)if(ids.has(g.unit)){const p=G.personPoint(g);g.unit=null;if(p){g._visualPoint=p.slice(0,2);const base=G.personBasePoint(g);if(base&&!active()){const l=G.visualBetween(p.slice(0,2),[base.x,base.y]);g.tr={p:[g.loc,g.loc],line:l,t0:s.t,t1:s.t+Math.max(1,Math.ceil(G.visualPathLength(l)*111.32/200/30))};}}}
  s.units=s.units.filter(u=>!ids.has(u.id));const f=G.PJ(...field);for(const site of s.sites||[])if(site.n==='木崎原'&&site.y===1572){site.x=f[0];site.y2=f[1];}s.kizakibaruDisplayVersion=1;return r;
 };
 const init=G.newGame;G.newGame=function(...args){const s=init(...args);s.kizakibaruDisplayVersion=1;return s;};
 // 合戦図は飯野からの出動を前段に置き、到達前から交戦したようにしない。
 TK.BATTLE_MOVEMENTS[title]=[{name:'島津義弘',from:0,to:25,points:TK.KIZAKIBARU_REFERENCE_ROUTE,source:routeSource,estimated:true}];
 const build=G.buildBattleCatalog;G.buildBattleCatalog=function(){build();const sc=TK.BATTLES[title];if(!sc)return;
  for(const g of sc.atlasGroups||[])if(g.point)g.point=field.slice();
  sc.sources=[...new Set([...sc.sources,source,'iinoMapPoint',routeSource])];
  const unit=sc.units.find(u=>canonical(u.g||u.n)===canonical('島津義弘'));
  sc.beats=[[0,'島津忠平（義弘）は飯野城から木崎原へ向かう。'],[25,'木崎原で伊東勢と交戦する。',unit?[unit.id]:[]],[70,'島津方の援軍も加わり、伊東勢は後退する。'],[100,'島津方の勝利に終わる。']];
  sc.calendar=[[0,'飯野城から出動'],[25,'木崎原で交戦'],[70,'伊東勢の後退'],[100,'合戦の終わり']];
 };
})();
