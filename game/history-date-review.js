"use strict";
/* 城の明渡しと戦役の終結を同日に丸めない。西暦への変換はゲーム共通の暦を使う。 */
(function(){
 const source=(id,author,title,url,locator,scope)=>TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope,accessed:'2026-10-31'};
 source('nirayamaChronology','伊豆の国市文化振興課','韮山城跡パンフレット・年表（2014年3月）','https://www.city.izunokuni.shizuoka.jp/bunka_bunkazai/manabi/bunkazai/documents/urabyousi_1.pdf','裏面、天正18年3月29日・6月24日・8月、慶長6年','攻囲開始、開城、内藤信成入城、廃城を区別。');
 source('hachigataChronology','寄居町','鉢形城公園の概要','https://www.town.yorii.saitama.jp/site/rekishikan/kouenannai.html','天正18年6月14日の開城','北条氏邦の拠点。兵の助命を条件に開城。');
 source('shibataChronology','新発田市','歴史と概要 新発田重家と上杉景勝の抗争 2','https://www.city.shibata.lg.jp/kanko/bunka/shiro/gaiyo/1005180.html','重家の滅亡、天正15年10月24・25日','五十公野の陥落と新発田落城を区別。');
 source('shinpuChronology','韮崎市','新府城の歴史','https://www.city.nirasaki.lg.jp/soshikiichiran/kyoikuka/bunkazaitanto/1_1/2/1354.html','天正10年3月3日の自焼','既存の換算日1582年3月26日を再確認。');
 source('hikoneChronology','彦根市','「表御殿」の調査','https://www.city.hikone.lg.jp/kakuka/kanko_bunka/8/2_1/3/4668.html','彦根城の築城、1601年佐和山入城・1604年7月1日着工','従来の1603年説と区別し、市の記載する着工年を採用。完成とは扱わない。');
 source('tottoriChronology','岡村吉彦／鳥取県','第10回 県史だより・鳥取城と石見の関係','https://www.pref.tottori.lg.jp/item/262000.htm','吉川元春書状写・細川家文書、天正9年10月25日落城','水軍による補給阻止と落城日。兵数1,400は守備勢全体の値。');
 source('sumotoChronology','洲本市','史跡洲本城跡整備基本計画・第3章','https://www.city.sumoto.lg.jp/uploaded/attachment/8457.pdf','年表、天正9〜10年','1581年の国人衆の降伏と1582年の仙石氏入城を区別。開城の月日はこの資料では確定できない。');
 const change=(title,lunar,id,extra={})=>{const e=TK.HIST.find(e=>e.title===title&&e.k!=='premarch');if(!e)throw Error(title);Object.assign(e,{d:TK.lunarDate(...lunar),lunarDate:lunar,source:TK.RESEARCH_SOURCES[id].url,datePrecision:'旧暦年月日を資料と照合'},extra);return e;};
 const n=change('韮山城の戦い',[1590,3,29],'nirayamaChronology',{text:'織田信雄ら豊臣方が北条氏規の韮山城を攻め始める。旧暦6月24日に開城し、小田原城の7月5日の開城に先行する。'});
 const stamp=d=>d[0]*360+d[1]*30+d[2];
 const end=TK.lunarDate(1590,6,24);n.hold=stamp(end)-stamp(n.d);
 TK.HIST.push({d:end,k:'take',clan:'hashiba',castles:['nirayama'],admin:1,at:'nirayama',title:'韮山城の明渡し',who:'北条氏規',source:n.source,lunarDate:[1590,6,24],text:'北条氏規が韮山城を開く。豊臣方への明渡しであり、内藤信成の入城（旧暦8月）とは区別する。'});
 change('鉢形城の開城',[1590,6,14],'hachigataChronology',{k:'take',clan:'hashiba',castles:['hachigata'],admin:1,text:'北条氏邦が兵の助命を条件に鉢形城を明け渡す。小田原城の開城とは別の日に豊臣方へ移す。'});
 change('新発田城落城',[1587,10,25],'shibataChronology');
 change('三木の干殺し',[1580,1,17],'extraMiki');
 // 淡路を鳥取城の落城と同じ戦闘で奪わない。洲本の日付は旧実装の暫定値を明示して分離する。
 const t=TK.HIST.find(e=>e.title==='鳥取の渇え殺し'&&e.k!=='premarch');
 TK.HIST.push({d:t.d.slice(),k:'take',clan:'oda',castles:['sumoto'],admin:1,at:'sumoto',title:'淡路国人衆の降伏（時期未確定）',source:TK.RESEARCH_SOURCES.sumotoChronology.url,datePrecision:'1581年のみ確認・月日は旧実装の仮置き',text:'1581年、淡路の国人衆が秀吉方へ降伏する。表示の月日は暫定で、鳥取城の開城日とは結び付けない。仙石秀久の洲本入城は翌1582年。'});
 change('鳥取の渇え殺し',[1581,10,25],'tottoriChronology',{castles:['tottori'],peace:[],text:'兵糧攻めを受けた鳥取城が開城し、吉川経家らが自害した。淡路での国人衆の降伏とは別の出来事。'});
 const build=TK.JOKAKU.find(e=>e.n==='新府城'&&e.k==='build');
 // 全国遺跡報告総覧・文化財総覧WebGIS 城跡点190000156100。縄張全域の中心ではない。
 Object.assign(build,{lon:138.425240,lat:35.735151,coordinateBasis:'全国遺跡報告総覧 城跡点190000156100'});
 TK.JOKAKU.find(e=>e.title==='新府城炎上').source=TK.RESEARCH_SOURCES.shinpuChronology.url;
 const h=TK.YOSHO.find(y=>y[0]==='彦根城');if(h){h[5]=1604;h[4]='近江国・平山城。井伊氏の居城。彦根市の調査では1604年旧暦7月1日着工。従来の1603年説とは区別し、着工時点を完成とは扱わない。';}
 Object.assign(TK.CASTLE_EVIDENCE,{
  '韮山城':{role:'北条氏規の居城・小田原の支城',description:'北条家初期の本拠と、1590年の氏規の籠城拠点では役割が異なる。旧暦6月24日開城、8月に内藤信成入城、1601年廃城。ゲームの領域管理上の本城という分類とは区別する。',source:n.source,checked:'2026-10-31'},
  '鉢形城':{role:'北条氏邦の居城・北関東の拠点',description:'小田原を本拠とする北条氏の支城であり、氏邦の地域支配の本拠でもある。主城・支城は時代と支配の階層で変わる。1590年旧暦6月14日開城。',source:TK.RESEARCH_SOURCES.hachigataChronology.url,checked:'2026-10-31'},
  '新発田城':{role:'新発田氏の拠点',description:'1581年の反乱後は新発田重家の独立拠点。1587年旧暦10月25日落城。後の溝口氏の近世城郭を重家の城へ遡らせない。',source:TK.RESEARCH_SOURCES.shibataChronology.url,checked:'2026-10-31'},
  '彦根城':{role:'井伊氏の本拠',from:1604,description:h?.[4]||'',source:TK.RESEARCH_SOURCES.hikoneChronology.url,checked:'2026-10-31'}
 });
 TK.HIST.sort((a,b)=>stamp(a.d)-stamp(b.d));
 const catalog=G.buildBattleCatalog;
 G.buildBattleCatalog=function(){catalog();
  for(const [title,id] of [['韮山城の戦い','nirayamaChronology'],['鉢形城の開城','hachigataChronology'],['新発田城落城','shibataChronology'],['三木の干殺し','extraMiki'],['鳥取の渇え殺し','tottoriChronology']]){
   const sc=TK.BATTLES[title],e=TK.HIST.find(e=>e.title===title&&e.k!=='premarch');
   sc.sources=[...new Set([...sc.sources,id])];sc.eventDate=title==='韮山城の戦い'?end.slice():e.d.slice();
   sc.date=title==='韮山城の戦い'?'天正18年3月29日～6月24日（1590年5月3日～7月25日）':`${e.lunarDate[0]}年・旧暦${e.lunarDate[1]}月${e.lunarDate[2]}日（西暦${e.d.join('/')}）`;
   if(title==='韮山城の戦い'){sc.calendar=[[0,'旧暦3月29日・攻囲開始'],[50,'籠城・交渉'],[100,'旧暦6月24日・明渡し']];sc.beats=[[0,n.text],[100,'韮山城が開城。小田原城はまだ開城していない。']];}
   const row=TK.BATTLE_AUDIT.find(r=>r.title===title);if(row){row.eventDate=sc.eventDate;row.sourceIds=sc.sources;}
  }
 };
})();

/* kashiwagi source position review */
(function(){
 TK.RESEARCH_SOURCES.kashiwagiBunka={"author": "文化庁・文化遺産オンライン", "title": "柏木城跡", "url": "https://online.bunka.go.jp/heritages/detail/520604", "locator": "解説および所在地の地図座標", "scope": "蘆名氏の防衛拠点、1585年籠城、米沢街道と城の関係。地図代表点であり城域境界ではない。", "accessed": "2026-11-01"};
 const y=TK.YOSHO.find(y=>y[0]==='柏木城');if(!y)throw Error('柏木城');
 y[2]=139.97655556;y[3]=37.66630556;
 y[4]='陸奥国・山城。蘆名氏が米沢街道からの伊達勢の侵攻に備えた防衛拠点。1585年には蘆名勢が籠城した。城の北を通る街道と、南側へ分岐する道を意識した曲輪・土塁を備える。';
 TK.SITE_POSITION_EVIDENCE['柏木城']={name:'柏木城',point:[y[2],y[3]],source:'kashiwagiBunka',url:TK.RESEARCH_SOURCES.kashiwagiBunka.url,basis:'文化遺産オンラインの地図代表点'};
 TK.CASTLE_EVIDENCE['柏木城']={role:'蘆名氏の対伊達防衛拠点',description:y[4],source:TK.RESEARCH_SOURCES.kashiwagiBunka.url,checked:'2026-11-01'};
})();

/* enoshima medieval site */
(function(){
 TK.RESEARCH_SOURCES.enoshimaMedieval={"author": "藤沢市文書館", "title": "祈念の島―中世文書にみる江島弁才天信仰―", "url": "https://digital.city.fujisawa.kanagawa.jp/digital/exhibition/digital.php?id=18", "year": "2021年10月展示・ウェブ再構成", "locator": "北条家―保護と寄進と戦勝祈念―、岩本坊宛書状", "scope": "戦国期の岩本坊と江島弁才天信仰。現在の建物・社号・正確な建物位置を遡及しない。", "accessed": "2026-11-01"};
 const name='江島弁才天・岩本坊',point=[139.4802176,35.3013114];
 const description='江の島の信仰と祈祷の拠点。岩本坊には北条氏から保護・寄進・戦勝祈念に関する書状が送られた。江戸期の岩本院や近代の江島神社の制度・建物とは区別する。';
 if(!TK.YOSHO.some(y=>y[0]===name))TK.YOSHO.push([name,'寺',...point,description,null,null]);
 TK.CASTLE_EVIDENCE[name]={role:'弁才天信仰・祈祷の拠点',description,source:TK.RESEARCH_SOURCES.enoshimaMedieval.url,checked:'2026-11-01'};
 TK.SITE_POSITION_EVIDENCE[name]={name,point,source:'enoshimaMedieval',url:'https://www.iwamotoro.co.jp/',basis:'岩本院に由緒を持つ現岩本楼の代表点（OSM node 12963779863）。中世の建物配置の測量ではない。'};
})();

/* Aki castle: historical-place representative independently checked against city map. */
(function(){
 const name='安芸城',point=[133.912590,33.519865],y=TK.YOSHO.find(y=>y[0]===name);if(!y)throw Error(name);
 y[2]=point[0];y[3]=point[1];
 y[4]='土佐国・平山城。安芸平野中央の丘に築かれた安芸氏の本拠。1569年、安芸国虎は長宗我部元親の攻撃を受けて敗れた。1601年には山内氏家臣の五藤為重が入り、土居を構えた。';
 TK.RESEARCH_SOURCES.akiCastleCity={author:'安芸市',title:'安芸城跡',locator:'城跡解説（位置・歴史）',url:'https://www.city.aki.kochi.jp/life/dtl.php?hdnKey=44',accessed:'2026-11-02',scope:'安芸平野中央の城跡、1569年の攻防と五藤氏の土居。城域全体の測量値ではない。'};
 TK.SITE_POSITION_EVIDENCE[name]={kind:'facility',name,point,ref:'400000033600',source:'codhSites',url:'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/40/400000033600.html',basis:'歴史地名代表点。安芸市・観光協会の城跡説明と地図を独立照合。'};
 TK.CASTLE_EVIDENCE[name]={role:'安芸氏の本拠、後の五藤氏土居',description:y[4],source:TK.RESEARCH_SOURCES.akiCastleCity.url,checked:'2026-11-02'};
})();
