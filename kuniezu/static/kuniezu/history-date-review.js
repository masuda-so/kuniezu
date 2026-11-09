"use strict";
/* 自治体資料でも照合した没日。旧暦の月日を西暦の月日へ直接写さない。 */
(function(){
 const rows=[
  {name:'蜂須賀正勝',previousDate:[1586,7,1],lunar:[1586,5,22],id:'deathHachisukaTokushima',author:'徳島県教育委員会',title:'文化財保護審議会諮問資料 蜂須賀正勝画像',url:'https://www.pref.tokushima.lg.jp/file/attachment/179616.pdf',locator:'2頁「蜂須賀正勝画像」冒頭',scope:'天正14年5月22日に大坂で病没。画賛の日付とは区別する。'},
  {name:'長野業正',previousDate:[1561,8,1],lunar:[1561,6,21],id:'deathNaganoTakasaki',author:'高崎市立図書館',title:'新編高崎市史 資料編4 中世2 公開年表',url:'https://lib.city.takasaki.gunma.jp/viewer/info.html?g=12&id=110',locator:'戦国時代 永禄4.6.21',scope:'箕輪城主長野業政の死去。同名異表記を綱文の業正と照合。'}
 ];
 for(const row of rows){
  TK.RESEARCH_SOURCES[row.id]={author:row.author,title:row.title,url:row.url,locator:row.locator,scope:row.scope,accessed:'2026-11-09'};
  const events=TK.HIST.filter(e=>e.k==='death'&&e.n===row.name);
  if(events.length!==1)throw Error('没日の訂正対象が一意でない: '+row.name);
  Object.assign(events[0],{d:TK.lunarDate(...row.lunar),lunarDate:row.lunar.slice(),source:row.url,datePrecision:'旧暦年月日を自治体資料と照合'});
 }
 TK.VERIFIED_DEATH_DATE_CHANGES=rows.map(row=>({name:row.name,previousDate:row.previousDate.slice(),date:TK.lunarDate(...row.lunar)}));
})();
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
 y[4]='土佐国・平山城。安芸平野中央の丘に築かれた安芸氏の本拠。1569年、安芸国虎は長宗我部元親の攻撃を受けて敗れた。1601年には山内氏家臣の五藤為重が安芸城跡の土居に入った。';
 TK.RESEARCH_SOURCES.akiCastleCity={"author":"安芸市","title":"安芸城跡","locator":"城跡解説（位置・歴史）","url":"https://www.city.aki.kochi.jp/life/dtl.php?hdnKey=44","accessed":"2026-11-04","scope":"安芸平野中央の城跡と1569年の安芸氏・長宗我部元親の攻防。現本文には五藤為重・1601年の入居はなく、城域全体の測量値でもない。"};
 TK.RESEARCH_SOURCES.akiHistoryChronology={"author":"安芸市立歴史民俗資料館","title":"安芸の歴史 年表","locator":"1569年・1601年の項","url":"https://www.city.aki.kochi.jp/rekimin/info/dtl.php?hdnKey=7968","published":"2025-02-12","accessed":"2026-11-04","scope":"1569年の安芸国虎と長宗我部元親、1601年の五藤氏の安芸城跡土居への入居。五藤為重個人の同定は高知城歴史博物館の人物解説と照合する。年表の家老就任説明は今回採用しない。"};
 TK.RESEARCH_SOURCES.gotoTameshigeKochiMuseum={"author":"高知県立高知城歴史博物館","title":"土佐史の人々－初期－","locator":"五藤為重の項","url":"https://www.kochi-johaku.jp/column/4516/","published":"2019-11-27","accessed":"2026-11-04","scope":"五藤為重本人が山内一豊に仕え、兄為浄の跡を継ぎ、土佐入国時に安芸城を預けられたという同定根拠。家老就任の厳密な年や全安芸領有・通年所在へ拡張しない。"};
 TK.RESEARCH_SOURCES.hinoGamoUjisatoIdentity={"author":"日野町","title":"蒲生氏郷","locator":"人物解説・鶴千代、賦秀から氏郷への改名","url":"https://www.town.shiga-hino.lg.jp/0000003695.html","published":"2017-03-01","updated":"2025-06-20","accessed":"2026-11-04","scope":"蒲生氏郷本人の別名・時代・活動を照合する人物同定資料。生没日、出生順、所領変遷、行軍日程を自動採用しない。"};
 TK.RESEARCH_SOURCES.kochiAkiKunitoraGrave={"author":"高知県教育委員会文化財課","title":"安芸国虎墓","locator":"安芸国虎の敗北と自刃の説明","url":"https://www.kochinet.ed.jp/bunkazai/details/410-2/410-2-12.htm","accessed":"2026-11-04","scope":"1569年に長宗我部元親との戦いに敗れた安芸国虎の同定。墓塔の所在地を生前の居所に転用しない。"};
 TK.SITE_POSITION_EVIDENCE[name]={kind:'facility',name,point,ref:'400000033600',source:'codhSites',url:'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/40/400000033600.html',basis:'歴史地名代表点。安芸市・観光協会の城跡説明と地図を独立照合。'};
 TK.CASTLE_EVIDENCE[name]={role:'安芸氏の本拠、後の五藤氏土居',description:y[4],source:TK.RESEARCH_SOURCES.akiHistoryChronology.url,sourceIds:['akiHistoryChronology','gotoTameshigeKochiMuseum'],checked:'2026-11-04'};
})();

/* 朱印状の発給を、開城・入城・知行の移管から分けて記録する。 */
{
 const lunarDate=[1587,7,3];
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'note',title:'秋月種長への朱印状',who:'秋月種長',
  source:'https://www.town.takanabe.lg.jp/choseijoho/takanabemachi/1026.html',
  text:'豊臣秀吉が秋月種長に日向財部の城を宛行う朱印状を出した。知行目録は羽柴秀長から受け取るよう命じた。'
 });
}

/* 岩石城は古処山城と別地点。支城の落城を九州全域の領主変更から分けて表示する。 */
{
 const lunarDate=[1587,4,1],site='岩石城';
 TK.SITE_POS[site]=[130.871738,33.577313];
 // 添田町の落城記録は年表と史跡地点へ。部隊別配置を確認するまで局地図を作らない。
 TK.BATTLE_EVENT_EXCLUSIONS['岩石城の落城']='添田町の落城記録に基づき年表・史跡地点に表示。個別部隊の布陣と攻城経路は未照合で、九州平定の方面図をこの城の局地図として流用しない。';
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'note',at:'kawara',site,
  title:'岩石城の落城',who:'蒲生氏郷・前田利長',
  source:'https://www.town.soeda.fukuoka.jp/uploaded/attachment/1792.pdf',
  text:'蒲生氏郷と前田利長の軍が、秋月氏の支城・岩石城を攻め落とした。'
 });
}

/* 行橋市史の叙述による降伏受理。古処山城の明渡し日は別に扱う。 */
{
 const lunarDate=[1587,4,2],d=TK.lunarDate(...lunarDate);
 const campaign=TK.HIST.find(e=>e.title==='九州平定'&&e.k==='take'&&e.castles?.includes('kosho'));
 if(!campaign)throw Error('九州平定の古処山城');
 campaign.castles=campaign.castles.filter(id=>id!=='kosho');
 // 地図上の管轄切替は降伏受理を基準とする。城の物理的な明渡し日ではない。
 TK.HIST.push({d,k:'take',clan:campaign.clan,castles:['kosho'],admin:1,quiet:1});
 TK.HIST.push({
  d,lunarDate,k:'note',title:'秋月氏の降伏',who:'秋月種実・種長',
  source:'https://adeac.jp/yukuhashi-city/texthtml/d100010/mp000000-000010/ht2041102020',
  text:'『行橋市史』によると、岩石城の落城翌日、豊臣秀吉は筑前の大隈城で秋月種実・種長父子の降伏を受け入れた。'
 });
}

/* 肥後拝領を九州平定の一括変更から分け、隈本の管理域を切り替える。 */
{
 const lunarDate=[1587,6,2],d=TK.lunarDate(...lunarDate);
 const campaign=TK.HIST.find(e=>e.title==='九州平定'&&e.k==='take'&&e.castles?.includes('kumamoto'));
 if(!campaign)throw Error('九州平定の隈本城');
 campaign.castles=campaign.castles.filter(id=>id!=='kumamoto');
 campaign.peace=campaign.peace.filter(id=>id!=='kumamoto');
 TK.HIST.push({
  d,lunarDate,k:'take',clan:campaign.clan,castles:['kumamoto'],admin:1,
  title:'佐々成政の肥後拝領',who:'佐々成政',
  source:'https://sitereports.nabunken.go.jp/files/attach/22/22101/16337_1_%E4%B8%8B%E5%9F%8E%E9%81%BA%E8%B7%A1.pdf',
  text:'豊臣秀吉が佐々成政に肥後の統治を任せた。成政は隈本城を居城とした。'
 });
}

/* 球磨の相良氏は島津への従属後も存続し、秀吉の朱印状で本領を安堵された。 */
{
 const capitulation=TK.HIST.find(e=>e.k==='absorb'&&e.clan==='shimazu'&&e.b==='sagara');
 const campaign=TK.HIST.find(e=>e.title==='九州平定'&&e.k==='take'&&e.castles?.includes('hitoyoshi'));
 if(!capitulation||!campaign)throw Error('相良氏の服属と球磨郡安堵');
 capitulation.k='submit';
 campaign.castles=campaign.castles.filter(id=>id!=='hitoyoshi');
 campaign.peace=campaign.peace.filter(id=>id!=='hitoyoshi');
 const lunarDate=[1587,5,30];
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'submit',clan:'hashiba',b:'sagara',at:'hitoyoshi',
  title:'相良氏の球磨郡安堵',who:'相良頼房',
  source:'https://dcollections.lib.keio.ac.jp/en/sagara/003-077',
  text:'豊臣秀吉が相良頼房に朱印状を出し、球磨郡の所領を安堵した。'
 });
}

/* 筑前と柳川の国分けは六月二十五日付の領知に合わせる。 */
{
 const campaign=TK.HIST.find(e=>e.title==='九州平定'&&e.k==='take'&&e.castles?.includes('tachibana'));
 const yanagawa=TK.HIST.find(e=>e.k==='take'&&e.castles?.includes('yanagawa')&&e.who==='立花宗茂');
 if(!campaign||!yanagawa)throw Error('筑前と柳川の国分け');
 campaign.castles=campaign.castles.filter(id=>id!=='tachibana');
 campaign.peace=campaign.peace.filter(id=>id!=='tachibana');
 const lunarDate=[1587,6,25];
 const d=TK.lunarDate(...lunarDate);
 Object.assign(yanagawa,{
  d,lunarDate,title:'立花宗茂の筑後拝領',
  source:'https://artsandculture.google.com/story/KgWRWPxXFzYZIQ?hl=ja',
  text:'豊臣秀吉が立花宗茂に筑後の山門・三潴・下妻・三池四郡を与えた。宗茂は柳川を本拠とした。'
 });
 TK.HIST.push({
  d,lunarDate,k:'take',clan:'hashiba',castles:['tachibana'],admin:1,
  title:'小早川隆景の筑前拝領',who:'小早川隆景',
  source:'https://i-manabi.jp/system/regionals/regionals/ecode%3A2/64/view/8144',
  text:'豊臣秀吉が小早川隆景に筑前などを与えた。筑前の立花山城は小早川方の管理に入った。'
 });
}

/* 高城包囲と根白坂への夜襲は別の日の出来事。 */
{
 const battle=TK.HIST.find(e=>e.k==='note'&&e.title==='根白坂の戦い');
 if(!battle)throw Error('根白坂の戦い');
 const source='https://www.town.kijo.lg.jp/sosikikarasagasu/kyouikuiinkai_kyouikuka/1_1/1/3299.html';
 const lunarDate=[1587,4,17];
 Object.assign(battle,{
  d:TK.lunarDate(...lunarDate),lunarDate,source,
  text:'高城の救援に向かった島津軍が夜に根白坂を攻めた。宮部継潤ら豊臣方の守備を崩せず、翌朝に撤退した。'
 });
 const siegeDate=[1587,4,6];
 TK.HIST.push({
  d:TK.lunarDate(...siegeDate),lunarDate:siegeDate,k:'note',clan:'hashiba',
  title:'日向高城の包囲',who:'羽柴秀長',source,
  text:'羽柴秀長軍が日向の高城を包囲した。山田有信は都於郡城の島津本軍に救援を求めた。'
 });
}

/* 都於郡城は九州平定後も佐土原の島津氏の所領。 */
{
 const campaign=TK.HIST.find(e=>e.title==='九州平定'&&e.k==='take'&&e.castles?.includes('tonokori'));
 if(!campaign)throw Error('九州平定の都於郡城');
 campaign.castles=campaign.castles.filter(id=>id!=='tonokori');
}

/* 香春岳での降伏と、翌年の豊前・日向の国分けを分ける。 */
{
 const lunarDate=[1586,12,11];
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'note',at:'kawara',clan:'hashiba',
  title:'高橋元種の降伏',who:'高橋元種',
  source:'https://www.town.kanda.lg.jp/page/1884.html',
  text:'毛利軍が香春岳城に迫り、高橋元種が降伏した。秀吉による豊前・日向の国分けは翌年のことだった。'
 });
}

/* 田川は中津の黒田領と分け、戦後の国分けとして扱う。 */
{
 const campaign=TK.HIST.find(e=>e.title==='九州平定'&&e.k==='take'&&e.castles?.includes('kawara'));
 if(!campaign)throw Error('九州平定の香春岳城');
 campaign.castles=campaign.castles.filter(id=>id!=='kawara');
 const lunarDate=[1587,7,3];
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'take',clan:'hashiba',castles:['kawara'],admin:1,
  title:'森吉成の豊前拝領',who:'森吉成（毛利勝信）',datePrecision:'日',
  source:'https://adeac.jp/yukuhashi-city/texthtml/d100010/mp000000-000010/ht2040100020',
  text:'九州平定後の国分けで、森吉成（毛利勝信）は豊前の企救・田川二郡を与えられ、小倉を本拠とした。赤間関で豊前の大名配置が定められた。'
 });
}

/* 石垣原での交戦と大友義統の降伏は二日離れている。 */
{
 const lunarDate=[1600,9,15];
 TK.BATTLE_EVENT_EXCLUSIONS['石垣原の戦いの後、大友義統が降伏']='石垣原の戦いの終結経過として年表に表示。既存合戦図の9月15日降伏と同じ記録で、別の交戦として再生しない。';
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'note',
  title:'石垣原の戦いの後、大友義統が降伏',who:'大友義統',
  source:'https://www.city.beppu.oita.jp/doc/gakusyuu/bunkazai/booklet/no44.pdf',
  text:'石垣原で敗れた大友義統が黒田方に降伏した。'
 });
}

/* 知行充行状の日と、その翌年の中津城の着工日を分ける。 */
{
 const grantDate=[1587,7,3];
 const constructionDate=[1588,1,11];
 TK.HIST.push({
  d:TK.lunarDate(...grantDate),lunarDate:grantDate,k:'note',
  title:'黒田孝高の豊前拝領',who:'黒田孝高',
  source:'https://museum.city.fukuoka.jp/archives/leaflet/566/index03.html',
  text:'豊臣秀吉が黒田孝高に豊前六郡を与えた。孝高は入国後、まず馬ヶ岳城を本拠とした。'
 },{
  d:TK.lunarDate(...constructionDate),lunarDate:constructionDate,k:'note',
  title:'黒田孝高の中津城着工',who:'黒田孝高',
  source:'https://www.town.yoshitomi.lg.jp/gyosei/chosei/v995/y209/kyouiku_iinkai/z796/4/2/',
  text:'黒田孝高が豊前の中津に城の造営を始めた。'
 });
}

{
 const lunarDate=[1600,12,26];
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'note',
  title:'細川忠興の中津入城',who:'細川忠興',
  source:'https://adeac.jp/yukuhashi-city/texthtml/d100010/mp000000-000010/ht2042101020',
  text:'丹後から豊前へ移った細川忠興が中津城に入った。'
 });
}

/* 県城の請取命令と、引渡しの落着を知らせる書状を区別する。 */
{
 const orders=[
  [[1613,12,15],'幕府が県城の請取を命じる','https://dcollections.lib.keio.ac.jp/ja/sagara/003-113','幕府の年寄が、稲葉典通と相良頼房に日向の県城を受け取るよう命じた。'],
  [[1614,7,13],'有馬直純の県入部','https://history.miyazaki.jp/nenpyo.html','有馬直純が肥前の日野江から日向の県へ移った。'],
  [[1614,8,25],'県城引渡しの落着','https://dcollections.lib.keio.ac.jp/ja/sagara/003-116','本多正信が相良頼房に、県城の引渡しが落着したことを伝えた。']
 ];
 for(const [lunarDate,title,source,text] of orders){
  TK.HIST.push({
   d:TK.lunarDate(...lunarDate),lunarDate,k:'note',at:'agata',
   title,source,text
  });
 }
}

/* 県入部に合わせて有馬家の管理域を移す。日野江の明渡し日は未詳。 */
{
 const arrival=TK.HIST.find(e=>e.title==='有馬直純の県入部');
 Object.assign(arrival,{k:'take',clan:'arima',castles:['agata'],admin:1,who:'有馬直純'});
 TK.HIST.push({
  d:arrival.d,lunarDate:arrival.lunarDate,k:'take',clan:'tokugawa',castles:['hinoe'],admin:1,
  title:'日野江の有馬旧領を幕府が管理',datePrecision:'年',
  source:'https://www.city.shimabara.lg.jp/rekishi/page2678.html',
  text:'有馬直純の転封後、幕府は日野江の旧領の統治を周辺の諸家に委ねた。'
 });
}

{
 const lunarDate=[1612,3,18];
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'appear',clan:'arima',at:'hinoe',
  g:'有馬直純|55|55|55|55|1586',leader:true,heir:1,
  title:'有馬直純が家督を継ぐ',who:'有馬直純',
  source:'https://rekimoku.xsrv.jp/3-zyoukaku-13-sunpujo.html',
  text:'岡本大八事件で有馬晴信が失脚し、幕府はその所領を子の直純に与えた。'
 });
}

{
 const lunarDate=[1577,10,3];
 const source=TK.RESEARCH_SOURCES.shigisanChronicle.url;
 TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'note',at:'yamato',who:'織田信忠',
  title:'織田信忠が信貴山城を包囲',source,
  text:'織田信忠が信貴山城に迫って陣を置き、城下に火を放った。'
 });
}

{
 const lunarDate=[1581,3,22];
 const event=TK.HIST.find(e=>e.title==='高天神城の戦い'&&e.k!=='premarch');
 Object.assign(event,{
  d:TK.lunarDate(...lunarDate),lunarDate,documentedMarch:true,
  source:'https://www.city.kakegawa.shizuoka.jp/gyosei/docs/8328.html',
  text:'徳川方の砦に囲まれ兵糧が尽きた高天神城から、岡部元信らが討って出た。元信らは戦死し、城は落ちた。'
 });
}

/* 包囲・救援・開城の日を分け、合戦の管理拠点への自動出陣を抑止する。 */
{
 const sayo='https://www.town.sayo.lg.jp/cms-sypher/www/info/detail.jsp?id=11722';
 const nobunaga='https://ja.wikisource.org/wiki/信長公記';
 const mie='https://www.pref.mie.lg.jp/common/content/001067704.pdf';
 const note=(lunarDate,title,at,source,text)=>TK.HIST.push({
  d:TK.lunarDate(...lunarDate),lunarDate,k:'note',title,at,source,text
 });
 const resolve=(title,lunarDate,source,text)=>{
  const event=TK.HIST.find(e=>e.title===title&&e.k!=='premarch');
  Object.assign(event,{d:TK.lunarDate(...lunarDate),lunarDate,source,text,documentedMarch:true});
  delete event.also;
  return event;
 };
 note([1578,4,18],'毛利方が上月城を包囲','himeji',sayo,'吉川元春・小早川隆景の軍が上月城を取り囲んだ。');
 note([1578,5,4],'上月城の救援軍が高倉山に着陣','himeji',sayo,'羽柴秀吉・荒木村重らは高倉山に陣を置いた。');
 note([1578,6,26],'羽柴秀吉が高倉山から撤退','himeji',sayo,'織田信長の命を受けた秀吉が高倉山から兵を引いた。');
 const kozuki=resolve('上月城の戦い',[1578,7,5],sayo,'救援を失った上月城が開城した。尼子勝久らは自害し、山中幸盛は備中へ送られた。');
 kozuki.kill=['尼子勝久'];
 const death=[1578,7,17];
 TK.HIST.push({d:TK.lunarDate(...death),lunarDate:death,k:'death',n:'山中幸盛',at:'bmatsuyama',
  title:'山中幸盛が阿井の渡しで討たれる',source:'https://www.city.takahashi.lg.jp/site/bichu-matsuyama/nenpyou.html',
  datePrecision:'月日は通説による',text:'上月城から備中への護送中、山中幸盛は高梁川の阿井の渡しで討たれた。'});

 note([1579,10,15],'滝川一益が有岡城の外郭を破る','akutagawa',nobunaga,'滝川一益が上臈塚砦から攻め入り、荒木方は本丸に退いた。');
 resolve('有岡城の戦い',[1579,11,19],nobunaga,'荒木久左衛門らは有岡城を出て尼崎へ向かい、織田信澄が城内の警固に入った。');

 TK.BATTLE_EVENT_EXCLUSIONS['鍋島勝茂が安濃津城を攻める']='安濃津城の戦いの8月22日の経過として年表に表示。既存合戦図の鍋島勢の攻撃に対応し、別の合戦として二重再生しない。';
 TK.BATTLE_EVENT_EXCLUSIONS['毛利勢が安濃津城を攻める']='安濃津城の戦いの8月24日の経過として年表に表示。既存合戦図の毛利勢の攻撃に対応し、別の合戦として二重再生しない。';
 note([1600,8,22],'鍋島勝茂が安濃津城を攻める','kiriyama',mie,'鍋島勝茂の軍が浜手から安濃津城を攻めた。');
 note([1600,8,24],'毛利勢が安濃津城を攻める','kiriyama',mie,'毛利秀元ら西軍が安濃津城を攻めた。');
 resolve('安濃津城の戦い',[1600,8,25],mie,'長束正家が和議を仲介し、富田信高の守る安濃津城は開城した。');
}
