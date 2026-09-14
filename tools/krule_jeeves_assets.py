"""Krule and Jeeves: reviewed source-sheet extraction, reference 1200x675.
Source files are illustrated layouts. Keep one body per frame and preserve
Jeeves's white tights; screen scenery is excluded by reviewed regions.
"""
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as ndi
from roster_expansion import clean_mask as base_mask
FIGHTERS=[('krule','Krule','Powerhouse','#638844',1,1,1,'LUNACY FINISHER'),('jeeves','Jeeves','Technician','#ddba56',1,1,1,'HEADS BANGERS BALLS')]
BASE={'idle':'standing','walk':'walking','run':'running','chair':'attack with chair','bat':'attack with bat','guitar':'attack with guitar','trashcan':'attack with trashcan','carryChair':'walk with chair','carryBat':'walking with bat','carryGuitar':'walk with guitar','carryTrashcan':'walk with trashcan','lift':'lifting overhead','throw':'throwing','lifted':'getting lifted overhead','thrown':'being thrown','hurt':'dazed','fallBack':'falling backwards','fallFront':'falling forward','down':'laying facedown and faceup','rise':'getting up from facedown','taunt':'taunting','victory':'victory','defeat':'defeated','jump':'jumping','pin':'pinning','climb':'climb on top ropes','entry':'Climb through ropes','dive':'jumping off corner rope','ropePose':'climbing through rope','ko':'passed out (end frames)'}
NAMES={id:{k:name+' '+v+'.png' for k,v in BASE.items()} for id,name in [('krule','Krule'),('jeeves','Jeeves')]}
NAMES['krule'].update(down='Krule laying down.png',thrown=None)
NAMES['jeeves'].update(carryBat='Jeeevs walk with bat.png',carryGuitar='Jeeevs walk with guitar.png',carryTrashcan='Jeeevs walk with trashcan.png',taunt='Jeeevs taunting.png',throw='Jeeevs throwing.png',jump='Jeeves Jumping.png',dive='Jeeves jumping from corner rope.png',climb='Jeeves climbing on top corner rope.png',entry='Jeeves climbing through ropes.png',ropePose='Jeeves climbing on rope.png',ko='Jeeevs passed out.png')
for names in NAMES.values():names.update(exhausted=None,kneel=None,grapple=None,elbow=None,kick=None)
NOTES={'bat':'Separate single-body contact poses. Jeeves repeats the clean ready pose for recovery because the two source recovery bats cross and overlap both bodies.','climb':'Six side-facing poses; the back-facing first panel is occluded by its printed corner post.','dive':'Two intact airborne poses; source scenery and printed landing dust are excluded.','guitar':'Clean ready, overhead and recovery poses. Forward contact uses the own throw pose with the existing isolated guitar prop.','run':'Six right-facing poses selected from the second row.','ko':'One complete resting body, without cycling unrelated directions.'}
def clean(im,region=None,rope=False,minheight=25):
 items=base_mask(im,region,rope=rope,minheight=minheight)
 for v in items:
  a=np.array(v['image']).copy()
  if rope:
   labels,n=ndi.label(a[:,:,3]>0);sizes=np.bincount(labels.ravel());sizes[0]=0
   if n:a[labels!=sizes.argmax(),3]=0
  rgba=Image.fromarray(a);box=rgba.getbbox()
  if box:
   x,y,r,b=box;v['x']+=x;v['y']+=y;v['w']=r-x;v['h']=b-y;rgba=rgba.crop(box)
  v['image']=rgba
 return items

def polygons(im,polys,rope=False):
 out=[]
 for poly in polys:
  region=Image.new('1',im.size);ImageDraw.Draw(region).polygon([(x*im.width/1200,y*im.height/675) for x,y in poly],fill=1)
  found=clean(im,np.array(region,bool),rope)
  if not found:raise ValueError('Empty reviewed region')
  out.append(max(found,key=lambda a:a['area']))
 return out

def boxes(im,rects,rope=False):return polygons(im,[[(x,y),(r,y),(r,b),(x,b)] for x,y,r,b in rects],rope)
CLIMB_K=[
[(197,594),(203,557),(216,510),(213,469),(218,421),(231,390),(256,361),(284,349),(305,361),(309,386),(296,402),(309,418),(330,430),(333,443),(322,450),(303,447),(308,467),(307,493),(298,528),(316,537),(315,551),(277,551),(273,535),(279,506),(257,502),(247,524),(236,562),(231,580),(239,594)],
[(369,583),(373,549),(385,510),(383,470),(389,425),(405,383),(434,349),(455,335),(476,341),(481,362),(474,382),(463,393),(475,416),(495,427),(500,443),(489,450),(472,439),(476,462),(474,486),(465,499),(484,506),(482,521),(445,522),(439,510),(448,474),(425,467),(410,512),(404,548),(405,570),(409,584)],
[(532,529),(539,496),(548,457),(545,421),(550,380),(569,342),(612,311),(634,305),(653,320),(654,340),(640,355),(645,373),(659,400),(664,414),(659,429),(643,431),(633,419),(630,439),(624,466),(640,480),(639,493),(600,494),(596,479),(604,435),(581,431),(570,472),(562,509),(571,530),(569,544),(548,542)],
[(706,374),(718,342),(749,320),(788,300),(810,294),(829,312),(829,331),(813,348),(824,366),(832,393),(843,407),(843,423),(829,431),(814,416),(795,399),(780,410),(782,424),(800,431),(798,441),(761,447),(744,435),(730,452),(714,452),(710,438),(721,407),(710,394)],
[(860,339),(874,306),(899,284),(935,275),(955,259),(978,257),(995,276),(994,299),(982,312),(999,341),(1017,354),(1020,368),(1008,377),(994,363),(981,350),(991,368),(987,391),(977,416),(993,420),(996,435),(958,437),(949,427),(955,400),(956,385),(934,380),(919,406),(910,432),(914,446),(910,458),(886,459),(881,447),(891,412),(906,371),(897,348),(883,341),(877,362),(864,365)],
[(1031,332),(1039,299),(1055,273),(1082,251),(1098,240),(1102,222),(1122,214),(1143,226),(1147,246),(1135,262),(1151,276),(1161,309),(1179,333),(1181,347),(1168,358),(1156,342),(1140,322),(1145,349),(1153,373),(1151,408),(1165,424),(1164,438),(1123,439),(1118,425),(1129,389),(1110,359),(1089,387),(1078,421),(1075,450),(1050,454),(1046,442),(1056,408),(1063,374),(1075,330),(1063,313),(1051,337),(1056,346),(1048,358),(1036,353)]
]
CLIMB_J=[
[(197,600),(201,560),(210,515),(202,482),(207,440),(216,402),(241,360),(263,340),(289,337),(302,354),(299,380),(283,397),(294,416),(322,423),(334,434),(332,448),(319,453),(298,443),(304,461),(305,486),(292,518),(309,530),(309,542),(275,547),(267,535),(274,504),(255,493),(238,515),(224,554),(225,575),(233,591),(227,603)],
[(365,581),(373,540),(381,501),(375,458),(388,413),(407,370),(433,337),(458,330),(475,340),(476,362),(465,383),(457,399),(475,416),(496,425),(501,439),(491,448),(477,442),(469,435),(471,456),(470,477),(462,493),(482,500),(482,513),(444,518),(437,505),(444,472),(424,466),(404,506),(398,541),(401,568),(412,574),(410,589),(381,591),(367,588)],
[(535,534),(539,500),(548,457),(546,420),(551,373),(570,335),(609,304),(635,294),(660,301),(665,321),(650,342),(637,353),(645,377),(658,400),(667,417),(665,430),(651,436),(636,423),(623,417),(625,434),(622,451),(635,457),(634,470),(597,472),(589,460),(596,435),(577,432),(565,467),(556,506),(560,524),(569,535),(566,548),(541,548)],
[(704,380),(714,343),(742,319),(780,298),(803,290),(823,299),(825,319),(816,337),(808,347),(823,373),(829,395),(845,405),(845,422),(831,430),(817,416),(804,405),(790,404),(781,421),(787,434),(804,441),(800,454),(767,454),(752,442),(744,430),(734,449),(739,458),(721,462),(713,453),(718,427),(722,407),(708,398)],
[(864,338),(875,307),(905,280),(932,260),(947,240),(969,236),(987,247),(988,267),(976,286),(983,304),(991,326),(1011,343),(1018,353),(1017,365),(1002,368),(992,353),(978,343),(988,366),(988,389),(978,420),(993,430),(992,443),(955,444),(950,429),(958,390),(936,379),(915,408),(906,437),(909,453),(902,469),(884,469),(880,455),(893,411),(902,380),(903,358),(895,342),(880,343),(879,357),(886,361),(879,374),(866,368)],
[(1030,332),(1045,294),(1054,275),(1081,250),(1090,226),(1110,213),(1132,214),(1141,233),(1136,259),(1137,273),(1156,299),(1163,328),(1175,338),(1178,351),(1164,359),(1154,344),(1136,320),(1143,355),(1149,383),(1147,416),(1165,436),(1165,449),(1126,451),(1120,434),(1125,400),(1110,370),(1089,400),(1079,435),(1080,452),(1072,464),(1052,465),(1046,450),(1057,407),(1064,374),(1076,329),(1064,316),(1054,340),(1054,351),(1042,357),(1032,351)]
]
def _extract(im,anim,id):
 w,h=im.size
 if anim=='trashcan' and id=='jeeves':
  return boxes(im,[(15,245,236,635),(236,247,484,635),(466,145,679,635),(680,264,970,635),(908,270,1198,635)])
 if anim=='walk':
  return boxes(im,[(70,418,245,635),(304,406,444,635),(504,405,678,635),(749,405,880,635),(966,405,1138,635)] if id=='krule' else [(42,395,217,622),(290,393,445,623),(536,393,657,623),(752,393,900,623),(982,393,1161,623)])
 if anim=='bat':
  first=boxes(im,[(16,244,268,635),(246,160,487,635)])
  contact=[(470,636),(479,576),(502,517),(523,470),(527,425),(514,397),(503,357),(506,310),(537,282),(552,255),(605,251),(642,277),(643,312),(654,335),(674,364),(699,371),(807,373),(807,401),(697,396),(668,405),(649,419),(654,459),(675,495),(688,538),(691,581),(721,616),(721,636),(660,636),(651,609),(633,560),(590,522),(562,548),(542,586),(525,633)]
  recovery=[(718,636),(732,583),(757,522),(783,476),(790,432),(789,399),(782,367),(780,320),(808,289),(840,265),(881,267),(901,289),(903,317),(912,342),(917,399),(925,430),(1034 if id=='krule' else 1015,481),(1034 if id=='krule' else 1015,505),(910,458),(897,457),(902,487),(925,523),(934,561),(934,598),(961,621),(960,636),(892,636),(882,602),(873,566),(838,526),(810,552),(788,601),(776,635)]
  if id=='krule':recovery=[(717,630),(734,576),(756,522),(781,478),(796,427),(788,390),(787,342),(803,311),(836,289),(846,265),(878,259),(909,269),(918,293),(915,322),(925,344),(930,386),(925,420),(918,438),(1034,481),(1034,507),(905,456),(898,458),(906,491),(928,519),(935,561),(935,592),(957,614),(956,629),(892,629),(883,606),(876,566),(840,524),(812,548),(790,588),(778,628)]
  if id=='jeeves':return first+polygons(im,[contact])+first[:1]+first[:1]
  return first+polygons(im,[contact,recovery])+first[:1]
 if anim=='climb' :return polygons(im,CLIMB_K if id=='krule' else CLIMB_J,True)
 if anim=='dive':return boxes(im,[(431,228,759,395),(671,332,972,510)] if id=='krule' else [(416,194,746,383),(679,303,961,478)],True)
 if anim in ('entry','ropePose'):
  n=5 if anim=='entry' else 4
  rects=[(i*1200/n+8,212,(i+1)*1200/n-6,639) for i in range(n)]
  return boxes(im,rects,True) if anim=='entry' else boxes(im,rects[-1:],True)
 if anim=='guitar':return boxes(im,[(14,220,244,611),(248,172,477,611),(966,220,1185,611)])
 # Bright sheet backgrounds and thin panel rules do not define the sprite.
 a=np.array(im).copy();v=a.astype('int16')
 if anim in ('jump','throw'):
  fg=v.min(2)<150;line=ndi.binary_opening(fg,structure=np.ones((1,round(w*.35)),bool));support=ndi.binary_opening(fg,structure=np.ones((17,1),bool))
  a[ndi.binary_dilation(line,iterations=2)&~support]=255
  # Printed dust under the boots belongs to the sheet; the engine draws impacts.
  dust=(np.arange(h)[:,None]>h*.86)&(v[:,:,0]>100)&(v[:,:,1]>65)&(v[:,:,2]>35)&(v[:,:,0]>v[:,:,2]*1.3)&(v[:,:,1]>v[:,:,2]*1.1)
  a[dust]=255
 im=Image.fromarray(a)
 if anim=='jump' and id=='jeeves':return boxes(im,[(36,344,253,640),(320,266,578,620),(610,204,904,543),(963,345,1170,640)])
 dark=(a.max(2)<100).mean(1);heads=np.where((dark>.58)&(np.arange(h)<h*.31))[0];start=int(heads[-1]+7) if len(heads) else int(h*.23)
 region=np.zeros((h,w),bool);region[start:h-12,8:w-8]=True
 items=clean(im,region);items=[v for v in items if v['h']<h*.85 and (v['w']<w*.6 or anim=='ko')]
 if anim in ('walk','run','carryChair','down') or (anim=='ko' and id=='krule'):
  rows=[[],[]]
  for v in items:rows[int(v['y']+v['h']/2>h*.6)].append(v)
  items=[v for row in rows for v in sorted(row,key=lambda a:a['x'])]
 else:items.sort(key=lambda a:a['x'])
 if anim in ('walk','run'):items=items[len(items)//2:]
 if anim=='down':items=[items[1],items[-1]]
 if anim=='thrown':items=[v for v in items if v['h']>v['w']*.23]
 if anim=='ko':items=items[-1:]
 if anim=='defeat':items=items[-1:]
 return items


def extract(im,anim,id):
 items=_extract(im,anim,id)
 if anim in ('entry','ropePose'):
  for v in items:
   a=np.array(v['image']).copy();fg=a[:,:,3]>0
   line=ndi.binary_opening(fg,structure=np.ones((1,35),bool))
   support=ndi.binary_opening(fg,structure=np.ones((11,1),bool))
   a[ndi.binary_dilation(line,iterations=1)&~support,3]=0
   v['image']=Image.fromarray(a)
 if id=='krule':
  # Krule wears black/green gear. Large enclosed white regions are paper,
  # while Jeeves's authored white/gold tights must remain opaque.
  for v in items:
   a=np.array(v['image']).copy();rgb=a[:,:,:3].astype('int16');white=(rgb.min(2)>190)&(rgb.max(2)-rgb.min(2)<30)&(a[:,:,3]>0)
   labels,n=ndi.label(white);sizes=np.bincount(labels.ravel());remove=sizes>120;remove[0]=False;a[remove[labels],3]=0
   v['image']=Image.fromarray(a)
 return items
