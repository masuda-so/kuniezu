"use strict";
/* 史実の居城と、ゲームの領域管理ノードを区別する。検証済み範囲を限定して記す。 */
TK.CASTLE_EVIDENCE={
 '郡上八幡城':{role:'地域領主の居城',from:1559,description:'1559年に遠藤盛数が築城したと伝わり、遠藤氏らの居城となった。ゲームで岐阜周辺の追加拠点にまとめていることは、斎藤氏の単なる支城であったという意味ではない。',source:'https://www.pref.gifu.lg.jp/page/7132.html',checked:'2026-10-31'},
 '羽茂城':{role:'羽茂本間氏の本拠',detached:true,description:'南佐渡の拠点で、1589年に上杉景勝の攻撃で落城したと伝わる。位置が近いという理由で越後・栃尾城の支城と扱うのは不適切。佐渡の独立領域・海路を整備するまで攻略対象から外す。',source:'https://www.city.sado.niigata.jp/site/bunkazai/5182.html',checked:'2026-10-31'}
};
TK.CLANS.hamochi=['羽茂本間','#84745f'];TK.CLANS.castle_unknown=['帰属未確定','#888888'];
(function(){const owner=G.yOwner,offer=G.branchOffer;
 G.castleEvidence=y=>TK.CASTLE_EVIDENCE[y.n]||null;
 G.yOwner=function(y){const evidence=G.castleEvidence(y),year=G.date().y;if(evidence?.detached&&!G.S().branches?.[y.id]){if(year<1589)return 'hamochi';if(year===1589)return 'castle_unknown';}return owner(y);};
 G.branchOffer=function(id,k=G.S().player,tac='chikara'){const y=G.YOSHO.find(y=>y.id===id);if(y&&G.castleEvidence(y)?.detached)return {ok:false,msg:'独立した領域と海路が未整備のため攻略対象外です。越後の支城とは扱いません。'};return offer(id,k,tac);};
})();
// 当日の具体的な被害率は未考証なので、年表へ事実を加えるに留め、兵や城を機械的に失わせない。
for(const ev of [
 {d:[1586,1,18],k:'note',title:'天正地震',text:'飛騨・美濃から近畿にかけて大きな被害が記録される地震が起きた。各領国の具体的な損耗率は未考証のため、数値被害は付与しない。',source:'https://www.data.jma.go.jp/kobe-c/bousai/higaijishin/higaijishin.html'},
 {d:[1596,9,5],k:'note',title:'慶長伏見地震',text:'畿内に大きな被害が出て、伏見城の天守閣も大破したと記録される。被害人数・各城の損耗率はここでは数値化しない。',source:'https://www.data.jma.go.jp/kyoto/13_jishinkazan/kyoto_jishin.html'}
])if(!TK.HIST.some(e=>e.title===ev.title))TK.HIST.push({...ev,evidenceStatus:'official_summary',sourceChecked:'2026-10-31'});
TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+(a.d[2]-b.d[2]));
// 「妥結」と「誓書交換・終結」は同日ではない。ここでは公文書館の旧暦十二月十九日の妥結を採る。
// 同梱の暦表に対応する内部の西暦日付へ修正（旧実装は十二月二十日になっていた）。
{const e=TK.HIST.find(e=>e.title==='大坂冬の陣の和睦');if(e){e.d=[1615,1,18];e.text='旧暦十二月十九日、講和交渉が妥結した。停戦命令や誓書交換、堀の埋め立ては続く過程であり、同日の出来事として一括しない。';e.source='https://www.archives.go.jp/exhibition/digital/ieyasu/contents5_04/';e.evidenceStatus='official_summary';e.lunarDate=[1614,12,19];}}
TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+(a.d[2]-b.d[2]));
// 数値の食い違いは史料で確定するまで正しい年齢として表示しない。
TK.PERSON_UNCERTAINTY={'斯波詮直':{field:'birthYear',variants:[1546,1560],note:'シナリオ・登場イベント間で生年が一致しない。史料照合が済むまで年齢表示を保留する。'}};
G.ageLabel=g=>TK.PERSON_UNCERTAINTY[g.n]?'年齢確認中':G.age(g)+'歳';
