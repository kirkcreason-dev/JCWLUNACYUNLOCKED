"""Import the replacement Alice Crowley pack without rebuilding other fighters.

Usage: python3 tools/replace_alice.py /path/to/Alice-Crowley.zip
Requires Pillow, numpy and scipy. Source PNGs are preserved inside source-packs/.
This is mechanical sprite extraction, not newly generated character artwork.
"""
from pathlib import Path
from copy import deepcopy
import hashlib, io, json, sys, zipfile, shutil
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageOps, ImageDraw
from sprite_anchor import frame_anchor

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets'
FILES={
 'standing':'AC standing.png','walk':'AC walking.png','run':'AC running.png',
 'chair':'AC attack with chair.png','bat':'AC attack with bat.png',
 'carryChair':'AC walk with chair.png','carryBat':'AC walk with bat.png',
 'carryGuitar':'AC walk with guitar.png','carryTrashcan':'AC walk with trashcan.png',
 'lift':'AC lifting overhead.png','throw':'AV throwing.png','lifted':'AC getting lifted overhead.png',
 'hurt':'AC dazed.png','fallBack':'AC falling backward.png','fallFront':'AC falling forward.png',
 'down':'AC laying facedown and faceup.png','rise':'AC getting back up from facedown.png',
 'taunt':'AC taunting.png','victory':'AC victory.png','defeat':'AC defeated.png',
 'ko':'AC passed out.png','jump':'AC jumping.png','kick':'AC kicking.png',
 'pin':'AC pinning.png','climb':'AC climb on top rope corner.png','dive':'AC jumping off corner top rope.png',
}
# Tight source-space boundaries omit the corner post/ropes without changing body pixels.
CLIMBS=[
 [(45,140),(265,140),(265,520),(45,520)],
 [(825,135),(970,135),(982,215),(1028,232),(1026,246),(997,258),(950,258),(948,285),(976,294),(985,365),(1000,389),(1022,398),(1020,413),(971,417),(955,396),(945,347),(916,353),(912,434),(902,486),(919,500),(918,515),(837,517),(830,499),(848,475),(851,420),(849,351),(828,330)],
 [(1215,125),(1368,125),(1370,215),(1425,240),(1428,248),(1415,260),(1370,263),(1361,278),(1366,343),(1367,366),(1382,376),(1400,378),(1400,388),(1391,395),(1337,395),(1334,372),(1330,332),(1305,338),(1285,366),(1281,392),(1270,448),(1265,473),(1265,485),(1283,491),(1284,503),(1255,507),(1224,501),(1225,482),(1234,456),(1237,421),(1242,393),(1228,356),(1214,333),(1210,300)],
 [(673,574),(842,574),(843,645),(824,679),(816,718),(826,774),(821,798),(807,801),(800,783),(800,744),(782,768),(770,785),(790,797),(789,811),(720,812),(713,799),(720,783),(707,759),(686,744),(672,711)],
]

def save_png(image,path):
 # Complete and decode-check the PNG before replacing a playable asset.
 buffer=io.BytesIO();image.save(buffer,format='PNG',optimize=True)
 data=buffer.getvalue();Image.open(io.BytesIO(data)).verify()
 tmp=path.with_suffix('.tmp');tmp.write_bytes(data);tmp.replace(path)
 with Image.open(path) as decoded:decoded.load()

def components(im,rect=None,poly=None):
 a=np.array(im);v=a.astype('int16');region=Image.new('1',im.size,1 if rect is None and poly is None else 0)
 if rect:ImageDraw.Draw(region).rectangle(rect,fill=1)
 if poly:ImageDraw.Draw(region).polygon(poly,fill=1)
 region=np.array(region,bool)
 fg=((v.min(2)<145)|((v.max(2)-v.min(2)>50)&(v.min(2)<200)))&region
 fg=ndi.binary_closing(fg,iterations=1)&region
 labels,_=ndi.label(fg);items=[]
 for k,sl in enumerate(ndi.find_objects(labels),1):
  if not sl:continue
  ys,xs=sl;base=labels[sl]==k;h,w=base.shape;area=int(base.sum())
  if h<65 or w<60 or area<3000:continue
  if not rect and not poly and ys.start+h/2<im.height*.26:continue
  # Preserve enclosed white print, but not large white gaps between limbs.
  holes=ndi.binary_fill_holes(base)&~base;hl,_=ndi.label(holes);sizes=np.bincount(hl.ravel());small=sizes<1000;small[0]=False
  alpha=base|(holes&small[hl]);pic=Image.fromarray(np.dstack((a[sl],alpha.astype('uint8')*255)))
  items.append(dict(image=pic,x=xs.start,y=ys.start,w=w,h=h,area=area))
 return items

def main(source):
 with zipfile.ZipFile(source) as z:
  files={Path(n).name:z.read(n) for n in z.namelist() if n.lower().endswith('.png') and '__MACOSX' not in n}
 assert set(files)==set(FILES.values()),'Review added or missing source sheets before importing.'
 parts={};audit=[]
 for anim,name in FILES.items():
  im=Image.open(io.BytesIO(files[name])).convert('RGB')
  if anim=='climb':found=[max(components(im,poly=p),key=lambda v:v['area']) for p in CLIMBS]
  elif anim=='dive':found=[max(components(im,rect=(430,345,945,627)),key=lambda v:v['area'])]
  elif anim=='throw':
   # Later panels overlap at the feet; use the two intact authored poses.
   found=[max(components(im,rect=r),key=lambda v:v['area']) for r in [(0,190,365,830),(325,210,725,830)]]
  else:
   found=components(im)
   if anim in ('walk','run','carryChair','carryBat','kick'):
    found=sorted([v for v in found if v['y']>im.height*.5],key=lambda v:v['x'])
   elif anim in ('fallBack','fallFront','rise','lifted','down'):
    top=sorted([v for v in found if v['y']+v['h']/2<im.height*.56],key=lambda v:v['x'])
    bottom=sorted([v for v in found if v['y']+v['h']/2>=im.height*.56],key=lambda v:v['x'])
    found=top+bottom
   else:found.sort(key=lambda v:v['x'])
  assert found,anim
  parts[anim]=found
  audit.append(dict(animation=anim,source=name,sha256=hashlib.sha256(files[name]).hexdigest(),bounds=[{k:int(v[k]) for k in ('x','y','w','h')} for v in found]))
 # Normalize source-left carried props to the runtime's right-facing convention.
 for anim in ('carryGuitar','carryTrashcan'):
  for v in parts[anim]:v['image']=ImageOps.mirror(v['image'])
 portrait=parts['standing'][0]['image'].copy();portrait.thumbnail((220,320),Image.Resampling.LANCZOS);save_png(portrait,OUT/'alice-crowley-portrait.png')
 parts['idle']=[parts['standing'][-1]];del parts['standing']
 parts['down']=[parts['down'][1],parts['down'][2]]
 parts['defeat']=parts['defeat'][-1:]
 # Sheet-normalized body references: raised hands, weapons and tucked legs do
 # not determine standing height. Each sheet is measured against its own body.
 reference={'idle':809,'walk':410,'run':410,'chair':561,'bat':565,
  'carryChair':396,'carryBat':395,'carryGuitar':592,'carryTrashcan':641,
  'lift':655,'throw':615,'lifted':536,'hurt':766,'fallBack':575,'fallFront':510,
  'down':735,'rise':511,'taunt':651,'victory':629,'defeat':960,'ko':1710,
  'jump':780,'kick':404,'pin':655,'climb':365,'dive':505}
 frames=[];A={};preview=[]
 for anim,items in parts.items():
  A[anim]=[]
  for i,v in enumerate(items):
   scale=220/reference[anim]
   # The lying end pose has a longer source body than the earlier fall poses.
   if anim=='fallBack' and i==4:scale=220/735
   pic=v['image'];pic=pic.resize((max(1,round(pic.width*scale)),max(1,round(pic.height*scale))),Image.Resampling.LANCZOS)
   e=dict(frame=len(frames),w=pic.width,h=pic.height,**frame_anchor(pic,anim));frames.append(pic);A[anim].append(e);preview.append((anim,i,pic))
 # Explicit contact order for the engine's ready / raised / contact / recovery.
 A['chair']=[A['chair'][i] for i in (0,2,3,4,0)]
 A['bat']=[A['bat'][i] for i in (0,1,3,4,0)]
 A['light']=[deepcopy(A['throw'][i]) for i in (0,1,0)]+[deepcopy(A['idle'][0])]
 # Grip points measured on the new extended and ready hand poses.
 for e,point in zip(A['light'],[(322,376),(678,407),(322,376),(1318,634)]):
  source_anim='idle' if e['frame']==A['idle'][0]['frame'] else 'throw'
  v=parts[source_anim][0 if e['frame']==A['throw'][0]['frame'] or source_anim=='idle' else 1]
  scale=220/reference[source_anim]
  e['weaponGrip']=[round((point[0]-v['x'])*scale-e['anchorX'],2),round(e['h']-(point[1]-v['y'])*scale,2)]
 A['idle'][0]['weaponGrip']=deepcopy(A['light'][-1]['weaponGrip'])
 A['guitar']=deepcopy(A['light']);A['trashcan']=deepcopy(A['light'])
 A['heavy']=deepcopy(A['chair']);A['grapple']=deepcopy(A['throw'][:1])
 A['exhausted']=deepcopy(A['hurt'][1:2]);A['kneel']=deepcopy(A['defeat']);A['entry']=deepcopy(A['idle'])
 A['thrown']=deepcopy(A['fallBack'][2:3]);A['lifted']=deepcopy(A['lifted'][2:3])
 # Front falls / pins / recovery settle on the same body-sized endpoint.
 A['fallFront'][-1]=deepcopy(A['down'][0]);A['fallBack'][-1]=deepcopy(A['down'][-1]);A['rise'][0]=deepcopy(A['down'][0])
 A['riseBack']=[deepcopy(A['down'][-1])]+deepcopy(A['rise'][1:])
 # KO artwork uses the exact supplied face-up pose; front KO remains face-down.
 A['ko']=[deepcopy(A['down'][0]),A['ko'][0]]
 # Stable torso anchors avoid horizontal wobble from alternating foot plants.
 def torso(e):
  alpha=np.array(frames[e['frame']].getchannel('A'));xs=np.where(alpha[int(e['h']*.43):int(e['h']*.55)]>180)[1]
  return float(np.median(xs)) if len(xs) else e['w']/2
 offset=torso(A['idle'][0])-A['idle'][0]['anchorX']
 for anim in ('walk','run','carryChair','carryBat','carryGuitar','carryTrashcan'):
  for e in A[anim]:e['anchorX']=round(max(0,min(e['w'],torso(e)-offset)),2)
 width=2048;x=y=rowh=0;positions=[]
 for pic in frames:
  if x+pic.width+4>width:y+=rowh+4;x=0;rowh=0
  positions.append((x,y));x+=pic.width+4;rowh=max(rowh,pic.height)
 atlas=Image.new('RGBA',(width,y+rowh+4))
 for pic,pos in zip(frames,positions):atlas.alpha_composite(pic,pos)
 for entries in A.values():
  for e in entries:e['x'],e['y']=positions[e['frame']]
 save_png(atlas,OUT/'alice-crowley.png')
 roster=json.loads((OUT/'roster.json').read_text());alice=next(f for f in roster if f['id']=='alice-crowley')
 alice['animations']=A;alice['atlasSize']=list(atlas.size);alice['overlayWeapons']=['guitar','trashcan'];alice['artVersion']='2026-09-19'
 (OUT/'roster.json').write_text(json.dumps(roster,separators=(',',':')))
 archive=ROOT/'source-packs/Alice-Crowley.zip';archive.parent.mkdir(exist_ok=True)
 if source.resolve()!=archive.resolve():shutil.copyfile(source,archive)
 report=dict(fighter='alice-crowley',version='0.20.1',sourceZipSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),sourceSheets=len(files),atlasSize=list(atlas.size),uniqueFrames=len(frames),animations={k:len(v) for k,v in A.items()},sheets=audit,adaptations=['Guitar/trash-can attacks use new unarmed poses plus measured code-drawn props; carries use the new authored weapon art.','Unarmed light is a short shove from the new throw sheet; heavy uses the new kick sheet.','Corner silhouettes exclude posts and ropes; dive uses the clean airborne body.','Back recovery begins at the supplied face-up rest and continues with the new recovery poses.'])
 (ROOT/'tools/alice-replacement-audit.json').write_text(json.dumps(report,indent=2))
 review=ROOT/'review';review.mkdir(exist_ok=True)
 for page in range((len(preview)+39)//40):
  subset=preview[page*40:page*40+40];sheet=Image.new('RGB',(1600,260*((len(subset)+7)//8)),'#302736');d=ImageDraw.Draw(sheet)
  for i,(anim,j,pic) in enumerate(subset):
   x=i%8*200;y=i//8*260;pic=ImageOps.contain(pic,(195,225));sheet.paste(pic,(x+(200-pic.width)//2,y+252-pic.height),pic);d.text((x+5,y+5),f'{anim} {j}',fill='white')
  sheet.save(review/f'alice-extracted-{page}.png')
 print(json.dumps({k:report[k] for k in ('sourceSheets','atlasSize','uniqueFrames','animations')},indent=2))

if __name__=='__main__':main(Path(sys.argv[1]))
