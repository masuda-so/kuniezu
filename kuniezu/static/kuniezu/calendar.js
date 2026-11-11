/* 史実DBと共通の西暦: 1582-10-04まではユリウス暦、翌日は1582-10-15。 */
(function(){
 'use strict';
 const reform=2299161;
 function toJD(y,m,d){
  if(![y,m,d].every(Number.isInteger)||y<1||m<1||m>12)throw RangeError('実在する年月日を指定してください');
  const greg=y>1582||(y===1582&&(m>10||(m===10&&d>=15)));
  const leap=y%4===0&&(!greg||y%100!==0||y%400===0);
  if(d<1||d>[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1]||(y===1582&&m===10&&d>=5&&d<=14))throw RangeError('実在する年月日を指定してください');
  const a=Math.floor((14-m)/12),Y=y+4800-a,M=m+12*a-3;
  return d+Math.floor((153*M+2)/5)+365*Y+Math.floor(Y/4)+(greg?-Math.floor(Y/100)+Math.floor(Y/400)-32045:-32083);
 }
 function fromJD(jd){
  if(!Number.isInteger(jd))throw RangeError('日番号は整数で指定してください');
  let b=0,c=jd+32082;
  if(jd>=reform){const a=jd+32044;b=Math.floor((4*a+3)/146097);c=a-Math.floor(146097*b/4);}
  const D=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*D/4),M=Math.floor((5*e+2)/153);
  return {y:100*b+D-4800+Math.floor(M/10),m:M+3-12*Math.floor(M/10),d:e-Math.floor((153*M+2)/5)+1};
 }
 // 旧360日時計の読み取り専用。実在しない日も保持し、移行時の選択に渡す。
 function legacyDate(state,t=state.t){
  t=Math.floor(t);const mm=state.m0-1+Math.floor(t/30);
  return {y:state.y0+Math.floor(mm/12),m:((mm%12)+12)%12+1,d:((t%30)+30)%30+1};
 }
 function valid(d){try{toJD(d.y,d.m,d.d);return true;}catch(error){if(error instanceof RangeError)return false;throw error;}}
 // 選択前に状態を変えない。不正日を丸めてから旧保存の日付とみなさない。
 function legacyDateChoices(state){
  const date=legacyDate(state);
  if(valid(date))return {date,requiresSelection:false,choices:[{...date}]};
  function nearest(step){
   const d={...date};
   for(let i=0;i<62;i++){
    d.d+=step;
    if(d.d>31){d.d=1;if(++d.m>12){d.m=1;d.y++;}}
    if(d.d<1){d.d=31;if(--d.m<1){d.m=12;d.y--;}}
    if(valid(d))return d;
   }
   throw RangeError('移行先の日付を確認できません');
  }
  return {date,requiresSelection:true,choices:[nearest(-1),nearest(1)]};
 }
 window.TKCalendar=Object.freeze({toJD,fromJD,legacyDate,legacyDateChoices,version:1});
})();
