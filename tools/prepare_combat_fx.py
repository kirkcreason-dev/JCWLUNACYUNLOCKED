"""Pack supplied transparent combat effects into animation cells.
Usage: python tools/prepare_combat_fx.py /path/to/uploads
"""
from pathlib import Path
import sys,json
from PIL import Image
root=Path(__file__).resolve().parents[1];src=Path(sys.argv[1]);out=root/'dist/assets/fx';out.mkdir(exist_ok=True)
files={'chips':'4fd89653-f93e-4661-9d07-168bb844edd3.png','impact':'75148e7b-2077-44b6-99ea-0370e4b4b74c.png','ground':'4317949c-163f-44e1-8f11-5dc70d76ccbb.png','guard':'c3fc5c5f-7f34-4dc5-83ed-8432990de7ee.png'}
meta={}
for key,file in files.items():
 im=Image.open(src/file).convert('RGBA');frames=[]
 for row in range(2):
  columns=8 if key=='ground' and row==1 else 4
  cw=im.width/columns;ch=im.height/2
  for col in range(columns):
   raw=im.crop((round(col*cw),round(row*ch),round((col+1)*cw),round((row+1)*ch)));raw=raw.resize((round(raw.width*.55),round(raw.height*.55)),Image.Resampling.LANCZOS)
   frame=Image.new('RGBA',(256,256));x=128-raw.width//2;y=(196 if key=='ground' else 128)-round((ch*.78 if key=='ground' else ch/2)*.55);frame.alpha_composite(raw,(x,y));frames.append(frame)
 atlas=Image.new('RGBA',(1024,256*((len(frames)+3)//4)))
 for i,f in enumerate(frames):atlas.alpha_composite(f,(i%4*256,i//4*256))
 atlas.save(out/(key+'.png'));meta[key]={'frames':len(frames),'cell':256,'columns':4,'anchorY':196 if key=='ground' else 128,'fps':20 if key=='ground' else 24}
(out/'manifest.json').write_text(json.dumps(meta,indent=2))
