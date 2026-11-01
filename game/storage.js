"use strict";
/* ブラウザに依存しない保存処理。テストではメモリ上の storage を注入する。 */
(function(root){
 const MAX=20000000;
 const api={
  write(storage,key,state,meta){
   try{const data=JSON.stringify(state);if(data.length>MAX)throw new Error('size');
    // 本体を先に保存する。表示用情報の失敗で本体の保存成功を取り消さない。
    storage.setItem(key,data);try{storage.setItem(key+'-meta',meta);}catch(_){}
    return {ok:true};
   }catch(error){return {ok:false,error};}
  },
  encode(state){return JSON.stringify({format:'kuniezu',version:1,state},null,2);},
  decode(text){if(text.length>MAX)throw new Error('size');const v=JSON.parse(text);
   if(v&&v.format==='kuniezu'){if(v.version!==1)throw new Error('version');return v.state;}return v;}
 };
 root.TKStorage=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
