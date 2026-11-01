exec(open('/home/claude/play/lib.py').read())
start();pg.wait_for_timeout(2000)
pg.evaluate("document.querySelector('[data-speed=\"0\"]')?.click()")
import json
for nm,z in [('yoshida',4),('kyoto',2.2),('kyoto',3.5),('kanto',1.6),('kyushu',1.6)]:
  pos={'yoshida':"(()=>{const a=G.C['yoshida']||G.CL.find(c=>c.n1.includes('吉田')),b=G.CL.find(c=>c.n1.includes('曳馬'));return[(a.x+b.x)/2,(a.y+b.y)/2]})()",
       'kyoto':"(()=>{const a=G.CL.find(c=>c.n1.includes('二条')||c.prov==='山城');return[a.x,a.y]})()",
       'kanto':"(()=>{const a=G.CL.find(c=>c.n1.includes('江戸'));return[a.x,a.y]})()",
       'kyushu':"(()=>{const a=G.CL.find(c=>c.n1.includes('立花'));return[a.x,a.y]})()"}[nm]
  xy=pg.evaluate(pos);pg.evaluate(f"TKUI.cam({xy[0]},{xy[1]},{z})");pg.wait_for_timeout(700);shot(f'rv3_{nm}_{z}')
