exec(open('/home/claude/play/lib.py').read())
start()
pg.mouse.click(385,817);pg.wait_for_timeout(600)
pg.locator('#modal button').filter(has_text='早送').click();pg.wait_for_timeout(1200)
print(txt('#eraTxt').replace('\n',' '))
r=pg.evaluate("""(()=>{const S=G.S();const k=S.player;const al=Object.keys(S.ally).filter(x=>x.includes('oda')&&S.ally[x]>0);
 for(const key of al){delete S.ally[key];}
 G.addRel('oda','tokugawa',60);S.evQ=[{inc:'konin'}];const v=G.eventView();return JSON.stringify({rel:G.rel('oda','tokugawa'),v:v&&{title:v.title,opts:v.opts.map(o=>[o.t,o.d,!!o.hist])}});})()""")
print(r)
r=pg.evaluate("(()=>{G.chooseEvent(0);const S=G.S();return JSON.stringify({ally:S.ally['oda|tokugawa'],div:S.div})})()")
print(r)
