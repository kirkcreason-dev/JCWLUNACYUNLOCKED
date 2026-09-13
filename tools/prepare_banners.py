"""Prepare supplied announcement art as game textures, removing baked checkerboard.
Usage: python tools/prepare_banners.py /path/to/uploads
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
root=Path(__file__).resolve().parents[1];src=Path(sys.argv[1]);out=root/'dist/assets/banners';out.mkdir(exist_ok=True)
files={'pinfall':'08b183bd-a992-45d4-ba24-2bdaf6d74b78.png','kickout':'3264dc3e-7565-4cff-9b18-a6864027e527.png','tapout':'bf3fbe75-7f41-4258-9397-8384e2c5cfd7.png','lunacy':'634d59a1-b104-4508-8244-0eb87967f0f2.png','win':'e6eb9579-cddd-4d77-9f34-a7ab677f7082.png'}
for name,file in files.items():
 im=Image.open(src/file).convert('RGBA');a=np.array(im);v=a[:,:,:3].astype('int16');core=(v.max(2)<75)|((v.max(2)-v.min(2))>90)
 lab,n=ndi.label(core);sizes=np.bincount(lab.ravel());keep=sizes>100;keep[0]=False;core=ndi.binary_fill_holes(keep[lab])
 # A fresh narrow white outer keyline preserves readability without paper pixels.
 alpha=ndi.binary_dilation(core,iterations=5);rgb=a[:,:,:3].copy();rgb[alpha&~core]=255
 rgba=np.dstack((rgb,alpha.astype('uint8')*255));im=Image.fromarray(rgba);box=im.getbbox();im=im.crop(box);im.thumbnail((1600,480),Image.Resampling.LANCZOS);im.save(out/(name+'.png'))
 print(name,im.size)
