"use strict";
/* ===== AIの分かれ道（試し） =====
   用意した選択肢のほかに、AI（Claude）にその場の情勢と史料集をもとに別の道を考えてもらう。
   AIが決められるのは、下の「効き目」の中からだけ（数の大きさも上限で抑える）。既定は「使わない」。 */
(function(){
 const A=window.TKUI.api;const {MODALS,ACT,esc}=A;const toast=A.toast,renderModal=A.renderModal,closeModal=A.closeModal,renderAll=A.renderAll,U=window.TKUI;
 let SAMPLE=null,checked=false;
 const getSample=async()=>{if(checked)return SAMPLE;checked=true;try{SAMPLE=window.claude&&window.claude.use?await window.claude.use('sample'):null;}catch(_){SAMPLE=null;}return SAMPLE;};
 const aiOn=()=>{try{return localStorage.getItem('tk_ai')==='1';}catch(_){return false;}};
 const setAi=v=>{try{localStorage.setItem('tk_ai',v?'1':'0');}catch(_){}};
 G.aiOn=aiOn;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const alive=k=>{const S=G.S();return k&&S.clans[k]&&S.clans[k].alive;};

 function context(v){const S=G.S();const k=S.player;const ks=G.alive();
  const near=ks.map(j=>({id:j,name:G.CNK(j),castles:G.clanCastles(j).length,troops:G.clanTroops(j),rel:j===k?null:G.rel(k,j),ally:j!==k&&G.allied(k,j),war:j!==k&&G.atWar(k,j),lord:S.vassal&&S.vassal[j]||null})).sort((a,b)=>b.troops-a.troops).slice(0,18);
  const next=G.nextEvents(10).map(e=>({date:e.d.join('-'),title:e.title,text:(e.text||'').slice(0,80)}));
  const q=[v.title,v.text,v.who,...v.opts.map(o=>o.t+o.d)].join(' ');
  const kb=TK.kbFind?TK.kbFind(q,6).map(x=>({kind:x.kind,title:x.title,text:x.text.slice(0,400),src:x.src})):[];
  const my=G.clanCastles(k).slice(0,20).map(id=>({id,name:G.cname(id),troops:S.castles[id].troops}));
  return {date:G.dstr(),player:{id:k,name:G.CNK(k),castles:my},fork:{title:v.title,text:v.text,options:v.opts.map(o=>({t:o.t,d:o.d||'',hist:!!o.hist}))},clans:near,upcoming:next,sources:kb};}

 const SPEC=`効き目（effects）は次の形だけを使う。clan と castle は与えた id だけ。
{"type":"rel","a":家id,"b":家id,"delta":-40〜40}  友好度を変える
{"type":"ally","a":家id,"b":家id}  同盟を結ぶ
{"type":"war","a":家id,"b":家id}  手切れ（戦になる）
{"type":"gold","clan":家id,"delta":-3000〜3000}  金
{"type":"troops","castle":城id,"delta":-15000〜15000}  城の兵
{"type":"loyal","castle":城id,"delta":-30〜30}  民忠
{"type":"cancel","titles":[これから先の史実の題を最大10]}  この道を選ぶと起こらなくなる史実`;

 G.aiFork=async function(v,signal){const sample=await getSample();if(!sample)throw {code:'unavailable'};
  const ctx=context(v);
  const prompt=`あなたは戦国時代（1560〜1615年）の日本を舞台にした歴史シミュレーションゲームの語り手です。
プレイヤーは「${ctx.player.name}」。いま「${ctx.fork.title}」という分かれ道にいます。用意された選択肢のほかに、この時代にありえた別の道を2つか3つ考えてください。
条件：
- 史料集（sources）と情勢（clans, upcoming）にある人物・家・城だけを使い、実在しない人物を作らない。
- 史実で確かめられないことは「〜という道」「〜を試みる」と、ゲームの中の仮の筋として書く。
- 用意された選択肢と同じものは出さない。
- t は30字以内の選択肢、d は60字以内で結果の見通し、story は80字以内でその道を選んだ時に年表に残る一文。
- ${SPEC}
- 効き目は1つの道につき1〜4個。大きすぎる変化は避ける。
JSONだけを返す：{"options":[{"t":"…","d":"…","story":"…","effects":[…]}]}

情勢（JSON）：
${JSON.stringify(ctx)}`;
  const r=await sample.json(prompt,{signal,modelTier:'default',cache:false});
  const L=(r&&Array.isArray(r.options)?r.options:[]).slice(0,3).map(o=>({t:String(o.t||'').slice(0,40),d:String(o.d||'').slice(0,90),story:String(o.story||'').slice(0,120),effects:Array.isArray(o.effects)?o.effects.slice(0,5):[]})).filter(o=>o.t);
  return L;};

 // 効き目を確かめてから当てる（与えた範囲の外のものは捨てる）
 function apply(v,o){const S=G.S();const done=[];
  const future=new Set(TK.HIST.filter(e=>e.title&&G.evT(e)>S.t&&G.evT(e)<S.t+15*360).map(e=>e.title));
  for(const f of o.effects){try{switch(f.type){
   case 'rel':if(alive(f.a)&&alive(f.b)&&f.a!==f.b){G.addRel(f.a,f.b,clamp(+f.delta||0,-40,40));done.push('rel');}break;
   case 'ally':if(alive(f.a)&&alive(f.b)&&f.a!==f.b){S.ally[G.ekey(f.a,f.b)]=S.t+720;S.rel[G.ekey(f.a,f.b)]=Math.max(S.rel[G.ekey(f.a,f.b)]??45,70);if(S.war)delete S.war[G.ekey(f.a,f.b)];done.push('ally');}break;
   case 'war':if(alive(f.a)&&alive(f.b)&&f.a!==f.b){delete S.ally[G.ekey(f.a,f.b)];S.war=S.war||{};S.war[G.ekey(f.a,f.b)]=S.t;S.rel[G.ekey(f.a,f.b)]=Math.min(S.rel[G.ekey(f.a,f.b)]??45,10);done.push('war');}break;
   case 'gold':if(alive(f.clan)){S.clans[f.clan].gold=Math.max(0,S.clans[f.clan].gold+clamp(+f.delta||0,-3000,3000));done.push('gold');}break;
   case 'troops':if(S.castles[f.castle]){const c=S.castles[f.castle];c.troops=Math.max(100,c.troops+clamp(+f.delta||0,-15000,15000));done.push('troops');}break;
   case 'loyal':if(S.castles[f.castle]){const c=S.castles[f.castle];c.loyal=clamp(c.loyal+clamp(+f.delta||0,-30,30),0,100);done.push('loyal');}break;
   case 'cancel':{const ts=(f.titles||[]).filter(t=>future.has(t)).slice(0,10);if(ts.length){G.arcOff(v.id+':ai',{titles:ts,years:15});done.push('cancel');}break;}
  }}catch(_){}}
  return done;}

 G.aiPick=function(o){const S=G.S();const v=G.eventView();if(!v)return '';
  apply(v,o);
  // 史実を選ばなかったので、用意した分かれ道の「外れる流れ」も当てる
  if(v.kind==='fork'&&v.opts.some(x=>x.hist)){const A=TK.ARCS[v.id];let def=A&&(A.by?(Object.values(A.by)[0]):A);if(def)G.arcOff(v.id,def);S.evChose=S.evChose||{};S.evChose[v.id]=-1;}
  S.evQ.shift();
  const e={t:S.t,s:G.dstr(),title:v.title,text:o.t+'。'+(o.story||''),who:v.who,ok:true,alt:true,ai:true};S.chron.unshift(e);G.onChron&&G.onChron(e);
  S.hNg=(S.hNg||0)+1;
  if(S.div&&!S.div[S.player]){S.div[S.player]=1;G.onDiverge&&G.onDiverge();}
  return o.t;};


 /* --- 分かれた後の歴史を、AIが組み立てる ---
   1) 用意した分かれ道で史実と違う道を選んだら、この先の史実のうち「もう起こらない」ものをAIに選ばせる
   2) 歴史が分かれた家には、およそ一年ごとにAIが新しい分かれ道を作る（史料集と情勢をもとに） */
 const upcoming=(years)=>{const S=G.S();const t1=S.t+years*360;return TK.HIST.filter(e=>e.title&&!e.alt&&G.evT(e)>S.t&&G.evT(e)<t1&&!(S.cancel&&S.cancel[e.title])&&!G.arcBlocked(e)).slice(0,70).map(e=>({title:e.title,date:e.d.join('-'),text:(e.text||'').slice(0,70)}));};
 G.onAltChoice=async function(v,o){if(!aiOn())return;const sample=await getSample();if(!sample)return;const S=G.S();
  const list=upcoming(15);if(!list.length)return;
  const prompt=`戦国時代の歴史シミュレーションゲームで、プレイヤー（${G.CNK(S.player)}）が分かれ道「${v.title}」で史実と違う道「${o.t}」を選んだ。
この先の史実の一覧（upcoming）から、この選択の結果「もう史実どおりには起こらない」出来事を選べ。選択と因果のつながりがあるものだけを選び、関係のない地方の出来事は残す。
史料集（sources）を参考にせよ。JSONだけを返す：{"cancel":["題",...],"why":"60字以内で理由"}
情勢：${JSON.stringify({fork:{title:v.title,text:v.text,chosen:o.t,hist:(v.opts.find(x=>x.hist)||{}).t},upcoming:list,sources:TK.kbFind?TK.kbFind(v.title+' '+v.text,5).map(x=>({title:x.title,text:x.text.slice(0,300)})):[]})}`;
  try{const r=await sample.json(prompt,{modelTier:'default',cache:false});const names=new Set(list.map(x=>x.title));const ts=(r&&Array.isArray(r.cancel)?r.cancel:[]).filter(t=>names.has(t)).slice(0,25);
   if(ts.length){G.arcOff(v.id+':aiarc',{titles:ts,years:15});toast(`AIの読み：この道では、${ts.slice(0,3).join('・')}${ts.length>3?' など'+ts.length+'件':''}は起こらない`,'good');
    S.chron.unshift({t:S.t,s:G.dstr(),title:'歴史の分かれ目',text:(r.why?String(r.why).slice(0,90)+'　':'')+'起こらなくなった史実：'+ts.join('、'),ok:true,alt:true,ai:true});G.onChron&&G.onChron(S.chron[0]);}}catch(_){}};
 // AIが作る分かれ道
 G.DYN.ai=q=>({title:q.title,who:q.who,text:q.text,opts:q.opts.map(o=>({t:o.t,d:o.d,f(e){const v={id:'ai'+q.n};apply(v,o);return o.story||o.t;}}))});
 let genBusy=false;
 const baseMonth=G.onMonth;
 G.onMonth=function(){baseMonth&&baseMonth();const S=G.S();if(!aiOn()||genBusy||U.ffwd||!S||G.retainer())return;const k=S.player;if(!S.clans[k]||!S.clans[k].alive||!S.div[k])return;
  if(S.t-(S.lastAiFork||-9999)<360)return;S.lastAiFork=S.t;genBusy=true;
  (async()=>{try{const sample=await getSample();if(!sample)return;
   const fake={title:'情勢の分かれ道',text:'',who:'',opts:[]};const ctx=context(fake);
   const prompt=`あなたは戦国時代（1560〜1615年）の歴史シミュレーションゲームの語り手です。プレイヤーの家「${ctx.player.name}」は史実の筋書きを離れて動いている（いまは${ctx.date}）。
いまの情勢（clans）と、この先に予定されている史実（upcoming）、史料集（sources）をもとに、この家の当主が直面する「分かれ道」を一つ作ってください。
条件：実在の人物・家・城だけを使う。史料にない出来事は「〜という噂」「〜を試みる」のように仮の筋として書く。題は15字以内、本文は120字以内。選択肢は3つ、それぞれ t（30字以内）・d（60字以内）・story（80字以内、年表に残る一文）・effects（1〜4個）。
${SPEC}
JSONだけを返す：{"title":"…","who":"関わる人物名","text":"…","opts":[{"t":"…","d":"…","story":"…","effects":[…]}]}
情勢（JSON）：${JSON.stringify(Object.assign(ctx,{upcoming:upcoming(5).slice(0,15),sources:TK.kbFind?TK.kbFind(ctx.clans.slice(0,4).map(c=>c.name).join(' '),5).map(x=>({title:x.title,text:x.text.slice(0,250)})):[]}))}`;
   const r=await sample.json(prompt,{modelTier:'default',cache:false});
   if(!r||!r.title||!Array.isArray(r.opts)||r.opts.length<2)return;
   const q={dyn:'ai',n:Math.random(),title:String(r.title).slice(0,24),who:String(r.who||'').slice(0,12),text:String(r.text||'').slice(0,200),
    opts:r.opts.slice(0,3).map(o=>({t:String(o.t||'').slice(0,40),d:String(o.d||'').slice(0,90)+' （AIの作った道）',story:String(o.story||'').slice(0,120),effects:Array.isArray(o.effects)?o.effects.slice(0,5):[]})).filter(o=>o.t)};
   if(q.opts.length<2)return;const S2=G.S();if(S2!==S)return;S.evQ=S.evQ||[];S.evQ.push(q);
  }catch(_){}finally{genBusy=false;}})();};
 /* --- 画面 --- */
 const box=()=>document.getElementById('aibox');
 let AIO=null,busy=false,ctl=null,forFork=null;
 const draw=()=>{const el=box();if(!el)return;
  if(busy){el.innerHTML='<p class="hint aiwait">AIが情勢と史料集を読み、別の道を考えています…</p><button class="mini" data-act="aistop">やめる</button>';return;}
  if(AIO&&AIO.err){el.innerHTML=`<p class="hint">${AIO.err}</p>`;return;}
  if(AIO&&AIO.length){el.innerHTML='<small class="eyebrow">AIの案（創作。史料集をもとにした仮の筋）</small>'+AIO.map((o,i)=>`<button class="act" data-act="aipick" data-i="${i}"><b>${esc(o.t)} <em class="tg ai">AIの案</em></b><small>${esc(o.d)}</small></button>`).join('');return;}
  el.innerHTML='<button class="mini" data-act="aifork">AIにほかの道を考えてもらう</button>';};
 const baseEv=MODALS.event;
 MODALS.event=function(){const h=baseEv.apply(this,arguments);const v=G.eventView();if(!h||!v||v.kind!=='fork'||!aiOn())return h;
  if(forFork!==v.id+':'+G.S().t){forFork=v.id+':'+G.S().t;AIO=null;busy=false;}
  setTimeout(draw,0);return h+'<div id="aibox" class="aibox"></div>';};
 Object.assign(ACT,{
  aifork:async()=>{const v=G.eventView();if(!v||busy)return;busy=true;AIO=null;draw();ctl=new AbortController();
   try{const L=await G.aiFork(v,ctl.signal);AIO=L.length?L:{err:'案がまとまらなかった。用意された道から選んでください。'};}
   catch(e){AIO={err:e&&e.code==='not_granted'?'AIの利用が許可されていない。':e&&e.code==='rate_limited'?'いまはAIが混み合っている。少し待ってから。':e&&e.code==='unavailable'?'この画面ではAIを使えない。':'AIの案を得られなかった。'};}
   busy=false;draw();},
  aistop:()=>{if(ctl)ctl.abort();busy=false;AIO=null;draw();},
  aipick:b=>{const o=AIO&&AIO[+b.dataset.i];if(!o)return;const m=G.aiPick(o);AIO=null;closeModal();if(m)toast('AIの道：'+m,'good');renderAll();U.baseDirty=true;},
  aitoggle:async()=>{const on=!aiOn();if(on){const s=await getSample();if(!s){toast('この画面ではAIを使えない','bad');return;}}setAi(on);renderModal();}
 });
 // メニューに切り替えと史料集を足す
 const baseMenu=MODALS.menu;
 MODALS.menu=function(){let h=baseMenu.apply(this,arguments);const t=`<div class="tgl"><span><b>AIの分かれ道（試し）</b><small>分かれ道でAIが別の道を考え、史実と違う道を選ぶとAIが「もう起こらない史実」を選び、歴史が分かれた後はおよそ一年ごとにAIが新しい分かれ道を作る。いずれも創作。有効にすると人物・領国・選択肢などのゲーム内情勢を外部AI機能へ送ります。</small></span><button class="mini ${aiOn()?'on':''}" data-act="aitoggle">${aiOn()?'使う':'使わない'}</button></div>`;
  h=h.replace('<h3>保存</h3>',t+'<h3>史料集</h3><p class="hint">人物・城・出来事の記録と、研究の分かれる所の考証メモ。</p><button class="btn" data-act="open" data-m="kb">史料集を開く</button><h3>保存</h3>');return h;};
 // 史料集
 let KQ='',KK='考証';
 MODALS.kb=function(){const all=TK.kb();const kinds=['考証','出来事','人物','城','施設'];
  let L=KQ?TK.kbFind(KQ,40):all.filter(x=>x.kind===KK);if(!KQ&&KK==='出来事')L=L.slice().sort((a,b)=>(a.date?a.date[0]*400+a.date[1]*32+a.date[2]:0)-(b.date?b.date[0]*400+b.date[1]*32+b.date[2]:0));
  return `<header><h2>史料集</h2><button class="ic" data-act="close" aria-label="閉じる">×</button></header>
  <div class="kbbar"><input id="kbq" type="search" placeholder="人名・城・出来事で探す" value="${esc(KQ)}"><div class="kbk">${kinds.map(k=>`<button class="mini ${!KQ&&KK===k?'on':''}" data-act="kbk" data-v="${k}">${k}</button>`).join('')}</div></div>
  <div class="kbl">${L.slice(0,120).map(x=>`<details class="kbi"><summary><em class="tg">${x.kind}</em> ${esc(x.title)}${x.date?` <small>${x.date[0]}年</small>`:''}</summary><p>${esc(x.text||'（記録なし）')}</p>${x.src?`<p class="bsrc">出典：${esc(x.src)}</p>`:''}</details>`).join('')||'<p class="hint">見つからない。</p>'}</div>`;};
 Object.assign(ACT,{kbk:b=>{KQ='';KK=b.dataset.v;renderModal();}});
 document.addEventListener('input',e=>{if(e.target&&e.target.id==='kbq'){KQ=e.target.value.trim();clearTimeout(MODALS.kb.t);MODALS.kb.t=setTimeout(()=>{renderModal();const q=document.getElementById('kbq');if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length);}},250);}});
})();
