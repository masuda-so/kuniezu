exec(open('/home/claude/play/lib.py').read())
import os
pg.get_by_text('はじめる').click(); pg.wait_for_timeout(700)
pg.get_by_text(os.environ['SC']).click(); pg.wait_for_timeout(900)
print(txt('#pick')[:700].replace('\n',' / '))
pg.locator('#pick button').filter(has_text=os.environ['CL']).first.click(); pg.wait_for_timeout(600); shot('pre_pick')
print(txt('.pcur').replace('\n',' '))
pg.locator('text=で見守る').first.click(); pg.wait_for_timeout(1500)
print(txt('#me').replace('\n',' '),'| modal:',modal()[:100])
pg.get_by_role('button',name='×16').click()
for i in range(40):
  pg.wait_for_timeout(500);m=modal()
  if m:
    print(txt('#eraTxt').replace('\n',' ')[:24],'|',m[:120].replace('\n',' / '))
    b=pg.locator('#modal .act, #modal button.btn');labels=[b.nth(j).inner_text() for j in range(b.count())]
    pref=[j for j,l in enumerate(labels) if any(w in l for w in ['史実','地図へ戻る','合戦を始める','このまま'])]
    b.nth(pref[0] if pref else 0).click()
    if not pg.locator('.pp.on').count(): pg.get_by_role('button',name='×16').click()
print(txt('#eraTxt').replace('\n',' '),txt('#me').replace('\n',' '))
shot('pre_end')
