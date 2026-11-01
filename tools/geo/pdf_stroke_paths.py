"""Read coloured PDF strokes in page coordinates, preserving separate subpaths."""
import math
import numpy as np
from pypdf import PdfReader
from pypdf.generic import ContentStream


def coloured_strokes(filename, colours, page=0, max_step=.3):
    reader=PdfReader(filename);matrix=np.eye(3);colour=None;stack=[];path=[];parts=[];out=[];current=None
    def transform(p):return (matrix@np.array([*p,1.]))[:2].tolist()
    def finish():
        nonlocal path,parts
        if path:parts.append(path)
        if colour is not None:
            for name,rgb in colours.items():
                if max(abs(a-b)for a,b in zip(colour,rgb))<.01:
                    out.extend({'colour':name,'points':p}for p in parts if len(p)>1)
        path=[];parts=[]
    for operands,op in ContentStream(reader.pages[page]['/Contents'],reader).operations:
        a=[float(v)for v in operands]if op in [b'cm',b'RG',b'm',b'l',b'c',b'v',b'y']else operands
        if op==b'q':stack.append((matrix.copy(),colour))
        elif op==b'Q':matrix,colour=stack.pop()
        elif op==b'cm':
            aa,bb,cc,dd,ee,ff=a;matrix=matrix@np.array([[aa,cc,ee],[bb,dd,ff],[0,0,1]])
        elif op==b'RG':colour=a
        elif op==b'm':
            if path:parts.append(path)
            current=np.array(a);path=[transform(current)]
        elif op==b'l' and current is not None:current=np.array(a);path.append(transform(current))
        elif op in [b'c',b'v',b'y'] and current is not None:
            if op==b'c':c1,c2,end=np.array(a[:2]),np.array(a[2:4]),np.array(a[4:])
            elif op==b'v':c1,c2,end=current,np.array(a[:2]),np.array(a[2:])
            else:c1,end=np.array(a[:2]),np.array(a[2:]);c2=end
            polygon=sum(math.dist(transform(u),transform(v))for u,v in zip([current,c1,c2],[c1,c2,end]))
            count=max(1,math.ceil(polygon/max_step))
            for i in range(1,count+1):
                t=i/count;p=(1-t)**3*current+3*(1-t)**2*t*c1+3*(1-t)*t*t*c2+t**3*end;path.append(transform(p))
            current=end
        elif op==b'h' and path:path.append(path[0])
        elif op in [b'S',b's']:finish();current=None
        elif op in [b'n',b'f',b'f*']:path=[];parts=[];current=None
    return out
