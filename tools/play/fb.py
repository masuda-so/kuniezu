exec(open('/home/claude/play/lib.py').read())
start()
pg.mouse.click(920,492);pg.wait_for_timeout(800)
pg.locator('#drawer .act').filter(has_text='攻める').click();pg.wait_for_timeout(600)
pg.locator('#modal button').filter(has_text='出陣する').click();pg.wait_for_timeout(500)
pg.get_by_role('button',name='×4').click()
for i in range(30):
  pg.wait_for_timeout(500)
  if '野戦' in modal(): break
pg.locator('#modal [data-v=kakuyoku]').click()
pg.locator('#modal button').filter(has_text='合戦を始める').click();pg.wait_for_timeout(300);print('after go:',modal()[:200].replace('\n',' / '));shot('fbgo')
for k in range(2):
  pg.wait_for_timeout(2500); shot(f'fb{k}'); print(k, txt('.bnar'))
