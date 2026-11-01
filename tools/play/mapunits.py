exec(open('/home/claude/play/lib.py').read())
start()
pg.get_by_role('button',name='×4').click()
for i in range(40):
  pg.wait_for_timeout(400)
  m=modal()
  if m and '分かれ道' in m: pg.locator('#modal .act').first.click()
  elif m and '合戦図' in m: pg.locator('#modal button').filter(has_text='地図へ戻る').click()
  if '六月' in txt('#eraTxt') or '5月2' in txt('#eraTxt'):
    pass
  if i in (6,12,18): pg.locator('.pp').click(); print(i,pg.evaluate("JSON.stringify(G.S().units.map(u=>[u.clan,u.state,u.troops,u.gens.length]))"));pg.evaluate("(()=>{const u=G.S().units.sort((a,b)=>b.troops-a.troops)[0];if(!u)return;const C=G.C[u.path[Math.min(u.seg+1,u.path.length-1)]];const p=G.S().units[0];TKUI.cam(C.x,C.y,3.2)})()");pg.wait_for_timeout(600);shot(f'mu{i}');pg.locator('.pp').click()
