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
 // 出来事がこの城を、どの家に渡すか（入れ子の take も見る）。
 const transfers=(e,id)=>{const out=[];if(e.k==='take'&&(e.castles||[]).includes(id))out.push(e.clan);if(e.take&&(e.take.castles||[]).includes(id))out.push(e.take.clan);return out;};
 // 年表で、day より後にこの城が clan の手を離れる最初の日（別の家への受け渡し、clan の吸収・全城の明け渡し）。無ければ Infinity。
 const nextOther=(id,day,clan)=>{for(const e of TK.HIST){const t=jd(e.d);if(t<=day)continue;if(transfers(e,id).some(k=>k&&k!==clan))return t;if((e.k==='absorb'||e.k==='takeall')&&e.b===clan&&e.clan!==clan)return t;}return Infinity;};
 const spans=new Map();
 let installed=false;
 function install(){
  if(installed)return;installed=true;
  TK.HIST_BEFORE_OWNER_TIMELINE=TK.HIST.slice();
  const added=[];
  for(const [id,rows] of Object.entries(data.castles||{})){
   const node=!!G.C[id],yosho=!node&&G.YOSHO.find(y=>y.id===id);if(!node&&!yosho)continue;
   let prev=null,prevDay=-Infinity;
   for(const row of rows){
    const day=jd(row.from);
    if(node&&row.clan!==prev&&TK.CLANS[row.clan]){
     const same=TK.HIST.some(e=>jd(e.d)===day&&transfers(e,id).includes(row.clan));
     if(!same){
      // 記録より早く同じ家に渡す年表の出来事から、この城を抜く。
      let hit=-1;for(let i=0;i<TK.HIST.length;i++){const e=TK.HIST[i],t=jd(e.d);if(t>=day||t<=prevDay||t<day-SEARCH_DAYS)continue;if(e.k==='take'&&e.clan===row.clan&&(e.castles||[]).includes(id))hit=i;}
      if(hit>=0){const e=TK.HIST[hit];TK.HIST[hit]={...e,castles:e.castles.filter(c=>c!==id),ownerTimelineMoved:id};}
      added.push({d:row.from.slice(),k:'take',clan:row.clan,castles:[id],admin:true,ownerTimeline:row.sources.slice(),text:`${G.C[id].n1}が${G.CNK(row.clan)}の城になる。`});
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
 const yOwner=G.yOwner;
 G.yOwner=y=>{const S=G.S(),t=spans.size?now(S):null,s=t==null?null:at(y.id,t);return s&&S.clans[s.clan]?.alive?s.clan:yOwner(y);};
 const newGame=G.newGame;
 G.newGame=function(...args){install();const r=newGame.apply(this,args);const S=G.S();if(!S)return r;
  let changed=false;
  for(const id of Object.keys(data.castles||{})){if(!S.castles[id])continue;const t=now(S),s=t==null?null:at(id,t);if(s&&S.clans[s.clan]?.alive&&S.castles[id].owner!==s.clan){S.castles[id].owner=s.clan;changed=true;}}
  if(changed){G.syncCastles?.();S.hsig=G.histSig();}
  return r;};
 const setS=G.setS;
 G.setS=function(...args){install();return setS.apply(this,args);};
})();
