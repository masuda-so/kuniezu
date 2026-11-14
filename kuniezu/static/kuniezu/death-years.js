/* 史実 DB の確認済みの没年（history/deaths.js、公開の書き出しが作る）を、hist.js に手で書いた TK.DEATH_Y より優先する。
   既定（TK.DEATH_YEARS=null）では何もしない。年表の死去の出来事（k:'death'・kill）は変えない。
   置き換えた名前と元の年は TK.DEATH_Y_REPLACED に残す（検査と照合のため）。 */
(function(){
 const data=TK.DEATH_YEARS;if(!data||!data.people)return;
 TK.DEATH_Y=TK.DEATH_Y||{};const replaced={};
 for(const [name,row] of Object.entries(data.people)){
  if(!Number.isInteger(row?.y))continue;
  if(TK.DEATH_Y[name]!==row.y)replaced[name]=Object.hasOwn(TK.DEATH_Y,name)?TK.DEATH_Y[name]:null;
  TK.DEATH_Y[name]=row.y;
 }
 TK.DEATH_Y_REPLACED=replaced;
})();
