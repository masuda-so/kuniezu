exec(open('/home/claude/play/lib.py').read())
start()
pg.get_by_role('button',name='×32').click()
for i in range(20):
  pg.wait_for_timeout(400)
  if modal(): print(txt('#eraTxt').replace('\n',' '),'|',modal()[:40].replace('\n',' ')); pg.locator('#modal .act').first.click()
  if 'MODAL' in '' : pass
  if '1561' in txt('#eraTxt'): break
