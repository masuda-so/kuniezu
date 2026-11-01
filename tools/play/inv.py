exec((PLAY_DIR / 'lib.py').read_text())
import json
r=pg.evaluate("""(()=>{const out=[];
 const check=(tag)=>{const S=G.S();const P=[];
  for(const id in S.castles){const c=S.castles[id];if(!S.clans[c.owner]||!S.clans[c.owner].alive)P.push('城の主が滅んだ家:'+G.cname(id)+'/'+c.owner);if(!(c.troops>=0))P.push('兵がおかしい:'+id);}
  for(const k of G.alive()){if(!G.clanCastles(k).length)P.push('城のない家:'+k);const L=G.gen(S.clans[k].leader);if(!L||L.dead)P.push('当主不在:'+k);else if(L.clan!==k)P.push('当主が他家:'+k+'/'+L.n+'/'+L.clan);
   if(!S.castles[S.clans[k].cap]||S.castles[S.clans[k].cap].owner!==k)P.push('本拠が他家:'+k+'/'+S.clans[k].cap);}
  const names={};for(const g of S.gens){if(g.dead)continue;if(names[g.n])P.push('同名の武将が二人:'+g.n);names[g.n]=1;if(g.clan&&!(S.clans[g.clan]&&S.clans[g.clan].alive)&&!g.ronin)P.push('滅んだ家の武将:'+g.n+'/'+g.clan);
   if(g.clan&&g.loc&&S.castles[g.loc]&&S.castles[g.loc].owner!==g.clan&&g.unit==null&&!g.tr&&g.prisoner==null)P.push('他家の城にいる:'+g.n+'@'+G.cname(g.loc));}
  out.push([tag,P.slice(0,40),P.length]);};
 for(const sid of Object.keys(TK.SCEN)){G.newGame(sid,'oda');check(sid+' 開始');const S=G.S();S.player='__none';
  for(let i=0;i<720;i++){G.day();S.evQ=[];if(S.battleQ)S.battleQ.length=0;S.sceneQ=[];S.propQ=[];}check(sid+' 2年後');}
 return JSON.stringify(out);})()""")
for tag,P,n in json.loads(r):
  print(tag,n); [print('   ',x) for x in P]
