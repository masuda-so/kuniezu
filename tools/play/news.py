exec(open('/home/claude/play/lib.py').read())
start('長篠前夜');pg.wait_for_timeout(1000)
pg.get_by_role('button',name='×8').click()
for i in range(12):
  pg.wait_for_timeout(700)
  if modal():
    bb=pg.locator('#modal .act, #modal button.btn');labels=[bb.nth(k).inner_text() for k in range(bb.count())]
    pref=[k for k,l in enumerate(labels) if any(w in l for w in ['史実','地図へ戻る','合戦を始める','閉じる','続ける'])]
    try:bb.nth(pref[0] if pref else 0).click()
    except Exception as e:pass
  if pg.evaluate("document.querySelectorAll('#news .nw').length"):
    shot('news1');print(pg.evaluate("[...document.querySelectorAll('#news .nw')].map(x=>x.innerText).join(' | ')"));break
print(pg.evaluate("(()=>{const S=G.S();const me=S.player;return me+' passOK test '+JSON.stringify(G.alive().filter(k=>G.allied(me,k)))})()"))
