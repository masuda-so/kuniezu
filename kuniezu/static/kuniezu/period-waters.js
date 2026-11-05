"use strict";
/* 古地図・干拓史から水域の連結と沿岸湿地を概略復元。精密な16世紀湖岸とはしない。 */
(function(){
 const {K,CX,LON0,LAT0}=TKGEO,pj=(lo,la)=>[(lo-LON0)*K*CX,(LAT0-la)*K];
 const bounds=r=>[Math.min(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[0])),Math.max(...r.map(p=>p[1]))];
 const src=TK.RESEARCH_SOURCES;
 src.katoriMedieval={author:'香取市 生涯学習課',title:'アーカイブ香取遺産 Vol.208 香取の海と新田開発',url:'https://www.city.katori.lg.jp/culture_sport/bunkazai/isan/201-210.html',locator:'中世の内海の図、1590年以後の沖之島・新島十六島開発',scope:'水域の連結と干拓前の湿地を概略で表す。図は測量図ではなく、各年の汀線を確定する資料ではない。',accessed:'2026-11-01'};
 src.kasumiChronology={author:'茨城県水産試験場',title:'霞ヶ浦北浦と利根川の年表1',url:'https://www.pref.ibaraki.jp/nourinsuisan/naisuishi/kahoku/rekishi1.html',locator:'1590年十六島開田、1624年加藤洲、1626年大洲、1662～1673年新利根川',scope:'ゲーム年代に近現代の干拓・河道を先取りしない。年の記録を特定の日の汀線変化にしない。',accessed:'2026-11-01'};
 const old=TKGEO.lakes.slice();TK.WATER_SHAPE_AUDIT=[];
 // 同じ湖の粗い旧輪郭と細かい比較輪郭を重ねていた二重の湖岸を解消。
 const replaced=new Set();
 for(const l of TK.MODERN_LAKES){const b=bounds(l.rings[0]);for(let i=0;i<old.length;i++){const r=old[i][0],pts=Array.from({length:r.length/2},(_,j)=>[r[j*2]/K/CX+LON0,LAT0-r[j*2+1]/K]),a=bounds(pts),cx=(a[0]+a[2])/2,cy=(a[1]+a[3])/2;if(cx>b[0]-.025&&cx<b[2]+.025&&cy>b[1]-.025&&cy<b[3]+.025)replaced.add(i);}TK.WATER_SHAPE_AUDIT.push({name:l.name,vertices:l.rings.reduce((a,r)=>a+r.length,0),basis:'W09-05の比較輪郭。時代別の水域・湿地は別層で加える。'});}
 TKGEO.lakes=old.filter((_,i)=>!replaced.has(i));
 TKGEO.lakes.push(...TK.MODERN_LAKES.map(l=>l.rings.map(r=>r.flatMap(p=>pj(...p)))));
 TK.WATER_SHAPE_AUDIT.push({retainedOld:old.length-replaced.size,replacedOld:replaced.size,reason:'同一湖の重複線を除去。八郎潟・巨椋池等の旧水域を現代の干拓後の形で縮めない。'});
 // ここは水面と葦原・浅瀬が入り交じる範囲。全面を一様な深い湖へ塗らない。
 src.katoriTerrain={author:'国土地理院・香取市',title:'標高PNGと香取の海の干拓史による推定低地',url:'https://maps.gsi.go.jp/development/demtile.html',locator:'現代標高を概略域と照合し、外縁1kmでは閾値を漸減。data/verification/katori/estimated-marsh.geojson を参照',scope:'現代標高を用いた浅瀬・葦原の候補。3mは旧水位ではなく、精密な戦国期汀線ではない。1590年の一括縮小は行わない。',accessed:'2026-11-01'};
 src.katoriDevelopment={author:'関東農政局',title:'坂東武士の開拓',url:'https://www.maff.go.jp/kanto/nouson/sekkei/kokuei/ryoso/rekishi/02.html',locator:'水郷十六島と16世紀末の開拓',scope:'中世の沼沢地と開拓開始の年代。精密な湖岸座標は示されない。',accessed:'2026-11-01'};
 TK.PERIOD_WATERS=TK.KATORI_LOWLANDS;
 TK.waterPhase=y=>y>=1590?'reclamation-start':'before-reclamation';
 TK.periodWaters=y=>TK.PERIOD_WATERS.filter(w=>(!w.from||y>=w.from)&&(!w.until||y<w.until));
 TK.WATER_NOTE='霞ヶ浦南岸・香取の海は古地図と干拓史に基づく水面・浅瀬・葦原の推定域を表示。細かな汀線と各年の水位は未確定。湖の基準輪郭には現代比較資料を含みます。';
 // 参照輪郭は元データに保持。通常表示で二重に塗ったり「比較湖岸」の文字を乱立させない。
 TK.MODERN_LAKE_COMPARISONS=TK.MODERN_LAKES;TK.waterComparisonOverlay=false;
})();
