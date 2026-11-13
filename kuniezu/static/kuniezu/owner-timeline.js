"use strict";
/* 城の持ち主の区間（history/owners.js、史実 DB の支配の記録から書き出す）で、年表の持ち主を直す。
   TK.OWNER_TIMELINE が null（既定）なら何もしない。設計は docs/designs/county-territory.md の技術計画 2。

   当て方（記録の無い所は年表のまま）：
   - 行軍拠点の城：区間の始まりで持ち主が替わる日に、軍勢を出さない受け渡し（admin の take）を足す。
     同じ家に渡す年表の受け渡しが、その日より前（3 年以内、前の記録の後）にあれば、その出来事からこの城を抜く
     （記録より早く渡さない）。同じ日に同じ家へ渡す出来事があれば何もしない。
     記録より後の、同じ家への受け渡しは、城が既にその家のものなので何も起きない。
   - 行軍拠点でない城：G.yOwner を包み、区間の中ならその家を返す（その家が滅んでいれば今の値）。
   - 区間は、年表がその城を別の家に渡す日（その家の吸収を含む）で終わる。記録の無い後の歴史は年表のまま。
   - 新しいゲームの開始日が区間の中なら、初期の持ち主をその家にする（古い保存の読み込みでは変えない）。
   置き換え前の年表は TK.HIST_BEFORE_OWNER_TIMELINE に残す（古い保存の署名の照合に使う）。 */
(function(){
 const data=TK.OWNER_TIMELINE;if(!data)return;
 const SEARCH_DAYS=3*365;
 // 通日（ユリウス通日、絶対）。ゲームの S.t は開始月からの日数なので、比べるときに直す。
 const jd=d=>TKCalendar.toJD(...d);
 const now=S=>S&&S.clockVersion===TKCalendar.version?S.t+TKCalendar.toJD(S.y0,S.m0,1):null;
 // 出来事がこの城を、どの家に渡すか（take・newclan と、入れ子の take を見る）。
 const transfers=(e,id)=>{const out=[];if((e.k==='take'||e.k==='newclan')&&(e.castles||[]).includes(id))out.push(e.clan);if(e.take&&(e.take.castles||[]).includes(id))out.push(e.take.clan);return out;};
 // 年表で、day より後にこの城が clan の手を離れる最初の日（別の家への受け渡し、clan の吸収・全城の明け渡し）。無ければ Infinity。
 const nextOther=(id,day,clan)=>{for(const e of TK.HIST){const t=jd(e.d);if(t<=day)continue;if(transfers(e,id).some(k=>k&&k!==clan))return t;if((e.k==='absorb'||e.k==='takeall')&&e.b===clan&&e.clan!==clan)return t;}return Infinity;};
 const spans=new Map();
 let installed=false;
 function install(){
  if(installed)return;installed=true;
  TK.HIST_BEFORE_OWNER_TIMELINE=TK.HIST.slice();
  // 行軍拠点でない城：区間の中ならその家。後から読むモジュールの城ごとの補正（historical-register.js など）より
  // 先に効くよう、読み込みの時でなく、ここ（ゲームの状態を作る直前）で包む。区間が無ければ今までの値。
  const yOwner=G.yOwner;
  G.yOwner=y=>{const S=G.S(),t=spans.size?now(S):null,s=t==null?null:at(y.id,t);return s&&S.clans[s.clan]?.alive?s.clan:yOwner(y);};
  const added=[];
  for(const [id,rows] of Object.entries(data.castles||{})){
   const node=!!G.C[id],yosho=!node&&G.YOSHO.find(y=>y.id===id);if(!node&&!yosho)continue;
   let prev=null,prevDay=-Infinity;
   for(const row of rows){
    const day=jd(row.from);
    // 前の記録と同じ家でも、その間に年表が城を別の家へ渡していれば、この記録で戻す。
    if(node&&TK.CLANS[row.clan]&&(row.clan!==prev||nextOther(id,prevDay,prev)<day)){
     const same=TK.HIST.some(e=>jd(e.d)===day&&transfers(e,id).includes(row.clan));
     {
      // 記録より早く同じ家に渡す年表の出来事から、この城を抜く。
      //（出来事そのものの take と、入れ子の take の両方を見る。）
      // 範囲は、前の記録の後、3 年以内、かつ年表がこの城を別の家へ渡した最後の日の後。その中の受け渡しは全部抜く。
      //（同じ日の出来事もあるので、日付でなく年表の並び順で切る。）
      const from=Math.max(prevDay,day-SEARCH_DAYS),inWindow=e=>{const t=jd(e.d);return t>from&&t<day;};
      let last=-1;TK.HIST.forEach((e,i)=>{if(inWindow(e)&&transfers(e,id).some(k=>k&&k!==row.clan))last=i;});
      for(let i=last+1;i<TK.HIST.length;i++){const e=TK.HIST[i];if(!inWindow(e)||!transfers(e,id).includes(row.clan))continue;
       const out=c=>c!==id,next={...e,ownerTimelineMoved:id};
       if(e.k==='take'&&e.clan===row.clan&&(e.castles||[]).includes(id))next.castles=e.castles.filter(out);
       if(e.take&&e.take.clan===row.clan&&(e.take.castles||[]).includes(id))next.take={...e.take,castles:e.take.castles.filter(out)};
       TK.HIST[i]=next;}
      // 同じ日に同じ家へ渡す年表の出来事があれば、受け渡しは足さない（早い受け渡しを抜くだけ）。
      if(!same)added.push({d:row.from.slice(),k:'take',clan:row.clan,castles:[id],admin:true,ownerTimeline:row.sources.slice(),text:`${G.C[id].n1}が${G.CNK(row.clan)}の城になる。`});
     }
    }
    prev=row.clan;prevDay=day;
   }
  }
  // 足した受け渡しを、同じ日の出来事の後に入れる。
  for(const e of added){const t=jd(e.d);let i=TK.HIST.findIndex(x=>jd(x.d)>t);if(i<0)i=TK.HIST.length;TK.HIST.splice(i,0,e);}
  // 区間の効く期間（後ろの記録が無い区間は、年表が別の家へ渡す日まで）。
  for(const [id,rows] of Object.entries(data.castles||{})){
   const yosho=!G.C[id]&&G.YOSHO.find(y=>y.id===id),base=G.C[id]?id:yosho?.at;if(!base)continue;
   // 記録の区間は、年表がその城を別の家に渡す日で切る（記録の無い後の歴史は年表のまま）。
   spans.set(id,rows.map(row=>{const start=jd(row.from);return {start,end:Math.min(row.to?jd(row.to):Infinity,nextOther(base,start,row.clan)),clan:row.clan,status:row.status};}));
  }
 }
 const at=(id,t)=>(spans.get(id)||[]).find(s=>s.start<=t&&t<s.end)||null;
 G.ownerInterval=(id,t=now(G.S()))=>{install();return t==null?null:at(id,t);};
 const newGame=G.newGame;
 G.newGame=function(...args){install();const r=newGame.apply(this,args);const S=G.S();if(!S)return r;
  // 元の家の本拠・在城の武将も、通常の受け渡しと同じ手順（G.adminTransfer）で動かす。
  let changed=false;
  for(const id of Object.keys(data.castles||{})){if(!S.castles[id])continue;const t=now(S),s=t==null?null:at(id,t);if(s&&S.clans[s.clan]?.alive&&S.castles[id].owner!==s.clan){G.adminTransfer(id,s.clan);changed=true;}}
  if(changed){G.syncCastles?.();S.hsig=G.histSig();}
  return r;};
 // 置き換え前の年表の署名を持つ保存（この書き出しを読む前に作った保存）は、読み込む前に、年表の位置
 // （S.hi・S.pm）を置き換え後の年表で引き直し、署名を付け替える（engine.js の G.fixHist と同じ手順）。
 // こうすると、保存の署名が今の年表と一致することを求める古い保存の移行（城の位置など）がそのまま動く。
 const sigOf=list=>{let h=list.length;for(const e of list){const t=(e.title||e.k)+e.d.join('');for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;}return h;};
 const evTOf=(s,e)=>s.clockVersion===TKCalendar.version?jd(e.d)-TKCalendar.toJD(s.y0,s.m0,1):(e.d[0]-s.y0)*360+(e.d[1]-s.m0)*30+(e.d[2]-1);
 function adopt(s){
  if(!s||typeof s!=='object'||s.hsig===G.histSig()||s.hsig!==sigOf(TK.HIST_BEFORE_OWNER_TIMELINE))return;
  let i=0;while(i<TK.HIST.length&&evTOf(s,TK.HIST[i])<=s.t)i++;s.hi=i;
  const keep={};for(const u of s.units||[])if(u.until)keep[u.until]=1;s.pm={};for(let j=i;j<TK.HIST.length;j++){const e=TK.HIST[j],k=e.title||e._pk;if(k&&keep[k])s.pm[j]=1;}
  s.hsig=G.histSig();
 }
 const setS=G.setS;
 G.setS=function(s,...rest){install();adopt(s);return setS.call(this,s,...rest);};
})();
