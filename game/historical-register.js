"use strict";
/* 年代・人物・施設の照合。資料が示す範囲とゲームの管理単位を区別する。 */
(function(){
 const refs={
  tsubakiGsi:['建設省国土地理院','土地条件調査報告書（銚子・鹿島地区）','https://www1.gsi.go.jp/geowww/landcondition/report/d2031.pdf','本文47～48頁・図16～17（PDF54～55頁）','椿海の水際を古図から読図し村名位置と比較。干拓時の絵図を用いた概略復元で、1560年の測量岸ではない。'],
  iwamuraLifetime:['恵那市教育委員会','岩村城跡第3次発掘調査 現地説明会資料','https://www.city.ena.lg.jp/material/files/group/33/H221205iwagensetu.pdf','岩村城の歴史','遠山景任の1572年夏の病没。生年や没日の確定ではない。'],
  kageakiraLifetime:['福井県立一乗谷朝倉氏遺跡博物館','朝倉氏の歴史','https://asakura-museum.pref.fukui.lg.jp/site/history','朝倉氏の滅亡','朝倉景鏡が1574年4月に平泉寺で討ち取られたこと。'],
  ujinaoLifetime:['小田原市','小田原の遺跡探訪シリーズ18','https://www.city.odawara.kanagawa.jp/global-image/units/573897/1-20230323161444_b641bfc64a3d59.pdf','歴史関連年表・1591年','氏直の赦免・出仕後の病没。'],
  ujikuniLifetime:['寄居町教育委員会','鉢形城公園にようこそ','https://www.lib.pref.saitama.jp/item/pdf/2998300235.pdf','氏邦のその後','1597年に能登で死去。'],
  ujifusaLifetime:['国立国会図書館','北条, 氏房, 1565-1592','https://id.ndl.go.jp/auth/ndlna/001219628','典拠標目','同名の刀工と混同しない武将の生没年。'],
  tanezaneLifetime:['朝倉市','ふるさと人物誌1 戦国時代を翔けた 秋月種実','https://www.city.asakura.lg.jp/site/furusato/1234.html','秋月を去って9年後','1596年9月の病没。生年は他資料との相違がある。'],
  kajiroResidence:['千葉県教育振興財団','研究紀要28 房総における近世陣屋','https://www.echiba.org/wp-content/uploads/2022/12/kiyo_028_p1.pdf','本文14頁（PDF32頁） 上代陣屋（城）','家忠は1590年忍、1592年2月19日上代、1594年小見川。上代の屋敷位置には再検討の余地があり、桜井城と断定しない。'],
  ietadaDiary:['国立公文書館','歴史と物語 31 家忠日記','https://www.archives.go.jp/exhibition/digital/rekishitomonogatari/contents/31.html','資料解説','1577～1594年を記す松平家忠の日記。'],
  suwaharaLocal:['島田市博物館','諏訪原城跡','https://www.city.shimada.shizuoka.jp/shimahaku/docs/kuni-01.html','城跡の解説','1573年築城、1575年徳川方に落ち牧野城。廃城時期は不明。残存遺構に徳川改修の可能性。'],
  katoriArchaeology:['香取市','香取遺産 Vol.33 香取の海と低地遺跡','https://www.city.katori.lg.jp/culture_sport/bunkazai/isan/isan_vol031-040.html','津宮遺跡群','中近世を含む遺構が自然堤防の標高約2mまで分布。3m等高線全体を一様な古水面にしない。'],
  omigawaResidence:['香取市','歴史的風致維持向上計画 第2章','https://www.city.katori.lg.jp/government/kocho/public-comment/P051-060/P53.files/bunkazai-5.pdf','小見川の歴史','家忠の1594年上代からの移封。同市Vol.184の1590年関東移封に直結する略記と区別。']
 };
 for(const [id,[author,title,url,locator,scope]]of Object.entries(refs))TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope,accessed:'2026-11-01'};
 // 新規後継者の居所を、先代の最後の遠征先から引き継がせない。
 TK.RESEARCH_SOURCES.katsuyoriResidence={author:'長野市',title:'川中島の戦い・主要人物 武田四郎勝頼',url:'https://kawanakajima.nagano.jp/character/takeda-katsuyori/',locator:'永禄5年高遠城主・元亀4年継承後に躑躅ヶ崎館へ入る',scope:'居所と年の確認。継承と入城が同日だったことや逐日の所在は確定しない。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.terumotoResidence={author:'安芸高田市歴史民俗博物館',title:'毛利氏関係史跡（当博物館周辺）',url:'https://www.akitakata.jp/ja/hakubutsukan/assets/mouri/',locator:'郡山城跡・1591年に輝元が広島へ移るまで毛利氏の本拠',scope:'郡山が毛利氏の本拠だったこと。1571年を輝元の家督相続年とする資料ではない。',accessed:'2026-11-01'};
 for(const [predecessor,place,source] of [['武田信玄','tsutsuji','katsuyoriResidence'],['毛利元就','koriyama','terumotoResidence']]){const ev=TK.HIST.find(e=>e.k==='death'&&e.n===predecessor);if(ev?.appear){ev.appear=ev.appear.split('@')[0]+'@'+place;ev.successorSource=source;}}
 TK.PERSON_LIFETIME_EVIDENCE={
  '遠山景任':{deathYear:1572,source:'iwamuraLifetime'},'朝倉景鏡':{deathYear:1574,source:'kageakiraLifetime'},
  '北条氏直':{deathYear:1591,source:'ujinaoLifetime'},'北条氏邦':{deathYear:1597,source:'ujikuniLifetime'},
  '北条氏房':{deathYear:1592,source:'ujifusaLifetime'},'秋月種実':{deathYear:1596,source:'tanezaneLifetime'}
 };
 // 家の滅亡で浪人になっても既知の没年は変わらない。過ぎた死去を再演して領地や年表を書き換えない。
 G.reconcileHistoricalPeople=function(s){if(!s||!TK.HISTORY_ONLY)return [];const year=G.date().y,removed=[];
  for(const g of s.gens){const name=TK.PORTRAIT_ALIAS?.[g.n]||g.n,death=TK.DEATH_Y[name];if(g.dead||death==null||death>=year)continue;g.dead=true;g.tr=null;g.unit=null;removed.push(g.id);}
  if(!removed.length)return removed;const ids=new Set(removed);for(const u of s.units)u.gens=u.gens.filter(id=>!ids.has(id));
  for(const [k,c]of Object.entries(s.clans))if(ids.has(c.leader)){const alive=s.gens.filter(g=>g.clan===k&&!g.dead&&!g.ronin&&!g.prisoner);c.leader=(alive.find(g=>g.loc===c.cap)||alive[0])?.id??null;}
  return removed;
 };
 const init=G.newGame;G.newGame=function(...args){const s=init(...args);G.reconcileHistoricalPeople(s);return s;};
 const set=G.setS;G.setS=function(s){const r=set(s);G.reconcileHistoricalPeople(G.S());return r;};
 TK.PERSON_RESIDENCE_EVIDENCE={'武田勝頼':{source:'katsuyoriResidence',stages:[{year:1562,place:'高遠城'},{year:1573,place:'躑躅ヶ崎館'}]},'毛利輝元':{source:'terumotoResidence',stages:[{year:1571,place:'郡山城（当時の毛利氏本拠）'},{year:1591,place:'広島城'}]},'松平家忠':{source:'kajiroResidence',stages:[{year:1590,place:'忍城'},{year:1592,lunarDate:[1592,2,19],place:'上代（所在地には異説）'},{year:1594,place:'小見川城'},{year:1600,place:'伏見城守備・討死'}]}};
 TK.RESEARCH_SOURCES.shimazuIinoResidence={"author":"鹿児島県観光サイト「かごしまの旅」","title":"島津義弘公の戦い（第一部）","url":"https://www.kagoshima-kankou.com/feature/shimadu2019/introduction2","locator":"永禄7年（1564年）・元亀3年（1572年）の項、飯野城跡の説明","scope":"1564年の飯野入城と木崎原合戦時の飯野からの出陣。兵数・経路・時刻は記述の精度と異説を別途検討する。","accessed":"2026-11-02"};
 const yoshihiroResidence={source:'shimazuIinoResidence',stages:[{year:1564,place:'飯野城'}]};
 TK.PERSON_RESIDENCE_EVIDENCE['島津忠平']=TK.PERSON_RESIDENCE_EVIDENCE['島津義弘']=yoshihiroResidence;
 TK.RESEARCH_SOURCES.suwaharaChronology={author:'島田市博物館',title:'牧野城とは・牧野城に在城した徳川の武将たち',url:'https://www.city.shimada.shizuoka.jp/shimahaku/docs/863749869.html',year:'2025',locator:'牧野城とは、今川氏真の項（今川氏真詠草の旧暦8月24日）',scope:'1575年8月24日の攻略と改称、武田から徳川への移行。1590年廃城は推定説。紹介ページの廃城時期不明という説明も保持。',accessed:'2026-11-01'};
 const suwaharaTaken=()=>G.S().t>=G.evT({d:TK.lunarDate(1575,8,24)});
 const y=TK.YOSHO.find(y=>y[0]==='諏訪原城');if(y){y[4]='1573年、武田勝頼が馬場信春に命じて築いた山城。1575年の旧暦8月24日に徳川方へ降り、牧野城となった。今川氏真・松井忠次・牧野康成らが守備に関わり、松平家忠も交代の城番を務めた。';y[6]=1591;TK.CASTLE_EVIDENCE[y[0]]={role:'武田・徳川の国境防御拠点',description:y[4],source:TK.RESEARCH_SOURCES.suwaharaChronology.url,checked:'2026-11-01',abandonment:'year-hypothesis',abandonmentYear:1590,datePrecision:'year',dateNote:'1590年廃城説を採用し、年精度のため翌年から非稼働とする。廃城日を確定したものではない。'};}
 const owner=G.yOwner;G.yOwner=function(y){if(y.n==='諏訪原城'&&G.kyu().y>=1573&&G.kyu().y<=1590)return suwaharaTaken()?'tokugawa':'takeda';return owner(y);};
 const present=G.sitePresentation;G.sitePresentation=function(y){const p=present(y);if(y.n!=='諏訪原城')return p;
  if(G.kyu().y<1573)return p;
  const taken=suwaharaTaken();p.title=taken?'牧野城'+(G.yActive(y)?'':'跡')+'（諏訪原城）':'諏訪原城';
  p.role=taken?'徳川方の国境防御拠点':'武田方の遠江攻略拠点';
  p.description=taken?y.desc:'武田勝頼が遠江侵攻の拠点として築いた山城。大井川側の断崖と、堀・馬出によって守られている。';
  if(!G.yActive(y))p.state='1590年の徳川家康の関東移封に伴い、廃城となったと考えられています。';return p;
 };
 G.siteName=y=>y.n==='諏訪原城'?G.sitePresentation(y).title:y.n;
 // 既に出典付きで登録されている地物名だけを背景へ出す。部隊名を地名へ変換したり、地名のない空白へ架空の集落を置かない。
 const build=G.buildBattleCatalog;G.buildBattleCatalog=function(){build();for(const sc of Object.values(TK.BATTLES)){const seen=new Set();sc.atlasLandmarks=[];if(sc.atlasPlan)continue;for(const g of sc.atlasGroups||[]){if(!g.point)continue;const m=/^([^・（）]+(?:山|城|砦|寺))・/.exec(g.label);if(!m||seen.has(m[1]))continue;seen.add(m[1]);sc.atlasLandmarks.push({name:m[1],point:g.point.slice(),source:g.source,basis:'出典付き陣地の地物名・代表位置'});}}};
 TK.HISTORICAL_CLAIMS=[
  ...Object.entries(TK.PERSON_LIFETIME_EVIDENCE).map(([name,r])=>({id:'lifetime-'+name,entity:'person:'+name,predicate:'death-year',value:r.deathYear,validYears:[r.deathYear,r.deathYear],datePrecision:'year',source:r.source,gameBindings:['TK.DEATH_Y','G.reconcileHistoricalPeople','aging']})),
  {id:'ietada-kajiro',entity:'person:松平家忠',predicate:'residence-transfer',value:'忍から上代へ',lunarDate:[1592,2,19],validYears:[1592,1592],source:'kajiroResidence',gameBindings:['TK.PERSON_RESIDENCE_EVIDENCE']},
  {id:'ietada-omigawa',entity:'person:松平家忠',predicate:'residence-transfer',value:'上代から小見川へ',validYears:[1594,1594],datePrecision:'year',source:'kajiroResidence',gameBindings:['TK.PERSON_RESIDENCE_EVIDENCE']},
  {id:'suwahara-renamed',entity:'site:諏訪原城',predicate:'renamed',value:'牧野城',validYears:[1575,1615],datePrecision:'year',source:'suwaharaLocal',gameBindings:['G.sitePresentation']}
 ];
})();

/* 黒田氏の本拠・家督と、日々の現地滞在を区別する。施設を主城ノードへ読み替えない。 */
(function(){
 const source={author:'福岡市博物館',title:'没後400年 黒田長政',url:'https://museum.city.fukuoka.jp/exhibition/599/index02.html',locator:'黒田家の当主となる（22歳）・朝鮮に出兵・関ヶ原の戦い',scope:'1588年中津築城、1589年家督継承。日々の滞在地や1599年の帰着日を確定しない。',accessed:'2026-11-03'};
 const succession={author:'行橋市',title:'行橋市史 黒田氏の入国',url:'https://adeac.jp/yukuhashi-city/texthtml/d100010/mp000000-000010/ht2040100020',locator:'242〜243頁、末段の天正17年5月家督継承',scope:'黒田領六郡と森吉成領二郡、1589年5月の家督継承。継承日と日々の滞在を確定しない。',accessed:'2026-11-03'};
 const nakatsu={author:'中津市教育委員会',title:'中津城を知る',url:'https://www.city-nakatsu.jp/doc/2013100100011/file_contents/nakatsujo.pdf',locator:'PDF2頁 中津城の歴史・築城の歴史',scope:'1588年着工、1600年細川氏入城、1602年小倉移転と中津城の存続。',accessed:'2026-11-03'};
 Object.assign(TK.RESEARCH_SOURCES,{kurodaNagamasaSuccession:source,kurodaYukuhashiSuccession:succession,nakatsuCastleHistory:nakatsu});
 TK.PERSON_RESIDENCE_EVIDENCE['黒田長政']={source:'kurodaNagamasaSuccession',label:'本拠と家督',stages:[{year:1589,place:'中津城・黒田家の家督を継承'}],note:'父孝高から家督を継いだのは1589年。朝鮮出兵や関ヶ原では城を離れて従軍した。'};
 const y=TK.YOSHO.find(y=>y[0]==='中津城');if(y)y[4]='豊前国・平城。黒田孝高が1588年に築城に着手し、1589年に長政が家督を継いだ。1600年には細川忠興が入城し、城の整備が引き継がれた。';
 TK.CASTLE_EVIDENCE['中津城']={role:'黒田氏の本拠、のち細川氏の城郭',description:y?.[4]||'',source:nakatsu.url,checked:'2026-11-03',classification:{historicalRole:'principal-seat',managementNode:'kawara',managementNodeIsResidence:false},periods:[{fromYear:1588,toYear:1600,role:'黒田氏の本拠'},{fromYear:1600,toYear:1602,role:'黒田氏から細川氏へ移った城'},{fromYear:1602,toYear:1632,role:'小倉を本城とする細川氏の城郭'}]};
 const present=G.sitePresentation;G.sitePresentation=function(y){const p=present(y);if(y.n!=='中津城'||!G.yActive(y))return p;const year=G.date().y;
  p.role=year<1600?'黒田氏の本拠':year<1602?'黒田氏から細川氏へ移った城':'細川氏の城郭';
  p.description=year<1589?'山国川河口の平城。1588年に黒田孝高が城の造営を始めた。':year<1600?'山国川河口に築かれた黒田氏の本拠。長政は1589年に父孝高から家督を継ぎ、中津城主として領国を治めた。':year<1602?'1600年、黒田氏の筑前移封に伴い細川忠興が入城した。忠興は1602年に本拠を小倉へ移した。':'1602年に細川忠興が本拠を小倉へ移した後も、中津城では増改築が続いた。一国一城令の後も城は存続した。';return p;
 };
 // 本拠参照は人物の点位置や戦闘用locを返さない。1600年は転封年の城主記録として扱う。
 G.historicalPrincipalBase=function(g){const year=G.date().y;if(g?.n!=='黒田長政'||year<1589||year>1600)return null;const site=G.YOSHO.find(y=>y.n==='中津城');return site?{place:'中津城',siteId:site.id,managementNode:site.at,relation:year===1600?'held-castle-lordship':'principal-base',year,source:year===1600?'https://museum.city.fukuoka.jp/archives/leaflet/138/index.html':source.url,exactPresence:false,transitionYear:year===1600}:null;};
 // 本拠が中津の期間、旧管理ノードの在城欄を実在の居所として表示しない。軍の選択用castleGensは維持する。
 G.displayCastleGens=function(id){const rows=G.castleGens(id),year=G.date().y;if(!TK.HISTORY_ONLY||year<1589||year>1600||!['himeji','kawara'].includes(id))return rows;return rows.filter(g=>g.n!=='黒田長政');};
 // 旧1599年イベントが積んだ待機命令のみ除去。現在位置・軍・帰路・索引は変更しない。
 G.repairKurodaResidenceOrders=function(s){if(!s||!TK.HISTORY_ONLY||Object.values(s.div||{}).some(Boolean)||!s.pendMoves)return 0;const t=(1599-s.y0)*360+(1-s.m0)*30+19,before=s.pendMoves.length;
  s.pendMoves=s.pendMoves.filter(m=>!(m.n==='黒田長政'&&m.at==='kawara'&&!m.cap&&!m.home&&m.after===t&&m.until===t+360));return before-s.pendMoves.length;
 };
 const set=G.setS;G.setS=function(s){const result=set(s);G.repairKurodaResidenceOrders(G.S());return result;};
})();
