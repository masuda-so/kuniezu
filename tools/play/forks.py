exec(open('/home/claude/play/lib.py').read())
import json
for sc,clan in [('関ヶ原前夜',None),('関白への道',None)]:
  pg.goto("http://localhost:8000/index.html"); pg.wait_for_timeout(1500)
  start(sc, clan)
  pg.get_by_role('button',name='×32').click()
  seen=0
  for i in range(70):
    pg.wait_for_timeout(500)
    m=modal()
    if m:
      if '分かれ道' in m:
        print(sc, txt('#eraTxt').replace('\n',' '),'|',m[:300].replace('\n',' / ')); shot(f'fk_{sc}_{seen}'); seen+=1
      b=pg.locator('#modal .act, #modal button.btn')
      labels=[b.nth(k).inner_text() for k in range(b.count())]
      pref=[k for k,l in enumerate(labels) if any(w in l for w in ['史実','地図へ戻る','合戦を始める','このまま'])]
      b.nth(pref[0] if pref else 0).click()
      if not pg.locator('.pp.on').count(): pg.get_by_role('button',name='×32').click()
    if seen>=4: break
