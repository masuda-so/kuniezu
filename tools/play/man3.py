exec(open('/home/claude/play/lib.py').read())
start('唐入り');pg.wait_for_timeout(1500)
pg.evaluate("TKUI.cam(-500,-50,.7)");pg.wait_for_timeout(800)
for x,y in [(900,300),(900,400),(700,300),(1100,450),(600,200)]:
  print(x,y,pg.evaluate(f"(()=>{{const cs=[...document.querySelectorAll('canvas')];return cs.map(c=>{{try{{const d=c.getContext('2d').getImageData({x}*devicePixelRatio,{y}*devicePixelRatio,1,1).data;return c.id+':'+[...d].join(',')}}catch(e){{return c.id+':x'}}}}).join(' ')}})()"))
