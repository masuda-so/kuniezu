exec(open('/home/claude/play/lib.py').read())
start('長篠前夜');pg.wait_for_timeout(1200)
import math
cx=math.cos(math.radians(36))
for n,(lo,la,z) in {'kansai':(135.8,34.9,1.6),'iwami':(132.5,35.1,2.2)}.items():
  pg.evaluate(f"TKUI.cam({(lo-129.2)*200*cx},{(41.75-la)*200},{z})");pg.wait_for_timeout(700);shot('fac_'+n)
print(pg.evaluate("JSON.stringify([G.monthIncome('mori'),G.YOSHO.length])"))
