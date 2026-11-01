exec(open('/home/claude/play/lib.py').read())
start()
pg.get_by_role('button',name='×32').click()
for i in range(40):
  pg.wait_for_timeout(300)
  m=modal()
  if m and '分かれ道' in m: pg.locator('#modal .act').first.click()
  elif m and '合戦図' in m: break
pg.wait_for_timeout(4000);shot('sc1')
pg.wait_for_timeout(8000);shot('sc2')
