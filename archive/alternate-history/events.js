"use strict";
/* ===== 選べる出来事 =====
   史実の分かれ道（自家の当主として選ぶ）と、領国で起こる出来事。
   史実の分かれ道は「史実」を選べば筋書きどおり、他を選ぶと歴史が分かれる。 */
window.TK=window.TK||{};
(function(){
const ekey=(a,b)=>a<b?a+'|'+b:b+'|'+a;
// 効果をまとめて扱う道具
function E(){const S=G.S(),k=S.player,cl=S.clans[k]||{gold:0,food:0,cap:null};const ids=G.clanCastles(k);const cap=cl.cap&&S.castles[cl.cap]&&S.castles[cl.cap].owner===k?cl.cap:ids[0];
 return {S,k,cl,ids,cap,
  gold(n){cl.gold=Math.max(0,cl.gold+n);},food(n){cl.food=Math.max(0,cl.food+n);},
  troops(id,n){const c=S.castles[id];if(c)c.troops=Math.max(300,Math.round((c.troops+n)/100)*100);},
  loyal(id,n){const c=S.castles[id];if(c)c.loyal=G.clamp(c.loyal+n,0,100);},
  loyalAll(n){for(const id of ids)this.loyal(id,n);},
  rel(j,v){G.addRel(k,j,v);},
  ally(j,days){S.ally[ekey(k,j)]=Math.max(S.ally[ekey(k,j)]||0,days);G.addRel(k,j,15);},
  cancel(...keys){S.cancel=S.cancel||{};for(const t of keys)S.cancel[t]=1;},
  div(...ks){for(const j of ks)G.diverge(j,'event');}};}
const nm=k=>G.CNK(k);
// 史実では、この先どこかの家に迎えられる浪人か（その時を待っている）
function histWait(g){const S=G.S();return (TK.HIST||[]).some(h=>h.k==='appear'&&h.g&&h.g.split('|')[0]===g.n&&G.evT(h)>S.t);}
// この先5年のうちに史実で手を結ぶ相手か
function histAlly(a,b){const S=G.S(),dt=G.date(),now=dt.y*400+dt.m*32+dt.d;
 return (TK.HIST||[]).some(h=>(h.k==='ally'||h.k==='submit')&&!(S.cancel&&h.title&&S.cancel[h.title])&&((h.a===a&&h.b===b)||(h.a===b&&h.b===a))&&(()=>{const v=h.d[0]*400+h.d[1]*32+h.d[2];return v>=now&&v<=now+5*400;})());}
const T=(o)=>o;

/* --- 史実の分かれ道 --- */
TK.FORKS=[
 T({id:'okehazama_i',d:[1560,6,5],clan:'imagawa',who:'今川義元',title:'尾張への出陣',
  text:'二万五千の大軍で駿府を発った。大高城・鳴海城を救い、尾張の織田を一気に押さえる手はずである。',
  opts:[{t:'予定どおり大高・鳴海へ進む',hist:1,d:'本陣は桶狭間山で休む'},
   {t:'本陣の守りを固め、物見を厚くして進む',d:'奇襲を警戒する。歴史が分かれる',f(e){e.cancel('桶狭間の戦い','松平元康、岡崎に入る');e.div('imagawa','oda');return '義元は本陣を厚くし、織田の奇襲に備えた。';}}]}),
 T({id:'okehazama_o',d:[1560,6,8],clan:'oda',who:'織田信長',title:'今川の大軍、迫る',
  text:'今川義元の大軍が尾張に迫っている。こちらの兵は数千。家臣たちは籠城を説いている。',
  opts:[{t:'少数で出撃し、義元の本陣を突く',hist:1,d:'敦盛を舞い、清洲を発つ'},
   {t:'清洲城に籠もって守り抜く',d:'城が堅くなり兵が集まる。歴史が分かれる',f(e){e.cancel('桶狭間の戦い','松平元康、岡崎に入る');const c=e.S.castles.kiyosu;if(c){c.dur+=800;c.durMax+=800;}e.troops('kiyosu',3500);e.div('oda','imagawa');return '信長は清洲に籠もり、今川の大軍を迎え撃つ構えを取った。';}},
   {t:'今川に降り、家を保つ',d:'今川の従属となる。歴史が分かれる',f(e){e.cancel('桶狭間の戦い','松平元康、岡崎に入る');e.ally('imagawa',1e9);e.S.vassal=Object.assign(e.S.vassal||{},{oda:'imagawa'});e.div('oda');return '織田家は今川に降った。尾張は今川の旗の下に入る。';}}]}),
 T({id:'kiyosu_d',d:[1562,1,20],clan:'oda',who:'織田信長',title:'松平元康との和議',
  text:'今川から自立した三河の松平元康が、和議の使者を寄こした。',
  opts:[{t:'清洲で同盟を結ぶ',hist:1,d:'東の守りを任せ、美濃に専念できる'},
   {t:'同盟を結ばず、三河を狙う',d:'松平との仲が冷える。歴史が分かれる',f(e){e.cancel('清洲同盟');e.rel('tokugawa',-35);e.div('oda','tokugawa');return '信長は和議を退けた。三河との境に緊張が走る。';}}]}),
 T({id:'nagao_k',d:[1560,8,25],clan:'nagao',who:'長尾景虎',title:'関東からの救援要請',
  text:'北条に追われた関東管領・上杉憲政が、北条討伐を強く求めている。',
  opts:[{t:'大軍を率いて関東へ出兵する',hist:1,d:'小田原まで攻め込む'},
   {t:'越後と信濃の守りを優先する',d:'金と兵を蓄える。歴史が分かれる',f(e){e.cancel('長尾景虎の関東出兵','小田原城の戦い');e.gold(400);e.troops(e.cap,2000);e.div('nagao');return '景虎は関東出兵を見送り、国元を固めた。';}}]}),
 T({id:'suruga_t',d:[1568,11,20],clan:'takeda',who:'武田信玄',title:'駿河を取るか',
  text:'今川氏真の力は衰えた。駿河を取れば海が手に入るが、今川・北条との三国同盟は破れる。',
  opts:[{t:'同盟を破り、駿河へ攻め込む',hist:1,d:'北条を敵に回す'},
   {t:'三国同盟を守り、西上野と美濃を狙う',d:'今川・北条と結んだまま。歴史が分かれる',f(e){e.cancel('駿河侵攻','掛川城開城');e.rel('imagawa',20);e.rel('hojo',15);e.div('takeda');return '信玄は駿河を攻めず、三国同盟は保たれた。';}}]}),
 T({id:'joraku_o',d:[1568,9,1],clan:'oda',who:'織田信長',title:'足利義昭の頼み',
  text:'将軍の座を狙う足利義昭が、上洛の供を求めてきた。京への道には六角氏が立ちはだかる。',
  opts:[{t:'義昭を奉じて上洛する',hist:1,d:'京と畿内を押さえる'},
   {t:'上洛せず、美濃と伊勢を固める',d:'金と兵を得る。歴史が分かれる',f(e){e.cancel('信長上洛');e.gold(600);e.troops(e.cap,3000);e.div('oda');return '信長は上洛を見送り、足元を固めた。';}}]}),
 T({id:'kanegasaki_a',d:[1570,5,1],clan:'azai',who:'浅井長政',title:'金ヶ崎の報せ',
  text:'義兄・織田信長が、浅井と古くから結ぶ朝倉を攻めている。いま背後を突けば信長を討てるかもしれない。',
  opts:[{t:'朝倉への恩を取り、信長の背後を突く',hist:1,d:'織田と敵対する'},
   {t:'信長との盟約を守る',d:'織田と同盟を続ける。歴史が分かれる',f(e){e.cancel('姉川の戦い','小谷城落城');e.ally('oda',1e9);e.rel('asakura',-30);e.div('azai');return '長政は信長との盟約を守った。お市との縁は保たれる。';}}]}),
 T({id:'hiei_o',d:[1571,9,20],clan:'oda',who:'織田信長',title:'比叡山',
  text:'浅井・朝倉の兵をかくまった延暦寺が、こちらの求めに応じない。',
  opts:[{t:'延暦寺を焼き払う',hist:1,d:'畿内の民心が乱れる',f(e){e.loyal('kyo',-10);e.gold(300);}},
   {t:'延暦寺と和を結ぶ',d:'金300を寄進する。歴史が分かれる',f(e){e.cancel('比叡山焼き討ち');e.gold(-300);e.loyal('kyo',8);e.div('oda');return '信長は延暦寺と和を結んだ。';}}]}),
 T({id:'nagashino_o',d:[1575,6,10],clan:'oda',who:'織田信長',title:'長篠への援軍',
  text:'武田勝頼が三河の長篠城を囲み、徳川家康が援軍を求めている。',
  opts:[{t:'鉄砲と馬防柵を備えて出陣する',hist:1,d:'設楽原で武田と決戦'},
   {t:'援軍を出さず、畿内に兵を残す',d:'徳川との仲が冷える。歴史が分かれる',f(e){e.cancel('長篠の戦い');e.rel('tokugawa',-25);e.troops(e.cap,3000);e.div('oda');return '信長は援軍を見送った。徳川は単独で武田に向き合う。';}}]}),
 T({id:'mimikawa_o',d:[1578,10,1],clan:'otomo',who:'大友宗麟',title:'日向への出陣',
  text:'島津に追われた伊東氏が助けを求めている。日向を取れば、無鹿に理想の町を築ける。',
  opts:[{t:'大軍で日向へ攻め込む',hist:1,d:'高城で島津と戦う'},
   {t:'出陣を見合わせ、豊後を固める',d:'兵と金を残す。歴史が分かれる',f(e){e.cancel('耳川の戦い');e.troops(e.cap,4000);e.gold(300);e.div('otomo');return '宗麟は日向への出陣を取りやめた。';}}]}),
 T({id:'honnoji_o',d:[1582,6,12],clan:'oda',who:'織田信長',title:'中国への出陣',
  text:'備中高松城を囲む羽柴秀吉から、援軍の求めが届いた。明智光秀に先陣を命じ、自らは京の本能寺に入る予定である。',
  opts:[{t:'わずかな供を連れて本能寺に泊まる',hist:1,d:'六月二日の未明……'},
   {t:'安土に留まり、光秀を先に中国へ発たせる',d:'身辺を固める。歴史が分かれる',f(e){e.cancel('本能寺の変','山崎の戦い','清洲会議');e.div('oda');return '信長は安土に留まった。光秀の軍勢は西へ向かった。';}},
   {t:'自ら大軍を率いて中国へ向かう',d:'安土の兵を連れて出陣。歴史が分かれる',f(e){e.cancel('本能寺の変','山崎の戦い','清洲会議');e.troops(e.cap,-3000);if(e.S.castles.himeji&&e.S.castles.himeji.owner===e.k)e.troops('himeji',6000);e.div('oda');return '信長は大軍とともに西へ発った。';}}]}),
 T({id:'joraku_h',d:[1586,10,1],clan:'hashiba',who:'豊臣秀吉',title:'徳川家康をどう従わせるか',
  text:'小牧・長久手で戦った徳川家康は、いまだ上洛しない。',
  opts:[{t:'妹と母を送り、家康を上洛させる',hist:1,d:'戦わずに臣従させる'},
   {t:'大軍で徳川を討つ',d:'徳川と戦になる。歴史が分かれる',f(e){e.cancel('徳川家康の上洛','小田原開城');e.rel('tokugawa',-40);e.div('hashiba','tokugawa');return '秀吉は徳川討伐を決めた。';}}]}),
 T({id:'joraku_t',d:[1586,10,15],clan:'tokugawa',who:'徳川家康',title:'秀吉の求め',
  text:'秀吉は妹を嫁がせ、母まで人質に送ってきた。上洛して臣従せよとの求めである。',
  opts:[{t:'上洛し、秀吉に臣従する',hist:1,d:'豊臣政権の重鎮となる'},
   {t:'臣従を拒み、北条と結んで戦う',d:'北条と同盟する。歴史が分かれる',f(e){e.cancel('徳川家康の上洛','小田原開城');e.ally('hojo',1e9);e.rel('hashiba',-35);e.div('tokugawa','hojo');G.declareHunt('hashiba',['tokugawa','hojo'],{first:110,name:'東国征伐',troops:35000});return '家康は臣従を拒み、北条と手を結んだ。豊臣の大軍が来るだろう。';}}]}),
 T({id:'odawara_h',d:[1589,12,1],clan:'hojo',who:'北条氏政',title:'秀吉の上洛要求',
  text:'名胡桃城の一件で秀吉は激しく怒り、上洛しなければ討つと迫っている。',
  opts:[{t:'上洛を拒み、小田原で迎え撃つ',hist:1,d:'総構えに籠もる'},
   {t:'氏政が上洛し、臣従する',d:'豊臣に従う。歴史が分かれる',f(e){e.cancel('小田原征伐','小田原開城');e.ally('hashiba',1e9);e.S.vassal=Object.assign(e.S.vassal||{},{hojo:'hashiba'});e.div('hojo');return '氏政は上洛し、北条家は豊臣に従った。';}}]}),
 T({id:'hojo_t',d:[1586,11,5],clan:'hojo',who:'北条氏政',title:'家康の上洛',cond:e=>e.S.clans.tokugawa&&e.S.clans.tokugawa.alive&&!e.S.div.tokugawa,
  text:'同盟を結ぶ徳川家康が、秀吉に求められて上洛しようとしている。家康が豊臣に従えば、北条は東国でひとり残される。',
  opts:[{t:'家康の上洛を見送り、関東を固める',hist:1,d:'家康は豊臣に臣従する'},
   {t:'家康を説き、ともに豊臣に抗う',d:'徳川と固く結ぶ。豊臣の大軍が来る。歴史が分かれる',f(e){e.cancel('徳川家康の上洛','小田原開城');e.ally('tokugawa',1e9);e.rel('hashiba',-30);e.div('hojo','tokugawa');G.declareHunt('hashiba',['hojo','tokugawa'],{first:110,name:'東国征伐',troops:35000});return '家康は上洛を取りやめ、北条と手を結んだ。';}}]}),
 T({id:'odawara_d',d:[1590,3,25],clan:'date',who:'伊達政宗',title:'小田原への参陣',
  text:'秀吉が小田原の北条を囲んでいる。参陣しなければ、次は伊達が討たれる。',
  opts:[{t:'死装束で小田原に参陣する',hist:1,d:'会津は取り上げられる'},
   {t:'参陣せず、奥州を固める',d:'豊臣と敵対する。歴史が分かれる',f(e){e.cancel('submit:date');e.troops(e.cap,4000);e.div('date');G.declareHunt('hashiba',['date'],{first:150,name:'奥州征伐',troops:30000});return '政宗は参陣を拒んだ。奥州に豊臣の大軍が向かうだろう。';}}]}),
 T({id:'kyushu_s',d:[1587,4,15],clan:'shimazu',who:'島津義久',title:'豊臣の大軍',
  text:'二十万の豊臣軍が九州に上陸した。弟たちは戦を続けるべきだと言う。',
  opts:[{t:'降伏し、薩摩・大隅を保つ',hist:1,d:'剃髪して秀吉に会う'},
   {t:'最後まで戦う',d:'兵を集めて抗う。歴史が分かれる',f(e){e.troops(e.cap,5000);e.div('shimazu');G.declareHunt('hashiba',['shimazu'],{first:35,name:'九州征伐',troops:40000});return '義久は降伏を拒んだ。豊臣は次々と軍勢を送り込んでくるだろう。';}}]}),
 T({id:'shikoku_c',d:[1585,7,20],clan:'chosokabe',who:'長宗我部元親',title:'四国攻め',
  text:'豊臣秀長が十万の兵で四国に渡ってきた。',
  opts:[{t:'降伏し、土佐一国を保つ',hist:1,d:'阿波・讃岐・伊予を手放す'},
   {t:'四国を守って戦う',d:'兵を集めて抗う。歴史が分かれる',f(e){e.troops(e.cap,4000);e.div('chosokabe');G.declareHunt('hashiba',['chosokabe'],{first:35,name:'四国征伐',troops:30000});return '元親は降伏を拒み、四国を守る戦を選んだ。';}}]})
];



TK.FORKS.push(
 T({id:'kawanaka_t',d:[1561,10,10],clan:'takeda',who:'武田信玄',title:'妻女山の上杉軍',
  text:'上杉政虎が妻女山に陣取っている。山本勘助は、別働隊で背後を突く啄木鳥の策を説く。',
  opts:[{t:'啄木鳥の策で八幡原の決戦に臨む',hist:1,d:'激しい戦いになる'},
   {t:'決戦を避け、海津城を固める',d:'弟の信繁は生き延びる。歴史が分かれる',f(e){e.cancel('第四次川中島の戦い','death:武田信繁','death:山本勘助');e.div('takeda');return '信玄は決戦を避けた。';}}]}),
 T({id:'mikata_t',d:[1573,1,24],clan:'tokugawa',who:'徳川家康',title:'浜松を素通りする武田軍',
  text:'西上する武田信玄の大軍が、浜松城を横目に三方ヶ原の台地へ向かっている。',
  opts:[{t:'城を出て武田軍の後ろを突く',hist:1,d:'大きな危険を伴う'},
   {t:'浜松城に籠もり、武田軍を見送る',d:'兵を失わない。歴史が分かれる',f(e){e.cancel('三方ヶ原の戦い');e.troops(e.cap,2000);e.rel('oda',-10);e.div('tokugawa');return '家康は城に籠もった。';}}]}),
 T({id:'nagashino_t',d:[1575,6,25],clan:'takeda',who:'武田勝頼',title:'設楽原の織田・徳川軍',
  text:'長篠城を囲む武田軍の前に、織田・徳川の大軍が馬防柵を築いて陣取った。重臣たちは退くよう説いている。',
  opts:[{t:'決戦を挑む',hist:1,d:'柵と鉄砲に向かって攻めかかる'},
   {t:'長篠城の囲みを解いて甲斐へ退く',d:'重臣たちは生き延びる。歴史が分かれる',f(e){e.cancel('長篠の戦い','death:山県昌景','death:馬場信春','death:内藤昌豊');e.div('takeda');return '勝頼は兵を引いた。';}}]}),
 T({id:'otate_u',d:[1578,5,10],clan:'nagao',who:'上杉景勝',title:'謙信の跡目',
  text:'急死した謙信は跡継ぎを定めていなかった。もう一人の養子、北条から来た上杉景虎が御館に入った。',
  opts:[{t:'春日山の本丸を押さえ、景虎と戦う',hist:1,d:'越後を二分する戦になる'},
   {t:'景虎と和解し、北条との縁を保つ',d:'金500 ・ 北条との友好が上がる。歴史が分かれる',f(e){e.cancel('御館の乱');e.gold(-500);e.rel('hojo',25);e.div('nagao');return '景勝と景虎は和解した。';}}]}),
 T({id:'arioka_o',d:[1578,12,1],clan:'oda',who:'織田信長',title:'荒木村重の謀反',
  text:'摂津を任せていた荒木村重が、有岡城に籠もって背いた。',
  opts:[{t:'有岡城を囲み、時をかけて落とす',hist:1,d:'摂津での戦が長引く'},
   {t:'使者を送り、村重を説き伏せる',d:'うまくいけば戦わずに済む。歴史が分かれる',f(e){e.cancel('有岡城の戦い');e.div('oda');if(Math.random()<.5){e.loyal('akutagawa',10);return '村重は詫びを入れ、織田に戻った。';}e.troops('akutagawa',-2000);return '説得は失敗し、使者は捕らえられた。';}}]}),
 T({id:'takamatsu_m',d:[1582,6,5],clan:'mori',who:'毛利輝元',title:'水に沈む高松城',
  text:'羽柴秀吉の水攻めで備中高松城が沈みかけている。小早川隆景は和睦を説き、吉川元春は決戦を望む。',
  opts:[{t:'国を割いて秀吉と和睦する',hist:1,d:'清水宗治の切腹と引きかえに城兵を救う'},
   {t:'全軍で後詰めし、秀吉と決戦する',d:'兵を集める。歴史が分かれる',f(e){e.troops(e.cap,6000);e.rel('oda',-30);e.div('mori');return '毛利は全軍で備中へ向かった。';}}]}),
 T({id:'koshu_t',d:[1582,3,20],clan:'takeda',who:'武田勝頼',title:'織田の大軍',
  text:'木曽義昌が寝返り、織田信忠の大軍が信濃へなだれ込んだ。新府城はまだ普請の途中である。',
  opts:[{t:'新府を焼き、小山田の岩殿城へ落ちる',hist:1,d:'天目山へ追い詰められていく'},
   {t:'新府城に籠もって最後まで戦う',d:'兵を集める。歴史が分かれる',f(e){e.cancel('甲州征伐');e.troops(e.cap,5000);e.div('takeda');return '勝頼は新府城で織田を迎え撃つ構えを取った。';}}]})
);
/* --- 分かれた後の歴史（もう一つの歴史） ---
   alt：選んだ後に起こる出来事（d は年月日、after は選んでからの日数）
   follow：選んだ後に現れる次の分かれ道（req で前の選択を条件にする） */
const ALT={
 'okehazama_o:1':[{after:25,ev:{k:'take',clan:'imagawa',from:'okazaki',castles:['kiyosu'],force:1,troops:12000,big:1,title:'清洲城の戦い',site:'清洲城',text:'桶狭間で休むことなく進んだ今川の大軍が、清洲城を囲んだ。',who:'今川義元'}}],
 'okehazama_o:2':[{after:60,ev:{k:'take',clan:'imagawa',from:'kiyosu',castles:['gifu'],force:1,title:'今川の美濃攻め',text:'今川義元は織田を先鋒に立て、美濃の斎藤を攻めた。',who:'今川義元'}},
  {d:[1562,5,1],ev:{k:'take',clan:'imagawa',from:'gifu',castles:['kannonji'],force:1,title:'今川上洛',text:'美濃を得た今川義元が、京を目指して近江へ兵を進めた。',who:'今川義元'}}],
 'okehazama_i:1':[{after:4,ev:{k:'fx',fx:'rain',title:'桶狭間の雨',at:'kiyosu',site:'桶狭間',text:'雨の中を奇襲した織田軍は、厚く構えた今川の本陣に阻まれて退いた。',who:'織田信長'}}],
 'joraku_h:1':[{after:30,ev:{k:'take',clan:'hashiba',from:'kiyosu',castles:['okazaki'],force:1,troops:35000,title:'徳川攻め',text:'秀吉は自ら大軍を率い、三河の徳川を攻めた。',who:'豊臣秀吉'}}],
 'honnoji_o:1':[{after:20,ev:{k:'fx',fx:'mitsuhide',title:'光秀の出陣',text:'明智光秀の軍勢は予定どおり中国へ向かった。京は静かなままである。',who:'明智光秀'}},
  {after:24,ev:{k:'take',clan:'oda',from:'kishiwada',castles:['shozui','sogo'],force:1,troops:14000,big:1,title:'四国渡海',site:'勝瑞',text:'織田信孝と丹羽長秀の四国攻めの軍勢が、予定どおり阿波へ渡り、長宗我部方の城を落とした。',who:'織田信孝'}},
  {d:[1583,4,1],ev:{k:'take',clan:'oda',from:'toyama',castles:['kasugayama'],force:1,troops:20000,big:1,title:'越後攻め',site:'春日山',text:'魚津城を落とした柴田勝家の北陸勢が越後へ攻め入り、春日山城を囲んだ。',who:'柴田勝家'}}],
 'honnoji_o:2':[{after:20,ev:{k:'fx',fx:'mitsuhide',title:'光秀の出陣',text:'明智光秀は信長の本隊に従って西へ向かった。',who:'明智光秀'}},
  {after:24,ev:{k:'take',clan:'oda',from:'kishiwada',castles:['shozui','sogo'],force:1,troops:14000,big:1,title:'四国渡海',site:'勝瑞',text:'織田信孝と丹羽長秀の四国攻めの軍勢が、予定どおり阿波へ渡り、長宗我部方の城を落とした。',who:'織田信孝'}},
  {d:[1583,4,1],ev:{k:'take',clan:'oda',from:'toyama',castles:['kasugayama'],force:1,troops:20000,big:1,title:'越後攻め',site:'春日山',text:'魚津城を落とした柴田勝家の北陸勢が越後へ攻め入り、春日山城を囲んだ。',who:'柴田勝家'}}]
};
const FX={
 rain(e){const c=e.S.castles.kiyosu;if(c){c.troops=Math.round(c.troops*.6);c.morale=Math.max(20,c.morale-25);}},
 mitsuhide(e){const g=e.S.gens.find(x=>x.n==='明智光秀'&&!x.dead);if(g)g.loyal=Math.max(g.loyal,70);}
};
TK.FORKS.push(
 T({id:'kiyosu_after',d:[1560,10,1],clan:'oda',req:['okehazama_o:1'],cond:e=>e.S.castles.kiyosu.owner===e.k,who:'織田信長',title:'今川の退き陣',
  text:'清洲城を守り抜いた。今川の大軍は兵糧が尽き、駿河へ退こうとしている。',
  opts:[{t:'退く今川軍に追い討ちをかける',d:'当たれば義元を討てるかもしれない',f(e){e.troops('kiyosu',-1500);const y=e.S.gens.find(g=>g.n==='今川義元'&&!g.dead);if(y&&Math.random()<.4){G.killGen?G.killGen(y):(y.dead=true);G.chron({title:'今川義元、討たれる',text:'追い討ちを受けた今川軍は崩れ、義元は乱戦の中で討たれた。',who:'織田信長',d:G.date()},true);return '追い討ちが当たり、今川義元を討ち取った。';}return '追い討ちは今川の殿に阻まれた。';}},
   {t:'三河の松平元康に自立を促す',d:'金300 ・ 松平が今川から離れるかもしれない',f(e){e.gold(-300);if(Math.random()<.65){delete e.S.cancel['松平元康、岡崎に入る'];const ev=TK.HIST.find(x=>x.title==='松平元康、岡崎に入る');if(ev){G.applyEv(Object.assign({},ev,{alt:1}));if(e.S.clans.tokugawa){e.ally('tokugawa',720);}}return '松平元康が今川から離れ、織田と手を結んだ。';}return '元康は今川への義理を捨てなかった。';}},
   {t:'城の守りをさらに固める',d:'清洲の堅さが上がる',f(e){const c=e.S.castles.kiyosu;c.durMax+=400;c.dur+=400;}}]}),
 T({id:'owari_i',d:[1560,6,25],clan:'imagawa',req:['okehazama_i:1'],who:'今川義元',title:'尾張をどう治めるか',
  text:'織田の奇襲を退けた。清洲の信長は兵を減らし、城に籠もっている。',
  opts:[{t:'信長に降伏を勧める',d:'国力の差が大きいほど応じやすい',f(e){const p=Math.min(.8,G.power(e.k)/Math.max(1,G.power('oda'))/6);if(e.S.clans.oda&&e.S.clans.oda.alive&&Math.random()<p){e.ally('oda',1e9);e.S.vassal=Object.assign(e.S.vassal||{},{oda:e.k});return '信長は今川に降った。';}e.rel('oda',-20);return '信長は降伏を拒んだ。';}},
   {t:'自ら清洲を攻める',d:'城を選んで攻めよう',f(){return '清洲を攻めるなら、清洲城を選んで「攻める」。';}},
   {t:'大高・鳴海を固め、駿府へ戻る',d:'兵と金を国元に戻す',f(e){e.gold(300);e.troops(e.cap,3000);}}]}),
 T({id:'vassal_o',d:[1562,1,15],clan:'oda',req:['okehazama_o:2'],who:'織田信長',title:'今川家中での立場',
  text:'今川に降って一年余り。義元は織田に上洛の先鋒を求めている。',
  opts:[{t:'上洛の先鋒を務める',d:'今川との仲が深まる',f(e){e.rel('imagawa',15);e.gold(300);e.troops(e.cap,-1000);}},
   {t:'今川を見限り、独立する',d:'今川と戦になる',f(e){delete e.S.ally[ekey(e.k,'imagawa')];if(e.S.vassal)delete e.S.vassal.oda;e.rel('imagawa',-50);e.S.war=e.S.war||{};e.S.war[ekey(e.k,'imagawa')]=e.S.t;return '信長は今川との縁を切った。';}}]}),
 T({id:'mino_t',d:[1569,6,1],clan:'takeda',req:['suruga_t:1'],who:'武田信玄',title:'西への道',
  text:'駿河を攻めなかった武田は、美濃の織田と境を接している。',
  opts:[{t:'織田と同盟し、上杉に備える',d:'織田と2年の同盟',f(e){e.ally('oda',720);}},
   {t:'織田と戦い、西へ出る',d:'織田と戦になる',f(e){e.rel('oda',-30);e.S.war=e.S.war||{};e.S.war[ekey(e.k,'oda')]=e.S.t;}}]}),
 T({id:'chugoku_o',d:[1582,8,1],clan:'oda',req:['honnoji_o:1','honnoji_o:2'],who:'織田信長',title:'毛利との決着',
  text:'備中高松城は水に沈みかけている。毛利は国を割いての和睦を申し出てきた。',
  opts:[{t:'和睦し、中国を分け合う',d:'毛利と2年の同盟',f(e){e.ally('mori',720);e.gold(500);}},
   {t:'和睦を退け、毛利を攻め滅ぼす',d:'姫路の兵が増える',f(e){if(e.S.castles.himeji&&e.S.castles.himeji.owner===e.k)e.troops('himeji',6000);e.rel('mori',-30);}}]}),
 T({id:'kanto_o',d:[1583,6,1],clan:'oda',req:['honnoji_o:1','honnoji_o:2'],who:'織田信長',title:'関東の北条',
  text:'甲斐・信濃を得て、関東の北条と境を接した。',
  opts:[{t:'北条に臣従を求める',d:'国力の差が大きいほど応じやすい',f(e){const p=Math.min(.85,G.power(e.k)/Math.max(1,G.power('hojo'))/5);if(e.S.clans.hojo&&e.S.clans.hojo.alive&&Math.random()<p){e.ally('hojo',1e9);e.S.vassal=Object.assign(e.S.vassal||{},{hojo:e.k});e.div('hojo');return '北条氏政は織田に従った。';}e.rel('hojo',-15);return '北条は臣従を拒んだ。';}},
   {t:'関東攻めの支度を始める',d:'金500 ・ 兵が増える',f(e){e.gold(-500);for(const id of e.ids.slice(0,4))e.troops(id,1500);}}]}),
 T({id:'tenka_o',d:[1585,7,1],clan:'oda',req:['honnoji_o:1','honnoji_o:2'],who:'織田信長',title:'天下人の位',
  text:'朝廷が、関白・太政大臣・征夷大将軍のいずれかに就くよう求めてきた。',
  opts:[{t:'征夷大将軍となり幕府を開く',d:'家臣の忠誠と諸家の友好が上がる',f(e){for(const g of e.S.gens)if(g.clan===e.k&&!g.dead)g.loyal=Math.min(100,g.loyal+10);for(const j of G.alive())if(j!==e.k)e.rel(j,6);}},
   {t:'位を受けず、天下布武を貫く',d:'城の士気が上がる',f(e){for(const id of e.ids){const c=e.S.castles[id];c.morale=Math.min(100,c.morale+12);}}}]})
);
G.altResolve=a=>{const [fid,oi,ai]=a.ref.split(':');const L=ALT[fid+':'+oi];return L&&L[+ai]?L[+ai].ev:null;};
function queueAlt(fid,oi){const L=ALT[fid+':'+oi];if(!L)return;const S=G.S();S.altQ=S.altQ||[];L.forEach((x,ai)=>{const t=x.d?G.evT({d:x.d}):S.t+x.after;S.altQ.push({t:Math.max(S.t+1,t),ref:`${fid}:${oi}:${ai}`});});}
function runAlt(){const S=G.S();if(!S.altQ||!S.altQ.length)return;const due=S.altQ.filter(a=>a.t<=S.t);if(!due.length)return;S.altQ=S.altQ.filter(a=>a.t>S.t);
 for(const a of due){const ev=G.altResolve(a);if(!ev)continue;const full=Object.assign({alt:1,d:[G.date().y,G.date().m,G.date().d]},ev);
  try{if(ev.k==='fx'){FX[ev.fx]&&FX[ev.fx](E());G.chron(full,true);}else G.applyEv(full);}catch(err){console.error('alt',err);}}}

/* --- 天下の動き（歴史が分かれた後に起こる出来事） --- */
function dynamic(){const S=G.S(),k=S.player;const e=E();const alive=G.alive();
 // 包囲網：一つの家が抜きん出ると、周りが手を結ぶ
 if(S.t-(S.lastHoui||-9999)>=600){const ps=alive.filter(j=>!G.FOREIGN.includes(j)).map(j=>[j,G.power(j)]).sort((a,b)=>b[1]-a[1]);const tot=ps.reduce((s,x)=>s+x[1],0);
  if(ps.length>3&&!G.FOREIGN.includes(ps[0][0])){const [T0,p0]=ps[0];if(S.div[T0]&&p0>tot*.15&&p0>ps[1][1]*1.6){
   const near=new Set();for(const id of G.clanCastles(T0))for(const n of G.ADJ[id])near.add(S.castles[n].owner);
   const mem=ps.slice(1).map(x=>x[0]).filter(j=>!G.FOREIGN.includes(j)&&!G.allied(j,T0)&&!(S.vassal&&S.vassal[j]===T0)&&(near.has(j)||G.power(j)>p0*.2)).slice(0,4);
   if(mem.length>=2){S.lastHoui=S.t;
    if(T0===k){S.evQ.push({dyn:'houi_t',mem});}
    else if(mem.includes(k)){S.evQ.push({dyn:'houi_m',T:T0,mem});}
    else{for(let i=0;i<mem.length;i++)for(let j=i+1;j<mem.length;j++)S.ally[ekey(mem[i],mem[j])]=Math.max(S.ally[ekey(mem[i],mem[j])]||0,720);for(const j of mem){G.addRel(j,T0,-20);G.diverge(j);}
     G.chron({title:G.CN(T0)+'包囲網',alt:1,text:`勢いを増す${nm(T0)}に対し、${mem.map(nm).join('・')}が手を結んだ。`,who:(G.gen(S.clans[mem[0]].leader)||{}).n},true);}}}}}
 // 滅亡の危機：自家が史実どおり最後の城を失う出来事が近づいたら、当主として選ばせる
 if(!S.div[k]&&S.clans[k]&&S.clans[k].alive){const mine=new Set(G.clanCastles(k));
  for(let i=S.hi||0;i<TK.HIST.length;i++){const h=TK.HIST[i];const t=G.evT(h);if(t>S.t+35)break;if(t<S.t)continue;
   let lose=false,by=h.clan;
   if(h.k==='take'&&h.castles&&mine.size&&[...mine].every(id=>h.castles.includes(id)))lose=true;
   if((h.k==='absorb'||h.k==='takeall')&&h.b===k)lose=true;
   if(h.k==='submit'&&h.b===k)continue;
   const key='fall:'+(h.title||h.k+i);
   if(lose&&by&&by!==k&&!S.evSeen[key]&&!(S.cancel&&h.title&&S.cancel[h.title])){S.evSeen[key]=1;S.evQ.push({dyn:'fall',by,title:h.title||'',t,kind:h.k});return;}}}
 if(!S.div[k])return;
 // 上洛：京を押さえた
 if(!S.evSeen.joraku_dyn&&S.castles.kyo&&S.castles.kyo.owner===k){S.evSeen.joraku_dyn=1;S.evQ.push({dyn:'kyo'});return;}
 // 謀反の噂：忠誠の低い城主
 if(Math.random()<.25){const g=S.gens.find(g=>g.clan===k&&!g.dead&&!G.isLeader(g)&&g.loyal<32&&g.unit===null&&S.castles[g.loc]&&S.castles[g.loc].owner===k&&S.clans[k].cap!==g.loc);
  if(g&&!S.evQ.some(q=>q.dyn==='muhon')){S.evQ.push({dyn:'muhon',g:g.id});return;}}
}
const DYN={
 // 史実の出陣：急に出ていかないよう、当主に知らせて諮る
 shutsujin:q=>{const S=G.S(),k=S.player;const u=S.units.find(x=>x.id===q.uid);if(!u)return null;const L=u.gens.length?G.gen(u.gens[0]):null;
  return {title:'出陣の評定：'+q.title,who:L&&L.n,clan:k,text:`${q.title}に向けて、${L?L.n+'が':''}${G.fmt(u.troops)}の兵を率いて${G.cname(q.to)}へ出陣する。${q.text?'（'+q.text.slice(0,60)+'）':''}`,
   opts:[{t:'史実どおり出陣させる',hist:1,d:'筋書きどおり'},
    {t:'兵を増して送り出す',d:'金300で兵+3,000',f(e){if(e.cl.gold<300)return '金が足りない。';e.gold(-300);u.troops+=3000;u.troops0+=3000;return `${q.title}への軍勢に兵を足した。`;}},
    {t:'出陣を見送る',d:'この戦は起きない。歴史が分かれる',f(e){e.cancel(q.title);S.units=S.units.filter(x=>x!==u);for(const id of u.gens){const g=G.gen(id);if(g){g.unit=null;}}e.div(k);return `${q.title}への出陣を取りやめた。`;}}]};},
 // 敵が攻めてくる
 raid:q=>{const S=G.S(),k=S.player;const u=S.units.find(x=>x.id===q.uid);if(!u)return null;const L=u.gens.length?G.gen(u.gens[0]):null;const c=S.castles[q.to];if(!c||c.owner!==k)return null;
  const al=G.alive().filter(j=>j!==k&&G.allied(j,k)&&j!==u.clan);
  return {title:'敵の来襲',who:L&&L.n,clan:u.clan,text:`${nm(u.clan)}の${L?L.n+'が':''}${G.fmt(u.troops)}の兵で${G.cname(q.to)}に迫っている。城の兵は${G.fmt(c.troops)}。`,
   opts:[{t:'城に籠もって守る',d:'城の堅さと士気が上がる',f(e){c.dur=Math.min(c.durMax*1.2,c.dur+c.durMax*.15);c.morale=Math.min(100,c.morale+10);return `${G.cname(q.to)}は籠城の備えを固めた。`;}},
    ...(al.length?[{t:`${nm(al[0])}に後詰めを頼む`,d:'同盟国から兵が入る（友好が少し下がる）',f(e){const add=Math.round(Math.min(6000,G.clanTroops(al[0])*.1)/100)*100;c.troops+=add;G.addRel(k,al[0],-6);return `${nm(al[0])}から${G.fmt(add)}の後詰めが入った。`;}}]:[]),
    {t:'近くの城から兵を集める',d:'隣の自城の兵の三割を移す',f(e){let n=0;for(const id of G.ADJ[q.to]){const d=S.castles[id];if(d.owner===k&&d.troops>2000){const m=Math.round(d.troops*.3);d.troops-=m;c.troops+=m;n+=m;}}return n?`近くの城から${G.fmt(n)}の兵を呼び寄せた。`:'呼び寄せられる兵がいなかった。';}},
    {t:'和を請う',d:'金400を差し出し、軍を引かせる。歴史が分かれる',f(e){if(e.cl.gold<400)return '金が足りない。';e.gold(-400);G.addRel(k,u.clan,15);S.units=S.units.filter(x=>x!==u);for(const id of u.gens){const g=G.gen(id);if(g)g.unit=null;}e.div(k);return `${nm(u.clan)}に金を送り、兵を引かせた。`;}}]};},
 // 主家に仕える家：史実で自立する時
 jiritsu_h:q=>{const S=G.S(),R=G.retainer();if(!R)return null;const pa=R.parent;
  return {title:'自立の時',who:R.leader,clan:pa,text:`史実では、まもなく${R.title?'「'+R.title+'」を機に':''}${R.leader}が${nm(pa)}から独り立ちする。`,
   opts:[{t:'史実どおり自立する',hist:1,d:'史実の筋書きで城と家臣を得る'},
    {t:`${nm(pa)}に留まる`,d:'家臣のまま仕え続ける。歴史が分かれる',f(e){R.stay=1;G.diverge(pa);return `${R.leader}は${nm(pa)}に留まることを選んだ。`;}}]};},
 // 主家に仕える家：いつでも自立を図れる
 jiritsu_try:q=>{const S=G.S(),R=G.retainer();if(!R)return null;const pa=R.parent;const L=G.genByName(R.leader);const P=G.power(pa);
  const odds=Math.max(.15,Math.min(.85,((L?L.t+L.c:120)/200)-.1));
  return {title:'自立を図る',who:R.leader,clan:pa,text:`${R.leader}は${nm(pa)}の家臣である。主家の許しを得て城持ちとなるか、主家に背いて独り立ちするか。`,
   opts:[{t:'主家の許しを願い、城持ちとなる',d:`見込み ${Math.round(odds*100)}% ・ 臣従したまま城を預かる。歴史が分かれる`,f(e){if(Math.random()<odds){const cs=G.becomeIndependent('grant');G.diverge(S.player);return cs?`${R.leader}は${nm(pa)}の許しを得て、${cs.map(G.cname).join('・')}を預かった。`:'預かる城がなかった。';}R.lastTry=S.t;return `${nm(pa)}は首を縦に振らなかった。`;}},
    {t:'主家に背いて独り立ちする',d:'城を奪って独立し、主家と戦になる。歴史が分かれる',f(e){const cs=G.becomeIndependent('rebel');return cs?`${R.leader}は${nm(pa)}に背き、${cs.map(G.cname).join('・')}で兵を挙げた。`:'拠る城がなかった。';}},
    {t:'まだ時ではない',d:'家臣として仕え続ける',f(e){return '';}}]};},
 fall:q=>{const S=G.S(),k=S.player;const L=G.gen(S.clans[k].leader);const D=G.date(q.t);
  return {title:'家の存亡',who:L&&L.n,clan:k,text:`このまま史実どおりに進めば、${G.monK(q.t)}に${q.title?'「'+q.title+'」で':''}${nm(q.by)}に最後の城を明け渡し、${nm(k)}は大名の座を失う。`,
   opts:[{t:'史実どおり、運命を受け入れる',hist:1,d:'見守り続ける。ほかの家を継いで続けることもできる'},
    {t:'城に籠もって抗う',d:'兵と兵糧が集まる。歴史が分かれる',f(e){e.troops(e.cap,3000);e.food(6000);e.rel(q.by,-30);e.div(k,q.by);return `${nm(k)}は降らず、城に籠もって${nm(q.by)}を迎え撃つ構えを取った。`;}},
    {t:'和を請い、本城だけは残してもらう',d:'金を差し出す。歴史が分かれる',f(e){if(q.title)e.cancel(q.title);e.gold(-Math.min(e.cl.gold,600));e.ally(q.by,1e9);e.S.vassal=Object.assign(e.S.vassal||{},{[k]:q.by});e.div(k);return `${nm(k)}は${nm(q.by)}に従い、本城を保った。`;}}]};},
 houi_t:q=>({title:G.CN(G.S().player)+'包囲網',text:`抜きん出た当家に対し、${q.mem.map(nm).join('・')}が手を結ぼうとしている。`,
  opts:[{t:'各個撃破に備える',d:'城の士気が上がる。包囲網は結ばれる',f(e){for(let i=0;i<q.mem.length;i++)for(let j=i+1;j<q.mem.length;j++)e.S.ally[ekey(q.mem[i],q.mem[j])]=720;for(const j of q.mem)e.rel(j,-20);for(const id of e.ids){const c=e.S.castles[id];c.morale=Math.min(100,c.morale+10);}}},
   {t:'朝廷に和睦の仲介を頼む',d:'金600 ・ 包囲網の家と1年和睦',f(e){e.gold(-600);for(const j of q.mem)e.ally(j,360);return '朝廷の仲介で、包囲網の諸家と和睦した。';}}]}),
 houi_m:q=>({title:G.CN(q.T)+'包囲網への誘い',clan:q.mem.find(j=>j!==G.S().player),text:`勢いを増す${nm(q.T)}を抑えるため、${q.mem.filter(j=>j!==G.S().player).map(nm).join('・')}が同盟を求めてきた。`,
  opts:[{t:'包囲網に加わる',d:'諸家と2年の同盟',f(e){for(const j of q.mem)if(j!==e.k)e.ally(j,720);for(let i=0;i<q.mem.length;i++)for(let j=i+1;j<q.mem.length;j++)e.S.ally[ekey(q.mem[i],q.mem[j])]=Math.max(e.S.ally[ekey(q.mem[i],q.mem[j])]||0,720);e.rel(q.T,-25);}},
   {t:'加わらず、様子を見る',d:'諸家の友好が少し下がる',f(e){for(const j of q.mem)e.rel(j,-5);}}]}),
 kyo:q=>({title:'京を押さえる',text:'京を手に入れた。公家や寺社、町衆が当家の出方をうかがっている。',
  opts:[{t:'朝廷に献金し、官位を得る',d:'金600 ・ 民忠と諸家の友好が上がる',f(e){e.gold(-600);e.loyalAll(8);for(const j of G.alive())if(j!==e.k)e.rel(j,6);}},
   {t:'町衆から礼銭を集める',d:'金が増え、京の民忠が下がる',f(e){e.gold(700);e.loyal('kyo',-12);}},
   {t:'当主みずから京に入る',d:'当主が京に移り、諸家の友好が上がる',f(e){const L=G.gen(e.cl.leader);if(L&&L.unit===null){L.loc='kyo';}for(const j of G.alive())if(j!==e.k)e.rel(j,4);return (L?L.n:'当主')+'が京に入った。';}},
   {t:'京の守りを固める',d:'京の堅さと兵が増える',f(e){const c=e.S.castles.kyo;c.durMax+=500;c.dur+=500;e.troops('kyo',2000);}}]}),
 muhon:q=>{const S=G.S();const g=S.gens.find(x=>x.id===q.g);if(!g||g.dead||g.clan!==S.player)return null;const at=g.loc;return {title:'謀反の噂',who:g.n,text:`${G.cname(at)}を預かる${g.n}（忠誠 ${Math.round(g.loyal)}）に、敵と通じているという噂がある。`,
  opts:[{t:'先手を打って討つ',d:'城の民忠と家中の忠誠が少し下がる',f(e){G.killGen?G.killGen(g):(g.dead=true);e.loyal(at,-10);for(const x of e.S.gens)if(x.clan===e.k&&!x.dead)x.loyal=Math.max(0,x.loyal-3);return `${g.n}を討った。`;}},
   {t:'領地を加増して宥める',d:'金300 ・ 忠誠が大きく上がる',f(e){e.gold(-300);g.loyal=Math.min(100,g.loyal+30);}},
   {t:'捨て置く',d:'何も起きないかもしれない',f(e){if(Math.random()<.45){const r=G.negaeriForce?G.negaeriForce(at):null;return r||`${g.n}は動かなかった。`;}return `${g.n}は動かなかった。`;}}]};}
};
/* --- 領国の出来事 --- */
const pickCastle=(e,f)=>{const a=e.ids.filter(f);return a.length?a[Math.floor(Math.random()*a.length)]:null;};
/* --- 分かれ道の追加（第21版）：選べる道を広げ、本能寺の後から大坂の陣までの裁定・評定を足す --- */
{const ADD3={
 okehazama_i:{t:'大高城に入り、尾張の出方を見る',d:'城に籠もって兵を休める。歴史が分かれる',f(e){e.cancel('桶狭間の戦い','松平元康、岡崎に入る');e.food(4000);e.div('imagawa','oda');return '義元は大高城に入り、織田の動きをうかがった。';}},
 kiyosu_d:{t:'和議を受けつつ、美濃の斎藤とも結ぶ',d:'両方と誼を通じる。歴史が分かれる',f(e){e.rel('tokugawa',10);e.rel('saito',25);e.div('oda');return '信長は松平と和を結ぶ一方、斎藤にも使者を送った。';}},
 nagao_k:{t:'まず信濃へ出て、武田を叩く',d:'川中島へ兵を向ける。歴史が分かれる',f(e){e.cancel('長尾景虎の関東出兵','小田原城の戦い');e.rel('takeda',-25);e.troops(e.cap,1000);e.div('nagao','takeda');return '景虎は関東を後回しにし、信濃の武田に矛先を向けた。';}},
 kanegasaki_a:{t:'どちらにもつかず、北近江を守る',d:'織田・朝倉と距離を置く。歴史が分かれる',f(e){e.cancel('姉川の戦い','小谷城落城');e.rel('oda',-10);e.rel('asakura',-10);e.troops(e.cap,1500);e.div('azai');return '長政は兵を動かさず、小谷城を固めた。';}},
 hiei_o:{t:'山を囲み、兵糧を断って降らせる',d:'焼かずに時をかける。歴史が分かれる',f(e){e.cancel('比叡山焼き討ち');e.food(-3000);e.div('oda');return '信長は比叡山を囲み、僧兵が下りるのを待った。';}},
 mimikawa_o:{t:'島津と伊東の間を取り持つ',d:'使者を送り、和議を勧める。歴史が分かれる',f(e){e.cancel('耳川の戦い');e.rel('shimazu',20);e.gold(-200);e.div('otomo');return '宗麟は島津に和議を持ちかけた。';}},
 joraku_h:{t:'朝廷を動かし、和を勧める勅使を送る',d:'金600 ・ 戦わずに時をかける。歴史が分かれる',f(e){e.cancel('徳川家康の上洛');e.gold(-600);e.rel('tokugawa',15);e.div('hashiba');return '秀吉は朝廷を通じて家康に和を勧めた。';}},
 odawara_h:{t:'氏直だけを上洛させ、時を稼ぐ',d:'豊臣の出方を見る。歴史が分かれる',f(e){e.cancel('小田原征伐','小田原開城');e.rel('hashiba',10);e.troops(e.cap,3000);e.div('hojo');return '北条は当主の氏直を上洛させ、氏政は小田原に残った。';}},
 kyushu_s:{t:'薩摩に退き、守りを固めて和議を探る',d:'日向・肥後を手放す。歴史が分かれる',f(e){e.troops(e.cap,2500);e.rel('hashiba',10);e.div('shimazu');return '義久は兵を薩摩へ集め、和議の道を探った。';}},
 shikoku_c:{t:'土佐と阿波を求めて和議に臨む',d:'金400を贈る。歴史が分かれる',f(e){e.gold(-400);e.rel('hashiba',15);e.div('chosokabe');return '元親は土佐と阿波を残すよう求め、秀長と交渉に入った。';}},
 mikata_t:{t:'織田の援軍を待ち、城から打って出る',d:'機を待つ。歴史が分かれる',f(e){e.cancel('三方ヶ原の戦い');e.rel('oda',5);e.div('tokugawa');return '家康は織田の援軍を待ってから動くことにした。';}},
 nagashino_t:{t:'鳶ヶ巣山の守りを厚くしてから戦う',d:'退路を固める。歴史が分かれる',f(e){e.cancel('長篠の戦い','death:山県昌景');e.troops(e.cap,-1000);e.div('takeda');return '勝頼は鳶ヶ巣山の砦に兵を足し、慎重に構えた。';}},
 takamatsu_m:{t:'清水宗治を救い出し、城を明け渡す',d:'備中を手放す。歴史が分かれる',f(e){e.rel('hashiba',15);e.div('mori');return '毛利は城を明け渡す代わりに、城兵と宗治を救った。';}},
 koshu_t:{t:'上野の真田を頼って岩櫃城へ落ちる',d:'真田昌幸のもとで再起を図る。歴史が分かれる',f(e){e.cancel('甲州征伐');e.rel('sanada',30);e.div('takeda');return '勝頼は真田昌幸の誘いに応じ、上野へ向かった。';}},
 otate_u:{t:'景虎に家督を譲り、春日山を出る',d:'越後は北条の縁につながる。歴史が分かれる',f(e){e.cancel('御館の乱');e.rel('hojo',35);e.div('nagao');return '景勝は家督を景虎に譲った。';}}};
 for(const f of TK.FORKS){const o=ADD3[f.id];if(o&&f.opts.length<3)f.opts.push(o);}}
// 三つ目の道（二択だった分かれ道に）
{const ADD4={
 suruga_t:{t:'今川と北条の間を取り持ち、三国同盟を保つ',d:'今川・北条との仲が深まる。歴史が分かれる',f(e){e.cancel('駿河侵攻');e.rel('imagawa',15);e.rel('hojo',15);e.div('takeda');return '信玄は駿河を攻めず、今川と北条の仲を取り持った。';}},
 joraku_o:{t:'義昭を迎えつつ、上洛は三好と話をつけてから',d:'金500。畿内の家との仲が上がる。歴史が分かれる',f(e){e.cancel('信長上洛');e.gold(-500);e.rel('miyoshi',20);e.rel('ashikaga',20);e.div('oda');return '信長は義昭を岐阜に迎えたが、上洛は三好との談合を待つことにした。';}},
 nagashino_o:{t:'自ら出ず、佐久間・滝川に一軍を預けて送る',d:'援軍は少なくなる。歴史が分かれる',f(e){e.cancel('長篠の戦い');e.rel('tokugawa',-5);e.div('oda','takeda');return '信長は自らは出ず、一軍だけを三河へ送った。';}},
 joraku_t:{t:'上洛はするが、臣従の誓紙は出さない',d:'秀吉との仲は保つ。歴史が分かれる',f(e){e.cancel('徳川家康の上洛');e.rel('hashiba',5);e.div('tokugawa');return '家康は上洛したが、臣従の誓紙は出さず、含みを残した。';}},
 hojo_t:{t:'自ら上洛して、秀吉に誼を通じる',d:'豊臣との仲が上がる。歴史が分かれる',f(e){e.cancel('名胡桃城事件','小田原征伐','小田原開城');e.rel('hashiba',30);e.div('hojo');return '北条氏政は上洛して秀吉に誼を通じた。';}},
 odawara_d:{t:'片倉景綱を名代として送り、自らは会津に留まる',d:'秀吉の心証は半ば。歴史が分かれる',f(e){e.rel('hashiba',-10);e.div('date');return '政宗は片倉景綱を名代に立てた。';}},
 kawanaka_t:{t:'越後へ使いを送り、川中島の和を探る',d:'上杉との仲が上がる。歴史が分かれる',f(e){e.cancel('第四次川中島の戦い');e.rel('nagao',20);e.div('takeda');return '信玄は長尾方に使いを送り、和を探った。';}},
 arioka_o:{t:'村重の妻子を盾に、降るよう迫る',d:'早く片がつくが恨みを残す。歴史が分かれる',f(e){e.cancel('有岡城の戦い');e.loyalAll(-6);e.div('oda');return '信長は荒木一族を盾に村重に降伏を迫った。';}},
 vassal_o:{t:'今川に従いつつ、織田とひそかに通じる',d:'二股をかける。歴史が分かれる',f(e){e.rel('tokugawa',15);e.div('oda');return 'ひそかに使いを往来させた。';}},
 mino_t:{t:'上杉と和し、北条と結んで関東へ',d:'東へ向かう。歴史が分かれる',f(e){e.rel('nagao',20);e.rel('hojo',15);e.div('takeda');return '信玄は上杉と和し、関東へ目を向けた。';}},
 chugoku_o:{t:'毛利に国境を定めさせ、人質を取る',d:'金と人質で和を結ぶ。歴史が分かれる',f(e){e.gold(800);e.rel('mori',10);e.div('oda','mori');return '毛利に国境を定めさせ、人質を取って和を結んだ。';}},
 kanto_o:{t:'上杉と結び、北と西から北条を挟む',d:'上杉との仲が上がる。歴史が分かれる',f(e){e.rel('nagao',25);e.rel('uesugi',25);e.rel('hojo',-20);e.div('oda');return '上杉と結び、北条を挟む構えを取った。';}},
 tenka_o:{t:'関白となり、朝廷の内から天下を治める',d:'公家衆との仲が上がる。歴史が分かれる',f(e){e.gold(500);e.loyalAll(5);e.div('oda');return '関白の位を受け、朝廷の内から天下を治めることにした。';}}};
 for(const f of TK.FORKS){const o=ADD4[f.id];if(o&&f.opts.length<3)f.opts.push(o);}}

const alive=(e,k)=>e.S.clans[k]&&e.S.clans[k].alive;
TK.FORKS.push(
 T({id:'kiyosu_h',d:[1582,7,14],clan:'hashiba',who:'羽柴秀吉',title:'清洲での評定',
  text:'信長と信忠を失った織田家の跡目を決めるため、重臣が清洲に集まる。柴田勝家は信孝を推している。',
  opts:[{t:'信忠の子・三法師を推す',hist:1,d:'幼い主君を立て、実権を握る'},
   {t:'柴田勝家と並んで信孝を推す',d:'柴田との仲がよくなる。歴史が分かれる',f(e){e.cancel('清洲会議','岐阜城の囲み','賤ヶ岳の戦い');e.rel('oda',20);e.div('hashiba');return '秀吉は信孝を推し、柴田勝家と手を携えた。';}},
   {t:'評定に出ず、山崎の勝ちを盾に畿内を固める',d:'織田家中と不和になる。歴史が分かれる',f(e){e.cancel('清洲会議');e.rel('oda',-30);e.troops(e.cap,4000);e.div('hashiba','oda');return '秀吉は清洲に向かわず、京と大坂を押さえた。';}}]}),
 T({id:'shizu_h',d:[1583,6,8],clan:'hashiba',who:'羽柴秀吉',title:'賤ヶ岳の急報',
  text:'美濃の大垣にいるところへ、佐久間盛政が近江の砦を破ったとの報せが届いた。',
  opts:[{t:'夜を徹して近江へ駆け戻る',hist:1,d:'美濃大返し'},
   {t:'大垣から岐阜の信孝を先に攻める',d:'近江は守りに任せる。歴史が分かれる',f(e){e.cancel('賤ヶ岳の戦い');e.div('hashiba');return '秀吉は近江を家臣に任せ、岐阜城へ向かった。';}},
   {t:'柴田勝家に和を申し入れる',d:'金500。歴史が分かれる',f(e){e.cancel('賤ヶ岳の戦い');e.gold(-500);e.rel('oda',20);e.div('hashiba');return '秀吉は柴田勝家に和議の使者を送った。';}}]}),
 T({id:'komaki_h',d:[1584,5,15],clan:'hashiba',who:'羽柴秀吉',title:'三河中入りの献策',
  text:'小牧山の家康と睨み合いが続く。池田恒興が、手薄な三河の岡崎を突く「中入り」を願い出た。',
  opts:[{t:'中入りを許し、秀次を大将に送り出す',hist:1,d:'長久手で家康に待ち伏せされる'},
   {t:'中入りを退け、陣を固めて睨み合う',d:'池田・森は生き延びる。歴史が分かれる',f(e){e.cancel('小牧・長久手の戦い');e.div('hashiba');return '秀吉は中入りを許さず、陣城を固めて持久の構えを取った。';}},
   {t:'信雄にだけ和を持ちかけ、家康を孤立させる',d:'金400。歴史が分かれる',f(e){e.cancel('小牧・長久手の戦い');e.gold(-400);e.rel('oda',25);e.div('hashiba');return '秀吉は信雄に和議を持ちかけ、家康の大義を奪いにかかった。';}}]}),
 T({id:'komaki_t',d:[1584,5,18],clan:'tokugawa',who:'徳川家康',title:'中入りの報せ',
  text:'羽柴秀次らの大軍が、ひそかに三河へ向かっているとの報せが入った。',
  opts:[{t:'小牧山を出て後を追い、長久手で討つ',hist:1,d:'池田恒興・森長可を討ち取る'},
   {t:'岡崎へ使いを走らせ、城に籠もらせる',d:'小牧山は動かない。歴史が分かれる',f(e){e.cancel('小牧・長久手の戦い');e.troops('okazaki',2000);e.div('tokugawa');return '家康は小牧山を動かず、岡崎の守りを固めさせた。';}},
   {t:'手薄な秀吉の本陣を突く',d:'大きな賭け。歴史が分かれる',f(e){e.cancel('小牧・長久手の戦い');e.rel('hashiba',-20);e.div('tokugawa','hashiba');return '家康は中入りの軍を放っておき、秀吉の本陣に向かった。';}}]}),
 T({id:'karairi_h',d:[1592,4,5],clan:'hashiba',who:'豊臣秀吉',title:'唐入りの評定',cond:e=>alive(e,'joseon'),
  text:'名護屋に諸大名が集まった。朝鮮は明への道を貸すことを拒んでいる。',
  opts:[{t:'小西・加藤を先陣に、海を渡らせる',hist:1,d:'文禄の役が始まる'},
   {t:'渡海を取りやめ、国内の普請に力を注ぐ',d:'金と兵が残る。歴史が分かれる',f(e){e.cancel('文禄の役','尚州の戦い','忠州の戦い','漢城陥落','平壌入城','咸鏡道の制圧','玉浦海戦','閑山島海戦');e.gold(1500);e.div('hashiba','joseon');return '秀吉は唐入りを取りやめた。名護屋の兵は国元へ帰された。';}},
   {t:'まず使者を送り、朝鮮に入貢を求める',d:'渡海を一年見合わせる。歴史が分かれる',f(e){e.cancel('文禄の役','尚州の戦い','忠州の戦い','漢城陥落','平壌入城','咸鏡道の制圧','玉浦海戦','閑山島海戦');e.rel('joseon',20);e.div('hashiba','joseon');return '秀吉は渡海を見合わせ、宗義智を朝鮮へ遣わした。';}}]}),
 T({id:'inubushi_s',d:[1600,8,25],clan:'sanada',who:'真田昌幸',title:'犬伏の評定',
  text:'会津へ向かう途中の下野犬伏で、石田三成の挙兵を知らせる密書が届いた。長男の信之は家康の家臣の娘を妻にしている。',
  opts:[{t:'父と信繁は西軍、信之は東軍に分かれる',hist:1,d:'どちらが勝っても家は残る'},
   {t:'親子そろって西軍につく',d:'徳川と敵対する。歴史が分かれる',f(e){e.rel('tokugawa',-35);e.rel('ishida',30);e.troops(e.cap,1500);e.div('sanada');return '真田は一家をあげて西軍についた。';}},
   {t:'親子そろって東軍につく',d:'徳川と固く結ぶ。歴史が分かれる',f(e){e.ally('tokugawa',1e9);e.rel('ishida',-30);e.div('sanada');return '昌幸は信之の言を容れ、一家で家康に従った。';}}]}),
 T({id:'oyama_t',d:[1600,8,28],clan:'tokugawa',who:'徳川家康',title:'小山評定',
  text:'下野小山の陣に諸将を集めた。上方で石田三成が挙兵し、伏見城が囲まれている。上杉を討つか、西へ返すか。',
  opts:[{t:'諸将とともに西へ取って返す',hist:1,d:'福島正則が真っ先に味方を誓う'},
   {t:'先に会津の上杉を討ち、後顧の憂いを断つ',d:'上方は後回し。歴史が分かれる',f(e){e.cancel('岐阜城の戦い','関ヶ原の戦い','佐和山城落城','石田三成の処刑');{const u=alive(e,'uesugi')?'uesugi':'nagao';e.rel(u,-30);e.div('tokugawa',u);}return '家康は会津攻めを続けることにした。上方は三成の手に落ちていく。';}},
   {t:'江戸に留まり、諸将だけを西へ向かわせる',d:'家康は動かない。歴史が分かれる',f(e){e.cancel('関ヶ原の戦い');e.troops(e.cap,5000);e.div('tokugawa');return '家康は江戸に留まり、福島・池田らを先に西へ向かわせた。';}}]}),
 T({id:'aizu_u',d:[1600,9,5],clan:'uesugi',who:'上杉景勝',title:'退く家康を追うか',
  text:'家康は小山から西へ引き返していく。直江兼続は、いまこそ背後を突くべきだと説いている。',
  opts:[{t:'追わずに、山形の最上を攻める',hist:1,d:'長谷堂城を囲む'},
   {t:'退く家康を追い、関東へ攻め入る',d:'徳川と正面から戦う。歴史が分かれる',f(e){e.rel('tokugawa',-35);e.troops(e.cap,3000);e.div(e.k,'tokugawa');return '景勝は兵を南へ向け、家康の後を追った。';}},
   {t:'家康と和を結び、会津を保つ',d:'金400。歴史が分かれる',f(e){e.cancel('上杉の米沢減封');e.gold(-400);e.ally('tokugawa',720);e.div(e.k);return '景勝は家康に使者を送り、和を結んだ。';}}]}),
 T({id:'mori_s',d:[1600,9,10],clan:'mori',who:'毛利輝元',title:'西軍の総大将',cond:e=>alive(e,'ishida'),
  text:'石田三成らに担がれ、大坂城で西軍の総大将となった。吉川広家は、ひそかに家康と通じるべきだと言う。',
  opts:[{t:'大坂城に留まり、秀元を関ヶ原へ送る',hist:1,d:'南宮山の毛利勢は動かない'},
   {t:'秀頼を奉じて、自ら関ヶ原へ出陣する',d:'毛利の全軍が戦う。歴史が分かれる',f(e){e.cancel('毛利の減封');e.troops(e.cap,4000);e.ally('ishida',1e9);e.rel('tokugawa',-40);e.div('mori','tokugawa');return '輝元は秀頼を奉じて大坂を発った。';}},
   {t:'広家の言を容れ、家康と和を結ぶ',d:'西軍から抜ける。歴史が分かれる',f(e){e.cancel('毛利の減封');e.ally('tokugawa',1e9);e.rel('ishida',-40);e.div('mori');return '輝元は総大将を降り、家康と和を結んだ。';}}]}),
 T({id:'osaka_h',d:[1614,11,20],clan:'hashiba',who:'豊臣秀頼',title:'大坂の評定',cond:e=>alive(e,'hashiba'),
  text:'方広寺の鐘の銘を咎められ、家康との仲は破れた。真田信繁ら浪人衆は打って出よと言い、大野治長らは籠城を説く。',
  opts:[{t:'浪人を集め、大坂城に籠もる',hist:1,d:'冬の陣・夏の陣へ'},
   {t:'信繁の策を容れ、京と宇治・瀬田を押さえる',d:'打って出る。歴史が分かれる',f(e){e.cancel('大坂冬の陣','大坂夏の陣','元和偃武');e.troops(e.cap,8000);e.rel('tokugawa',-30);e.div('hashiba','tokugawa');return '秀頼は打って出ることを決めた。浪人衆が京へ向かう。';}},
   {t:'国替えを受け入れ、大坂城を出る',d:'家を残す。歴史が分かれる',f(e){e.cancel('大坂冬の陣','大坂夏の陣');e.ally('tokugawa',1e9);e.div('hashiba');return '秀頼は家康の求めを容れ、大坂を出ることにした。';}}]})
);
{const a=TK.FORKS.find(f=>f.id==='aizu_u');if(a)TK.FORKS.push(Object.assign({},a,{id:'aizu_n',clan:'nagao'}));}

TK.INCIDENTS=[
 {id:'hosaku',when:e=>[9,10].includes(G.date().m),make:e=>({title:'豊作',text:'今年は田の実りがよい。年貢をどうするか。',
  opts:[{t:'年貢を多めに取る',d:'兵糧が増え、民忠が下がる',f(){const k=e.ids.reduce((s,id)=>s+e.S.castles[id].koku,0);e.food(k*700);e.loyalAll(-6);}},
   {t:'民に施す',d:'民忠が上がる',f(){e.loyalAll(7);}}]})},
 {id:'kyosaku',when:e=>[7,8,9].includes(G.date().m),make:e=>({title:'凶作',text:'長雨で稲が育たず、村々が飢えている。',
  opts:[{t:'蔵を開いて民を救う',d:'兵糧が減り、民忠が上がる',f(){e.food(-Math.round(e.cl.food*.25));e.loyalAll(6);}},
   {t:'年貢を変えない',d:'民忠が大きく下がる',f(){e.loyalAll(-10);}}]})},
 {id:'ikki',when:e=>e.ids.some(id=>e.S.castles[id].loyal<45),make:e=>{const id=pickCastle(e,id=>e.S.castles[id].loyal<45);return {title:'一揆の兆し',at:id,text:`${G.cname(id)}の領内で、年貢に苦しむ百姓が集まり始めている。`,
  opts:[{t:'兵を送って鎮める',d:'兵が減り、民忠が戻る',f(){e.troops(id,-800);e.loyal(id,12);}},
   {t:'年貢を減らして宥める',d:'金200',f(){e.gold(-200);e.loyal(id,20);}},
   {t:'放っておく',d:'何も起きないかもしれない',f(){if(Math.random()<.5){e.troops(id,-Math.round(e.S.castles[id].troops*.3));e.loyal(id,-10);return `${G.cname(id)}で一揆が起き、兵を失った。`;}return '騒ぎは自然に収まった。';}}]};}},
 {id:'nanban',when:e=>G.date().y>=1562,once:1,make:e=>({title:'南蛮の商人',text:'堺から、鉄砲と南蛮の品を持った商人がやって来た。',
  opts:[{t:'鉄砲を買い入れる',d:'金400 ・ 本城の兵が鍛えられる',f(){e.gold(-400);const c=e.S.castles[e.cap];c.train=Math.min(100,(c.train||50)+15);c.morale=Math.min(100,c.morale+8);}},
   {t:'交易と布教を許す',d:'本城の商業が伸びる',f(){const c=e.S.castles[e.cap];c.shogyoMax+=40;c.shogyo+=20;}},
   {t:'追い返す',d:'何もしない',f(){}}]})},
 {id:'ronin',when:e=>e.S.gens.some(g=>g.ronin&&!g.dead&&g.prisoner===null&&g.t+g.b>120&&!histWait(g)),make:e=>{const gs=e.S.gens.filter(g=>g.ronin&&!g.dead&&g.prisoner===null&&g.t+g.b>120&&!histWait(g)).sort((a,b)=>(b.t+b.b)-(a.t+a.b));const g=gs[0];return {title:'仕官の願い',who:g.n,text:`主家を失った${g.n}（統${g.t} 武${g.b} 知${g.c}）が、仕官を願い出てきた。`,
  opts:[{t:'召し抱える',d:'金150',f(){e.gold(-150);g.ronin=false;g.clan=e.k;g.loc=e.cap;g.loyal=70;g.unit=null;}},
   {t:'断る',d:'何もしない',f(){}}]};}},
 {id:'fuman',when:e=>e.S.gens.some(g=>g.clan===e.k&&!g.dead&&!G.isLeader(g)&&g.loyal<60),make:e=>{const g=e.S.gens.filter(g=>g.clan===e.k&&!g.dead&&!G.isLeader(g)&&g.loyal<60).sort((a,b)=>a.loyal-b.loyal)[0];return {title:'家臣の不満',who:g.n,text:`${g.n}が、手柄に見合う恩賞がないと不満を漏らしている（忠誠 ${Math.round(g.loyal)}）。`,
  opts:[{t:'領地を加増する',d:'金250 ・ 忠誠が大きく上がる',f(){e.gold(-250);g.loyal=Math.min(100,g.loyal+25);}},
   {t:'名物の茶器を与える',d:'金100 ・ 忠誠が上がる',f(){e.gold(-100);g.loyal=Math.min(100,g.loyal+12);}},
   {t:'捨て置く',d:'忠誠が下がる',f(){g.loyal=Math.max(0,g.loyal-10);}}]};}},
 {id:'konin',when:e=>neighbors(e).some(j=>!G.allied(e.k,j)&&G.rel(e.k,j)>=50),make:e=>{const j=neighbors(e).filter(j=>!G.allied(e.k,j)&&G.rel(e.k,j)>=50).sort((a,b)=>G.rel(e.k,b)-G.rel(e.k,a))[0];const L=G.gen(e.S.clans[j].leader);return {title:'婚姻の申し出',who:L&&L.n,clan:j,text:`隣国の${nm(j)}から、婚姻を結んで誼を通じたいとの申し出があった。`,
  opts:[{t:'受け入れて同盟を結ぶ',d:'創作の婚姻提案。2年の同盟。歴史が分かれる',f(){e.ally(j,720);e.div(e.k,j);return `${nm(j)}と婚姻を結び、同盟した。`;}},
   {t:'丁重に断る',d:'友好が少し下がる',f(){e.rel(j,-6);}}]};}},
 {id:'chakai',when:e=>e.cl.gold>=300,make:e=>({title:'名物の献上',text:'城下の商人が名物の茶入を献上してきた。',
  opts:[{t:'茶会を開き、近隣の大名を招く',d:'金150 ・ 隣国との友好が上がる',f(){e.gold(-150);for(const j of neighbors(e))e.rel(j,6);}},
   {t:'手柄のあった家臣に与える',d:'家臣の忠誠が上がる',f(){for(const g of e.S.gens)if(g.clan===e.k&&!g.dead)g.loyal=Math.min(100,g.loyal+5);}},
   {t:'売って軍資金にする',d:'金が増える',f(){e.gold(250);}}]})},
 {id:'kozui',when:e=>[6,7,8].includes(G.date().m),make:e=>{const id=pickCastle(e,()=>true);return {title:'大雨と洪水',at:id,text:`${G.cname(id)}の近くで川があふれ、田が流された。`,
  opts:[{t:'堤を築き直す',d:'金300 ・ 石高の伸びしろが増える',f(){e.gold(-300);const c=e.S.castles[id];c.kokuMax+=2;c.loyal=Math.min(100,c.loyal+5);}},
   {t:'村に任せる',d:'石高と民忠が下がる',f(){const c=e.S.castles[id];c.koku=Math.max(1,c.koku-1);c.loyal=Math.max(0,c.loyal-6);}}]};}},
 {id:'kozan',when:e=>Math.random()<.4,once:1,make:e=>{const id=pickCastle(e,()=>true);return {title:'山の鉱脈',at:id,text:`${G.cname(id)}の山で、金銀の鉱脈が見つかったという。`,
  opts:[{t:'山師を雇って掘らせる',d:'金300 ・ 商業が伸びる',f(){e.gold(-300);const c=e.S.castles[id];c.shogyoMax+=35;c.shogyo+=15;}},
   {t:'見送る',d:'何もしない',f(){}}]};}}
];
TK.INCIDENTS.push({id:'branch_governance',once:1,when:e=>Object.entries(e.S.branchGarrisons||{}).some(([id,d])=>d.owner===e.k),make:e=>{const pair=Object.entries(e.S.branchGarrisons||{}).find(([id,d])=>d.owner===e.k);if(!pair)return null;const [id,garrison]=pair,y=G.YOSHO.find(y=>y.id===id);return {title:'攻略した城の統治',text:`${y.n}の守備と城下の扱いを決める。これは攻略後の情勢から生じる創作の出来事です。`,opts:[{t:'守りを修復する',d:'金150・城の堅さを回復',f(){if(e.cl.gold<150)return '金が足りず、修復を見送った。';e.gold(-150);garrison.dur=Math.min(garrison.durMax,garrison.dur+150);}},{t:'兵糧を届け、守兵を休ませる',d:'兵糧200・守兵の士気を回復',f(){if(e.cl.food<200)return '兵糧が足りず、補給を見送った。';e.cl.food-=200;garrison.morale=Math.min(100,garrison.morale+20);}},{t:'現状を維持する',d:'追加の支出をしない',f(){}}]};}});
function neighbors(e){const s=new Set();for(const id of e.ids)for(const n of G.ADJ[id]){const o=e.S.castles[n].owner;if(o!==e.k)s.add(o);}return [...s].filter(j=>e.S.clans[j]&&e.S.clans[j].alive);}

/* --- 進行 --- */
G.events=function(){const S=G.S();if(!S||S.over||S.unified)return;const k=S.player,cl=S.clans[k];if(!cl||!cl.alive)return;
 S.evSeen=S.evSeen||{};S.evQ=S.evQ||[];
 S.evChose=S.evChose||{};runAlt();
 for(const f of TK.FORKS){if(S.evSeen[f.id]||f.clan!==k)continue;const t=G.evT(f);if(S.t<t)continue;S.evSeen[f.id]=1;
  if(S.t-t>45)continue;if(f.req){if(!f.req.some(r=>{const [a,b]=r.split(':');return S.evChose[a]===+b;}))continue;}else if(S.div[k]&&!f.anyDiv)continue;
  if(f.cond){try{if(!f.cond(E()))continue;}catch(_){continue;}}S.evQ.push({fork:f.id});}
 try{G.decideCheck();}catch(err){console.error(err);}
 if(G.date().d===5&&!S.evQ.length&&!G.retainer()){try{dynamic();}catch(err){console.error(err);}}
 // 領国の出来事：おおむね9〜15か月に一度
 if(S.settings?.fiction!==false&&G.date().d===10&&!S.evQ.length&&!G.retainer()&&S.t-(S.lastInc||0)>=270&&S.t>=90&&Math.random()<.22){const e=E();
  const cand=TK.INCIDENTS.filter(x=>!(x.once&&S.evSeen[x.id])&&(()=>{try{return x.when(e);}catch(_){return false;}})());
  if(cand.length){const x=cand[Math.floor(Math.random()*cand.length)];S.lastInc=S.t;S.evSeen[x.id]=1;S.evQ.push({inc:x.id});}}
};
// いま出す出来事の中身（選択肢の関数は持ち越さず、その場で作り直す）
const VIEWS=new Map();
G.DYN=DYN;

/* ===== 当事者として選ぶ分かれ道（相手側の家でも選べるように） ===== */
TK.FORKS.push(
 T({id:'kiyosu_t',d:[1562,1,25],clan:'tokugawa',who:'松平元康',title:'織田との和議',
  text:'今川から離れた松平元康のもとに、尾張の織田信長から和議の誘いが届いた。今川氏真は元康を裏切り者と見ている。',
  opts:[{t:'清洲で信長と同盟を結ぶ',hist:1,d:'西の守りを任せ、東三河・遠江へ向かえる'},
   {t:'今川に詫びを入れ、元の主に戻る',d:'今川と結び直す。織田とは敵のまま。歴史が分かれる',f(e){e.cancel('清洲同盟','三河平定');e.ally('imagawa',1440);e.rel('oda',-30);e.div('tokugawa','oda');return '元康は今川に詫びを入れ、織田と手を結ばなかった。';}},
   {t:'どこにも付かず、三河一国を固める',d:'城の守りと民忠が上がる。歴史が分かれる',f(e){e.cancel('清洲同盟');for(const id of e.ids){e.loyal(id,8);e.troops(id,800);}e.div('tokugawa');return '元康は織田とも今川とも結ばず、三河を固めた。';}}]}),
 T({id:'kiyosu_n',d:[1582,7,14],clan:'oda',who:'織田信雄',title:'清洲での評定（織田家）',
  text:'父と兄を失い、織田家の跡目を決める評定が清洲で開かれる。三男の信孝は柴田勝家を味方につけ、羽柴秀吉は信忠の子・三法師を推すつもりらしい。',
  opts:[{t:'秀吉の推す三法師を受け入れ、後見に回る',hist:1,d:'尾張を継ぐ'},
   {t:'次男として自ら家督を継ぐと言い張る',d:'信孝・勝家と対立し、秀吉とも溝ができる。歴史が分かれる',f(e){e.cancel('清洲会議','信雄と信孝の争い');e.rel('hashiba',-15);e.rel('kshibata',-15);e.div('oda');return '信雄は家督を主張して譲らず、評定は荒れた。';}},
   {t:'弟の信孝と手を結び、秀吉を抑える',d:'織田一門でまとまる。歴史が分かれる',f(e){e.cancel('清洲会議','信雄と信孝の争い','岐阜城の囲み','岐阜城の開城','信雄と秀吉');e.rel('hashiba',-25);e.div('oda','hashiba');return '信雄は信孝と和し、兄弟で秀吉に当たることにした。';}}]}),
 T({id:'shizu_k',d:[1583,5,25],clan:'kshibata',who:'柴田勝家',title:'雪解けの出陣',
  text:'雪に閉ざされた冬のあいだに、秀吉は長浜を取り、岐阜の信孝を囲んだ。勝家は北近江へ出るか。',
  opts:[{t:'佐久間盛政を先手に、北近江へ打って出る',hist:1,d:'賤ヶ岳へ向かう'},
   {t:'前田利家・佐々成政を固め、越前を守る',d:'出陣を見送り守りを固める。歴史が分かれる',f(e){e.cancel('賤ヶ岳の戦い');for(const id of e.ids)e.troops(id,1500);e.div('kshibata','hashiba');return '勝家は北ノ庄に籠もり、秀吉の出方をうかがった。';}},
   {t:'秀吉に和を請う',d:'信孝を見捨てて和議を結ぶ。歴史が分かれる',f(e){e.cancel('賤ヶ岳の戦い','織田信孝の自害');e.ally('hashiba',720);e.div('kshibata');return '勝家は秀吉に和を請うた。';}}]}),
 T({id:'kiyosu_s',d:[1560,7,1],clan:'imagawa',who:'今川氏真',title:'岡崎の松平元康',
  text:'父義元の討死ののち、岡崎城に入った松平元康が、今川の命に従わなくなっている。',
  opts:[{t:'元康の動きを見守る',hist:1,d:'史実では元康は自立し、織田と結ぶ'},
   {t:'人質の妻子を盾に、元康を引き留める',d:'元康の自立が遅れる。歴史が分かれる',f(e){e.cancel('清洲同盟','三河平定');e.ally('tokugawa',1080);e.div('imagawa','tokugawa');return '氏真は駿府の人質を盾に、元康を今川方に留めた。';}},
   {t:'大軍で岡崎を攻める',d:'三河へ攻め入る。歴史が分かれる',f(e){e.cancel('清洲同盟');e.rel('tokugawa',-40);e.div('imagawa','tokugawa');return '氏真は岡崎攻めを命じた。';}}]}));
(TK._ARC2=TK._ARC2||{}).kiyosu_t={by:{1:{titles:['清洲同盟','三河平定','三河一向一揆'],years:4},2:{titles:['清洲同盟'],years:3}}};
(TK._ARC2=TK._ARC2||{}).kiyosu_n={by:{1:{titles:['清洲会議'],years:1},2:{titles:['清洲会議','岐阜城の囲み','岐阜城の開城','信雄と秀吉','織田信孝の自害'],years:2}}};
(TK._ARC2=TK._ARC2||{}).shizu_k={by:{1:{titles:['賤ヶ岳の戦い'],clans:['kshibata'],years:1},2:{titles:['賤ヶ岳の戦い','織田信孝の自害'],years:1}}};
(TK._ARC2=TK._ARC2||{}).kiyosu_s={by:{1:{titles:['清洲同盟','三河平定'],years:4},2:{titles:['清洲同盟'],years:3}}};

/* ===== 史実で自家が決められてしまう出来事の前に、当主に諮る ===== */
// 同盟・臣従・取り込み・城の受け渡し・家臣の独立など、自家が当事者の出来事で、用意した分かれ道がないもの
G.decideCheck=function(){const S=G.S(),k=S.player;if(!S.clans[k]||!S.clans[k].alive||S.div[k])return;S.decided=S.decided||{};
 for(let i=S.hi;i<TK.HIST.length;i++){const ev=TK.HIST[i];const t=G.evT(ev);if(t>S.t+6)break;if(t<S.t)continue;const key=(ev.title||ev.k)+'@'+ev.d.join('-');if(S.decided[key])continue;
  let role=null;const mine=c=>S.castles[c]&&S.castles[c].owner===k;
  if((ev.k==='ally')&&(ev.a===k||ev.b===k||ev.clan===k))role='ally';
  else if(ev.k==='submit'&&ev.b===k)role='submit';
  else if(ev.k==='absorb'&&ev.b===k)role='absorb';
  else if(ev.k==='take'&&(ev.admin||ev.peace)&&ev.clan!==k&&(ev.castles||[]).some(c=>mine(c)&&(ev.admin||(ev.peace||[]).includes(c))))role='give';
  else if(ev.k==='newclan'&&ev.clan!==k&&(ev.castles||[]).some(mine))role='rebel';
  if(!role)continue;
  if(TK.FORKS.some(f=>f.clan===k&&Math.abs(G.evT(f)-t)<60))continue;
  S.decided[key]=1;S.evQ=S.evQ||[];S.evQ.push({dyn:'kettei',i,role});}};
DYN.kettei=q=>{const S=G.S(),k=S.player;const ev=TK.HIST[q.i];if(!ev)return null;const other=[ev.a,ev.b,ev.clan].find(x=>x&&x!==k)||ev.clan;
 const title=ev.title||({ally:'同盟の申し入れ',submit:'臣従の求め',absorb:'家の取り込み',give:'城の明け渡し',rebel:'家臣の自立'})[q.role];
 const ck=ev.title||(ev.k+':'+(ev.b||ev.n||ev.clan||''));
 const what={ally:`${nm(other)}と手を結ぶ話が進んでいる。`,submit:`${nm(other)}が、当家に従うよう求めている。`,absorb:`${nm(other)}が当家を家中に取り込もうとしている。`,give:`取り決めにより、当家の城を${nm(other)}に渡すことになっている。`,rebel:`当家の城を預かる者が、${nm(other)}として独り立ちしようとしている。`}[q.role];
 const opts=[{t:'史実どおりに受け入れる',hist:1,d:(ev.text||'').slice(0,60)}];
 if(q.role==='ally')opts.push({t:'同盟を断る',d:'歴史が分かれる',f(e){e.cancel(ck);e.rel(other,-15);e.div(k);return `${nm(other)}との同盟を断った。`;}});
 if(q.role==='submit'||q.role==='absorb')opts.push({t:'従わず、家を保つ',d:'相手と戦になるかもしれない。歴史が分かれる',f(e){e.cancel(ck);e.rel(other,-30);e.div(k,other);return `${nm(other)}の求めをはねつけた。`;}},{t:'金と人質を出し、時を稼ぐ',d:'金500。歴史が分かれる',f(e){e.cancel(ck);e.gold(-500);e.rel(other,10);e.div(k);return '金と人質を送り、返事を引き延ばした。';}});
 if(q.role==='give')opts.push({t:'城を渡さない',d:'相手の家と溝ができる。歴史が分かれる',f(e){e.cancel(ck);e.rel(other,-20);e.div(k);return '城の明け渡しを拒んだ。';}});
 if(q.role==='rebel')opts.push({t:'加増して引き留める',d:'金400で離反を防ぐ。歴史が分かれる',f(e){e.cancel(ck);e.gold(-400);e.div(k);return '城主を加増して引き留めた。';}},{t:'先に討つ',d:'城の兵が減る。歴史が分かれる',f(e){e.cancel(ck);for(const c of (ev.castles||[]))if(e.S.castles[c]&&e.S.castles[c].owner===k)e.troops(c,-1500);e.div(k);return '離反の兆しを見て、先手を打って討った。';}});
 return {title:'当主の決断：'+title,who:ev.who||(S.clans[k]&&(G.gen(S.clans[k].leader)||{}).n),clan:k,text:what+(ev.text?'（史実では：'+ev.text.slice(0,70)+'）':''),opts};};

G.eventView=function(){const S=G.S();const q=S.evQ&&S.evQ[0];if(!q)return null;const e=E();
 if(q.fork){const f=TK.FORKS.find(x=>x.id===q.fork);return f?Object.assign({kind:'fork'},f):null;}
 if(q.dyn){if(!q.n)q.n=Math.random();if(!VIEWS.has(q.n)){let v=null;try{v=DYN[q.dyn](q);}catch(_){}VIEWS.set(q.n,v);}const v=VIEWS.get(q.n);if(!v)return null;return Object.assign({kind:'dyn'},v);}
 if(q.inc){if(!q.n)q.n=Math.random();if(!VIEWS.has(q.n)){const x=TK.INCIDENTS.find(y=>y.id===q.inc);let v=null;try{v=x.make(e);}catch(_){}VIEWS.set(q.n,v);}
  const v=VIEWS.get(q.n);if(!v)return null;return Object.assign({kind:'inc'},v);}
 return null;};
/* --- 歴史の分かれ道で外れる流れ：史実を選ばなかった時、その前提の上に起こる史実は起こらない --- */
const KOREA='busan ulsan jinju daegu sangju jeonju namwon suncheon chungju gongju hanseong gaeseong wonju haeju pyongyang uiju hamhung'.split(' ');
TK.ARCS={
 okehazama_i:{clans:['oda','imagawa','tokugawa'],years:40},okehazama_o:{clans:['oda','imagawa','tokugawa'],years:40},
 kiyosu_d:{clans:['oda','tokugawa'],years:22},nagao_k:{clans:['nagao','hojo','uesugi'],years:10},
 suruga_t:{clans:['takeda','imagawa','tokugawa','hojo'],years:15},
 joraku_o:{clans:['oda','ashikaga','miyoshi','rokkaku','azai','asakura','honganji'],years:30},
 kanegasaki_a:{clans:['azai','asakura'],years:6},nagashino_o:{clans:['takeda','tokugawa','oda'],years:8},nagashino_t:{clans:['takeda','tokugawa','oda'],years:8},
 mikata_t:{clans:['takeda','tokugawa'],years:6},mimikawa_o:{clans:['otomo','shimazu','ryuzoji'],years:10},
 honnoji_o:{clans:['oda','hashiba','tokugawa','hojo','nagao','sanada','sassa','chosokabe','mori','ukita'],years:20,names:['豊臣秀吉'],
  titles:['神流川の戦い','天正壬午の乱','真田昌幸の自立','小牧・長久手の戦い','関白宣下','第一次上田合戦','徳川家康の上洛','名胡桃城事件','小田原征伐','小田原開城','刀狩令','バテレン追放令','天下統一','奥州仕置','九州平定','四国攻め','紀州征伐','富山の役','賤ヶ岳の戦い','根白坂の戦い','戸次川の戦い','岩屋城の戦い','岐阜城の囲み','織田信雄の改易']},
 takamatsu_m:{clans:['mori','hashiba'],years:10},koshu_t:{clans:['takeda','oda','tokugawa','hojo','sanada'],years:10},
 joraku_h:{clans:['hashiba','tokugawa','hojo'],years:6},hojo_t:{clans:['hashiba','tokugawa','hojo'],years:6},joraku_t:{clans:['hashiba','tokugawa','hojo'],years:6},
 odawara_h:{clans:['hojo','tokugawa'],years:4},odawara_d:{clans:['date'],years:4},kyushu_s:{clans:['shimazu','otomo','ryuzoji'],years:5},
 shikoku_c:{clans:['chosokabe'],years:5},otate_u:{clans:['nagao'],years:6},
 // ここから下は、のちに足した分かれ道。選んだ道ごとに、起こらなくなる史実を名ざしで外す（by は選択肢の番号ごと）
 hiei_o:{titles:['比叡山焼き討ち'],years:1},
 kawanaka_t:{titles:['第四次川中島の戦い'],clans:['takeda','nagao'],years:.06},
 arioka_o:{titles:['有岡城の戦い'],clans:['araki'],years:2},
 kiyosu_h:{by:{1:{titles:['清洲会議','岐阜城の囲み','岐阜城の開城','織田信孝の自害','信雄と秀吉'],years:2},2:{titles:['清洲会議','岐阜城の囲み','岐阜城の開城','織田信孝の自害','賤ヶ岳の戦い','信雄と秀吉'],years:2}}},
 shizu_h:{by:{1:{titles:['賤ヶ岳の戦い','織田信孝の自害'],years:1},2:{titles:['賤ヶ岳の戦い','織田信孝の自害','岐阜城の開城'],clans:['kshibata','nobutaka'],years:1}}},
 komaki_h:{by:{1:{titles:['小牧・長久手の戦い'],years:1},2:{titles:['小牧・長久手の戦い','松ヶ島城の戦い'],years:1}}},
 komaki_t:{titles:['小牧・長久手の戦い'],years:1},
 karairi_h:{castles:KOREA,titles:['唐入りの号令','文禄の役','尚州の戦い','忠州の戦い','漢城陥落','玉浦海戦','平壌入城','閑山島海戦','咸鏡道の制圧','第一次晋州城の戦い','明の援軍','平壌の戦い','碧蹄館の戦い','幸州山城の戦い','漢城からの撤退','第二次晋州城の戦い','慶長の役','鳴梁海戦','露梁海戦','蔚山城の戦い','泗川の戦い','順天城の戦い','漆川梁海戦','南原城の戦い','黄石山城の戦い','稷山の戦い'],years:7},
 inubushi_s:{by:{2:{titles:['第二次上田合戦'],years:1}}},
 oyama_t:{titles:['小山評定','東海道の城を家康へ','岐阜城の戦い','関ヶ原の戦い','佐和山城落城','石田三成の処刑','宇喜多秀家の改易','長宗我部の改易','毛利の減封','関ヶ原の後','秀忠の西上','第二次上田合戦'],years:1},
 aizu_u:{titles:['長谷堂城の戦い'],years:1},aizu_n:{titles:['長谷堂城の戦い'],years:1},
 mori_s:{by:{1:{titles:['安濃津城の戦い','関ヶ原の戦い','佐和山城落城','石田三成の処刑','宇喜多秀家の改易','長宗我部の改易','毛利の減封','関ヶ原の後','大津城の戦い'],years:1},2:{titles:['毛利の減封','安濃津城の戦い'],years:1}}},
 osaka_h:{by:{1:{titles:['大坂冬の陣','今福・鴫野の戦い','真田丸の戦い'],years:1},2:{titles:['浪人衆の入城','大坂冬の陣','今福・鴫野の戦い','真田丸の戦い','大坂夏の陣','道明寺の戦い','八尾・若江の戦い'],years:1}}}};
Object.assign(TK.ARCS,TK._ARC2||{});
G.chooseEvent=function(i){const S=G.S();const v=G.eventView();if(!v){S.evQ&&S.evQ.shift();return null;}const o=v.opts[i];const e=E();let msg='';
 // 領国の出来事は選択肢を作り直すと対象が変わりうるため、作ったときの関数をそのまま使う
 try{msg=(o.f&&o.f(e))||'';}catch(err){console.error(err);}
 S.evQ.shift();
 if(v.kind==='fork'){S.evChose=S.evChose||{};S.evChose[v.id]=i;queueAlt(v.id,i);{const A=TK.ARCS[v.id];const def=A&&(A.by?A.by[i]:A);if(!o.hist&&v.opts.some(x=>x.hist)&&def)G.arcOff(v.id,def);if(!o.hist&&v.opts.some(x=>x.hist)&&G.onAltChoice)try{G.onAltChoice(v,o);}catch(_){}}}
 if(v.kind==='dyn'){G.chron({title:v.title,alt:1,text:o.t+'。'+(msg||''),who:v.who,d:G.date()},true);}
 if(v.kind==='fork'&&!o.hist){const d=G.dstr();S.chron.unshift({t:S.t,s:d,title:v.title,text:(o.hist?'史実どおり、':'')+o.t+'。'+(msg&&!o.hist?msg:''),who:v.who,ok:true});G.onChron&&G.onChron(S.chron[0]);}
 return msg||o.t;};
})();
