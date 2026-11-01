exec(open('/home/claude/play/lib.py').read())
start()
pg.get_by_role('button',name='×16').click()
seen=set()
for i in range(90):
  pg.wait_for_timeout(300);m=modal()
  if m:
    if '今川に降り' in m: pg.locator('#modal .act').nth(2).click()
    else: pg.locator('#modal .act, #modal button.btn').first.click()
    if not pg.locator('.pp.on').count(): pg.get_by_role('button',name='×16').click()
  r=pg.evaluate("""(()=>{const S=G.S();return S.units.filter(u=>['imagawa','oda','takeda'].includes(u.clan)).map(u=>u.clan+':'+u.id+':'+u.mission+':'+u.path.map(x=>G.C[x].n1+'('+S.castles[x].owner+')').join('>')+' / '+u.gens.map(g=>(G.gen(g)||{}).n).join(','))})()""")
  for x in r:
    if x not in seen: seen.add(x); print(txt('#eraTxt').replace('\n',' ')[:20],x)
  if '1568' in txt('#eraTxt'): break
