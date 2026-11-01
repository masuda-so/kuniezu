exec(open('/home/claude/play/lib.py').read())
start();pg.wait_for_timeout(1500)
import json
def dups(tag):
  r=pg.evaluate("""JSON.stringify((()=>{const m={};for(const e of G.S().chron){const k=e.t+'|'+(e.title||'')+'|'+e.text;m[k]=(m[k]||0)+1;}return Object.entries(m).filter(x=>x[1]>1).map(x=>x[0].slice(0,80)+' x'+x[1]);})())""")
  r2=pg.evaluate("""JSON.stringify((()=>{const m={};for(const e of G.S().chron){const k=(e.title||e.text).slice(0,30);(m[k]=m[k]||[]).push(e.t);}return Object.entries(m).filter(x=>x[1].length>1&&x[0].length>3).slice(0,30);})())""")
  print(tag,len(pg.evaluate("G.S().chron.length+''")),r[:1500]);print('  sametitle:',r2[:2500])
# open ffwd via modal then confirm
pg.evaluate("TKUI.open('ffwd',{t:G.evT({d:[1573,1,1]})})");pg.wait_for_timeout(500)
print(modal()[:300])
btns=pg.locator('#modal .act, #modal button.btn');print([btns.nth(i).inner_text()[:20] for i in range(btns.count())])
btns.nth(1).click();pg.wait_for_timeout(4000)
print(txt('#eraTxt'))
dups('after1')
print(pg.evaluate("JSON.stringify(G.S().chron.slice(0,40).map(e=>G.dstr(e.t)+' '+(e.title||'')+' '+e.text.slice(0,30)))"))
