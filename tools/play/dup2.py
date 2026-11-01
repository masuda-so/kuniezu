exec(open('/home/claude/play/lib.py').read())
start('桶狭間前夜');pg.wait_for_timeout(1000)
pg.evaluate("TKUI.open('ffwd',{t:G.evT({d:[1570,1,1]})})");pg.wait_for_timeout(400)
pg.locator('#modal button').filter(has_text='早送').click();pg.wait_for_timeout(4000)
print(pg.evaluate("""(()=>{const S=G.S();const m={};for(const e of S.chron){const k=e.t+'|'+(e.title||'')+'|'+e.text.slice(0,20);m[k]=(m[k]||0)+1;}const d1=Object.entries(m).filter(x=>x[1]>1);
 const tit={};for(const e of S.chron)if(e.title){(tit[e.title]=tit[e.title]||[]).push(e.t);}const d2=Object.entries(tit).filter(x=>x[1].length>1);
 const dom=[...document.querySelectorAll('#chron .ci b')].map(b=>b.textContent);const d3=dom.filter((x,i)=>dom.indexOf(x)!==i);
 const nx=[...document.querySelectorAll('#next .nx')].map(x=>x.textContent);
 return JSON.stringify({d1,d2,d3,nx});})()"""))
