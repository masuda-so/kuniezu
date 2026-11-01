exec(open('/home/claude/play/lib.py').read())
import time
scens=['桶狭間前夜','信長包囲網','長篠前夜','本能寺前夜','関白への道','唐入り','関ヶ原前夜']
for sc in scens:
  pg.goto("http://localhost:8000/index.html"); pg.wait_for_timeout(1500)
  start(sc)
  info=txt('#me').replace('\n',' ')
  for x in (1000,1366):
    pg.mouse.click(x,817);pg.wait_for_timeout(500)
    if modal(): 
      t0=time.time();pg.locator('#modal button').filter(has_text='早送').click();pg.wait_for_timeout(1200)
  print(sc,'|',info,'=>',txt('#eraTxt').replace('\n',' '),'|',txt('#me').replace('\n',' ')[:80],'| errs so far',len(errs))
  m=modal(); 
  if m: print('  modal:',m[:200].replace('\n',' / '))
  shot('end_'+sc)
