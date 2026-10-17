"""Import the supplied Big Foot sheets without redrawing the artwork.

Run from any directory: python3 tools/add_bigfoot.py (Pillow, NumPy, SciPy).
Coordinates refer to sheets contained within 1200 x 900. Scale is calibrated
per source sheet, never to each pose's bounding box: crouches remain crouches.
Only Bigfoot's roster entry and assets are written. Original packs are retained.
"""
import hashlib
import io
import json
import wave
import zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage as ndi
from sprite_anchor import frame_anchor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets'
SOURCE = ROOT / 'source-packs/Big-Foot.zip'
FILES = {
 'idle': ('Big Foot standing',584), 'walk': ('BF walking left and right',280),
 'run': ('BF running',280), 'jump': ('BF jumping',480), 'kick': ('BF kicking',288),
 'chair': ('BF attack with chair',318), 'bat': ('BF attack with bat',300),
 'guitar': ('BF attack with guitar',284), 'trashcan': ('BF attack with trashcan',337),
 'carryBat': ('BF walking with bat',490), 'carryGuitar': ('BF walking with guitar',405),
 'carryTrashcan': ('BF walking with trashcan',340), 'lift': ('BF lifting overhead',330),
 'throw': ('BF lifting and throwing',329), 'lifted': ('BF being lifted overhead',252),
 'thrown': ('BF being thrown',260), 'hurt': ('BF dazed',545),
 'down': ('BF laying facedown',520), 'fallFront': ('BF falling forwards',264),
 'fallBack': ('BF falling backwards',313), 'rise': ('BF getting up from facedown',303),
 'taunt': ('BF taunting',317), 'victory': ('BF victory',342), 'defeat': ('BF defeated',565),
 'pin': ('BF pinning',376), 'climb': ('BF climb on corner ropes',297),
 'entry': ('BF climbing through ropes',340), 'dive': ('BF jumping off corner ropes',300),
 'ropePose': ('BF climb on rope',580), 'ko': ('BF passed out',1200),
 'special': ('Big Foot Choke Slam special',330),
}
CLIMBS = [
 [(645,100),(800,100),(804,178),(842,190),(842,229),(805,234),(798,264),(818,282),(813,304),(758,320),(735,310),(717,344),(703,378),(726,382),(725,397),(645,397),(644,375),(662,334),(662,296),(653,260)],
 [(950,72),(1125,72),(1125,181),(1148,192),(1148,226),(1110,233),(1082,241),(1080,265),(1102,277),(1102,297),(1043,303),(1018,285),(1009,326),(1004,346),(1029,347),(1029,366),(950,370)],
 [(540,422),(707,422),(710,501),(731,540),(732,565),(752,582),(752,609),(735,611),(730,596),(707,600),(704,616),(681,622),(674,613),(632,613),(617,618),(578,618),(568,609),(573,588),(548,575),(540,547)],
]

def pieces(im, rect=None, poly=None):
 rgb=np.array(im); region=Image.new('1',im.size); d=ImageDraw.Draw(region)
 if poly: d.polygon(poly,fill=1)
 else: d.rectangle(rect or (0,0,im.width-1,im.height-1),fill=1)
 mask=ndi.binary_closing(rgb.min(2)<238,iterations=1)&np.array(region,bool)
 labels,_=ndi.label(mask); found=[]
 for label,sl in enumerate(ndi.find_objects(labels),1):
  if not sl:continue
  ys,xs=sl;body=labels[sl]==label;px=rgb[sl].astype('int16');r,g,b=(px[:,:,i] for i in range(3))
  brown=(r>35)&(r<190)&(g>15)&(g>b*1.1)&(r>g*1.13)&(r<g*2.7)
  if body.sum()<4500 or (brown&body).sum()<700 or (ys.start<100 and ys.stop-ys.start<130):continue
  holes=ndi.binary_fill_holes(body)&~body;hl,_=ndi.label(holes);sizes=np.bincount(hl.ravel());small=sizes<80;small[0]=False
  alpha=body|small[hl];pic=Image.fromarray(np.dstack((rgb[sl],alpha.astype('uint8')*255)))
  found.append(dict(image=pic,x=xs.start,y=ys.start,w=pic.width,h=pic.height,area=int(alpha.sum())))
 return found

def extract(im,anim):
 def one(rect=None,poly=None):return max(pieces(im,rect,poly),key=lambda v:v['area'])
 if anim=='climb':
  items=[one(poly=p) for p in CLIMBS]
  for v in items:
   a=np.array(v['image']);r,g,b=(a[:,:,i].astype('int16') for i in range(3))
   rope=(r>120)&(r>g*2.3)&(r>b*2.3);a[:,:,3][ndi.binary_dilation(rope,iterations=2)]=0;v['image']=Image.fromarray(a)
  return items
 if anim=='dive':return [one((415,263,775,380))]
 if anim in ('entry','ropePose'):return [one()]
 if anim=='chair':return [one((0,190,220,525)),one((220,130,455,525)),one((450,101,660,525)),one(poly=[(660,200),(890,200),(890,389),(962,422),(958,462),(901,449),(888,525),(660,525)]),one(poly=[(950,265),(1120,265),(1120,397),(1199,438),(1199,491),(1132,490),(1132,525),(919,525),(930,470),(961,420),(950,380)])]
 if anim=='guitar':return [one(r) for r in [(0,140,235,440),(248,90,459,437),(472,90,680,439),(684,170,945,440),(940,190,1199,445)]]
 if anim=='rise':return [one(r) for r in [(0,310,290,390),(285,265,489,389),(487,220,698,389),(697,218,879,390),(876,170,1060,390),(1058,80,1199,390)]]
 if anim=='fallFront':return [one(r) for r in [(0,110,170,384),(145,149,320,384),(297,160,534,384),(470,235,779,338),(704,275,950,391),(947,308,1199,391)]]
 items=pieces(im)
 if anim in ('walk','run','kick','down','special'):
  rows=[[],[]]
  for v in items:rows[int((v['y']+v['h']/2)>im.height*.55)].append(v)
  rows=[sorted(row,key=lambda v:v['x']) for row in rows]
  if anim=='special':return rows[0]+rows[1]
  return [rows[0][-1],rows[1][0]] if anim=='down' else rows[1]
 items.sort(key=lambda v:v['x'])
 return items[-1:] if anim=='defeat' else items

def png(path,im):
 data=io.BytesIO();im.save(data,format='PNG');encoded=data.getvalue()
 with Image.open(io.BytesIO(encoded)) as check:check.load();assert check.size==im.size and check.mode=='RGBA'
 tmp=path.with_suffix('.tmp');tmp.write_bytes(encoded);tmp.replace(path)

def main():
 parts={};audit=[]
 with zipfile.ZipFile(SOURCE) as z:
  sources={n for n in z.namelist() if n.endswith('.png') and not n.startswith('__MACOSX')}
  assert sources=={f'Big Foot/{name}.png' for name,_ in FILES.values()}
  for anim,(name,nominal) in FILES.items():
   filename=f'Big Foot/{name}.png';data=z.read(filename);im=ImageOps.contain(Image.open(io.BytesIO(data)).convert('RGB'),(1200,900))
   items=extract(im,anim);assert items,anim;parts[anim]=items
   audit.append(dict(animation=anim,source=filename,sha256=hashlib.sha256(data).hexdigest(),count=len(items),nominalBodyHeight=nominal,bounds=[{k:v[k] for k in ('x','y','w','h')} for v in items]))
   print(anim,len(items),[(v['w'],v['h']) for v in items],flush=True)
 assert len(parts['idle'])==4
 portrait=parts['idle'][0]['image'].copy();portrait.thumbnail((220,320));png(OUT/'bigfoot-portrait.png',portrait)
 parts['idle']=parts['idle'][-1:]
 for anim in ('carryBat','carryGuitar','carryTrashcan'):
  for item in parts[anim]:item['image']=ImageOps.mirror(item['image'])
 # Scenery-bearing sheets are audited. The clean body poses avoid importing a
 # second ring/post into the game. No chair walk was supplied: use held-chair art.
 parts['entry']=parts['idle'];parts['ropePose']=parts['climb'][:1]
 frames=[];animations={};previews=[]
 for anim,items in parts.items():
  nominal=FILES['idle' if anim=='entry' else 'climb' if anim=='ropePose' else anim][1]
  entries=[]
  for i,item in enumerate(items):
   pic=item['image']
   if anim=='run':
    a=np.array(pic);r,g,b=(a[:,:,j].astype('int16') for j in range(3));gray=(np.maximum.reduce([r,g,b])-np.minimum.reduce([r,g,b])<22)&(r>95)&(np.arange(pic.height)[:,None]>pic.height*.94);a[:,:,3][gray]=0;pic=Image.fromarray(a)
   scale=min(220/nominal,380/pic.width,330/pic.height)
   pic=pic.resize((max(1,round(pic.width*scale)),max(1,round(pic.height*scale))),Image.Resampling.LANCZOS)
   entry=dict(frame=len(frames),w=pic.width,h=pic.height,**frame_anchor(pic,anim));entries.append(entry);frames.append(pic);previews.append((anim,i,pic))
  animations[anim]=entries
 A=animations
 for anim in ('chair','bat','guitar'):
  raw=A[anim];assert len(raw)==5,(anim,len(raw));A[anim]=[raw[0],raw[2],raw[3],raw[4],raw[0]]
 assert len(A['special'])==6 and len(A['walk'])==5 and len(A['run'])==6
 A['carryChair']=[dict(A['chair'][0])]
 A['light']=[A['special'][1],A['special'][0],A['special'][1],A['idle'][0]]
 A['heavy']=A['chair'];A['grapple']=A['kick'][:1];A['exhausted']=A['hurt'];A['kneel']=A['defeat']
 A['fallFront'][-1]=dict(A['down'][0]);A['fallBack'][-1]=dict(A['down'][1])
 A['rise'][0]=dict(A['down'][0]);A['rise'][-1]=dict(A['idle'][0])
 A['riseBack']=[dict(e) for e in reversed(A['fallBack'])];A['riseBack'][-1]=dict(A['idle'][0]);A['ko']=[dict(A['down'][1])]
 A['lifted']=[A['lifted'][2]];A['thrown']=[A['thrown'][0],A['thrown'][3]]
 for anim in ('walk','run','carryBat','carryGuitar','carryTrashcan'):
  for e in A[anim]:
   pic=frames[e['frame']];alpha=np.array(pic.getchannel('A'));xs=np.where(alpha[int(pic.height*.43):int(pic.height*.55)]>180)[1]
   if len(xs):e['anchorX']=round(float(np.median(xs)),2)
 width=2048;x=y=rowh=0;positions=[]
 for pic in frames:
  if x+pic.width+4>width:y+=rowh+4;x=0;rowh=0
  positions.append((x,y));x+=pic.width+4;rowh=max(rowh,pic.height)
 atlas=Image.new('RGBA',(width,y+rowh+4))
 for pic,pos in zip(frames,positions):atlas.alpha_composite(pic,pos)
 for entries in A.values():
  for e in entries:e['x'],e['y']=positions[e['frame']]
 png(OUT/'bigfoot.png',atlas)
 record=dict(id='bigfoot',name='Bigfoot',style='Brawler',color='#dc8a36',power=1,speed=1,technique=1,toughness=1,finisher='CHOKESLAM',websiteStats=None,edition='2026-10',artVersion='2026-10-17',balanceSource='Neutral game defaults; ratings not supplied. Chokeslam named in supplied artwork.',animations=A,weapons=['chair','bat','guitar','trashcan'],atlas='./assets/bigfoot.png',atlasSize=list(atlas.size))
 roster=json.loads((OUT/'roster.json').read_text())
 # Replace the removed Yabo slot; all other fighter positions stay unchanged.
 roster=[f for f in roster if f['id'] not in ('bigfoot','yabo')]
 roster.insert(8,record)
 for name in ('yabo.png','yabo-portrait.png'):(OUT/name).unlink(missing_ok=True)
 (OUT/'roster.json').write_text(json.dumps(roster,separators=(',',':')))
 (ROOT/'tools/bigfoot-source-audit.json').write_text(json.dumps(dict(sourceSHA256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),sheets=audit,atlasSize=atlas.size,frameCount=len(frames)),indent=2)+'\n')
 sound=ROOT/'source-packs/JCW-Big-Foot-Sound-Pack.zip';rows=[];dest=OUT/'sfx/bigfoot';dest.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(sound) as z:
  for name in z.namelist():
   if name.startswith('__MACOSX') or not name.endswith('.wav'):continue
   data=z.read(name);target=dest/Path(name).name;target.write_bytes(data)
   with wave.open(io.BytesIO(data)) as w:rows.append(dict(file=str(target.relative_to(ROOT)),sha256=hashlib.sha256(data).hexdigest(),channels=w.getnchannels(),hz=w.getframerate(),seconds=w.getnframes()/w.getframerate()))
 (ROOT/'tools/bigfoot-sound-audit.json').write_text(json.dumps(dict(sourceSHA256=hashlib.sha256(sound.read_bytes()).hexdigest(),files=rows),indent=2)+'\n')
 review=ROOT/'review';review.mkdir(exist_ok=True)
 for start in range(0,len(previews),32):
  page=previews[start:start+32];sheet=Image.new('RGB',(1600,((len(page)+7)//8)*260),'#393344');d=ImageDraw.Draw(sheet)
  for i,(anim,j,pic) in enumerate(page):
   x=i%8*200;y=i//8*260;pic=ImageOps.contain(pic,(194,225));sheet.paste(pic,(x+(200-pic.width)//2,y+250-pic.height),pic);d.text((x+5,y+5),f'{anim} {j}',fill='white')
  sheet.save(review/f'bigfoot-extracted-{start//32}.jpg',quality=93)
 print('Saved',atlas.size,len(frames),'prepared frames; roster',len(roster))

if __name__=='__main__':main()
