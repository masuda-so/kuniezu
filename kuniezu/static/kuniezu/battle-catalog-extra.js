"use strict";
/* 題名の正規表現から漏れていた戦役・籠城・海戦を、同じ表示台帳へ登録する。 */
(function(){
 const sources={
  extraNumata:['沼田市','沼田城真田氏関係年表','https://www.city.numata.gunma.jp/kanko/1004186/1004286/sanada/1001161.html','永禄3年（1560）','1560年の越山と沼田。翌年の小田原攻囲の10万人を流用しない。'],
  extraKannonji:['近江八幡市','近世都市の先駆け 六角・信長・秀次の城と城下','https://www.city.omihachiman.lg.jp/material/files/group/102/kanren004.pdf','観音寺城と1568年の侵攻','六角領への侵攻と上洛の関係。各城の占領日を一日へ丸めない。'],
  extraKanegasaki:['敦賀市','金ヶ崎周辺の特性','https://www.city.tsuruga.lg.jp/about_city/plan/toshi_keikaku/kanagasaki_syuhen/kanagasaki_syuhen/tsuruganosutarujiamu.files/0000035574.pdf','元亀元年・信長と秀吉の撤退','金ヶ崎の殿と退却。全軍の通過道の測量復元ではない。'],
  extraAsakura:['福井県立一乗谷朝倉氏遺跡博物館','音声ガイドマップ','https://asakura-museum.pref.fukui.lg.jp/voiceguide/jp','元亀争乱・天正元年8月','刀根坂での敗北、一乗谷の焼亡、大野での義景の最期を区別。'],
  extraBichu:['高梁市','地名をあるく39 川面','https://www.city.takahashi.lg.jp/site/koho/chimeioaruku039.html','備中兵乱記、寺山城','寺山城と松山城、毛利方の陣。記事内にも日付の差があるため各日の布陣を断定しない。'],
  extraOtate:['上越市','歴史博物館常設展示資料','https://www.city.joetsu.niigata.jp/uploaded/attachment/141455.pdf','越後の都・御館の乱','直江津の御館と春日山。後の総構を謙信在世時へ遡らせない。'],
  extraMiki:['三木市','国指定史跡 三木城跡及び付城跡・土塁','https://www.city.miki.lg.jp/site/mikirekishishiryokan/26531.html','1578年3月〜1580年1月17日、最終攻勢','三木城・平井山の包囲と長治らの自害。'],
  extraIga:['伊賀市','伊賀の歴史文化','https://www.city.iga.lg.jp/cmsfiles/contents/0000000/990/1.pdf','天正9年9月の伊賀攻め','信長公記と後世の伊乱記・三国地志を区別。方面別の精密な軍列は未復元。'],
  extraTottori:['鳥取市','国指定史跡 史跡鳥取城跡附太閤ヶ平','https://www.city.tottori.lg.jp/page/6234.html','戦国の山城と江戸期の山麓城郭','鳥取城と包囲側拠点。現在の山麓石垣・城門は戦国期と別。'],
  extraWakamiko:['韮崎市','新府城と徳川家康','https://www.city.nirasaki.lg.jp/soshikiichiran/kyoikuka/bunkazaitanto/sinnpu/1497.html','天正壬午の乱・新府城の再利用','自焼後の新府城が家康の陣地として再利用された経過。'],
  extraHansan:['趙成都／韓国学中央研究院','한산도대첩（閑山島大捷）','https://encykorea.aks.ac.kr/Article/E0061676','見乃梁から閑山島前面の海域への誘出','李舜臣・李億祺・元均と脇坂。鶴翼の形や船間隔の測量復元ではない。'],
  extraMyeongnyang:['韓国学中央研究院','이순신（李舜臣）','https://encykorea.aks.ac.kr/Article/E0044900','1597年旧暦9月16日・鳴梁','珍島と本土の間の海峡。13隻説と12隻説、潮流の時刻を区別。'],
  extraNoryang:['趙成都／韓国学中央研究院','노량해전（露梁海戦）','https://encykorea.aks.ac.kr/Article/E0012716','1598年旧暦11月18〜19日','南海島・河東間の海峡から観音浦、小西軍の別経路での撤退を区別。']
 };
 for(const [id,[author,title,url,locator,scope]] of Object.entries(sources))TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope,accessed:'2026-10-31'};
 const X={},add=(title,kind,geo,clans,labels,names,source,summary,groups)=>X[title]={kind,geo,clans,labels,names,source,summary,groups};
 const grp=(label,selector,point,precision='所在地の代表点・隊間隔は不詳')=>[label,selector,point,precision];
 add('長尾景虎の関東出兵','campaign',[139.04,36.69,45,'三国峠から沼田'],['nagao','hojo'],['長尾方','北条方'],[['長尾景虎'],['沼田城の北条方守備勢']],'extraNumata','1560年の越山・沼田進出を扱う。1561年小田原攻囲の大軍をこの場面へ移さない。',[grp('沼田方面へ長尾軍','*a',[139.036,36.646],'進攻地域の概略'),grp('沼田城の守備側','*b',[139.039,36.647])]);
 add('信長上洛','campaign',[136.02,35.05,75,'観音寺城から京'],['oda','rokkaku','ashikaga'],['織田・足利方','六角方'],[['織田信長','足利義昭'],['六角義賢','六角義治']],'extraKannonji','近江の六角領への侵攻から義昭を奉じた上洛までの地域図。全員が同時に観音寺城へ集結したとは扱わない。',[grp('近江から京への織田軍','extra-a-0',[136.16,35.14],'通過地域の概略'),grp('義昭・正確な同行位置未詳','extra-a-1',null),grp('観音寺城・六角方','*b',[136.171,35.146])]);
 add('金ヶ崎の退き口','campaign',[136.067,35.64,12,'金ヶ崎・敦賀'],['oda','tokugawa','asakura','azai'],['朝倉方','織田・徳川方'],[['朝倉方追撃軍'],['織田信長','木下秀吉','徳川家康']],'extraKanegasaki','金ヶ崎に残る殿軍と、すでに退却する本隊を分ける。追撃側の陣地は未詳。',[grp('金ヶ崎方面・殿','extra-b-1',[136.073,35.665]),grp('退却本隊・正確な時点位置未詳','extra-b-0 extra-b-2',null),grp('追撃側・位置未詳','*a',null)]);
 add('朝倉氏滅亡','campaign',[136.28,35.94,75,'刀根坂・一乗谷・大野'],['oda','asakura'],['織田方','朝倉方'],[['織田信長'],['朝倉義景']],'extraAsakura','刀根坂の敗北、一乗谷焼亡、大野での最期は別段階。図では一乗谷の所在と関係者を示す。',[grp('一乗谷方面・織田軍','*a',[136.294,35.999],'戦役中の到達地域'),grp('朝倉義景・敗走段階で所在が変わる','*b',null)]);
 add('備中兵乱','siege',[133.635,34.817,13,'備中松山・寺山城'],['mori','mimura'],['毛利方','三村方'],[['小早川隆景'],['三村元親']],'extraBichu','備中松山城と毛利方の寺山城方面の陣。個別持場は未詳。',[grp('松山城・三村方','*b',[133.622,34.809]),grp('毛利方・寺山城方面','*a',[133.632,34.854],'川面北方の概略地域')]);
 add('御館の乱','siege',[138.22,37.15,10,'春日山と御館'],['nagao','nagao','hojo'],['景虎方','景勝方'],[['上杉景虎'],['上杉景勝']],'extraOtate','謙信死後の争い。御館の景虎と春日山の景勝を分け、開始時点で翌年の決着を描かない。',[grp('御館・景虎方','*a',[138.236,37.169],'直江津・御館公園付近'),grp('春日山・景勝方','*b',[138.206,37.148])]);
 add('三木の干殺し','siege',[135.0,34.8,9,'三木城と付城群'],['oda','bessho','mori'],['羽柴・織田方','別所方'],[['羽柴秀吉','羽柴秀長'],['別所長治','別所友之','別所吉親']],'extraMiki','三木城と付城群による包囲。1578年からの長い攻囲を結末の一日と同一視しない。',[grp('三木城・別所方','*b',[134.988,34.799]),grp('羽柴方・持場は時期により変わる','*a',null)]);
 add('天正伊賀の乱','campaign',[136.145,34.715,30,'伊賀盆地'],['oda','iga'],['織田方','伊賀惣国一揆'],[['織田信雄'],['伊賀衆']],'extraIga','1581年の第二次侵攻。1579年の第一次侵攻と、後世の伊賀上野城を混同しない。',[grp('伊賀への侵攻・方面別位置未詳','*a',null),grp('伊賀衆・国中に点在','*b','center','国の代表点であり単一の本陣ではない')]);
 add('鳥取の渇え殺し','siege',[134.25,35.512,9,'久松山と太閤ヶ平'],['oda','mori','yamana'],['羽柴・織田方','鳥取城守備方'],[['羽柴秀吉'],['吉川経家']],'extraTottori','久松山の鳥取城と東の太閤ヶ平を分ける。淡路の支配移転を同じ戦闘として描かない。',[grp('鳥取城・吉川勢','*b',[134.238,35.513]),grp('太閤ヶ平・羽柴方','*a',[134.271,35.516])]);
 add('若神子の対陣','field',[138.425,35.765,11,'若神子と新府'],['hojo','tokugawa'],['北条方','徳川方'],[['北条氏直'],['徳川家康']],'extraWakamiko','若神子側の北条氏直と、新府城を再利用した家康の対峙。戦闘の突撃経路を追加しない。',[grp('若神子方面','*a',[138.424,35.795],'若神子の地域点'),grp('新府城の再利用','*b',[138.425240,35.735151])]);
 add('閑山島海戦','naval',[128.462,34.787,15,'閑山島・見乃梁'],['hashiba','joseon'],['朝鮮水軍','日本水軍'],[['李舜臣','李億祺','元均'],['脇坂安治']],'extraHansan','見乃梁から閑山島沖へ誘い出した海戦。艦隊の正確な隊列・船間隔は不詳。',[grp('閑山島前面・朝鮮水軍','*a',[128.452,34.779],'海戦海域の代表点'),grp('同海域・日本水軍','*b',[128.452,34.779],'交戦海域・個別艦位置不詳')]);
 add('鳴梁海戦','naval',[126.309,34.57,10,'鳴梁・珍島海峡'],['hashiba','joseon'],['日本水軍','朝鮮水軍'],[['藤堂高虎ら日本水軍'],['李舜臣']],'extraMyeongnyang','珍島と本土の間の鳴梁で交戦。潮位・艦の航跡と時刻を創作しない。',[grp('鳴梁・日本水軍','*a','center','海峡の代表点・艦隊の厳密位置不詳'),grp('鳴梁・朝鮮水軍','*b','center','海峡の代表点・艦隊の厳密位置不詳')]);
 add('露梁海戦','naval',[127.82,34.92,40,'露梁・観音浦・順天'],['hashiba','shimazu','ming','joseon'],['明・朝鮮連合水軍','日本水軍'],[['陳璘','李舜臣','鄧子龍','李英男','方徳龍'],['島津義弘','小西行長']],'extraNoryang','露梁での交戦・観音浦への追撃と、小西軍の別経路での撤退を区別。',[grp('露梁海域・明朝鮮水軍','*a',[127.866,34.939],'交戦海域の代表点'),grp('露梁海域・島津水軍','extra-b-0',[127.866,34.939],'交戦海域・艦隊の厳密位置不詳'),grp('順天から別経路で撤退','extra-b-1',null)]);
 TK.EXTRA_BATTLES=X;
 const build=G.buildBattleCatalog;
 G.buildBattleCatalog=function(){build();for(const [title,d] of Object.entries(X)){
  const sc=TK.BATTLES[title];if(!sc)throw Error('表示台帳への登録漏れ: '+title);
  sc.units=[];for(const [i,side] of ['a','b'].entries()){sc.sides[side].n=d.labels[i];sc.sides[side].tr='参加兵数未確定';for(const [j,n] of d.names[i].entries())sc.units.push({id:'extra-'+side+'-'+j,side,n,g:n,tr:0,path:[],role:'関係部隊・個別持場と兵数は不詳'});}
  sc.place=d.geo[3];sc.sources=[...new Set([...(sc.sources||[]),d.source])];sc.beats=[[0,d.summary],[100,'図の部隊は登録済みの関係者。全参加者や日別の移動を確定した図ではありません。']];sc.calendar=[[0,'地勢と両軍の配置'],[100,'記録の確認・終了']];
 }};
})();
