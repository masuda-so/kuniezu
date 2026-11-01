"""Natural Earth 5.x river centerlines: regional extract, not historical riverbanks."""
import json, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[2]
names={'Yalu':'鴨緑江','Tumen':'豆満江','Liao':'遼河','Han':'漢江','Namhan':'南漢江','Nakdong':'洛東江'}
out=[]
for f in json.load(open(sys.argv[1]))['features']:
    name=f['properties']['name']
    if name not in names:continue
    g=f['geometry'];lines=[g['coordinates']] if g['type']=='LineString' else g['coordinates']
    # Han には中国の漢水も含まれる。同名だけで採用しない。
    lines=[line for line in lines if any(121.5<=p[0]<=131.5 and 33<=p[1]<=43.5 for p in line)]
    if not lines:continue
    out.append({'name':names[name],'border':name in ['Yalu','Tumen'],'lines':[[[round(v,5) for v in p[:2]] for p in line] for line in lines]})
(root/'game/regional-rivers.js').write_text('"use strict";\n/* Natural Earth rivers, public domain. Modern reference centerlines, not historical banks. */\nTK.REGIONAL_RIVERS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(out),'river records')
