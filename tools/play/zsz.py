import sys
from playwright.sync_api import sync_playwright
sizes=[(1400,860),(1920,1080),(1280,720),(1024,768),(820,1180),(390,844),(844,390)]
with sync_playwright() as p:
  b=p.chromium.launch()
  for w,h in sizes:
    pg=b.new_page(viewport={'width':w,'height':h},is_mobile=w<820,has_touch=w<820)
    pg.goto("http://localhost:8000/index.html");pg.wait_for_timeout(1800)
    pg.get_by_text('はじめる').click();pg.wait_for_timeout(600);pg.get_by_text('桶狭間前夜').click();pg.wait_for_timeout(800)
    pg.locator('text=で見守る').first.click();pg.wait_for_timeout(2500)
    pg.evaluate("TKUI.cam(600,1000,0.01)");pg.wait_for_timeout(800)
    pg.screenshot(path=f'/home/claude/play/zs_{w}x{h}.png');pg.close()
  b.close()
