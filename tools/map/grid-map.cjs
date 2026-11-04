/* 円錐図法の格子（game/map/build/grid/grid.json）の画素が、正本の格子（旧来の簡易平面）のどの画素を参照するかを決める共通の規則。
   reproject-grid.cjs（画像の写し）と build-province-edits.cjs（年代別の差分の写し）が同じ関数を使い、同じ画素を選ぶ。
   出力の行ごとに 64 列おきに経緯度へ戻して計算し、間を直線で補う（曲率による誤差は 0.01 画素未満）。 */
const TKP=require('../../game/map-projection.js');
const STEP=64;
/* g：grid.json（projection.origin・stepUnits・width・height、source.legacy の origin・stepUnits・width・height）。
   返り値 map(r, cols, rows)：出力の行 r について、各列が参照する正本の [列,行] を cols・rows（Int32Array、長さ width）に書く。正本の外は -1。
   返り値は参照する正本の行の [最小,最大]（無ければ [-1,-1]）。 */
module.exports=function rowMapper(g){
 const [GX,GY]=g.projection.origin,S=g.projection.stepUnits,GW=g.width,L=g.source.legacy,[OX,OY]=L.origin,LS=L.stepUnits,W=L.width,H=L.height;
 if(Math.abs(S-LS)>1e-12)throw Error('格子の画素の大きさが正本と違う');
 const NS=Math.ceil((GW-1)/STEP)+1,sc=new Float64Array(NS),sr=new Float64Array(NS);
 return function map(r,cols,rows){const Y=GY+(r+.5)*S;for(let i=0;i<NS;i++){const [lx,ly]=TKP.toLegacy(GX+(Math.min(i*STEP,GW-1)+.5)*S,Y);sc[i]=(lx-OX)/LS;sr[i]=(ly-OY)/LS;}
  let lo=-1,hi=-1;for(let c=0;c<GW;c++){const i=Math.min(NS-2,Math.floor(c/STEP)),span=Math.min((i+1)*STEP,GW-1)-i*STEP||1,a=(c-i*STEP)/span;
   const col=Math.floor(sc[i]+(sc[i+1]-sc[i])*a),row=Math.floor(sr[i]+(sr[i+1]-sr[i])*a),ok=col>=0&&col<W&&row>=0&&row<H;cols[c]=ok?col:-1;rows[c]=ok?row:-1;if(ok){if(lo<0||row<lo)lo=row;if(row>hi)hi=row;}}
  return [lo,hi];};};
module.exports.STEP=STEP;
