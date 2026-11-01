import cv2,numpy as np
_D={}
def yunet(img,thr=0.5):
  """PIL RGB -> dict(box,eyes(l,r),nose,mouth, score) in img coords, or None"""
  w0,h0=img.size;best=None
  for target in (320,480,640):
    sc=target/max(w0,h0);W,H=int(w0*sc),int(h0*sc)
    a=cv2.cvtColor(np.array(img.resize((W,H))),cv2.COLOR_RGB2BGR)
    pad=int(target*.15);a=cv2.copyMakeBorder(a,pad,pad,pad,pad,cv2.BORDER_REPLICATE)
    key=(a.shape[1],a.shape[0])
    if key not in _D:_D[key]=cv2.FaceDetectorYN.create('/home/claude/faces/yunet.onnx','',key,thr,0.3,50)
    d=_D[key];d.setScoreThreshold(thr)
    _,f=d.detect(a)
    if f is None:continue
    for r in f:
      r=[(v/sc if i in (2,3) else (v-pad)/sc) if i<14 else v for i,v in enumerate(r)]
      if best is None or r[14]*r[2]>best[14]*best[2]:best=r
    if best is not None:break
  if best is None:return None
  b=best;return {'box':b[0:4],'le':b[4:6],'re':b[6:8],'nose':b[8:10],'ml':b[10:12],'mr':b[12:14],'score':b[14]}
