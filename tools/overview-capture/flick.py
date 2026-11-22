import sys, glob
from PIL import Image, ImageChops
fs=sorted(glob.glob(f'film/{sys.argv[1]}/*.png'))
ims=[Image.open(f).convert('L').resize((195,380)) for f in fs]
def d(a,b): return sum(ImageChops.difference(a,b).point(lambda p:1 if p>8 else 0).tobytes())
adj=[d(ims[i-1],ims[i]) for i in range(1,len(ims))]
bad=[i for i in range(1,len(ims)-1) if adj[i-1]>1200 and adj[i]>1200 and d(ims[i-1],ims[i+1])<0.5*adj[i-1]]
print(sys.argv[1],'frames',len(ims),'median change',sorted(adj)[len(adj)//2],'max',max(adj),'one-frame flickers',bad)
