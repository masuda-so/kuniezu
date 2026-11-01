"use strict";
/* 観察対象の家から見た直接の関係。同盟の推移閉包は作らない。
   資料にない関係を「中立国」と断定しない。主従は同盟と別色。 */
(function(){
 const kinds={self:['自家','#236ec1'],lord:['主家','#7652a4'],vassal:['従属','#a074b8'],war:['交戦記録あり','#c93636'],ally:['同盟・和睦','#21844e'],hostile:['敵対','#bd7b23'],none:['関係未記録','#aaa391'],absent:['未成立・滅亡','#c8c2b7']};
 G.relationKind=function(a,b){const s=G.S();let key='none';
  if(!s.clans[a]?.alive||!s.clans[b]?.alive)key='absent';else if(a===b)key='self';
  else if(s.vassal?.[a]===b)key='lord';else if(s.vassal?.[b]===a)key='vassal';
  else if(G.atWar(a,b))key='war';else if(G.allied(a,b))key='ally';else if(G.rel(a,b)<=20)key='hostile';
  return {key,name:kinds[key][0],color:kinds[key][1]};
 };
 G.relationKinds=kinds;
})();
