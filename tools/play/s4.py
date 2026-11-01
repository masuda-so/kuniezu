pg.get_by_text('はじめる').click(); pg.wait_for_timeout(800)
pg.get_by_text('桶狭間前夜').click(); pg.wait_for_timeout(1000)
pg.get_by_text('織田家で見守る').click(); pg.wait_for_timeout(1500)
pg.get_by_role('button',name='×8').click()

for i in range(20):
  pg.wait_for_timeout(2500)
  d=txt('#eraTxt').replace('\n',' ')
  m=pg.evaluate("(()=>{const m=document.querySelector('#modal');return m&&!m.hidden?m.innerText:''})()")
  print(i,d,'| MODAL:',m[:300].replace('\n',' / ') if m else '')
  shot(f'05_run{i:02d}')
  if m: break
