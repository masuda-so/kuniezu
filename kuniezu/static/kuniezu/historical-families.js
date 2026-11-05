"use strict";
/* 分家・宿老領の成立は史実。選択で変更するのは観察対象のみ。 */
(function(){
 const src=TK.RESEARCH_SOURCES;
 Object.assign(src,{
  kiyosuDistribution:{author:'松下浩／滋賀県文化スポーツ部文化財保護課',title:'本能寺の変以後の安土城と織田家',url:'https://www.pref.shiga.lg.jp/documents/2526/5456533_1.pdf',year:'2024',locator:'PDF20〜23頁、節6〜8。岐阜預かりは講師説明、8月11日・9月3日書状、12月21日博物館蔵連署状の翻刻',legacyUrls:['https://www.pref.shiga.lg.jp/file/attachment/5456533.pdf'],review:'data/research/source-notes/sanboshi-custody.json',readingNote:'data/research/source-notes/sanboshi-custody.md',retainedInput:{archiveKey:'sha256:2261b7e501f62928b9340bd49928740a1fc453970d42f0d4e571287b8def79a1',sha256:'2261b7e501f62928b9340bd49928740a1fc453970d42f0d4e571287b8def79a1',archiveRelativePath:'sha256/2261b7e501f62928b9340bd49928740a1fc453970d42f0d4e571287b8def79a1.pdf',bytes:7496277,includedInGit:false,storage:'durable-local-source-archive'},scope:'清須会議の継承決定と岐阜での預かり。12月21日の受取・供奉は安土到着日ではない。',accessed:'2026-11-04'},
  owariSuccession:{author:'名古屋市博物館／清須市',title:'天下人と清須／清須の人物伝',url:'https://www.museum.city.nagoya.jp/exhibition/owari_joyubi_news/tenkabitotokiyosu/index.html',locator:'信忠・信雄の尾張支配、清須会議後の領国',scope:'尾張織田・美濃織田は識別用表示名。歴史上の正式国号ではない。',accessed:'2026-11-01'},
  gifuSuccession:{author:'岐阜市',title:'岐阜城の歴代城主',url:'https://www.city.gifu.lg.jp/kankoubunka/kankou/1013051/1005097/1034742/1034737.html',locator:'信孝、池田元助・輝政、豊臣秀勝、織田秀信',scope:'岐阜城と池田家全体の当主を区別。入城年しか記載のないものを日単位の確定値としない。',accessed:'2026-11-01'},
  niwaSuccession:{author:'福井県文書館',title:'福井県史年表（1581年～1600年）',url:'https://www.library-archives.pref.fukui.lg.jp/fukui/07/nenpyo/rekishi/chrn25.html',locator:'1583年北庄、1585年4月16日丹羽長秀死去・長重継承',scope:'丹羽の越前取得と継承。減封・再配分は個別の領地として処理。',accessed:'2026-11-01'},
  kiyosuNagahama:{author:'福井県文書館',title:'福井県史 通史編3 清洲会議',url:'https://www.library-archives.pref.fukui.lg.jp/fukui/07/kenshi/T3/T3-0a1a2-02-02-04-02.htm',locator:'菅浦文書・勝豊の徳政令、丹羽の志賀・高島',scope:'北近江の安堵と支配者を確認。本文の信雄・信孝の国名は他の自治体資料と逆なので、その記述は採用しない。',accessed:'2026-11-01'}
 });
 Object.assign(TK.CLANS,{nobukatsu:['尾張織田','#caa23f'],niwa:['丹羽','#829263'],ikeda:['池田','#668b97']});
 TK.CLANS.nobutaka[0]='美濃織田';
 TK.FAMILY_NAMES={oda:'織田宗家（三法師・秀信）',nobukatsu:'尾張織田家（信雄系）',nobutaka:'美濃織田家（信孝系）'};
 const stamp=d=>d[0]*360+d[1]*30+d[2],cut=[1582,7,16],precision='清須会議後の領国分離を表示。相続・入城の実施月日は未確定';
 const add=e=>TK.HIST.push(e);
 const meeting=TK.HIST.find(e=>e.title==='清洲会議');
 meeting.source=src.kiyosuDistribution.url;meeting.sourceIds=['kiyosuDistribution','owariSuccession','kiyosuNagahama'];
 meeting.text='三法師を織田宗家の継承者として宿老が支える体制と、遺領の再配分を定める。信雄は尾張・従来の伊勢等、信孝は美濃、勝家は越前と北近江、長秀は若狭と近江の二郡、恒興は摂津の所領、秀吉は播磨・但馬に山城・河内等を加える。丹波は養子秀勝の領知として扱う。三法師の名代をめぐる対立は会議後も続き、ただちに一方を正式当主としない。';
 meeting.take.castles=['kyo','kishiwada'];
 meeting.domains=[
  {holder:'三法師',clan:'oda',area:'安土城・近江の宗家領',basis:'宗家の家督と宗家領。坂田郡全域を長浜・北近江と重複して塗らない。'},
  {holder:'織田信雄',clan:'nobukatsu',area:'尾張・伊勢の既存領・伊賀',basis:'尾張を相続。尾張織田はゲームの識別名。'},
  {holder:'織田信孝',clan:'nobutaka',area:'美濃',basis:'美濃の領国。国衆の個別所領と区別。'},
  {holder:'柴田勝家・勝豊',clan:'kshibata',area:'越前・長浜と北近江三郡',basis:'勝豊は長浜に入る。佐和山は堀秀政の領知。'},
  {holder:'丹羽長秀',clan:'niwa',area:'若狭・近江志賀郡／高島郡',basis:'近江二郡を加増。旧領佐和山は堀秀政へ。'},
  {holder:'池田恒興',clan:'ikeda',area:'摂津の大坂・尼崎周辺',basis:'摂津一国全体を池田領とはしない。'},
  {holder:'羽柴秀吉・羽柴秀勝（於次）',clan:'hashiba',area:'播磨・但馬・山城・河内、秀勝の丹波',basis:'名義上の領知と秀吉の支配を併記。後の岐阜城主・秀勝（小吉）と別人。'}
 ];
 add({d:[1582,7,17],k:'newclan',clan:'nobukatsu',castles:['kiyosu','kiriyama','ueno'],leader:'織田信雄',gens:['織田信雄','滝川雄利'],vassalOf:'oda',familyOf:'oda',title:'信雄の尾張相続・尾張織田家の分離',source:src.owariSuccession.url,datePrecision:precision,text:'信雄の尾張支配を、三法師の宗家・信孝の美濃から分けて表示する。尾張織田家は正式な自称ではなく識別名。領国分離だけで織田体制からの離脱とはしない。'});
 const nt=TK.HIST.find(e=>e.k==='newclan'&&e.clan==='nobutaka');Object.assign(nt,{vassalOf:'oda',familyOf:'oda',castles:['gifu'],source:src.gifuSuccession.url,datePrecision:precision,text:'信孝の美濃領国を宗家・信雄の尾張と区別する。争いの焦点は三法師の名代・後見と家中の主導権。信雄・信孝のいずれかがこの時点で織田宗家を継いだとはしない。'});
 const sb=TK.HIST.find(e=>e.k==='newclan'&&e.clan==='kshibata');Object.assign(sb,{vassalOf:'oda',familyOf:'oda',source:src.kiyosuNagahama.url,datePrecision:precision});sb.castles=['ichijodani','oyama','odani'];
 add({d:[1582,7,18],k:'newclan',clan:'niwa',familyOf:'oda',vassalOf:'oda',castles:['nochiseyama'],leader:'丹羽長秀',gens:['丹羽長秀'],title:'丹羽長秀の若狭領・近江加増',source:src.kiyosuNagahama.url,datePrecision:precision,text:'若狭を安堵され、近江の志賀・高島を加増。地図の後瀬山を代表拠点とし、郡の詳細は領地内訳に記す。'});
 add({d:[1582,7,18],k:'newclan',clan:'ikeda',familyOf:'oda',vassalOf:'oda',castles:['ishiyama'],leader:'池田恒興',gens:['池田恒興','池田元助','池田輝政'],title:'池田恒興の摂津領',source:src.kiyosuDistribution.url,datePrecision:precision,text:'大坂・尼崎周辺の摂津領を、秀吉の領地と区別する。大坂はこの時点では石山本願寺跡の地域で、豊臣大坂城完成の先取りではない。'});
 add({d:[1582,7,18],k:'note',clan:'hashiba',take:{clan:'hashiba',castles:['yakami'],admin:1},title:'丹波の領知と羽柴秀勝',source:src.kiyosuDistribution.url,datePrecision:precision,text:'丹波を秀吉養子・秀勝（於次）の領知として記録する。別人である豊臣秀勝（小吉）と同一人物にしない。',domains:[meeting.domains.at(-1)]});
 TK.PORTRAIT_ALIAS['三法師']='織田秀信';
 // 清須会議は家督の決定日。岐阜への到着日も安土入城日も、この日付から生成しない。
 TK.DOCUMENTED_RESIDENCES=Object.assign(TK.DOCUMENTED_RESIDENCES||{}, {
  'sanboshi-gifu-custody-1582':{kind:'custody',personId:'person:oda-hidenobu',placeId:'place:gifu',claimId:'oda-hidenobu-gifu-custody-described',receiptClaimId:'sanboshi-receipt-three-elders-1582-12-21',person:'織田秀信',displayName:'三法師',custodian:'織田信孝',clan:'oda',at:'gifu',sourceId:'kiyosuDistribution',claim:'清須会議後、三法師は信孝のもと岐阜で預かられた。旧暦12月21日の三宿老連署状は引取り・供奉を記す。',from:cut.slice(),until:TK.lunarDate(1582,12,21),lunarFrom:[1582,6,27],lunarUntil:[1582,12,21],datePrecision:'bounded-period',startMeaning:'継承決定後の表示索引境界。岐阜到着日ではない。',endMeaning:'引取書状の日以後は所在未確認。安土到着日ではない。',arrivalDate:null}
 });
 add({d:cut.slice(),k:'appear',clan:'oda',at:'gifu',capital:'kannonji',g:'織田秀信|40|42|40|45|1580',leader:true,pull:true,documentedResidence:'sanboshi-gifu-custody-1582',title:'三法師を支える織田宗家',source:src.kiyosuDistribution.url,sourceIds:['kiyosuDistribution'],datePrecision:'継承の決定日。本人の到着日ではない。',text:'三法師を継承者として宿老が支える。宗家領の安土と、信孝に預けられた三法師のいる岐阜を区別する。'});
 // 信雄を織田宗家と同一キーで処理していた後続イベントを分離する。
 for(const e of TK.HIST){if(stamp(e.d)<stamp(cut)||e.d[0]>=1592)continue;if(e.k==='ally'&&e.a==='oda'&&e.b==='hashiba')e.a='nobukatsu';if(['信雄と家康の盟約','岐阜城の開城'].includes(e.title))e.clan='nobukatsu';if(e.title==='信雄、秀吉と和睦')e.b='nobukatsu';if(e.k==='appear'&&e.clan==='oda'&&e.g?.startsWith('滝川雄利'))e.clan='nobukatsu';}
 for(const w of TK.HWARS)if(w[2][0]>=1583&&w[2][0]<1590){if(w[0]==='oda')w[0]='nobukatsu';if(w[1]==='oda')w[1]='nobukatsu';}
 add({d:[1582,12,20],k:'note',title:'信雄・信孝の対立と宿老の分裂',source:src.kiyosuDistribution.url,text:'三法師の名代と織田家中の主導権をめぐり、信雄・秀吉と信孝・勝家の対立が深まる。宗家の継承と、各領国の軍事的対立を別々に表示する。',unvassal:['nobutaka','kshibata','nobukatsu','hashiba','niwa','ikeda']});
 const open=TK.HIST.find(e=>e.title==='岐阜城の開城');
 add({d:open.d.slice(),k:'note',clan:'ikeda',take:{clan:'ikeda',castles:['gifu'],admin:1},title:'岐阜の池田領への再配分',source:src.gifuSuccession.url,datePrecision:'1583年の信孝失脚後。表示日は開城に併置し、入城日確定とはしない。',text:'信孝の旧領を池田氏へ再配分。岐阜城主は恒興の子・元助となる。信雄が岐阜を得たまま1592年まで残る誤表示を訂正。'});
 add({d:TK.lunarDate(1583,4,24),k:'note',clan:'niwa',take:{clan:'niwa',castles:['ichijodani'],admin:1},title:'賤ヶ岳後の丹羽領拡大',source:src.niwaSuccession.url,datePrecision:'1583年の加増。月日は北庄落城に併置した表示上の基準。',text:'北庄落城後の越前支配を丹羽領として整理する。落城当日の領知朱印発給を意味しない。'});
 add({d:TK.lunarDate(1585,4,16),k:'death',n:'丹羽長秀',title:'丹羽長秀死去',source:src.niwaSuccession.url,text:'丹羽長秀が死去し、長重が家督を継ぐ。',appear:'丹羽長重|65|70|60|60|1571',to:'丹羽長重'});
 add({d:TK.lunarDate(1585,4,16),k:'appear',clan:'niwa',at:'nochiseyama',g:'丹羽長重|65|70|60|60|1571',leader:true,title:'丹羽長重の家督継承',source:src.niwaSuccession.url});
 add({d:[1585,10,1],k:'note',clan:'hashiba',take:{clan:'hashiba',castles:['ichijodani'],admin:1},title:'丹羽家の減封と越前再編',source:'https://www.city.nihonmatsu.lg.jp/file/webook/151/pageindices/index5.html',datePrecision:'1585年、実施月日は未確定。10月1日は年内表示用。',text:'長重の相続後、丹羽領は大きく減らされる。若狭の代表拠点を残し、越前は豊臣政権下の再配分領として扱う。後の越前領主の個別所領とは区別する。'});
 const komaki=TK.HIST.find(e=>e.title==='小牧・長久手の戦い'&&e.k!=='premarch');
 add({d:komaki.d.slice(),k:'appear',clan:'ikeda',at:'gifu',g:'池田輝政|75|78|65|76|1565',leader:true,title:'池田輝政の家督継承',source:src.gifuSuccession.url,text:'長久手で恒興・元助が戦死した後、輝政が家督を継ぐ。岐阜城主への就任時期と家督継承は区別する。'});
 add({d:TK.lunarDate(1590,9,1),k:'note',clan:'hashiba',take:{clan:'hashiba',castles:['gifu'],admin:1},title:'池田氏の三河移封と岐阜再編',source:src.gifuSuccession.url,datePrecision:'1590年9月。1日は月内表示用。',text:'池田氏は三河吉田へ移り、岐阜は豊臣政権の再配分領となる。翌1591年の城主は秀吉の甥・秀勝（小吉）で、丹波の秀勝（於次）とは別人。'});
 add({d:TK.lunarDate(1590,9,1),k:'take',clan:'ikeda',castles:['yoshida'],admin:1,title:'池田輝政の吉田入封',source:src.gifuSuccession.url,datePrecision:'1590年9月、日未確定。',text:'池田輝政の三河吉田への移封を反映。徳川旧領が関東入封後も徳川領として残る誤表示を修正。'});
 const kaieki=TK.HIST.find(e=>e.title==='織田信雄の改易');Object.assign(kaieki,{k:'takeall',clan:'hashiba',b:'nobukatsu',admin:1,source:src.owariSuccession.url});
 const build=G.buildBattleCatalog;G.buildBattleCatalog=function(){build();for(const b of Object.values(TK.BATTLES)){const year=b.eventDate?.[0];if(year>=1583&&year<=1590&&(b.title==='小牧・長久手の戦い'||b.units?.some(u=>u.g==='織田信雄'))){b.participantClans=(b.participantClans||[]).map(k=>k==='oda'?'nobukatsu':k);for(const u of b.units||[])if(u.g==='織田信雄')u.clan='nobukatsu';}}};
 // 合戦の一括奪取で味方の若狭や宗家の安土まで落としていた誤りを除く。
 const shizu=TK.HIST.find(e=>e.title==='賤ヶ岳の戦い'&&e.k!=='premarch');
 Object.assign(shizu,{k:'note',castles:[],peace:[],kill:[],source:src.niwaSuccession.url,text:'賤ヶ岳で羽柴方が柴田方を破る。北庄の落城と勝家の死は旧暦4月24日の別事件であり、丹羽の若狭・宗家の安土・森氏の岩村を戦場の落城として一括移転しない。'});
 const fall={d:TK.lunarDate(1583,4,24),k:'take',clan:'hashiba',castles:['ichijodani'],title:'北庄城落城',who:'羽柴秀吉',kill:['柴田勝家'],source:src.niwaSuccession.url,text:'旧暦4月24日、北庄城が落ち、勝家とお市が自害する。賤ヶ岳の本戦とは日を分ける。'};
 TK.HIST.splice(TK.HIST.findIndex(e=>e.title==='賤ヶ岳後の丹羽領拡大'),0,fall);
 TK.BATTLE_EVENT_EXCLUSIONS['北庄城落城']='賤ヶ岳戦役の後段として年表・再配分に表示。北庄の曲輪別の布陣は未復元のため、賤ヶ岳の地形図を北庄の図として流用しない。';
 const consolidation=TK.HIST.find(e=>e.title==='秀吉の天下取り');consolidation.admin=1;consolidation.source=src.kiyosuDistribution.url;consolidation.datePrecision='戦後の支配整理を表示。各拠点の戦闘・明渡し日の確定値ではない。';consolidation.domains=[{holder:'秀吉と織田旧臣の領主層',area:'畿内の政権下再編',basis:'池田の美濃移封後の大坂などを代表拠点単位で整理。全城を同日に攻め落としたとはしない。'}];
 // 独立した基準配置の1585年も同じ区分に揃える。派生1592/1600年へも継承する。
 const base=TK.SCEN.s1585;
 base.owners.nobukatsu=base.owners.oda;base.owners.oda='kannonji';
 base.owners.niwa='ichijodani nochiseyama';base.owners.ikeda='gifu';
 const reserved=new Set(['kannonji','ichijodani','nochiseyama','gifu']);base.owners.hashiba=base.owners.hashiba.split(' ').filter(id=>!reserved.has(id)).join(' ');
 Object.assign(base.caps,{oda:'kannonji',nobukatsu:'kiyosu',niwa:'ichijodani',ikeda:'gifu'});
 base.gens.ishiyama.push(...base.gens.kannonji);base.gens.kannonji=['織田秀信|40|42|40|45|1580'];
 base.gens.ichijodani=['丹羽長秀|82|76|83|79|1535','丹羽長重|65|70|60|60|1571'];
 for(const pair of base.allies)for(let i=0;i<2;i++)if(pair[i]==='oda')pair[i]='nobukatsu';
 base.allies.push(['hashiba','niwa'],['hashiba','ikeda']);
 for(const e of TK.HIST)if(e.k==='appear'&&e.g?.startsWith('丹羽長重')){e.clan='niwa';delete e.clanAlt;e.pull=true;}
 const hidenobu=TK.HIST.find(e=>e.title==='織田秀信、岐阜城主に');hidenobu.source=src.gifuSuccession.url;
 const cn=G.CN;G.CN=k=>k==='oda'&&G.S()&&G.S().t>=G.evT({d:cut})?'織田宗家':cn(k);
 // 歴史的分家は分岐前のシナリオ選択から外し、成立時に主家から観察先を選ぶ。
 G.preList=()=>[];
 const births=TK.HIST.filter(e=>e.k==='newclan');
 const day=G.day;G.day=function(){const s=G.S(),player=s.player,old=new Set(Object.keys(s.clans).filter(k=>s.clans[k].alive));
  const origins=births.filter(e=>G.evT(e)===s.t+1).map(e=>({clan:e.clan,parent:e.familyOf||G.genByName(e.leader)?.clan||s.castles[e.castles?.[0]]?.owner}));
  day();if(s!==G.S()||!s.clans[player])return;
  const fresh=origins.filter(r=>r.parent===player&&s.clans[r.clan]?.alive&&!old.has(r.clan)).map(r=>r.clan);
  if(fresh.length){s.observerOrigins=s.observerOrigins||{};s.observerOrigins[player]=[...new Set([...(s.observerOrigins[player]||[]),...fresh])];s.observerQ=s.observerQ||[];s.observerQ.push({t:s.t,parent:player,clans:fresh});}
 };
 G.observerOptions=()=>{const s=G.S(),q=s.observerQ?.[0];if(!q)return [];return [...new Set([q.parent,...q.clans])].filter(k=>s.clans[k]?.alive&&G.clanCastles(k).length);};
 G.chooseObserver=k=>{const s=G.S();if(!s.observerQ?.length||!G.observerOptions().includes(k))return false;s.player=k;s.observerQ=[];s.over=null;s.extinct=0;return true;};
 // 旧版7/16〜17の保存は三法師の生成前。日付の訂正で過去イベントが読み飛ばされる分だけ補う。
 // 既に存在する本人の位置、年表、領地、進行日は変更しない。
 G.repairKiyosuSuccession=function(s){
  if(!s||s!==G.S()||!TK.HISTORY_ONLY||!s.historyOnly||Object.values(s.div||{}).some(Boolean)||(s.arcs||[]).length||(s.altQ||[]).length||Object.keys(s.branches||{}).length)return false;
  const sc=TK.SCEN[s.scen||s.sc],start=sc&&(sc.start||[sc.year,sc.month,1]);
  if(!start||start.some(v=>!Number.isFinite(v))||stamp(start)>stamp(cut)||s.t<G.evT({d:cut})||s.t>=G.evT({d:[1582,7,18]})||G.genByName('織田秀信')||s.gens.some(g=>g.n==='織田秀信'||g.n==='三法師'))return false;
  const evidence=G.documentedResidence({n:'織田秀信',clan:'oda',documentedResidence:'sanboshi-gifu-custody-1582'});
  if(!s.clans.oda?.alive||s.castles.kannonji?.owner!=='oda'||evidence?.status!=='custody'||evidence.at!=='gifu')return false;
  const g=G.mkGen('織田秀信|40|42|40|45|1580','oda','gifu');g.documentedResidence='sanboshi-gifu-custody-1582';g.loyal=100;s.clans.oda.leader=g.id;s.clans.oda.cap='kannonji';return true;
 };
 // 旧生成の安土ノードは保存互換のため保持し、史料上の所在だけを表示へ接続する。
 G.repairKiyosuResidence=function(s){
  if(!s||s!==G.S()||!TK.HISTORY_ONLY||!s.historyOnly||Object.values(s.div||{}).some(Boolean)||(s.arcs||[]).length||(s.altQ||[]).length||Object.keys(s.branches||{}).length)return false;
  const sc=TK.SCEN[s.scen||s.sc],start=sc&&(sc.start||[sc.year,sc.month,1]),g=G.genByName('織田秀信'),id='sanboshi-gifu-custody-1582',r=TK.DOCUMENTED_RESIDENCES[id],later=TK.HIST.find(e=>e.title==='織田秀信、岐阜城主に');
  if(!start||start.some(v=>!Number.isFinite(v))||stamp(start)>stamp(cut)||s.t<G.evT({d:r.from})||!later||s.t>=G.evT(later)||!g||g.clan!=='oda'||g.dead||g.ronin||g.prisoner!=null)return false;
  if(g.documentedResidence)return false;
  const canonical=n=>TK.PORTRAIT_ALIAS[n]||n;
  if(!['kannonji','gifu'].includes(g.loc)||g.unit!=null||s.units.some(u=>u.gens.includes(g.id))||g.tr||G.documentedPerson?.(g.n)||(s.pendMoves||[]).some(m=>canonical(m.n)===canonical(g.n)))return false;
  // 生成年と能力値・宗家当主は旧 appear の識別子。別の人物配置を巻き戻さない。
  if(g.born!==1580||g.t!==40||g.b!==42||g.c!==40||g.s!==45||s.clans.oda?.leader!==g.id||s.clans.oda.cap!=='kannonji')return false;
  const evidence=G.documentedResidence({...g,documentedResidence:id});if(!evidence)return false;
  g.documentedResidence=id;delete g._visualPoint;g.lu=false;g.ll=g.loc;return true;
 };
 const set=G.setS;G.setS=s=>{const historical=!!s?.historyOnly;if(s?.retainer&&!(s.clans[s.player]?.alive)){s.player=s.retainer.parent;s.retainer=null;}const result=set(s);if(historical){G.repairKiyosuSuccession(s);G.repairKiyosuResidence(s);G.syncDocumentedResidence?.(G.genByName('織田秀信'));}return result;};
 TK.HIST.sort((a,b)=>stamp(a.d)-stamp(b.d));
})();
