exec((PLAY_DIR / 'lib.py').read_text())
import os
sc=os.environ['SC']
start(sc)
pg.evaluate("TKUI.open('ffwd',{t:G.evT({d:[1615,6,10]})})");pg.wait_for_timeout(400)
pg.locator('#modal button').filter(has_text='早送').click();pg.wait_for_timeout(1500)
for i in range(6):
  m=modal()
  if m and '表舞台' in m: pg.locator('#modal button').filter(has_text='このまま').click();pg.wait_for_timeout(300)
  d=pg.evaluate("G.date().y")
  if d>=1615:break
  pg.evaluate("TKUI.open('ffwd',{t:G.evT({d:[1615,6,10]})})");pg.wait_for_timeout(300)
  try:pg.locator('#modal button').filter(has_text='早送').click();pg.wait_for_timeout(1500)
  except Exception as e:break
print(sc,'=>',txt('#eraTxt').replace('\n',' '),'|',txt('#me').replace('\n',' ')[:60])
