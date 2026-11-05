"use strict";
/* ===== 城の移り変わり（史実の築城・廃城・焼失・計画） =====
   k:'build'  node の城を n に建て替える（lon,lat があれば場所も移す）。prev:1 で元の城は城跡として残る
              clan：築いた家（配列可。null はその地の持ち主）。持ち主が違えば「計画」として残り、持ち主が築ける
   k:'burn'   node の城が焼け落ちる（堅さが大きく下がる）。to があればその城に戻る
   k:'fort'   陣城・砦など、国の本城ではない城が地図に現れる   k:'unfort' それが消える
   k:'plan'   計画だけがあった城。持ち主が築ける（until を過ぎると消える）
   dur：堅さの上乗せ  shogyo：商業の上乗せ */
window.TK=window.TK||{};
TK.JOKAKU=[
 {d:[1563,7,1],k:'fort',id:'komaki',n:'小牧山城',lon:136.91,lat:35.29,clan:'oda',title:'小牧山城',text:'織田信長が美濃攻めのため小牧山に城を築き、清洲から移った。',who:'織田信長'},
 {d:[1566,11,5],k:'fort',id:'sunomata',n:'墨俣城',lon:136.68,lat:35.36,clan:'oda',text:'美濃攻めの足場として、長良川の中洲・墨俣に城が築かれた（墨俣一夜城）。',who:'羽柴秀吉'},
 {d:[1567,10,5],k:'build',node:'gifu',n:'岐阜城',clan:'oda',dur:500,shogyo:60,title:'岐阜城',text:'織田信長が稲葉山城を岐阜城と改めて本拠を移し、城下に楽市を開いた（小牧山城は廃された）。',who:'織田信長'},
 {d:[1567,10,6],k:'unfort',id:'komaki',clan:'oda',quiet:1,text:'本拠が岐阜に移り、小牧山城は廃された。'},
 {d:[1567,10,7],k:'unfort',id:'sunomata',clan:'oda'},
 {d:[1570,6,12],k:'build',node:'hikuma',n:'浜松城',clan:'tokugawa',dur:350,text:'徳川家康が岡崎から本拠を移し、曳馬城を広げて浜松城と改めた。',who:'徳川家康'},
 {d:[1571,12,1],k:'fort',id:'sakamoto',n:'坂本城',lon:135.87,lat:35.07,clan:'oda',text:'比叡山焼き討ちの後、明智光秀が琵琶湖のほとりに坂本城を築いた。',who:'明智光秀'},
 {d:[1573,4,1],k:'build',node:'akutagawa',n:'高槻城',lon:135.62,lat:34.85,prev:1,clan:null,dur:200,text:'摂津の拠点は山上の芥川山城から、平地の高槻城に移った。'},
 {d:[1573,5,1],k:'build',node:'tottori',n:'鳥取城',lon:134.23,lat:35.51,prev:1,clan:null,dur:300,text:'山名豊国が布勢天神山城から久松山の鳥取城に本拠を移した。'},
 {d:[1573,9,20],k:'burn',node:'ichijodani',clan:'oda',title:'一乗谷炎上',text:'朝倉氏が滅び、百年栄えた一乗谷の城下は焼き払われた。'},
 {d:[1574,10,20],k:'build',node:'nagashima',n:'長島城',clan:'oda',dur:150,text:'一向一揆が滅び、伊勢長島には滝川一益の長島城が置かれた。',who:'滝川一益'},
 {d:[1575,1,1],k:'build',node:'odani',n:'長浜城',lon:136.27,lat:35.38,prev:1,clan:'oda',dur:300,shogyo:50,title:'長浜城',text:'羽柴秀吉が山上の小谷城を捨て、琵琶湖畔の今浜を長浜と改めて城を築いた。',who:'羽柴秀吉'},
 {d:[1575,9,1],k:'build',node:'ichijodani',n:'北ノ庄城',lon:136.22,lat:36.06,prev:1,clan:'oda',dur:600,shogyo:40,title:'北ノ庄城',text:'越前を任された柴田勝家が、足羽川のほとりに北ノ庄城を築いた。',who:'柴田勝家'},
 {d:[1575,11,1],k:'build',node:'tenjin',n:'岡山城',lon:133.93,lat:34.67,prev:1,clan:'ukita',dur:300,shogyo:50,text:'浦上を追った宇喜多直家は、すでに移っていた旭川のほとりの岡山城（石山城）を本拠とした。',who:'宇喜多直家'},
 {d:[1576,2,23],k:'build',node:'kannonji',n:'安土城',lon:136.14,lat:35.16,prev:1,clan:'oda',dur:900,shogyo:120,big:1,title:'安土城',text:'織田信長が安土山に五層七階の天主を備えた城を築き、本拠を移した。',who:'織田信長'},
 {d:[1578,1,15],k:'fort',id:'kameyama',n:'亀山城',lon:135.58,lat:35.01,clan:'oda',text:'丹波攻めの拠点として、明智光秀が亀山城を築いた。',who:'明智光秀'},
 {d:[1578,2,1],k:'build',node:'tonokori',n:'佐土原城',lon:131.42,lat:32.04,prev:1,clan:'shimazu',dur:150,text:'日向を得た島津氏は、佐土原城に島津家久を置いた。'},
 {d:[1578,9,1],k:'plan',node:'agata',n:'無鹿の町',lon:131.66,lat:32.60,clan:'otomo',until:[1578,12,10],shogyo:150,dur:100,title:'無鹿の夢',text:'洗礼を受けた大友宗麟は、日向の無鹿にキリスト教の理想の町を築こうとした。',who:'大友宗麟'},
 {d:[1580,4,1],k:'build',node:'himeji',n:'姫路城',lon:134.69,lat:34.84,prev:1,clan:['oda','hashiba'],dur:500,shogyo:40,title:'姫路城',text:'羽柴秀吉が中国攻めの拠点として、姫山に三層の天守を築いた。',who:'羽柴秀吉'},
 {d:[1580,9,11],k:'burn',node:'ishiyama',clan:'oda',title:'石山炎上',text:'本願寺が大坂を退いた直後、伽藍に火が放たれ、三日三晩燃え続けた。'},
 {d:[1580,9,1],k:'plan',node:'ishiyama',n:'大坂城',clan:'oda',dur:1300,shogyo:200,text:'信長は石山の跡を天下の要と見て、ここに城を築く心づもりでいた。',who:'織田信長'},
 {d:[1580,9,10],k:'build',node:'tango',n:'宮津城',lon:135.19,lat:35.54,prev:1,clan:'oda',dur:150,text:'丹後を与えられた細川藤孝が宮津に城を築いた。',who:'細川藤孝'},
 {d:[1580,11,1],k:'build',node:'yamato',n:'郡山城',lon:135.78,lat:34.65,prev:1,clan:null,dur:300,text:'信長の命で大和の城は郡山城を残して壊され、筒井順慶は郡山に移った。'},
 {d:[1580,12,10],k:'build',node:'oyama',n:'尾山城',clan:'oda',dur:300,text:'加賀の一向一揆が平定され、尾山御坊は城に改められた。'},
 {d:[1581,1,1],k:'build',node:'kiriyama',n:'松ヶ島城',lon:136.55,lat:34.57,prev:1,clan:null,dur:200,text:'北畠家を継いだ織田信雄が、伊勢湾に臨む松ヶ島に城を築いた。'},
 {d:[1582,1,18],k:'build',node:'tsutsuji',n:'新府城',lon:138.43,lat:35.75,prev:1,clan:'takeda',dur:400,title:'新府城',text:'織田・徳川に備え、武田勝頼は躑躅ヶ崎館を出て韮崎に新府城を築いた。',who:'武田勝頼'},
 {d:[1582,3,26],k:'burn',node:'tsutsuji',clan:'takeda',cond:'新府城',to:{n:'躑躅ヶ崎館',lon:138.58,lat:35.69},title:'新府城炎上',text:'織田軍が迫り、勝頼は完成間もない新府城に自ら火を放って逃れた。',who:'武田勝頼'},
 {d:[1582,7,4],k:'burn',node:'kannonji',clan:null,cond:'安土城',title:'安土城炎上',text:'本能寺の変の混乱の中、安土城の天主が焼け落ちた。'},
 {d:[1582,7,20],k:'build',node:'fukashi',n:'松本城',clan:null,dur:150,text:'深志城に入った小笠原貞慶が、城の名を松本と改めた。'},
 {d:[1583,4,1],k:'build',node:'toishi',n:'上田城',lon:138.24,lat:36.40,prev:1,clan:'sanada',dur:600,title:'上田城',text:'真田昌幸が千曲川の段丘に上田城を築いた。',who:'真田昌幸'},
 {d:[1583,6,10],k:'build',node:'kanegasaki',n:'敦賀城',lon:136.07,lat:35.65,prev:1,clan:'hashiba',dur:150,text:'敦賀の湊に城が築かれ、金ヶ崎の古城に代わった。'},
 {d:[1583,10,16],k:'build',node:'ishiyama',n:'大坂城',clan:'hashiba',dur:1300,shogyo:200,big:1,title:'大坂城',text:'羽柴秀吉が石山本願寺の跡に、天下に並ぶもののない大坂城を築き始めた。',who:'羽柴秀吉'},
 {d:[1583,9,5],k:'build',node:'kyo',n:'妙顕寺城',lon:135.76,lat:35.01,clan:'hashiba',dur:100,text:'羽柴秀吉が京の妙顕寺を城に改め、政の拠点とした。'},
 {d:[1585,10,10],k:'build',node:'kannonji',n:'八幡山城',lon:136.09,lat:35.14,prev:1,clan:'hashiba',dur:300,shogyo:60,text:'羽柴秀次が八幡山に城を築き、安土の町を移した。安土城は廃された。',who:'羽柴秀次'},
 {d:[1585,4,28],k:'build',node:'saika',n:'和歌山城',lon:135.17,lat:34.23,prev:1,clan:'hashiba',dur:400,text:'紀州を平定した秀吉は、弟の秀長に和歌山城を築かせた。',who:'羽柴秀長'},
 {d:[1585,10,15],k:'build',node:'ueno',n:'伊賀上野城',lon:136.13,lat:34.77,prev:1,clan:null,dur:250,text:'筒井定次が伊賀に移され、上野に城を築いた。'},
 {d:[1595,9,1],k:'build',node:'kyo',n:'伏見城',lon:135.79,lat:34.94,prev:1,clan:'hashiba',dur:500,shogyo:120,title:'伏見城',text:'秀次事件ののち聚楽第は取り壊され、秀吉は伏見に築いた城を政の中心とした。',who:'豊臣秀吉'},
 {d:[1586,3,1],k:'build',node:'kyo',n:'聚楽第',lon:135.745,lat:35.025,prev:1,clan:'hashiba',dur:600,shogyo:150,title:'聚楽第',text:'関白となった秀吉が、京の内野に金箔の瓦をいただく聚楽第を築き始めた。',who:'豊臣秀吉'},
 {d:[1587,1,10],k:'build',node:'sunpu',n:'駿府城',clan:'tokugawa',dur:500,shogyo:50,text:'徳川家康が駿府に城を築き、浜松から移った。',who:'徳川家康'},
 {d:[1587,1,1],k:'build',node:'odawara',n:'小田原城',clan:'hojo',dur:1000,title:'小田原の総構え',text:'豊臣との戦に備え、北条氏は城下町ごと囲む長大な総構えを築き始めた。',who:'北条氏政'},
 {d:[1587,6,1],k:'fort',id:'hachioji',n:'八王子城',lon:139.26,lat:35.65,clan:'hojo',text:'北条氏照が深沢山に八王子城を築き、滝山城から移った。',who:'北条氏照'},
 {d:[1588,1,1],k:'build',node:'oko',n:'大高坂城',lon:133.53,lat:33.56,prev:1,clan:'chosokabe',dur:200,text:'長宗我部元親が岡豊城を出て、大高坂山に城を築いた。',who:'長宗我部元親'},
 {d:[1589,5,28],k:'build',node:'koriyama',n:'広島城',lon:132.46,lat:34.40,prev:1,clan:'mori',dur:500,shogyo:100,title:'広島城',text:'毛利輝元が山城の吉田郡山を出て、太田川の河口の三角州に広島城を築き始めた。',who:'毛利輝元'},
 {d:[1590,4,6],k:'fort',id:'ishigaki',n:'石垣山城',lon:139.13,lat:35.24,clan:'hashiba',vs:'hojo',title:'石垣山一夜城',text:'小田原を囲む秀吉は、城を見下ろす山に石垣の城を築き、一夜で現れたように見せた。',who:'豊臣秀吉'},
 {d:[1590,7,24],k:'unfort',id:'hachioji',clan:'hojo',vs:'hashiba',title:'八王子城落城',text:'八王子城は前田・上杉の大軍に攻められ、一日で落ちた。'},
 {d:[1590,8,30],k:'build',node:'edo',n:'江戸城',clan:'tokugawa',dur:500,shogyo:80,title:'家康、江戸へ',text:'関東に移された徳川家康が江戸城に入り、城と町の普請を始めた。',who:'徳川家康'},
 {d:[1565,6,18],k:'burn',node:'kyo',clan:null,title:'二条御所炎上',text:'永禄の変で三好勢に襲われた将軍の御所が焼け落ちた。'},
 {d:[1574,10,14],k:'burn',node:'nagashima',clan:null,title:'長島焼き討ち',text:'長島一向一揆の砦は焼き討ちにされ、願証寺は滅んだ。'},
 {d:[1581,10,12],k:'burn',node:'ueno',clan:null,text:'天正伊賀の乱で、伊賀衆の拠る寺や城館が焼き払われた。'},
 {d:[1582,6,22],k:'burn',node:'kyo',clan:null,title:'二条新御所炎上',text:'本能寺の変で、織田信忠の籠った二条新御所も焼け落ちた。'},
 {d:[1583,6,14],k:'burn',node:'ichijodani',clan:null,cond:'北ノ庄城',title:'北ノ庄城炎上',text:'賤ヶ岳に敗れた柴田勝家は、北ノ庄城の天守に火を放ち、お市とともに自害した。',who:'柴田勝家'},
 {d:[1586,8,31],k:'burn',node:'nihonmatsu',clan:null,text:'二本松畠山氏の家臣たちは城に火を放ち、会津へ落ちていった。'},
 {d:[1587,1,21],k:'burn',node:'funai',clan:null,title:'府内炎上',text:'戸次川で豊臣の先遣隊を破った島津家久が府内に入り、大友館と町は焼かれた。'},
 {d:[1589,12,3],k:'burn',node:'sukagawa',clan:null,title:'須賀川城炎上',text:'伊達政宗の攻撃の中、内通者が火を放ち、須賀川城は焼け落ちた。'}
];

/* 年まで確認できる居城移転。ゲームでは1603年の年境で切り替える。 */
TK.JOKAKU.push({
 d:[1603,1,1],k:'build',node:'agata',n:'縣城',lon:131.662946,lat:32.580619,prev:1,clan:null,
 title:'高橋元種の縣城築城',who:'高橋元種',datePrecision:'年',
 source:'https://www.city.nobeoka.miyazaki.jp/soshiki/6/1689.html',
 text:'慶長8年、高橋元種は五ヶ瀬川と大瀬川の間に縣城を築き、松尾城から居城を移した。'
});
/* 竹中重利入封の年に、府内の管理拠点を荷揚城へ切り替える。 */
TK.JOKAKU.push({
 d:[1601,1,1],k:'build',node:'funai',n:'荷揚城',lon:131.611590,lat:33.240535,prev:1,clan:null,
 title:'竹中重利の府内入封',who:'竹中重利',datePrecision:'年',
 source:'https://www.city.oita.oita.jp/o204/bunkasports/shitebunkazai/1352943146749.html',
 text:'慶長6年、竹中重利が府内へ入封し、福原直高が築城に着手した荷揚城を増改築した。'
});
TK.JOKAKU.push({
 d:[1605,1,1],k:'build',node:'funai',n:'府内城',clan:null,
 title:'荷揚城を府内城に改称',who:'竹中重利',datePrecision:'年',
 source:'https://sitereports.nabunken.go.jp/files/attach/71/71386/78257_1_%E5%BA%9C%E5%86%85%E5%9F%8E%E3%83%BB%E5%9F%8E%E4%B8%8B%E7%94%BA%E8%B7%A1.pdf#page=16',
 text:'慶長10年、竹中重利は荷揚城の外堀を掘り、城名を府内城に改めた。'
});
TK.JOKAKU.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+(a.d[2]-b.d[2]));
