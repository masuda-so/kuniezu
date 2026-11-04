"""既存の街道通過点から取得したOSM参考線を表示専用に簡略化する。
入力: OSRMから取得した {roads:{name:coordinates},audit:[]} JSON。
出力の道路データは © OpenStreetMap contributors / ODbL 1.0。
史実の道路中心線としても、ゲームの行軍経路としても使用しない。
"""
import json,sys,pathlib
from shapely.geometry import LineString
r=json.loads(pathlib.Path(sys.argv[1]).read_text());root=pathlib.Path(__file__).resolve().parents[2]
override=root/'data/inputs/sanshu-modern.json'
if override.exists():
    extra=json.loads(override.read_text())
    if extra.get('accepted') is True:
        r['roads'].update(extra['roads']);r['audit']=[a for a in r['audit'] if a['name'] not in extra['roads']]+extra['audit']
out={n:[[round(x,6),round(y,6)] for x,y in LineString(p).simplify(.00006).coords] for n,p in r['roads'].items()}
for folder in ['hokkokukaido-review','tosa-road-review','hyuga-road-review','hokurikudo-review']:
    accepted=root/'data/inputs'/folder/'accepted-whole-reference.json'
    if accepted.exists():
        record=json.loads(accepted.read_text());assert record['status']=='accepted-modern-comparison';out[record['name']]=record['points']
(root/'game/modern-road-reference.js').write_text('"use strict";\n/* © OpenStreetMap contributors, ODbL 1.0; 北国街道北部・土佐東街道沿岸は国土地理院 道路中心線（加工）。日向道・北陸道の一部は文化庁選定地図の線（加工）。現代の比較線。史実の行軍データとは独立。 */\nTK.MODERN_ROAD_REFERENCE='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
(root/'data/audits/modern-road-reference-audit.json').write_text(json.dumps({'source':'https://routing.openstreetmap.de/routed-bike/','copyright':'© OpenStreetMap contributors','license':'https://opendatacommons.org/licenses/odbl/1-0/','accessed':'2026-11-01','audit':r['audit'],'simplifiedVertices':sum(map(len,out.values()))},ensure_ascii=False,indent=2)+'\n')
print(len(out),sum(map(len,out.values())))

# 個別に登録した旧道の採用点を、比較道路の再生成で失わない。
import subprocess
subprocess.run(["node",str(root/"tools/research/register-rokujurigo-inland.cjs")],check=True)
