/* 県の配置図を二つの地名代表点で相似登録。測量精度ではない。 */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../..');
const origin={name:'高松城跡',pixel:[480,417],point:[133.822263,34.692673],source:'https://geoshape.ex.nii.ac.jp/nrct-poi/resource/34/340000230800.html'},
 control={name:'吉備津神社',pixel:[717,581],point:[133+51/60+2.5/3600,34+40/60+14.7/3600],source:'https://kojiki.kokugakuin.ac.jp/jinjya/kibitsujinja/'},
 symbol=[531,468],cos=Math.cos(origin.point[1]*Math.PI/180),east=(control.point[0]-origin.point[0])*111320*cos,north=(control.point[1]-origin.point[1])*111320,x=control.pixel[0]-origin.pixel[0],y=control.pixel[1]-origin.pixel[1],den=x*x+y*y,a=(east*x-north*y)/den,b=(east*y+north*x)/den,dx=symbol[0]-origin.pixel[0],dy=symbol[1]-origin.pixel[1],point=[origin.point[0]+(a*dx+b*dy)/(111320*cos),origin.point[1]+(b*dx-a*dy)/111320];
const out={method:'二点相似変換・地名代表点と図記号の登録',origin,control,symbol,point,roundedPoint:point.map(v=>+v.toFixed(6)),readoutAllowanceMeters:200,independentObservation:{source:'https://cyberjapandata.gsi.go.jp/xyz/std/16/57130/26028.png',tilePixel:[168,68],result:'山地内。陣の測量点を独立確定したものではない。'},limitations:'基準点2点だけなので残差0は精度の証明ではない。図記号と場所代表点の幅を含み、陣の外郭や隊の持場は復元しない。'};
fs.writeFileSync(path.join(root,'data/inputs/takamatsu-review/registration.json'),JSON.stringify(out,null,2)+'\n');console.log(out.roundedPoint);
