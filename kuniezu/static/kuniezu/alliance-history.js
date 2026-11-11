"use strict";
/* 定着した呼称と、史料の内容を説明する表示名を区別。臣従・軍事協力を全て対等同盟にしない。 */
(function(){
 const R=TK.RESEARCH_SOURCES;
 Object.assign(R,{
  pactUkita:{author:'岡山県',title:'岡山の戦国争乱と城',url:'https://www.pref.okayama.jp/uploaded/life/504536_3774627_misc.pdf',locator:'1579年10月、宇喜多直家の織田への服属許可',scope:'交渉開始・毛利方離反・服属許可は同じ日ではない。',accessed:'2026-11-01'},
  pactBosoEchigo:{author:'館山市',title:'さとみ物語 完全版 第4章2',url:'https://www.city.tateyama.chiba.jp/satomi/kanzenban/kan_4shou/k4shou_2/k4shou_2min.html',locator:'1560年の上杉の関東出陣要請と房越同盟',scope:'上杉と里見の軍事連携。締結日の一点確定ではない。',accessed:'2026-11-01'},
  pactAzaiAsakura:{author:'福井市',title:'特別史跡一乗谷朝倉氏遺跡 保存活用計画案',url:'https://www.city.fukui.lg.jp/kankou/bunka/bunkazai/publiccoment02_d/fil/soan_asakura.pdf',locator:'浅井氏との関係',scope:'軍事連携を示す説明名。対等・恒久的同盟の内容と成立時期には研究上の議論がある。',accessed:'2026-11-01'},
  pactMiyoshi:{author:'大東市',title:'飯盛城跡調査報告会冊子',url:'https://www.city.daito.lg.jp/uploaded/attachment/24905.pdf',locator:'足利義輝・三好長慶の和睦と御供衆',scope:'和睦と幕府への出仕を、国同士の対等軍事同盟と同一視しない。',accessed:'2026-11-01'},
  pactKiyosu:{author:'岡崎商工会議所',title:'家康公検定 解説資料',url:'https://www.okazakicci.or.jp/ieyasu2/pdf/kaisetsunew2.pdf',locator:'1562年清洲同盟',scope:'成立年を確認。会見日・場所の異説は残す。',accessed:'2026-11-01'},
  pactKaiEchigo:{author:'山形おきたま観光協議会',title:'菊姫',url:'https://sengoku.oki-tama.jp/?l=148692&p=log',locator:'1579年、武田・上杉同盟と景勝との婚姻',scope:'1579年の婚姻・同盟を確認。1月1日は締結日ではない。',accessed:'2026-11-01'},
  pactTriple:{author:'山梨県／甲府市武田氏館跡歴史館',title:'甲・相・駿 三国同盟',url:'https://www.manabi.pref.yamanashi.jp/courses/2934',locator:'1554年の婚姻・和平・軍事同盟',scope:'善得寺での一堂会談を確定事実として追加しない。',accessed:'2026-11-01'},
  pactEast:{author:'伊豆の国市ほか',title:'韮山城跡及び付城跡群総合調査報告書 第IV章',url:'https://sitereports.nabunken.go.jp/files/attach/70/70710/143250_2_%E9%9F%AE%E5%B1%B1%E5%9F%8E%E8%B7%A1%E5%8F%8A%E3%81%B3%E4%BB%98%E5%9F%8E%E8%B7%A1%E7%BE%A4%E7%B7%8F%E5%90%88%E8%AA%BF%E6%9F%BB%E5%A0%B1%E5%91%8A%E6%9B%B8.pdf',locator:'駿甲相・越相・甲相同盟と織田武田関係',scope:'成立過程に幅がある関係は年・月単位の概略とする。',accessed:'2026-11-01'},
  pactTokugawaHojo:{author:'丸島和洋／国文学研究資料館',title:'北条・徳川間外交の意思伝達構造',url:'https://kokubunken.repo.nii.ac.jp/record/1474/files/KA1067.pdf',locator:'相遠同盟と天正壬午の乱前後の外交',scope:'1580年の対武田連携と1582年の講和を別の段階として扱う。',accessed:'2026-11-01'},
  pactBoso:{author:'館山市',title:'さとみ物語・完全版 第4章',url:'https://www.city.tateyama.chiba.jp/satomi/kanzenban/kan_4shou/k4shou_4/k4shou_4min.html',locator:'1577年の里見・北条和睦と海上交易',scope:'房相一和を恒久的な上下関係と同一視しない。',accessed:'2026-11-01'},
  pactSanada:{author:'長野市誌',title:'真田氏の上杉への帰属',url:'https://adeac.jp/nagano-city/texthtml/d100020/ct00000002/ht003300',locator:'1585年の起請文と上下関係',scope:'対等同盟ではなく上杉を上位とする関係。',accessed:'2026-11-01'},
  pactKono:{author:'愛媛県歴史文化博物館',title:'えひめの歴史文化モノ語り',url:'https://i-rekihaku.jp/research/monogatari/article/216.html',locator:'1583～1584年の河野・毛利の加勢要請と会談',scope:'毛利との同盟を確認。大友との旧関係をこの時代まで自動延長しない。',accessed:'2026-11-01'}
 });
 const pact=(a,b,name,from,to,source,kind='alliance',note='')=>({a,b,name,from,to,source,kind,note});
 TK.ALLIANCE_HISTORY=[
  pact('nagao','satomi','房越同盟',[1560,1,1],[1569,6,30],'pactBosoEchigo','cooperation','1560年代の軍事連携。期間は概略で、条約の締結・解消日を確定した値ではない。'),
  pact('asakura','azai','浅井・朝倉の軍事連携',[1560,1,1],[1573,9,1],'pactAzaiAsakura','cooperation','成立時期と関係の性質には議論があるため、固有の条約名を創作しない。'),
  pact('ashikaga','miyoshi','永禄期の幕府・三好和睦',[1558,1,1],[1565,6,17],'pactMiyoshi','peace','和睦・幕府出仕と軍事同盟の区別。期間の月日は表示上の概略。'),
  pact('takeda','hojo','甲相駿三国同盟',[1554,1,1],[1568,12,30],'pactTriple'),
  pact('takeda','imagawa','甲相駿三国同盟',[1554,1,1],[1568,12,30],'pactTriple'),
  pact('hojo','imagawa','甲相駿三国同盟',[1554,1,1],[1568,12,30],'pactTriple'),
  pact('oda','tokugawa','清洲同盟',[1562,2,15],[1582,6,21],'pactKiyosu','alliance','成立日・会談場所には諸説。'),
  pact('oda','takeda','甲尾同盟',[1565,10,1],[1572,10,31],'pactEast'),
  pact('hojo','nagao','越相同盟',[1569,1,1],[1571,12,30],'pactEast'),
  pact('hojo','takeda','甲相同盟の再締結',[1572,1,5],[1578,8,31],'pactEast','alliance','元亀2年末からの再締結を、既存の表示日で処理。'),
  pact('hojo','satomi','房相一和',[1577,1,1],[1590,8,9],'pactBoso','peace','1577年成立。表示上の1月1日は確定日ではない。'),
  pact('takeda','nagao','甲越同盟',[1579,1,1],[1582,4,3],'pactKaiEchigo','alliance','景勝との婚姻・協力を含む成立過程。日付は年内表示用。'),
  pact('tokugawa','hojo','相遠同盟',[1580,1,1],[1582,6,21],'pactTokugawaHojo','alliance','対武田の連携。成立月日は別途幅がある。'),
  pact('tokugawa','hojo','天正壬午の和睦',[1582,11,24],[1590,8,9],'peaceTenshoChino','peace'),
  pact('oda','ukita','宇喜多直家の織田方転属',[1579,10,1],[1582,6,21],'pactUkita','alignment','単なる対等同盟ではなく、毛利方からの離反・帰属。'),
  pact('nobutaka','kshibata','信孝・勝家の軍事連携',[1582,7,19],[1583,6,14],'kiyosuDistribution','cooperation'),
  pact('nobukatsu','hashiba','信雄・秀吉の連携',[1582,12,20],[1584,3,12],'owariSuccession','cooperation'),
  pact('nobukatsu','tokugawa','小牧・長久手の盟約',[1584,3,13],[1584,12,15],'owariSuccession'),
  pact('sanada','nagao','昌幸の上杉帰属',[1585,7,1],[1586,12,30],'pactSanada','submission'),
  pact('kono','mori','芸予の軍事協力',[1583,1,1],[1585,8,31],'pactKono','cooperation'),
  pact('ishida','mori','西軍の連署・軍事連携',[1600,8,21],[1600,11,10],'sekigaharaGuide','cooperation'),
  pact('ishida','ukita','西軍の軍事連携',[1600,8,21],[1600,11,10],'sekigaharaGuide','cooperation'),
  pact('ishida','shimazu','西軍への参加',[1600,8,21],[1600,11,10],'sekigaharaGuide','cooperation'),
  pact('ishida','chosokabe','西軍への参加',[1600,8,21],[1600,11,10],'sekigaharaGuide','cooperation'),
  pact('ishida','oda','秀信の西軍参加',[1600,8,22],[1600,10,16],'gifuSuccession','cooperation')
 ];
 const st=d=>d[0]*10000+d[1]*100+d[2];
 const clockDay=d=>G.S().clockVersion===TKCalendar.version?TKCalendar.toJD(...d):d[0]*360+d[1]*30+d[2];
 G.allianceRecord=(a,b,d)=>{const date=d||[G.date().y,G.date().m,G.date().d];return TK.ALLIANCE_HISTORY.findLast(r=>(r.a===a&&r.b===b||r.a===b&&r.b===a)&&st(date)>=st(r.from)&&st(date)<=st(r.to));};
 G.allianceLabel=(a,b,d)=>{const r=G.allianceRecord(a,b,d);if(r)return r.name;const s=G.S();if(s?.vassal?.[a]===b)return G.CNK(a)+'の'+G.CNK(b)+'への帰属';if(s?.vassal?.[b]===a)return G.CNK(b)+'の'+G.CNK(a)+'への帰属';return G.CNK(a)+'と'+G.CNK(b)+'の協力関係（呼称未確認）';};
 for(const e of TK.HIST){if(e.k!=='ally'&&e.k!=='submit')continue;const a=e.a||e.clan,b=e.b;const r=G.allianceRecord(a,b,e.d);if(r){e.title=r.name;e.relationType=r.kind;const source=R[r.source];if(source)e.source=source.url;e.relationNote=r.note;}else if(!e.title){e.title=e.k==='submit'?`${TK.CLANS[b]?.[0]||b}の${TK.CLANS[a]?.[0]||a}への帰属`:`${TK.CLANS[a]?.[0]||a}と${TK.CLANS[b]?.[0]||b}の軍事協力`;}}
 // 記録が抜けていた代表的な東国の盟約を追加。正確な日が不明なものには精度を明記。
 for(const name of ['甲尾同盟','越相同盟','房相一和','甲越同盟','相遠同盟']){const r=TK.ALLIANCE_HISTORY.find(x=>x.name===name);TK.HIST.push({d:r.from.slice(),k:'ally',a:r.a,b:r.b,title:r.name,source:R[r.source].url,datePrecision:r.note||'成立年・月の概略。日付は表示上の基準で、締結日の確定値ではない。',text:r.name+'の成立・協力関係を反映する。'+r.note});}
 // 関係の期限は個別の盟約ごとに判定。終了後も無期限の緑境界にしない。
 const day=G.day;G.day=function(){day();const s=G.S(),d=G.date(),n=clockDay([d.y,d.m,d.d]);for(const r of TK.ALLIANCE_HISTORY){if(n===clockDay(r.to)+1)delete s.ally[G.ekey(r.a,r.b)];}};
 TK.HIST.sort((a,b)=>st(a.d)-st(b.d));
})();
