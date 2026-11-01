exec(open('/home/claude/play/lib.py').read())
import os
start()
for i,t in enumerate(os.environ['T'].split(',')):
  pg.evaluate(f"TKUI.open('scene',{{title:{t!r}}})");pg.wait_for_timeout(int(os.environ.get('W','1500')))
  pg.screenshot(path=f'/home/claude/play/scn{i}.png',clip={'x':260,'y':120,'width':880,'height':560})
  pg.evaluate("document.querySelector('#modal [data-act=close]')&&document.querySelector('#modal [data-act=close]').click()");pg.wait_for_timeout(300)
