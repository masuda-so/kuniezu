"use strict";
/* 朝鮮の邑城・山城・鎮城・宮殿・水軍拠点と、日本軍築城の倭城を区別。 */
(function(){
const refs={
 krBongeunsa:['韓国学中央研究院','수도산 봉은사（修道山 奉恩寺）','https://encykorea.aks.ac.kr/Article/E0023980','本文・沿革','1562年の修道山移転と壬辰倭乱での焼失。焼失の日付と戦後の活動再開時期は未確定。'],
 krBongseonsa:['김성연／韓国学中央研究院','운악산 봉선사（雲岳山奉先寺）','https://encykorea.aks.ac.kr/Article/E0023921','歴史的変遷','1469年の再興、1592年の焼失、1593年の再建。月日は確定しない。'],
 krHaeinsaDepository:['김성수／韓国学中央研究院','판전（板殿）','https://encykorea.aks.ac.kr/Article/E0080168','1）海印寺蔵経板殿','1457・1488年の再建と壬辰倭乱を免れた蔵経施設。寺域全体の建物が同年代とはしない。'],
 krBusan:['韓国学中央研究院','부산진성（釜山鎮城）','https://encykorea.aks.ac.kr/Article/E0024279','内容','侵攻前の城は鄭公壇付近、1593年の子城台は別施設。'],
 krDongnae:['釜山市東萊区','동래성 전투이야기（東萊城の戦い）','https://www.dongnae.go.kr/index.dongnae?menuCd=DOM_000000906000000000','1592年4月14〜15日','邑城での抵抗。現存・復元された後世の城壁は同一視しない。'],
 krJinju:['国家遺産庁','진주성（晋州城）','https://heritage.go.kr/heri/cul/culGuidePostDetail.do?ccbaCpno=1333801180000&ccgbGbtype=UNI&ccgbGbtypeNo=1&pageNo=1_5_0_0','文化遺産案内','邑城と1592年の守備。後世の内城増設を遡らせない。'],
 krNagan:['韓国学中央研究院','순천 낙안읍성（楽安邑城）','https://encykorea.aks.ac.kr/Article/E0011626','内容・世宗実録1424年条の説明','15世紀の石城化。現存建物の全棟を16世紀の姿とはしない。'],
 krHaengju:['高陽市','행주대첩（幸州大捷）','https://www.goyang.go.kr/haengju/haengju02/haengju02_2.jsp','幸州山城の歴史','1593年の権慄軍。山城と漢江の関係。'],
 krPalace:['国家遺産庁 宮陵遺跡本部','경복궁 소개·역사（景福宮の歴史）','https://royal.khs.go.kr/ROYAL/contents/R101010000.do?menuId=03_01_01','沿革','1395年創建、1592年焼失、1867年再建。'],
 krHansan:['韓国学中央研究院','한산도（閑山島）','https://encykorea.aks.ac.kr/Article/E0061674','内容','1597年廃陣。現在の制勝堂を当時の建物と同一視しない。'],
 krTongyeong:['韓国学中央研究院','통영시（統営市）','https://encykorea.aks.ac.kr/Article/E0059371','歴史','1593年の閑山島統制営、1604年の頭龍浦移転。'],
 krUlsan:['韓国学中央研究院','울산왜성（蔚山倭城）','https://encykorea.aks.ac.kr/Article/E0040485','内容','1597年の築城。1560年から存在する城ではない。'],
 krSeosaeng:['韓国学中央研究院','서생포왜성（西生浦倭城）','https://encykorea.aks.ac.kr/Article/E0027861','内容','朝鮮侵攻期の倭城、1598年の日本軍撤退。'],
 krSuncheon:['韓国学中央研究院','순천왜성（順天倭城）','https://encykorea.aks.ac.kr/Article/E0032256','内容','1597〜98年の拠点と小西行長軍。'],
 krSacheon:['韓国学中央研究院','사천 선진리성（泗川船津里城）','https://encykorea.aks.ac.kr/Article/E0026014','内容','1597年の倭城。下層の通陽倉城との区別。']
};
for(const [id,[author,title,url,locator,scope]] of Object.entries(refs))TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope,accessed:'2026-10-31',year:'各項目の更新年による'};
for(const id of ['krBongseonsa','krHaeinsaDepository'])TK.RESEARCH_SOURCES[id].accessed='2026-11-01';
TK.RESEARCH_SOURCES.krBongseonsa.year='2023年執筆／2024年9月28日改訂';TK.RESEARCH_SOURCES.krHaeinsaDepository.year='2022年執筆／2024年7月2日改訂';
TK.RESEARCH_SOURCES.krBongeunsa.accessed='2026-11-04';
G.YOSHO_FX['宮']={n:'宮殿',fx:'王朝の儀礼と政務の場'};
const sites=[
 ['奉恩寺（修道山）','寺',127.057,37.51517,'1562年、靖陵の移転に伴い修道山に移された禅宗の拠点。壬辰倭乱で焼失した。',1562,1592,'寺院・禅宗の拠点','krBongeunsa'],
 ['奉先寺','寺',127.1835518,37.7473504,'世祖の陵を守る寺院として1469年に再興された。1592年に焼失し、翌1593年に再建された。',1469,null,'陵寺・仏教の拠点','krBongseonsa'],
 ['海印寺（蔵経施設）','寺',128.0980383,35.8010416,'高麗大蔵経の版木を守る寺院。蔵経施設は15世紀に整備され、壬辰倭乱の戦火を免れた。',1488,null,'寺院・経典の保存拠点','krHaeinsaDepository'],
 ['東萊邑城','城',129.091,35.207,'地方行政と防御を兼ねる邑城。1592年に宋象賢らが抵抗。現存の城壁には1731年以後の整備を含む。',null,null,'邑城','krDongnae'],
 ['子城台・釜山鎮支城','城',129.060,35.135,'1593年築城の倭城。侵攻前の釜山鎮城（鄭公壇付近）とは位置も起源も異なる。',1593,null,'倭城','krBusan'],
 ['楽安邑城','城',127.339,34.908,'1424年に石城化が進んだ邑城。郡の行政と住民の生活を囲う。現在の民家をそのまま16世紀へ遡らせない。',1424,null,'邑城','krNagan'],
 ['幸州山城','城',126.825,37.597,'徳陽山の山城。1593年に権慄軍が日本軍を迎え撃った。漢江を背にする地勢。',null,null,'山城','krHaengju'],
 ['景福宮','宮',126.977,37.579,'1395年創建の王宮。1592年焼失後は、このゲームの期間中には再建されない。',1395,1592,'宮殿','krPalace'],
 ['閑山島水軍陣','湊',128.473,34.787,'1593年の三道水軍統制営。1597年に廃陣。後世の制勝堂建物とは区別。',1593,1597,'水軍拠点','krHansan'],
 ['頭龍浦統制営','湊',128.422,34.846,'1604年に統制営が置かれた水軍拠点。現在の統営の中心。',1604,null,'水軍拠点','krTongyeong'],
 ['蔚山倭城（島山城）','城',129.335,35.553,'1597年に日本軍が築いた倭城。蔚山の邑治・兵営城とは別の拠点。',1597,1599,'倭城','krUlsan'],
 ['西生浦倭城','城',129.328,35.386,'朝鮮侵攻期に日本軍が築城。1598年撤退後の使用・改変と区別する。',1593,null,'倭城','krSeosaeng'],
 ['順天倭城','城',127.580,34.902,'1597年に築かれた日本軍の拠点。1598年に小西行長軍が籠城し、のち撤収。',1597,1599,'倭城','krSuncheon'],
 ['泗川倭城（船津里城）','城',128.039,35.004,'1597年の日本軍築城。朝鮮の倉庫・防御施設であった下層遺構とは別の年代。',1597,1599,'倭城','krSacheon']
];
TK.SITE_ACTIVITY=TK.SITE_ACTIVITY||{};TK.SITE_ACTIVITY['奉先寺']=[{fromYear:1469,toYear:1592,source:'krBongseonsa',datePrecision:'year'},{fromYear:1593,toYear:null,source:'krBongseonsa',datePrecision:'year'}];
TK.KOREA_SITES={};for(const row of sites){const [n,kind,lon,lat,desc,y0,y1,role,source]=row;if(!TK.YOSHO.some(y=>y[0]===n))TK.YOSHO.push([n,kind,lon,lat,desc,y0,y1]);TK.KOREA_SITES[n]={role,source,desc};}
TK.KOREA_NODES={busan:['鎮城・港','krBusan'],jinju:['邑城','krJinju'],hanseong:['都城・王都','krPalace'],ulsan:['邑治・軍事拠点','krUlsan'],suncheon:['邑治（倭城とは別）','krSuncheon']};
for(const id of ['daegu','sangju','jeonju','namwon','chungju','gongju','gaeseong','wonju','haeju','pyongyang','uiju','hamhung'])TK.KOREA_NODES[id]=['朝鮮の地域拠点（城郭の年代別構造は要照合）',null];
const evidence=G.castleEvidence;G.castleEvidence=y=>{const m=TK.KOREA_SITES[y.n];return m?{role:m.role,description:m.desc+' 地図の点は所在地の概略。縄張・城壁の実測範囲ではない。',source:TK.RESEARCH_SOURCES[m.source].url}:evidence?.(y);};
const era=G.siteEra;G.siteEra=y=>{const m=TK.KOREA_SITES[y.n];return m?G.kyu().y+'年：'+m.role+'。'+(G.yActive(y)?'この年代の施設として表示。':'この年代には機能していません。')+m.desc+' 年内の細かな月日は未確定。':era(y);};
})();
