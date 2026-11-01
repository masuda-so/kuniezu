import json
CASES=[('s1600','tokugawa','oyama_t',1,['関ヶ原の戦い','岐阜城の戦い']),('s1600','mori','mori_s',2,['毛利の減封']),('s1600','uesugi','aizu_u',1,['長谷堂城の戦い']),
 ('s1592','hashiba','karairi_h',1,['文禄の役','漢城陥落','平壌入城']),('s1585','hashiba','komaki_h',1,['小牧・長久手の戦い']),('s1582','hashiba','kiyosu_h',2,['清洲会議','賤ヶ岳の戦い']),('s1582','hashiba','shizu_h',2,['賤ヶ岳の戦い'])]
for sc,clan,fid,opt,bad in CASES:
  r=pg.evaluate("""(([sc,clan,fid,opt,bad])=>{G.newGame(sc,clan);let hit=0,log=[];const S0=()=>G.S();for(let d=0;d<1000;d++){G.day();const S=S0();
    while(S.evQ&&S.evQ.length){const v=G.eventView();if(!v){S.evQ.shift();continue;}let i;if(v.id===fid){i=opt;hit=1;log.push('chose '+v.opts[opt].t);}else{const h=v.opts.findIndex(o=>o.hist);i=h>=0?h:0;}G.chooseEvent(i);}
    if(S.battleQ)S.battleQ.length=0;if(S.sceneQ)S.sceneQ.length=0;if(S.propQ)S.propQ.length=0;if(S.over)break;}
   const S=S0();const found=S.chron.filter(e=>e.ok&&bad.includes(e.title)).map(e=>e.title);return JSON.stringify({hit,log,found,date:G.dstr(),arcs:(S.arcs||[]).map(a=>a.id)});})""",[sc,clan,fid,opt,bad])
  print(sc,clan,fid,r)
