exec(open('/home/claude/play/lib.py').read())
start();pg.wait_for_timeout(1500)
import math
cx=math.cos(math.radians(36))
for n,(lo,la) in {'satta':(138.52,35.06),'hamana':(137.6,34.69),'kuwana':(136.75,35.07)}.items():
  pg.evaluate(f"TKUI.cam({(lo-129.2)*200*cx},{(41.75-la)*200},7.5)");pg.wait_for_timeout(700);shot('z8_'+n)
