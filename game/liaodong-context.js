"use strict";
/* 明の参考地域。近現代の省境を戦国期の国境として転用しない。 */
(function(){
 TK.RESEARCH_SOURCES.liaodongMuseum={author:'遼陽博物館',title:'第四展庁：元明清時期——行省、鎮城与都城',year:'2017-07-26',url:'https://www.lnlymuseum.com/case/detail/id/8.html',locator:'第二単元 九辺之首',scope:'1375年に遼陽へ遼東都指揮使司を設置。明代中期以後の遼東辺牆。測量座標・国境線の根拠ではない。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.guangningCity={author:'遼寧省文化和旅游庁 文物管理処',title:'広寧古城',year:'2020-08-27',url:'https://whly.ln.gov.cn/whly/wlzt/lnww/zdwwbhdw/D893F1C8FBEC4C4DB3095F8C1C420F3B/index.shtml',locator:'1390年創建の衛城',scope:'古城の存在。現表示範囲の西外にあり、画面内へ移動して描かない。',accessed:'2026-11-01'};
 const p=TKGEO.plabels.find(p=>p.n==='明');if(p){p.n='明・遼東';p.x=(123.45-TKGEO.LON0)*TKGEO.K*TKGEO.CX;p.y=(TKGEO.LAT0-41.15)*TKGEO.K;p.r=70;}
 TK.CONTEXT_PLACES=[{name:'遼陽',detail:'明・遼東都司',at:[123.17,41.27],source:'liaodongMuseum',precision:'都市の概略位置。城壁・都司の敷地ではない。'}];
})();
