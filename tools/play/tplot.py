import json
d=pg.evaluate("JSON.stringify({h:TKGEO.terr.hikuma,k:TKGEO.terr.kakegawa,y:TKGEO.terr.yoshida,i:TKGEO.terr.iida})")
open('/home/claude/play/terr.json','w').write(d)
