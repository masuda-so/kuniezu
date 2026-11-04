"use strict";
/* 候補：明の軍政域と女真諸部の概況。政治色は軍政域参考で、外交状態を設定しない。 */
(function(){
 const src=TK.RESEARCH_SOURCES;
 src.guangningCity={author:'遼寧省文化和旅游庁 文物管理処',title:'広寧古城',year:'2020-08-27',url:'https://whly.ln.gov.cn/whly/wlzt/lnww/zdwwbhdw/D893F1C8FBEC4C4DB3095F8C1C420F3B/index.shtml',locator:'1390年創建の衛城',scope:'古城の存在。現表示範囲の西外にあり、画面内へ移動して描かない。',accessed:'2026-11-01'};
 src.liaodongMuseum={author:'遼陽博物館',title:'第四展庁：元明清時期——行省、鎮城与都城',year:'2017-07-26',url:'https://www.lnlymuseum.com/case/detail/id/8.html',locator:'第二単元 九辺之首',scope:'遼陽の遼東都司と明の軍政。',accessed:'2026-11-03'};
 src.liaodongLee={author:'李華彥',title:'近三十年來明清鼎革之際軍事史研究回顧',year:'2014',url:'https://ming.cnhis.ncnu.edu.tw/wp-content/uploads/2014/11/ming23_04Lee_full.pdf',locator:'本文136頁・図1明遼東鎮防禦図・図2嘉靖四十四年全遼総図',scope:'辺牆・衛所の地理的関係。1565年図との比較、後年追加拠点を分離。',accessed:'2026-11-03'};
 src.jurchenMasui={author:'増井寛也',title:'ヌルハチの対明関係とその展開過程について―主として朝貢活動から見た―',year:'2022',url:'https://www.ritsumei.ac.jp/acd/cg/lt/rb/679/679PDF/masui.pdf',locator:'立命館文學679号、朝貢年表・寛甸退去',scope:'1588〜1615年の朝貢と建州勢力の拡大、1603〜1605年の寛甸退去。',accessed:'2026-11-03'};
 src.jurchenNikh={author:'韓国国史編纂委員会',title:'누르하치 — 아이신 구룬(금국)의 설립자',url:'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_30&levelId=kc_n303310',locator:'2 여진을 통일하다／3 국가를 수립하다',scope:'女真諸部・ヌルハチの統合過程。1616年建国はゲーム期間外。',accessed:'2026-11-03'};
 src.amurPoyarkov={author:'ロシア大統領図書館',title:'Поярков Василий Данилович',url:'https://www.prlib.ru/node/2101587',locator:'1643〜1646年のアムール探検',scope:'当ゲーム期より後のロシア進出。現在の沿海州国境を過去へ適用しない。',accessed:'2026-11-03'};
 src.hakodateShishi={author:'函館市',title:'函館市史 通説編 第一巻（講和と夷役）',url:'https://adeac.jp/hakodate-city/texthtml/d100010/mp000010-100010/Index.html',locator:'夷狄の商舶往還の法度（1550年）',scope:'上ノ国天ノ川から知内までを和人地とし、それより北・東を蝦夷地とした取り決め。地図の線は上ノ国（勝山館を含む）と知内川の河口を結んだ概略。',accessed:'2026-11-04'};
 src.ainuFoundation={author:'公益財団法人アイヌ民族文化財団',title:'アイヌ民族〜歴史と文化',url:'https://www.ff-ainu.or.jp/web/learn/culture/together/files/rekishitobunka_JP.pdf',locator:'和人地（松前地）と蝦夷地',scope:'和人地が渡島半島の南の一部に限られ、ほかはアイヌの人々が住む蝦夷地であったこと。',accessed:'2026-11-04'};
 const style={title:'明・遼東',color:'#b8a777',alpha:.24,kind:'historical-context',border:'approximate',diplomacy:false};
 // 未割当だった満州・沿海州・北海道・千島を、1560〜1615年に実在した勢力の地域に分けた区画（tools/map/assign-frontier-2026-11-04.cjs）。色は外交の状態ではなく地域の区別。
 const ctx=(title,color)=>({title,color,alpha:.22,kind:'historical-context',border:'approximate',diplomacy:false});
 TK.CONTEXT_REGION_STYLES={...(TK.CONTEXT_REGION_STYLES||{}),'neutral:明':style,'context:jianzhou':ctx('建州女真','#c39a62'),'context:haixi':ctx('海西女真','#a9ad6c'),'context:eastern-jurchen':ctx('東方の女真諸部','#7fa08a'),'context:mongol':ctx('蒙古諸部','#c9b07e'),'context:ainu':ctx('蝦夷地（アイヌ）','#9d92b8')};
 TK.LIAODONG_PERIODS=[
 {from:1560,to:1582,label:'建州女真',detail:'建州・海西・東方の女真には複数の集団があり、明から官号を受けて朝貢や交易を行う首長もいた。',source:'jurchenNikh'},
 {from:1583,to:1587,label:'建州女真',detail:'ヌルハチが1583年に挙兵し、建州の諸部を統合し始める。明との朝貢・官号の関係も続いた。',source:'jurchenMasui'},
 {from:1588,to:1598,label:'建州女真',detail:'ヌルハチが建州の諸部をまとめ、明への朝貢を行う。海西のハダ・イェヘ・ホイファ・ウラはそれぞれの勢力を保つ。',source:'jurchenMasui'},
 {from:1599,to:1602,label:'建州女真',detail:'1599年にハダを攻略。明の要求による再興と再併合を経て、勢力関係が変わる。',source:'jurchenMasui'},
 {from:1603,to:1606,label:'建州女真',detail:'1603年にヘトゥアラへ本拠を移す。寛甸方面では明軍・住民の撤収が1603〜1605年に進んだ。',source:'jurchenMasui'},
 {from:1607,to:1612,label:'建州女真',detail:'1607年にホイファを併合。ウラとイェヘは別の勢力として残る。明への朝貢も続いた。',source:'jurchenMasui'},
 {from:1613,to:1614,label:'建州女真',detail:'1613年にウラを併合。イェヘは独立した勢力を保ち、明との朝貢関係も続く。',source:'jurchenMasui'},
 {from:1615,to:1615,label:'建州女真',detail:'八旗の編成が整えられ、明への朝貢も行われた。イェヘはこの年も別勢力として残る。',source:'jurchenMasui'}
 ];
 const regions={
 'neutral:明':{name:'明・遼東',detail:'遼陽に遼東都司を置く明の軍政域。瀋陽・開原などの衛所を通じて防衛と行政を行った。',source:'liaodongMuseum',boundaryNote:'辺牆と衛所をもとにした軍政域の概略。'},
 'context:jianzhou':{name:'建州女真',source:'jurchenMasui',boundaryNote:'鴨緑江の北（韓国国史編纂委員会）。渾河・太子河・鴨緑江の上流の流域で、境は分水嶺（標高データから求めた）。首長ごとの確定した領界ではない。'},
 'context:haixi':{name:'海西女真',detail:'ハダ・イェヘ・ホイファ・ウラなど、複数の首長勢力が活動した地域。',source:'jurchenNikh',boundaryNote:'松花江・東遼河・清河の流域（韓国国史編纂委員会）。境は分水嶺（標高データから求めた）で、首長ごとの確定した領界ではない。'},
 'context:eastern-jurchen':{boundaryNote:'牡丹江・ウスリー江の流域と日本海側の沿海地方、豆満江の北岸（韓国国史編纂委員会）。境は分水嶺（標高データから求めた）で、首長ごとの確定した領界ではない。',name:'東方の女真諸部',detail:'牡丹江以東には多くの女真集団が暮らしていた。明との関係や首長の支配は地域ごとに異なる。ロシアの進出はこの時代より後である。',source:'jurchenNikh'},
 'context:mongol':{name:'蒙古諸部',detail:'遼東の西北では蒙古の諸部が活動し、明との交易や軍事交渉が行われていた。',source:'liaodongLee',boundaryNote:'遼東の辺牆の外の西北。西遼河の流域と遼河の西岸、松嫩平原の西。境は分水嶺（標高データから求めた）で、遊牧の諸部の確定した領界ではない。'},
 'context:ainu':{name:'蝦夷地（アイヌ）',detail:'和人地（上ノ国天ノ川から知内まで）の外は、アイヌの人々が各地の首長のもとで暮らす蝦夷地だった。1550年の取り決めで和人地と蝦夷地が分けられた。千島もアイヌの地である。',source:'hakodateShishi',boundaryNote:'和人地との境は上ノ国（天河、蠣崎氏の勝山館を含む）と知内川の河口を結んだ概略。蝦夷地の中に一つの国家があったわけではない。'}
 };
 TK.contextRegionInfo=function(key,date){
  const y=typeof date==='number'?date:date?.y;
  const base=regions[key];if(!base)return null;
  const out={...base,key,reference:true,diplomacy:false};
  if(Number.isFinite(y)){
   if(y<1560||y>1615)return null;
   const period=TK.LIAODONG_PERIODS.find(p=>p.from<=y&&y<=p.to);
   if(key==='context:jianzhou')return {...out,name:period.label,detail:period.detail,source:period.source};
   if(key==='context:haixi')out.detail=y<1599?'ハダ・イェヘ・ホイファ・ウラなど、複数の首長勢力が活動した。':y<1607?'ハダの攻略と再興・再併合が続く一方、イェヘ・ホイファ・ウラは別勢力として活動した。':y<1613?'1607年にホイファがヌルハチに併合された。イェヘ・ウラは別勢力として残る。':'1613年にウラがヌルハチに併合された。イェヘはなお別勢力を保つ。';
   if(key==='neutral:明')out.detail+=y<1573?'':y<=1602?' 寛甸方面では1573年以降に堡を整備し、防衛域を東へ広げた。':y<=1605?' 寛甸方面で軍民の撤収が段階的に進む。':' 寛甸方面の撤収後も、遼陽・瀋陽・開原は明の軍政拠点であった。';
  }
  return out;
 };
 TK.contextRegionPresentation=function(key,year){const p=TK.contextRegionInfo(key,year);return p?{title:p.name,role:key==='neutral:明'?'明の軍政域':'地域の勢力',description:p.detail,state:p.boundaryNote||'首長ごとに支配と明との関係が異なる。',source:p.source,reference:true}:null;};
 // Text positions are layout anchors, not surveyed boundaries or centers of ownership.
 const labels=[['明・遼東',[123.30,41.10],70,'neutral:明'],['建州女真',[125.40,41.65],60,'context:jianzhou'],['海西女真',[126.0,43.40],70,'context:haixi'],['女真諸部',[131.1,44.30],85,'context:eastern-jurchen'],['蒙古諸部',[123.2,44.20],65,'context:mongol'],['蝦夷地（アイヌ）',[142.9,43.6],80,'context:ainu']];
 for(const [n,at,r,key] of labels){let p=TKGEO.plabels.find(p=>p.contextKey===key||key==='neutral:明'&&(p.n==='明'||p.n==='明・遼東'));if(!p){p={};TKGEO.plabels.push(p);}Object.assign(p,{n,x:(at[0]-TKGEO.LON0)*TKGEO.K*TKGEO.CX,y:(TKGEO.LAT0-at[1])*TKGEO.K,r,contextKey:key});}
 const places=[['遼陽','明・遼東都司',[123.1782,41.2645],'PL000000007642',.55],['瀋陽','明・瀋陽中衛',[123.4301,41.7869],'PL000000007083',1.6],['開原','明・三万衛',[124.0899,42.598],'PL000000007767',.55],['鉄嶺','明・鉄嶺衛',[123.8582,42.2941],'PL000000007694',2.5],['撫順','明・撫順所',[123.9101,41.8828],'PL000000007281',2.5]];
 TK.CONTEXT_PLACES=(TK.CONTEXT_PLACES||[]).filter(p=>!places.some(v=>v[0]===p.name));
 for(const [name,detail,at,code,minZoom] of places){const sid='dila-'+code;src[sid]={author:'法鼓文理学院 地名規範資料庫',title:name,url:'https://authority.dila.edu.tw/place/search.php?code='+code,locator:'明代軍政拠点の代表点',scope:'都市の概略位置。元座標GRS67のため1kmの測地系・代表点留保。城壁敷地ではない。',accessed:'2026-11-03'};TK.CONTEXT_PLACES.push({name,detail,at,source:sid,precision:'都市の概略位置',regionKey:'neutral:明',minZoom});}
 TK.contextPlaces=function(year){return Number.isFinite(year)&&(year<1560||year>1615)?[]:TK.CONTEXT_PLACES.filter(p=>(p.from==null||year>=p.from)&&(p.until==null||year<p.until));};
})();
