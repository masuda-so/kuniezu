"use strict";
/* 兵数表を持たず年表だけにあった合戦も表示する。兵数不明を表示除外の理由にしない。 */
(function(){
 const refs={
  eventUshikubo:['豊川市','牛久保城下の古図','https://www.city.toyokawa.lg.jp/soshiki/shimin/bunkashinko/2/1/1/6/2/6604.html','牛久保城・城下の所在。古図の描画年代と1561年当日を区別'],
  eventYoshida:['豊橋市','文化財保存活用地域計画','https://www.city.toyohashi.lg.jp/secure/70312/070220siryo2.pdf','29頁・酒井忠次の攻防と統治。1565年の吉田城代退去'],
  eventKakegawa:['掛川市','家康が遠江に侵攻、今川家は滅亡','https://www.city.kakegawa.shizuoka.jp/gyosei/docs/7521.html','1568〜1569年の掛川城包囲と和議'],
  eventTebai:['つくば市','つくばの歴史','https://www.city.tsukuba.lg.jp/shisei/joho/profile/rekishi/index.html','1569年・手這坂の合戦と小田氏敗走。戦場の精密な範囲は未確定'],
  eventIshiyama:['東本願寺','東本願寺について','https://www.honganji.or.jp/about/','第11世顕如・石山合戦。宗派による叙述で、各隊の位置は示さない'],
  eventKizugawa:['鳥羽市','九鬼嘉隆','https://www.city.toba.mie.jp/material/files/group/70/yoshitakagaiyou.pdf','1576・1578年の木津川口、鉄甲船に関する多聞院日記の説明'],
  eventKizugawa1614:['黒田日出男／徳川美術館','徳川美術館蔵「豊国祭礼図屏風」の注文主','https://www.tokugawa-art-museum.jp/wp-content/uploads/2025/02/46_1-%E8%AB%96%E6%96%87%EF%BC%8F%E9%BB%92%E7%94%B0%E6%97%A5%E5%87%BA%E7%94%B7.pdf','PDF4頁・二節。11月19日の蜂須賀至鎮・浅野長晟・池田忠雄、29日博労淵。個別の精密な持場は示さない'],
  kizujouMuseum:['大阪歴史博物館','共同研究成果報告書17・第2章第1節','https://www.osakamushis.jp/education/publication/kyodokenkyu/pdf/kyodo-17/kyodo-17_3.pdf','32〜34頁・木津城。1614年の徳川付城、集落と浜堤、所在地・規模・構造の不明確さ。1576年の木津城と1614年の河口砦を同一地点と確定しない'],
  eventHarima:['姫路市','姫路城保存活用計画 第2章','https://www.city.himeji.lg.jp/kanko/cmsfiles/contents/0000030/30274/chapter2.pdf','近世・1577年播磨入りと1580年以降の姫路城整備'],
  eventTanba:['丹波篠山市','戦国乱世の道・波多野氏の山城','https://www.city.tambasasayama.lg.jp/material/files/group/75/sengokuransenomichi.pdf','八上城・周囲の付城。丹後の全城の開城日を裏付ける資料ではない'],
  eventGifu:['岐阜市','岐阜城跡保存活用計画 第2章','https://www.city.gifu.lg.jp/_res/projects/default_project/_page_/001/005/558/hozonkatuyou12.pdf','38頁・織田信孝、池田氏、1600年8月22〜23日'],
  eventMatsugashima:['松阪市','織田信雄が築き、蒲生氏郷も入った松ヶ島城','https://www.city.matsusaka.mie.jp/uploaded/attachment/31536.pdf','小牧長久手期の戦場化と1584年の蒲生氏郷入城'],
  eventToyama:['富山市','富山市のあゆみ','https://www.city.toyama.lg.jp/_res/projects/default_project/_page_/001/002/575/2026toyama_all.pdf','1585年、佐々成政降伏と富山城明渡し'],
  eventHetsugi:['大分市教育委員会','宗麟と府内のまち','https://www.city.oita.oita.jp/o204/bunkasports/rekishi/documents/sorinfunainomachi2026.pdf','62〜63頁、戸次川古戦場・鶴賀城・鏡城'],
  eventOkpo:['韓国学中央研究院','옥포（玉浦）','https://encykorea.aks.ac.kr/Article/E0038822','壬辰倭乱の海戦海域。現代の造船所用地を当時の陸地と扱わない'],
  eventAizu:['小山市立博物館','平成26年度 小山評定特別展','https://www.city.oyama.tochigi.jp/museum/exhibition/h26/page002415.html','1600年の会津への進軍と西上。会津での本隊決戦は発生していない']
 };
 for(const [id,[author,title,url,locator]] of Object.entries(refs))TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope:'地域と経過の確認。部隊の個別持場・総兵数・連続的な移動は未確定。',accessed:'2026-11-01'};
 const add=(title,kind,geo,clans,labels,names,source,summary,groups)=>{
  TK.EXTRA_BATTLES[title]={kind,geo,clans,labels,names,source,summary,groups:groups||labels.map((label,i)=>[label,'*'+(i?'b':'a'),'center','地域の代表点・対陣方向と距離は未詳'])};
  TK.BATTLE_TROOPS[title]={a:{lead:names[0].join('・'),tr:0},b:{lead:names[1].join('・'),tr:0},certainty:'兵数表未登録だった年表上の合戦。個別兵数は未確定',sources:[source]};
 };
 const siege=(label)=>[[label,'*b','center','城域の代表点・曲輪別の持場は未詳'],['攻囲側・持場未詳','*a',null,'攻囲位置は未確定']];
 add('牛久保城攻め','siege',[137.389,34.808,6,'牛久保城付近'],['tokugawa','imagawa'],['松平方','今川方'],[['松平元康'],['牛久保の今川方']],'eventUshikubo','吉田城とは別の牛久保城周辺を表示。城下古図を1561年の確定図とは扱わない。',siege('牛久保城の守備側'));
 add('三河平定','campaign',[137.32,34.84,35,'東三河と吉田城'],['tokugawa','imagawa'],['松平方','今川方'],[['松平家康','酒井忠次'],['吉田城の今川方']],'eventYoshida','吉田城を中心とした東三河支配の転換。城代の退去を全三河同日の決戦として描かない。');
 add('掛川城開城','siege',[138.014,34.776,9,'掛川城'],['tokugawa','imagawa'],['徳川方','今川方'],[['徳川家康'],['今川氏真','朝比奈泰朝']],'eventKakegawa','1568年末からの包囲と1569年の和議。現存の復元天守を当時の城として描かない。',siege('掛川城内'));
 add('手這坂の戦い','field',[140.12,36.16,15,'小田城周辺・手這坂'],['satake','odah'],['佐竹方','小田方'],[['太田資正'],['小田氏治']],'eventTebai','小田氏の敗走と小田城喪失。図の点は周辺地域で、手這坂の戦闘線は未復元。');
 add('石山合戦はじまる','campaign',[135.52,34.68,18,'石山本願寺と周辺'],['honganji','oda'],['織田方','本願寺方'],[['織田信長'],['顕如']],'eventIshiyama','1570年の開戦地域。後の豊臣大坂城を本願寺の建物に置き換えて描かない。');
 add('第一次木津川口の戦い','naval',[135.47,34.66,16,'木津川口・大坂湾'],['oda','mori','honganji'],['織田水軍','毛利方水軍'],[['織田方水軍'],['毛利方水軍']],'eventKizugawa','1576年の海戦。図は旧河口周辺の地域を示し、現代の埋立地上の点を厳密な海戦地点とは扱わない。');
 add('中国攻め','campaign',[134.69,34.84,70,'姫路・播磨'],['oda','mori'],['織田・羽柴方','毛利方'],[['羽柴秀吉'],['毛利方諸勢力']],'eventHarima','1577年の播磨進出。姫路を拠点とする長期戦役で、両軍が姫路城内で戦ったとの意味ではない。', [['姫路・羽柴方の拠点','*a',[134.694,34.839],'地域拠点'],['毛利方・戦線は時期により異なる','*b',null,'この場面での対陣位置は未確定']]);
 add('第二次木津川口の戦い','naval',[135.47,34.66,16,'木津川口・大坂湾'],['oda','mori','honganji'],['織田水軍','毛利方水軍'],[['九鬼嘉隆'],['毛利方水軍']],'eventKizugawa','1578年の海戦。船の構造・隻数には解釈差があり、精密な船列を創作しない。');
 add('丹波・丹後平定','campaign',[135.18,35.18,120,'丹波・丹後'],['oda','hatano','isshiki'],['織田方','丹波・丹後諸勢力'],[['明智光秀','細川藤孝'],['波多野秀治','一色方']],'eventTanba','八上など複数拠点の攻略を扱う方面図。一日に丹波・丹後全域で決戦が起きたとの意味ではない。');
 add('岐阜城の開城','siege',[136.782,35.434,8,'岐阜城'],['oda','hashiba'],['信雄・秀吉方','信孝方'],[['織田信雄'],['織田信孝']],'eventGifu','1583年の開城。1600年の織田秀信の戦いとは分ける。',siege('岐阜城・信孝方'));
 add('松ヶ島城の戦い','siege',[136.537,34.604,8,'松ヶ島城'],['hashiba','oda'],['羽柴方','信雄方'],[['羽柴方攻城勢'],['松ヶ島城守備勢']],'eventMatsugashima','1584年の松ヶ島。蒲生氏郷の入城と攻城時の持場を混同しない。',siege('松ヶ島城内'));
 add('富山の役','siege',[137.212,36.692,25,'富山城周辺'],['hashiba','sassa'],['羽柴方','佐々方'],[['羽柴秀吉'],['佐々成政']],'eventToyama','1585年の富山城明渡し。後世の神通川改修や近代の模擬天守は当時の構造ではない。',siege('富山城・佐々方'));
 add('戸次川の戦い','field',[131.635,33.15,10,'戸次川・鶴賀城方面'],['hashiba','chosokabe','otomo','shimazu'],['大友・四国連合軍','島津方'],[['仙石秀久','長宗我部元親','長宗我部信親','十河存保'],['島津家久']],'eventHetsugi','戸次川の交戦域。鶴賀城救援の動きと大野川周辺の戦闘を区別し、義久を現地指揮官として置かない。');
 add('小田原開城','siege',[139.153,35.25,15,'小田原城'],['hashiba','hojo','tokugawa'],['豊臣方','北条方'],[['豊臣秀吉','徳川家康'],['北条氏政','北条氏直']],'odawara1590','小田原征伐の終結段階。北条諸城がすべてこの日に開城したとは扱わない。',siege('小田原城内'));
 add('玉浦海戦','naval',[128.71,34.885,12,'巨済島・玉浦湾'],['hashiba','joseon'],['朝鮮水軍','日本側船団'],[['李舜臣'],['玉浦の日本側船団']],'eventOkpo','1592年の玉浦湾での海戦。現代の造船所による埋立てを比較海岸として明示する。');
 add('会津征伐','campaign',[139.85,36.95,210,'下野から会津への方面'],['tokugawa','nagao'],['徳川方','上杉方'],[['徳川家康'],['上杉景勝']],'eventAizu','会津へ向かう出兵。家康本隊が会津で上杉本隊と戦った架空の決戦は表示しない。',[['徳川本隊・進軍途中','*a',null,'日ごとの位置は年表・戦役一覧に分離'],['会津方面の上杉方','*b',[139.93,37.49],'会津の代表点']]);
 add('岐阜城の戦い','siege',[136.782,35.434,12,'岐阜城・金華山'],['tokugawa','oda'],['東軍','西軍'],[['福島正則','池田輝政'],['織田秀信']],'eventGifu','1600年旧暦8月23日。前日の木曽川付近での戦闘と城内の最終抵抗を区別。',siege('岐阜城・秀信方'));
 add('木津川口の戦い','field',[135.48,34.645,9,'木津川口・大坂南西'],['tokugawa','hashiba'],['徳川方','豊臣方'],[['蜂須賀至鎮','浅野長晟','池田忠雄'],['木津川口砦の守備勢']],'eventKizugawa1614','冬の陣初期、蜂須賀至鎮・浅野長晟・池田忠雄が木津川口の砦攻撃を命じられ、蜂須賀勢が先に攻略した。');
 TK.EXTRA_BATTLES['木津川口の戦い'].sources=['eventKizugawa1614','kizujouMuseum'];
 TK.BATTLE_TROOPS['木津川口の戦い'].sources=['eventKizugawa1614','kizujouMuseum'];
 add('真田丸の戦い','siege',[135.526,34.671,4,'真田丸・大坂城南方'],['tokugawa','hashiba','sanada'],['徳川方','豊臣方'],[['前田利常','井伊直孝','松平忠直'],['真田信繁']],'osakaMuseum','真田丸を中心とした局地戦。前田・井伊・松平勢の個別隊間隔は未詳。',siege('真田丸・真田勢'));
 TK.BATTLE_EVENT_EXCLUSIONS={'粟之巣の変':'拉致と死亡の事件として年表に表示。軍勢の対陣資料は未登録。','大坂冬の陣の和睦':'大坂冬の陣の終結経過へ統合。別の合戦として二重再生しない。'};
})();
