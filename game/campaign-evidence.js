"use strict";
/* 出発・到着の記録と、未確認の通過経路を分ける。表示軍は実在武将の能力を捏造しない。 */
(function(){
const src=TK.RESEARCH_SOURCES;
src.ieyasuReturn={author:'国立公文書館',title:'桶狭間の戦い／徳川家康関係年表',year:'2018',url:'https://www.archives.go.jp/exhibition/digital/ieyasu/contents1_03/',locator:'大高城から大樹寺、岡崎城への帰還',accessed:'2026-10-31',scope:'大高への兵糧搬入、大樹寺への退却、岡崎入城。中間の通過道と時刻は未確定。'};
src.ieyasuDates={author:'国立公文書館',title:'徳川家康 関係年表',year:'2018',url:'https://www.archives.go.jp/exhibition/digital/ieyasu/history.html',locator:'永禄3年5月19日・23日',accessed:'2026-10-31',scope:'桶狭間と岡崎入城の区別。入城は清洲同盟の成立を意味しない。'};
src.eirokuStudy={author:'国際日本文化研究センター',title:'ルイス・フロイス『日本史』を読みなおす④',year:'2023',url:'https://kutsukake.nichibun.ac.jp/obunsiryo/essay/20230118/',locator:'永禄の変をめぐる記述',accessed:'2026-10-31',scope:'事件を記す史料の批判。攻撃側の通過街道・一万という兵数の実数は未確定。'};
const dt=(y,m,d)=>TK.lunarDate(y,m,d),end=title=>TK.HIST.find(e=>e.title===title&&e.k!=='premarch').d;
const records=[
 {id:'motoyasu',title:'松平元康、岡崎に入る',clan:'imagawa',names:['松平元康'],troops:0,from:'okazaki',to:'okazaki',start:dt(1560,5,18),end:dt(1560,5,23),depart:dt(1560,5,19),track:[[136.94,35.07],[137.1626,34.982],[137.1589,34.9563]],source:['ieyasuReturn','ieyasuDates'],note:'大高→大樹寺→岡崎の順序を表示。大高の在陣開始日は合戦前日の表示用仮置き。大樹寺の入寺日・間道と兵数は未確定。移動線は地点を結ぶ概略。',destination:'岡崎城（大高城・大樹寺を経る）'},
 {id:'okawachi',title:'大河内城の戦い',clan:'oda',names:['織田信長'],troops:50000,from:'gifu',to:'kiriyama',start:dt(1569,8,20),end:end('大河内城の戦い'),stops:[[dt(1569,8,20),136.782,35.434],[dt(1569,8,23),136.496,34.647],[dt(1569,8,26),136.496,34.647],[dt(1569,8,27),136.477,34.543]],source:['okawachi'],note:'岐阜20日→木造23日→26日出発→桂瀬山27日の記録。地点間の実街道は未復元、陣の座標は地名の概略位置。兵数5万は伝承値。',destination:'桂瀬山の陣（大河内城包囲）'},
 {id:'eiroku',title:'永禄の変',clan:'miyoshi',names:['三好義継','三好長逸','三好宗渭','岩成友通','松永久通'],troops:0,from:'kyo',to:'kyo',start:end('永禄の変'),end:end('永禄の変'),point:[135.757,35.022],source:['eirokuStudy'],note:'襲撃当日の御所付近で表示。出発地・街路・正確な兵数は未確認。松永久秀本人の行軍と混同しない。',destination:'二条御所（襲撃当日の位置表示）'},
 {id:'iwaya',title:'岩屋城の戦い',clan:'shimazu',names:['島津方攻城軍'],troops:0,from:'tachibana',to:'tachibana',start:end('岩屋城の戦い'),end:end('岩屋城の戦い'),point:[130.523,33.528],source:['iwaya','iwayaVariant'],note:'登録された落城日に筑前岩屋城付近で表示。4万／5万の異説があるため兵数を固定しない。事前行軍の道筋と日程は未照合。立花山城や美作岩屋城とは別の城。',destination:'筑前岩屋城（位置は城跡付近）'},
 {id:'tanabe',title:'田辺城の戦い',clan:'ishida',names:['小野木重次','織田信包','前田茂勝'],troops:15000,from:'tango',to:'tango',start:dt(1600,7,21),end:dt(1600,9,12),point:[135.328,35.445],source:['tanabeDates','tanabe'],note:'攻城側の城外での在陣を表示。参陣地点・個々の出発日は未確認。15,000は全軍の伝承値。3将それぞれに15,000を加算しない。',destination:'丹後田辺城（包囲中）'}
];
TK.DOCUMENTED_MARCHES=records;
function position(r,t){const proj=p=>G.PJ(...p);if(r.point)return [...proj(r.point),null];
 if(r.stops){let i=0;while(i<r.stops.length-2&&t>G.evT({d:r.stops[i+1][0]}))i++;const a=r.stops[i],b=r.stops[i+1],f=Math.max(0,Math.min(1,(t-G.evT({d:a[0]}))/Math.max(1,G.evT({d:b[0]})-G.evT({d:a[0]}))));const A=proj(a.slice(1)),B=proj(b.slice(1));return [A[0]+(B[0]-A[0])*f,A[1]+(B[1]-A[1])*f,Math.atan2(B[1]-A[1],B[0]-A[0])];}
 const points=r.track.map(proj),p=Math.max(0,Math.min(1,(t-G.evT({d:r.depart}))/Math.max(1,G.evT({d:r.end})-G.evT({d:r.depart}))));
 const ls=points.slice(1).map((v,i)=>Math.hypot(v[0]-points[i][0],v[1]-points[i][1]));let d=p*ls.reduce((a,b)=>a+b,0),i=0;while(i<ls.length-1&&d>ls[i])d-=ls[i++];const a=points[i],b=points[i+1],f=d/(ls[i]||1);return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[1]-a[1],b[0]-a[0])];
}
G.documentedArmies=function(){const s=G.S();return records.filter(r=>s.t>=G.evT({d:r.start})&&s.t<=G.evT({d:r.end})).map(r=>({id:'documented:'+r.id,clan:r.id==='motoyasu'&&s.clans.tokugawa?.alive?'tokugawa':r.clan,gens:[],commanders:r.names,troops:r.troops,troops0:r.troops,morale:85,train:70,food:1,path:[r.from,r.to],seg:0,pos:0,state:r.point||(r.depart&&s.t<G.evT({d:r.depart}))?'camp':r.stops&&s.t>=G.evT({d:r.stops.at(-1)[0]})?'camp':'march',mission:'show',hist:true,origin:r.from,until:r.title,routeNote:r.note,record:r}));};
const hp=G.historyPoint,geom=G.historyGeometry,dest=G.marchDestination;
G.historyPoint=u=>u.record?position(u.record,G.S().t):hp(u);
G.historyGeometry=u=>u.record?u.record.point?null:(u.record.track||u.record.stops.map(x=>x.slice(1))).map(p=>G.PJ(...p)):geom(u);
G.marchDestination=u=>u.record?u.record.destination:dest(u);
G.documentedPerson=n=>n==='松平元康'&&G.documentedArmies().some(u=>u.record.id==='motoyasu');
G.visibleNativeArmies=()=>G.S().units.filter(u=>!u.gens.length||!u.gens.every(id=>G.documentedPerson(G.gen(id)?.n)));
const castleGens=G.castleGens;G.castleGens=id=>castleGens(id).filter(g=>!G.documentedPerson(g.n));
const back=TK.HIST.find(e=>e.title==='松平元康、岡崎に入る');back.d=dt(1560,5,23);back.source=src.ieyasuDates.url;back.text='桶狭間後、大高城から大樹寺を経た元康が、今川勢の退去した岡崎城へ旧暦5月23日に入る。織田との同盟はまだ成立していない。';
// この軍勢は時点記録で表示するので、自動の最短路出陣を重ねない。
for(const title of records.map(r=>r.title)){const ev=TK.HIST.find(e=>e.title===title&&e.k!=='premarch');if(ev)ev.documentedMarch=true;}
})();

/* 家康1600年：確定日付の所在を結び、区間内の道筋・時刻配分は参考経路とする。 */
(function(){
 const sources=TK.RESEARCH_SOURCES,dt=(m,d)=>TK.lunarDate(1600,m,d);
 sources.ieyasu1600Chronology={author:'大田原市',title:'慶長5年、那須の緊張',url:'https://www.city.ohtawara.tochigi.jp/docs/2020122100011/file_contents/all.pdf',locator:'2021年1月号4頁：6月16日大坂発、7月2日江戸入城、7月24日小山着',accessed:'2026-11-02',scope:'出発・到着の記録。全経由地の毎日の位置ではない。'};
 sources.ieyasu1600Return={author:'栃木県立博物館',title:'徳川家康が下野にやってきた！',url:'https://www.muse.pref.tochigi.lg.jp/exhibition/thema/ieyasu/ieyasu.html',locator:'資料8・伊達政宗宛家康書状写『三光録』：8月5日の江戸帰城報告',accessed:'2026-11-02',scope:'江戸帰城の確認。帰路の全通過点・船路は確定しない。'};
 sources.ieyasu1600West={author:'戦国時代勢力図と各大名の動向',title:'1600年 関ヶ原の戦いまでの流れ（後半）',url:'https://sengokumap.net/history/1600-2/',locator:'7月30日宇都宮、9月1日江戸発～11日清須。慶長年中卜斎記などを引用する編年',accessed:'2026-11-02',scope:'編年の二次整理。地点間の経路と日内の進捗は推定。引用原史料の全画像照合とは区別。'};
 sources.ieyasu1600EdoDeparture={author:'白峰旬／別府大学',title:'フィクションとしての小山評定―家康神話創出の一事例',year:'2012',url:'https://repo.beppu-u.ac.jp/modules/xoonips/download.php/gk01404.pdf?file_id=6757',locator:'注19：7月21日付松井康之・有吉立行宛細川忠興書状を根拠とする家康の江戸出陣日',accessed:'2026-11-02',scope:'江戸出陣日の照合。小山の軍議の実在・内容は別に議論される。'};
 const points={osaka:[135.526,34.687],fushimi:[135.781,34.938],edo:[139.752,35.685],oyama:[139.800,36.315],utsunomiya:[139.883,36.555],odawara:[139.153,35.250],sunpu:[138.383,34.976],kakegawa:[138.014,34.775],hamamatsu:[137.725,34.711],okazaki:[137.159,34.956],kiyosu:[136.839,35.217],akasaka:[136.577,35.389],sekigahara:[136.490,35.361]};
 // 無日付の経由点は日付付き所在とは別配列に保持する。
 const rows=[
  {date:dt(6,16),place:'大坂',point:points.osaka,via:[points.fushimi,points.kiyosu,points.okazaki,points.hamamatsu,points.kakegawa,points.sunpu,points.odawara]},
  {date:dt(7,2),place:'江戸',point:points.edo},
  {date:dt(7,21),place:'江戸出陣',point:points.edo},
  {date:dt(7,24),place:'小山',point:points.oyama},
  {date:dt(7,25),place:'小山',point:points.oyama},
  {date:dt(7,30),place:'宇都宮方面',point:points.utsunomiya},
  {date:dt(8,5),place:'江戸',point:points.edo},
  {date:dt(9,1),place:'江戸出陣',point:points.edo,via:[points.odawara,points.sunpu,points.kakegawa,points.hamamatsu,points.okazaki]},
  {date:dt(9,11),place:'清須',point:points.kiyosu},
  {date:dt(9,14),place:'赤坂',point:points.akasaka},
  {date:dt(9,15),place:'関ヶ原',point:points.sekigahara}
 ];
 const lunarStops=[[6,16],[7,2],[7,21],[7,24],[7,25],[7,30],[8,5],[9,1],[9,11],[9,14],[9,15]],stopSources=['ieyasu1600Chronology','ieyasu1600Chronology','ieyasu1600EdoDeparture','aizuTurn','aizuTurn','ieyasu1600West','ieyasu1600Return','tono1600','ieyasu1600West','ieyasu1600West','ieyasuJinba'];
 rows.forEach((r,i)=>{r.lunar=[1600,...lunarStops[i]];r.sourceIds=[stopSources[i]];r.precision='place-representative';r.intervalGeometry='estimated-road-reference';});
 TK.IEYASU_1600_ITINERARY={rows,sources:[...new Set(stopSources)],scope:'所在地の代表点と日程。無日付経由点・区間内速度・帰路は参考経路。'};
 const event=TK.HIST.find(e=>e.title==='会津征伐');if(event){event.d=dt(6,16);event.at='ishiyama';delete event.site;event.documentedMarch=true;event.source=sources.ieyasu1600Chronology.url;}
 TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);
 const oyama=TK.HIST.find(e=>e.title==='小山評定');if(oyama){oyama.d=dt(7,25);delete oyama.site;oyama.marchStart=dt(6,16);oyama.routeVia=['ishiyama','kyo','kiyosu','okazaki','hikuma','kakegawa','sunpu','odawara','edo','utsunomiya'];}
 const seki=TK.HIST.find(e=>e.title==='関ヶ原の戦い'&&e.k!=='premarch');if(seki)seki.routeVia=['edo','odawara','sunpu','kakegawa','hikuma','okazaki','kiyosu','gifu'];
 TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);
 const isUnit=u=>u?.hist&&!G.isHistoryReturning(u)&&['小山評定','関ヶ原の戦い'].includes(u.until||u.historyTitle)&&(u.commanders||u.gens?.map(id=>G.gen(id)?.n)||[]).includes('徳川家康');
 const time=r=>G.evT({d:r.date}),inPeriod=()=>G.visualTime()>=time(rows[0])&&G.visualTime()<=time(rows.at(-1));
 const lines=new Map();let state;
 function leg(){const t=G.visualTime();let i=0;while(i<rows.length-2&&t>time(rows[i+1]))i++;return {a:rows[i],b:rows[i+1],i,t};}
 function geometry(i){if(state!==G.S()){state=G.S();lines.clear();}if(lines.has(i))return lines.get(i);const a=rows[i],b=rows[i+1],ps=[a.point,...(a.via||[]),b.point].map(p=>G.PJ(...p)),line=[];for(let j=1;j<ps.length;j++){const part=G.visualBetween(ps[j-1],ps[j]);line.push(...part.slice(line.length?1:0));}lines.set(i,line);return line;}
 G.installIeyasu1600Itinerary=function(){
 const scheduled=G.scheduleHistorical;
 G.scheduleHistorical=function(u){if(isUnit(u)&&inPeriod()){const key=u.until||u.historyTitle;if(u.ieyasu1600RouteKey!==key){const ev=TK.HIST.find(e=>e.title===key&&e.k!=='premarch'),via=ev?.routeVia||[],path=[];for(let i=1;i<via.length;i++){const part=G.findPath(via[i-1],via[i],u.clan,'any');if(!part)return scheduled(u);path.push(...part.slice(path.length?1:0));}if(path.length>1){u.path=path;u.origin=path[0];u.seg=0;u.pos=0;u.depart=key==='小山評定'?dt(6,16):dt(9,1);u.arrive=key==='小山評定'?dt(7,24):dt(9,15);u.schedule=null;u.visualTravel=null;u.ieyasu1600RouteKey=key;u.routeSourceIds=TK.IEYASU_1600_ITINERARY.sources;}}}return scheduled(u);};
 const setState=G.setS;G.setS=function(s){const previous=s?.movementGeometryVersion,ret=setState(s);if(s&&previous!=null&&previous<17){const legacyDate=e=>e.title==='会津征伐'?[1600,7,25]:e.title==='小山評定'?[1600,8,29]:e.d;const legacy=TK.HIST.slice().sort((a,b)=>{const x=legacyDate(a),y=legacyDate(b);return(x[0]-y[0])*400+(x[1]-y[1])*32+x[2]-y[2];});const pm={};for(const [key,v]of Object.entries(s.pm||{})){const e=legacy[+key],i=TK.HIST.indexOf(e);if(i>=0)pm[i]=v;}s.pm=pm;const next=TK.HIST.findIndex(e=>G.evT(e)>s.t);s.hi=next<0?TK.HIST.length:next;s.sites=(s.sites||[]).filter(p=>!(p.y===1600&&(['小山','下野','白河口'].includes(p.n)||p.n==='大坂'&&p.at==='ishiyama'&&p.t===time(rows[0]))));}return ret;};
 const history=G.hist;G.hist=function(){history();const s=G.S();s.sites=(s.sites||[]).filter(p=>!(p.y===1600&&['小山','下野','白河口'].includes(p.n)));let seen=false,removed=0;s.chron=s.chron.filter(c=>{if(c.title!=='小山評定'||!c.ok)return true;if(seen){removed++;return false;}seen=true;return true;});if(removed)s.hOk=Math.max(0,(s.hOk||0)-removed);};
 const armies=G.documentedArmies,native=G.visibleNativeArmies;
 const record={id:'ieyasu1600',title:'徳川家康の東下と西上',source:TK.IEYASU_1600_ITINERARY.sources,note:TK.IEYASU_1600_ITINERARY.scope};
 G.documentedArmies=function(){const out=armies();if(!inPeriod())return out;const {a,b,t}=leg();out.push({id:'documented:ieyasu1600',clan:'tokugawa',gens:[],commanders:['徳川家康'],troops:0,morale:85,train:70,path:['ishiyama','edo'],origin:'ishiyama',seg:0,pos:0,state:t>=time(rows.at(-1))||a.point[0]===b.point[0]&&a.point[1]===b.point[1]?'camp':'march',mission:'show',hist:true,until:t<=time(rows[4])?'小山評定':'関ヶ原の戦い',record,routeSourceIds:record.source,routeNote:record.note});return out;};
 G.visibleNativeArmies=function(){const out=native();if(!inPeriod())return out;return out.flatMap(u=>{if(!isUnit(u))return [u];const gens=u.gens.filter(id=>G.gen(id)?.n!=='徳川家康');return gens.length?[{...u,gens}]:[];});};
 const point=G.historyPoint,geo=G.historyGeometry,phase=G.marchPhase,destination=G.marchDestination;
 G.historyPoint=u=>{if(!isUnit(u)||!inPeriod())return point(u);const {a,b,i,t}=leg(),f=Math.max(0,Math.min(1,(t-time(a))/Math.max(1,time(b)-time(a))));return G.visualPathPoint(geometry(i),f,true);};
 G.historyGeometry=u=>isUnit(u)&&inPeriod()?geometry(leg().i):geo(u);
 G.marchPhase=u=>{if(!isUnit(u)||!inPeriod())return phase(u);if(G.visualTime()>=time(rows.at(-1)))return {key:'camp',name:'関ヶ原着陣'};const {a,b}=leg();return a.point[0]===b.point[0]&&a.point[1]===b.point[1]?{key:'camp',name:a.place+'在陣'}:{key:'march',name:'行軍中'};};
 G.marchDestination=u=>isUnit(u)&&inPeriod()?leg().b.place:destination(u);
 };
})();
