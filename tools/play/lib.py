def start(scen='桶狭間前夜', clan=None):
  pg.get_by_text('はじめる').click(); pg.wait_for_timeout(700)
  pg.get_by_text(scen).click(); pg.wait_for_timeout(900)
  if clan: pg.locator('button,div[role=button],.cpick, *').filter(has_text=clan).last.click(); pg.wait_for_timeout(600)
  pg.locator('text=で見守る').first.click(); pg.wait_for_timeout(1200)
  if pg.locator('[data-act="intro-next"]').count(): pg.locator('#modal [data-act="close"]').click()
def modal():
  return pg.evaluate("(()=>{const m=document.querySelector('#modal');return m&&!m.hidden?m.innerText:''})()")
def run(n, speed='×32', pick=0, tag='r', every=0, stop=None):
  pg.get_by_role('button',name=speed).click()
  for i in range(n):
    pg.wait_for_timeout(1500)
    m=modal()
    d=txt('#eraTxt').replace('\n',' ')
    toast=txt('#toast')
    if m:
      print(i,d,'| MODAL:',m[:250].replace('\n',' / '))
      shot(f'{tag}_m{i:03d}')
      btns=pg.locator('#modal .act, #modal button.btn')
      try:
        cnt=btns.count()
        labels=[btns.nth(k).inner_text().replace('\n',' ')[:40] for k in range(cnt)]
        print('   buttons:',[l[:25] for l in labels])
        pref=[k for k,l in enumerate(labels) if any(w in l for w in ['合戦を始める','地図へ戻る','閉じる','続ける','進む'])]
        btns.nth(pref[0] if pref else min(pick,cnt-1)).click()
        pg.wait_for_timeout(300)
        if modal() and pref:
          b2=pg.locator('#modal .act, #modal button.btn'); l2=[b2.nth(k).inner_text() for k in range(b2.count())]
          print('   after:',[x.replace('\n',' ')[:30] for x in l2])
      except Exception as e: print('  click err',e)
      pg.wait_for_timeout(500)
      if not pg.locator('#era .pp.on').count(): pg.get_by_role('button',name=speed).click()
    else:
      print(i,d)
    if every and i%every==0: shot(f'{tag}_{i:03d}')
    if stop and stop in d: break
