"use strict";

/* 西海道の現代比較線が、関門の自転車通行制約で徳山―竹田津フェリーへ42km迂回していた。陸上街道は小倉以南とし、海峡の交通は海路へ分離する。 */
(function(){const r=TK.ROADS.find(r=>r[0]==='西海道');if(r){const i=r[1].findIndex(p=>p[1]<33.89);if(i>=0)r[1]=r[1].slice(i);delete TK.ROADFIX['西海道'];}})();
