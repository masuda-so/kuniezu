# usage: drv.py steps.py  -- runs steps with `pg` available; helpers: shot(name)
import sys
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch()
  ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
  pg=ctx.new_page()
  pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error','warning') and 'TUNNEL' not in m.text else None)
  pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}\n{e.stack if hasattr(e,"stack") else ""}'))
  pg.goto("http://localhost:8000/index.html"); pg.wait_for_timeout(2500)
  def shot(n): pg.screenshot(path=f'/home/claude/play/{n}.png')
  def txt(sel='body'): return pg.evaluate(f"(document.querySelector({sel!r})||{{}}).innerText||''")
  exec(open(sys.argv[1]).read())
  print("ERRORS:\n"+("\n".join(errs) or 'none'))
  b.close()
