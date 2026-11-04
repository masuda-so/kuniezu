"use strict";
/* 地図を広げた地域の拠点の位置と出来事（geo.js・hist.js の後に読む）。拠点と家は frontier-polities.js。 */
(function(){
 // 拠点の地図上の位置（geo.js の cpos と同じ平面座標）。経緯度は frontier-polities.js の TK.CASTLES の値。
 const K=TKGEO.K,CX=TKGEO.CX;for(const id of ['matsumae','shuri','jeju']){const a=TK.CASTLES.find(c=>c[0]===id);if(a&&!TKGEO.cpos[id])TKGEO.cpos[id]=[+((a[4]-TKGEO.LON0)*K*CX).toFixed(1),+((TKGEO.LAT0-a[5])*K).toFixed(1)];}
 // 出来事：1609年の島津の琉球侵攻（年は出典あり。月日は通説の首里開城の頃とし、注記に残す）
 TK.HIST.push({d:[1609,4,5],k:'submit',clan:'shimazu',b:'ryukyu',title:'島津の琉球侵攻',text:'島津軍が奄美・徳之島を経て運天に上陸し、首里を開城させた。琉球王国は残ったまま薩摩の支配下に入り、奄美は薩摩が直接治めるようになった。月日は通説による。',source:TK.RESEARCH_SOURCES.ryukyu1609.url});
 TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);
})();
