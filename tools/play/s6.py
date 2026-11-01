exec(open('/home/claude/play/lib.py').read())
start()
import time
shot('ff_modal_pre')
for x,tag in [(735,'1582'),(1090,'1600'),(1375,'1615')]:
  pg.mouse.click(x,817);pg.wait_for_timeout(800)
  if tag=='1582': shot('ff_modal')
  t0=time.time();pg.locator('#modal button').filter(has_text='早送').click();pg.wait_for_timeout(1500)
  print(tag,'took',round(time.time()-t0,1),txt('#eraTxt').replace('\n',' '),'|',txt('#me').replace('\n',' '))
  m=modal(); print(' modal:',m[:300].replace('\n',' / '))
  shot('ff_'+tag)
  if m:
    try: pg.locator('#modal .act, #modal button.btn').first.click()
    except: pass
print(txt('#chron')[:1500])
