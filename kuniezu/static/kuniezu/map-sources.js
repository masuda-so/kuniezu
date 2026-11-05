"use strict";
/* 原図の作成年代・写本の年代・ゲームが扱う年代を混ぜない。 */
(function(){
 Object.assign(TK.RESEARCH_SOURCES,{
  regionalRivers:{author:'Natural Earth',title:'Rivers + lake centerlines',year:'2026年10月31日取得版',url:'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/',locator:'Yalu、Tumen、Liao、Han、Namhan、Nakdong',accessed:'2026-10-31',scope:'世界図用に一般化された現代河川の中心線。16世紀の川幅・旧河道・中洲の帰属は示さない。鴨緑江・豆満江は境域を読むための目安。'},
  kuniezuGuide:{author:'国立国会図書館 人文総合情報室',title:'国絵図・村絵図・郷帳・村明細帳を探す',year:'2024年3月27日更新',url:'https://ndlsearch.ndl.go.jp/rnavi/humanities/post_276',locator:'1-1-2 他機関の所蔵資料',accessed:'2026-10-31',scope:'慶長・正保・元禄・天保の国絵図と所蔵・公開機関。国立公文書館で公開される元禄・天保図を1560年の海岸として転写しない。'},
  keichoHizen:{author:'文化庁・鍋島報效会',title:'慶長肥前国絵図',year:'1605年に作成された国絵図の19世紀模写本',url:'https://online.bunka.go.jp/db/heritages/detail/149314',locator:'資料解説・街道の分岐と通過地',accessed:'2026-10-31',scope:'河川・道路・国界・郡界・藩領界を別色で描く。元禄図との干拓の違いを含め、年月を区別して照合する資料。輪郭の測地補正は未実施。'},
  bochoMaps:{author:'山口県文書館',title:'絵図・地図／防長の国絵図',year:'公開ページ・更新年未詳',url:'https://archives.pref.yamaguchi.lg.jp/document-search/maps/',locator:'「防長の国絵図」・正保図の高精細画像',accessed:'2026-10-31',scope:'慶長度控図は宇部市文化会館、その他の控図は山口県文書館。現存の確認と、地形復元への採用を区別。'},
  tokyoReclamation:{author:'国土交通省 関東地方整備局',title:'東京湾環境情報センター・水際線の状況',year:'2024年までの埋立区分',url:'https://www.tbeic.go.jp/kankyo/mizugiwa.asp?newwindow=true',locator:'東京湾の年代別埋立状況',accessed:'2026-10-31',scope:'近現代の埋立の年代比較。現代領土ポリゴンの海側突出を当時の土地として表示しない。16世紀の水際を確定する資料ではない。'}
 });
 const regions=[['kanto','関東'],['tohoku','東北'],['chubu','中部'],['kinki','近畿'],['chugoku-shikoku','中国・四国'],['kyushu','九州']];
 for(const [id,name] of regions)TK.RESEARCH_SOURCES['mapCompare-'+id]={author:'戦国時代勢力図と各大名の動向',title:name+'地方の城マップ',url:'https://sengokumap.net/castle-map/'+id+'-region/',locator:'公開地図画像と作成資料注記',scope:'城・峠・河川・湖沼・湾岸の地域関係を比較。江戸期絵図に基づく海岸と戦国期の確定湖岸を区別する。画像や輪郭の転載・トレースは行わない。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.toneTransfer={author:'国土交通省関東地方整備局 利根川上流河川事務所',title:'利根川の東遷',url:'https://www.ktr.mlit.go.jp/tonejo/tonejo00185.html',locator:'東遷前の江戸湾流入と約60年に及ぶ付替え',scope:'指定サイトの参考文献を再照合。1594年からの工事過渡期と、その後の銚子流入を区別する。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.joseon1557={author:'国史編纂委員会／韓国学中央研究院',title:'朝鮮方域之図（1557～1558年頃）',url:'https://encykorea.aks.ac.kr/Article/E0052049',locator:'年代比定、八道の州県・水営・兵営、豆満江下流の南流',scope:'戦役前の地名と山川の関係を比較。18世紀の海東地図と区別する。現代の測量図と投影・輪郭精度が異なるため、そのまま現代座標へ転写しない。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.keicho1605Ube={author:'宇部市',title:'慶長国絵図控図 周防国・長門国',url:'https://www.city.ube.yamaguchi.jp/kyouyou/rekishi/library/1003984.html',locator:'1605年頃の控図、干拓前の宇部・厚南地域、河川青・道赤',scope:'対象時代末期の実物資料。全国を同じ現代海岸・同じ年の推定で扱わず、近世の干拓を区別する。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.koreaRiverDetail={author:'OpenStreetMap contributors / Geofabrik',title:'朝鮮半島南北の河川中心線',url:'https://download.geofabrik.de/asia.html',locator:'2026-10-30公開のwaterways、riverクラス10,457区間',scope:'全国地図と合戦図の粗い中心線を補う現代の比較形状。16世紀の川幅・旧河道を確定する資料ではない。ODbL 1.0。',accessed:'2026-11-01'};
 TK.RESEARCH_SOURCES.marchPace={author:'リュウ・ポール・カン・ハウ／上智大学Sapientia会',title:'ごく普通だった「中国大返し」―秀吉の行軍と他の行軍との比較―（紀尾井論叢9、2024）',url:'https://sophia.repo.nii.ac.jp/record/2014446/files/2001048538_9_015.pdf',locator:'結論：荷駄を含む軍の一般的な日平均20～25km、短期間の強行軍約40km',scope:'概数を全軍へ一律適用せず、史実の出発・到着日と地形条件を優先。観察の1倍は4秒で1日に変更。',accessed:'2026-11-01'};
TK.RESEARCH_SOURCES.joseonFrontierBackground={author:'国史編纂委員会・우리역사넷',title:'白頭山定界碑の建立',url:'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_30&levelId=kc_i302500',locator:'1 北方地域の開発、3 定界碑建立',accessed:'2026-11-01',scope:'4郡6鎮の開拓と4郡廃止、北辺の行政支配の変化という背景。1712年の定界を1560～1615年の確定測地国境へ転用しない。'};
for(const r of TK.REGIONAL_RIVERS||[]){r.sourceIds=['regionalRivers'];if(r.border){r.frontierSourceIds=['joseonFrontierBackground'];r.frontierBasis='reference-zone-not-surveyed-frontier';}}
})();
