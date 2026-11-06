"use strict";
/* 経由地の史料と、経由地間の道路中心線の復元を混同しない。座標は地図への読み移し。 */
(function(){
 const source=(id,author,title,url,locator,scope,year)=>TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope,year:year||'刊年未詳',accessed:'2026-10-31'};
 source('krRoads','趙炳魯・韓国学中央研究院','도로（道路）','https://encykorea.aks.ac.kr/Article/E0015594','朝鮮時代の道路・地方道路網','義州路・東萊路などの道筋と漢城周辺の渡し。道路考・大東地志など後世の資料を含む。');
 source('krYeongnam','梁普景・韓国学中央研究院','영남역지（嶺南駅志）','https://encykorea.aks.ac.kr/Article/E0037266','内容・第四〜六大路','漢陽・竹山・忠州・鳥嶺・聞慶・尚州・亀尾・仁同・大邱・清道・密陽・梁山・東萊の経由順。1894〜95年史料による後世の比較線。','1995年／2025年改訂');
 source('krSaejae','金洪運・韓国学中央研究院','문경새재 도립공원（聞慶セジェ道立公園）','https://encykorea.aks.ac.kr/Article/E0019398','形成と変遷','鳥嶺の旧道と日本統治期に開削された梨花嶺道の区別。現在の関門建物を1592年へ遡らせない。','1995年／2024年改訂');
 source('krTokkibiri','韓国学中央研究院','문경 토끼비리（聞慶トッキビリ）','https://encykorea.aks.ac.kr/Article/E0069819','内容・現況','嶺南大路の栈道、穎江・鳥嶺川合流付近の地勢。新增東国輿地勝覧に記された道。');
 source('krUiju1488','韓国国立生物資源館','해제로 보는 조선시대 생물자원 1（朝鮮前期）','https://www.nibr.go.kr/aiibook/catImage/92/Joseon%201.pdf','177–178頁「朝鮮賦」解題、PDF191–192頁','1488年の董越の訪問・通過地を照合。順安・粛川・博川・宣川を省略していた旧線を補う。','2016年');
 source('hakoneMedieval','箱根町','湯坂道（鎌倉・室町）／石仏群の成立','https://www.town.hakone.kanagawa.jp/www/contents/1100000001492/index.html','湯坂道の沿革','中世の湯坂道と、江戸期に整備された須雲川沿いの東海道を区別。');
 source('hakoneRoute','箱根町観光協会','旧街道石畳','https://hakone.or.jp/6316','中世の箱根越え・江戸期の新道の説明','三島・箱根峠・芦ノ湖南岸・元箱根・精進池・芦之湯・鷹巣山・浅間山・湯坂山・湯本の順序。');
 source('hakoneBunka','文化庁','歴史の道百選 東海道―箱根旧街道・湯坂路','https://www.bunka.go.jp/seisaku/bunkazai/shokai/kinenbutsu/rekishinomichi/pdf/92088301_s028_01.pdf','1頁 湯坂路と箱根旧街道の地形図','地形図上の旧道の屈曲を概略読図。精密測量線ではない。');
 const replace=(name,pts,sources,status,waypoints)=>{const r=TK.ROADS.find(r=>r[0]===name);if(!r)return;r[1]=pts;delete TK.ROADFIX[name];TK.ROAD_EVIDENCE[name]={geometry:'polyline',sources,status,waypoints,precision:'経由地と峠を結んだ概略。区間内の道路中心線は未復元',level:'corridor'};};
 replace('嶺南大路（中路）',[[129.045,35.134],[129.065,35.169],[129.091,35.207],[129.091,35.25],[129.065,35.292],[129.039,35.338],[129.010,35.375],[128.960,35.402],[128.910,35.427],[128.847,35.442],[128.752,35.493],[128.743,35.549],[128.736,35.591],[128.733,35.649],[128.692,35.705],[128.651,35.756],[128.626,35.812],[128.594,35.87],[128.546,35.917],[128.493,35.974],[128.432,36.007],[128.414,36.064],[128.359,36.117],[128.328,36.164],[128.298,36.245],[128.236,36.325],[128.160,36.410],[128.169,36.463],[128.179,36.516],[128.181,36.571],[128.129,36.610],[128.113,36.647],[128.105,36.68],[128.108,36.708],[128.101,36.728],[128.08,36.758],[128.077,36.777],[128.068,36.791],[128.057,36.802],[128.046,36.815],[128.031,36.821],[128.012,36.83],[127.998,36.869],[127.966,36.916],[127.93,36.99],[127.846,37.028],[127.754,37.06],[127.662,37.075],[127.532,37.078],[127.435,37.078],[127.387,37.173],[127.295,37.234],[127.205,37.239],[127.147,37.298],[127.103,37.381],[127.065,37.461],[127.017,37.519],[127.007,37.538],[126.979,37.571]],['krYeongnam','krSaejae','krTokkibiri'],'鳥嶺と竹山を通る接続へ訂正。忠州から驪州へ迂回して龍仁へ戻る旧線を解消。近世資料の比較を含む。',['釜山鎮','東萊','梁山','密陽','清道','大邱','仁同','亀尾','尚州','聞慶','鳥嶺','延豊','忠州','竹山','陽智','龍仁','漢江渡し','漢城']);
 replace('義州大路',[[126.979,37.571],[126.949,37.591],[126.922,37.63],[126.898,37.681],[126.893,37.702],[126.852,37.76],[126.814,37.826],[126.79,37.85],[126.763,37.888],[126.721,37.921],[126.648,37.949],[126.553,37.97],[126.518,38.022],[126.474,38.083],[126.478,38.152],[126.432,38.225],[126.401,38.331],[126.279,38.392],[126.17,38.421],[126.047,38.479],[125.95,38.52],[125.842,38.6],[125.751,38.67],[125.812,38.758],[125.86,38.861],[125.797,38.967],[125.753,39.032],[125.716,39.128],[125.69,39.202],[125.674,39.304],[125.628,39.421],[125.652,39.516],[125.66,39.62],[125.573,39.683],[125.421,39.709],[125.211,39.694],[125.095,39.743],[124.92,39.798],[124.761,39.89],[124.619,40.023],[124.528,40.2]],['krRoads','krUiju1488'],'1488年の通過地を補い、順安・粛川・安州・博川・定州・宣川を経る概略線へ訂正。渡河地点と山間の細線形は未確定。',['漢城','碧蹄','坡州','開城','平山','鳳山','中和','平壌','順安','粛川','安州','博川','定州','宣川','義州']);
 // 他の朝鮮路も曲線による海・山への膨らみをやめ、未照合の接続であることを地図上で分ける。
 for(const [name,pts] of TK.ROADS)if(pts.some(p=>p[0]<129&&p[1]>35)&&!['嶺南大路（中路）','義州大路'].includes(name)){
  delete TK.ROADFIX[name];TK.ROAD_EVIDENCE[name]={geometry:'polyline',sources:['krRoads'],status:'道路体系は参照。個々の線形・戦国期の利用は未確定',precision:'接続を表す参考線',level:'unverified',label:name+'（参考接続）'};
 }
 const r=TK.ROADS.find(r=>r[0]==='東海道'),a=r[1].findIndex(p=>p[0]>=138.91),b=r[1].findIndex(p=>p[0]>=139.155);
 if(a>=0&&b>a){const hakone=[[138.91,35.12],[138.939,35.127],[138.961,35.139],[138.979,35.157],[138.989,35.169],[139.002,35.184],[139.016,35.189],[139.032,35.202],[139.041,35.218],[139.044,35.227],[139.052,35.228],[139.059505,35.233487],[139.076,35.232],[139.09476,35.23102],[139.104,35.232],[139.13,35.235],[139.155,35.25]];
  // 湯坂路は尾根上を通る。須雲川沿いの江戸道を中世へ遡らせない。
  r[1].splice(a,b-a+1,...hakone);delete TK.ROADFIX['東海道'];TK.ROAD_EVIDENCE['東海道']={geometry:'polyline',sources:['hakoneMedieval','hakoneRoute','hakoneBunka'],status:'箱根区間を湯坂路の尾根筋へ改訂。街道全線の精密復元ではない',precision:'通過地の順序に基づく参考線。山間の細線形は未確定',level:'corridor',period:'中世箱根越え。近世の付替え後は別途検証'};
 }
 source('aizuNaka1695','那須塩原市','会津中街道跡と道標','https://www.city.nasushiobara.tochigi.jp/soshikikarasagasu/nomuchikusanka/1/sateraito/13137.html','1695年の整備','1683年の地震による会津西街道の通行難を受けた後世の街道。1560〜1615年には表示しない。','2023年11月8日更新');
 TK.EXCLUDED_ROADS=[{name:'会津中街道',from:1695,source:'aizuNaka1695',reason:'ゲームの対象時代より後の整備'}];
 TK.ROADS=TK.ROADS.filter(r=>r[0]!=='会津中街道');delete TK.ROADFIX['会津中街道'];
 TK.ROAD_EVIDENCE['会津中街道']={status:'1695年整備のため戦国期の地図から除外',sources:['aizuNaka1695'],level:'excluded',from:1695};
 source('krGwandongPass','韓国文化財庁','関東大路 仇叱峴 名勝指定告示 第2022-4号','https://www.law.go.kr/LSW/flDownload.do?bylClsCd=&flSeq=112375543','1頁・指定理由、3頁地形図','仇叱峴は新增東国輿地勝覧に記された、江原道と漢陽・南漢江水運を結ぶ峠。','2022年1月12日');
 source('krGwandongRoute','韓国政府放送KTV','옛길, 시간을 걷다：관동대로 평창에서 강릉','https://www.ktv.go.kr/program/home/PG2150028D/content/508164','関東大路・平昌から江陵','平昌から大関嶺を越えて江陵へ向かう経由関係。細かな現存道を16世紀へそのまま遡らせない。','2015年7月17日');
 replace('関東路',[[126.979,37.571],[127.055,37.585],[127.153,37.598],[127.257,37.594],[127.321,37.546],[127.401,37.523],[127.487,37.491],[127.585,37.474],[127.638,37.477],[127.701,37.441],[127.758,37.409],[127.832,37.382],[127.948,37.35],[127.982,37.437],[127.984,37.491],[128.065,37.463],[128.153,37.433],[128.209,37.411],[128.248,37.411],[128.319,37.452],[128.421,37.493],[128.458,37.568],[128.56,37.632],[128.676,37.674],[128.708,37.687],[128.732,37.697],[128.754,37.716],[128.777,37.731],[128.807,37.739],[128.848,37.748],[128.897,37.752]],['krGwandongPass','krGwandongRoute','krRoads'],'忠州へ南下していた旧線を削除し、楊平・原州・平昌・大関嶺・江陵の道筋へ訂正。精密な旧道中心線の復元ではない。',['漢城','楊平','砥平','仇叱峴','原州','安興','平昌方面','珍富','大関嶺','江陵']);
})();

/* shirakawa-period-evidence */
(function(){
TK.RESEARCH_SOURCES["shirakawaBunka"]={"author": "文化庁", "title": "歴史の道百選 85 白河・会津街道", "url": "https://www.bunka.go.jp/seisaku/bunkazai/shokai/kinenbutsu/rekishinomichi/pdf/92088301_g085.pdf", "year": "2019年選定", "locator": "1ページ・選定箇所と概要", "scope": "黒森峠等の経由地、奥羽仕置の道・宿駅整備と17世紀前半の行路変更。戦国期の精密中心線を示す図ではない。", "accessed": "2026-11-01"};
TK.RESEARCH_SOURCES["seishidoSukagawa"]={"author": "須賀川市", "title": "勢至堂一里壇", "url": "https://www.city.sukagawa.fukushima.jp/bunka_sports/bunka_geijyutsu/1013435/bunkazai/1-1/1008731.html", "year": "2026年3月31日更新", "locator": "本文第1～3段落", "scope": "1545年開削の伝承、1590年道路作成命令、呼称。伝承と確定した測量を区別する。", "accessed": "2026-11-01"};
TK.ROAD_EVIDENCE["白河街道"]={"geometry": "modern-reference", "level": "unverified", "sources": ["shirakawaBunka", "seishidoSukagawa", "modernRoadReference"], "status": "会津と白河を結ぶ道。1590年に道路・宿駅を整備。17世紀前半に行路が変更されたため、表示線は近現代の比較線として扱う。", "periodNotes": [{"year": 1545, "kind": "tradition", "text": "蘆名盛氏による勢至堂峠開削の伝承"}, {"year": 1590, "kind": "improvement", "text": "伊達政宗が道路・宿駅を整備"}, {"period": "17世紀前半", "kind": "route-change", "text": "加藤嘉明による行路変更"}]};
})();


/* Rokujurigo source review */
(function(){
 TK.RESEARCH_SOURCES.rokujurigoSakata={author:'国土交通省 東北地方整備局 酒田河川国道事務所',title:'六十里越街道の歴史・現地調査一覧図',url:'https://www.thr.mlit.go.jp/sakata/road/60history/011.html',locator:'庄内側調査図・青線の旧街道、戦国時代の説明',scope:'旧道と月山道路を区別。道筋図は1:200000の概略で精密中心線ではない。',accessed:'2026-11-01'};
 TK.ROAD_EVIDENCE['六十里越街道']={geometry:'polyline',sources:['rokujurigoSakata'],level:'unverified',status:'出羽三山への信仰の道であり、戦国期には軍事交通にも使われた。旧街道と後世の月山道路では道筋が異なる。',precision:'経由関係を示す概略線。旧道調査図と照合中。'};
})();
/* hokkokukaido-apply.py: comparison geometry */
(function(){
TK.RESEARCH_SOURCES["gsiExperimentalRoads"]={"author": "国土地理院", "title": "道路中心線ベクトルタイル提供実験", "url": "https://github.com/gsi-cyberjapan/experimental_rdcl", "year": "2015年提供開始・タイルの地物更新日は個別属性による", "locator": "GeoJSON z16、北国街道北部の取得範囲・manifest参照", "scope": "現代の道路形状。現在の通行規制とは別に扱う比較線。16世紀の存在・路幅・当日進路を確定しない。", "accessed": "2026-11-01"};
TK.RESEARCH_SOURCES["hokkokuNagahamaGuide"]={"author": "長浜米原観光協会", "title": "北国街道 長浜宿", "url": "https://kitabiwako.jp/spot/spot_1701", "year": "刊年未詳", "locator": "琵琶湖東岸・柳ヶ瀬・栃ノ木峠の経由説明", "scope": "街道の地域的経由関係。全時代で同じ道筋・路幅とは断定しない。", "accessed": "2026-11-01"};
TK.ROAD_EVIDENCE["北国街道（近江）"]={"geometry": "modern-reference", "level": "unverified", "sources": ["gsiExperimentalRoads", "hokkokuNagahamaGuide", "modernRoadReference"], "status": "南部は既存OSM参考線を保持。木之本付近以北はGSI現代中心線。旧道の経由関係と区別し、16世紀中心線の確定とはしない。"};
})();
/* end hokkokukaido-apply.py: comparison geometry */

/* sanshu-reference.py generated correction */
(function(){
TK.RESEARCH_SOURCES["sanshuShiojiri"]={"author":"塩尻市","title":"街道を学ぶ 三州街道","url":"https://www.city.shiojiri.lg.jp/soshiki/35/3943.html","locator":"三州街道（伊那街道）の本文","scope":"塩尻・善知鳥峠・小野・辰野・伊那谷・駒場・根羽・岡崎の経由関係。16世紀の全線中心線は確定しない。","accessed":"2026-11-07"};
TK.RESEARCH_SOURCES["sanshuCodhPosts"]={"author":"ROIS-DS人文学オープンデータ共同利用センター","title":"江戸宿場データセット v1.1・伊那街道 R505","url":"https://geoshape.ex.nii.ac.jp/edo/post/R505/","locator":"R505-006〜025のうち採用した18地点","scope":"江戸期の歴史地名の代表座標。街道の北側経由地・足助・岡崎方面の比較点として用い、戦国期の宿駅成立や関所位置を確定しない。","license":"CC BY 4.0","doi":"10.20676/00000477","accessed":"2026-11-07"};
TK.RESEARCH_SOURCES["sanshuModernMountain"]={"author":"国土地理院","title":"道路中心線ベクトルタイル提供実験・浪合から稲武","url":"https://github.com/gsi-cyberjapan/experimental_rdcl","locator":"2026-11-07取得の225タイルのうち道路を含む193タイル","scope":"現代の道路の物理的形状。現代トンネルを含めて連結を調べる比較線で、戦国期の存在や当日の通行を確定しない。","accessed":"2026-11-07"};
TK.RESEARCH_SOURCES["sanshuModernFoot"]={"author":"OpenStreetMap contributors / FOSSGIS OSRM","title":"三州街道の地名代表点間の現代歩行参考線","url":"https://www.openstreetmap.org/copyright","locator":"2026-11-07取得・routed-foot。山間部の約110kmの過大迂回は採用せず、北側と稲武以南のみ使用。","scope":"現代の歩行向け経路。史実の街道線や軍の経路とは区別する。","license":"ODbL 1.0","accessed":"2026-11-07"};
const r=TK.ROADS.find(r=>r[0]==="三州街道");if(r)r[1]=[[137.974827,36.103711],[137.9692,36.043],[137.986,35.97722],[137.9859,35.91271],[137.952643,35.837772],[137.94133,35.763542],[137.9319,35.73303],[137.926156,35.678912],[137.89056,35.606379],[137.860471,35.557007],[137.832742,35.511852],[137.7454,35.44613],[137.6856,35.37308],[137.6316,35.32143],[137.582,35.25275],[137.5035,35.21577],[137.318207,35.135353],[137.169267,34.958]];
delete TK.ROADFIX["三州街道"];
TK.ROAD_EVIDENCE["三州街道"]={"geometry":"modern-reference","level":"unverified","sources":["sanshuShiojiri","sanshuCodhPosts","sanshuModernMountain","sanshuModernFoot"],"status":"塩尻から伊那谷・駒場・根羽・足助を経て岡崎へ至る道。表示線は現代道路の比較で、山間部には近代の隧道も含む。"};
})();
/* end sanshu-reference.py generated correction */
