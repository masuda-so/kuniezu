exec(open('/home/claude/play/lib.py').read())
start()
print(txt('#eraTxt').replace('\n',' '))
for d in [[1560,6,12],[1561,1,5],[1561,2,20],[1575,6,29],[1582,6,21],[1582,10,20],[1593,1,10],[1600,10,21],[1615,6,4]]:
  print(d, pg.evaluate(f"G.dstr(G.evT({{d:{d}}}))"))
