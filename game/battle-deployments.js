"use strict";
/*
 * 布陣の表示台帳。地名の代表点、後世の図の概略配置、所在不詳を分離する。
 * point は地点の代表位置で陣地の測量値ではない。dock は位置を示さない図内欄。
 * 旧アニメーションの path から位置を流用しない。未詳の攻め口を城の周囲へ捏造しない。
 */
(function(){
 const sources={
  deploymentWiki:['Wikipedia執筆者','関ヶ原本戦の配置','https://ja.wikipedia.org/wiki/関ヶ原本戦の配置','「日本戦史 関ヶ原役」による図と、黒田家譜・軍記大成・大垣藩地方雑記の比較','参謀本部系の通説と異説を区別。全隊の当日実測図ではない。'],
  gifuDeployment:['岐阜県歴史資料館','関ヶ原合戦御陣場図','https://www.pref.gifu.lg.jp/page/2584.html','No.4、1787年写・原本成立不明','戦場だけでなく街道・前哨戦・城を併記する構成の参考。本文の慶長15年は採用しない。'],
  nagashinoDeployment:['新城市','長篠・設楽原の戦い','https://www.city.shinshiro.lg.jp/kanko/meisyo/nagashino-shitaragah.html','「両軍の布陣」「激闘10時間」','極楽寺山・弾正山、連吾川を挟む対陣、長篠城と鳶ヶ巣山。'],
  nagakuteDeployment:['長久手市','史跡長久手古戦場 保存活用計画策定資料','https://www.city.nagakute.lg.jp/material/files/group/14/2shiryou5.pdf','「小牧・長久手合戦陣立図」を参考に現在地へ比定した図','小牧方面と長久手本戦を同じ瞬間の配置としない。'],
  shizugatakeDeployment:['長浜市','余呉地域の歴史文化・賤ヶ岳城砦群と古戦場','https://www.city.nagahama.lg.jp/cmsfiles/contents/0000010/10951/keikaku.pdf','エリア③・賤ヶ岳の合戦','羽柴方は余呉湖南～田上山、柴田方は湖北～玄蕃尾。'],
  okitanawateDeployment:['島原市','沖田畷合戦場跡 龍造寺隆信供養塔','https://www.city.shimabara.lg.jp/rekishi/page2793.html','天正12年3月24日の布陣と攻撃方向','寺中城から南進、森岳・丸尾砦・海岸の有馬島津方。現在の島原城を当時の城として描かない。'],
  moritakeExcavation:['島原市教育委員会','森岳城跡：島原市文化財調査報告書 第14集','https://sitereports.nabunken.go.jp/files/attach/50/50637/46666_1_%E6%A3%AE%E5%B2%B3%E5%9F%8E%E8%B7%A1.pdf','本文2頁・第2節、8頁第4図','有馬方本陣を後の森岳城付近とするが位置不明と明記。森岳の代表点を表示し、近世城郭や精密な本陣座標を1584年へ遡らせない。'],
  moritakeMapPoint:['国土地理院','地理院タイル・標準地図','https://maps.gsi.go.jp/#15/32.78984/130.36656/','z15・28250/13221、森岳の丘の現代代表点','地図記号から約100mの読取幅で位置を対応。1584年の本陣そのものの測量値ではない。'],
  yasumimatsuDeployment:['朝倉市','ふるさと人物誌1 秋月種実','https://www.city.asakura.lg.jp/site/furusato/1234.html','休松の大友本陣への夜襲','休松は現在の柿原付近。古処山城の攻囲と夜襲の場所を区別。'],
  shimantoDeployment:['四万十市','広報しまんと 平成30年10月号','https://www.city.shimanto.lg.jp/uploaded/attachment/4675.pdf','「一條兼定と渡川合戦」','渡川右岸からの一条方の進出。個別隊の配置は別問題。'],
  ishigakibaruDeployment:['別府市','軍師官兵衛ゆかりの石垣原合戦','https://www.city.beppu.oita.jp/gakusyuu/bunkazai/kassen_index.html','9月13日・15日の経過','吉弘統幸、黒田・松井勢と大友義統の降伏。'],
  anotsuDeployment:['津市','津藩祖 藤堂高虎','https://www.info.city.tsu.mie.jp/kosodate_kyouiku/kyouikuiinkai/1004357/1004663/1004713/1004736.html','富田氏の入城と関ヶ原前の攻城','毛利秀元の攻城、富田信高の守備。藤堂期の津城を1600年へ遡らせない。'],
 };
 sources.odawara1590=['小田原城総合管理事務所','小田原城の歴史年表','https://odawaracastle.com/history/nenpyo/index.html','1590年の小田原合戦','1561年の上杉攻城と1590年の総構・石垣山本陣を区別する。'];
 sources.sawayamaDeployment=['彦根市','佐和山城','https://www.city.hikone.lg.jp/kanko/rekishi/9/6/7608.html','城の沿革・遺構','山城の位置と沿革。個別の攻め口は図示しない。'];
 sources.krChilcheon=['趙成都／韓国学中央研究院','칠천량해전（漆川梁海戦）','https://encykorea.aks.ac.kr/Article/E0058551','内容・1597年旧暦7月14～15日の夜戦（16日説もある）','元均・李億祺・崔湖・裴楔、日本側の藤堂・脇坂・加藤。戦役総兵数を海戦人数へ流用しない。'];
 sources.krChungju=['金鎮鳳／韓国学中央研究院','탄금대전투（弾琴台戦闘）','https://encykorea.aks.ac.kr/Article/E0058773','申砬の弾琴台布陣・忠州城方面の交戦','弾琴台と忠州城の位置関係。川の現在の水面形を当日の河道としない。'];
 sources.krByeokje=['李章熙／韓国学中央研究院','벽제관전투（碧蹄館戦闘）','https://encykorea.aks.ac.kr/Article/E0022875','礪石嶺・恵陰嶺・望客峴の説明','駅館だけでなく南約3kmの戦闘域を含む。李如松・査大受・楊元と小早川・立花。'];
 sources.krNamwon=['宋正鉉／韓国学中央研究院','남원전투（南原戦闘）','https://encykorea.aks.ac.kr/Article/E0012070','旧暦8月13日の守門分担と16日の落城','東門楊元・李新芳、西門毛承先、南門蔣表、北門李福男。門の正確な座標は図示しない。'];
 for(const [id,[author,title,url,locator,scope]] of Object.entries(sources))TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope,accessed:'2026-10-31'};
 const P={};
 const define=(title,kind,summary,sourceIds,groups=[])=>P[title]={kind,summary,sourceIds,groups};
 // group [地域名, 対象id（*a/*bは未割当の全隊）, 緯経度またはnull, 根拠の種類]
 const g=(label,ids,lon,lat,precision='地域・陣跡の概略位置')=>[label,ids,lon==null?null:[lon,lat],precision];
 define('桶狭間の戦い','field','大高・丸根・鷲津・鳴海と桶狭間を別の戦場として示す。義元本陣には所在地の異説がある。',['okehazama','okeMain','kutsukake'],[
  g('桶狭間付近（本陣の比定に異説）','yoshimoto ii',136.967,35.058),g('大高城・兵糧搬入後','motoyasu udono',136.938,35.067),g('丸根砦','morishige',136.947,35.07),g('鷲津砦','hidetoshi',136.942,35.071),g('鳴海城方面','okabe',136.952,35.08),g('善照寺砦から進出','nobunaga sassa',136.957,35.082),g('鷲津砦の攻撃','asahina',136.943,35.074)]);
 define('第四次川中島の戦い','field','八幡原での本戦と海津城・妻女山方面。啄木鳥戦法や部隊の細かな持場は通説・伝承に基づく。',['kawanakajimaCity'],[g('八幡原・武田本隊','shingen nobushige kansuke morozumi',138.185,36.577),g('上杉本隊・対陣域','kenshin kakizaki naoe',138.18,36.587,'通説による対陣方向'),g('渡河・後衛（詳細位置不詳）','amakasu',null),g('海津・別働隊とされる部隊','kosaka anayama',138.196,36.565,'海津城の代表点・別働隊説')]);
 define('長篠の戦い','field','連吾川西の織田・徳川と東の武田を分ける。長篠城・鳶ヶ巣山の戦闘は別地点。',['nagashinoDeployment','nagashinoMuseum'],[g('極楽寺山・織田本陣','nobunaga',137.509,34.925),g('連吾川西・馬防柵側','teppo1 teppo2',137.518,34.928,'西岸の概略配置・持場不詳'),g('弾正山・徳川本陣','ieyasu okubo',137.516,34.922),g('連吾川東・武田陣地','katsuyori yamagata naito baba sanada tsuchiya',137.533,34.93,'東側台地・個別隊間隔は不詳'),g('鳶ヶ巣山・攻撃側','sakai',137.573,34.92),g('鳶ヶ巣山・守備側','kawakubo',137.576,34.921),g('長篠城','okudaira',137.5605,34.919)]);
 define('関ヶ原の戦い','field','参謀本部系の通説図を参照した配置。南宮山勢・松尾山勢・後方を分ける。凸は各集団の代表地点で隊の間隔を意味しない。',['deploymentWiki','sekigaharaGuide','sekigaharaStudy','gifuDeployment'],[
  g('笹尾山・石田勢','mitsunari sakon gamo',136.45888,35.37178),g('島津勢','shimazu toyo',136.45919,35.36707),g('北天満山・小西勢','konishi',136.45797,35.36593),g('南天満山・宇喜多勢','ukita roster-明石掃部',136.45501,35.36285),g('山中・大谷勢','otani hiratsuka toda roster-大谷吉勝 roster-木下頼継',136.45057,35.36012),g('松尾山・小早川勢','kobayakawa',136.451,35.345,'通説・松尾山の代表地点'),g('松尾山麓・四将','wakisaka kutsuki akaza ogawa',136.46,35.355,'通説による概略配置'),g('東軍北翼','kuroda roster-竹中重門 tanaka hosokawa',136.47068,35.36945,'黒田陣跡と通説の北翼'),g('東軍中央','yuraku kato tsutsui kanamori ikoma',136.471,35.364,'通説による概略配置'),g('東軍前衛','fukushima ii tadayoshi',136.465,35.361,'通説による概略配置'),g('東軍南翼','todo kyogoku roster-古田重勝 roster-寺沢広高',136.471,35.357,'通説による概略配置'),g('桃配山・家康本陣','ieyasu honda',136.49,35.361,'開戦前の通説。最後陣跡と区別'),g('中山道・後方','yamauchi arima asano',136.51,35.365,'通説による概略配置'),g('南宮山の抑え','ikeda',136.535,35.365,'通説による概略配置'),g('南宮山・不参戦','kikkawa ankokuji mori',136.528,35.348,'山域の概略位置・内応と不参戦を区別'),g('栗原山方面・不参戦','chosokabe roster-長束正家',136.552,35.329,'通説による概略配置')]);
 define('姉川の戦い','field','姉川を挟み、北に浅井・朝倉、南に織田・徳川。川筋と各隊間隔は当日の実測ではない。',['anegawaMuseum'],[g('北岸東側・浅井方','nagamasa isono',136.334,35.426,'後世の図に基づく概略'),g('北岸西側・朝倉方','kagetake',136.32,35.427,'後世の図に基づく概略'),g('南岸東側・織田方','nobunaga sakai inaba',136.334,35.418,'後世の図に基づく概略'),g('南岸西側・徳川方','ieyasu sakakibara',136.319,35.419,'後世の図に基づく概略')]);
 define('三方ヶ原の戦い','field','三方原台地で武田軍を徳川軍が追撃し反転を受ける。魚鱗・鶴翼の形を確定情報として描かない。',['mikatagaharaArchive'],[g('台地・武田軍','*b',137.705,34.812,'戦闘地域の概略・陣形諸説'),g('浜松から進出した徳川軍','*a',137.714,34.798,'進出方向の概略')]);
 define('本能寺の変','incident','旧本能寺と二条新御所を分ける。信忠を本能寺の中に置かない。',['honnojiOldSite'],[g('本能寺旧地・織田信長','nobunaga ranmaru',135.752,35.007),g('二条新御所方面','nobutada murai',135.759,35.018,'御所域の概略位置'),g('明智勢・攻め口未詳','*a',null)]);
 define('山崎の戦い','field','天王山と淀川の間の回廊、円明寺川周辺の対陣を示す。軍の帰還前に本戦の配置へ切り替えない。',['yamazaki'],[g('山崎側・羽柴軍','*a',135.68,34.893,'対陣地域の概略'),g('勝竜寺側・明智軍','*b',135.697,34.91,'対陣地域の概略')]);
 define('賤ヶ岳の戦い','field','余呉湖の南北の陣城と大岩山への攻撃。秀吉の大垣滞在と帰還後を区別する。',['shizugatakeDeployment'],[g('玄蕃尾方面・柴田本陣','katsuie',136.201,35.554),g('茂山方面','toshiie',136.209,35.537,'陣跡の概略'),g('大岩山・攻撃側','morimasa',136.212,35.514),g('大岩山・羽柴方砦','kiyohide',136.214,35.512),g('賤ヶ岳','kuwayama niwa',136.187,35.508),g('木之本・田上山方面（帰還後）','hideyoshi shichi',136.224,35.505)]);
 define('小牧・長久手の戦い','field','小牧山・楽田の対陣と、南の長久手本戦を併記。秀吉本人を長久手の交戦中の前線へ置かない。',['nagakuteDeployment'],[g('小牧方面・羽柴本隊','hideyoshi',136.95,35.31,'広域・対陣地域'),g('小牧山・織田信雄','nobukatsu',136.913,35.291),g('白山林・中入り後軍','hidetsugu',137.015,35.233),g('檜ヶ根方面','hidemasa',137.032,35.204),g('長久手・池田／森','tsuneoki nagayoshi',137.046,35.171),g('御旗山・徳川方','ieyasu ii mizuno',137.052,35.177)]);
 define('耳川の戦い','field','主戦場の高城・小丸川と、北へ敗退した耳川を区別する。全隊の持場は不詳。',[],[g('高城・島津方守備','iehisa',131.487,32.126),g('小丸川方面・島津救援','yoshihisa yoshihiro fushi',131.494,32.114,'戦闘地域の概略'),g('高城包囲・大友軍','*b',null)]);
 define('沖田畷の戦い','field','北の寺中城から龍造寺軍が南下。森岳を本陣とする有馬・島津方は山手から海岸に展開。',['okitanawateDeployment','moritakeExcavation','moritakeMapPoint'],[g('寺中城方面・龍造寺軍','*b',130.355,32.817,'北方からの進出方向'),g('森岳・丸尾方面','iehisa fushi',130.365,32.796,'地域の概略・個別の伏兵位置は不詳'),g('森岳方面・有馬本陣','arima',130.36656,32.78984,'森岳の丘の代表点・本陣の細かな位置は不詳')]);
 define('第一次上田合戦','siege','上田城と戸石城の真田方、東から来攻した徳川軍。詳細な追撃経路には伝承を含む。',['ueda'],[g('上田城','masayuki',138.244,36.404),g('戸石城','nobuyuki',138.29,36.414),g('神川方面・徳川軍','*b',138.278,36.394,'進攻側の地域・隊別の持場不詳')]);
 define('摺上原の戦い','field','猪苗代方面の伊達方と黒川方面の蘆名方が摺上原で交戦。退却の渡河地点まで断定しない。',[],[g('摺上原東側・伊達方','*a',140.075,37.573,'進出側の概略'),g('摺上原西側・蘆名方','*b',140.045,37.573,'進出側の概略')]);
 define('小田原征伐','siege','総構内の北条方と、石垣山・海上を含む豊臣方。石垣山本陣は包囲後期。',['odawara1590'],[g('小田原城・総構内','*b',139.154,35.251),g('石垣山（包囲後期）','hideyoshi',139.125,35.235),g('小田原沖・水軍','kuki',139.17,35.23,'海上封鎖域の概略'),g('陸上包囲・隊別の持場不詳','ieyasu ikeda gamo',null)]);
 define('大坂夏の陣','field','天王寺口・岡山口を分け、秀頼は大坂城に残す。五月七日の主戦場を表示。',['osakaMuseum','osakaMap'],[g('大坂城','hideyori',135.526,34.687),g('茶臼山','sanada',135.509,34.651),g('四天王寺方面','katsunaga',135.517,34.654),g('岡山口・豊臣方','ono',135.531,34.663,'方面の概略'),g('天王寺口・徳川方','tadanao honda ieyasu',135.515,34.644,'方面の概略'),g('岡山口・徳川方','hidetada maeda ii',135.536,34.656,'方面の概略')]);
 define('大坂冬の陣','siege','大坂城と南の真田丸、東の今福・鴫野、西の木津川方面を分ける。各段階を同時の配置としない。',['osakaMuseum','osakaStructure','osakaMap'],[g('大坂城内','hideyori ono kimura chosokabe',135.526,34.687),g('真田丸方面','sanada goto',135.526,34.673),g('茶臼山・徳川本陣','ieyasu',135.509,34.651),g('岡山・秀忠本陣','hidetada',135.532,34.663),g('真田丸正面','maeda ii matsudaira',135.527,34.668,'攻撃方面の概略'),g('今福・鴫野方面','uesugi satake',135.55,34.693),g('木津川方面','hachisuka',135.482,34.668),g('その他の包囲軍・持場未詳','date todo asano',null)]);
 // 攻城は城域と攻め手を分離。未確認の包囲部隊には地理座標を与えない。
 const sieges=[
 ['伏見城の戦い','木幡山伏見城','b','fushimiDiary'],['大津城の戦い','大津城','b','otsu'],['第二次上田合戦','上田城','b','ueda'],['田辺城の戦い','田辺城','b','tanabe'],['長谷堂城の戦い','長谷堂城','b','hasedo'],['高遠城の戦い','高遠城','b','takato'],['小田原城の戦い','小田原城（1561年）','b','odawara1561'],['永禄の変','二条御所','b','eirokuStudy'],['箕輪城落城','箕輪城','b','minowaSite'],['月山富田城開城','月山富田城','b','gassanSite'],['稲葉山城の戦い','稲葉山城','b',null],['大河内城の戦い','大河内城','b','okawachiSite'],['小谷城落城','小谷城','b','odaniSite'],['長島一向一揆の平定','長島・願証寺などの一揆拠点','b',null],['七尾城の戦い','七尾城','b','nanaoSite'],['信貴山城の戦い','信貴山城','b','shigisan'],['上月城の戦い','上月城','b',null],['有岡城の戦い','有岡城・総構','b','ariokaSite'],['高天神城の戦い','高天神城','b','takatenjinSite'],['備中高松城の水攻め','備中高松城','b','takamatsuSite'],['岩屋城の戦い','岩屋城','b','iwaya'],['新発田城落城','新発田城','b',null],['韮山城の戦い','韮山城','b',null],['鉢形城の開城','鉢形城','b',null],['第一次晋州城の戦い','晋州城','b',null],['平壌の戦い','平壌城','b',null],['幸州山城の戦い','幸州山城','b','krHaengjuBattle'],['第二次晋州城の戦い','晋州城','b',null],['蔚山城の戦い','島山・蔚山倭城','b','krUlsanBattle'],['安濃津城の戦い','安濃津城','b','anotsuDeployment'],['佐和山城落城','佐和山城','b','sawayamaDeployment']];
 for(const [title,site,side,src] of sieges)define(title,'siege',site+'の守備と攻城側を表示。攻め口未詳の部隊は図内の欄に置き、特定の方角へ布陣したと扱わない。',src?[src]:[],[['城内・'+site,'*'+side,'center','籠城先・個別持場不詳'],g('攻城側・攻め口未詳','*'+(side==='b'?'a':'b'),null)]);
 define('森部の戦い','field','森部での両軍の対陣。細かな戦場範囲と陣地は未詳。',['moribeSite']);
 define('第二次国府台合戦','field','江戸川東岸・国府台の里見方と北条方。渡河点・陣形を一意に復元しない。',['konodaiSite'],[g('国府台・里見方','*b',139.9,35.751),g('北条方・攻撃方向未詳','*a',null)]);
 define('休松の戦い','field','古処山城周辺の攻囲から、休松の大友本陣への夜襲に至る。',['yasumimatsuDeployment'],[g('休松・大友本陣','*b',130.692,33.444,'柿原付近の概略点'),g('夜襲・秋月方','*a',null)]);
 define('三増峠の戦い','field','三増の谷と峠周辺で帰還中の武田方と北条方が交戦。北条側・武田側の色を見出しと一致させる。',['mimaseSite']);
 define('木崎原の戦い','field','加久藤への攻撃後、木崎原へ引き返した伊東方と島津方が交戦。',['kizakiSite']);
 define('四万十川の戦い','field','渡川右岸へ進出した一条方と長宗我部方の対陣。',['shimantoDeployment'],[g('渡川右岸・一条方','*a',132.897,32.973,'右岸の概略位置'),g('渡川東側・長宗我部方','*b',132.913,32.975,'対陣地域の概略')]);
 define('天王寺の戦い','siege','天王寺砦を囲む本願寺方と、救援へ向かった織田方。1576年を大坂夏の陣の配置と混同しない。',[],[g('天王寺砦・織田方','*b',135.515,34.661,'砦周辺の概略'),g('包囲・本願寺方','*a',null)]);
 define('手取川の戦い','field','七尾攻略後の上杉方と手取川方面の織田方。戦闘地・規模・渡河の細部には異説がある。',[]);
 define('甲州征伐','campaign','伊那谷・高遠・甲府・新府から天目山方面までの戦役。全城の同日落城を示す図ではない。',['takato'],[g('伊那谷から高遠・織田軍','*a',138.062,35.832),g('新府から退去する武田方','*b',138.425240,35.735151,'新府城跡の代表地点')]);
 define('神流川の戦い','field','神流川周辺の北条方と滝川方。渡河点・陣形の厳密な復元ではない。',[]);
 define('中富川の戦い','field','中富川・勝瑞方面で長宗我部方と十河方が交戦。',[]);
 define('黒駒合戦','field','御坂方面から進出する北条別働隊と黒駒の徳川方。',[],[g('御坂方面から北条軍','*a',138.746,35.586,'進出地域の概略'),g('黒駒方面・徳川軍','*b',138.724,35.606,'戦闘地域の概略')]);
 define('紀州征伐','campaign','和泉からの侵攻と根来・雑賀の拠点。戦役中の複数の攻防を一地点へまとめない。',[],[g('和泉方面から豊臣軍','*a',135.268,34.335,'進入方面の概略'),g('根来寺方面','b-0',135.316,34.289),g('雑賀方面','b-1',135.173,34.221,'勢力圏の概略')]);
 define('宇喜多勢の讃岐攻め','campaign','屋島への上陸と讃岐の長宗我部方拠点。個々の城の開城とは区別。',[],[g('屋島方面への上陸','*a',134.108,34.362,'上陸地域の概略'),g('讃岐の長宗我部方','*b',null)]);
 define('小早川隆景の伊予攻め','campaign','毛利方の上陸と金子城など伊予の拠点。河野氏だけを全防衛軍としない。',[],[g('新居郡・金子城方面の毛利軍','*a',133.285,33.95,'進攻地域の概略'),g('伊予諸城の守備側','*b',null)]);
 define('四国攻め','campaign','阿波への秀長軍、讃岐への宇喜多軍、伊予への毛利軍の三方面。長宗我部方の降伏と戦闘を分ける。',[],[g('阿波方面・豊臣本隊','*a',134.39,34.09,'戦役の進攻地域'),g('阿波・長宗我部方','*b',134.248,34.034,'白地方面の代表点')]);
 define('人取橋の戦い','field','本宮・人取橋周辺の伊達方と南奥連合軍。個別隊の配置は未詳。',['hitotoribashiSite']);
 define('九州平定','campaign','豊臣本隊の西岸南下と秀長軍の日向方面を分ける。図は戦役全体の地域関係。',[],[g('筑後・肥後からの豊臣本隊','*a',130.692,32.594,'南下した地域の代表点'),g('薩摩方面の島津方','*b',130.592,31.733,'本拠地域・前線位置ではない')]);
 define('根白坂の戦い','field','高城を囲む豊臣方と、根白坂の陣地へ攻撃した島津方。',[],[g('根白坂・豊臣方','*b',131.459,32.139,'戦闘地域の代表点'),g('島津救援軍','*a',null)]);
 define('北国勢の上野攻め','campaign','碓氷峠・松井田城から上野へ進む北国勢と北条方。',[],[g('松井田城方面・北国勢','*a',138.807,36.32,'進攻地域の概略'),g('松井田城・北条方','*b',138.815,36.323)]);
 define('文禄の役','siege','この場面は1592年釜山鎮の攻防。戦役全体の兵数と各門の守備を混同しない。',['krBusan'],[g('釜山鎮城・朝鮮側','*b',129.056,35.134),g('上陸・攻城する日本側','*a',null)]);
 define('尚州の戦い','field','尚州方面での李鎰軍と小西軍の交戦。方陣の形や個別隊の射線は未詳。',['krSangjuBattle']);
 define('忠州の戦い','field','弾琴台の朝鮮軍と忠州城側の日本軍。川を背にした戦場の位置関係を示す。',['krChungju'],[g('弾琴台方面・朝鮮軍','*b',127.922,36.984,'弾琴台の地域点'),g('忠州城方面・日本軍','*a',127.932,36.97,'進出地域の概略')]);
 define('碧蹄館の戦い','field','北からの明軍と南からの日本軍が碧蹄館・礪石嶺付近で交戦。',['krByeokje'],[g('碧蹄館・明軍','*a',126.904,37.703,'明軍進出地域'),g('礪石嶺方面・日本軍','*b',126.908,37.679,'館の南約3kmの戦闘域')]);
 define('慶長の役・漆川梁海戦','naval','漆川島と巨済島の間の海域。日本水軍による夜襲と朝鮮水軍の退避を表示。',['krChilcheon'],[g('漆川梁・朝鮮水軍','*b',128.656,34.978,'海戦海域の概略'),g('日本水軍・夜襲方向未詳','*a',null)]);
 define('南原城の戦い','siege','南原城の東西南北の守門分担が記録される。各門の厳密な座標は未詳のため城域一か所へ集約。',['krNamwon'],[['南原城・守門部隊','*b','center','東門・西門・南門・北門の役割は隊名欄'],g('日本側攻城軍・攻め口未詳','*a',null)]);
 define('浅井畷の戦い','field','金沢へ戻る前田方を小松の丹羽方が浅井畷で攻撃。細道での軍列の長さは不詳。',[]);
 define('石垣原の戦い','field','旧暦9月13日昼から夕方の交戦と、同夜の黒田孝高着陣、15日の大友義統降伏を分ける。',['ishigakibaruDeployment'],[['大友勢・石垣原の戦闘域','*a','center','対陣方向・個別陣地未詳'],['黒田・松井勢・石垣原の戦闘域','add-井上之房 add-松井康之','center','対陣方向・個別陣地未詳'],g('同夜に実相寺山へ後着','b-0',null,'黒田孝高を昼間の前線へ配置しない')]);
 define('今福・鴫野の戦い','field','今福と鴫野を別地点に表示。佐竹方・上杉方と豊臣方の守備・救援。',['osakaMuseum'],[g('今福・豊臣方','*b',135.552,34.705),g('今福・佐竹方','add-佐竹義宣',135.56,34.705,'攻撃方面の概略'),g('鴫野・上杉方','add-上杉景勝',135.552,34.692,'攻撃方面の概略')]);
 define('道明寺の戦い','field','小松山の後藤勢と大和路からの徳川方、後着の真田・毛利勢を分ける。',['osakaMuseum'],[g('小松山・後藤勢','a-0',135.637,34.576),g('国分・大和路から徳川方','*b',135.645,34.571,'進攻地域の概略'),g('道明寺方面・後着部隊','a-1 a-2',135.627,34.567,'後着時の概略地域')]);
 define('八尾・若江の戦い','field','八尾の藤堂対長宗我部と、若江の井伊対木村を分ける。',['osakaMuseum'],[g('八尾・長宗我部方','b-1',135.604,34.626),g('八尾・藤堂方','a-0',135.614,34.625,'対陣地域の概略'),g('若江・木村方','b-0',135.601,34.653),g('若江・井伊方','a-1',135.611,34.653,'対陣地域の概略')]);
 for(const [title,d] of Object.entries(TK.EXTRA_BATTLES||{}))define(title,d.kind,d.summary,d.sources||[d.source],d.groups);
 TK.DEPLOYMENT_PLANS=P;
 const additions={
  '稲葉山城の戦い':[['斎藤龍興','b']], '長島一向一揆の平定':[['長島一向一揆衆','b']],
  '宇喜多勢の讃岐攻め':[['香川親和ら長宗我部方','b']], '小早川隆景の伊予攻め':[['金子元宅ら伊予勢','b']],
  '九州平定':[['島津義久','b'],['豊臣秀長','a']], '新発田城落城':[['新発田重家','b']],
  '北国勢の上野攻め':[['大道寺政繁','b']], '石垣原の戦い':[['大友義統','a'],['吉弘統幸','a'],['井上之房','b'],['松井康之','b']],
  '佐和山城落城':[['小早川秀秋','a'],['石田正澄','b']],
  '今福・鴫野の戦い':[['上杉景勝','a'],['佐竹義宣','a'],['後藤基次','b'],['木村重成','b']],
  '碧蹄館の戦い':[['立花宗茂','b'],['査大受','a'],['楊元','a']],
  '慶長の役・漆川梁海戦':[['脇坂安治','a'],['加藤嘉明','a'],['元均','b'],['李億祺','b'],['崔湖','b'],['裴楔','b']],
  '南原城の戦い':[['小西行長','a'],['蜂須賀家政','a'],['島津義弘','a'],['加藤嘉明','a'],['李新芳（東門）','b'],['毛承先（西門）','b'],['蔣表（南門）','b'],['李福男（北門）','b'],['金敬老','b'],['呉応鼎','b'],['任鉉','b'],['李元春','b']]
 };
 const build=G.buildBattleCatalog;
 G.buildBattleCatalog=function(){build();for(const [title,sc] of Object.entries(TK.BATTLES)){
  const plan=P[title],meta=TK.BATTLE_ATLAS[title];if(!plan)throw Error('布陣台帳にない合戦: '+title);
  const wikiName=(TK.BATTLE_TROOPS[title]?.src||'').replace(/^English Wikipedia /,'').replace(/^Wikipedia /,'');
  // 旧兵数の典拠も著者・記事・節・用途を明示。本文を再照合した公的資料とは区分する。
  const wid='deployment-record-'+meta.file.replace('.json','');
  if(wikiName)TK.RESEARCH_SOURCES[wid]={author:'Wikipedia執筆者（既存データの典拠）',title:wikiName,url:'https://'+(/^English/.test(TK.BATTLE_TROOPS[title].src)?'en':'ja')+'.wikipedia.org/wiki/'+encodeURIComponent(wikiName),locator:'経過・参加者。既存記録からの継承',scope:'旧データの由来。未照合の個別陣地・兵数を確定する根拠として使わない。',verification:'既存典拠の登録のみ・本文再照合前'};
  sc.sources=[...new Set([...sc.sources,...plan.sourceIds,...(wikiName?[wid]:[])])];
  for(const [n,side] of additions[title]||[])if(!sc.units.some(u=>(u.g||u.n)===n))sc.units.push({id:'add-'+n,g:n,n,side,path:[],tr:0,role:'参加部隊・個別兵数未詳',source:plan.sourceIds[0]||wid});
  for(const side of ['a','b'])if(!sc.units.some(u=>u.side===side))sc.units.push({id:'unidentified-'+side,n:'参加者の個人名未詳',g:'参加者の個人名未詳',side,path:[],tr:0,role:'個人名未詳'});
  if(title==='慶長の役・漆川梁海戦'){sc.sides.a.n='日本水軍';sc.sides.b.n='朝鮮水軍';sc.sides.a.tr=sc.sides.b.tr='海戦の実参加兵数未詳';TK.BATTLE_TROOPS[title].a.tr=0;TK.BATTLE_TROOPS[title].b={lead:'元均',tr:0};TK.BATTLE_TROOPS[title].certainty='戦役全体の14万人を削除。海戦の参加人数は未確定';for(const u of sc.units)u.tr=0;}
  const labels={'稲葉山城の戦い':['織田方','斎藤方'],'長島一向一揆の平定':['織田方','長島一向一揆'],'宇喜多勢の讃岐攻め':['宇喜多方','讃岐の長宗我部方'],'小早川隆景の伊予攻め':['毛利・小早川方','伊予諸勢力'],'九州平定':['豊臣方','島津方'],'新発田城落城':['上杉方','新発田方'],'北国勢の上野攻め':['豊臣方北国軍','北条方'],'石垣原の戦い':['大友方','黒田・松井方'],'佐和山城落城':['東軍','石田方'],'今福・鴫野の戦い':['徳川方','豊臣方']};
  if(labels[title])for(const [i,side] of ['a','b'].entries())sc.sides[side].n=labels[title][i];
  if(title==='南原城の戦い'){sc.sides.b.n='明・朝鮮連合守備軍';sc.sides.b.tr='明約3,000・朝鮮約1,000';sc.sides.b.clan='ming';for(const u of sc.units)if((u.g||'').includes('楊元')){u.tr=3000;u.role='明軍総兵・東門、3,000は明軍全体で個人の持場兵数ではない';}TK.BATTLE_TROOPS[title].b.lead='楊元・李福男ら明朝鮮連合軍';}
  if(title==='石垣原の戦い'){const u=sc.units.find(u=>u.id==='b-0');if(u){u.tr=0;u.role='旧暦9月13日夜に実相寺山着陣。昼間の戦闘とは区別';}sc.calendar=[[0,'9月13日・黒田松井勢と大友勢が交戦'],[75,'同日夜・黒田孝高が実相寺山へ着陣'],[100,'9月15日・大友義統降伏']];}
  if(title==='四万十川の戦い')sc.sides.a.clan='ichijo';
  if(title==='平壌の戦い')sc.sides.a.clan='ming';
  const claimed=new Set(),groups=[];
  // 戦場地域しか分からない場合は双方を同一の「交戦地域」に結ぶ。
  // 左右に架空の本陣を作らず、方角・距離が不明であることを図と名簿の両方に示す。
  const specs=plan.groups.length?plan.groups:['a','b'].map(side=>[sc.sides[side].n,'*'+side,'center','交戦地域の代表点・対陣方向未詳']);
  for(const [label,selector,at,precision] of specs){const ids=selector.split(' '),members=sc.units.filter(u=>!claimed.has(u.id)&&(ids.includes(u.id)||ids.includes('*'+u.side)));if(!members.length)continue;members.forEach(u=>claimed.add(u.id));let point=at==='center'?meta.geo.slice(0,2):at;
   const outside=point&&(point[0]<meta.bounds[0]||point[0]>meta.bounds[2]||point[1]>meta.bounds[1]||point[1]<meta.bounds[3]);
   groups.push({id:'group-'+groups.length,label,members:members.map(u=>u.id),side:members[0].side,...(point&&!outside?{point}:{}),precision:outside?precision+'・表示範囲外':precision,dock:!point||!!outside,source:plan.sourceIds[0]||wid});
  }
  for(const side of ['a','b']){const members=sc.units.filter(u=>u.side===side&&!claimed.has(u.id));if(members.length)groups.push({id:'group-'+side,label:sc.sides[side].n+'・配置未詳',side,members:members.map(u=>u.id),dock:true,precision:'陣地の座標は未確定',source:plan.sourceIds[0]||wid});}
  sc.atlasGroups=groups;sc.atlasUnits=groups.filter(g=>g.point).map(g=>({id:g.id,side:g.side,point:g.point,label:g.label,g:sc.units.find(u=>u.id===g.members[0])?.g,members:g.members,precision:g.precision}));
  sc.atlasBasis=plan.kind==='campaign'?'戦役・方面配置図':plan.kind==='naval'?'海戦・配置概略図':plan.kind==='siege'?'城郭・攻囲配置図':'布陣概略図';
  sc.reviewNote=plan.summary;sc.presentationNote='地形上の所在と、位置不詳の部隊欄を区別して表示。';
  sc.deploymentKind=plan.kind;
  // 内側の旧監査は、初回と再構築時で追加出典の有無が異なる。最終的な表示の確認範囲で統一する。
  sc.audit=['出典が裏付ける範囲は各資料欄に明示','地形・城郭・全参加者の精密な復元は未完了'];
  const row=TK.BATTLE_AUDIT?.find(r=>r.title===title);if(row)Object.assign(row,{atlasBasis:sc.atlasBasis,units:sc.units.length,positionedGroups:groups.filter(g=>g.point).length,unlocatedGroups:groups.filter(g=>g.dock).length,displayedParticipants:groups.reduce((n,g)=>n+g.members.length,0),sourceIds:sc.sources,issues:sc.audit});
 }};
})();
