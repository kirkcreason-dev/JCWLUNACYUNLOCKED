"""Integrate the September sprite archives. Optional trailing wrestler IDs select a partial rebuild. Requires Pillow, numpy, scipy.
Usage: python tools/prepare_new_assets.py /path/to/extracted/wrestler/folders [caleb-konley]
Keeps unrelated wrestlers. Replaces matching IDs on repeated builds.
Source sheets are illustrated layouts, not fixed sprite grids. Rope silhouettes
use reviewed polygons; all other frames use connected silhouettes. See audit.
"""
from pathlib import Path
import sys,json,os
import numpy as np
from PIL import Image,ImageOps,ImageDraw
from scipy import ndimage as ndi
from sprite_anchor import frame_anchor
from roster_expansion import FIGHTERS, OVERRIDES, CLIMBS, SALLY_ENTRY, clean_mask
from kongo_assets import FIGHTER as KONGO, OVERRIDES as KONGO_NAMES, special_extract as kongo_extract
from bronson_assets import FIGHTER as BRONSON, NAMES as BRONSON_NAMES, extract as bronson_extract, chair_frames
from hokane_assets import FIGHTER as HOKANE, NAMES as HOKANE_NAMES, extract as hokane_extract
ROOT=Path(__file__).resolve().parents[1]; SRC=Path(sys.argv[1]);OUT=ROOT/'dist/assets'
NEW=[('able','Able','Outbreak','#bd774b',1.08,.97,1.06,'OUTBREAK SLAM'),('dani-mo','Dani Mo','Dino-Myte','#f7af44',.98,1.12,1.00,'MOON MIST TWIST'),('facade','Facade','Neon Ninja','#95fb38',.94,1.19,.95,'NEON NINJA DIVE'),('j-rod','J-Rod','Powerhouse','#9878ff',1.12,.98,1.04,'STAR-SPANGLED SLAM'),('matt-cross','Matt Cross','High flyer','#68dfe4',.98,1.19,.94,'SHOOTING STAR PRESS'),('vincenzo','Vincenzo','The enforcer','#eed9b9',1.10,.93,1.07,'THE COLLECTION'),('caleb-konley','Caleb Konley','All-rounder','#ec3685',1.02,1.08,1.00,'LUNACY FINISHER')]
NEW += FIGHTERS
NEW.extend([KONGO,BRONSON,HOKANE])
OVERRIDES['kongo-kong']=KONGO_NAMES
OVERRIDES['father-bronson']=BRONSON_NAMES
OVERRIDES['hokane']=HOKANE_NAMES
EXPANSION={v[0] for v in FIGHTERS}
patterns={'idle':['standing.'],'walk':['walking.jpg'],'run':['running.'],'chair':['attack with chair','attacking with chair'],'bat':['attack with bat','attacking with bat'],'guitar':['attack with guitar','attacking with guitar'],'trashcan':['attack with trashcan','attacking with trashcan'],'carryChair':['walking with chair','walk with chair'],'carryBat':['walking with bat','walk with bat'],'carryGuitar':['walking with guitar'],'carryTrashcan':['walking with trashcan'],'lift':['lifting overhead'],'throw':['throwing.','throwing (','throwing wrestler'],'lifted':['being lifted','getting lifted'],'thrown':['being thrown'],'hurt':['dazed','dazzed'],'fallBack':['falling back'],'fallFront':['falling forward'],'down':['laying face'],'rise':['getting up','getting back up'],'taunt':['taunting','victory'],'victory':['victory','taunting'],'defeat':['defeated'],'kneel':['kneeling'],'exhausted':['passed out'],'jump':['jumping.'],'pin':['pinning'],'grapple':['grappl'],'elbow':['elbow'],'kick':['kicking'],'climb':['climbing on top','climb on top','climbing top'],'entry':['climbing on rope','climbing through','climb through'],'dive':['jumping off'],'propGuitar':['attack with guitar']}
patterns.update({'riseBack':[], 'ropePose':[], 'ko':[], 'fallBackReverse':[], 'fallFrontReverse':[]})
selected=set(sys.argv[2:]);targets=[v for v in NEW if not selected or v[0] in selected]
if selected-set(v[0] for v in NEW):raise ValueError('Unknown wrestler ID')
audit_path=ROOT/'tools/new-asset-audit.json';audit=json.loads(audit_path.read_text()) if audit_path.exists() else []
audit=[v for v in audit if v['fighter'] not in {r[0] for r in targets}];roster=json.loads((OUT/'roster.json').read_text())
# Polygons in the 1600-wide reference images follow bodies, excluding poles/mat.
# Fine transparent silhouette is still computed within each outline (not a polygon cutout).
climb4=[[(130,475),(300,475),(333,589),(283,618),(288,749),(259,761),(232,727),(221,675),(191,739),(172,778),(130,773),(145,707)],[(480,435),(683,435),(711,540),(655,575),(679,646),(634,669),(604,611),(573,643),(574,758),(539,780),(520,755),(532,637),(500,608),(479,603)],[(891,352),(1014,345),(1040,466),(1082,513),(1070,540),(1025,535),(1038,585),(1052,628),(1017,643),(980,608),(956,646),(946,680),(892,682),(883,658),(910,605)],[(1276,282),(1400,276),(1440,456),(1420,478),(1400,466),(1402,524),(1432,551),(1423,570),(1375,572),(1361,514),(1335,565),(1326,589),(1286,589),(1291,542)]]
# Common seven-frame layout; coordinates per 1600x900 sheet, slight padded outlines.
climb7=[[(23,492),(148,482),(183,534),(191,601),(160,623),(185,706),(201,827),(160,837),(116,730),(96,714),(66,835),(24,837),(37,728),(61,646),(25,612)],[(263,472),(384,470),(401,536),(425,554),(427,574),(393,587),(399,642),(389,673),(410,691),(407,708),(356,711),(336,669),(317,708),(306,817),(260,824),(257,793),(267,721),(260,652)],[(480,425),(621,425),(636,510),(658,544),(659,566),(625,563),(619,605),(638,647),(630,671),(583,672),(562,621),(544,659),(530,713),(537,754),(488,761),(478,736),(491,667)],[(704,388),(854,384),(878,541),(877,565),(851,567),(837,546),(822,564),(848,577),(843,600),(795,601),(776,559),(760,607),(751,657),(768,681),(763,700),(711,700),(701,679),(719,580)],[(944,398),(1106,396),(1110,498),(1099,540),(1102,576),(1082,599),(1057,586),(1056,564),(1026,551),(1026,578),(1050,590),(1040,608),(991,608),(972,591),(974,538),(948,517)],[(1172,400),(1319,391),(1337,548),(1340,583),(1318,599),(1293,583),(1282,549),(1252,547),(1237,580),(1261,593),(1253,614),(1201,607),(1182,592),(1190,535),(1173,508)],[(1396,278),(1523,275),(1554,440),(1551,468),(1528,471),(1515,450),(1529,536),(1529,576),(1552,592),(1548,610),(1494,610),(1478,530),(1461,491),(1450,550),(1440,590),(1445,615),(1397,617),(1399,571),(1410,484)]]

def source_image(path):return ImageOps.contain(Image.open(path).convert('RGB'),(1600,960))
def mask_image(im,region=None,rope=False,strict=False,minheight=58,bridge=None):
 a=np.array(im);v=a.astype('int16');spread=v.max(2)-v.min(2)
 fg=((v.max(2)<115)|(spread>110)) if strict else ((v.min(2)<118)|(spread>62))
 if region is not None:fg &=region
 if rope:
  # Red rope pixels are scenery. Preserve skin, black clothing and white trim.
  red=(v[:,:,0]>150)&(v[:,:,0]>v[:,:,1]*2.8)&(v[:,:,1]<65)&(v[:,:,2]<70)
  rope_band=ndi.binary_dilation((red&fg).sum(1)>5,iterations=7)
  body_support=ndi.binary_opening(fg,structure=np.ones((23,1),dtype=bool))
  fg[rope_band] &=body_support[rope_band]
  fg &=~red
  blue=(v[:,:,2]>v[:,:,1]+7)&(v[:,:,1]>v[:,:,0]+7)&(np.arange(im.height)[:,None]>im.height*.73)
  fg &=~blue
 if bridge is not None:fg|=bridge&(v.min(2)>140)
 fg=ndi.binary_closing(fg,iterations=1)
 if region is not None:fg &=region
 labels,n=ndi.label(fg);objs=ndi.find_objects(labels);items=[]
 if rope:
  sizes=np.bincount(labels.ravel());keep=sizes>120;keep[0]=False
  # Retain detached props, but exclude thin isolated panel rules.
  for k,s in enumerate(objs,1):
   if s and s[1].stop-s[1].start<6 and s[0].stop-s[0].start>60:keep[k]=False
  fg=keep[labels]
  ys,xs=np.where(fg)
  if not len(xs):return []
  sl=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1));filled=ndi.binary_fill_holes(fg);holes=filled&~fg;hl,hn=ndi.label(holes);sizes=np.bincount(hl.ravel());small=sizes<800;small[0]=False;upper=np.arange(im.height)[:,None]<(ys.min()+(ys.max()-ys.min())*.55);mask=(fg|(holes&(small[hl]|upper)))[sl]
  return [dict(image=Image.fromarray(np.dstack((a[sl],mask.astype('uint8')*255))),x=int(xs.min()),y=int(ys.min()),w=int(xs.max()-xs.min()+1),h=int(ys.max()-ys.min()+1),area=int(mask.sum()))]
 for k,s in enumerate(objs,1):
  if not s:continue
  ys,xs=s;h=ys.stop-ys.start;w=xs.stop-xs.start;area=int((labels[s]==k).sum())
  if h<minheight or w<35 or area<2500 or area/(h*w)<.12:continue
  base=labels[s]==k;holes=ndi.binary_fill_holes(base)&~base;hl,hn=ndi.label(holes);sizes=np.bincount(hl.ravel());small=sizes<800;small[0]=False;upper=np.arange(h)[:,None]<h*.42;mask=base|(holes&(small[hl]|upper))
  items.append(dict(image=Image.fromarray(np.dstack((a[s],mask.astype('uint8')*255))),x=xs.start,y=ys.start,w=w,h=h,area=area))
 return items

base_mask_image=mask_image
def extract(path,anim,id):
 mask_image=clean_mask if id in EXPANSION or id=='kongo-kong' else base_mask_image
 im=source_image(path);a=np.array(im);h,w=a.shape[:2]
 if id=='father-bronson':return bronson_extract(im,anim)
 if id=='hokane':return hokane_extract(im,anim)
 if id=='kongo-kong':
  special=kongo_extract(im,anim)
  if special is not None:return special
 dark=(a.max(2)<100).mean(1);heads=np.where((dark>.58)&(np.arange(h)<h*.31))[0];start=int(heads[-1]+7) if len(heads) else int(h*.2)
 region=np.ones((h,w),dtype=bool);region[:start]=False;region[-12:]=False;region[:,:12]=False;region[:,-12:]=False
 if id in EXPANSION:
  region[:,:12]=True;region[:,-12:]=True;region[:start]=False;region[-12:]=False;region[:,:2]=False;region[:,-2:]=False
 if id in ['sally-boy','big-vito'] and anim=='throw':
  result=[]
  boxes=[(3,320,282,790),(264,320,512,790),(515,320,738,790),(720,390,1061,790),(1035,390,1278,790)] if id=='sally-boy' else [(80,440,424,865),(468,290,763,865),(808,390,1202,865),(1225,390,1540,865)]
  for x1,y1,x2,y2 in boxes:
   reg=np.zeros((h,w),dtype=bool);reg[y1:y2,x1:x2]=True
   found=mask_image(im,reg)
   if found:result.append(max(found,key=lambda v:v['area']))
  return result
 if id in EXPANSION and (anim=='climb' or (id=='sally-boy' and anim=='entry')):
  polys=CLIMBS[id] if anim=='climb' else SALLY_ENTRY
  base=(1535,960) if id=='sally-boy' else (1600,900)
  result=[]
  for poly in polys:
   m=Image.new('1',im.size);ImageDraw.Draw(m).polygon([(x*w/base[0],y*h/base[1]) for x,y in poly],fill=1)
   # Saturated red costume panels are body pixels, so scenery is excluded by
   # the reviewed outline; the thin rope mask only removes long horizontal runs.
   found=mask_image(im,np.array(m,dtype=bool),True)
   if found:result.append(max(found,key=lambda v:v['area']))
  return result
 if id in EXPANSION and anim=='guitar':
  # Contact overlaps a neighboring body or is cut by the illustrated panel.
  # Use clean wind-up and recovery plus an intact strike body with a held prop.
  boxes=[(15,350,301,840),(310,232,607,840),(1228,350,1525,840)] if id=='sally-boy' else [(78,259,419,808),(451,230,790,808)]
  result=[]
  for x1,y1,x2,y2 in boxes:
   reg=np.zeros((h,w),dtype=bool)
   base=(1535,960) if id=='sally-boy' else (1600,900)
   reg[int(y1*h/base[1]):int(y2*h/base[1]),int(x1*w/base[0]):int(x2*w/base[0])]=True
   # Manual boxes sit inside the thin panel rules.
   found=base_mask_image(im,reg)
   if found:result.append(max(found,key=lambda v:v['area']))
  if len(result)==2:result.append(result[0])
  return result
 if id in EXPANSION and anim in ['entry','ropePose'] and (id!='ruffo' or anim=='ropePose'):
  # These files show directions of one pose, not an entry sequence. Right view.
  poly=[(1274,392),(1330,274),(1435,270),(1460,337),(1440,381),(1435,431),(1497,486),(1514,494),(1517,528),(1488,535),(1437,518),(1412,520),(1438,563),(1447,624),(1425,677),(1431,713),(1470,741),(1470,765),(1410,771),(1381,749),(1387,710),(1399,653),(1369,624),(1357,677),(1337,733),(1327,769),(1367,796),(1360,823),(1315,820),(1278,800),(1280,775),(1298,722),(1303,669),(1308,622),(1274,603),(1273,548)]
  m=Image.new('1',im.size);ImageDraw.Draw(m).polygon(poly,fill=1)
  return mask_image(im,np.array(m,dtype=bool),True)
 if id=='ruffo' and anim=='entry':
  result=[]
  for x1,y1,x2,y2 in [(32,340,364,751),(460,310,774,813),(865,274,1165,754),(1248,290,1533,848)]:
   reg=np.zeros((h,w),dtype=bool);reg[y1:y2,x1:x2]=True
   found=mask_image(im,reg,True)
   if found:result.append(max(found,key=lambda v:v['area']))
  return result
 if id in ['sally-boy','ruffo'] and anim=='dive':
  boxes=[(427,287,729,580),(784,400,1200,611)] if id=='sally-boy' else [(402,290,685,635),(719,398,1157,600)]
  result=[]
  for x1,y1,x2,y2 in boxes:
   reg=np.zeros((h,w),dtype=bool);reg[y1:y2,x1:x2]=True
   found=mask_image(im,reg,True)
   if found:result.append(max(found,key=lambda v:v['area']))
  return result
 if id=='ruffo' and anim=='ko':
  # Single full-body KO illustration occupies most of the sheet.
  reg=np.zeros((h,w),dtype=bool);reg[int(h*.24):int(h*.94),12:w-12]=True
  return mask_image(im,reg)
 if id=='caleb-konley' and anim in ['climb','entry','dive']:
  # Reviewed against Caleb's actual sheet, not another wrestler's panel grid.
  if anim=='climb':
   polys=[[(86,552),(224,548),(245,627),(301,646),(299,674),(235,690),(270,719),(278,787),(302,810),(287,836),(246,842),(233,802),(225,757),(165,783),(141,913),(141,950),(120,964),(82,963),(88,916),(104,776),(99,681)],[(477,474),(599,469),(617,548),(652,586),(689,610),(692,633),(655,634),(614,615),(622,675),(615,723),(641,743),(638,763),(577,767),(558,743),(562,699),(531,692),(524,775),(510,830),(532,851),(528,873),(476,870),(469,851),(477,781),(477,701),(457,669),(463,554)],[(852,491),(961,420),(1044,418),(1048,481),(1021,508),(1039,563),(1048,592),(1063,616),(1068,643),(1046,649),(1028,625),(994,598),(987,641),(1005,671),(1002,694),(955,694),(940,680),(946,628),(931,618),(929,672),(927,707),(895,713),(888,691),(889,623),(884,592),(850,561)],[(1290,335),(1334,305),(1392,303),(1397,364),(1388,388),(1397,439),(1405,478),(1425,510),(1424,538),(1400,550),(1384,527),(1380,493),(1372,572),(1392,600),(1387,630),(1376,649),(1379,689),(1406,696),(1409,715),(1349,723),(1335,707),(1338,645),(1330,630),(1323,678),(1319,697),(1330,708),(1327,723),(1277,725),(1270,706),(1277,672),(1285,629),(1294,591),(1306,548),(1284,543),(1276,520),(1266,467),(1273,409)]]
   base=(1536,1024)
  elif anim=='entry':
   polys=[[(72,479),(139,423),(211,425),(222,481),(205,521),(215,603),(226,639),(249,659),(249,689),(226,699),(211,678),(190,657),(205,740),(214,828),(232,876),(259,891),(258,910),(178,918),(171,890),(170,841),(140,763),(111,821),(95,879),(120,893),(118,910),(63,912),(31,895),(37,869),(57,821),(72,745),(72,695),(63,672),(62,631),(65,557)],[(465,470),(548,405),(617,407),(620,455),(606,492),(646,490),(665,502),(655,527),(627,539),(603,549),(585,559),(604,579),(634,615),(640,670),(650,710),(690,725),(692,744),(620,749),(602,729),(593,683),(577,653),(539,672),(530,727),(518,766),(506,815),(505,850),(535,860),(533,880),(473,882),(440,874),(452,816),(461,764),(464,702),(451,654),(453,585)],[(850,504),(935,435),(1010,391),(1073,399),(1071,460),(1053,488),(1090,525),(1110,539),(1102,566),(1078,574),(1047,562),(1003,546),(991,565),(973,582),(994,626),(983,647),(954,638),(949,663),(983,680),(986,700),(966,708),(935,690),(912,665),(904,697),(906,762),(903,807),(923,823),(921,841),(846,842),(834,827),(840,790),(849,711),(851,654),(841,608)],[(1291,409),(1352,338),(1416,336),(1433,352),(1431,410),(1423,431),(1441,484),(1445,540),(1454,572),(1475,603),(1473,626),(1455,640),(1434,629),(1420,587),(1404,571),(1409,637),(1434,693),(1436,752),(1448,801),(1467,819),(1465,843),(1384,846),(1374,832),(1380,789),(1371,734),(1364,706),(1332,748),(1318,796),(1327,828),(1323,852),(1273,857),(1264,840),(1268,799),(1282,743),(1302,687),(1303,622),(1285,619),(1278,594),(1273,558),(1270,503)]]
   base=(1536,1024)
  else:
   polys=[[(380,310),(683,310),(683,622),(380,622)],[(704,426),(1156,426),(1156,641),(704,641)]];base=(1448,1086)
  result=[]
  for pose_index,poly in enumerate(polys):
   m=Image.new('1',im.size);ImageDraw.Draw(m).polygon([(x*w/base[0],y*h/base[1]) for x,y in poly],fill=1)
   cuffs={'climb':[[],[[(642,598),(668,605),(666,632),(641,622)]],[[(1020,588),(1038,584),(1053,615),(1032,629)]],[]],
          'entry':[[],[[(611,502),(636,493),(645,520),(623,536)]],[[(1054,533),(1083,539),(1081,566),(1051,565)]],[]]}
   keep=Image.new('1',im.size)
   for cuff in cuffs.get(anim,[[],[]])[pose_index]:ImageDraw.Draw(keep).polygon([(x*w/base[0],y*h/base[1]) for x,y in cuff],fill=1)
   found=mask_image(im,np.array(m,dtype=bool),anim!='dive',bridge=np.array(keep,dtype=bool))
   if found:result.append(max(found,key=lambda v:v['area']))
  return result
 if id=='caleb-konley' and anim=='guitar':
  result=[]
  for x1,y1,x2,y2 in [(15,375,299,862),(315,232,609,863),(1238,370,1520,862)]:
   reg=np.zeros((h,w),dtype=bool);reg[int(y1*h/1024):int(y2*h/1024),int(x1*w/1536):int(x2*w/1536)]=True
   found=mask_image(im,reg)
   if found:result.append(max(found,key=lambda v:v['area']))
  return result
 if anim=='jump' and id in ['able','dani-mo','j-rod','big-vito','alice-crowley','ruffo']:
  region[:int(h*.30)]=False
  # Each crop covers the entire figure; erosion of grid pixels must not split it.
  boxes=[(98,497,376,868),(425,391,755,857),(865,290,1144,690),(1262,485,1521,867)]
  if id in EXPANSION:boxes=[(80,260,395,873),(410,245,796,873),(813,225,1190,873),(1210,250,1545,873)]
  result=[]
  for box in boxes:
   reg=np.zeros((h,w),dtype=bool);x1,y1,x2,y2=box;reg[y1:y2,x1:x2]=True
   found=mask_image(im,reg&region,False,True)
   if found:result.append(max(found,key=lambda v:v['area']))
  return result
 if anim=='propGuitar':
  # Intact guitar isolated from the first Matt Cross pose; clipped smash cells
  # are replaced at runtime by an intact throwing body holding this same prop.
  poly=[(231,448),(282,448),(282,493),(270,517),(269,572),(282,588),(289,615),(286,644),(304,678),(300,716),(278,738),(237,740),(213,722),(204,696),(210,667),(225,649),(217,617),(219,590),(239,574),(241,525),(230,507)]
  m=Image.new('1',im.size);ImageDraw.Draw(m).polygon(poly,fill=1)
  return mask_image(im,np.array(m,dtype=bool),True)
 if anim=='dive':
  # Only the airborne poses; the first/last frame is joined to the illustrated ring.
  region[:]=False
  if id=='vincenzo':region[int(h*.37):int(h*.64),int(w*.28):int(w*.68)]=True
  else:region[int(h*.32):int(h*.70),int(w*.26):int(w*.71)]=True
 if anim=='climb':
  if id in ['able','dani-mo','j-rod']:polys=climb4
  elif id in ['matt-cross','vincenzo']:
   polys=climb7
   # Vincenzo source is 1586x992, same seven columns but different body placements.
   if id=='vincenzo':
    polys=[[(x*w/1535,y*h/960) for x,y in p] for p in [
    [(22,570),(158,561),(190,611),(195,683),(166,695),(174,794),(189,918),(131,925),(118,834),(104,787),(86,836),(78,917),(33,923),(27,898),(44,812),(58,716),(28,692)],
    [(246,537),(390,532),(412,621),(411,646),(384,659),(383,694),(373,731),(396,757),(386,781),(335,784),(319,733),(314,796),(304,856),(317,877),(311,895),(257,897),(246,875),(266,800),(266,731),(245,721)],
    [(460,489),(603,486),(621,590),(635,608),(635,634),(607,638),(585,645),(575,683),(598,711),(593,735),(552,741),(532,696),(523,755),(518,818),(536,831),(533,852),(476,852),(469,827),(487,757),(478,690),(459,676)],
    [(674,436),(832,432),(846,587),(854,603),(850,622),(830,626),(814,608),(806,627),(817,650),(810,666),(759,669),(745,641),(733,685),(730,735),(752,748),(747,768),(690,770),(680,750),(695,686),(695,616),(672,603)],
    [(891,456),(1052,454),(1068,642),(1054,659),(1024,657),(1011,626),(1007,608),(978,609),(967,649),(987,658),(983,678),(926,679),(919,658),(932,603),(896,593)],
    [(1117,450),(1277,447),(1288,632),(1289,648),(1265,658),(1244,646),(1227,667),(1208,658),(1194,625),(1183,658),(1204,669),(1198,690),(1145,690),(1137,668),(1151,609),(1115,597)],
    [(1329,329),(1468,328),(1507,535),(1499,551),(1478,550),(1469,529),(1479,595),(1482,665),(1501,680),(1494,700),(1439,696),(1431,653),(1409,588),(1388,640),(1385,679),(1397,692),(1384,707),(1349,707),(1341,693),(1354,666),(1367,584),(1357,543),(1338,546)] ]]
  else:
   # FACADE sheet, four evenly spaced corner poses.
   polys=[[(x*w/1280,y*h/960) for x,y in p] for p in [
    [(94,470),(303,464),(307,630),(304,890),(230,895),(237,790),(213,711),(197,745),(180,760),(130,739),(122,720),(151,696),(149,653),(153,631),(126,613),(99,590)],
    [(399,392),(621,389),(625,554),(612,647),(603,743),(551,750),(545,686),(519,624),(519,680),(502,710),(467,715),(462,696),(482,679),(478,618),(493,587),(455,579),(420,580),(395,564)],
    [(718,331),(918,331),(934,488),(917,575),(919,679),(876,685),(863,620),(856,560),(839,566),(846,611),(842,638),(792,642),(786,624),(806,610),(808,556),(777,567),(730,575),(717,554)],
    [(1050,245),(1215,240),(1241,472),(1219,488),(1208,463),(1201,541),(1199,622),(1214,638),(1204,658),(1165,656),(1138,574),(1123,590),(1110,630),(1132,644),(1128,662),(1072,655),(1076,612),(1092,539),(1085,489),(1060,487)] ]]
  items=[]
  for p in polys:
   m=Image.new('1',im.size);ImageDraw.Draw(m).polygon(p,fill=1)
   found=mask_image(im,np.array(m,dtype=bool),True)
   if found:items.append(max(found,key=lambda v:v['area']))
  return items
 if anim=='entry':
  cols=4 if id in ['able','dani-mo','j-rod','facade','ruffo'] else 5
  if id=='facade':
   polygons=[[(17,301),(194,300),(216,499),(243,537),(243,575),(213,582),(194,620),(223,743),(259,760),(251,790),(208,801),(173,756),(118,655),(81,739),(69,764),(82,790),(51,796),(12,778),(12,735),(53,615),(24,574)],[(382,302),(557,298),(596,439),(620,503),(618,535),(583,539),(570,563),(591,594),(624,593),(630,612),(607,638),(569,639),(526,599),(502,559),(462,549),(450,741),(462,779),(442,793),(399,790),(398,747),(410,549),(383,469)],[(693,299),(882,299),(928,458),(956,501),(960,528),(927,533),(907,504),(876,524),(864,566),(895,596),(879,620),(847,642),(832,636),(815,596),(793,558),(785,667),(798,738),(839,775),(818,790),(781,783),(748,751),(738,680),(757,549),(720,534),(697,526)],[(1007,286),(1216,282),(1251,505),(1252,575),(1232,583),(1209,554),(1193,619),(1231,753),(1253,773),(1256,798),(1198,799),(1190,760),(1146,662),(1081,774),(1081,799),(1024,795),(1020,778),(1040,755),(1082,620),(1043,571),(1029,583),(1006,569)]]
   polygons=[[(x*w/1280,y*h/960) for x,y in p] for p in polygons]
  else:
   polygons=[]
   for i in range(cols):
    x0=i*w/cols;cw=w/cols
    # Exclude the coloured apron below the actual soles.
    poly=[(.06,.33),(.94,.33),(.95,.64),(.86,.68),(.87,.87),(.19,.87),(.18,.78),(.05,.64)]
    if id in ['able','dani-mo','j-rod']:poly=[(.12,.30),(.88,.30),(.92,.61),(.82,.64),(.83,.86),(.17,.86),(.16,.65),(.08,.61)]
    polygons.append([(x0+x*cw,y*h) for x,y in poly])
  items=[]
  for poly in polygons:
   m=Image.new('1',im.size);ImageDraw.Draw(m).polygon(poly,fill=1)
   reg=np.array(m,dtype=bool)
   found=mask_image(im,reg,True)
   if found:items.append(max(found,key=lambda v:v['area']))
  return items
 # Remove the drawn cell borders, not parts of neighbouring wrestlers.
 if anim=='guitar' and id in ['able','dani-mo','j-rod']:
  for xx in [70,421,446,792,819,1162,1190,1530]:region[:,max(0,xx):xx+1]=False
  for yy in [254,813]:region[max(0,yy-3):yy+4]=False
  # Contact frame overlaps the next illustrated wrestler: use the first two
  # intact figures plus a manually isolated forward swing (no second body).
  polys=[[(80,260),(417,260),(417,808),(80,808)],[(451,230),(785,230),(785,808),(451,808)],[(850,370),(1085,365),(1111,501),(1143,556),(1230,558),(1307,578),(1325,616),(1312,659),(1266,683),(1220,656),(1170,618),(1087,605),(1088,720),(1115,768),(1103,790),(1028,790),(1006,701),(963,724),(929,786),(855,789),(848,760),(883,663),(905,517)]]
  found=[]
  # Border erasure would leave small cracks; closing reconnects genuine body pixels.
  for poly in polys:
   m=Image.new('1',im.size);ImageDraw.Draw(m).polygon(poly,fill=1)
   its=mask_image(im,np.array(m,dtype=bool)&region,True)
   if its:found.append(max(its,key=lambda v:v['area']))
  return found
 if anim=='elbow' and id=='facade':
  items=[]
  for x1,x2 in [(20,239),(211,427),(433,634)]:
   reg=np.zeros((h,w),dtype=bool);reg[int(360*h/960):int(790*h/960),int(x1*w/1280):int(x2*w/1280)]=True
   its=mask_image(im,reg)
   if its:items.append(max(its,key=lambda v:v['area']))
  return items
 if anim=='bat' and id=='vincenzo':
  items=[]
  for j,(x1,x2) in enumerate([(10,300),(317,594),(596,979),(897,1322),(1250,1530)]):
   reg=np.zeros((h,w),dtype=bool);reg[int(h*.245):int(h*.9),int(x1*w/1535):int(x2*w/1535)]=True
   if j==3:
    poly=[(976,394),(1129,389),(1156,541),(1185,577),(1228,603),(1319,631),(1318,658),(1287,661),(1220,636),(1157,614),(1175,733),(1218,835),(1215,862),(1160,860),(1141,816),(1078,718),(1010,816),(1002,855),(898,859),(897,837),(921,803),(968,686),(959,619),(960,497)]
    m=Image.new('1',im.size);ImageDraw.Draw(m).polygon([(x*w/1535,y*h/960) for x,y in poly],fill=1);reg=np.array(m,dtype=bool)
   its=mask_image(im,reg)
   if its:items.append(max(its,key=lambda v:v['area']))
  return items
 if anim=='fallFront' and id in ['able','dani-mo','j-rod','big-vito','bruce-wayans','alice-crowley','ruffo']:
  items=[]
  for x1,x2 in [(50,430),(435,817),(822,1170),(1175,1550)]:
   reg=np.zeros((h,w),dtype=bool);reg[int(h*.29):int(h*.91),x1:x2]=True
   found=mask_image(im,reg,False,False,32)
   if found:items.append(max(found,key=lambda v:v['area']))
  return items
 items=mask_image(im,region,False,anim=='jump',32 if anim in ['fallFront','fallBack','rise','riseBack'] else 58)
 items=[v for v in items if v['w']<w*.6 and not any(o is not v and o['x']<=v['x'] and o['y']<=v['y'] and o['x']+o['w']>=v['x']+v['w'] and o['y']+o['h']>=v['y']+v['h'] for o in items)]
 # Large y gaps correspond to two independent directional rows.
 items.sort(key=lambda v:v['y']+v['h']/2);rows=[]
 for v in items:
  cy=v['y']+v['h']/2
  if not rows or cy-np.mean([p['y']+p['h']/2 for p in rows[-1]])>h*.24:rows.append([v])
  else:rows[-1].append(v)
 return [v for row in rows for v in sorted(row,key=lambda p:p['x'])]

for id,name,style,color,power,speed,toughness,finisher in targets:
 source_dir=SRC/('Hokane Sprite Set' if id=='hokane' else name)
 files=sorted(source_dir.iterdir());record=dict(id=id,name=name,style=style,color=color,power=power,speed=speed,toughness=toughness,finisher=finisher,edition='2026-09',animations={});frames=[];preview=[]
 for anim,pats in patterns.items():
  chosen=next((p for pat in pats for p in files if pat.lower() in p.name.lower()),None)
  if anim in OVERRIDES.get(id,{}):
   override=OVERRIDES[id][anim];chosen=source_dir/override if override else None
  if id=='caleb-konley' and anim in ['kneel','defeat']:
   chosen=SRC/name/('Calabe kneeling.png' if anim=='kneel' else 'CK kneeling.png')
  if anim=='propGuitar':
   if id in ['caleb-konley','father-bronson'] or id in EXPANSION:
    base=next(f for f in roster if f['id']=='matt-cross');e=base['animations']['propGuitar'][0]
    prop=Image.open(OUT/'matt-cross.png').crop((e['x'],e['y'],e['x']+e['w'],e['y']+e['h']))
    items=[dict(image=prop,x=e['x'],y=e['y'],w=e['w'],h=e['h'],area=e['w']*e['h'])];chosen=OUT/'matt-cross.png'
   elif id=='hokane':chosen=source_dir/HOKANE_NAMES['guitar']
   elif id not in ['matt-cross','vincenzo']:continue
   else:chosen=next((SRC/'Matt Cross').glob('*attack with guitar*'))
  if not chosen:continue
  if not ((id in ['caleb-konley','father-bronson'] or id in EXPANSION) and anim=='propGuitar'):items=extract(chosen,anim,id)
  raw=len(items)
  if not items:print('MISSING',id,anim,chosen.name);continue
  flip=False
  if id=='kongo-kong':
   if anim=='down':items=[items[1],items[-1]] # resting facedown, resting faceup
   if anim=='fallBack':items=items[:4] # final source panel repeats a facedown pose
   if anim=='defeat':items=items[-1:] # four views, not an animation cycle
  if id in ['caleb-konley','sally-boy'] and anim=='elbow':items=[v for v in items if v['h']>max(x['h'] for x in items)*.6]
  if anim=='guitar' and id in ['matt-cross','vincenzo']:items=[items[0],items[1],items[-1]]
  if anim=='rise' and id=='facade':items=items[1:]
  if anim=='exhausted':items=items[-1:]
  if anim=='chair' and id in ['able','j-rod']:items[1]=items[0]
  if anim=='idle':
   portrait=items[0]['image'].copy();portrait.thumbnail((220,320));portrait.save(OUT/f'{id}-portrait.png');items=items[-1:]
  elif anim in ['walk','run','carryChair','kick'] and len(items)>=8 and not (id=='hokane' and anim=='walk'):
   items=items[len(items)//2:] if id in ['bruce-wayans','ruffo','kongo-kong'] and anim=='run' else items[:len(items)//2]
  elif anim=='carryGuitar':
   if len(items)>=8:items=items[len(items)//2:]
   else:flip=True
  elif anim=='elbow' and len(items)==6:items=items[:3]
  elif anim=='climb' and id not in ['facade','kongo-kong','father-bronson','hokane'] and id not in EXPANSION:items=items[1:]
  if id in ['caleb-konley','sally-boy'] and anim=='carryTrashcan':flip=True
  elif anim=='entry' and id in ['able','dani-mo','j-rod']:items=items[-1:]
  # Reference upright body height, excluding raised arms/weapons and tuck poses.
  ref=max(v['h'] for v in items)
  if anim in ['chair','bat','guitar','trashcan']:ref=items[0 if anim in ['guitar','trashcan'] else -1]['h']
  elif anim=='lift':ref=items[0]['h']/ .86
  elif anim=='throw':ref=items[-1]['h']
  elif anim in ['victory','taunt']:ref=min(v['h'] for v in items)
  elif anim in ['down','defeat','kneel','ko']:ref=max(v['w'] for v in items)*1.07 if anim in ['down','ko'] else max(v['h'] for v in items)/(.58 if anim=='defeat' else 1)
  elif anim in ['fallFront','fallBack','fallBackReverse','fallFrontReverse']:ref=items[0]['h']
  elif anim=='jump':ref=max(v['h'] for v in items)/.76
  elif anim=='dive':ref=max(v['w'] for v in items)*.90
  elif anim=='lifted':ref=items[0]['h']/.84
  elif anim=='thrown':ref=items[0]['h']/.88
  elif anim=='climb':ref=items[-1]['h']
  elif anim=='run':ref=max(v['h'] for v in items)/.83
  if id in ['caleb-konley','sally-boy'] and anim=='defeat':ref=items[0]['h']
  if id in ['father-bronson','hokane'] and anim=='ropePose':ref=items[0]['h']
  if id=='father-bronson' and anim=='exhausted':ref=items[0]['h']/.62
  if anim=='propGuitar':ref=ref*220/145
  if anim=='trashcan' and id=='facade':ref*=1.22
  entry=[]
  for j,v in enumerate(items):
   im=v['image'];scale=220/ref
   im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
   if flip or (id=='facade' and anim=='climb' and j<3) or (id=='kongo-kong' and anim=='elbow' and j==0):im=ImageOps.mirror(im)
   # No attack scale changes in runtime. Feet anchor the body, even with a wide weapon.
   ent=dict(frame=len(frames),w=im.width,h=im.height,**frame_anchor(im,anim))
   entry.append(ent);frames.append(im);preview.append((anim,j,im))
  record['animations'][anim]=entry
  audit.append(dict(fighter=id,animation=anim,source='prepared:matt-cross.png#propGuitar' if (id in ['caleb-konley','father-bronson'] or id in EXPANSION) and anim=='propGuitar' else str(chosen.relative_to(SRC)),detected=raw,count=len(items),bounds=[{k:v[k] for k in ['x','y','w','h']} for v in items]))
 A=record['animations']
 if 'run' not in A:A['run']=A['walk']
 if 'walk' not in A:A['walk']=A['run'] # no unarmed walk sheet supplied; slower jog
 if 'jump' not in A:A['jump']=[A['run'][2]]
 if 'down' not in A:A['down']=[A['fallFront'][-1],A['fallBack'][-1]]
 if id=='facade':A['rise']=[A['down'][0],*A['rise']] # first two source poses touch; use the clean prone figure
 if 'defeat' not in A:A['defeat']=[A['kneel'][-1]]
 if 'kneel' not in A:A['kneel']=[A['defeat'][0]]
 if 'exhausted' not in A:A['exhausted']=A['hurt']
 if 'grapple' not in A:A['grapple']=[A['throw'][0]]
 # Contact phases deliberately select a forward strike, never an overhead lift.
 A['light']=[A['elbow'][0],A['elbow'][2 if len(A['elbow'])>=4 else 1],A['elbow'][-1],A['idle'][0]] if 'elbow' in A else [A['throw'][0],A['throw'][2],A['throw'][0],A['idle'][0]]
 if 'propGuitar' in A:A['guitar']=[A['guitar'][0],A['guitar'][1],A['throw'][-2 if id in EXPANSION else 3],A['guitar'][2]]
 if id=='hokane':
  A['bat'][-1]=A['bat'][0] # crossed recovery bats occlude the source body; clean ready pose
  A['light']=[A['throw'][0],A['throw'][3],A['throw'][4],A['idle'][0]]
  record['guitarGrip']={'xFromRight':10,'height':.64}
 if id=='father-bronson':
  chair_frames(frames,A,frame_anchor)
  record['guitarGrip']={'xFromRight':16,'height':.70}
 A['heavy']=A['chair']
 record['weapons']=['chair','bat','guitar','trashcan']
 width=2048;x=y=rowh=0;positions=[]
 for im in frames:
  if x+im.width+4>width:y+=rowh+4;x=0;rowh=0
  positions.append((x,y));x+=im.width+4;rowh=max(rowh,im.height)
 atlas=Image.new('RGBA',(width,y+rowh+4))
 for im,pos in zip(frames,positions):atlas.alpha_composite(im,pos)
 for anim in A.values():
  for e in anim:e['x'],e['y']=positions[e['frame']]
 atlas.save(OUT/f'{id}.next.png',compress_level=6);os.replace(OUT/f'{id}.next.png',OUT/f'{id}.png');record['atlas']=f'./assets/{id}.png';record['atlasSize']=list(atlas.size)
 slot=next((i for i,f in enumerate(roster) if f['id']==id),None)
 if slot is None:roster.append(record)
 else:roster[slot]=record
 contact=Image.new('RGB',(1600,((len(preview)+7)//8)*280),'#393344');d=ImageDraw.Draw(contact)
 for i,(anim,j,im) in enumerate(preview):
  x=i%8*200;y=i//8*280;sm=ImageOps.contain(im,(194,245));contact.paste(sm,(x+(200-sm.width)//2,y+256-sm.height),sm);d.text((x+5,y+5),f'{anim} {j}',fill='white')
 contact.save(ROOT/'tools'/f'review-{id}.jpg',quality=90)
 if id=='kongo-kong':
  import hashlib
  original=SRC/name/'KK attack with guitar.png';duplicate=SRC/name/'Kongo Kong attack with guitar.png'
  if hashlib.sha256(original.read_bytes()).digest()!=hashlib.sha256(duplicate.read_bytes()).digest():raise ValueError('Kongo guitar duplicate changed; inspect it before rebuilding')
  audit.append(dict(fighter=id,animation='guitar',source=str(duplicate.relative_to(SRC)),duplicateOf=str(original.relative_to(SRC)),detected=0,count=0,bounds=[]))
 if id=='father-bronson':
  used={a['source'] for a in audit if a['fighter']==id}
  for source in files:
   if str(source.relative_to(SRC)) not in used:
    reason={'Father Bronson Grapple.png':'Paired, occluded bodies; replaced by intact tie-up preparation from the second lift sheet.','Father Bronson fall backward.jpg':'Alternate backward sequence ends facedown; dedicated directional back-fall sheets provide consistent landings.','Father Bronsons walk right w guitar.jpg':'Alternate front-facing carry; the side-facing left carry is normalized and mirrored for both directions.'}.get(source.name)
    if not reason:raise ValueError('Unreviewed source: '+source.name)
    audit.append(dict(fighter=id,animation='reviewed-alternate',source=str(source.relative_to(SRC)),detected=0,count=0,bounds=[],reason=reason))
 if id=='hokane':
  used={a['source'] for a in audit if a['fighter']==id}
  assert all(str(p.relative_to(SRC)) in used for p in files), 'Every supplied Hokane sheet must have a reviewed use'
  notes={'climb':'First back-view source pose is occluded by a printed post; six side-facing climb poses follow the separate rope setup.','bat':'Last recovery has crossed neighboring bats; runtime repeats the clean ready frame.','guitar':'Clipped contact replaced by Hokane throw pose 3 and own isolated guitar prop.','run':'Six consistently right-facing frames selected from both mixed-direction rows.','thrown':'Printed shadows excluded; five complete body poses only.'}
  for item in audit:
   if item['fighter']==id and item['animation'] in notes:item['note']=notes[item['animation']]
 print(id,[(a,len(v)) for a,v in A.items()])
if (OUT/'website-stats.json').exists():
 from apply_website_stats import apply
 roster=apply(roster,json.loads((OUT/'website-stats.json').read_text()))
(OUT/'roster.json').write_text(json.dumps(roster,separators=(',',':')))
(ROOT/'tools/new-asset-audit.json').write_text(json.dumps(audit,indent=2))
