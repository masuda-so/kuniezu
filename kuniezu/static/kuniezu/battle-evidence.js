"use strict";
/* 参加の確認と、図上の位置の確認を分ける。旧模式座標を史料の座標として再利用しない。 */
(function(){
 const add=(id,author,title,url,locator,scope,year='刊年未詳')=>TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope,year,accessed:'2026-10-31'};
 add('fushimiDiary','京田辺市市史編さん室（監修：野田泰三）','近世初期の大住村（2）：関ヶ原の戦いと大住村','https://www.city.kyotanabe.lg.jp/0000023491.html','「伏見城の戦いと大住村」／義演准后日記に基づく解説','攻撃期間と宇喜多秀家・小早川秀秋。個別の陣地は示さない。','2026年4月1日');
 add('fushimiLetter','林千寿','慶長五年の戦争と戦後領国体制の創出―九州地域を素材として―','https://kumadai.repo.nii.ac.jp/records/25421','日本歴史742号、本文「史料3」石田三成書状（真田昌幸・幸村宛）の引用','鈴木孫三郎が鳥居元忠を討ったという当時の報告。書状の報告内容と確定した戦闘経過は区別。','2010年3月');
 add('fushimiUdono','蒲郡市','松平家・徳川家・鵜殿家 年表','https://www.city.gamagori.lg.jp/uploaded/attachment/91664.pdf','1600年条','鵜殿氏次の伏見籠城・戦死。担当曲輪の根拠ではない。');
 add('fushimiSano','講談社','デジタル版 日本人名大辞典+Plus「佐野綱正」','https://kotobank.jp/word/佐野綱正-1079053','人物本文','伏見城の守備と旧暦7月29日の戦死。二次資料による確認。');
 add('sekigaharaGuide','岐阜県・岐阜関ケ原古戦場記念館','関ケ原合戦ガイドマップ 決戦編','https://sekigahara.pref.gifu.lg.jp/wp/wp-content/uploads/2024/03/a8fd5bc45fff52ca3707e4149652f5e8.pdf','1頁「参戦武将」「ドキュメント関ケ原合戦」、2頁史跡地図','参加者と通説の陣地を照合。分単位の移動・兵数を確定値として採用しない。');
 const defs=[
 ['小田原城の戦い','odawara1561','小田原城総合管理事務所','小田原城の歴史年表','https://odawaracastle.com/history/nenpyo/index.html','1561年条','長尾景虎による攻城。1590年の総構を1561年の城として描かない。','長尾景虎|北条氏康・氏政'],
 ['森部の戦い','moribeSite','岐阜県観光連盟','森部古戦場跡','https://www.kankou-gifu.jp/spot/detail_6691.html','史跡解説','美濃・森部での織田方の勝利。現地案内だけでは各隊の陣地を決められない。','織田信長|斎藤方'],
 ['第二次国府台合戦','konodaiSite','市川市','里見公園・国府台城跡','https://www.city.ichikawa.lg.jp/page/4175.html','国府台合戦の解説','江戸川東岸の台地で里見・北条が交戦。戦後は北条氏の支配が及ぶ。','北条氏康・氏政|里見義弘'],
 ['箕輪城落城','minowaSite','高崎市','箕輪城跡','https://www.city.takasaki.gunma.jp/site/cultural-assets/6450.html','沿革・城の規模','1566年に武田方が攻略。現在の井伊期遺構を長野氏の城へ遡らせない。','武田信玄|長野業盛'],
 ['三増峠の戦い','mimaseSite','愛川町','三増合戦場碑','https://www.town.aikawa.kanagawa.jp/sports_bunka/bunka/bunkazaihogo/bunkazai/6763.html','合戦の経過','小田原から帰還中の武田軍に北条軍が攻撃。武田の別働隊が背後へ回ったとされる。','武田信玄|北条氏照・氏邦'],
 ['木崎原の戦い','kizakiSite','えびの市','木崎原古戦場','https://www.city.ebino.lg.jp/soshiki/shakaikyoiku/5/896.html','旧暦5月3〜4日の経過','伊東軍の加久藤城攻撃後に木崎原へ展開。伊東義祐を現地の指揮官として置かない。','島津義弘|伊東祐安'],
 ['小谷城落城','odaniSite','長浜市長浜城歴史博物館','長浜城の歴史','https://nagahama-rekihaku.jp/highlight/nagahama-castle','小谷城落城と秀吉の領有','小谷落城・浅井長政の死と秀吉の領有を確認。長浜城への移転は別段階。','織田信長・羽柴秀吉|浅井長政'],
 ['七尾城の戦い','nanaoSite','七尾市','七尾城跡','https://www.city.nanao.lg.jp/syougai/nanaojoushi.html','七尾城の歴史・散策ガイド','305mの山と複数の尾根に広がる城。1577年の落城と後の小丸山移転を区別。','上杉謙信|畠山方'],
 ['有岡城の戦い','ariokaSite','伊丹市','有岡城跡','https://www.city.itami.lg.jp/SOSIKI/TOSHIKATSURYOKU/BUNKA/bunnkazai/SINAI_BUNKAZAI/KUNI_SITEI/1386843388423.html','城跡の解説・総構','伊丹段丘東側の総構。北の岸砦・西の上臈塚・南の鵯塚と主郭を区別する。','織田信長|荒木村重'],
 ['高天神城の戦い','takatenjinSite','掛川市','高天神城跡','https://www.city.kakegawa.shizuoka.jp/gyosei/docs/8328.html','城の構造・落城の経過','東西の峰を持つ山城。1580年の包囲と1581年旧暦3月22日の岡部元信らの出撃・落城を分ける。','徳川家康|岡部元信'],
 ['備中高松城の水攻め','takamatsuSite','岡山市','備中高松城','https://www.city.okayama.jp/kurashi/0000008989.html','水攻め・和議の解説','水攻めののち旧暦6月4日に清水宗治が切腹して和議。堤の全線や水位には復元上の問題がある。','羽柴秀吉|清水宗治'],
 ['人取橋の戦い','hitotoribashiSite','本宮市','人取橋古戦場','https://www.city.motomiya.lg.jp/site/kanko/230-1.html','古戦場の案内','1585年の合戦地。現在の史跡標示と当日の各隊の配置は区別する。','伊達政宗|佐竹・蘆名などの連合軍']
 ];
 for(const [title,id,author,name,url,locator,scope] of defs)add(id,author,name,url,locator,scope);
 const build=G.buildBattleCatalog;
 G.buildBattleCatalog=function(){build();
  for(const [title,id,author,name,url,locator,scope,names] of defs){const s=TK.BATTLES[title];if(!s)continue;s.sources=[...new Set([...(s.sources||[]),id])];s.reviewNote=scope;s.evidenceScope='立地・経過の照合';
   // 勢力代表者の名を、出陣確認済みの隊の名と同一視しない。
   s.recordSides=names.split('|');
   // 兵数資料の A/B 順序に揃える。説明文の勝者順から左右を入れ替えない。
   if(['三増峠の戦い','木崎原の戦い','人取橋の戦い'].includes(title))s.recordSides.reverse();
  }
  const f=TK.BATTLES['伏見城の戦い'];f.sources=[...new Set([...f.sources,'fushimiDiary','fushimiLetter','fushimiUdono','fushimiSano'])];
  for(const [id,n,side,role,source] of [['suzuki','鈴木孫三郎（重朝）','a','三成書状に元忠討取の報告','fushimiLetter'],['udono','鵜殿氏次','b','籠城・戦死','fushimiUdono'],['sano','佐野綱正','b','籠城・旧暦7月29日に戦死とする辞典記載','fushimiSano']])if(!f.units.some(u=>u.id===id))f.units.push({id,n,g:n,side,clan:side==='a'?'ishida':'tokugawa',role,source,tr:0,arm:'yari',path:[]});
  f.relatedPeople=[{n:'石田三成',role:'政務・連絡。書状を送った事実から現地の攻め口は決めない。',source:'fushimiLetter'}];
  f.reviewNote='守備側の駒は、個々の持ち場が分からないため城内の代表点に置いています。西軍の攻城側は参加者一覧で確認できます。城郭図は豊臣期・徳川期の復原資料を参照した概略図です。';
  for(const u of f.units)u.source=u.source||(['ukita','hideaki'].includes(u.id)?'fushimiDiary':['torii','naito','motonaga'].includes(u.id)?'fushimiNaito':null);
  const sek=TK.BATTLES['関ヶ原の戦い'];sek.sources=[...new Set([...sek.sources,'sekigaharaGuide'])];
  for(const [side,names] of [['a',['竹中重門','加藤嘉明','田中吉政','筒井定次','京極高知','古田重勝','寺沢広高','金森長近','生駒一正','有馬豊氏','山内一豊']],['b',['島津豊久','大谷吉勝','木下頼継','平塚為広','戸田重政','蒲生備中','明石掃部','長束正家']]])for(const n of names)if(!sek.units.some(u=>(u.g||u.n)===n))sek.units.push({id:'roster-'+n,n,g:n,side,clan:side==='a'?'tokugawa':'ishida',role:'ガイドマップ記載・個別陣地は図示せず',source:'sekigaharaGuide',path:[],tr:0,arm:'yari'});
  add('todaAlias','岡崎市公開・福井県福井市の展示資料','戦国武将 戸田重政公','https://www.city.okazaki.lg.jp/_res/projects/default_project/_page_/001/003/430/kyapsyonn.pdf','「重政（勝成ともいう）」の人物解説','勝成・重政を別の参加将として二重計上しない。');
  sek.units=sek.units.filter(u=>u.id!=='roster-戸田重政');
  const toda=sek.units.find(u=>u.id==='toda');if(toda){toda.aliases=['戸田重政'];toda.role='大谷勢。資料では戸田重政とも記載';toda.source='todaAlias';}sek.sources=[...new Set([...sek.sources,'todaAlias'])];
  // 個別の位置データがない旧模式図は、比較用の二隊や架空の進軍を表示しない。
  for(const [title,s] of Object.entries(TK.BATTLES)){
   s.displayPolicy=title==='伏見城の戦い'?'castle-reference':title==='関ヶ原の戦い'?'site-map':'record';
   s.presentationNote=s.displayPolicy==='record'?'各隊の布陣・移動を確かめられないため、戦闘アニメーションは表示しません。':s.displayPolicy==='site-map'?'確認した陣跡を同じ縮尺で示します。その他の参加将は名簿に載せ、推測の陣地は割り当てません。':'城郭参考図に武将の持ち場を重ねません。';
   s.evidenceScope=s.evidenceScope||(s.sources?.length?'出典の範囲を参照':'旧データ・本文未照合');
   const row=TK.BATTLE_AUDIT?.find(r=>r.title===title);if(row){row.displayPolicy=s.displayPolicy;row.units=s.units.length;row.sourceIds=s.sources||[];}
  }
 };
})();
