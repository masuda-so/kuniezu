/* CDPへ値をコードに埋め込まずCallArgumentとして渡す。 */
module.exports=call=>async(fn,...values)=>{
 const global=await call('Runtime.evaluate',{expression:'globalThis'});
 if(global.exceptionDetails||!global.result?.objectId)throw Error('Browser global object unavailable');
 try{
 const r=await call('Runtime.callFunctionOn',{
  objectId:global.result.objectId,functionDeclaration:fn.toString(),
  arguments:values.map(value=>({value})),returnByValue:true,awaitPromise:true,
 });
 if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
 return r.result.value;
 }finally{await call('Runtime.releaseObject',{objectId:global.result.objectId}).catch(()=>{});}
};
