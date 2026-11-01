import sys, json
from playwright.sync_api import sync_playwright
url="http://localhost:8000/index.html"
with sync_playwright() as p:
  b=p.chromium.launch()
  pg=b.new_page(viewport={'width':1400,'height':860})
  errs=[]
  pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error','warning') else None)
  pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
  pg.goto(url); pg.wait_for_timeout(3000)
  pg.screenshot(path='/home/claude/play/01_title.png')
  print("\n".join(errs) or 'no errors')
  print(pg.evaluate("document.body.innerText.slice(0,1500)"))
  b.close()
