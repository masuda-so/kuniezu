exec(open('/home/claude/play/lib.py').read())
start();pg.wait_for_timeout(1500)
for z in (2.5,5):
  pg.evaluate(f"(()=>{{const a=G.C.yoshida,b=G.C.hikuma;TKUI.cam((a.x+b.x)/2,(a.y+b.y)/2,{z})}})()");pg.wait_for_timeout(800);shot(f'yh_{z}')
