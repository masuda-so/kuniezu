"use strict";
/* 画面の説明と史料台帳を分ける。存在・帰属を未確認の文章で断定しない。 */
(function(){
 G.playerText=text=>(text||'').split('。').filter(s=>s&&!/未照合|検証中|未整備|未確認|未復元|架空.*表示|地図.*反映|地図.*一括|表示.*推定|ゲーム上|便宜上/.test(s)).join('。').replace(/([^。])$/,'$1。');
 const source='https://www.city.tokorozawa.saitama.jp/iitokoro/enjoy/bunkakyoyo/bunkazai/kenshiteibunkazai/bunzai_20100126153048508.html';
 TK.RESEARCH_SOURCES.takiCastle={author:'所沢市',title:'滝の城跡',url:source,locator:'小田原征伐による1590年の落城・以後廃城、伝えの城',accessed:'2026-11-01',scope:'城郭の役割と廃城年。落城月日は確定しない。'};
 const y=TK.YOSHO.find(y=>y[0]==='滝の城');if(y){y[4]='柳瀬川沿いの城。北条氏のもとで、多摩西部と北関東を結ぶ連絡・兵站の拠点となった。1590年の小田原征伐で落城し、その後は城跡となる。';y[6]=1591;}
 const active=G.yActive;G.yActive=y=>y.n==='滝の城'?G.date().y<1590||G.date().y===1590&&G.S().t<G.evT({d:TK.lunarDate(1590,7,5)}):active(y);
 TK.CASTLE_EVIDENCE['滝の城']={role:'北条氏の連絡・兵站拠点',description:y?.[4],source,checked:'2026-11-01'};
 G.sitePresentation=function(y){const text=(y.desc||'').replace(/(個別.*?未照合|検証中|未検証|ゲーム.*?仮定).*$/,'').trim(),on=G.yActive(y),kind=y.kind==='城'?'城郭':G.YOSHO_FX[y.kind]?.n||y.kind;
  const before=y.y0&&G.date().y<y.y0;
  return {title:y.n+(!on&&!before&&!y.n.endsWith('跡')?'跡':''),kind,description:text,state:on?'':before?'成立する前':y.n==='滝の城'?'1590年の落城後、城跡となっています。':'この年代には使われていません。',role:TK.CASTLE_EVIDENCE[y.n]?.role||kind};
 };
 const src=TK.RESEARCH_SOURCES;
 src.aizuTurn={author:'小山市',title:'徳川家康ゆかりの地 小山評定と小山御殿',url:'https://www.city.oyama.tochigi.jp/kankou-bunka/rekishi_bunka/bunkazai/page000011.html',locator:'1600年旧暦7月24日小山在陣・翌日の軍議',accessed:'2026-11-01',scope:'会津への出兵と西上への転換。会津での家康対上杉の本戦はない。'};
 src.tono1600={author:'中津川市苗木遠山史料館',title:'資料紹介69 関ヶ原直前の東濃',url:'https://www.city.nakatsugawa.lg.jp/museum/t/archives/materials/1496.html',locator:'遠山友政・妻木氏らへの家康の書状、8月15日・20日・27日・9月8日',accessed:'2026-11-01',scope:'東美濃の別働隊。家康本隊の直接参加とは別。'};
 const build=G.buildBattleCatalog;G.buildBattleCatalog=function(){build();const sc=TK.BATTLES['会津征伐'];if(sc){sc.presentationCategory='march';sc.reviewNote='上杉景勝の討伐へ向かった徳川軍。家康は小山で西方の挙兵を知り、諸将とともに西へ向きを変える。';sc.place='会津への出兵と小山での転進';sc.sources=[...new Set([...(sc.sources||[]),'aizuTurn'])];sc.beats=[[0,'徳川軍が会津へ向けて進む。'],[50,'家康は小山に在陣し、西方の情勢を受けて諸将と協議する。'],[100,'会津への進軍を中止し、西方の軍勢への対応に転じる。']];}};
})();

/* 年表の史実記述と開発時の修正メモを分離する。 */
(function(){
 const copy={
 '甲尾同盟':'武田家と織田家が同盟を結ぶ。',
 '越相同盟':'上杉家と北条家が同盟を結ぶ。',
 '房相一和':'里見家と北条家が和睦する。',
 '甲越同盟':'武田勝頼と上杉景勝が協力関係を結ぶ。',
 '相遠同盟':'北条家と徳川家が武田家に対抗して連携する。',
 '武田旧領の支配整理':'武田氏の滅亡後、旧領には織田方の諸将が配置された。',
 '岐阜の池田領への再配分':'信孝の旧領が池田氏へ再配分され、池田元助が岐阜城主となる。',
 '上杉の羽柴への帰属':'上杉景勝が秀吉に従う。',
 '池田輝政の吉田入封':'池田輝政が三河吉田へ移封される。',
 '田辺城の戦い':'丹後の田辺城を攻められた細川幽斎が籠城する。'
 };
 for(const e of TK.HIST){if(copy[e.title])e.text=copy[e.title];for(const field of ['a','b','clan','clanAlt'])if(e[field]==='uesugi')e[field]='nagao';}
})();
