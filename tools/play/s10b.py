exec(open('/home/claude/play/lib.py').read())
import time,os
sc=os.environ['SC']
start(sc)
for x in (1000,1366):
  pg.mouse.click(x,817);pg.wait_for_timeout(500)
  if '早送' in modal(): pg.locator('#modal button').filter(has_text='早送').click();pg.wait_for_timeout(1200)
  m=modal()
  if m and '表舞台' in m: pg.locator('#modal button').filter(has_text='このまま').click()
print(sc,'=>',txt('#eraTxt').replace('\n',' '),'|',txt('#me').replace('\n',' ')[:60])
