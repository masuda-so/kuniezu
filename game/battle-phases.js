"use strict";
(function(){
 TK.RESEARCH_SOURCES.ieyasuJinba={author:'関ケ原観光協会',title:'徳川家康最後陣跡',url:'https://www.sekigahara1600.com/spot/tokugawaieyasujinato.html',locator:'桃配山から陣場野への移陣（午前11時ごろと伝わる）',accessed:'2026-11-01',scope:'移陣前後の所在地。点間の細かな通過路・時刻は別。'};
 TK.BATTLE_MOVEMENTS={'関ヶ原の戦い':[
  {name:'徳川家康',from:30,to:50,points:[[136.49,35.361],[136.46514,35.36582]],source:'ieyasuJinba'},
  {name:'小早川秀秋',from:55,to:75,points:[[136.451,35.345],[136.45057,35.36012]],source:'sekigaharaGuide'},
  {name:'脇坂安治',from:61,to:77,points:[[136.46,35.355],[136.45057,35.36012]],source:'sekigaharaGuide'}
 ]};
 TK.RESEARCH_SOURCES.okeMovement={author:'名古屋市緑区',title:'桶狭間周辺のみどころ・史跡散策路',url:'https://www.city.nagoya.jp/midori/miryoku/1024793/1024801/1024811.html',locator:'中島砦からの進撃・釜ヶ谷・桶狭間',accessed:'2026-11-01',scope:'砦と戦場の順序。中間の通過線と再生時間配分は模式表現。'};
 TK.RESEARCH_SOURCES.okeToyoake={author:'豊明市',title:'広報とよあけ 令和5年6月・桶狭間の戦い',year:'2023',url:'https://www.city.toyoake.lg.jp/koho/toyoake202306/pageindices/index2.html',locator:'特集 桶狭間の戦い',scope:'元康の大高兵糧入れと丸根攻撃。砦間の細かな進路は模式表現。',accessed:'2026-11-01'};
 TK.BATTLE_MOVEMENTS['桶狭間の戦い']=[{name:'織田信長',from:10,to:75,points:[[136.957,35.082],[136.954003,35.076951],[136.967,35.058]],source:'okeMovement'},{name:'松平元康',from:0,to:25,points:[[136.938,35.067],[136.94531,35.064335]],source:'okeToyoake'}];
 // 戦場内の地点遷移を全国街道へ吸着しない。線形は典拠の地点を結ぶ模式表現。
 const lines=new WeakMap();
 G.battlePhaseGeometry=function(move){let line=lines.get(move.points);if(!line){line=move.points.map(p=>G.PJ(...p));lines.set(move.points,line);}return line;};
 G.battlePhasePoint=function(sc,name,t,fallback){const r=TK.BATTLE_MOVEMENTS[sc.title]?.find(r=>r.name===name);if(!r)return fallback;if(t<=r.from)return r.points[0];if(t>=r.to)return r.points.at(-1);const p=G.visualPathPoint(G.battlePhaseGeometry(r),(t-r.from)/(r.to-r.from),true);return [p[0]/TKGEO.K/TKGEO.CX+TKGEO.LON0,TKGEO.LAT0-p[1]/TKGEO.K];};

 G.battleActiveUnits=(sc,t)=>{const b=(sc.beats||[]).filter(b=>b[0]<=t&&b[2]?.length).at(-1);return b?b[2]:[];};
 const build=G.buildBattleCatalog;G.buildBattleCatalog=function(){build();for(const sc of Object.values(TK.BATTLES)){sc.researchBeats=sc.researchBeats||sc.beats.map(b=>b.slice());sc.beats=sc.beats.map(b=>[b[0],(b[1]||'').split('。').filter(s=>s&&!/表示|復元|比較|未確認|未確定|未詳|未考証|未照合|区別|混同|断定|確定|個別|として.*置|参照図/.test(s)).join('。')+(b[1]?'。':''),...b.slice(2)]);sc.calendar=(sc.calendar||[]).map(([t,s])=>[t,/比較|未復元/.test(s)?t>=100?'経過の終わり':'布陣':s]);}
  const s=TK.BATTLES['関ヶ原の戦い'];if(s){for(const u of s.units){const m=TK.BATTLE_MOVEMENTS[s.title]?.find(m=>m.name===(u.g||u.n));if(u.turn&&m)u.turn[0]=m.from;}s.sources=[...new Set([...(s.sources||[]),'ieyasuJinba'])];s.beats=[[0,'東西の軍勢が関ヶ原に布陣する。'],[15,'東軍の先鋒と宇喜多勢が交戦する。',['fukushima','ukita']],[30,'石田・宇喜多・小西・大谷の諸隊が東軍を迎え撃つ。',['kuroda','mitsunari']],[40,'家康は桃配山から陣場野へ本陣を進める。',['ieyasu']],[55,'小早川秀秋が東軍に加担し、大谷勢へ攻めかかる。',['kobayakawa','otani']],[61,'脇坂・朽木・赤座・小川の四将も東軍側へ転じる。',['wakisaka','otani']],[78,'西軍が崩れ、大谷吉継が戦死。三成らは戦場を離れる。'],[88,'島津勢が敵中を突破し、伊勢街道へ退却する。',['shimazu','ii']],[100,'東軍の勝利に終わる。']];}
 };
 // 開戦前の布陣プレビュー。位置の記録がない側（攻め口不詳の攻囲軍など）も、合戦地の代表点の近くに「持場不詳」の一隊として出し、
// 一方の陣営だけが地図に出て始まる見え方を避ける。向きは各軍の本拠から合戦地へ向かう方向（来た方角）で、陣地の測量値ではない。
G.deploymentArmies=function(title){const located=deploymentLocated(title),sc=TK.BATTLES[title];if(!sc)return located;const meta=TK.BATTLE_ATLAS?.[title];const site=meta?G.PJ(meta.geo[0],meta.geo[1]):null;if(!site)return located;
 const out=[...located];for(const side of ['a','b']){if(located.some(a=>a.side===side))continue;const members=sc.units.filter(u=>u.side===side);if(!members.length)continue;
  const clan=sc.sides[side]?.clan&&TK.CLANS[sc.sides[side].clan]?sc.sides[side].clan:members.map(u=>G.genByName(u.g)?.clan).find(Boolean)||'unknown';const home=G.S().clans[clan]?.cap&&G.C[G.S().clans[clan].cap];
  let dx=side==='a'?-1:1,dy=0;if(home){const vx=home.x-site[0],vy=home.y-site[1],l=Math.hypot(vx,vy);if(l>1e-6){dx=vx/l;dy=vy/l;}}
  const here=[site[0]+dx*1.6,site[1]+dy*1.6],angle=Math.atan2(site[1]-here[1],site[0]-here[0]);
  out.push({id:'deployment:'+side+'-unlocated',side,clan,gens:[],commanders:[members[0].g||members[0].n],troops:members.reduce((n,u)=>n+(u.tr||0),0),morale:85,train:70,path:[sc.at,sc.at],origin:sc.at,seg:0,pos:0,state:'camp',mission:'show',hist:true,until:title,battlePoint:here,battleAngle:angle,unlocated:true});}
 return out;};
function deploymentLocated(title){const s=G.S(),sc=TK.BATTLES[title];if(!sc)return [];return sc.units.flatMap(u=>{const group=(sc.atlasGroups||[]).find(g=>g.members.includes(u.id));if(!group?.point)return [];const here=G.PJ(...group.point),opponents=(sc.atlasGroups||[]).filter(g=>g.point&&g.side!==u.side).map(g=>G.PJ(...g.point)).sort((a,b)=>Math.hypot(a[0]-here[0],a[1]-here[1])-Math.hypot(b[0]-here[0],b[1]-here[1])),angle=opponents.length?Math.atan2(opponents[0][1]-here[1],opponents[0][0]-here[0]):null;const g=G.genByName(u.g),clan=g?.clan||u.clan||sc.sides[u.side]?.clan||'unknown',node=g?.loc&&G.C[g.loc]?g.loc:sc.at;return [{id:'deployment:'+u.id,side:u.side,clan,gens:[],commanders:[u.g||u.n],troops:u.tr||0,morale:85,train:70,path:[node,node],origin:node,seg:0,pos:0,state:'camp',mission:'show',hist:true,until:title,battlePoint:here,battleAngle:angle}];});}
})();
