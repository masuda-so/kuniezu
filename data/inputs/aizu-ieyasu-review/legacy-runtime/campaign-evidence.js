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
