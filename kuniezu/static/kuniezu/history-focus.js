"use strict";
/* 出典に照合した修正。未確認の線・兵数を確定値として扱わない。 */
(function(){
TK.HISTORY_ONLY=true;
TK.RESEARCH_SOURCES={
 iida:{author:'飯田市',title:'飯田城の歴史',url:'https://www.city.iida.lg.jp/site/bunkazai/iidajou.html',locator:'飯田城の落城と攻防',scope:'旧暦2月14日夜の守将撤退・国境からの侵攻'},
 takato:{author:'伊那市',title:'史跡高遠城跡保存活用計画 第3章',url:'https://www.inacity.jp/shisei/kakushuplanshiryo/rekishibunka/takatojo_keikaku.files/takatojyoseki_hozonkatuyoukeikaku_03.pdf',locator:'本文p.38',scope:'旧暦3月2日の落城、信忠・仁科盛信'},
 katsuyori:{author:'飯田市',title:'南本城城跡',url:'https://www.city.iida.lg.jp/site/bunkazai/minamihonjou.html',locator:'武田討伐',scope:'旧暦3月11日の勝頼自刃'},
 yamazaki:{author:'長岡京市',title:'長岡京市の歴史年表',url:'https://www.city.nagaokakyo.lg.jp/0000001016.html',locator:'1582年',scope:'旧暦6月13日の山崎合戦と勝龍寺城への退却'},
 himeji:{author:'姫路市',title:'姫路城保存活用計画 第2章',url:'https://www.city.himeji.lg.jp/kanko/cmsfiles/contents/0000030/30274/chapter2.pdf',locator:'第2項 近世',scope:'中国大返しで姫路を中継。細かい経由日時・山崎の本人着陣時刻までは確定しない'},
 okehazama:{author:'豊明市',title:'桶狭間古戦場伝説地',url:'https://www.city.toyoake.lg.jp/2001.htm',locator:'桶狭間の戦い',scope:'旧暦5月12日駿府出発、約25,000という伝承値'},
 kutsukake:{author:'豊明市',title:'豊明市指定文化財',url:'https://www.city.toyoake.lg.jp/3356.htm',locator:'沓掛城址',scope:'合戦前日の義元入城、縄張と後世の絵図との比較'},
 okeMain:{author:'豊明市',title:'広報とよあけ 2023年6月号',year:'2023',url:'https://www.city.toyoake.lg.jp/koho/toyoake202306/pageindices/index2.html',locator:'pp.2–3',scope:'総軍25,000説と沓掛を出る本隊5,000説の区別'},
 minoji:{author:'愛知県',title:'清洲城下町',url:'https://rekishi-kanko.pref.aichi.jp/place/kiyosu.html',locator:'清洲城下町の歴史',scope:'秀次の清洲・墨俣・大垣の宿駅整備。各年代の道筋すべてを裏付けるものではない'},
 hitachi:{author:'国立公文書館',title:'元禄国絵図常陸国',year:'元禄9年（内容年）',url:'https://www.digital.archives.go.jp/item/764298',locator:'特083-0001-0037',scope:'書誌確認。戦国期より約100年以上後。画像の測量・湖岸のトレースは未実施'},
 kuni:{author:'国立公文書館',title:'元禄国絵図',url:'https://www.digital.archives.go.jp/pickup/41',locator:'概要・下総国',scope:'1696年作成命令、1702年頃完成。椿海干拓後の図を1560年へそのまま移せない'},
 kasumi:{author:'国土交通省 関東地方整備局',title:'霞ヶ浦の歴史',url:'https://www.ktr.mlit.go.jp/kasumi/kasumi00127.html',locator:'居切堀',scope:'居切堀は1869年着工・1871年完成。戦国期の水路に使用しない'},
 tone:{author:'国土交通省 関東地方整備局',title:'利根川の歴史',url:'https://www.ktr.mlit.go.jp/tonege/tonege_index016.html',locator:'香取海・東遷',scope:'近世の利根川東遷。近代・現代の河道との区別'},
 terrain:{author:'国土地理院',title:'地理院タイル一覧',url:'https://maps.gsi.go.jp/development/ichiran.html',locator:'陰影起伏図',scope:'現代の標高に基づく多段階解像度の地形。戦国期の造成・河道の復元ではない'},
 citation:{author:'古谷実',title:'改訂された「参照文献の書き方」―SIST 02 2007年版について―',year:'2007',url:'https://doi.org/10.1241/johokanri.50.155',locator:'情報管理 50(3), pp.155–161',scope:'責任表示・標題・出版事項・参照先を分ける書誌記述の考え方'}
};
for(const s of Object.values(TK.RESEARCH_SOURCES)){s.accessed='2026-10-31';s.kind='自治体・機関の解説';}
TK.RESEARCH_SOURCES.hitachi.kind='所蔵史料の書誌';
TK.RESEARCH_SOURCES.kutsukakeLocation={author:'国立情報学研究所',title:'沓掛城跡：日本歴史地名大系 施設・地点項目データセット',url:'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/23/230000115100.html',locator:'230000115100',accessed:'2026-10-31',scope:'現存城跡の代表座標。城郭の周囲を測量したものではない。'};
if(!TK.YOSHO.some(y=>y[0]==='沓掛城'))TK.YOSHO.push(['沓掛城','城',137.021826,35.068987,'桶狭間合戦前日に今川義元が入ったと伝わる城。合戦後の城主については豊明市の文化財解説を参照。']);
TK.CASTLE_EVIDENCE['沓掛城']={role:'今川軍の尾張進攻拠点',description:'桶狭間当時は近藤景春が今川方に属した。落城後は簗田政綱・織田信照・川口久助の在城が後世の地誌に記される。各人の交替日は未確定。',source:'https://www.city.toyoake.lg.jp/3356.htm',checked:'2026-10-31'};
// 1582年10月以前は既存エンジンのユリウス暦に合わせる。
TK.lunarDate=function(y,m,d){const row=TK.KOYOMI.m.find(r=>r[0]===y&&r[1]===m&&!r[2]);if(!row)throw Error('暦月なし');const jd=TK.KOYOMI.j0+row[3]+d-1;
 if(jd>=2299161){const dt=new Date((jd-2440588)*86400000);return [dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate()];}
 const c=jd+32082,dd=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*dd/4),mm=Math.floor((5*e+2)/153);return [dd-4800+Math.floor(mm/10),mm+3-12*Math.floor(mm/10),e-Math.floor((153*mm+2)/5)+1];
};
const dated=(e,lunar)=>({...e,d:TK.lunarDate(...lunar),lunarDate:lunar});
// 従属解除だけでは同盟が残っていた。戦争を伴う離反では両方を解除。
const ushikubo=TK.HIST.find(e=>e.title==='牛久保城攻め');ushikubo.keepAlly=false;
const kiyosu=TK.HIST.find(e=>e.title==='清洲同盟');kiyosu.unvassal=['tokugawa'];kiyosu.keepAlly=false;
const kai=TK.HIST.find(e=>e.title==='甲州征伐');
Object.assign(kai,dated({k:'note',at:'tsutsuji',clan:'oda',who:'織田信忠',kill:['武田勝頼'],source:TK.RESEARCH_SOURCES.katsuyori.url,text:'旧暦3月11日、武田勝頼が自害した。伊那谷への侵攻、飯田の撤退、高遠の落城を経た武田氏の崩壊。全城がこの日に落城したという意味ではない。'},[1582,3,11]));
delete kai.castles;delete kai.peace;delete kai.from;
TK.HIST.push(
 dated({k:'take',clan:'oda',from:'iwamura',castles:['iida'],peace:['iida'],title:'飯田城の守将撤退',who:'織田信忠',source:TK.RESEARCH_SOURCES.iida.url,text:'国境の諸将の離反を受け、飯田城の守将は旧暦2月14日夜に撤退した。国境での降伏・撤退と城への攻撃を区別する。'},[1582,2,14]),
 dated({k:'take',clan:'oda',from:'iida',castles:['takato'],title:'高遠城の戦い',who:'織田信忠',site:'高遠城',big:1,source:TK.RESEARCH_SOURCES.takato.url,text:'旧暦3月2日、織田信忠軍が高遠城を攻略。仁科盛信は降伏せず戦い、城は落城した。'},[1582,3,2]),
 dated({k:'take',clan:'oda',castles:['fukashi','kaizu','toishi','tsutsuji','minowa','numata'],admin:1,title:'武田旧領の支配整理',datePrecision:'月内の便宜上の配置日',source:TK.RESEARCH_SOURCES.katsuyori.url,text:'武田氏滅亡に続く支配の整理を地図へ反映。個々の城の明渡し日・新領主の確定日は未照合で、同日の落城を表すものではない。'},[1582,3,12])
);
const yam=TK.HIST.find(e=>e.title==='山崎の戦い');yam.d=TK.lunarDate(1582,6,13);yam.lunarDate=[1582,6,13];yam.source=TK.RESEARCH_SOURCES.yamazaki.url;yam.marchWho='羽柴秀吉';yam.marchClan='oda';yam.from='himeji';yam.marchStart=TK.lunarDate(1582,6,6);yam.routeVia=['himeji','miki','akutagawa'];yam.arrivalNote='姫路経由の概略線。途中の通過日と秀吉本人の着陣時刻には未検証事項がある。';
TK.RESEARCH_SOURCES.shigisan={author:'平群町',title:'へぐり戦国時代 松永久秀と信貴山城',url:'https://kanko.town.heguri.nara.jp/history/history/page2.php',locator:'松永久秀・信貴山城',accessed:'2026-10-31',scope:'信忠の攻城、旧暦10月10日の久秀自刃。平蜘蛛とともに爆死したとの断定を採らない。'};
const shigi=TK.HIST.find(e=>e.title==='信貴山城の戦い');Object.assign(shigi,{d:TK.lunarDate(1577,10,10),who:'織田信忠',marchWho:'織田信忠',source:TK.RESEARCH_SOURCES.shigisan.url,text:'織田信忠を総大将とする軍が信貴山城を攻め、旧暦10月10日に松永久秀が自刃した。平蜘蛛茶釜の破壊は伝承を含み、爆死と断定しない。'});
TK.RESEARCH_SOURCES.tanabeDates={author:'舞鶴市・舞鶴ふるさと発見館',title:'郷土資料館だより 令和4年7月号',year:'2022',url:'https://www.city.maizuru.kyoto.jp/kyouiku/0000009891.html',locator:'7月は田辺籠城戦！',accessed:'2026-10-31',scope:'旧暦7月21日〜9月12日の籠城。攻め手15,000・守備500は伝承値。後世の籠城図は複数の異本がある。'};
TK.HIST.push(dated({k:'note',title:'田辺城の戦い',at:'tango',site:'田辺城',big:1,source:TK.RESEARCH_SOURCES.tanabeDates.url,text:'丹後の田辺城で細川幽斎が籠城した。舞鶴市の解説による開始日を採る。攻城側の個々の出発地点・経路は未照合。'},[1600,7,21]));
Object.assign(TK.BATTLES['田辺城の戦い'],{date:'慶長5年7月21日〜9月12日',eventDate:TK.lunarDate(1600,9,12),calendar:[[0,'7月21日・籠城開始'],[60,'包囲が続く'],[100,'9月12日・開城']]});
TK.BATTLES['田辺城の戦い'].sources.push('tanabeDates');
TK.BATTLES['田辺城の戦い'].sides.a.tr='約15,000（伝承）';TK.BATTLES['田辺城の戦い'].sides.b.tr='約500（伝承）';
TK.RESEARCH_SOURCES.iwaya={author:'太宰府市',title:'岩屋城跡',year:'2024',url:'https://www.city.dazaifu.lg.jp/site/kanko/12002.html',locator:'岩屋城と高橋紹運',accessed:'2026-10-31',scope:'攻め手4万・守備700余の伝承値。別の市解説には5万・763人とあり確定値にしない。'};
TK.RESEARCH_SOURCES.iwayaDiary={"author":"上井覚兼（鹿児島県編）","title":"鹿児島県史料 旧記雑録後編二 所収「上井覚兼日記」","url":"https://www.pref.kagoshima.jp/ab25/documents/6756_20221201091952-1_1.pdf#page=92","locator":"第166号、205–208頁（PDF 92–95頁）、天正14年7月26・27日条","accessed":"2026-11-05","scope":"26日の下柵突破と包囲、27日朝の攻撃、同日午後の落城。個々の攻め口・高橋紹運の戦死時刻は特定できない。"};
TK.RESEARCH_SOURCES.iwayaVariant={author:'太宰府市',title:'中世の太宰府',url:'https://www.city.dazaifu.lg.jp/site/bunkazai/33942.html',locator:'16世紀・戦国時代の太宰府',accessed:'2026-10-31',scope:'攻め手5万・守備763人という別表記。観光解説の4万と一致しない。'};
TK.BATTLE_TROOPS['岩屋城の戦い'].sources=['iwaya','iwayaVariant'];TK.BATTLE_TROOPS['岩屋城の戦い'].certainty='自治体解説にも攻め手4万／5万、守備700余／763人の異表記がある';
TK.RESEARCH_SOURCES.okawachi={author:'田所寛士・三重県',title:'大河内城の戦いと信長の伊勢進攻',year:'1992',url:'https://www.bunka.pref.mie.lg.jp/rekishi/kenshi/asp/arekore/detail65.html',locator:'県史あれこれ・本文',accessed:'2026-10-31',scope:'旧暦8月20日岐阜発・23日木造・27日桂瀬山、10月初旬の和睦。5万対7〜8千は概数。'};
const okawachi=TK.HIST.find(e=>e.title==='大河内城の戦い');okawachi.source=TK.RESEARCH_SOURCES.okawachi.url;okawachi.text='約2か月の攻囲後に和議が成立し、信長の子を北畠氏の養子に迎えた。地図は織田方の支配下として一括表示するが、全城が同日落城・北畠家が即日消滅した意味ではない。領主継承の個別処理は未整備。';
TK.BATTLE_SOURCE_PATCHES={'信貴山城の戦い':['shigisan'],'岩屋城の戦い':['iwayaDiary','iwaya','iwayaVariant'],'大河内城の戦い':['okawachi']};
const catalog=G.buildBattleCatalog;G.buildBattleCatalog=function(){catalog();for(const [title,ids] of Object.entries(TK.BATTLE_SOURCE_PATCHES)){const b=TK.BATTLES[title];if(b){b.sources=ids;b.audit=(b.audit||[]).filter(s=>s!=='個別の出典本文・頁が未照合');b.mapNote=(b.layoutStatus==='unresearched'?'配置は比較表示で未復元。':'概略図。')+' 出典で確認した内容と未確認部分は下の出典欄に明記。';if(title==='信貴山城の戦い')b.beats=[[0,shigi.text]];const row=TK.BATTLE_AUDIT.find(r=>r.title===title);if(row){row.sourceIds=ids;row.issues=b.audit;}}}};
if(TK.BATTLES[yam.title]){TK.BATTLES[yam.title].eventDate=yam.d.slice();TK.BATTLES[yam.title].sources=['yamazaki','himeji'];TK.BATTLES[yam.title].mapNote='日付は旧暦6月13日。部隊の経路は模式表示。秀吉本人の到着時刻を断定しない。';}
const im=TK.SHOW.find(x=>x.scen==='s1560'&&x.gen==='今川義元');if(im){im.depart=TK.lunarDate(1560,5,12);im.arrive=TK.lunarDate(1560,5,18);im.stopAt=1;im.source=TK.RESEARCH_SOURCES.okehazama.url;im.routeNote='駿府発→三河→沓掛。通過城間の経路は概略。25,000は総動員の伝承値で本陣兵数ではない。';}
TK.BATTLE_TROOPS['桶狭間の戦い'].note='約25,000は今川総軍の伝承値。義元本隊約5,000説と区別。織田兵数にも異説。';
TK.BATTLE_TROOPS['桶狭間の戦い'].sources=['okehazama','okeMain'];
for(const [title,n] of Object.entries(TK.BATTLE_TROOPS))n.certainty=n.certainty||'伝承・文献上の概数。全員が同時に本戦へ参加した数ではない';
// 「東海道」に美濃路・東山道の迂回線が混入し、同区間が二重に描かれていた。
// 熱田以東・京大津間へ分割し、美濃を通る線は既存の美濃路・東山道へ一本化。
const tokaido=TK.ROADS.find(r=>r[0]==='東海道');
if(tokaido){const kyoto=tokaido[1].slice(0,6);tokaido[1]=tokaido[1].slice(15);TK.ROADS.push(['京・大津道',kyoto]);delete TK.ROADFIX['東海道'];delete TK.ROADFIX['美濃路'];}
TK.RESEARCH_SOURCES.minojiRoute={author:'大垣市',title:'美濃路大垣宿景観まちづくり計画',year:'2007',url:'https://www.city.ogaki.lg.jp/cmsfiles/contents/0000001/1427/keikaku.pdf',locator:'美濃路の概要',accessed:'2026-10-31',scope:'垂井と宮を結ぶ美濃路、鈴鹿越え・七里の渡しとの区別。近世の街道制度を1560年にそのまま遡らせない。'};
// 全街道の線形は概略。後世の道路網を当時の実測線と誤表示しない。
TK.ROAD_EVIDENCE=Object.fromEntries(TK.ROADS.map(([name])=>[name,{status:'経路・利用年代未照合'}]));
TK.ROAD_EVIDENCE['美濃路']={status:'清洲・墨俣・大垣の接続を確認、区間線形は概略',source:'minoji'};
TK.ROAD_EVIDENCE['東海道']={status:'美濃路との誤った重複を解消。熱田以東の線形・利用年代は要照合',source:'minojiRoute'};
// 近い城へ街道そのものを曲げる補正は使用しない。城への取付路と本道を分離。
TK.NO_CASTLE_ROAD_SNAP=true;
TK.HIST.sort((a,b)=>(a.d[0]-b.d[0])*400+(a.d[1]-b.d[1])*32+a.d[2]-b.d[2]);
G.armyIdentity=function(u){const n=G.gen(u.gens[0])?.n;
 if(n==='明智光秀'&&/本能寺|山崎/.test(u.until||u.historyTitle||''))return {name:'明智勢',color:'#347d9a'};
 if(n==='石田三成'&&G.kyu().y===1600)return {name:'石田勢・西軍',color:'#7650a2'};
 return {name:G.CNK(u.clan),color:G.CC(u.clan)};
};
G.siteEra=function(y){const year=G.kyu().y,on=G.yActive(y),ev=G.castleEvidence?.(y);let text=year+'年時点：'+(y.y0||y.y1?(on?'この年代に機能する施設として表示':'この年代には機能していません'):'施設の成立・廃絶時期は確認できていません');
 if(y.n==='沓掛城')text+='。'+(G.S().t<=G.evT(TK.HIST.find(e=>e.title==='桶狭間の戦い'&&e.k!=='premarch'))?'桶狭間以前は今川方の近藤景春が在城。旧暦5月18日に義元が宿営したと伝わる':'桶狭間後の城主には簗田政綱・織田信照・川口久助が挙げられるが、この時点の個別の在城者は未確定');
 if(ev&&y.n!=='沓掛城')text+='。'+ev.role+'。'+ev.description;else if(!ev)text+='。個別の城主・縄張の年代別史料は未照合';
 text+='。表示の領主は地図上の管理領域から推定し、支城・従属の史実を断定しない';return text;
};
})();
