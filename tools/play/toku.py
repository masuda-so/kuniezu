exec(open('/home/claude/play/lib.py').read())
pg.get_by_text('はじめる').click(); pg.wait_for_timeout(700)
pg.get_by_text('本能寺前夜').click(); pg.wait_for_timeout(900)
pg.locator('#pick button').filter(has_text='徳川').first.click(); pg.wait_for_timeout(500)
pg.locator('text=で見守る').first.click(); pg.wait_for_timeout(1500)
print(txt('#me').replace('\n',' '), '| modal:',modal()[:200].replace('\n',' / '))
pg.get_by_role('button',name='×8').click()
for i in range(25):
  pg.wait_for_timeout(600);m=modal()
  if m:
    print(txt('#eraTxt').replace('\n',' '),'|',m[:160].replace('\n',' / ')); shot(f'tk{i}')
    pg.locator('#modal .act, #modal button.btn').first.click()
    if not pg.locator('.pp.on').count(): pg.get_by_role('button',name='×8').click()
print(txt('#me').replace('\n',' '))
