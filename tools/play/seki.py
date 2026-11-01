exec(open('/home/claude/play/lib.py').read())
start('関ヶ原前夜');pg.wait_for_timeout(1500)
def adv(d):
  pg.evaluate("""(d)=>{const S=G.S();const e=G.evT({d});while(S.t<e){G.day();while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}const h=v.opts.findIndex(o=>o.hist);G.chooseEvent(h>=0?h:0);}if(S.battleQ)S.battleQ.length=0;if(S.sceneQ)S.sceneQ.length=0;if(S.propQ)S.propQ.length=0;}}""",d)
  pg.wait_for_timeout(900)
for d,nm,xy in [([1600,8,22],'s_kyo',None),([1600,9,1],'s_fushimi','kyo'),([1600,10,19],'s_seki','gifu'),([1600,10,22],'s_seki2','gifu')]:
  adv(d)
  if xy: pg.evaluate(f"(()=>{{const C=G.C['{xy}'];TKUI.cam(C.x,C.y,2.4)}})()")
  else: pg.evaluate("TKUI.cam(1250,1250,1.3)")
  pg.wait_for_timeout(900);shot(nm)
  print(nm,txt('#eraTxt').replace('\n',' '),'|',txt('#big').replace('\n',' ')[:200])
print(pg.evaluate("JSON.stringify(G.S().vassal)"))
