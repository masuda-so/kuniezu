"""Geofabrik日別配布ZIPから河川shapefileのみRange取得。OSM/ODbL。"""
import io,zipfile,subprocess,pathlib,re,concurrent.futures,argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--regions",nargs="+",default=["tohoku","kanto","chubu","kansai","chugoku","shikoku","kyushu"])
parser.add_argument("--date",default="261031",help="Geofabrik snapshot YYMMDD")
args=parser.parse_args()
if not re.fullmatch(r"\d{6}",args.date):parser.error("date must be YYMMDD")
if any(not re.fullmatch(r"[a-z]+",n) for n in args.regions):parser.error("invalid region name")
base=pathlib.Path('/tmp/kuniezu-japan-waterways')/args.date;base.mkdir(parents=True,exist_ok=True)
def region(name):
 url=f'https://download.geofabrik.de/asia/japan/{name}-{args.date}-free.shp.zip';out=base/name;out.mkdir(exist_ok=True)
 if (out/'gis_osm_waterways_free_1.shx').exists():return name
 header=subprocess.run(['curl','-sfI','--max-time','30',url],capture_output=True,check=True).stdout.decode();size=int(re.findall(r'Content-Length: (\d+)',header,re.I)[-1])
 class Remote(io.RawIOBase):
  def __init__(self):self.pos=0
  def seekable(self):return True
  def seek(self,n,w=0):self.pos=n if w==0 else self.pos+n if w==1 else size+n;return self.pos
  def tell(self):return self.pos
  def read(self,n=-1):
   n=min(n if n>=0 else size-self.pos,size-self.pos)
   if n<=0:return b''
   pieces=[]
   for offset in range(0,n,4*1024*1024):
    start=self.pos+offset;length=min(4*1024*1024,n-offset);cached=out/f'.range-{start}-{length}'
    if cached.exists() and cached.stat().st_size==length:data=cached.read_bytes()
    else:
     data=subprocess.run(['curl','-sf','--retry','2','--max-time','60','--range',f'{start}-{start+length-1}',url],capture_output=True,check=True).stdout
     if len(data)!=length:raise RuntimeError((name,len(data),length))
     cached.write_bytes(data)
    pieces.append(data)
   data=b''.join(pieces)
   self.pos+=n;return data
 with zipfile.ZipFile(Remote())as z:
  names=[n for n in z.namelist()if 'gis_osm_waterways_free_1.'in n];assert names
  for n in names:
   dest=out/pathlib.Path(n).name
   if not dest.exists():dest.write_bytes(z.read(n))
 print('DONE',name,flush=True);return name
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
 for result in pool.map(region,args.regions):print(result,flush=True)
