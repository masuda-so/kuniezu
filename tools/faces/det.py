import cv2,numpy as np
D=[cv2.CascadeClassifier('/home/claude/faces/'+n) for n in ['haarcascade_frontalface_alt2.xml','haarcascade_frontalface_default.xml','haarcascade_profileface.xml']]
def detect(img):  # PIL RGB -> (x,y,w,h) in img coords or None
  w0,h0=img.size;sc=400/max(w0,h0)
  g=cv2.cvtColor(np.array(img.resize((int(w0*sc),int(h0*sc)))),cv2.COLOR_RGB2GRAY);g=cv2.equalizeHist(g)
  for flip in (False,True):
    gg=cv2.flip(g,1) if flip else g
    for d in D:
      r=d.detectMultiScale(gg,1.05,4,minSize=(int(40*1),int(40*1)))
      if len(r):
        a,b,w,h=max(r,key=lambda t:t[2]*t[3])
        if flip:a=gg.shape[1]-a-w
        return (a/sc,b/sc,w/sc,h/sc)
  return None
