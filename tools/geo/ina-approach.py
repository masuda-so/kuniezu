"""伊那街道南部と長篠への比較経路。元の経由地とOSM線を別入力に保持する。"""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
anchors=json.loads((root/'data/inputs/ina-approach-route.json').read_text())
source={'author':'Network2010','title':'伊那街道 新城市','year':'2013','url':'https://network2010.org/article/298','locator':'野田城駅周辺・新城市街・設楽原・長篠の各節','accessed':'2026-11-01','scope':'街道周辺の地点関係の参照。座標・路幅・1560～1615年の道路中心線や個別軍の通過を確定しない。'}
lines=['"use strict";','/* © OpenStreetMap contributors / ODbL 1.0. 現代比較線。戦国期の道路中心線の復元ではない。 */','(function(){', 'TK.RESEARCH_SOURCES.inaShinshiro='+json.dumps(source,ensure_ascii=False,separators=(',',':'))+';']
lines.append('TK.RESEARCH_SOURCES.inaApproachComparison='+json.dumps({'author':'OpenStreetMap contributors / FOSSGIS OSRM','title':'豊川・新城・長篠の道路比較線','url':'https://www.openstreetmap.org/copyright','locator':'2026-11-01、伊那街道南部・大海～医王寺・足助～作手の3照会','accessed':'2026-11-01','scope':'自転車向けの現代道路比較。戦国期の橋・道路中心線・軍の通過経路を確定する資料ではない。'},ensure_ascii=False,separators=(',',':'))+';')
for name,points in anchors:
    lines+=['TK.ROADS.push('+json.dumps([name,points],ensure_ascii=False,separators=(',',':'))+');', 'TK.ROAD_EVIDENCE['+json.dumps(name,ensure_ascii=False)+']='+json.dumps({'geometry':'modern-reference','sources':(['inaCampaign2016','iidaOgasawara','inaApproachComparison'] if name=='作手への道' else ['inaShinshiro','inaApproachComparison']),'level':'unverified','status':'経由地の参考と近現代道路の比較線。戦国期の中心線は未確定。'},ensure_ascii=False,separators=(',',':'))+';']
sources={'inaCampaign2016':{'author':'笹本正治／長野県埋蔵文化財センター','title':'掘るしんinいいだ・三遠南信の戦国時代','year':'2016','url':'https://naganomaibun.or.jp/uploads/horusin-in-Iida-siryou.pdf','locator':'本文4～5頁（PDF6～7頁）','accessed':'2026-11-01','scope':'下伊那の軍事交通と1575年の三河侵攻。個別隊の逐日経路・路幅を確定しない。'},'iidaOgasawara':{'author':'飯田市','title':'松尾・鈴岡小笠原氏略歴','url':'https://www.city.iida.lg.jp/site/bunkazai/ogasawarashi.html','locator':'武田氏による信濃平定から長篠の戦い','accessed':'2026-11-01','scope':'足助・作手・野田・二連木・吉田方面の武田軍の作戦。本文の天正3年に対応する西暦1572という誤記は採用せず、長篠の1575年を別資料と照合。'}}
for id,source in sources.items():lines.append('TK.RESEARCH_SOURCES['+json.dumps(id)+']='+json.dumps(source,ensure_ascii=False,separators=(',',':'))+';')
corridors=json.loads((root/'data/inputs/ina-approach-corridors.json').read_text())
assert len({r['id'] for r in corridors})==len(corridors)
for r in corridors:
    assert r['status']=='corridor-with-estimated-segments' and r['sourceIds'] and r['referenceLocationIds']
    assert isinstance(r['marchKmPerDay'],(int,float)) and 0<r['marchKmPerDay']<100
    assert all(len(w['point'])==2 and all(isinstance(v,(int,float)) for v in w['point']) for w in r['waypoints'])
lines.append('TK.CAMPAIGN_CORRIDORS=(TK.CAMPAIGN_CORRIDORS||[]).concat('+json.dumps(corridors,ensure_ascii=False,separators=(',',':'))+');')
lines+=['})();']
(root/'kuniezu/static/kuniezu/ina-approach.js').write_text('\n'.join(lines)+'\n')
