exec(open('/home/claude/play/lib.py').read())
import os
pg.get_by_text('はじめる').click(); pg.wait_for_timeout(700)
pg.get_by_text('関ヶ原前夜').click(); pg.wait_for_timeout(900)
pg.locator('#pick button').filter(has_text=os.environ.get('CL','石田')).first.click(); pg.wait_for_timeout(500)
pg.locator('text=で見守る').first.click(); pg.wait_for_timeout(1500)
pg.get_by_role('button',name='×16').click()
last=''
for i in range(60):
  pg.wait_for_timeout(500);m=modal()
  if m:
    b=pg.locator('#modal .act, #modal button.btn');labels=[b.nth(j).inner_text() for j in range(b.count())]
    pref=[j for j,l in enumerate(labels) if any(w in l for w in ['史実','地図へ戻る','合戦を始める','このまま'])]
    b.nth(pref[0] if pref else 0).click()
    if not pg.locator('.pp.on').count(): pg.get_by_role('button',name='×16').click()
  c=pg.evaluate("G.clanCastles('ishida').map(G.cname).join(',')+' | units:'+G.S().units.filter(u=>u.clan==='ishida').map(u=>u.mission+'>'+G.cname(u.path[u.path.length-1])).join(',')")
  if c!=last: print(txt('#eraTxt').replace('\n',' ')[:30],c); last=c
