"""Build transparent atlases from the provided labeled artwork; not an equal-grid slicer.
Usage: python tools/prepare_assets.py PATH_TO_EXTRACTED_ASSET_FOLDERS
Requires Pillow, numpy, scipy. Runtime has no Python dependency.
"""
from pathlib import Path
import sys,json,shutil
import numpy as np
from PIL import Image,ImageOps,ImageDraw
from scipy import ndimage as ndi
from sprite_anchor import frame_anchor
from attack_poses import apply_attack_poses
ROOT=Path(__file__).resolve().parents[1]; SRC=Path(sys.argv[1]); OUT=ROOT/'dist/assets';OUT.mkdir(parents=True,exist_ok=True)
roster=[('violent-j','Violent J','Violent J Sprite Set','Powerhouse','#97ff20',1.14,.88,1.08),('2-tuff-tony','2 Tuff Tony','2 Tuff Tony Sprite Set','Brawler','#ffd52b',1.08,.97,1.04),('willie-mack','Willie Mack','Willie Mack','Heavy hitter','#bf73ff',1.10,.97,1.00),('mickie-knuckles','Mickie Knuckles','Mickie Knuckles Sprite Set','Hardcore','#fc598d',1.04,1.08,.96),('kerry-morton','Kerry Morton','Kerry Morton','Technician','#79caff',.96,1.13,1.00),('mr-happy','Mr. Happy','Mr Happy','Wildcard','#fff273',1.00,1.05,1.00),('moshpit-mike','Moshpit Mike','Moshpit Mike','Bruiser','#ff6d2d',1.10,.91,1.08),('cokane','Cokane','Cokane Sprite Set','Street fighter','#ece8df',1.02,1.06,.98),('yabo','Yabo','Yahoo','Showman','#f65bf5',.98,1.12,.98)]
# Explicit source selection keeps wrong-name sheets and baked-in opponents out of matches.
patterns={'idle':['standing.','Moshpit Mike.jpg'], 'walk':['walking.jpg','walking left'], 'run':['running'], 'heavy':['attack with chair','attacking with chair'], 'lift':['lifting overhead','lifting wrestler overhead','lifiting wrestler overhead','lifting up','lifting and throwing'], 'throw':['throwing.jpg','throwing wrestler','lifting and throwing'], 'hurt':['dazed'], 'down':['facedown and face','face down and face','laying facedown','getting up from facedown'], 'rise':['getting back up','getting up from face','standing up from face'], 'victory':['victory','taunting.jpg','taunting .jpg'], 'jump':['jumping.jpg','jumping.jpeg','jumping .jpg'], 'pin':['pinning']}
manifest=[];reports=[]

def extract(path):
 im=Image.open(path).convert('RGB'); im=ImageOps.contain(im,(1600,960));a=np.array(im);h,w=a.shape[:2]
 dark=(a.max(2)<100).mean(1);rows=np.where((dark>.58)&(np.arange(h)<h*.30))[0]
 start=int(rows[-1]+5) if len(rows) else int(h*.17)
 rgb=a.astype('int16'); spread=rgb.max(2)-rgb.min(2)
 foreground=((rgb.min(2)<80)|(spread>85)) if 'jump' in path.name.lower() else ((rgb.min(2)<130)|(spread>55))
 foreground[:start]=False;foreground[-10:]=False;foreground[:,:12]=False;foreground[:,-12:]=False
 # Close tiny JPEG outline breaks, identify each complete figure, then recover white clothing inside its outline.
 foreground=ndi.binary_closing(foreground,iterations=1)
 labels,n=ndi.label(foreground);objects=ndi.find_objects(labels);items=[]
 for k,s in enumerate(objects,1):
  if not s:continue
  ys,xs=s; bh=ys.stop-ys.start;bw=xs.stop-xs.start
  area=int((labels[s]==k).sum())
  if bh<72 or bw<28 or area<1500 or area/(bw*bh)<.12 or bw>w*.60:continue
  mask=labels[s]==k; mask=ndi.binary_fill_holes(mask)
  # Drop noise underfoot, retaining the sprite silhouette and no caption characters.
  rgba=np.concatenate([a[s],(mask*255).astype('uint8')[...,None]],axis=2)
  sprite=Image.fromarray(rgba);items.append({'image':sprite,'x':xs.start,'y':ys.start,'w':bw,'h':bh})
 # Exclude disconnected interior logos and shirt details already inside a figure.
 items=[v for v in items if not any(o is not v and o['x']<=v['x'] and o['y']<=v['y'] and o['x']+o['w']>=v['x']+v['w'] and o['y']+o['h']>=v['y']+v['h'] for o in items)]
 # Sheets read left-to-right within each row. Split by large vertical center gaps.
 items.sort(key=lambda x:x['y']+x['h']/2)
 rows=[]
 for item in items:
  cy=item['y']+item['h']/2
  if not rows or cy-np.mean([v['y']+v['h']/2 for v in rows[-1]])>h*.22:rows.append([item])
  else:rows[-1].append(item)
 items=[v for row in rows for v in sorted(row,key=lambda x:x['x'])]
 return items

for id,name,folder,style,color,power,speed,toughness in roster:
 paths=sorted((SRC/folder).iterdir());record={'id':id,'name':name,'style':style,'color':color,'power':power,'speed':speed,'toughness':toughness,'animations':{}};frames=[]
 for anim,pats in patterns.items():
  chosen=next((p for pat in pats for p in paths if pat.lower() in p.name.lower()),None)
  if not chosen:continue
  items=extract(chosen)
  if anim=='idle':
   if len(items)!=4:print('CHECK IDLE',name,len(items))
   portrait=items[0]['image'];portrait.thumbnail((220,320));portrait.save(OUT/f'{id}-portrait.png')
   items=items[-1:] # authored right-facing side stance
  elif anim=='walk':items=items[:max(1,len(items)//2)] if len(items)>=8 else items
  elif anim=='run':items=items[:max(1,len(items)//2)] if len(items)>=8 else items
  elif anim=='throw' and len(items)==8:items=items[:4]
  elif anim=='down':items=items[:1] if 'getting up' in chosen.name.lower() else items[-2:]
  if anim=='victory' and 'taunting' in chosen.name.lower():items=items[:1]
  # Larger sheets may carry 4/5/6 frames; scale every pose against the tallest upright pose in that sheet.
  reference=max((v['h'] for v in items),default=1)
  if anim=='down':reference=max((v['w'] for v in items),default=1)*1.03
  if anim in ['heavy','lift','throw','victory']:reference*=.84 # account for raised hands/weapon
  if anim=='pin':reference=max((v['h'] for v in items),default=1)
  if anim=='jump':reference*=1.4
  entry=[]
  for j,v in enumerate(items):
   scale=220/reference; im=v['image'];
   if (id=='violent-j' and anim=='idle') or (id in ['2-tuff-tony','willie-mack'] and anim in ['walk','run']):im=ImageOps.mirror(im)
   im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
   # Tight atlas bounds retain a bottom-center anchor for every pose.
   entry.append({'frame':len(frames),'w':im.width,'h':im.height,**frame_anchor(im,anim)});frames.append(im)
  record['animations'][anim]=entry
  reports.append({'fighter':id,'animation':anim,'source':str(chosen.relative_to(SRC)),'count':len(items),'bounds':[{k:v[k] for k in ['x','y','w','h']} for v in items]})
 width=1024;x=y=rowh=0;positions=[]
 for im in frames:
  if x+im.width+4>width:y+=rowh+4;x=0;rowh=0
  positions.append((x,y));x+=im.width+4;rowh=max(rowh,im.height)
 atlas=Image.new('RGBA',(width,y+rowh+4))
 for i,im in enumerate(frames):atlas.alpha_composite(im,positions[i])
 for animation in record['animations'].values():
  for entry in animation:entry['x'],entry['y']=positions[entry['frame']]
 if not record['animations'].get('pin'):record['animations']['pin']=[dict(record['animations']['rise'][1],anchorX=record['animations']['rise'][1]['w']/2)]
 if not record['animations'].get('jump'):record['animations']['jump']=[dict(record['animations']['run'][2],anchorX=record['animations']['run'][2]['w']/2)]
 atlas.save(OUT/f'{id}.png',optimize=True);record['atlas']=f'./assets/{id}.png';record['atlasSize']=list(atlas.size);manifest.append(apply_attack_poses(record))
 print(name,[(a,len(v)) for a,v in record['animations'].items()])
(OUT/'roster.json').write_text(json.dumps(manifest,separators=(',',':')))
(ROOT/'tools/asset-audit.json').write_text(json.dumps(reports,indent=2))
# Preserve supplied arena art, optimized for the native viewport.
arenas=['ee9a136e-75f8-48ee-b9f0-65585d46a352.png','d337f354-f296-4dfe-9b53-c5a7acce0209.png','5c4e4be8-6162-42cb-99b7-8cc1211e2e9c.png','e4969049-f2fb-4e3b-b830-f83c511915e8.png']
for i,file in enumerate(arenas):Image.open(SRC/file).convert('RGB').save(OUT/f'arena-{i}.jpg',quality=93,optimize=True)
shutil.copy2(SRC/'JCW_Fight_Club_Genesis_16Bit_v2.ogg',OUT/'fight-club.ogg')
# Review assets only; this is not a browser screenshot.
contact=Image.new('RGB',(1536,len(manifest)*280),'#343039');d=ImageDraw.Draw(contact)
for y,r in enumerate(manifest):
 atlas=Image.open(OUT/f"{r['id']}.png");d.text((6,y*280+6),r['name'],fill='white')
 for x,anim in enumerate(['idle','walk','heavy','lift','down','victory']):
  fs=r['animations'].get(anim,[])
  if not fs:continue
  f=fs[min(1,len(fs)-1)];im=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));im.thumbnail((246,235));contact.paste(im,(x*256+(256-im.width)//2,y*280+255-im.height),im);d.text((x*256+5,y*280+265),anim,fill='white')
contact.save(ROOT/'tools/asset-review.jpg',quality=90)
