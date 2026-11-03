"use strict";
/* 地図を広げた地域の家と拠点（蝦夷の蠣崎家、琉球王国、済州牧）。data.js の後、地理の読み込み前に読む。
   位置・年代は出典で確かめたものだけを使い、確かめられないものは注記に残す。領域は郡画像（CODH 旧郡・1910年府郡）から生成する。
   女真・明の遼東の拠点は公的機関の出典が取れていないため、まだ加えない（docs/architecture/raster-map.md の残課題）。 */
(function(){
 Object.assign(TK.RESEARCH_SOURCES=TK.RESEARCH_SOURCES||{},{
  ezoOdate:{author:'文化庁',title:'文化遺産オンライン「大館跡」',url:'https://online.bunka.go.jp/heritages/region/1/1331',locator:'蠣崎光広が1514年に大館（現・松前）へ本拠を移す',accessed:'2026-11-03',scope:'本拠の所在と移転の年。大館跡の正確な座標は未確認のため、松前の町の代表点に置く。'},
  ezoFukuyama:{author:'文化庁',title:'文化遺産オンライン「松前氏城跡 福山城跡」',url:'https://online.bunka.go.jp/heritages/detail/160398',locator:'1600年に築城に着手、1606年に完成',accessed:'2026-11-03',scope:'福山館（松前城）の築城年。'},
  ryukyuShuri:{author:'文化庁',title:'文化遺産オンライン「琉球王国のグスク及び関連遺産群」',url:'https://online.bunka.go.jp/special_content/hlink9',locator:'首里城跡',accessed:'2026-11-03',scope:'琉球王国の王城の所在。'},
  ryukyu1609:{author:'外務省',title:'沖縄の歴史（九州・沖縄サミット資料）',url:'https://www.mofa.go.jp/mofaj/gaiko/summit/ko_2000/outline/jp/okinawa/oki0301.html',locator:'1609年の島津氏の琉球侵攻',accessed:'2026-11-03',scope:'侵攻の年と、王国が残ったまま薩摩の支配下に入ったこと。月日は通説で、この資料では確かめていない。'},
  amamiAfter1609:{author:'国土交通省',title:'多言語解説文データベース（奄美）',url:'https://www.mlit.go.jp/tagengo-db/R2-00848.html',locator:'1609年以後、奄美は薩摩の直轄、名目上は琉球の一部',accessed:'2026-11-03',scope:'奄美の帰属の変化。'},
  jejuMok:{author:'韓国学中央研究院',title:'韓国民族文化大百科事典「제주목」ほか',url:'https://encykorea.aks.ac.kr/Article/E0051414',locator:'1416年から済州牧・旌義県・大静県の三邑、全羅道に属する',accessed:'2026-11-03',scope:'済州の三邑と所属道（百科事典）。'}
 });
 // id, 1560年の名, 1585年の名, 国, 経度, 緯度, 石高(万石), 商業, 耐久, 雪国
 TK.CASTLES.push(
  ['matsumae','大館','大館','蝦夷',140.11,41.43,1,90,500,1],
  ['shuri','首里城','首里城','琉球',127.719,26.217,9,160,1100,0],
  ['jeju','済州牧','済州牧','全羅',126.53,33.51,4,40,600,0]
 );
 TK.CASTLE_NOTES=Object.assign(TK.CASTLE_NOTES||{},{
  matsumae:{source:['ezoOdate','ezoFukuyama'],note:'蠣崎氏の本拠。1514年に大館（松前）へ移った。1606年に福山館が完成するまでは大館。位置は松前の町の代表点で、大館跡の正確な座標ではない。'},
  shuri:{source:['ryukyuShuri','ryukyu1609'],note:'琉球王国の王城。1609年の島津の侵攻の後も王国は残り、薩摩の支配下に入った。'},
  jeju:{source:['jejuMok'],note:'済州牧の官衙。済州・旌義・大静の三邑を本土の城とは別に扱う。'}
 });
 TK.CLANS.kakizaki=['蠣崎','#7c8fa6'];TK.CLANS.ryukyu=['琉球','#c0392b'];
 const add=(sid,owners,gens,caps)=>{const s=TK.SCEN[sid];if(!s||!s.owners)return;for(const [k,v] of Object.entries(owners))s.owners[k]=s.owners[k]?s.owners[k]+' '+v:v;Object.assign(s.gens=s.gens||{},gens);Object.assign(s.caps=s.caps||{},caps);};
 // 当主：蠣崎季広（1560）・蠣崎慶広（1585）、尚元（1560）・尚永（1585）。能力値はゲーム上の値。
 add('s1560',{kakizaki:'matsumae',ryukyu:'shuri',joseon:'jeju'},{matsumae:['蠣崎季広|50|52|60|66|1507'],shuri:['尚元|38|42|62|64|1528']},{kakizaki:'matsumae',ryukyu:'shuri'});
 add('s1585',{kakizaki:'matsumae',ryukyu:'shuri',joseon:'jeju'},{matsumae:['蠣崎慶広|55|58|66|70|1548'],shuri:['尚永|36|40|60|62|1559']},{kakizaki:'matsumae',ryukyu:'shuri'});
 // 海を渡る道：津軽海峡、薩摩—琉球、全羅—済州
 TK.SEA_LINKS.push(['matsumae','tanabu'],['matsumae','oura'],['shuri','uchi'],['jeju','suncheon']);
})();
