"use strict";

/* 西海道の現代比較線が、関門の自転車通行制約で徳山―竹田津フェリーへ42km迂回していた。陸上街道は小倉以南とし、海峡の交通は海路へ分離する。 */
(function(){const r=TK.ROADS.find(r=>r[0]==='西海道'),p=TK.MODERN_ROAD_REFERENCE['西海道'];if(r){const i=r[1].findIndex(p=>p[1]<33.89);if(i>=0)r[1]=r[1].slice(i);delete TK.ROADFIX['西海道'];}if(p){let lastSea=0;for(let i=1;i<p.length;i++)if(Math.hypot((p[i][0]-p[i-1][0])*.81,p[i][1]-p[i-1][1])*111.32>10)lastSea=i;let best={i:lastSea,d:Infinity};for(let i=lastSea;i<p.length;i++){const d=Math.hypot((p[i][0]-130.88)*.81,p[i][1]-33.865);if(d<best.d)best={i,d};}if(lastSea&&best.d<.02)TK.MODERN_ROAD_REFERENCE['西海道']=p.slice(best.i);}})();
