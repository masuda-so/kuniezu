/* 地図の正本を人が目で確かめるための縮小版（game/map/build/previews/、Git で追跡しない）。
   正本の PNG は 23,426×23,496 画素で、VS Code（Chromium）が一度に展開できる上限を超えて開けない。郡の画像は番号を色の値に入れたもの、
   川の画像は黒地に1画素幅の線なので、そのままでは読めない。そこで層ごとに 1/4（約 5,900 画素角）の見やすい画像にし、1度ごとの経緯度の目盛りと数字を入れる。
   control.png  支配：城の支配域（definition.csv の色）。海は紺、湖は青。
   admin.png    行政区分：郡ごとの色と国の境（濃い線。明治の分国は陸奥・出羽に戻す＝ゲームの国境と同じ）。郡の無い陸は薄い灰色。
   rivers.png   自然：川（4×4 画素の中に川が1画素でもあれば青）。
   height.png   自然：標高の段彩（noData は海の色）。
   実行：node --max-old-space-size=6000 tools/map/build-previews.cjs   （build-map.cjs の最後の段でも動く） */
const fs=require('node:fs'),path=require('node:path');
const MD=require('./map-data.cjs'),{readRGB,writeRGB,readGray16}=require('./png-big.cjs');
const F=4,P=MD.readProjection(),W=P.width,H=P.height,PW=Math.ceil(W/F),PH=Math.ceil(H/F),C=F>>1,[OX,OY]=P.origin,S=P.stepUnits;
const out=path.join(MD.out,'previews');fs.mkdirSync(out,{recursive:true});
const def=MD.readDefinition(),byRGB=def.byRGB;
const SEA=[38,64,110],LAKE=[70,120,170],kind=new Uint8Array(PW*PH);// 0 海、1 湖、2 陸
const img=()=>Buffer.alloc(PW*PH*3);
const put=(b,i,c)=>{b[i*3]=c[0];b[i*3+1]=c[1];b[i*3+2]=c[2];};
// 経緯度→縮小版の画素
const px=lon=>((lon-P.LON0)*P.K*P.CX-OX)/S/F,py=lat=>((P.LAT0-lat)*P.K-OY)/S/F;
const lonAt=x=>(x*F*S+OX)/P.K/P.CX+P.LON0,latAt=y=>P.LAT0-(y*F*S+OY)/P.K;
// 3×5 の数字
const GLYPH={'0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001001001001','8':'111101111101111','9':'111101111001111'};
function text(b,x0,y0,s,k=4){let x=x0;for(const ch of s){const g=GLYPH[ch];if(g)for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(g[r*3+c]==='1')for(let dy=0;dy<k;dy++)for(let dx=0;dx<k;dx++){const X=x+c*k+dx,Y=y0+r*k+dy;if(X>=0&&Y>=0&&X<PW&&Y<PH)put(b,Y*PW+X,[20,20,20]);}x+=4*k;}}
function graticule(b){
 const l0=Math.ceil(lonAt(0)),l1=Math.floor(lonAt(PW)),a0=Math.ceil(latAt(PH)),a1=Math.floor(latAt(0));
 const blend=i=>{for(let k=0;k<3;k++)b[i*3+k]=(b[i*3+k]+40)>>1;};
 for(let lon=l0;lon<=l1;lon++){const x=Math.round(px(lon));if(x<0||x>=PW)continue;for(let y=0;y<PH;y++)blend(y*PW+x);text(b,x+6,6,String(lon));text(b,x+6,PH-30,String(lon));}
 for(let lat=a0;lat<=a1;lat++){const y=Math.round(py(lat));if(y<0||y>=PH)continue;for(let x=0;x<PW;x++)blend(y*PW+x);text(b,6,y+6,String(lat));text(b,PW-60,y+6,String(lat));}}
async function save(name,b){graticule(b);await writeRGB(path.join(out,name),PW,PH,y=>b.subarray(y*PW*3,(y+1)*PW*3));}
const hue=n=>{const h=(n*0.618033988749895)%1,s=.45,v=.92,i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);const [r,g,bl]=[[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i%6];return [r*255|0,g*255|0,bl*255|0];};
(async()=>{
 const t0=Date.now();
 // 支配（城の支配域）
 const ctrl=img();
 await readRGB(MD.files.provinces,(y,row)=>{if(y%F!==C)return;const pyy=(y-C)/F;for(let c=0;c<PW;c++){const x=Math.min(W-1,c*F+C),o=x*3,d=byRGB.get(row[o]+','+row[o+1]+','+row[o+2]),i=pyy*PW+c;
  if(!d){put(ctrl,i,[255,0,255]);kind[i]=2;continue;}kind[i]=d.kind==='sea'?0:d.kind==='lake'?1:2;put(ctrl,i,d.kind==='sea'?SEA:d.kind==='lake'?LAKE:d.rgb);}});
 await save('control.png',ctrl);
 // 行政区分（郡と国）
 const rows=fs.readFileSync(path.join(MD.layers.admin,'gun.csv'),'utf8').trim().split('\n').slice(1).map(l=>l.split(';'));
 const kuniOf=new Map(),kuniIds=new Map();for(const r of rows){const k=MD.normalizeKuni(r[4]);if(!kuniIds.has(k))kuniIds.set(k,kuniIds.size+1);kuniOf.set(+r[0],kuniIds.get(k));}
 const adm=img(),kuni=new Uint16Array(PW*PH);
 await readRGB(path.join(MD.layers.admin,'gun.png'),(y,row)=>{if(y%F!==C)return;const pyy=(y-C)/F;for(let c=0;c<PW;c++){const x=Math.min(W-1,c*F+C),n=row[x*3+1]<<8|row[x*3+2],i=pyy*PW+c;
  if(kind[i]===0){put(adm,i,SEA);continue;}if(kind[i]===1){put(adm,i,LAKE);continue;}if(!n){put(adm,i,[222,219,210]);continue;}kuni[i]=kuniOf.get(n)||0;put(adm,i,hue(n));}});
 for(let y=0;y<PH;y++)for(let x=0;x<PW;x++){const i=y*PW+x,k=kuni[i];if(!k)continue;if((x+1<PW&&kuni[i+1]&&kuni[i+1]!==k)||(y+1<PH&&kuni[i+PW]&&kuni[i+PW]!==k))put(adm,i,[70,50,40]);}
 await save('admin.png',adm);
 // 川
 const riv=img();for(let i=0;i<PW*PH;i++)put(riv,i,kind[i]===0?[150,175,205]:kind[i]===1?[120,160,200]:[238,234,222]);
 await readRGB(path.join(MD.layers.physical,'rivers.png'),(y,row)=>{const pyy=Math.floor(y/F);for(let x=0;x<W;x++){const o=x*3;if(row[o]|row[o+1]|row[o+2])put(riv,pyy*PW+Math.floor(x/F),[30,90,200]);}});
 await save('rivers.png',riv);
 // 標高（段彩）
 const enc=JSON.parse(fs.readFileSync(path.join(MD.layers.physical,'heightmap.json'),'utf8')).encoding;
 const ramp=[[0,[110,150,100]],[100,[150,180,105]],[400,[205,195,130]],[1000,[180,140,95]],[2000,[150,120,110]],[3500,[245,245,245]]];
 const colorAt=m=>{if(m<=ramp[0][0])return ramp[0][1];for(let k=1;k<ramp.length;k++)if(m<=ramp[k][0]){const [a,ca]=ramp[k-1],[b,cb]=ramp[k],t=(m-a)/(b-a);return ca.map((v,j)=>Math.round(v+(cb[j]-v)*t));}return ramp[ramp.length-1][1];};
 const hm=path.join(MD.layers.physical,'heightmap.png'),sig=Buffer.alloc(4);{const fd=fs.openSync(hm,'r');fs.readSync(fd,sig,0,4,0);fs.closeSync(fd);}
 if(sig.readUInt32BE(0)!==0x89504e47)console.log('標高の画像が Git LFS から取得されていないので height.png は作らない（git lfs pull）');else{
 const hgt=img();
 await readGray16(path.join(MD.layers.physical,'heightmap.png'),(y,row)=>{if(y%F!==C)return;const pyy=(y-C)/F;for(let c=0;c<PW;c++){const v=row[Math.min(W-1,c*F+C)],i=pyy*PW+c;
  if(v===enc.noData||kind[i]===0){put(hgt,i,SEA);continue;}if(kind[i]===1){put(hgt,i,LAKE);continue;}put(hgt,i,colorAt(enc.offsetMetres+(v-1)/enc.codesPerMetre));}});
 await save('height.png',hgt);}
 fs.writeFileSync(path.join(out,'README.md'),`# 地図の正本の縮小版（生成物、Git で追跡しない）\n\n\`node tools/map/build-previews.cjs\` が正本 game/map から作る。1/4 縮尺（${PW}×${PH} 画素、1画素＝${F*100}m）。細い線は1度ごとの経緯度で、数字は経度（上下の端）と緯度（左右の端）。\n\n| ファイル | 層 | 見方 |\n|---|---|---|\n| control.png | 支配 | 城の支配域ごとの色。紺は海、青は湖。 |\n| admin.png | 行政区分 | 郡ごとの色、濃い線は国の境。薄い灰色は郡の無い陸。 |\n| rivers.png | 自然 | 青い線が川。 |\n| height.png | 自然 | 標高の段彩（低地の緑→山地の茶→高山の白）。 |\n`);
 console.log(JSON.stringify({out:path.relative(MD.root,out),size:[PW,PH],seconds:Math.round((Date.now()-t0)/1000)}));
})().catch(e=>{console.error(e);process.exit(1);});
