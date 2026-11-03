"use strict";
/* 出典のある改訂を、旧データと区別して管理する。座標は模式化した編集値。 */
(function(){
const sources=TK.BATTLE_SOURCES={
 fushimiCity:{title:'京都市歴史資料館「伏見城」',url:'https://www2.city.kyoto.lg.jp/somu/rekishi/fm/nenpyou/htmlsheet/toshi20.html',scope:'指月城と木幡山城の区別、城郭の変遷・曲輪。個々の守将の担当曲輪までは確定しない。'},
 fushimiNaito:{title:'明治大学博物館 Museum Eyes 67「譜代大名内藤家と戦」',url:'https://www.meiji.ac.jp/museum/6t5h7p00000lwns6-att/museumeyes67.pdf',scope:'内藤家文書・関ヶ原合戦画巻と伏見戦記、鳥居元忠・内藤家長父子、落城の経過。'},
 sekigaharaMap:{title:'大垣市「関ヶ原合戦と島津の退き口」2頁・布陣図',url:'https://www.city.ogaki.lg.jp/cmsfiles/contents/0000042/42898/map.pdf',scope:'通説的な本戦の参加将・布陣・退却経路。数値と戦闘時刻には異説がある。'},
 sekigaharaStudy:{title:'白峰旬「関ヶ原の戦いの布陣図に関する考察」',url:'https://repo.beppu-u.ac.jp/modules/xoonips/download.php/gk01504.pdf?file_id=10386',scope:'後世の布陣図の系統と史料上の限界。アニメーションの分刻みの根拠ではない。'},
 osakaMuseum:{title:'大阪城天守閣「大坂の陣ゆかりの地マップ」',url:'https://www.osakacastle.net/pdf/leaflet/yukari-osakanojin_202506.pdf',scope:'冬・夏の区別、陣跡と合戦の日付。'},
 osakaStructure:{title:'松尾信裕「『諸国古城之図』所収『摂津真田丸』図の再検討」',url:'https://www.osakamushis.jp/education/publication/kenkyukiyo/pdf/no15/pdf15_07.pdf',scope:'大阪歴史博物館研究紀要15（2017）53–66頁。総構と南堀、真田丸諸図の相違。輪郭は一意に復元できない。'},
 osakaArchive:{title:'国立公文書館「大坂冬の陣」',url:'https://www.archives.go.jp/exhibition/digital/ieyasu/contents5_04/',scope:'包囲・和睦の推移。和睦妥結と攻撃停止・堀埋めを区別する。'},
 osakaMap:{title:'岐阜県歴史資料館「大坂冬夏の陣配置図」',url:'https://www.pref.gifu.lg.jp/page/350573.html',scope:'江戸時代の配置図。冬・夏の記号を区別して読む必要がある。'},
 otsu:{title:'大津市歴史博物館「大津城の復元」',url:'https://www.rekihaku.otsu.shiga.jp/museum/note/note09.html',scope:'京極高次の籠城と毛利軍、琵琶湖に面した水城と三重の堀。'},
 ueda:{title:'上田市「上田城の歴史」',url:'https://www.city.ueda.nagano.jp/site/uedajo/123940.html',scope:'昌幸・信繁父子の籠城、秀忠軍の足止め。本戦には不在。'},
 tanabe:{title:'京都府観光連盟「田辺城」',url:'https://www.kyoto-kankou.or.jp/kizuna/tanabe.html',scope:'細川幽斎の籠城。攻め手個々の配置・移動日は未照合。'},
 tanabeShape:{title:'舞鶴市「歴史文化基本構想・文化財保存活用地域計画」',url:'https://www.city.maizuru.kyoto.jp/kyouiku/cmsfiles/contents/0000008/8797/maizuru_chiikikeikaku.pdf',scope:'田辺城の東西の河川、北の海、南の湿地。'},
 hasedo:{title:'山形市「長谷堂城跡を探検してみよう」',url:'https://www.city.yamagata-yamagata.lg.jp/_res/projects/default_project/_page_/001/004/495/marugoto-2-4.pdf',scope:'長谷堂城の独立丘陵と最上・直江両軍。'},
 hideyasu:{title:'結城市「結城家18代・結城秀康」',url:'https://www.city.yuki.lg.jp/kankou/history/page008693.html',scope:'宇都宮で上杉勢に備えた。本戦参加者と区別。'},
 gifu:{title:'岐阜県歴史資料館「織田秀信禁制 写」',url:'https://www.pref.gifu.lg.jp/page/350364.html',scope:'岐阜城主織田秀信の西軍参加と旧暦8月23日の降伏。'}
};
const unit=(id,g,side,x,y,extra={})=>({id,g,n:g,side,clan:'unknown',tr:0,arm:'yari',path:[[0,x,y]],...extra});
const ring=(k,n,pts,x,y,w)=>({k,n,pts,x,y,w});
TK.BATTLES['伏見城の戦い']={date:'慶長5年7月19日～8月1日（1600年8月27日～9月8日）',place:'山城国・木幡山伏見城',at:'kyo',dur:55,aspect:.78,minWidth:680,noClashPull:true,
 layoutStatus:'sourced-schematic',sources:['fushimiCity','fushimiNaito'],mapNote:'木幡山の城と宇治川・城下の位置関係を描いた概略図。曲輪輪郭、各隊の攻め口と移動線は未復元。守将を特定の曲輪担当と断定しない。',
 sides:{a:{clan:'ishida',n:'西軍・攻城側',tr:'総兵数に異説'},b:{clan:'tokugawa',n:'徳川方・籠城側',tr:'約2,300（通説）'}},
 calendar:[[0,'7月19日・攻撃開始'],[25,'7月下旬・包囲'],[72,'8月1日・城内の戦闘'],[100,'8月1日・落城']],eventDate:[1600,9,8],
 feats:[{k:'hill',x:.65,y:.34,r:.28,ratio:.85,n:'木幡山'},{k:'river',w:6,n:'宇治川（流路概略）',pts:[[0,.85],[.25,.9],[.52,.88],[.8,.94],[1,.88]]},
 {k:'road',n:'伏見城下',pts:[[.1,0],[.15,.3],[.2,.65],[.28,.85]]},
 ring('enclosure','外郭',[[.34,.22],[.44,.12],[.75,.14],[.86,.3],[.83,.63],[.62,.73],[.37,.62]],.8,.25),
 ring('moat','堀',[[.34,.22],[.44,.12],[.75,.14],[.86,.3],[.83,.63],[.62,.73],[.37,.62]],.83,.61,7),
 ring('enclosure','二の丸',[[.47,.26],[.68,.24],[.75,.4],[.69,.54],[.45,.51]],.66,.28),
 ring('enclosure','本丸',[[.54,.32],[.67,.33],[.68,.45],[.54,.45]],.61,.39),
 ring('enclosure','松の丸',[[.39,.52],[.56,.53],[.55,.64],[.4,.6]],.47,.59),
 {k:'village',n:'城下町',x:.17,y:.64}],
 units:[unit('ukita','宇喜多秀家','a',.2,.35,{clan:'ukita',role:'攻城軍',path:[[0,.14,.3],[35,.25,.33],[88,.36,.4]]}),
 unit('hideaki','小早川秀秋','a',.88,.65,{role:'攻城軍・到着日に異説',path:[[0,.95,.75],[35,.88,.65],[90,.78,.57]]}),
 unit('shimazu','島津義弘','a',.22,.73,{clan:'shimazu',role:'攻城軍'}),
 unit('torii','鳥居元忠','b',.6,.48,{clan:'tokugawa',role:'留守居・籠城',die:96}),
 unit('naito','内藤家長','b',.72,.43,{clan:'tokugawa',role:'籠城',die:94}),
 unit('motonaga','内藤元長','b',.72,.53,{clan:'tokugawa',role:'籠城',die:94}),
 unit('ietada','松平家忠','b',.48,.43,{clan:'tokugawa',role:'籠城',die:93}),
 unit('chikamasa','松平近正','b',.47,.32,{clan:'tokugawa',role:'籠城・来歴の出典本文は未照合',die:93})],
 beats:[[0,'宇喜多秀家・小早川秀秋ら西軍が伏見城を攻める。城内では鳥居元忠・内藤家長父子・松平家忠らが迎え撃つ。'],[25,'西軍の攻城が続く。伏見に近い醍醐寺では、軍勢の乱妨を警戒して大住村から門番を呼び寄せた。'],[72,'松の丸の炎上と本丸への攻撃が伝えられる。'],[96,'旧暦8月1日、伏見城は落城。鳥居元忠、内藤家長・元長、松平家忠らが戦死した。']]};
// 関ヶ原の本戦：まとめられていた各将を分離。全軍の正確な位置の断定は避ける。
const sek=TK.BATTLES['関ヶ原の戦い'];
Object.assign(sek,{layoutStatus:'sourced-schematic',sources:['sekigaharaMap','sekigaharaStudy'],minWidth:940,aspect:.68,noClashPull:true,eventDate:[1600,10,21],mapNote:'大垣市公開図の通説的な位置関係に基づく概略配置。道・川・高まりは実測復元ではない。寝返りの時刻、開戦の順序、各将の細かな動きには異説がある。',calendar:[[0,'9月15日・布陣（通説）'],[15,'本戦の交戦'],[55,'小早川・四将の東軍加担（時刻に異説）'],[82,'西軍の敗退'],[100,'本戦後']]});
sek.units=sek.units.filter(u=>!['wakisaka','mori','ii','kuroda','todo','ikeda'].includes(u.id));
for(const u of sek.units){u.tr=0;if(u.id==='sakon'){delete u.die;u.role='島左近・最期に異説';}if(u.id==='kobayakawa'){u.role='西軍から東軍へ';u.turn=[55,'a'];}if(u.id==='mitsunari')delete u.fire;}
const local=[
 ['wakisaka','脇坂安治','b',.35,.78,'寝返り'],['kutsuki','朽木元綱','b',.29,.86,'寝返り'],['akaza','赤座直保','b',.19,.87,'寝返り'],['ogawa','小川祐忠','b',.39,.86,'寝返り'],
 ['mori','毛利秀元','b',.89,.72,'南宮山・不参戦'],['kikkawa','吉川広家','b',.83,.55,'東軍に内応・不参戦'],['ankokuji','安国寺恵瓊','b',.93,.59,'南宮山・不参戦'],['chosokabe','長宗我部盛親','b',.94,.88,'南宮山方面・不参戦'],
 ['ii','井伊直政','a',.48,.51,'本戦'],['tadayoshi','松平忠吉','a',.51,.57,'本戦'],['kuroda','黒田長政','a',.42,.17,'本戦'],['hosokawa','細川忠興','a',.49,.22,'本戦'],['todo','藤堂高虎','a',.49,.75,'本戦'],['kyogoku','京極高知','a',.58,.78,'本戦'],['asano','浅野幸長','a',.79,.32,'後方'],['ikeda','池田輝政','a',.88,.38,'後方'],['yuraku','織田長益','a',.46,.31,'本戦'],['kato','加藤嘉明','a',.53,.37,'本戦'],['tsutsui','筒井定次','a',.59,.26,'本戦'],['tanaka','田中吉政','a',.57,.15,'本戦'],['kanamori','金森長近','a',.64,.35,'本戦'],['ikoma','生駒一正','a',.64,.43,'本戦'],['yamauchi','山内一豊','a',.75,.18,'後方'],['arima','有馬豊氏','a',.69,.1,'後方'],['hiratsuka','平塚為広','b',.12,.71,'大谷勢'],['toda','戸田勝成','b',.13,.79,'大谷勢'],['toyo','島津豊久','b',.21,.37,'島津勢'],['gamo','蒲生備中','b',.2,.28,'石田勢・実名の比定は未確認']
];
for(const [id,g,side,x,y,role] of local){const u=unit(id,g,side,x,y,{role});if(role==='寝返り'){u.turn=[61,'a'];u.path.push([60,x,y],[78,.27+(x-.3)*.3,.76+(y-.8)*.4]);}else if(role==='本戦'&&x<.65)u.path.push([35,x-.09,y],[80,x-.13,y]);if(g==='井伊直政'){u.path.push([90,.5,.54],[100,.68,.68]);}sek.units.push(u);}
sek.beats=[[0,'本戦の布陣。大坂・上田・大津・田辺・奥羽・宇都宮の部隊は「戦役全体」で確認できる。'],[15,'関ヶ原の西軍と東軍が交戦する。開始時刻や先陣争いの細部には異説がある。',['fukushima','ukita']],[30,'石田・宇喜多・小西・大谷らの隊が戦う。南宮山方面の諸隊は本戦へ進出しなかった。',['kuroda','mitsunari']],[44,'吉川広家は東軍と交渉していた。内応と実際の攻撃参加を区別する。'],[55,'小早川秀秋が東軍に加担。「問鉄砲」と正確な転向時刻は確定した史実として再生しない。',['kobayakawa','otani']],[61,'脇坂・朽木・赤座・小川の四将も東軍側へ。四人を個別に表示する。',['wakisaka','otani']],[78,'西軍が敗退。大谷吉継は戦死し、三成らは戦場を離れる。'],[88,'島津勢は敵中を突破して退却。線は伝承に基づく方向を示す。',['shimazu','ii']],[100,'本戦終了。別戦線の戦闘や帰還は、この半日の再生には混ぜない。']];
// 大坂冬の陣。図の輪郭は史料図の特徴を整理した編集値で、測量値ではない。
const os=TK.BATTLES['大坂冬の陣'];
Object.assign(os,{layoutStatus:'sourced-schematic',sources:['osakaMuseum','osakaStructure','osakaArchive','osakaMap'],minWidth:860,aspect:.85,dur:70,noClashPull:true,eventDate:[1615,1,18],date:'慶長19年11月～12月19日（1614年末～1615年1月18日）',mapNote:'本丸・二の丸・三の丸・総構と南堀を区別。『僊台武鑑』図等を照合した概略図で、真田丸の輪郭・接続には異説がある。各将の厳密な陣地境界は未復元。',calendar:[[0,'11月19日・木津川口'],[22,'11月26日・鴫野・今福'],[46,'12月4日・真田丸'],[66,'12月6日以降・包囲と交渉'],[100,'12月19日・和睦妥結']]});
os.feats=[
 {k:'sea',n:'大坂湾',pts:[[0,.25],[.09,.27],[.12,.56],[.07,.76],[.1,1],[0,1]]},
 {k:'river',w:7,n:'淀川',pts:[[.12,.17],[.34,.12],[.55,.12],[.76,.08],[1,.06]]},
 {k:'river',w:4,n:'木津川',pts:[[.23,.18],[.2,.38],[.18,.6],[.12,.8],[.15,1]]},
 {k:'river',w:4,n:'平野川',pts:[[.88,.1],[.89,.32],[.87,.48],[.92,.66],[1,.73]]},
 ring('enclosure','総構内',[[.3,.19],[.51,.18],[.52,.15],[.77,.15],[.83,.25],[.82,.6],[.75,.66],[.56,.67],[.48,.63],[.3,.65]],.36,.33),
 ring('moat','総構堀',[[.3,.19],[.51,.18],[.52,.15],[.77,.15],[.83,.25],[.82,.6],[.75,.66],[.56,.67],[.48,.63],[.3,.65]],.4,.66,9),
 {k:'dryMoat',n:'南面の空堀',closed:false,pts:[[.3,.65],[.48,.63],[.56,.67],[.63,.67]],x:.43,y:.67,w:9},
 ring('enclosure','三の丸',[[.48,.24],[.74,.23],[.78,.4],[.75,.56],[.55,.58],[.49,.52]],.62,.54),
 ring('moat','外堀',[[.51,.25],[.7,.24],[.77,.34],[.73,.48],[.52,.48]],.73,.46,8),
 ring('enclosure','二の丸',[[.52,.26],[.69,.26],[.74,.34],[.71,.46],[.53,.46]],.58,.44),
 ring('moat','内堀',[[.58,.28],[.66,.28],[.68,.39],[.57,.39]],.68,.29,6),
 ring('enclosure','本丸',[[.59,.29],[.65,.29],[.66,.38],[.58,.38]],.62,.335),
 ring('enclosure','真田丸',[[.65,.69],[.72,.68],[.76,.71],[.75,.77],[.69,.79],[.64,.75]],.7,.75),
 {k:'dryMoat',n:'真田丸の空堀',x:.76,y:.81,closed:false,pts:[[.64,.69],[.62,.75],[.67,.81],[.76,.8],[.79,.73]],w:6},
 {k:'hill',n:'茶臼山',x:.41,y:.91,r:.055},{k:'hill',n:'岡山',x:.88,y:.85,r:.06},
 {k:'road',n:'上町台地',pts:[[.54,.68],[.54,.82],[.53,1]]},{k:'village',n:'四天王寺',x:.56,y:.89},{k:'village',n:'鴫野',x:.94,y:.26},{k:'village',n:'今福',x:.96,y:.17}];
os.units=[
 unit('hideyori','豊臣秀頼','b',.62,.34,{clan:'hashiba',role:'大坂城内'}),unit('sanada','真田信繁','b',.7,.74,{clan:'sanada',role:'真田丸',arm:'teppo',fire:[46,60],fireTarget:'maeda'}),
 unit('ono','大野治長','b',.61,.48,{clan:'hashiba',role:'城内'}),unit('kimura','木村重成','b',.79,.36,{clan:'hashiba',role:'東方面・救援',path:[[0,.77,.4],[22,.84,.3],[38,.78,.4]]}),
 unit('goto','後藤基次','b',.77,.52,{clan:'hashiba',role:'今福方面・救援',path:[[0,.76,.52],[24,.87,.2],[38,.76,.52]]}),unit('chosokabe','長宗我部盛親','b',.56,.63,{clan:'chosokabe',role:'総構南面'}),
 unit('ieyasu','徳川家康','a',.41,.91,{role:'茶臼山（12月6日以降）',from:66}),unit('hidetada','徳川秀忠','a',.88,.85,{role:'岡山本陣（包囲期）',from:40}),
 unit('maeda','前田利常','a',.74,.9,{role:'真田丸方面',path:[[0,.78,.96],[45,.72,.84],[60,.74,.9]],fire:[46,58],fireTarget:'sanada',arm:'teppo'}),
 unit('ii','井伊直孝','a',.63,.89,{role:'南面攻撃',path:[[0,.63,.95],[46,.62,.77],[61,.63,.89]]}),unit('matsudaira','松平忠直','a',.56,.79,{role:'南面攻撃'}),
 unit('date','伊達政宗','a',.29,.85,{clan:'date',role:'南西方面'}),unit('uesugi','上杉景勝','a',.94,.36,{clan:'nagao',role:'鴫野攻め'}),unit('satake','佐竹義宣','a',.94,.13,{clan:'satake',role:'今福攻め'}),
 unit('hachisuka','蜂須賀至鎮','a',.16,.59,{role:'木津川口・博労淵方面'}),unit('todo','藤堂高虎','a',.93,.96,{role:'包囲軍・個別陣地未確定'}),unit('asano','浅野長晟','a',.16,.95,{role:'包囲軍・個別陣地未確定'})];
os.beats=[[0,'木津川口の戦闘。城外の砦と水運の要所をめぐって戦う。'],[22,'鴫野では上杉勢、今福では佐竹勢が攻撃。木村・後藤らが救援する。'],[46,'真田丸への攻撃。前田・井伊・松平勢と真田勢を個別に示す。射線は陣営別の色と線種。',['maeda','sanada']],[66,'家康は茶臼山に本陣を移す。包囲・砲撃と和睦交渉が続く。'],[100,'旧暦12月19日に和睦妥結。攻撃停止、誓紙交換、堀埋めは別の段階であり、冬の陣の途中に夏の突撃は表示しない。']];
TK.battleUnit=unit;
})();
