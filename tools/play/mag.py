exec(open('/home/claude/play/lib.py').read())
start('長篠前夜');pg.wait_for_timeout(800)
# 織田から伊勢方面へ攻撃を一つ出す
r=pg.evaluate("""(()=>{const S=G.S();const k=S.player;const tg='ueno';const src=G.clanCastles(k).find(m=>G.ADJ[m].includes(tg))||'kannonji';const g=G.idleGens(src)[0]||G.castleGens(src)[0];S.castles[src].troops+=8000;const u=G.launch(k,src,tg,[g.id],8000,8000,'attack');const C=G.C[tg];TKUI.cam(C.x-15,C.y-10,3);return u?u.id+' '+src:'none';})()""")
print(r)
pg.locator('[data-act=speed][data-v="2"]').first.click()
prev=None;rows=[]
for i in range(260):
  pg.wait_for_timeout(60)
  d=pg.evaluate("(()=>{const S=G.S();const u=S.units.find(x=>x.clan===S.player);if(!u)return null;const p=TKUI._UP&&TKUI._UP.get(u.id);return [u.seg,+u.pos.toFixed(3),u.state,p?[Math.round(p[0]),Math.round(p[1])]:null,G.S().t]})()")
  if not d:break
  if d[3] and prev and prev[3]:
    j=((d[3][0]-prev[3][0])**2+(d[3][1]-prev[3][1])**2)**.5
    if j>12:rows.append(('JUMP',round(j),prev,d))
  prev=d
print(len(rows));[print(r) for r in rows[:15]];print(prev)
print(pg.evaluate("(()=>{const S=G.S();return JSON.stringify(S.units.map(u=>[u.id,u.clan,u.state,u.path.map(G.cname),u.seg,u.pos,TKUI._UP.get(u.id)]))})()"))
print(pg.evaluate("(()=>{const S=G.S();const u=S.units.find(x=>x.clan===S.player);const L=u.path.length;return JSON.stringify([G.edgePoint(u.path[L-2],u.path[L-1],.86),G.edgePoint(u.path[L-2],u.path[L-1],.8),G.C[u.path[L-1]].x,G.C[u.path[L-1]].y])})()"))
