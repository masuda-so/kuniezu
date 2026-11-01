"""Retain major Korean river sections for the normal game map. Original reference data stays intact."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
s=(root/'game/korean-rivers-detail.js').read_text()
rows=json.loads(s.split('TK.KOREAN_RIVERS_DETAIL=',1)[1].rstrip().rstrip(';'))
major={'압록강','두만강','대동강','청천강','한강','남한강','북한강','임진강','낙동강','금강','섬진강','영산강','예성강','례성강','성천강'}
selected=[]
for r in rows:
    matches=[name for name in r['name'].split() if name in major]
    if not matches:continue
    r={**r,'name':matches[0],'sourceName':r['name']}
    selected.append(r)
rows=selected
(root/'game/korean-rivers-major.js').write_text('"use strict";\n/* © OpenStreetMap contributors / ODbL 1.0. Major rivers selected from 10,457 modern reference sections. */\nTK.KOREAN_RIVERS_DETAIL='+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(rows),'major river sections')
