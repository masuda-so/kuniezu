exec(open('/home/claude/play/lib.py').read())
start('長篠前夜');pg.wait_for_timeout(1000)
pg.evaluate("(()=>{const y=G.YOSHO.find(y=>y.n==='石見銀山');TKUI.cam(y.x,y.y,2.5)})()");pg.wait_for_timeout(700)
xy=pg.evaluate("(()=>{const y=G.YOSHO.find(y=>y.n==='石見銀山');const r=document.querySelectorAll('canvas')[1].getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
import json
print(xy)
