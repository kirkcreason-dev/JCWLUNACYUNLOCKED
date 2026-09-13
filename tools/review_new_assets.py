from PIL import Image,ImageDraw,ImageOps
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[1];rs=[f for f in json.load(open(root/'dist/assets/roster.json')) if f.get('edition')]
for r in rs:
 if len(sys.argv)>1 and r['id']!=sys.argv[1]:continue
 atlas=Image.open(root/'dist'/r['atlas']);atlas.load();print(r['id'],atlas.size)
 for group,keys in [('ropes',['climb','entry','dive','jump']),('attacks',['light','chair','bat','guitar','trashcan']),('falls',['fallFront','fallBack','down','rise'])]:
  pairs=[(a,i,e) for a in keys for i,e in enumerate(r['animations'][a])]
  out=Image.new('RGB',(1440,((len(pairs)+5)//6)*260),'#393344');d=ImageDraw.Draw(out)
  for j,(a,i,e) in enumerate(pairs):
   im=atlas.crop((e['x'],e['y'],e['x']+e['w'],e['y']+e['h']));im=ImageOps.contain(im,(230,225));x=j%6*240;y=j//6*260;out.paste(im,(x+(240-im.width)//2,y+250-im.height),im);d.text((x+5,y+5),f'{a} {i}',fill='white')
  out.save(root/'tools'/f'focus-{r["id"]}-{group}.jpg')
