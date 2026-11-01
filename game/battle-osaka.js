"use strict";
/* 参照画像を転載せず、確認できる地物と陣地の関係を独自の模式座標で表す。 */
TK.BATTLES['大坂冬の陣']={date:'慶長十九年（1614〜1615）',place:'摂津国 大坂',at:'ishiyama',aspect:.9,dur:60,layoutStatus:'schematic',
 src:'国立公文書館「大坂冬の陣・夏の陣」／大阪府「茶臼山古墳および河底池」。川・街道・真田丸の位置と部隊の広がりは模式表現。',
 sourceLinks:['https://www.archives.go.jp/exhibition/digital/ieyasu/contents5_04/','https://www.pref.osaka.lg.jp/o180150/bunkazaihogo/bunkazai/tennoujikouen.html'],
 sides:{a:{clan:'tokugawa',n:'徳川方',tr:'約20万（概数）'},b:{clan:'hashiba',n:'豊臣方',tr:'約10万（概数）'}},
 feats:[
  {k:'river',w:4,pts:[[.48,0],[.5,.12],[.47,.2],[.35,.23],[.16,.25],[0,.32]],n:'淀川'},
  {k:'river',w:2.4,pts:[[.81,0],[.78,.17],[.8,.32],[.82,.53],[.8,.74],[.84,1]],n:'平野川'},
  {k:'river',w:3,pts:[[.18,.25],[.22,.4],[.2,.6],[.16,.8],[.18,1]],n:'木津川'},
  {k:'castle',x:.6,y:.34,s:2.3,n:'大坂城'},
  {k:'fence',closed:1,pts:[[.42,.27],[.72,.25],[.76,.48],[.7,.57],[.44,.56],[.4,.39]],n:'惣構（模式）'},
  {k:'fort',x:.68,y:.6,n:'真田丸'},
  {k:'hill',x:.46,y:.87,r:.065,n:'茶臼山'},{k:'hill',x:.75,y:.87,r:.06,n:'岡山'},
  {k:'road',pts:[[.41,1],[.43,.84],[.45,.68],[.46,.56]],n:'紀州街道'},
  {k:'road',pts:[[.73,1],[.75,.87],[.76,.68],[.74,.52]],n:'奈良街道'},
  {k:'village',x:.53,y:.72,n:'天王寺'},{k:'village',x:.48,y:.13,n:'川崎'}],
 units:[
  {id:'osaka-castle',side:'b',clan:'hashiba',n:'城内',g:'豊臣秀頼',tr:0,arm:'yari',path:[[0,.6,.34]]},
  {id:'osaka-sanada',side:'b',clan:'sanada',n:'真田丸',g:'真田信繁',tr:0,arm:'teppo',path:[[0,.68,.57]],fire:[25,55]},
  {id:'osaka-ieyasu',side:'a',clan:'tokugawa',n:'茶臼山本陣',g:'徳川家康',tr:0,arm:'yari',path:[[0,.46,.87]]},
  {id:'osaka-ring-w',side:'a',clan:'tokugawa',n:'西側包囲線（模式）',g:'',tr:0,arm:'yari',path:[[0,.31,.45]]},
  {id:'osaka-ring-e',side:'a',clan:'tokugawa',n:'東側包囲線（模式）',g:'',tr:0,arm:'yari',path:[[0,.88,.45]]},
  {id:'osaka-ring-s',side:'a',clan:'tokugawa',n:'南側包囲線（模式）',g:'',tr:0,arm:'yari',path:[[0,.62,.76]]}],
 beats:[[0,'豊臣方は大坂城に兵糧を集め、徳川方は周囲に軍勢を展開した。'],[25,'城南の出城・真田丸では、真田信繁が徳川方の攻撃を退けた。'],[60,'包囲と交渉が続き、旧暦十二月十九日に和睦が成立した。'],[95,'この図の包囲線と部隊の広がりは模式表現。個々の大名の正確な陣地は、史料との照合を続ける。']]};
