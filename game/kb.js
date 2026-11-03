/* 史料集（ゲーム内の知識の束）
   人物・城・出来事の記録と、考証のメモ。年表・配置図のもとになったデータから組み立て、
   研究の分かれる所は「説」として出典とともに書き分ける。AIに分かれ道を考えさせる時も、ここから関わりのある項目を引いて渡す。 */
TK.KB_NOTES=[
 {id:'n_honnoji',kind:'考証',title:'本能寺の変と光秀の居場所',keys:['本能寺の変','明智光秀','斎藤利三','明智秀満','織田信長','織田信忠'],
  text:'通説では明智光秀が軍勢を率いて本能寺を囲んだとされる。一方、加賀藩士関屋政春の聞書『乙夜之書物』には、斎藤利三の子・利宗の話として「光秀は鳥羽に控えていた」とあり、本能寺を攻めたのは斎藤利三・明智秀満らの先手二千余騎だったとする。萩原大輔『異聞 本能寺の変』（2022年）が紹介した。山崎合戦前の鳥羽在陣と取り違えた可能性を指摘する意見もあり、通説を覆すまでには至っていない。二条新御所の信忠は同日、明智勢に攻められて自害した。',
  src:'『信長公記』巻十五／『乙夜之書物』（金沢市立玉川図書館近世史料館蔵）／萩原大輔『異聞 本能寺の変』2022'},
 {id:'n_kiyosu',kind:'考証',title:'清洲会議の領地分け',keys:['清洲会議','羽柴秀吉','柴田勝家','丹羽長秀','池田恒興','織田信雄','織田信孝','三法師','織田秀信'],
  text:'天正十年六月二十七日、柴田勝家・丹羽長秀・羽柴秀吉・池田恒興の四人が清洲城で評定した。家督は三法師（のちの秀信）、信雄は尾張、信孝は美濃。秀吉は山城・河内の一部、養子秀勝は丹波、勝家は長浜と北近江、長秀は若狭に近江二郡、恒興は大坂・尼崎・兵庫を得た。秀吉はなお織田家の重臣で、その後天王山に山崎城を築いて拠点とし、賤ヶ岳ののち大坂に移った。',
  src:'『多聞院日記』／柴裕之『清須会議』2018'},
 {id:'n_yamazaki',kind:'考証',title:'山崎の戦い',keys:['山崎の戦い','羽柴秀吉','明智光秀'],
  text:'天正十年六月十三日、中国から引き返した羽柴秀吉らが山崎で明智光秀を破った。光秀は小栗栖で討たれた。天王山の取り合いが勝敗を分けたという話は後の軍記による誇張とされる。2026年には、秀吉自身は合戦に遅れて着いたとする新しい書状の分析も報じられた（馬部隆弘）。',
  src:'『惟任退治記』／『兼見卿記』／秋田魁新報 2026年4月4日'},
 {id:'n_seigun',kind:'考証',title:'西軍の挙兵は「謀反」か',keys:['石田三成の挙兵','石田三成','毛利輝元','宇喜多秀家','内府ちかひの条々','関ヶ原の戦い','増田長盛','長束正家','前田玄以'],
  text:'慶長五年七月、佐和山に退いていた石田三成は大谷吉継と謀って兵を挙げた。七月十七日、増田長盛・長束正家・前田玄以の三奉行は「内府ちかひの条々」で家康の非を諸大名に訴え、毛利輝元が大坂城西の丸に入って総大将となった。西軍は秀頼を奉じる豊臣の名のもとで家康を討つ立場をとり、家康の側も「秀頼のために三成ら奸臣を討つ」と唱えた。どちらも豊臣家の内側の争いである。ゲームでは石田家を豊臣家に従う家として描く。',
  src:'『国史大辞典』「内府ちかひの条々」／高橋陽介「関ヶ原」論考（現代ビジネス）'},
 {id:'n_oyama',kind:'考証',title:'小山評定は本当にあったか',keys:['小山評定','徳川家康','福島正則','山内一豊'],
  text:'七月二十五日、下野小山で家康が諸将と評定し、西へ引き返すと決めたという話は広く知られる。白峰旬は、評定は後世の創作と論じ、本多隆成らが反論した。何らかの協議はあったが、通説のような劇的な一場面ではなかったとみる研究者が多い。',
  src:'白峰旬『新「関ヶ原合戦」論』／笠谷和比古『論争 関ヶ原合戦』2022'},
 {id:'n_fushimi',kind:'考証',title:'伏見城の戦い',keys:['伏見城の戦い','鳥居元忠','伏見城','会津征伐'],
  text:'家康は慶長四年閏三月から伏見城に入って政を執った。会津へ向かう時、伏見城には鳥居元忠・松平家忠・内藤家長らを残した。七月十九日ごろから西軍の攻撃が始まり、宇喜多秀家・小早川秀秋・島津義弘ら約四万が攻め、八月一日に落城、元忠は討死した。',
  src:'京都市埋蔵文化財研究所 講座資料／『寛政重修諸家譜』'},
 {id:'n_hidenobu',kind:'人物',title:'織田秀信（三法師）',keys:['織田秀信','三法師','岐阜城','岐阜城の戦い'],
  text:'信長の嫡孫。清洲会議で織田家の家督とされた。文禄元年、岐阜城主の羽柴秀勝が朝鮮で没したあと、美濃十三万石・岐阜城を継いだ。関ヶ原では西軍につき、慶長五年八月二十三日、福島正則・池田輝政らに攻められて岐阜城を開き、高野山に入った。',
  src:'柴裕之『清須会議』／『岐阜県史』'},
 {id:'n_nobukatsu',kind:'人物',title:'織田信雄',keys:['織田信雄','小牧・長久手の戦い','信雄、秀吉と和睦'],
  text:'信長の次男。本能寺ののち尾張を継ぎ、秀吉と組んで信孝・勝家に対した。のち家康と結んで小牧・長久手で秀吉と戦ったが、天正十二年に単独で和睦し、以後は秀吉に従う大名となった。天正十八年、家康の旧領への国替えを拒んで改易され、のち許されて御伽衆となった。大坂の陣の後、大和宇陀などに五万石を得た。',
  src:'『日本大百科全書』「織田信雄」'},
 {id:'n_kunigae',kind:'考証',title:'豊臣政権下の国替え（1585〜1600年）',keys:['国替え','福島正則','池田輝政','山内一豊','堀尾吉晴','田中吉政','中村一氏','石田三成','伊達政宗','岩出山への国替え','東海道の豊臣大名'],
  text:'小田原征伐ののち家康は関東へ移され、旧領の東海道には池田輝政（吉田）・田中吉政（岡崎）・堀尾吉晴（浜松）・山内一豊（掛川）・中村一氏（駿府）が置かれた。秀次事件ののち福島正則は清洲、石田三成は佐和山、増田長盛は大和郡山に入った。伊達政宗は葛西・大崎一揆ののち岩出山へ移され、大友義統は文禄の役での失態で改易された。関ヶ原の前、東海道の豊臣大名の多くは家康方についた。',
  src:'『国史大辞典』各項／藤井讓治『天下人の時代』'},
 {id:'n_toyotomi',kind:'考証',title:'豊臣政権に従った大名',keys:['臣従','豊臣','徳川家康の上洛','九州平定','小田原征伐','奥州仕置'],
  text:'長宗我部（天正十三年）、徳川・上杉（十四年）、島津（十五年）、毛利（十三年講和・十六年上洛）、伊達（十八年）が相次いで秀吉に従った。従った大名は自分の領国を保ちながら、上洛・人質・軍役・検地を受け入れ、豊臣政権の一員となった。主従関係は領国の境界線で示す。',
  src:'『国史大辞典』「豊臣政権」'}
];
(function(){
 // 記録から史料集を組み立てる（人物・城・出来事）
 let IDX=null;
 const build=()=>{if(IDX)return IDX;IDX=[];
  for(const n of TK.KB_NOTES)IDX.push(Object.assign({},n));
  const seenEv=new Set();
  for(const e of TK.HIST){if(!e.title||seenEv.has(e.title)||e.k==='premarch')continue;seenEv.add(e.title);
   const sc=(TK.BATTLES&&TK.BATTLES[e.title])||null;
   IDX.push({id:'e_'+e.title,kind:'出来事',title:e.title,date:e.d,keys:[e.title,e.who||'',...(e.kill||[]),...(e.join||[])].filter(Boolean),text:e.text||'',src:e.source||sc&&sc.src||''});}
  const gs=new Map();const addG=(str,clan)=>{const p=str.split('|');const n=p[0];if(!n||gs.has(n))return;gs.set(n,{n,clan,born:+p[5]||null});};
  for(const sid in TK.SCEN){const g=TK.SCEN[sid].gens||{};for(const c in g)for(const s of g[c])addG(s,c);}
  for(const e of TK.HIST){for(const a of [].concat(e.appear||[]))addG(a,e.clan);if(e.g)addG(e.g,e.clan);}
  for(const n of Object.keys(TK.PERSON_RESIDENCE_EVIDENCE||{}))if(!gs.has(n))gs.set(n,{n});
  for(const [n,o] of gs){const dy=TK.DEATH_Y&&TK.DEATH_Y[n];const evs=TK.HIST.filter(e=>e.title&&(e.who===n||(e.kill||[]).includes(n))).slice(0,6).map(e=>e.d[0]+'年 '+e.title);
   const residence=TK.PERSON_RESIDENCE_EVIDENCE?.[n],life=TK.PERSON_LIFETIME_EVIDENCE?.[n],sources=[life?.source,residence?.source].filter(Boolean).map(id=>TK.RESEARCH_SOURCES[id]);
   IDX.push({id:'p_'+n,kind:'人物',title:n,keys:[n,...(residence?.stages||[]).map(s=>s.place)],text:(TK.PERSON_UNCERTAINTY?.[n]?'生年には諸説があります。':o.born?o.born+'年生まれ。':'')+(dy?dy+(life?'年没。':'年ごろ没。'):'')+(residence?(residence.label||'居所の移り変わり')+'：'+residence.stages.map(s=>s.year+'年 '+s.place).join(' → ')+'。'+(residence.note||''):'')+(evs.length?'関わった出来事：'+evs.join('、')+'。':''),src:sources.map(r=>r.author+'「'+r.title+'」 '+r.locator+' '+r.url).join(' ／ ')});}
  for(const y of (TK.YOSHO||[])){const fx=G.YOSHO_FX&&G.YOSHO_FX[y[1]];IDX.push({id:'y_'+y[0],kind:'施設',title:y[0],keys:[y[0]],text:y[4]+(fx?'。効き目：'+fx.fx:'')+(y[5]?`（${y[5]}年ごろから）`:'')+(y[6]&&TK.CASTLE_EVIDENCE?.[y[0]]?.abandonment!=='date-unknown'?`（活動年代：${y[6]}年より前）`:''),src:TK.CASTLE_EVIDENCE?.[y[0]]?.source||''});}
  const J=(TK.JOKAKU||[]);
  for(const c of TK.CASTLES){const id=c[0];const nm=c[1];const ren=J.filter(j=>j.node===id&&j.n).map(j=>j.d[0]+'年 '+j.n);const evs=TK.HIST.filter(e=>e.title&&((e.castles||[]).includes(id)||e.at===id)).slice(0,6).map(e=>e.d[0]+'年 '+e.title);
   IDX.push({id:'c_'+id,kind:'城',title:nm,keys:[nm,id,...J.filter(j=>j.node===id&&j.n).map(j=>j.n)],text:c[3]+'国。'+(ren.length?'移り変わり：'+ren.join('、')+'。':'')+(evs.length?'関わった出来事：'+evs.join('、')+'。':''),src:''});}
  return IDX;};
 TK.kb=()=>build();
 // 文字列に出てくる名前から、関わりの深い項目を選ぶ（簡単な検索）
 TK.kbFind=function(q,n=8){const L=build();if(!q)return L.filter(x=>x.kind==='考証').slice(0,n);const qs=String(q);
  const sc=x=>{let s=0;for(const k of x.keys)if(k&&k.length>1&&qs.includes(k))s+=k.length>2?3:1;if(x.title&&qs.includes(x.title))s+=4;if(x.kind==='考証')s*=1.5;if(qs.length<12&&(x.title.includes(qs)||x.text.includes(qs)))s+=5;return s;};
  return L.map(x=>[sc(x),x]).filter(a=>a[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,n).map(a=>a[1]);};
})();
