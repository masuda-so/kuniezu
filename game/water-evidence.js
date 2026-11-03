"use strict";
/* 水域の実在、現代の輪郭、戦国期の復元確度を分ける。 */
(function(){
 const refs={
  lakeBaseline:['国土交通省','国土数値情報 湖沼データ W09-05','2005','https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W09-2005.html','霞ヶ浦・北浦・印旛沼・手賀沼・牛久沼','現代湖岸の比較線。戦国期の干潟・入江・湖岸を復元した線ではない。'],
  hitachiEzu:['茨城大学図書館','常陸國絵図（中根家旧蔵資料）','作成年未詳','https://digitalcollection.lib.ibaraki.ac.jp/nakane/001000500097/','資料番号001000500097、請求番号95','公開画像の水路・集落の位置関係を確認。作成年代未詳のため1560年の輪郭として転写しない。'],
  kasumiHistory:['国土交通省','日本の川：霞ヶ浦','刊年未確認','https://www.mlit.go.jp/river/toukei_chousa/kasen/jiten/nihon_kawa/0302_kasumi/0302_kasumi_01.html','歴史的治水事業','利根川東遷とその後の堆積・干拓を区別。現代湖岸をそのまま戦国期としない。'],
  hamana1511:['浜松市','文化財情報vol.65','2013','https://www.city.hamamatsu.shizuoka.jp/bunkazai/info/info_65.html','栩木家文書「浜名橋之図但シ今切」（1511年）','明応地震後の今切周辺を描く史料。縮尺・投影が異なるので現代座標への直接転写は未実施。']
 };
 for(const [id,[author,title,year,url,locator,scope]] of Object.entries(refs))TK.RESEARCH_SOURCES[id]={author,title,year,url,locator,scope,accessed:'2026-10-31'};
 TK.RESEARCH_SOURCES.kasumiTransition={author:'国土交通省関東地方整備局 霞ヶ浦河川事務所',title:'霞ヶ浦の歴史・治水対策',url:'https://www.ktr.mlit.go.jp/kasumi/kasumi00771.html',locator:'霞ヶ浦の歴史・利根川東遷事業',scope:'現在に近い姿は江戸時代中期。17世紀中頃の海との連絡悪化・淡水化と、戦国期の入江を区別する。8世紀の面積2〜3倍という説明を16世紀へ転用しない。',accessed:'2026-10-31'};
 // 関東低地全体を一つの湖にしていた旧ポリゴンを取り除く。
 const {K,CX,LON0,LAT0}=TKGEO;
 // 旧塩津潟の概略輪郭は新発田城本丸まで覆う。水域名だけを残す。
 TKGEO.lakes=TKGEO.lakes.filter(([ring])=>!(ring.length===26&&ring[0]===1645.8&&ring[1]===751.4));
 TKGEO.lakes=TKGEO.lakes.filter(poly=>{const p=poly[0],xs=p.filter((_,i)=>i%2===0).map(x=>x/K/CX+LON0),ys=p.filter((_,i)=>i%2).map(y=>LAT0-y/K);return !(Math.min(...xs)>139&&Math.max(...xs)<141&&Math.max(...ys)<36.5&&Math.max(...xs)-Math.min(...xs)>1);});
 // 実在の古水域と、未検証の輪郭を分離。見沼の1629年の溜井を先取りしない。
 const historic=[
  {id:'iinuma',name:'飯沼',at:[139.947,36.13],kind:'lake',label:'飯沼（湖岸未確定）',author:'坂東市立坂東郷土館ミューズ',title:'ミューズ企画展「飯沼新田物語」',url:'https://www.city.bando.lg.jp/page/page002762.html',scope:'享保年間の干拓以前の沼。現在の3市1町にまたがる。旧表示の7頂点の輪郭は史料から復元したものではない。'},
  {id:'minuma',name:'見沼',at:[139.70,35.90],kind:'marsh',label:'見沼（沼沢地・概略）',author:'さいたま市図書館',title:'中央図書館 見沼田んぼコーナー',url:'https://www.lib.city.saitama.jp/contents?5=&pid=133',scope:'江戸初期まで沼沢地。1629年に八丁堤で溜井化。対象時代の水面範囲は未確定で、溜井完成形として表示しない。'},
  {id:'tsubaki',name:'椿海',at:[140.60,35.74],kind:'lake',label:'椿海（湖岸未確定）',author:'千葉県海匝農業事務所',title:'干潟干拓の歴史',url:'https://www.pref.chiba.lg.jp/ap-kaisou/kaisou/kibanseibi/higata.html',scope:'1670年の干拓と旭・匝瑳・東庄の旧湖。旧表示の6頂点の輪郭を確定湖岸とは扱わない。'},
  {id:'shiunji',name:'塩津潟',at:[139.35,38.02],kind:'lake',label:'塩津潟（湖岸未確定）',labelOnly:true,author:'新潟県教育委員会・新潟県埋蔵文化財調査事業団',title:'野中土手付遺跡・砂山中道下遺跡',url:'https://sitereports.nabunken.go.jp/files/attach/33/33132/24225_1_%E9%87%8E%E4%B8%AD%E5%9C%9F%E6%89%8B%E4%BB%98%E9%81%BA%E8%B7%A1%E7%A0%82%E5%B1%B1%E4%B8%AD%E9%81%93%E4%B8%8B%E9%81%BA%E8%B7%A1.pdf',scope:'8〜9頁。南岸の集落と自然堤防、干拓前の潟。ラベルは概略位置。'}
 ];
 TK.HISTORIC_WATERS=[];
 for(const h of historic){
  const poly=TKGEO.lakes.find(poly=>{const r=poly[0],xs=r.filter((_,i)=>i%2===0).map(x=>x/K/CX+LON0),ys=r.filter((_,i)=>i%2).map(y=>LAT0-y/K);return h.at[0]>Math.min(...xs)&&h.at[0]<Math.max(...xs)&&h.at[1]>Math.min(...ys)&&h.at[1]<Math.max(...ys);});
  if(h.labelOnly)TK.HISTORIC_WATERS.push(h);
  else if(poly){const traced=h.id==='tsubaki'&&TK.TSUBAKI_LAKE;const shape=traced?traced.rings.map(r=>r.flatMap(([lo,la])=>[(lo-LON0)*K*CX,(LAT0-la)*K])):poly;TK.HISTORIC_WATERS.push({...h,poly:shape,label:traced?'椿海':h.label,shapeSource:traced?'tsubakiGsi':null});TKGEO.lakes=TKGEO.lakes.filter(p=>p!==poly);}
  TK.RESEARCH_SOURCES['water-'+h.id]={author:h.author,title:h.title,url:h.url,locator:'干拓・造成以前の水域と年代',scope:h.scope,accessed:'2026-11-01'};
 }
 TK.WATER_NOTE='湖岸は戦国期の実測復元ではありません。霞ヶ浦周辺の破線は2005年湖岸の比較線です。';
 if(TK.KOREA_COAST){
  TKGEO.land=TKGEO.land.filter(poly=>{const p=poly[0],xs=p.filter((_,i)=>i%2===0).map(x=>x/K/CX+LON0),ys=p.filter((_,i)=>i%2).map(y=>LAT0-y/K);return !((Math.min(...xs)<126&&Math.max(...ys)>40)||(Math.max(...xs)<129.1&&Math.min(...ys)>34.6)||(Math.max(...xs)<127.8&&Math.max(...ys)>33));});
  TKGEO.japanLand=TKGEO.land.slice();
  TKGEO.land.push(...TK.KOREA_COAST.map(r=>[r.flatMap(([lon,lat])=>[(lon-LON0)*K*CX,(LAT0-lat)*K])]));
 }
 TK.RESEARCH_SOURCES.koreaCoast={author:'Paul Wessel・Walter H. F. Smithほか／NOAA',title:'GSHHG 2.3.7 full resolution shoreline, regional extract',year:'2017',url:'https://www.soest.hawaii.edu/wessel/gshhg/',locator:'GSHHS_f_L1、朝鮮半島周辺を抽出',accessed:'2026-10-31',scope:'詳しい海岸ベクトルへの置換。原資料は現代の世界海岸データで、16世紀の干潟・埋立前の復元ではない。'};
 TK.RESEARCH_SOURCES.haedong={author:'韓国 国家遺産庁／ソウル大学校奎章閣',title:'海東地図',year:'18世紀中葉',url:'https://digital.khs.go.kr/heri/heriDetail.do?ctptNo=1121115910000&ctptUid=13921654501897000153',locator:'宝物・海東地図の年代解説',accessed:'2026-10-31',scope:'1748〜1750年頃の内容を反映する古地図。1592年へ無条件に遡らせない。個々の海岸の座標復元は未実施。'};
})();
