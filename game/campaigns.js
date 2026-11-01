"use strict";
/* 戦役全体の参加者。現地の半日と、数か月の別戦線を混ぜない。 */
(function(){
const src=TK.BATTLE_SOURCES,u=TK.battleUnit;
src.fushimiIetada={title:'島原市・松平文庫「松平家忠と家忠日記」',url:'https://www.city.shimabara.lg.jp/page16941.html',scope:'学芸員解説。家忠の伏見城番と1600年の戦死。'};
src.otsuTime={title:'びわ湖大津観光協会「大津城籠城」',url:'https://otsu.or.jp/sengoku/hamaotsu.html',scope:'旧暦9月4日の籠城開始、長等山からの攻撃、9月15日の退城。'};
src.uedaShape={title:'上田城下町観光協会「上田城の歴史情報」',url:'https://nagano-ueda.gr.jp/ueda-jo/ueda-jjo-history/',scope:'千曲川・尼ヶ淵と矢出沢川、真田期の縄張の不確定性、第二次合戦を大規模な撃滅戦としない。'};
src.hasedoTerrain={title:'山形市「長谷堂城跡公園 散策マップ」2025年3月・両面',url:'https://www.city.yamagata-yamagata.lg.jp/_res/projects/default_project/_page_/001/003/682/2025hasedou.pdf',scope:'南北に長い独立丘陵、曲輪・切岸・二重横堀と菅沢山本陣。現在の散策路と戦国期の構造を区別。'};
src.hasedoMuseum={title:'山形市・最上義光歴史館「長谷堂合戦図屏風の解説」',url:'https://www.city.yamagata-yamagata.lg.jp/bunkasports/geijyutsu/1006703/1013262.html',scope:'旧暦9月15日前後の進攻と10月1日前後の撤退。屏風の描写には誇張もある。'};
src.hasedoTime={title:'最上義光歴史館・小和田哲男「関ヶ原合戦と最上義光」',url:'https://sp.mogamiyoshiaki.jp/?l=149802&p=log',scope:'旧暦10月1日の上杉軍撤退。検索収録の本文を参照。現在の公開ページはメンテナンス中のため全文再照合が必要。'};
TK.BATTLES['伏見城の戦い'].sources.push('fushimiIetada');
src.campaignRoster={title:'刀剣ワールド「関ヶ原の戦い 家紋・旗指物・馬標一覧」',url:'https://www.touken-world.jp/sekigahara-list/',scope:'参加者の戦線別一覧（二次資料）。六連銭は家紋で、人名の一部ではない。位置・移動日は別途照合する。'};
src.fukushima={title:'福島市「戦国福島の関ヶ原 松川の合戦」',url:'https://www.city.fukushima.fukushima.jp/kanko-bunka-sports/rekishi-bunkazai/4/1/3/11657.html',scope:'本庄繁長の福島城守備と伊達政宗。松川合戦の年代・日時には史料間の問題がある。'};
src.osakaHonors={title:'大阪府立図書館・国会図書館レファレンス「大坂冬の陣の感状」',url:'https://crd.ndl.go.jp/reference/detail?page=ref_view&id=1000182213',scope:'『大日本史料』第12編17の参照箇所。蜂須賀・上杉・佐竹家の戦功。'};
TK.BATTLES['大坂冬の陣'].sources.push('osakaHonors');
const C=TK.CAMPAIGNS={sekigahara:{title:'関ヶ原戦役',dates:[[1600,8,27],[1600,9,8],[1600,9,30],[1600,10,12],[1600,10,21]],labels:['伏見・田辺の攻防','伏見落城','岐阜落城','上田・大津などの攻防','関ヶ原本戦'],sources:['campaignRoster','sekigaharaMap','ueda','otsu','tanabe','gifu','hasedo','hideyasu','fukushima'],groups:[]}};
const add=(id,title,side,names,place,notes,sources,extra={})=>C.sekigahara.groups.push({id,title,side,names:names.split('・'),place,notes,sources,...extra});
add('west','西軍本戦','b','石田三成・宇喜多秀家・大谷吉継・小西行長・島津義弘・島清興・島津豊久','関ヶ原',['美濃へ集結。各将の移動日は要照合','大垣方面へ集結','大垣方面・前哨戦','大垣方面に在陣','関ヶ原で交戦し敗退。大谷吉継は戦死'],['sekigaharaMap','campaignRoster']);
add('east','東軍本戦','a','徳川家康・松平忠吉・黒田長政・藤堂高虎・浅野幸長・井伊直政・本多忠勝・福島正則・細川忠興・織田長益・池田輝政・加藤嘉明・京極高知・田中吉政・筒井定次・金森長近・生駒一正・山内一豊・有馬豊氏','関ヶ原',['会津方面から西へ。部隊ごとの出発日は要照合','東海道を西進。家康本隊と先鋒は別行動','先鋒が岐阜を攻略。家康はまだ関ヶ原にいない','美濃へ集結。諸将の到着日は要照合','本戦・後方配置を各将ごとに表示'],['sekigaharaMap','campaignRoster']);
add('nangu','南宮山方面','b','毛利秀元・長宗我部盛親・安国寺恵瓊','南宮山',['伊勢・美濃方面。個別日程は要照合','伊勢・美濃方面','南宮山方面へ','南宮山方面に在陣','本戦に進出せず、のちに撤退'],['sekigaharaMap']);
add('turn','東軍への加担','b','小早川秀秋・脇坂安治・朽木元綱・赤座直保・小川祐忠','松尾山・山中',['西軍参加。五人の移動経路は同一ではない','小早川秀秋は伏見攻めに参加','美濃方面へ','松尾山・山中方面へ','本戦では東軍に加担。時刻には異説'],['sekigaharaMap','campaignRoster'],{turn:true});
add('secret','東軍に内応','b','吉川広家','南宮山',['毛利軍と行動','毛利軍と行動','東軍との交渉（詳細な日程は要照合）','南宮山方面','毛利軍の前面に在陣。本戦で東軍と交戦せず'],['sekigaharaMap','campaignRoster']);
add('osaka','大坂城の西軍首脳','b','毛利輝元','大坂城',['大坂城に入る','大坂城に在城','大坂城に在城','大坂城に在城','関ヶ原本戦にはいない'],['campaignRoster']);
add('uedaWest','上田城の守備','b','真田昌幸・真田信繁','上田城',['徳川側と分かれ、上田方面へ','上田方面で守備を準備','上田方面で守備を準備','秀忠軍と対峙','上田方面。関ヶ原本戦には不在'],['ueda']);
add('uedaEast','中山道軍','a','徳川秀忠・榊原康政・仙石秀久・真田信幸','中山道・上田',['西進前・出発日は各隊未照合','中山道へ','中山道を西進','上田で真田方と対峙','関ヶ原決戦に間に合わず'],['ueda','campaignRoster']);
add('aizu','会津本隊','b','上杉景勝','会津',['会津方面の防備','会津方面の防備','会津方面の防備','奥羽の戦役を指揮','関ヶ原本戦には不在'],['campaignRoster']);
add('naoe','最上領への進攻','b','直江兼続','長谷堂・最上領',['上杉方で防備','上杉領で準備','最上領への進攻前','最上領へ進攻','長谷堂方面で交戦中。西軍敗報後に撤退'],['hasedo']);
add('honjo','福島城の守備','b','本庄繁長','福島城',['福島城で伊達方に備える','福島城の守備','福島城の守備','福島城の守備','伊達方に対峙。松川合戦の時点は別途考証'],['fukushima']);
add('mogami','最上方','a','最上義光','山形・長谷堂',['上杉方に備える','上杉方に備える','最上領の守備','最上領の守備','直江軍と交戦'],['hasedo']);
add('date','伊達方','a','伊達政宗','奥羽・対上杉戦線',['対上杉戦線','対上杉戦線','対上杉戦線','対上杉戦線','関ヶ原本戦には不在。正確な日別所在地は未照合'],['fukushima']);
add('hideyasu','関東の押さえ','a','結城秀康','宇都宮',['上杉方への備え','宇都宮で対上杉防備','宇都宮で対上杉防備','宇都宮で対上杉防備','関ヶ原本戦には不在'],['hideyasu']);
add('otsuWest','大津城攻撃軍','b','毛利元康・立花宗茂','大津',['大津攻城前・日別所在地は未照合','大津攻城前・日別所在地は未照合','大津攻城前','大津方面へ','大津攻城・開城。関ヶ原本戦には不在'],['otsu','campaignRoster']);
add('otsuEast','大津城守備軍','a','京極高次','大津城',['大津方面','大津方面','大津方面','籠城へ','開城。本戦には不在'],['otsu']);
add('tanabeWest','田辺城攻撃軍','b','小野木重次・織田信包・前田茂勝・小出吉政','田辺城周辺',['田辺城を包囲','田辺城を包囲','田辺城を包囲','和議・開城へ','田辺の攻城は終了。本戦への瞬間移動はさせない'],['tanabe','campaignRoster']);
add('tanabeEast','田辺城守備軍','a','細川幽斎','田辺城',['籠城','籠城','籠城','和議・開城へ','開城後。本戦には不在'],['tanabe']);
add('gifu','美濃の守備','b','織田秀信','岐阜城',['美濃の守備','美濃の守備','旧暦8月23日に降伏','降伏後・本戦不参加','降伏後・本戦不参加'],['gifu']);
add('fushimi','伏見城守備軍','a','鳥居元忠・内藤家長・内藤元長・松平家忠・松平近正','伏見城',['籠城','落城・戦死','戦死後','戦死後','戦死後'],['fushimiCity','fushimiNaito']);
for(const name of ['関ヶ原の戦い','伏見城の戦い'])TK.BATTLES[name].campaign='sekigahara';
// 別戦線にも城と参加将を表示。復元できない輪郭は「記号」と明示する。
const siege=(name,place,at,namesA,namesB,sources,feats)=>{
 const units=[];namesA.split('・').forEach((g,i)=>units.push(u('a'+i,g,'a',.15+i*.12,.78,{role:'攻城側・攻め口未確定'})));
 namesB.split('・').forEach((g,i)=>units.push(u('b'+i,g,'b',.47+i*.13,.34,{role:'籠城側・担当曲輪未確定'})));
 TK.BATTLES[name]={place,at,units,feats:[...feats,{k:'castle',n:place+'（城記号）',x:.6,y:.42,s:3}],sides:{a:{clan:'unknown',n:'攻城側',tr:'総兵数要照合'},b:{clan:'unknown',n:'籠城側',tr:'総兵数要照合'}},sources,campaign:'sekigahara',layoutStatus:'sourced-schematic',minWidth:680,aspect:.7,dur:35,noClashPull:true,mapNote:'公的資料の地形・参加者に基づく位置関係図。城の形・陣地・移動経路は未復元。城記号は縄張図ではない。',beats:[[0,place+'をめぐる別戦線。城内外の武将を別々に示す。'],[100,'この部隊が関ヶ原本戦へ参加したことを意味しない。戦役全体で所在を確認できる。']]};
};
siege('大津城の戦い','大津城','kannonji','毛利元康・立花宗茂','京極高次',['otsu','campaignRoster'],[{k:'lake',n:'琵琶湖',pts:[[0,0],[1,0],[1,.75],[.73,.57],[.67,.34],[.43,.23],[0,.19]]}]);
siege('第二次上田合戦','上田城','toishi','徳川秀忠・榊原康政・仙石秀久・真田信幸','真田昌幸・真田信繁',['ueda','campaignRoster'],[{k:'river',n:'千曲川（城南）',w:6,pts:[[0,.66],[.3,.63],[.6,.63],[1,.7]]}]);
siege('田辺城の戦い','田辺城','tango','小野木重次・織田信包・前田茂勝・小出吉政','細川幽斎',['tanabe','tanabeShape','campaignRoster'],[{k:'sea',n:'海',pts:[[0,0],[1,0],[1,.16],[0,.16]]},{k:'river',n:'高野川',pts:[[.22,1],[.25,.5],[.2,.16]]},{k:'river',n:'伊佐津川',pts:[[.83,1],[.85,.5],[.82,.16]]},{k:'marsh',pts:[[.3,.62],[.75,.62],[.76,.86],[.3,.86]]}]);
siege('長谷堂城の戦い','長谷堂城','yamagata','直江兼続','志村光安',['hasedo'],[{k:'hill',n:'独立丘陵',x:.6,y:.4,r:.24,ratio:.8}]);
TK.BATTLES['大津城の戦い'].sources.push('otsuTime');
TK.BATTLES['大津城の戦い'].feats.push({k:'hill',n:'長等山（南西）',x:.22,y:.65,r:.14});
TK.BATTLES['第二次上田合戦'].sources.push('uedaShape');
TK.BATTLES['第二次上田合戦'].feats.push({k:'river',n:'矢出沢川',pts:[[.18,.65],[.23,.15],[.45,.12],[.8,.15]]});
TK.BATTLES['第二次上田合戦'].beats[1]=[100,'小規模な衝突と対峙を経て秀忠軍は西上した。後世の軍記にいう大規模な撃滅戦を、そのまま確定した史実とはしない。'];
TK.BATTLES['長谷堂城の戦い'].sources.push('hasedoTime','hasedoMuseum','hasedoTerrain');
const hasedo=TK.BATTLES['長谷堂城の戦い'];hasedo.units[0].path=[[0,.22,.22],[60,.3,.26],[85,.22,.22],[100,.12,.7]];hasedo.units[0].clan='nagao';hasedo.units[0].role='菅沢山本陣・敗報後に撤退';hasedo.units[1].clan='mogami';hasedo.feats[0].r=.13;hasedo.feats[0].ratio=1.67;hasedo.feats.push({k:'hill',n:'菅沢山・直江本陣',x:.22,y:.18,r:.12,ratio:.8});hasedo.mapNote='山形市の地形解説に基づく位置関係図。長谷堂城は南北に長い丘陵、直江本陣は北西の菅沢山。部隊の正確な座標・撤退経路は未復元。';
const Cmp=TK.CAMPAIGN_API={
 stageAt(t){const c=C.sekigahara;let i=-1;c.dates.forEach((d,j)=>{if(G.evT({d})<=t)i=j;});return i;},
 rows(stage){return C.sekigahara.groups.flatMap(g=>g.names.map(name=>({name,group:g.title,place:g.place,side:g.turn&&stage===4?'a':g.side,status:g.notes[Math.max(0,Math.min(4,stage))],sources:g.sources})));}
};
})();
