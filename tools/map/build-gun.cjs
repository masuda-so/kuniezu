/* CODH『旧国・旧郡境界データセット』（江戸末期の国境・郡境、CC BY-NC 4.0）を、領域画像と同じ格子（100m）の郡画像にする。
   入力：.cache/codh-kg/geojson/G*.geojson（郡ごと。取得は利用者の許可済み、再配布はしない）。
   出力：game/map/gun/<列>-<行>.png（画素に郡の番号を RGB で持つ。0＝郡なし）、game/map/gun.csv（番号・CODH の ID・郡名・読み・国名・国 ID・画素数）。
   郡境は江戸末期のもので、戦国期の郡境とは違う所がある（推定として扱う）。
   出典：『旧国・旧郡境界データセット』（CODH作成） 「幕末明治地勢地図境界データ」（人間文化研究機構作成）を加工 doi:10.20676/00000454
   実行：node --max-old-space-size=6000 tools/map/build-gun.cjs */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),src=path.join(root,'.cache/codh-kg/geojson'),out=path.join(root,'game/map');
const m=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
const K=m.projection.K,CX=m.projection.CX,LON0=m.projection.LON0,LAT0=m.projection.LAT0,STEP=m.projection.stepUnits,[OX,OY]=m.projection.origin,W=m.width,H=m.height,T=m.tile;
const PJ=(lon,lat)=>[(lon-LON0)*K*CX,(LAT0-lat)*K];
const files=fs.readdirSync(src).filter(f=>/^G\d+\.geojson$/.test(f)).sort();
const guns=files.map((f,i)=>{const j=JSON.parse(fs.readFileSync(path.join(src,f),'utf8')),p=j.features[0].properties;
 const rings=[];for(const ft of j.features){const g=ft.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;for(const poly of polys)for(const ring of poly)rings.push(ring.flatMap(([lo,la])=>PJ(lo,la)));}
 return {n:i+1,id:p.id,name:p.name,yomi:p.yomi,kuni:p.kuni,kuni_id:p.kuni_id,pref:p.pref,rings};});
// 朝鮮：1910年5月時点の府・郡（tools/map/extract-hgis-1910.py が国史編纂委員会の GeoPackage から取り出したもの）。番号は日本の郡の後に続ける。
const krFile=path.join(root,'.cache/hgis-1910/counties-1910.json');
if(fs.existsSync(krFile)){const kr=JSON.parse(fs.readFileSync(krFile,'utf8'));for(const c of kr.counties)guns.push({n:guns.length+1,id:c.id,name:c.name,yomi:c.name_ko,kuni:c.do8,kuni_id:c.do1910,pref:c.type,rings:c.polygons.flatMap(poly=>poly.map(ring=>ring.flatMap(([lo,la])=>PJ(lo,la))))});}
if(guns.length>65534)throw Error('too many');
// 偶奇則の走査線塗り（郡ごとに全リングをまとめて塗る＝穴も正しく抜ける）。
const id=new Uint16Array(W*H),count=new Float64Array(guns.length+1);let overlap=0;
for(const g of guns){const edges=[];for(const r of g.rings){const n=r.length/2;for(let i=0;i<n;i++){const ax=r[i*2],ay=r[i*2+1],bx=r[((i+1)%n)*2],by=r[((i+1)%n)*2+1];if(ay===by)continue;edges.push(ay<by?[ax,ay,bx,by]:[bx,by,ax,ay]);}}
 let lo=Infinity,hi=-Infinity;for(const e of edges){lo=Math.min(lo,e[1]);hi=Math.max(hi,e[3]);}
 const r0=Math.max(0,Math.ceil((lo-OY)/STEP-.5)),r1=Math.min(H-1,Math.floor((hi-OY)/STEP-.5));
 for(let r=r0;r<=r1;r++){const y=OY+(r+.5)*STEP,xs=[];for(const e of edges)if(e[1]<=y&&e[3]>y)xs.push(e[0]+(y-e[1])/(e[3]-e[1])*(e[2]-e[0]));xs.sort((a,b)=>a-b);
  for(let i=0;i+1<xs.length;i+=2){const c0=Math.max(0,Math.ceil((xs[i]-OX)/STEP-.5)),c1=Math.min(W-1,Math.floor((xs[i+1]-OX)/STEP-.5));for(let c=c0;c<=c1;c++){const k=r*W+c;if(id[k]&&id[k]!==g.n)overlap++;id[k]=g.n;}}}}
for(let k=0;k<id.length;k++)count[id[k]]++;
// PNG（RGB、フィルタ0）
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
const crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0;};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const png=(w,h,rgb)=>{const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);};
const dir=path.join(out,'gun');fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});const tiles=[];
for(let ty=0;ty*T<H;ty++)for(let tx=0;tx*T<W;tx++){const c0=tx*T,r0=ty*T,bw=Math.min(T,W-c0),bh=Math.min(T,H-r0);let any=false;const rgb=Buffer.alloc(bw*bh*3);
 for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){const v=id[(r0+y)*W+c0+x];if(v)any=true;const o=(y*bw+x)*3;rgb[o]=0;rgb[o+1]=v>>8;rgb[o+2]=v&255;}
 if(!any)continue;const file=`${tx}-${ty}.png`,buf=png(bw,bh,rgb);fs.writeFileSync(path.join(dir,file),buf);tiles.push({file,col:tx,row:ty,width:bw,height:bh,sha256:crypto.createHash('sha256').update(buf).digest('hex')});}
fs.writeFileSync(path.join(out,'gun.csv'),'n;codh_id;name;yomi;kuni;kuni_id;pref;pixels\n'+guns.map(g=>[g.n,g.id,g.name,g.yomi,g.kuni,g.kuni_id,g.pref,count[g.n]].join(';')).join('\n')+'\n');
fs.writeFileSync(path.join(out,'gun.json'),JSON.stringify({generated:'tools/map/build-gun.cjs',source:'日本：旧国・旧郡境界データセット（CODH）。朝鮮：国史編纂委員会 歴史地理情報「행정구역 GIS 데이터 (1910~1945년)」の1910年5月時点の府・郡',license:'日本 CC BY-NC 4.0／朝鮮 공공누리 제1유형（출처표시）',credit:'『旧国・旧郡境界データセット』（CODH作成） 「幕末明治地勢地図境界データ」（人間文化研究機構作成）を加工 doi:10.20676/00000454 ／ 국사편찬위원회 역사지리정보（https://hgis.history.go.kr）「행정구역 GIS 데이터 (1910~1945년)」를 가공',
 note:'日本は江戸末期の郡境、朝鮮は1910年（1914年の統合前）の府郡境。どちらも戦国期・1592年の境とは違う所がある。画素の番号は gun.csv の n（G は上位バイト、B は下位バイト）。',gridSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'manifest.json'))).digest('hex'),
 inputSha256:crypto.createHash('sha256').update(files.map(f=>fs.readFileSync(path.join(src,f))).reduce((a,b)=>Buffer.concat([a,b]),Buffer.alloc(0))).digest('hex'),guns:guns.length,overlapPixels:overlap,tiles},null,1));
console.log(JSON.stringify({guns:guns.length,tiles:tiles.length,overlap,zeroGuns:guns.filter(g=>!count[g.n]).map(g=>g.name)}));
