/* 支配の記録の入力の検査の固定の入力。値は架空で、史実ではない。家は clan:aaa など、城は castle:example など。 */
const base={summary:'架空の要旨。',checked:'2026-11-13',checkedBy:'検査の固定の入力'};
const src={evidenceDepth:'kobun-heading',source:'srcA',locator:'架空の箇所'};
const day=(y,m,d,leap=false)=>({kind:'dated-event',date:[y,m,d],calendar:'Japanese-lunisolar',leapMonth:leap,precision:'day'});
const year=y=>({kind:'year-window',year:y,calendar:'Japanese-year',precision:'year'});
const change=(id,from,to,time,extra={})=>({id,type:'change',site:'castle:example',from,to,time,cause:'fall',dateKind:'event',...src,...base,...extra});
const held=(id,holder,time,extra={})=>({id,type:'observation',site:'castle:example',value:'held',holder,time,...src,...base,...extra});
const searched=[{source:'srcA',query:'example',date:'2026-11-13',years:[1575,1579]}];
const undetermined=(id,time,extra={})=>({id,type:'observation',site:'castle:example',value:'undetermined',time,boundsAsserted:true,searched,...base,...extra});
const range=(a,b)=>({from:a,to:b});
module.exports={
 context:{sources:new Set(['srcA','srcB']),claimIds:new Set(['claim:x']),placeIds:new Set(['place:x']),clanKeys:new Set(['aaa','bbb','ccc']),siteIds:new Set(['castle:example','castle:other','castle:yosho:架空城:135.1:35.1'])},
 // 日付の幅（ユリウス通日）。koyomi.js の表から手で引いた値。
 spans:[
  {name:'旧暦の 1 日',time:day(1560,5,19),earliest:2280657+10336+18,latest:2280657+10336+18},
  {name:'閏月の 1 日',time:day(1561,3,1,true),earliest:2280657+10661,latest:2280657+10661},
  {name:'年の両端（旧暦の正月朔日から翌年の正月朔日の前日）',time:year(1560),earliest:2280657+10218,latest:2280657+10572-1},
  {name:'期間の呼び名',time:{kind:'described-period',label:'是夏',indexYears:[1560,1561],calendar:'Japanese-era-description',precision:'period',boundsAreHistoricalStartEnd:false},earliest:2280657+10218,latest:2280657+10956-1},
  {name:'期間',time:range(day(1560,5,19),year(1561)),earliest:2280657+10336+18,latest:2280657+10956-1},
 ],
 accepts:[
  {name:'変化・確かな観察・窓・係争・対象外・不明・異説',records:[
   change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19),{claim:'claim:x',place:'place:x',alsoSources:[{source:'srcB',locator:'別の箇所'}]}),
   held('control:example-1561-1','clan:bbb',day(1561,3,1,true)),
   held('control:example-1562-1','clan:bbb',year(1562)),
   held('control:example-1562-2','clan:ccc',year(1562)), // 窓どうしは重なっても拒まない
   {id:'control:example-1563-1',type:'observation',site:'castle:example',value:'contested',claimants:['clan:bbb','clan:ccc','clan:aaa'],time:day(1563,1,5),...src,...base},
   {id:'control:example-1570-1',type:'observation',site:'castle:example',value:'not-applicable',time:range(year(1570),year(1571)),boundsAsserted:true,...src,...base},
   undetermined('control:example-1575-1',range(year(1575),year(1579))),
   change('control:example-1580-1','clan:bbb','clan:aaa',day(1580,6,1),{variantOf:['control:example-1580-2']}),
   change('control:example-1580-2','clan:bbb','clan:ccc',day(1580,6,1),{variantOf:['control:example-1580-1']}),
   change('control:example-1590-1','unknown','none',year(1590),{cause:'abandonment',dateKind:'listing-only'}),
   change('control:yosho:架空城:135.1:35.1-1565-1','none','clan:aaa',year(1565),{site:'castle:yosho:架空城:135.1:35.1',cause:'construction'}),
  ]},
  {name:'A–B・B–C の異説の束は A と C も矛盾にしない',records:[
   held('control:example-1560-1','clan:aaa',day(1560,5,19),{variantOf:['control:example-1560-2']}),
   held('control:example-1560-2','clan:bbb',day(1560,5,19),{variantOf:['control:example-1560-1','control:example-1560-3']}),
   held('control:example-1560-3','clan:ccc',day(1560,5,19),{variantOf:['control:example-1560-2']}),
  ]},
  {name:'隙間なくつながる探した年代',records:[undetermined('control:example-1575-1',range(year(1575),year(1579)),{searched:[{source:'srcA',query:'a',date:'2026-11-13',years:[1575,1576]},{source:'srcB',query:'b',date:'2026-11-13',years:[1577,1579]}]})]},
  {name:'同じ日の A→B と B→C は警告しない',records:[change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19)),change('control:example-1560-2','clan:bbb','clan:ccc',day(1560,5,19))],warnings:0},
 ],
 warns:[
  {name:'同じ日につながらない変化',records:[change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19)),change('control:example-1560-2','clan:ccc','clan:bbb',day(1560,5,19))],warns:'つながらない変化'},
 ],
 rejects:[
  {name:'必須の欠け',records:[{...change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19)),summary:undefined}],rejects:'summary'},
  {name:'知らない項目',records:[{...change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19)),note:'x'}],rejects:'知らない項目'},
  {name:'語彙の外の cause',records:[change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19),{cause:'gift'})],rejects:'cause'},
  {name:'語彙の外の value',records:[{...held('control:example-1560-1','clan:aaa',day(1560,5,19)),value:'owned'}],rejects:'value'},
  {name:'日本の城でない site',records:[change('control:busan-1592-1','clan:aaa','clan:bbb',day(1592,4,14),{site:'castle:busan'})],rejects:'site'},
  {name:'知らない家',records:[change('control:example-1560-1','clan:aaa','clan:zzz',day(1560,5,19))],rejects:'to'},
  {name:'登録されていない出典',records:[change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19),{source:'srcZ'})],rejects:'source'},
  {name:'登録されていない命題',records:[change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19),{claim:'claim:zzz'})],rejects:'claim'},
  {name:'id の年が合わない',records:[change('control:example-1561-1','clan:aaa','clan:bbb',day(1560,5,19))],rejects:'id の年'},
  {name:'id の城が合わない',records:[change('control:other-1560-1','clan:aaa','clan:bbb',day(1560,5,19))],rejects:'id が'},
  {name:'id の重複',records:[change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,19)),change('control:example-1560-1','clan:bbb','clan:ccc',day(1560,6,1))],rejects:'重複'},
  {name:'searched の無い不明',records:[{...undetermined('control:example-1575-1',range(year(1575),year(1579))),searched:undefined}],rejects:'searched'},
  {name:'探した範囲からはみ出す不明',records:[undetermined('control:example-1574-1',range(year(1574),year(1579)))],rejects:'はみ出す'},
  {name:'探した年代に隙間がある不明',records:[undetermined('control:example-1575-1',range(year(1575),year(1579)),{searched:[{source:'srcA',query:'a',date:'2026-11-13',years:[1575,1575]},{source:'srcA',query:'b',date:'2026-11-13',years:[1579,1579]}]})],rejects:'はみ出す'},
  {name:'推定の旗の付いた日付',records:[held('control:example-1560-1','clan:aaa',{...day(1560,5,19),estimated:true})],rejects:'合わない項目'},
  {name:'形に無い untilExclusive',records:[held('control:example-1560-1','clan:aaa',{...year(1560),untilExclusive:1561})],rejects:'合わない項目'},
  {name:'時点の不明',records:[{...undetermined('control:example-1575-1',year(1575)),boundsAsserted:undefined}],rejects:'undetermined は期間'},
  {name:'claimants が 1 つの係争',records:[{id:'control:example-1563-1',type:'observation',site:'castle:example',value:'contested',claimants:['clan:bbb'],time:day(1563,1,5),...src,...base}],rejects:'claimants'},
  {name:'held に holder が無い',records:[{...held('control:example-1560-1','clan:aaa',day(1560,5,19)),holder:undefined}],rejects:'holder'},
  {name:'期間に boundsAsserted が無い',records:[held('control:example-1560-1','clan:aaa',range(year(1560),year(1561)))],rejects:'boundsAsserted'},
  {name:'片側だけの variantOf',records:[change('control:example-1580-1','clan:bbb','clan:aaa',day(1580,6,1),{variantOf:['control:example-1580-2']}),change('control:example-1580-2','clan:bbb','clan:ccc',day(1580,6,1))],rejects:'片側'},
  {name:'確かな観察が重なり結果が違う',records:[held('control:example-1560-1','clan:aaa',day(1560,5,19)),held('control:example-1560-2','clan:bbb',range(year(1560),year(1560)),{boundsAsserted:true})],rejects:'確かな観察'},
  {name:'不明の期間の中の変化',records:[undetermined('control:example-1575-1',range(year(1575),year(1579))),change('control:example-1577-1','clan:aaa','clan:bbb',day(1577,3,1))],rejects:'undetermined の期間'},
  {name:'不明の期間の中の確かな観察',records:[undetermined('control:example-1575-1',range(year(1575),year(1579))),held('control:example-1577-1','clan:aaa',day(1577,3,1))],rejects:'undetermined の期間'},
  {name:'dated-components',records:[change('control:example-1560-1','clan:aaa','clan:bbb',{kind:'dated-components',components:[],calendar:'CE-year',precision:'year'})],rejects:'dated-components'},
  {name:'暦の表に無い閏月',records:[change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,5,1,true))],rejects:'暦の表に無い月'},
  {name:'月の日数を超える日',records:[change('control:example-1560-1','clan:aaa','clan:bbb',day(1560,4,30))],rejects:'日数を超える'},
  {name:'暦の表の外の年',records:[change('control:example-1623-1','clan:aaa','clan:bbb',year(1623))],rejects:'暦の表の外'},
  {name:'逆転した期間',records:[held('control:example-1562-1','clan:aaa',range(year(1562),year(1561)),{boundsAsserted:true})],rejects:'始まりが終わりより後'},
  {name:'期間の変化',records:[change('control:example-1560-1','clan:aaa','clan:bbb',range(year(1560),year(1561)))],rejects:'時点'},
 ],
};
