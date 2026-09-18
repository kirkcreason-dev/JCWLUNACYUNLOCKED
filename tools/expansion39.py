"""Build the three supplied fighter packs, retaining the first 36 roster entries.
Run: python tools/expansion39.py /path/to/extracted-packs
Sheet artwork is mechanically extracted into game atlases; source files stay untouched.
The audit records every supplied sheet and each fallback for absent clean poses.
"""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageOps,ImageDraw
from scipy import ndimage as ndi
from sprite_anchor import frame_anchor
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'dist/assets'
CONFIG={
 'josh-bishop':dict(name='Josh Bishop',color='#f25142',style='Big Money',files={
 'idle':'Josh Bishop standing','light':'JB elbow attack','kick':'JB kicking','run':'JB running','jump':'JB jumping.png','chair':'JB attack with chair','bat':'JB attack with bat','guitar':'JB attack with guitar','trashcan':'JB attack with trashcan','carryChair':'JB walking with chair','carryBat':'JB walk with bat','carryGuitar':'JB walking with guitar','carryTrashcan':'JB walking with trashcan','lift':'JB lifting overhead','throw':'JB throwing wrestler','grapple':'JB grappling','hurt':'JB dazed','down':'JB laying facedown','fallFront':'JB falling foward','fallBack':'JB falling backwards','rise':'JB getting up from facedown','kneel':'JB kneeling','pin':'JB pinning','victory':'JB victory','climb':'JB climbing on top rope','entry':'JB climbing through ropes','dive':'JB jumping off corner'}),
 'ring-rat':dict(name='Ring Rat',color='#ff7a31',style='Brawler',files={
 'idle':'Ring Rat standing','walk':'RR walking.png','kick':'RR kicking','run':'RR running','jump':'RR jumping.png','chair':'RR attack with chair','bat':'RR attack with bat','guitar':'RR attack with guitar','trashcan':'RR attack with trashcan','carryChair':'RR walk with chair','carryBat':'RR walk with bat','carryGuitar':'RR walk with guitar','carryTrashcan':'RR walk with trashcan','lift':'RR lifting overhead','lifted':'RR getting lifted up','throw':'RR throwing','thrown':'RR being thrown','hurt':'RR dazed','down':'RR laying facedown','fallFront':'RR falling farward','fallBack':'RR falling backwards','rise':'RR getting back up','pin':'RR pinning','victory':'RR victory','defeat':'RR defeated','ko':'RR passed out','taunt':'RR taunting','climb':'RR climbing on corner rope','entry':'RR climbing through rope','ropePose':'RR climbing on rope'}),
 'green-phantom':dict(name='The Green Phantom',color='#22dd55',style='Masked brawler',files={
 'idle':'The Green Phantom standing','light':'TGP elbow attack','kick':'TGP kick.png','run':'TGP running','jump':'TGP jumping.png','chair':'TGP attack with chair','bat':'TGP attack with bat','guitar':'TGP attack with guitar','trashcan':'TGP attack with trashcan','carryChair':'TGP walking with chair','carryBat':'TGP walking with bat','carryGuitar':'TGP walking with guitar','carryTrashcan':'TGP walking with trashcan','lift':'TGP lifting overhead','throw':'TGP throwing','grapple':'TGP grappling','hurt':'TGP dazed','down':'TGP laying facedown','fallFront':'TGP falling forwards','fallBack':'TGP falling backwards','rise':'TGP getting back up','kneel':'TGP Kneeling','pin':'TGP pinning','victory':'TGP victory','defeat':'TGP defeated pose','climb':'TGP climb on top rope corner','entry':'TGP climbing through ropes','dive':'TGP jumping off top rope'})
}
# Bodies above the ring/post, using normalized source coordinates.
CLIMBS={
 'josh-bishop':[
 [(870,309),(995,305),(1002,396),(995,410),(976,411),(970,402),(969,417),(974,423),(955,429),(934,429),(929,408),(930,383),(911,383),(918,421),(909,452),(908,476),(928,481),(925,489),(880,490),(879,476),(889,443),(884,421),(872,405)],
 [(1040,213),(1177,213),(1177,341),(1155,338),(1155,352),(1151,390),(1155,405),(1167,413),(1165,422),(1120,423),(1117,405),(1119,368),(1107,371),(1084,405),(1079,419),(1080,429),(1047,430),(1045,416),(1057,380),(1067,338),(1040,338)]],
 'ring-rat':[
 [(854,162),(999,160),(1024,272),(1026,302),(1009,302),(997,282),(994,321),(985,355),(980,380),(990,389),(989,400),(950,402),(948,388),(958,350),(950,340),(929,367),(916,401),(908,425),(912,438),(879,441),(870,432),(879,403),(888,371),(891,344),(893,312),(883,289),(874,298),(860,307),(853,297)],
 [(1037,121),(1156,116),(1189,240),(1189,287),(1176,290),(1160,261),(1160,307),(1159,350),(1160,378),(1174,400),(1173,411),(1138,413),(1132,399),(1134,365),(1124,328),(1117,311),(1102,351),(1090,390),(1081,413),(1085,427),(1059,433),(1046,426),(1049,407),(1057,365),(1067,330),(1062,300),(1066,271),(1046,298),(1036,284)]],
 'green-phantom':[
 [(879,263),(979,260),(998,385),(997,426),(982,433),(972,415),(972,441),(984,459),(980,467),(950,469),(943,449),(931,417),(923,450),(920,472),(925,479),(916,486),(901,486),(899,469),(883,466),(878,453)],
 [(1048,238),(1146,235),(1162,350),(1165,394),(1156,403),(1147,392),(1142,453),(1145,480),(1154,494),(1152,505),(1128,507),(1121,494),(1116,450),(1108,450),(1092,492),(1090,504),(1095,512),(1088,520),(1069,520),(1068,507),(1077,475),(1079,463),(1049,467),(1044,453)]]
}

def get_items(im,rect=(3,90,1197,651),poly=None):
 a=np.array(im);v=a.astype('int16');w,h=im.size
 region=Image.new('1',im.size);d=ImageDraw.Draw(region)
 if poly:d.polygon([(x*w/1200,y*h/675) for x,y in poly],fill=1)
 else:d.rectangle((rect[0]*w/1200,rect[1]*h/675,rect[2]*w/1200,rect[3]*h/675),fill=1)
 region=np.array(region,bool)
 # Discard pale neutral paper texture and long brown grid lines.
 brown=(v[:,:,0]>140)&(v[:,:,0]<220)&(v[:,:,0]>v[:,:,1]+20)&(v[:,:,1]>v[:,:,2]+10)&(v.max(2)-v.min(2)<130)
 grid=ndi.binary_opening(brown,structure=np.ones((1,55)))|ndi.binary_opening(brown,structure=np.ones((55,1)))
 grid=ndi.binary_dilation(grid,iterations=1)
 a=a.copy();a[grid|((v.min(2)>140)&(v.max(2)-v.min(2)<18))]=255;v=a.astype('int16')
 fg=((v.min(2)<130)|((v.max(2)-v.min(2)>50)&(v.min(2)<200)))&region
 # Thin printed grid lines must not join neighboring bodies into one component.
 fg=ndi.binary_opening(fg,structure=np.ones((3,3)))
 fg=ndi.binary_closing(fg,iterations=2)&region
 labels,n=ndi.label(fg);items=[]
 for k,sl in enumerate(ndi.find_objects(labels),1):
  if not sl:continue
  ys,xs=sl;base=labels[sl]==k;bh,bw=base.shape
  if base.sum()<2500 or bh<20 or bw<35:continue
  rgb=v[sl]
  if ((rgb.max(2)-rgb.min(2)>50)&base).sum()<base.sum()*.04:continue
  holes=ndi.binary_fill_holes(base)&~base
  alpha=base|(holes&(np.arange(bh)[:,None]<bh*.65))
  items.append(dict(image=Image.fromarray(np.dstack((a[sl],alpha.astype('uint8')*255))),x=xs.start,y=ys.start,w=bw,h=bh,area=int(alpha.sum())))
 return items

def extract(im,anim,id):
 def items(rect=(3,90,1197,651),poly=None):return get_items(im,rect,poly)
 def largest(rect=None,poly=None):return max(items(rect or (3,90,1197,651),poly),key=lambda v:v['area'])
 if anim=='climb':return [largest(poly=p) for p in CLIMBS[id]]
 if anim in ('entry','ropePose'):
  # Source is audited; clean own standing/corner poses are used below to avoid scenery.
  return [largest((975,180,1195,625))]
 if anim=='dive':
  if id=='josh-bishop':return [largest((306,197,576,405)),largest((587,301,977,449))]
  if id=='ring-rat':return [largest(poly=[(478,170),(718,170),(729,234),(777,224),(779,205),(817,202),(819,242),(771,263),(739,281),(717,297),(674,324),(656,335),(642,340),(627,356),(596,356),(561,351),(535,359),(516,384),(490,390),(481,377),(458,378),(444,364),(450,336),(462,321),(488,311),(511,294),(527,270),(548,261),(527,253),(506,246),(477,242)]),largest((637,336,941,500))]
  return [largest((313,246,523,464)),largest((525,335,848,463))]
 if id=='josh-bishop' and anim=='bat':return [largest(r) for r in [(10,267,244,533),(246,194,466,533),(467,265,770,533),(713,265,1020,533),(982,264,1190,536)]]
 if id=='josh-bishop' and anim=='trashcan':return [largest(r) for r in [(10,286,222,567),(226,253,463,567),(461,152,673,566),(676,300,946,566),(899,300,1190,566)]]
 if id=='josh-bishop' and anim=='throw':return [largest(r) for r in [(4,299,262,547),(250,282,506,547),(493,244,693,547),(696,310,997,547),(973,284,1193,552)]]
 if id=='ring-rat' and anim=='chair':return [largest(r) for r in [(9,76,236,615),(243,119,456,616),(456,243,741,613),(691,245,980,614),(964,209,1194,615)]]
 if id=='ring-rat' and anim=='bat':
  contact=[(470,193),(640,190),(656,293),(680,317),(689,327),(739,332),(742,347),(772,365),(685,363),(654,344),(631,348),(631,389),(679,462),(691,504),(700,565),(714,589),(714,608),(665,610),(651,586),(639,544),(613,499),(574,464),(546,492),(527,531),(516,580),(517,608),(474,608),(471,588),(481,533),(478,490),(500,453),(507,410),(514,373),(502,347),(475,346)]
  return [largest((2,185,231,612)),largest((234,120,471,612)),largest(poly=contact),largest((983,184,1198,612))]
 if id=='ring-rat' and anim=='guitar':
  contact=[(466,254),(646,249),(645,332),(676,364),(693,389),(724,393),(748,388),(780,400),(804,427),(800,451),(779,478),(755,489),(724,476),(704,456),(691,432),(672,417),(635,403),(633,437),(650,474),(663,528),(678,577),(696,593),(694,612),(642,612),(630,577),(617,547),(584,497),(552,476),(526,512),(509,550),(500,582),(508,599),(505,613),(465,613),(464,590),(477,541),(483,490),(504,438),(512,400),(499,381),(488,346),(492,310)]
  return [largest((12,204,249,615)),largest((236,120,470,615)),largest(poly=contact),largest((951,208,1191,615))]
 if id=='green-phantom' and anim=='chair':
  contact=[(475,302),(643,299),(661,389),(685,398),(721,371),(749,365),(773,384),(770,414),(744,451),(717,491),(708,514),(694,525),(680,504),(657,482),(652,532),(660,578),(677,592),(678,610),(621,610),(617,584),(613,541),(604,510),(577,490),(554,519),(534,551),(516,581),(519,597),(516,613),(480,613),(480,592),(493,559),(517,521),(514,515),(497,527),(480,540),(474,527),(486,503),(501,469),(518,421),(530,369)]
  return [largest((28,173,234,615)),largest((248,151,456,615)),largest(poly=contact),largest((956,270,1174,615))]
 if id=='green-phantom' and anim=='bat':
  contact=[(470,275),(649,271),(663,365),(692,388),(702,396),(796,400),(795,427),(701,415),(679,420),(664,414),(662,438),(683,473),(696,525),(698,571),(716,591),(718,610),(665,610),(659,589),(653,553),(629,525),(607,508),(574,509),(548,533),(532,567),(521,590),(520,608),(484,608),(481,589),(493,559),(510,527),(497,522),(473,502),(467,473),(480,438),(504,421),(522,384),(528,339)]
  return [largest((10,245,241,611)),largest((244,176,471,611)),largest(poly=contact),largest((981,267,1189,611))]
 if id=='green-phantom' and anim=='carryChair':return [largest((x,123,x+235,336)) for x in (10,245,481,717,954)]
 found=items();found=[v for v in found if v['h']>im.height*.065 and (v['w']<im.width*.62 or anim=='ko')]
 if anim in ('walk','run','kick','carryChair','carryBat','carryGuitar','down','grapple'):
  split=im.height*.61
  top=sorted([v for v in found if v['y']+v['h']/2<split],key=lambda v:v['x'])
  bottom=sorted([v for v in found if v['y']+v['h']/2>=split],key=lambda v:v['x'])
  if anim=='down' and id!='josh-bishop':found=top[-1:]+bottom[-1:]
  elif anim=='grapple':found=top or bottom
  elif len(top)>=3 and len(bottom)>=3:found=bottom
  else:found=sorted(found,key=lambda v:v['x'])
 else:found.sort(key=lambda v:v['x'])
 if anim=='ko':found=[max(found,key=lambda v:v['area'])]
 if anim=='defeat':found=found[-1:]
 return found

def main(src):
 roster=json.loads((OUT/'roster.json').read_text());roster=[f for f in roster if f['id'] not in CONFIG]
 approvals={e['id']:e for e in json.loads((ROOT/'roster-approvals.json').read_text())['entries']};audit=[]
 for id,cfg in CONFIG.items():
  files=sorted((src/cfg['name']).glob('*.png'));parts={};used=set()
  mapping=dict(cfg['files'])
  if id=='ring-rat':mapping['dive']='RR jumping off top rope'
  for anim,pattern in mapping.items():
   candidates=[p for p in files if pattern.lower() in p.name.lower()];assert len(candidates)==1,(id,anim,candidates)
   p=candidates[0];original=Image.open(p).convert('RGB');im=ImageOps.contain(original,(1600,1067));found=extract(im,anim,id)
   assert found,(id,anim,'empty');parts[anim]=found;used.add(p)
   audit.append(dict(fighter=id,animation=anim,source=str(p.relative_to(src)),sourceSHA256=hashlib.sha256(p.read_bytes()).hexdigest(),count=len(found),notes=('All supplied Josh sheets print Caleb Konley; filename identity retained, labels excluded.' if id=='josh-bishop' else ''),bounds=[{k:v[k] for k in ('x','y','w','h')} for v in found]))
  assert used==set(files),(id,'unmapped',set(files)-used)
  # Normalize clean authored poses. Sources without unarmed walk use a slow jog.
  portrait=parts['idle'][0]['image'].copy();portrait.thumbnail((220,320));portrait.save(OUT/f'{id}-portrait.png')
  parts['idle']=parts['idle'][-1:]
  # All runtime locomotion uses right-facing artwork; renderer mirrors for left.
  flips={'josh-bishop':['carryTrashcan'],'ring-rat':['carryBat','carryGuitar'],'green-phantom':['carryGuitar']}
  for anim in flips[id]:
   for v in parts[anim]:v['image']=ImageOps.mirror(v['image'])
  if id=='green-phantom':
   # Its kick sheet reverses sides only for the raised-knee pose.
   parts['kick'][1]['image']=ImageOps.mirror(parts['kick'][1]['image'])
  if 'walk' not in parts:parts['walk']=parts['run']
  parts['entry']=parts['idle'];parts['ropePose']=parts['climb'][:1]
  if id!='josh-bishop':parts['bat'][-1]=parts['bat'][0] # The recovery panel is crossed by its neighbor's bat.
  if id=='josh-bishop':parts['down']=[parts['rise'][0],parts['fallBack'][-1]]
  parts.setdefault('taunt',parts['victory']);parts.setdefault('defeat',parts['kneel'][-1:] if 'kneel' in parts else parts['pin'][-1:]);parts.setdefault('kneel',parts['defeat']);parts.setdefault('grapple',parts['throw'][:1])
  parts.setdefault('lifted',parts['jump'][1:3]);parts.setdefault('thrown',parts['fallBack'][1:3])
  parts['ko']=parts['down'][-1:]
  parts['fallFront'][-1]=parts['down'][0];parts['fallBack'][-1]=parts['down'][-1]
  frames=[];A={};preview=[]
  for anim,items in parts.items():
   ref=max(v['h'] for v in items)
   if anim=='chair':ref=items[-1]['h']
   elif anim in ('guitar','trashcan','bat'):ref=items[0]['h']
   elif anim in ('down','ko'):ref=max(v['w'] for v in items)*1.07
   elif anim in ('defeat','kneel'):ref=max(v['h'] for v in items)/(.58 if anim=='defeat' else 1)
   elif anim=='jump':ref/=.76
   elif anim=='dive':ref=max(v['w'] for v in items)*.90
   elif anim in ('lifted','thrown'):ref/=.84
   elif anim in ('walk','run'):ref/=.83
   elif anim=='climb':ref=items[-1]['h']
   entries=[]
   for i,v in enumerate(items):
    pic=v['image'];scale=min(220/ref,380/pic.width,330/pic.height);pic=pic.resize((max(1,round(pic.width*scale)),max(1,round(pic.height*scale))),Image.Resampling.LANCZOS)
    entry=dict(frame=len(frames),w=pic.width,h=pic.height,**frame_anchor(pic,anim));entries.append(entry);frames.append(pic);preview.append((anim,i,pic))
   A[anim]=entries
  if id=='ring-rat':A['light']=[A['throw'][0],A['throw'][3],A['throw'][-1],A['idle'][0]]
  # The contact image is frame 3 on the authored elbow sheet.
  elif len(A['light'])>=4:A['light']=[A['light'][0],A['light'][2],A['light'][3],A['idle'][0]]
  A['heavy']=A['chair'];A['exhausted']=A['hurt']
  if id!='ring-rat':A['lifted']=[dict(A['dive'][-1])] # A clean horizontal body for being carried overhead.
  A['fallFront'][-1]=dict(A['down'][0]);A['fallBack'][-1]=dict(A['down'][-1]);A['rise'][0]=dict(A['down'][0]);A['ko']=[dict(A['down'][-1])]
  # Anchor gait to the torso rather than the alternating planted foot.
  def center(e):
   pic=frames[e['frame']];alpha=np.array(pic.getchannel('A'));xs=np.where(alpha[int(pic.height*.43):int(pic.height*.55)]>180)[1]
   return float(np.median(xs)) if len(xs) else pic.width/2
  offset=center(A['idle'][0])-A['idle'][0]['anchorX']
  for anim in ('walk','run','carryChair','carryBat','carryGuitar','carryTrashcan'):
   for e in A[anim]:e['anchorX']=round(max(0,min(e['w'],center(e)-offset)),2)
  width=2048;x=y=rowh=0;positions=[]
  for pic in frames:
   if x+pic.width+4>width:y+=rowh+4;x=0;rowh=0
   positions.append((x,y));x+=pic.width+4;rowh=max(rowh,pic.height)
  atlas=Image.new('RGBA',(width,y+rowh+4))
  for pic,pos in zip(frames,positions):atlas.alpha_composite(pic,pos)
  for entries in A.values():
   for e in entries:e['x'],e['y']=positions[e['frame']]
  atlas.save(OUT/f'{id}.png')
  approved=approvals[id];ratings=dict(websiteName=approved['name'],**approved['ratings'],finisher=approved['finisher'],source='User-supplied approval table')
  record=dict(id=id,name=cfg['name'],style=cfg['style'],color=cfg['color'],**{k:round(.70+.05*v,2) for k,v in approved['ratings'].items()},finisher=(approved['finisher'] or 'Lunacy Finisher').upper(),websiteStats=ratings,edition='2026-09',animations=A,weapons=['chair','bat','guitar','trashcan'],atlas=f'./assets/{id}.png',atlasSize=list(atlas.size))
  roster.append(record)
  sheet=Image.new('RGB',(1600,((len(preview)+7)//8)*250),'#393344');d=ImageDraw.Draw(sheet)
  for i,(anim,j,pic) in enumerate(preview):
   x=i%8*200;y=i//8*250;pic=ImageOps.contain(pic,(194,218));sheet.paste(pic,(x+(200-pic.width)//2,y+246-pic.height),pic);d.text((x+5,y+4),f'{anim} {j}',fill='white')
  (ROOT/'review').mkdir(exist_ok=True);sheet.save(ROOT/'review'/f'{id}-extracted.jpg',quality=90)
  print(id,atlas.size,{k:len(v) for k,v in A.items()},flush=True)
 (OUT/'roster.json').write_text(json.dumps(roster,separators=(',',':')))
 (ROOT/'tools/expansion39-audit.json').write_text(json.dumps(audit,indent=2))
if __name__=='__main__':main(Path(sys.argv[1]))
