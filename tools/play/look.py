# usage: set LOOK=[(name,x,y,z,mode)] ; mode 'game' starts as oda 1560
exec(open('/home/claude/play/lib.py').read())
import json,os
start(os.environ.get('SCEN','桶狭間前夜'))
pg.wait_for_timeout(2500);pg.evaluate("document.querySelector('#chron').style.display='none';document.querySelector('#tline').style.display='none'")
for n,x,y,z in json.loads(os.environ['LOOK']):
  pg.evaluate(f"TKUI.cam({x},{y},{z})"); pg.wait_for_timeout(700); shot('look_'+n)
