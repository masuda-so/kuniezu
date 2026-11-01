import os
from playwright.sync_api import sync_playwright
T=os.environ['T'].split(',')
with sync_playwright() as p:
  b=p.chromium.launch()
  for i,t in enumerate(T):
    pg=b.new_page(viewport={'width':1400,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8000/index.html");pg.wait_for_timeout(1500)
    exec(open('/home/claude/play/lib.py').read().replace('def start','def _s'),globals())
    pg.get_by_text('はじめる').click();pg.wait_for_timeout(500);pg.get_by_text('桶狭間前夜').click();pg.wait_for_timeout(800);pg.locator('text=で見守る').first.click();pg.wait_for_timeout(1500)
    pg.evaluate(f"TKUI.open('scene',{{title:{t!r}}})");pg.wait_for_timeout(int(os.environ.get('W','9000')))
    pg.screenshot(path=f'/home/claude/play/s2_{i}.png',clip={'x':250,'y':40,'width':900,'height':820})
    print(t,errs);pg.close()
  b.close()
