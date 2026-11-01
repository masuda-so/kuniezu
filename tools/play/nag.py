exec(open('/home/claude/play/lib.py').read())
start('長篠前夜')
pg.get_by_role('button',name='×32').click()
for i in range(60):
  pg.wait_for_timeout(400);m=modal()
  if m and '合戦図' in m: break
  if m: 
    pg.locator('#modal .act, #modal button.btn').first.click()
pg.locator('#modal button').filter(has_text='×4').click()
pg.wait_for_timeout(9000);shot('nag1');print(txt('.bnar'))
