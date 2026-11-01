exec(open('/home/claude/play/lib.py').read())
start();pg.wait_for_timeout(1500)
for nm,(x,y,z) in {'hok1':(1700,-150,.9),'hok2':(1650,-60,2),'tsu':(1600,90,1.5)}.items():
  pg.evaluate(f"TKUI.cam({x},{y},{z})");pg.wait_for_timeout(700);shot(nm)
print(pg.evaluate("JSON.stringify((()=>{const c=G.CL.find(c=>c.n1.includes('勝山')||c.n1.includes('館')&&c.prov==='蝦夷');return c?[c.n1,c.x,c.y]:null})())"))
