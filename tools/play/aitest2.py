exec(open('/home/claude/play/lib.py').read())
pg.evaluate("""localStorage.setItem('tk_ai','1');window.claude={use:async n=>n==='sample'?Object.assign(async()=>({text:''}),{json:async(p)=>{window.__P=(window.__P||[]);window.__P.push(p.slice(0,80));
 if(p.includes('もう史実どおりには起こらない'))return {cancel:['清洲同盟','三河一向一揆','存在しない題'],why:'今川と和を結んだため、松平の自立が遅れる。'};
 if(p.includes('分かれ道」を一つ作って'))return {title:'尾張の国人の動揺',who:'柴田勝家',text:'今川との和睦に不満を持つ国人がいる。',opts:[{t:'国人を説き伏せる',d:'民忠が上がる',story:'信長は国人を説き伏せた。',effects:[{type:'loyal',castle:'kiyosu',delta:10}]},{t:'見せしめに討つ',d:'兵が減る',story:'信長は国人を討った。',effects:[{type:'troops',castle:'kiyosu',delta:-500}]}]};
 return {options:[]};}}):null}""")
start('桶狭間前夜')
r=pg.evaluate("""(async()=>{const S=G.S();S.evQ=[{fork:'okehazama_o'}];const v=G.eventView();const i=v.opts.findIndex(o=>!o.hist);G.chooseEvent(i);await new Promise(r=>setTimeout(r,300));
 const arcs=(S.arcs||[]).map(a=>a.id+':'+(a.titles||[]).join('/'));S.lastAiFork=-9999;G.onMonth();await new Promise(r=>setTimeout(r,300));
 return JSON.stringify({arcs,ev:S.evQ.map(q=>q.dyn||q.fork),chron:S.chron.slice(0,2).map(e=>e.title+':'+e.text.slice(0,60)),P:window.__P});})()""")
print(r)
pg.evaluate("TKUI.open('event')");pg.wait_for_timeout(500);print(modal()[:300]);shot('aifork')
