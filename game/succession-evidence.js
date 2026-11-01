"use strict";
(function(){
 const src=TK.RESEARCH_SOURCES;
 src.tamaruSuccession={author:'三重県',title:'田丸城跡',url:'https://www.bunka.pref.mie.lg.jp/Miebunka/detail?cls=cult_col01&pkey=0000000690',locator:'概要・1575年家督継承／1580年松ヶ島移転',accessed:'2026-10-31',scope:'信雄（北畠具豊）の家督継承年と本拠移転年。月日は記載されていない。'};
 src.kitabatakeTimeline={author:'三重県',title:'三重県の歴史年表：室町・戦国時代',url:'https://www.bunka.pref.mie.lg.jp/rekishi/45560013067.htm',locator:'1569・1576年',accessed:'2026-10-31',scope:'和議・養子受入と、その後の北畠一族殺害を別事件として扱う。'};
 const peace=TK.HIST.find(e=>e.title==='大河内城の戦い');
 peace.k='submit';peace.datePrecision='和議は旧暦10月初旬。処理日は従来値で、明渡し日の確定値ではない';
 peace.text='大河内城の攻囲は和議となり、信長の子を北畠氏の養子として受け入れる。北畠領を織田方に従属する領域として残す。1569年の和議を北畠家の即時消滅としない。';
 const oldMove=TK.HIST.find(e=>e.k==='move'&&e.n==='織田信雄'&&e.d[0]===1569);
 if(oldMove){oldMove.k='note';oldMove.title='北畠氏への養子受入';oldMove.datePrecision='養子受入は和議後。入城の正確な日付は未照合';}
 const heir=TK.HIST.find(e=>e.k==='move'&&e.n==='織田信雄'&&e.d[0]===1575);
 Object.assign(heir,{k:'appear',clan:'kitabatake',g:'織田信雄',pull:true,leader:true,title:'北畠氏の家督継承',source:src.tamaruSuccession.url,datePrecision:'1575年。7月1日は年内表示用で継承日の確定値ではない',text:'北畠具豊（織田信雄）が家督を継ぐ。北畠氏の領域と当主を保ち、養子受入の1569年から分けて表示する。月日は未確定。'});
 const death=TK.HIST.find(e=>e.k==='death'&&e.n==='北畠具教');death.source=src.kitabatakeTimeline.url;death.datePrecision='1576年。月日は今回の資料では未照合';
 TK.HIST.push({d:death.d.slice(),k:'absorb',clan:'oda',b:'kitabatake',title:'北畠一族殺害後の支配再編',source:src.kitabatakeTimeline.url,datePrecision:death.datePrecision,text:'北畠一族の殺害後、信雄による支配を織田方の領域へ統合して表示する。個々の城の明渡し日を意味しない。'});
 const matsu=TK.JOKAKU.find(e=>e.n==='松ヶ島城'&&e.k==='build');if(matsu){matsu.d=[1580,1,1];matsu.datePrecision='1580年、月日未確定';matsu.text='1580年に信雄が田丸城から松ヶ島城へ移る。1月1日は年内表示の便宜で、築城・移転の確定日ではない。';}
 const nextIndex=Math.max(...TK.JOKAKU.map(e=>e._i))+1;
 TK.JOKAKU.push({d:heir.d.slice(),k:'build',node:'kiriyama',n:'田丸城',lon:136.63,lat:34.49,prev:1,clan:null,_i:nextIndex,source:src.tamaruSuccession.url,datePrecision:heir.datePrecision,text:'信雄の継承後の本拠を田丸へ移す。既存の田丸城を改修したのであり、この年の新築ではない。地図の切替月日は表示上の仮置き。'});
 TK.JOKAKU.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);
 for(const y of TK.YOSHO)if(y[0]==='大河内城'){y[6]=1575;y[4]+='。1575年に解体（松阪市）。月日未確定。';}
 const old=G.siteEra;
 G.siteEra=y=>{let t=old(y);if(/田丸|大河内|霧山|松ヶ島/.test(y.n))t+='。1569年は和議・養子受入、1575年は信雄の家督継承、1580年は田丸から松ヶ島への移転。年しか分からない変更を日単位の史実とはしない';return t;};
 TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);
})();
