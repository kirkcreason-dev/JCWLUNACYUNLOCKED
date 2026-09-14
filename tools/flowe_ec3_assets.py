"""Reviewed September Steven Flowe/EC3 sheets; coordinates use 1200x675.
Only clean body poses are used; printed labels, ropes and scenery are excluded.
"""
import numpy as np
from PIL import Image,ImageDraw,ImageOps
from scipy import ndimage as ndi
from hokane_assets import clean_mask as base_clean_mask
def clean_mask(*args,**kwargs):
 items=base_clean_mask(*args,**kwargs)
 for item in items:
  a=np.array(item["image"]).copy();v=a[:,:,:3].astype("int16");white=(v.min(2)>190)&(v.max(2)-v.min(2)<30)&(a[:,:,3]>0)
  labels,n=ndi.label(white);sizes=np.bincount(labels.ravel());remove=sizes>120;remove[0]=False;a[remove[labels],3]=0
  if kwargs.get('rope'):
   labels,n=ndi.label(a[:,:,3]>0);sizes=np.bincount(labels.ravel());sizes[0]=0
   if n:a[labels!=sizes.argmax(),3]=0
  rgba=Image.fromarray(a);bounds=rgba.getbbox()
  if bounds:
   x,y,r,b=bounds;item['x']+=x;item['y']+=y;item['w']=r-x;item['h']=b-y;rgba=rgba.crop(bounds)
  item["image"]=rgba
 return items
FIGHTERS=[('steven-flowe','Steven Flowe','The Grunge Lord','#ef772d',1,1,1,'STEVEN FLOWESION'),('ec3','EC3','The Top 1%','#d7b66a',1,1,1,'ONE PERCENTER')]
COMMON={'idle':'standing','walk':'walking','run':'running','chair':'attack with chair','bat':'attack with bat','guitar':'attack with guitar','trashcan':'attack with trashcan','carryChair':'walking with chair','carryBat':'walking with bat','carryGuitar':'walking with guitar','carryTrashcan':'walking with trashcan','lift':'lifting overhead','throw':'throwing','lifted':'getting lifted overhead','thrown':'being thrown','hurt':'dazed','fallBack':'falling backwards','fallFront':'falling farwards','down':'laying facedown and faceup','rise':'getting up from facedown','taunt':'taunting','victory':'victory','defeat':'defeated','jump':'jumping','pin':'pinning','climb':'climbing on top rope','entry':'climbing through rope','dive':'Jumping off top ropes','ropePose':'climbing on rope','ko':'passed out'}
NAMES={'ec3':{k:'EC3 '+v+'.png' for k,v in COMMON.items()}}
NAMES['steven-flowe']={k:('SF ' if k in ['chair','bat','guitar','trashcan','lifted','thrown','hurt','fallBack','fallFront','down','rise','defeat','jump','climb','entry','dive','ropePose'] else 'SW ')+v+'.png' for k,v in COMMON.items()}
NAMES['steven-flowe'].update(idle='Steven Flowe standing.png',lift='SW getting lifted up.png',lifted='SF getting lifted up.png',fallFront='SF falling forward.png',climb='SF climbing on rope top corner.png',entry='SF climbing through rope.png',dive='SF jumping off top ropes.png',ropePose='SF climbing rope.png',carryTrashcan='SW trashcan.png')
for names in NAMES.values():names.update(exhausted=None,kneel=None,grapple=None,elbow=None,kick=None)
def polygons(im,polys,rope=False):
 out=[]
 for poly in polys:
  m=Image.new('1',im.size);ImageDraw.Draw(m).polygon([(x*im.width/1200,y*im.height/675) for x,y in poly],fill=1)
  found=clean_mask(im,np.array(m,bool),rope=rope,minheight=25)
  if found:out.append(max(found,key=lambda a:a['area']))
 return out
def boxes(im,rects,rope=False):return polygons(im,[[(x,y),(r,y),(r,b),(x,b)] for x,y,r,b in rects],rope)
# Six side-facing climb silhouettes. Start/back view is occluded by its post.
CLIMB_SF=[[(196,595),(216,509),(206,472),(224,396),(258,350),(297,351),(309,381),(292,401),(317,424),(325,440),(314,449),(300,448),(307,469),(306,490),(294,522),(317,531),(316,545),(274,546),(273,530),(277,502),(257,509),(239,550),(233,583),(240,596)],[(370,574),(383,505),(375,445),(393,375),(426,327),(464,327),(478,354),(465,378),(485,410),(498,421),(498,436),(482,439),(468,447),(478,469),(472,487),(486,493),(486,510),(446,511),(443,494),(447,471),(421,468),(407,510),(400,558),(414,570)],[(540,528),(543,489),(556,443),(540,397),(551,352),(587,303),(638,291),(648,317),(637,337),(636,369),(660,396),(674,403),(674,416),(652,422),(632,420),(633,435),(645,444),(644,459),(606,468),(602,452),(609,419),(587,418),(577,448),(570,484),(560,513),(574,524)],[(708,453),(720,414),(704,377),(714,336),(759,304),(790,291),(815,295),(821,317),(808,338),(823,358),(829,383),(842,398),(842,414),(823,421),(809,400),(801,401),(794,418),(796,430),(815,435),(813,447),(774,448),(760,438),(764,415),(747,417),(741,440),(745,453)],[(860,327),(884,291),(927,252),(970,248),(985,268),(978,292),(984,316),(1006,339),(1016,349),(1016,369),(1002,373),(991,354),(979,350),(988,361),(988,389),(978,420),(995,429),(993,442),(954,442),(950,428),(957,390),(928,378),(913,403),(907,439),(906,455),(882,460),(880,449),(890,411),(900,379),(895,349),(883,342),(875,367),(862,363)],[(1034,328),(1049,276),(1071,249),(1078,223),(1109,212),(1132,221),(1137,251),(1151,274),(1160,317),(1173,338),(1173,354),(1161,360),(1150,344),(1141,327),(1145,373),(1156,401),(1154,424),(1169,436),(1169,450),(1129,451),(1124,429),(1128,399),(1111,371),(1086,411),(1075,443),(1075,459),(1051,460),(1046,450),(1056,406),(1067,365),(1066,326),(1054,335),(1052,352),(1037,349)]]
CLIMB_EC=[[(199,573),(210,529),(219,485),(211,456),(219,408),(238,370),(270,351),(292,355),(292,379),(280,398),(301,411),(326,415),(330,430),(311,441),(295,434),(303,455),(307,477),(294,507),(309,514),(308,530),(269,530),(266,514),(273,481),(252,475),(238,497),(232,536),(224,561),(235,570)],[(368,572),(380,521),(389,484),(381,454),(393,405),(421,366),(449,341),(474,343),(476,367),(461,386),(475,410),(499,418),(500,431),(482,439),(465,433),(473,454),(478,472),(467,503),(483,513),(482,528),(445,529),(440,514),(447,487),(418,476),(403,509),(393,546),(391,560),(402,571)],[(537,516),(547,480),(555,441),(550,410),(562,363),(583,331),(617,302),(644,302),(647,323),(633,343),(640,368),(660,389),(662,407),(649,414),(634,406),(637,424),(632,451),(648,463),(647,478),(608,478),(605,463),(613,425),(586,417),(575,459),(564,493),(560,513),(570,525),(559,534)],[(712,431),(722,394),(713,369),(730,330),(762,307),(791,285),(819,288),(819,311),(803,331),(818,350),(824,383),(831,407),(823,427),(808,429),(798,408),(785,397),(782,413),(797,422),(795,434),(759,434),(751,422),(755,401),(743,407),(733,433)],[(865,319),(886,288),(925,256),(956,240),(978,247),(979,269),(965,288),(979,315),(1005,333),(1014,343),(1012,353),(999,354),(977,337),(979,354),(986,367),(981,398),(971,412),(990,417),(991,430),(952,431),(948,417),(958,378),(929,365),(910,392),(905,424),(904,439),(885,446),(882,432),(893,387),(901,360),(894,335),(881,331),(877,354),(862,350)],[(1032,321),(1048,279),(1074,250),(1081,220),(1100,207),(1128,215),(1133,240),(1129,258),(1150,278),(1163,308),(1174,324),(1174,341),(1163,346),(1153,331),(1135,309),(1137,351),(1152,378),(1151,405),(1164,413),(1166,426),(1125,429),(1121,413),(1128,383),(1105,357),(1088,391),(1079,422),(1078,438),(1055,444),(1052,430),(1061,391),(1074,353),(1070,317),(1051,328),(1050,343),(1034,341)]]
def extract(im,anim,id):
 w,h=im.size
 if anim=='bat':
  first=boxes(im,[(12,230,267 if id=='ec3' else 237,630),(240,158,474,630)])
  contact=[(477,630),(493,557),(522,487),(510,449),(514,400),(502,343),(506,286),(550,237),(613,237),(638,280),(636,317),(668,337),(689,347),(784 if id=='steven-flowe' else 800,345 if id=='steven-flowe' else 371),(784 if id=='steven-flowe' else 800,372 if id=='steven-flowe' else 398),(686,394),(654,398),(646,439),(660,479),(677,515),(682,574),(717,609),(717,630),(658,630),(649,605),(637,563),(593,515),(563,535),(540,579),(523,627)]
  if id=='ec3':contact=[(478,630),(484,581),(507,523),(532,469),(533,422),(528,391),(519,363),(520,309),(546,278),(577,251),(608,250),(633,269),(635,310),(649,326),(663,355),(689,363),(801,371),(801,398),(687,390),(660,400),(644,416),(650,457),(671,495),(684,536),(686,579),(717,611),(717,630),(663,630),(654,607),(636,561),(594,517),(561,545),(544,581),(523,624)]
  recovery=[(713,621),(726,576),(750,521),(773,469),(780,430),(769,407),(775,378),(759,333),(770,293),(805,261),(852,248),(878,268),(882,305),(895,330),(899,375),(917,405),(920,426),(1018,479),(1016,496),(996,492),(910,448),(893,445),(896,469),(921,509),(927,548),(930,581),(949,610),(949,625),(892,625),(884,600),(873,563),(832,519),(807,540),(784,585),(770,619)]
  if id=='ec3':recovery=[(725,627),(738,579),(762,517),(788,470),(794,428),(794,391),(785,355),(790,303),(823,275),(847,253),(880,252),(896,273),(897,317),(910,343),(914,393),(921,422),(1016,474),(1016,491),(905,451),(896,451),(900,481),(922,514),(929,554),(929,591),(953,611),(952,626),(897,626),(887,598),(876,560),(838,520),(811,545),(787,596),(775,625)]
  return first+polygons(im,[contact,recovery])+first[:1]
 if anim=='trashcan' and id=='steven-flowe':
  return boxes(im,[(12,240,249,629),(251,240,477,628),(478,151,686,627),(687,275,973,630),(919,275,1194,630)])
 if anim=='jump':
  a=np.array(im).copy();v=a.astype('int16');neutral=(v.max(2)-v.min(2)<20)&(v.min(2)>145);a[neutral]=255;im=Image.fromarray(a)
  return boxes(im,[(35,327,281,634),(306,249,557,624),(580,197,876,520),(941,327,1178,633)] if id=='steven-flowe' else [(49,359,275,638),(316,273,577,616),(628,204,907,546),(962,359,1167,638)])
 if anim=='climb' :return polygons(im,CLIMB_SF if id=='steven-flowe' else CLIMB_EC,True)
 if anim=='dive':
  return boxes(im,[(434,234,773,400),(670,370,955,501)] if id=='steven-flowe' else [(427,208,739,359),(651,337,973,438)],True)
 if anim in ('entry','ropePose'):
  # Separate panels contain complete silhouettes with only thin red ropes.
  n=5 if anim=='entry' else 4
  return boxes(im,[(i*1200/n+8,210,(i+1)*1200/n-6,636) for i in range(n)],True)[-1:] if anim=='ropePose' else boxes(im,[(i*240+8,220,(i+1)*240-6,636) for i in range(5)],True)
 if anim=='guitar':return boxes(im,[(16,225,239,607),(245,176,474,607),(967,224,1181,608)])
 # Remove pale printed grid lines without touching dark body outlines.
 a=np.array(im).copy();v=a.astype('int16');neutral=(v.max(2)-v.min(2)<15)&(v.min(2)>175);a[neutral]=255
 if anim in ('throw','jump'):
  v=a.astype('int16');dust=(np.arange(h)[:,None]>h*.84)&(v[:,:,0]>100)&(v[:,:,1]>65)&(v[:,:,2]>35)&(v[:,:,0]>v[:,:,2]*1.25)&(v[:,:,1]>v[:,:,2]*1.1);a[dust]=255
 im=Image.fromarray(a);dark=(a.max(2)<100).mean(1);heads=np.where((dark>.58)&(np.arange(h)<h*.31))[0];start=int(heads[-1]+7) if len(heads) else int(h*.24)
 region=np.zeros((h,w),bool);region[start:h-12,8:w-8]=True
 items=clean_mask(im,region,minheight=25)
 items=[v for v in items if v['h']<h*.85 and (v['w']<w*.6 or anim=='ko')]
 if anim in ('walk','run','carryChair','down'):
  rows=[[],[]]
  for v in items:rows[int(v['y']+v['h']/2>h*.6)].append(v)
  items=[v for row in rows for v in sorted(row,key=lambda a:a['x'])]
 else:items.sort(key=lambda a:a['x'])
 if anim in ('walk','run'):items=items[len(items)//2:] # right-facing row, five walks / six runs
 if anim=='down':items=[items[1],items[-1]]
 if anim=='thrown':items=[v for v in items if v['h']>v['w']*.23]
 if anim=='ko':items=items[-1:]
 if anim=='defeat':items=items[-1:]
 if anim=='fallBack' and id=='ec3':items=items[:3]+sorted(items[3:],key=lambda a:a['y'])
 return items
