"use strict";
/* 出典付きの行軍の追補。TK.DOCUMENTED_MARCHES（campaign-evidence.js）へ記録を足す。
   日付は出典にある日だけを停止点・出発・到着に使い、途中の経由点（track）は日付を持たない代表点とする。
   線形：経由点の間は道路網に沿わせるが、遠回りが直線の1.6倍を超える区間と海を渡る区間（seaLegs）は直線で結ぶ。
   移動の上書き（movement-display.js・kizakibaru-march.js）より後に読み込む。 */
(function(){
 const dt=(y,m,d)=>TK.lunarDate(y,m,d);
 Object.assign(TK.RESEARCH_SOURCES,{
  igagoeArchives:{author:'国立公文書館',title:'本能寺の変｜徳川家康ー将軍家蔵書からみるその生涯ー',url:'https://www.archives.go.jp/exhibition/digital/ieyasu/contents1_07/',locator:'天正10年6月2日に堺で変を知り、伊賀経由で帰国、6月4日に岡崎城へ到着',accessed:'2026-11-03',scope:'出発・到着の日付と伊賀経由であること。途中の宿泊地・日付は記載なし。'},
  igagoeMie:{author:'三重県環境生活部文化振興課（海津裕子）',title:'県史あれこれ「家康の『伊賀越え』と甲賀・伊賀者」',year:'1991',url:'https://www.bunka.pref.mie.lg.jp/rekishi/kenshi/asp/arekore/detail66.html',locator:'堺→南山城→近江信楽付近→伊賀丸柱→鈴鹿の山を越え伊勢へ。渡海地は白子・若松説と長太浦・四日市説',accessed:'2026-11-03',scope:'経由の順序。渡海地は確定できないと明記。供は30人余り。'}
 });
 const records=TK.DOCUMENTED_MARCHES;if(!records)return;
 records.push({id:'igagoe',title:'伊賀越え',clan:'tokugawa',names:['徳川家康','本多忠勝'],troops:30,from:'ishiyama',originName:'和泉国堺',to:'okazaki',
  start:dt(1582,6,2),depart:dt(1582,6,2),end:dt(1582,6,5),arrivedDay:dt(1582,6,4),hidePerson:true,
  track:[[135.475,34.575],[135.85,34.86],[136.07,34.9],[136.165,34.84],[136.33,34.86],[136.555,34.83],[136.86,34.82],[137.163,34.957]],seaLegs:[5,6],
  source:['igagoeArchives','igagoeMie'],
  note:'堺で本能寺の変を知った家康が、供30人余りと伊賀を越えて三河へ帰った。日付が確かなのは6月2日（堺）と6月4日（岡崎着）だけ。途中の南山城・信楽付近・伊賀丸柱・鈴鹿の山越え・伊勢の渡海地は順序だけを示す代表点で、渡海地（白子・若松説と長太浦・四日市説）は確定できない。',
  destination:'三河岡崎城'});
 // 追補した記録の線形と位置。
 const lines=new WeakMap(),mine=r=>r&&records.includes(r)&&r.seaLegs;
 function line(r){if(lines.has(r))return lines.get(r);const pts=r.track.map(p=>G.PJ(...p)),out=[pts[0]];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);let seg=[a,b];if(!r.seaLegs.includes(i-1)&&G.visualBetween){const road=G.visualBetween(a,b);let L=0;for(let k=1;k<road.length;k++)L+=Math.hypot(road[k][0]-road[k-1][0],road[k][1]-road[k-1][1]);if(road.length>1&&L<=d*1.6)seg=road;}out.push(...seg.slice(1));}lines.set(r,out);return out;}
 const hp=G.historyPoint,hg=G.historyGeometry;
 G.historyGeometry=u=>mine(u?.record)?line(u.record):hg(u);
 G.historyPoint=u=>{if(!mine(u?.record))return hp(u);const r=u.record,t=G.visualTime?G.visualTime():G.S().t;return G.visualPathPoint(line(r),(t-G.evT({d:r.depart}))/Math.max(1,G.evT({d:r.end})-G.evT({d:r.depart})),true);};
 // 記録の行軍がある間は、同じ人物を城や移動中の札に重ねて出さない。
 const person=G.documentedPerson;G.documentedPerson=n=>person?.(n)||G.documentedArmies().some(u=>u.record?.hidePerson&&u.record.names.includes(n));
 if(!TK.HIST.some(e=>e.title==='伊賀越え'))TK.HIST.push({d:dt(1582,6,2),k:'note',clan:'tokugawa',who:'徳川家康',title:'伊賀越え',text:'堺で本能寺の変を知った家康は、伊賀を越えて伊勢へ抜け、海を渡って6月4日に岡崎へ帰り着いた。',source:TK.RESEARCH_SOURCES.igagoeMie.url,documentedMarch:true});
 TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);
})();
