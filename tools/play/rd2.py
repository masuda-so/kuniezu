exec(open('/home/claude/play/lib.py').read())
start();pg.wait_for_timeout(1500)
import math
cx=math.cos(math.radians(36))
for n,(lo,la,z) in {'tsuruga':(136.0,35.5,3.5),'mino':(136.8,35.3,3.5),'hyuga':(131.4,32.1,3),'satta':(138.55,35.08,7)}.items():
  pg.evaluate(f"TKUI.cam({(lo-129.2)*200*cx},{(41.75-la)*200},{z})");pg.wait_for_timeout(700);shot('rd2_'+n)
