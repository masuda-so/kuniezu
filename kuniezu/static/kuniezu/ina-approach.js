"use strict";
/* © OpenStreetMap contributors / ODbL 1.0. 現代比較線。戦国期の道路中心線の復元ではない。 */
(function(){
TK.RESEARCH_SOURCES.inaShinshiro={"author":"Network2010","title":"伊那街道 新城市","year":"2013","url":"https://network2010.org/article/298","locator":"野田城駅周辺・新城市街・設楽原・長篠の各節","accessed":"2026-11-01","scope":"街道周辺の地点関係の参照。座標・路幅・1560～1615年の道路中心線や個別軍の通過を確定しない。"};
TK.RESEARCH_SOURCES.inaApproachComparison={"author":"OpenStreetMap contributors / FOSSGIS OSRM","title":"豊川・新城・長篠の道路比較線","url":"https://www.openstreetmap.org/copyright","locator":"2026-11-01、伊那街道南部・大海～医王寺・足助～作手の3照会","accessed":"2026-11-01","scope":"自転車向けの現代道路比較。戦国期の橋・道路中心線・軍の通過経路を確定する資料ではない。"};
TK.ROADS.push(["伊那街道（豊川・新城）",[[137.3595,34.7967],[137.3955,34.8252],[137.4203,34.8526],[137.474,34.885],[137.495,34.9015],[137.5148,34.9135],[137.542,34.935]]]);
TK.ROAD_EVIDENCE["伊那街道（豊川・新城）"]={"geometry":"modern-reference","sources":["inaShinshiro","inaApproachComparison"],"level":"unverified","status":"経由地の参考と近現代道路の比較線。戦国期の中心線は未確定。"};
TK.ROADS.push(["長篠への道",[[137.542,34.935],[137.5598,34.928]]]);
TK.ROAD_EVIDENCE["長篠への道"]={"geometry":"modern-reference","sources":["inaShinshiro","inaApproachComparison"],"level":"unverified","status":"経由地の参考と近現代道路の比較線。戦国期の中心線は未確定。"};
TK.ROADS.push(["作手への道",[[137.3168,35.1328],[137.423,34.978],[137.468389,34.882196]]]);
TK.ROAD_EVIDENCE["作手への道"]={"geometry":"modern-reference","sources":["inaCampaign2016","iidaOgasawara","inaApproachComparison"],"level":"unverified","status":"経由地の参考と近現代道路の比較線。戦国期の中心線は未確定。"};
TK.RESEARCH_SOURCES["inaCampaign2016"]={"author":"笹本正治／長野県埋蔵文化財センター","title":"掘るしんinいいだ・三遠南信の戦国時代","year":"2016","url":"https://naganomaibun.or.jp/uploads/horusin-in-Iida-siryou.pdf","locator":"本文4～5頁（PDF6～7頁）","accessed":"2026-11-01","scope":"下伊那の軍事交通と1575年の三河侵攻。個別隊の逐日経路・路幅を確定しない。"};
TK.RESEARCH_SOURCES["iidaOgasawara"]={"author":"飯田市","title":"松尾・鈴岡小笠原氏略歴","url":"https://www.city.iida.lg.jp/site/bunkazai/ogasawarashi.html","locator":"武田氏による信濃平定から長篠の戦い","accessed":"2026-11-01","scope":"足助・作手・野田・二連木・吉田方面の武田軍の作戦。本文の天正3年に対応する西暦1572という誤記は採用せず、長篠の1575年を別資料と照合。"};
TK.CAMPAIGN_CORRIDORS=(TK.CAMPAIGN_CORRIDORS||[]).concat([{"id":"nagashino-katsuyori-1575","title":"長篠の戦い","commanders":["武田勝頼"],"sourceIds":["inaCampaign2016","iidaOgasawara"],"basis":"作戦地域に基づく概略経路。各将の全通過地点・日々の位置は未確定。","marchKmPerDay":22,"waypoints":[{"name":"高遠方面","point":[138.062363,35.83316]},{"name":"下伊那・飯田方面","point":[137.832513,35.511835]},{"name":"足助方面","point":[137.3168,35.1328]},{"name":"作手方面","point":[137.423,34.978]},{"name":"野田方面","point":[137.468389,34.882196]},{"name":"二連木方面","point":[137.411,34.773]},{"name":"吉田方面","point":[137.396043,34.769562]}],"routeNote":"伊那・足助・作手方面から東三河へ（地点間は参考経路）","recordType":"sourced-campaign-corridor","status":"corridor-with-estimated-segments","personIds":["person:takeda-katsuyori"],"referenceLocationIds":["location:katsuyori-tsutsujigasaki-1573"],"referenceUse":"居所の参照。1575年の出発日や逐日滞在の証明ではない。"}]);
})();
