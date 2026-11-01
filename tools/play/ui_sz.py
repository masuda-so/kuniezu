from playwright.sync_api import sync_playwright
with sync_playwright() as p:
  b=p.chromium.launch()
  for (w,h) in [(1000,700),(1280,720),(820,1180),(390,844),(1600,900)]:
    pg=b.new_page(viewport={'width':w,'height':h});pg.goto("http://localhost:8000/index.html");pg.wait_for_timeout(1500)
    exec(open('/home/claude/play/lib.py').read().replace('def start','def _s'),globals())
    pg.get_by_text('はじめる').click();pg.wait_for_timeout(500);pg.get_by_text('長篠前夜').click();pg.wait_for_timeout(800);pg.locator('text=で見守る').first.click();pg.wait_for_timeout(1500)
    pg.evaluate("(()=>{const S=G.S();const u=S.units[0]||{clan:S.player,gens:[],troops:12000,mission:'attack',until:'長篠の戦い'};G.onSortie(Object.assign({},u,{until:'長篠の戦い'}),'yoshida');})()")
    pg.wait_for_timeout(400);pg.screenshot(path=f'/home/claude/play/ui_{w}.png');pg.close()
  b.close()
