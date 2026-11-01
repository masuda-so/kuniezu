import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
  b=p.chromium.launch();pg=b.new_page();pg.add_init_script("window.__NOFIX=1");pg.goto("http://localhost:8000/index.html");pg.wait_for_timeout(2500)
  json.dump(json.loads(pg.evaluate("JSON.stringify(G.ROADS.map(r=>[r.name,r.pts]))")),open('/home/claude/play/roads.json','w'),ensure_ascii=False);b.close()
