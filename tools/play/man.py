exec(open('/home/claude/play/lib.py').read())
start('唐入り');pg.wait_for_timeout(1500)
for nm,(x,y,z) in {'man1':(-300,200,.35),'man2':(-500,-50,.7),'man0':(600,900,.05),'hok':(1900,-100,.8)}.items():
  pg.evaluate(f"TKUI.cam({x},{y},{z})");pg.wait_for_timeout(800);shot(nm)
