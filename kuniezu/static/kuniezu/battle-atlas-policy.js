"use strict";
(function(){
 const source=(id,author,title,url,locator,scope)=>TK.RESEARCH_SOURCES[id]={author,title,url,locator,scope,accessed:'2026-10-31'};
 source('atlasReference','Jimho／Wikimedia Commons','Sekigahara.png','https://commons.wikimedia.org/wiki/File:Sekigahara.png','2005年4月15日版。Wikipedia「関ヶ原本戦の配置」の参照図','表現方式の参考。画像・地形輪郭を転載していない。参謀本部系布陣図を史実確定図と同一視しない。');
 source('atlasRelief','Mapzen／USGS／NOAA','Terrain Tiles','https://registry.opendata.aws/terrain-tiles/','Terrarium標高。合戦ごとの表示範囲を160×112点で採取','現代の地形を等高帯に加工。戦国期の微地形・堀・埋立前海岸の復元ではない。');
 source('nagashinoMuseum','新城市設楽原歴史資料館','設楽原布陣図','https://www.city.shinshiro.lg.jp/mokuteki/shisetu/shiryokan/shitaragahara/fujinzu.html','宗堅寺蔵・布陣図の解説','将兵名、連吾川の馬防柵、街道・村名。後世の図であり当日の実測ではない。');
 source('anegawaMuseum','長浜城歴史博物館','姉川合戦図','https://nagahama-rekihaku.jp/digital-museum/70','資料番号A31-02、19世紀の絵図と解説','両軍が姉川を挟んで対峙。図の記載年の誤りも指摘される。');
 source('kawanakajimaCity','長野市','川中島古戦場史跡公園のご案内','https://www.city.nagano.nagano.jp/n150800/contents/p002956.html','八幡原・千曲川と犀川、伝承の説明','八幡原の位置。啄木鳥戦法や一騎打ちを確定した戦闘経過として扱わない。');
 source('mikatagaharaArchive','浜松市博物館／浜松市文化遺産デジタルアーカイブ','遠州味方カ原御合戦之図','https://adeac.jp/hamamatsu-city/catalog/mp000240-200010','目録ID mp000240-200010','江戸時代の合戦絵図。三方原台地の戦闘地・陣形の異説を解消する資料ではない。');
 const additional={'長篠の戦い':['nagashinoMuseum'],'姉川の戦い':['anegawaMuseum'],'第四次川中島の戦い':['kawanakajimaCity'],'三方ヶ原の戦い':['mikatagaharaArchive'],'関ヶ原の戦い':['atlasReference']};
 source('honnojiOldSite','京都市','本能寺跡出土品','https://jmapps.ne.jp/kyotocity_bunka/det.html?data_id=370','市指定考古資料22、寺域の説明','1582年の寺域は六角・蛸薬師・油小路・西洞院に囲まれた旧地。現在の寺町の本能寺と区別する。');
 additional['本能寺の変']=['honnojiOldSite'];
 // 自動表示用の参加勢力。近隣・同盟関係から補わず、各合戦の参加者・経過の登録内容に対応させる。
 // ゲーム内で独立勢力として存在しない大名家を、姓だけで別の家に結び付けない。
 const participants={
 '桶狭間の戦い':['oda','imagawa','tokugawa'], '第四次川中島の戦い':['nagao','takeda'],
 '長篠の戦い':['oda','tokugawa','takeda'], '関ヶ原の戦い':['ishida','tokugawa','ukita','shimazu','mori','chosokabe','hashiba'],
 '姉川の戦い':['oda','tokugawa','azai','asakura'], '三方ヶ原の戦い':['takeda','tokugawa','oda'],
 '本能寺の変':['akechi','oda'], '山崎の戦い':['hashiba','akechi'], '賤ヶ岳の戦い':['hashiba','kshibata'],
 '小牧・長久手の戦い':['hashiba','tokugawa','oda'], '耳川の戦い':['otomo','shimazu'], '沖田畷の戦い':['ryuzoji','shimazu','arima'],
 '第一次上田合戦':['sanada','tokugawa'], '摺上原の戦い':['date','ashina'], '小田原征伐':['hashiba','tokugawa','hojo'],
 '大坂夏の陣':['hashiba','tokugawa','date'], '大坂冬の陣':['hashiba','tokugawa','sanada','chosokabe','date','nagao','satake'],
 '伏見城の戦い':['ukita','shimazu','tokugawa'], '大津城の戦い':['mori'], '第二次上田合戦':['tokugawa','sanada'],
 '田辺城の戦い':[], '長谷堂城の戦い':['nagao','mogami'], '高遠城の戦い':['oda','takeda'],
 '小田原城の戦い':['nagao','hojo'], '森部の戦い':['oda','saito'], '第二次国府台合戦':['hojo','satomi'],
 '永禄の変':['miyoshi','ashikaga'], '箕輪城落城':['takeda','nagano'], '月山富田城開城':['mori','amago'],
 '休松の戦い':['akizuki','otomo'], '稲葉山城の戦い':['oda','saito'], '大河内城の戦い':['oda','kitabatake'],
 '三増峠の戦い':['hojo','takeda'], '木崎原の戦い':['ito','shimazu'], '小谷城落城':['oda','azai'],
 '長島一向一揆の平定':['oda','honganji'], '四万十川の戦い':['ichijo','chosokabe'], '天王寺の戦い':['honganji','oda'],
 '七尾城の戦い':['nagao','noto'], '手取川の戦い':['nagao','oda'], '信貴山城の戦い':['oda'],
 '上月城の戦い':['mori','amago'], '有岡城の戦い':['oda'], '高天神城の戦い':['tokugawa','takeda'],
 '甲州征伐':['oda','takeda','tokugawa','hojo'], '備中高松城の水攻め':['hashiba','mori'], '神流川の戦い':['hojo','oda'],
 '中富川の戦い':['chosokabe','miyoshi'], '黒駒合戦':['hojo','tokugawa'], '紀州征伐':['hashiba','saika'],
 '宇喜多勢の讃岐攻め':['ukita','chosokabe'], '小早川隆景の伊予攻め':['mori','kono'], '四国攻め':['hashiba','chosokabe'],
 '人取橋の戦い':['date','satake','ashina','nihonmatsu'], '岩屋城の戦い':['shimazu','otomo'], '九州平定':['hashiba','shimazu'],
 '根白坂の戦い':['shimazu','hashiba'], '新発田城落城':['nagao','shibata'], '韮山城の戦い':['oda','hojo'],
 '北国勢の上野攻め':['nagao','hojo'], '鉢形城の開城':['nagao','hojo'], '文禄の役':['hashiba','so','joseon'],
 '尚州の戦い':['hashiba','joseon'], '忠州の戦い':['hashiba','joseon'], '第一次晋州城の戦い':['hashiba','joseon'],
 '平壌の戦い':['ming','joseon','hashiba'], '碧蹄館の戦い':['ming','mori'], '幸州山城の戦い':['hashiba','ukita','joseon'],
 '第二次晋州城の戦い':['hashiba','ukita','joseon'], '慶長の役・漆川梁海戦':['hashiba','joseon'],
 '南原城の戦い':['hashiba','ukita','ming','joseon'], '蔚山城の戦い':['hashiba','ming','joseon'],
 '浅井畷の戦い':[], '安濃津城の戦い':['mori'], '石垣原の戦い':['otomo'], '佐和山城落城':['ishida','tokugawa'],
 '今福・鴫野の戦い':['hashiba','tokugawa','nagao','satake'], '道明寺の戦い':['hashiba','tokugawa','date'],
 '八尾・若江の戦い':['tokugawa','hashiba','chosokabe']
 };
 // 城内の守将を「城全体」の一点にまとめる。曲輪ごとの持場や城内の移動を創作しない。
 const defenders={
  '伏見城の戦い':['鳥居元忠','内藤家長','内藤元長','松平家忠','鵜殿氏次','佐野綱正'],
  '大津城の戦い':['京極高次'],'第二次上田合戦':['真田昌幸','真田信繁'],'長谷堂城の戦い':['志村光安'],
  '田辺城の戦い':['細川幽斎'],'高遠城の戦い':['仁科盛信'],'岩屋城の戦い':['高橋紹運'],
  '月山富田城開城':['尼子義久'],'大河内城の戦い':['北畠具教','北畠具房'],'幸州山城の戦い':['権慄','趙儆','処英'],
  '蔚山城の戦い':['加藤清正'],'文禄の役':['鄭撥']
 };
 const build=G.buildBattleCatalog;
 G.buildBattleCatalog=function(){build();for(const [title,sc] of Object.entries(TK.BATTLES)){
  const m=TK.BATTLE_ATLAS[title];if(!m)continue;
  sc.participantClans=participants[title]||TK.EXTRA_BATTLES?.[title]?.clans;
  sc.displayPolicy='atlas';sc.title=title;sc.atlasPlan=title==='伏見城の戦い';sc.atlasUnits=[];
  sc.sources=[...new Set([...(sc.sources||[]),...(additional[title]||[]),'atlasRelief',...(m.points.length?['codhSites']:[])])];
  sc.presentationNote='山地の等高帯・水系・街道・史跡を同じ形式で表示。部隊の位置と史料の確認範囲は、下の一覧に示します。';
  sc.atlasBasis='地勢図・配置未確定';
  if(title==='関ヶ原の戦い'){
   const ids=['mitsunari','kuroda','ieyasu','otani','shimazu','ukita','konishi'];
   sc.atlasUnits=(TK.BATTLE_SITES[title]||[]).map((p,i)=>{const u=sc.units.find(u=>u.id===ids[i]);return {id:ids[i],name:u.g,g:u.g,side:u.side,point:[p.lon,p.lat],label:u.g,source:p.source,precision:'現在の陣跡標示'};});
   sc.atlasBasis='陣跡位置図';sc.reviewNote='凸は現地の陣跡標示の位置です。現在の記念地点と1600年当日の厳密な布陣は同一ではありません。未確認の隊を空き場所へ配置せず、参加者一覧に残しています。';
  }else if(defenders[title]){
   const names=defenders[title],u=sc.units.find(u=>names.includes(u.g||u.n));
   if(u){sc.atlasUnits=[{id:u.id,name:names.join('・'),g:u.g,side:u.side,...(sc.atlasPlan?{x:.56,y:.48}:{point:[m.geo[0],m.geo[1]]}),label:'城内 '+names[0]+(names.length>1?'ほか '+names.length+'名':''),members:names,precision:'籠城先の位置・個々の持場不詳'}];sc.atlasBasis=sc.atlasPlan?'城郭参考図・籠城将':'地勢図・籠城先';}
  }
  // 不詳をゼロ人と表示しない。旧データの片側一名だけで守備側を消さない。
  if(sc.recordSides)sc.recordSides.forEach((name,i)=>{const side=i?'b':'a';if(!sc.units.some(u=>u.side===side))sc.units.push({id:'record-side-'+side,n:name,g:name,side,role:'出典の勢力・代表者。現地の持場は不詳',path:[]});});
  for(const [i,side] of ['a','b'].entries())if(/軍勢[AB]|攻め手|守り手/.test(sc.sides[side].n)){sc.sides[side].n=sc.recordSides?.[i]||TK.BATTLE_TROOPS[title]?.[side]?.lead||sc.sides[side].n;}
  const row=TK.BATTLE_AUDIT?.find(r=>r.title===title);if(row){row.displayPolicy='atlas';row.atlasBasis=sc.atlasBasis;row.positionedUnits=sc.atlasUnits.length;row.units=sc.units.length;row.sourceIds=sc.sources;}
 }};
})();
