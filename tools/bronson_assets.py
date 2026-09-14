"""Father Bronson's illustrated sheets: reviewed single-body crops, not grids."""
import numpy as np
from PIL import Image,ImageDraw,ImageOps
from roster_expansion import clean_mask
FIGHTER=('father-bronson','Father Bronson','The Red Bloom','#dd243d',1.1,1,1.1,'THE RED BLOOM')
NAMES={'idle':'Father Bronson 4 way stance.png','walk':'Father Bronson Walking.png','run':'Father Bronson Running.png',
 'chair':None,'bat':'Father Bronson atk with bat.jpeg','guitar':'Father Bronson atk with guitar.jpg','trashcan':'Father Bronson atk w trashcan.jpg',
 'carryChair':'Father Bronson walk with chair.png','carryBat':'Father Bronson walk with bat.jpg','carryGuitar':'Father Bronson walk left w guitar.jpg','carryTrashcan':'Father Bronson walk w trashcan.jpeg',
 'lift':'Father Bronson lift overhead.jpg','throw':'Father Bronson throwing.png','grapple':'Father Bronsons lift overhead 2.jpg',
 'hurt':'Father Bronson dazed.jpg','fallBack':'Father Bronson falling left.png','fallBackReverse':'Father Bronson falling right.jpg','fallFront':'Father Bronson fall forward.jpeg',
 'down':'Father Bronson Lying down-up.png','rise':'Father Bronson getting up.jpg','taunt':'Father Bronson taunt.jpg','victory':'Father Bronson victory.jpg',
 'defeat':'Father Bronson lose pose 2.jpg','kneel':'Father Bronson lose pose.jpg','exhausted':'Father Bronson passed out.jpg',
 'jump':'Father Bronson Jumping & landing.png','pin':'Father Bronson pinning.jpg','elbow':'Father Bronson Elbow Attack.png','kick':'Father Bronson Kick.png',
 'climb':'Father Bronson Climbing rops on top.jpg','ropePose':'Father Bronson climbing ropes.jpg','entry':'Father Bronson walking through ropes.jpg','dive':'Father Bronson top rope jump.jpg'}
# Coordinates in the 1600×900 normalized sheet; rope-color repair operates
# only inside these outlines so the red coat remains opaque.
CLIMB=[
 [(28,522),(162,521),(173,544),(201,537),(202,565),(191,598),(185,637),(171,657),(176,735),(191,793),(176,802),(183,832),(199,839),(199,861),(146,861),(144,803),(81,804),(72,840),(72,863),(37,863),(36,841),(46,798),(36,794),(62,693),(65,650),(32,632)],
 [(287,492),(371,490),(379,536),(402,540),(436,550),(438,578),(419,588),(402,589),(404,623),(416,640),(406,670),(394,690),(412,710),(410,729),(364,730),(348,715),(333,748),(304,801),(312,826),(308,848),(283,850),(262,829),(259,798),(281,751),(251,742),(244,719),(276,660),(294,612)],
 [(521,431),(603,428),(605,512),(624,534),(649,540),(651,565),(630,575),(623,589),(635,608),(628,635),(613,655),(638,665),(637,688),(595,691),(578,675),(559,710),(539,738),(547,751),(541,770),(507,767),(488,746),(488,727),(511,687),(491,678),(509,597)],
 [(745,386),(831,384),(839,457),(861,482),(887,490),(895,509),(878,516),(861,505),(848,510),(865,533),(867,550),(845,552),(839,575),(827,604),(840,617),(870,620),(871,641),(829,646),(810,633),(784,658),(756,687),(764,705),(757,721),(733,718),(711,696),(713,678),(728,649),(707,627),(731,551)],
 [(931,437),(1008,363),(1086,359),(1084,404),(1062,432),(1080,462),(1104,481),(1122,497),(1124,514),(1109,516),(1094,503),(1082,512),(1079,537),(1066,551),(1050,564),(1021,563),(1008,562),(1005,588),(976,598),(959,593),(941,579),(929,570)],
 [(1156,438),(1229,360),(1319,354),(1320,401),(1294,433),(1313,465),(1343,486),(1354,501),(1350,516),(1332,516),(1317,503),(1302,517),(1297,539),(1282,559),(1251,567),(1236,563),(1217,569),(1216,597),(1205,611),(1184,606),(1165,587),(1152,565)],
 [(1368,411),(1434,296),(1490,279),(1520,282),(1529,326),(1520,364),(1528,399),(1553,431),(1555,450),(1544,458),(1530,450),(1519,456),(1550,471),(1549,493),(1537,516),(1555,531),(1556,549),(1511,554),(1492,538),(1494,512),(1475,506),(1451,541),(1441,559),(1462,570),(1464,590),(1440,592),(1421,573),(1420,542),(1427,514),(1400,510),(1397,488),(1420,429),(1400,429),(1381,446),(1368,446)]
]
ENTRY=[[(35,387),(131,333),(255,328),(286,366),(302,402),(299,471),(296,510),(270,514),(257,502),(243,514),(250,568),(252,604),(243,640),(232,673),(238,695),(261,709),(268,728),(243,739),(191,731),(175,707),(179,674),(181,646),(143,641),(122,680),(113,726),(119,759),(113,783),(82,788),(65,767),(58,738),(69,702),(87,670),(65,675),(40,660),(35,637),(55,548),(67,511),(44,487)],
 [(358,382),(466,331),(579,328),(605,357),(616,408),(611,470),(615,508),(586,514),(569,503),(554,514),(591,548),(592,580),(575,611),(563,644),(570,676),(595,693),(595,716),(550,720),(514,704),(504,676),(507,639),(487,627),(465,646),(439,690),(425,728),(432,755),(429,782),(403,787),(383,775),(366,749),(363,725),(378,686),(391,665),(374,670),(353,658),(345,638),(366,555),(382,516),(371,499)],
 [(680,387),(790,335),(908,332),(930,362),(934,408),(929,469),(932,509),(906,518),(884,507),(872,518),(906,548),(915,581),(896,618),(884,664),(892,689),(915,709),(914,731),(864,735),(831,718),(818,694),(827,650),(802,642),(784,670),(761,704),(735,749),(745,773),(740,795),(713,799),(691,781),(673,754),(677,721),(692,691),(677,672),(663,650),(681,568),(701,520),(689,505)],
 [(1015,380),(1121,335),(1227,331),(1250,368),(1255,418),(1249,468),(1256,506),(1228,517),(1210,505),(1195,517),(1207,557),(1211,600),(1195,653),(1186,682),(1197,714),(1216,734),(1218,756),(1173,762),(1136,746),(1119,724),(1121,695),(1135,645),(1108,647),(1089,688),(1062,736),(1047,761),(1060,773),(1058,793),(1031,793),(1008,780),(987,757),(985,735),(1006,688),(996,672),(981,651),(1001,564),(1031,518),(1015,502)],
 [(1310,383),(1376,298),(1440,281),(1486,283),(1502,314),(1505,371),(1516,402),(1531,482),(1562,541),(1565,571),(1549,584),(1530,580),(1514,554),(1512,526),(1519,614),(1537,691),(1525,712),(1517,743),(1525,779),(1551,789),(1556,819),(1460,820),(1455,796),(1464,740),(1453,711),(1431,710),(1404,753),(1400,789),(1406,819),(1355,827),(1340,815),(1341,789),(1360,739),(1362,710),(1319,699),(1317,678),(1340,574),(1333,581),(1317,572),(1306,546)]]

def polygons(im,polys,rope=False):
    out=[];w,h=im.size
    for poly in polys:
        region=Image.new('1',im.size);ImageDraw.Draw(region).polygon([(x*w/1600,y*h/900) for x,y in poly],fill=1)
        items=clean_mask(im,np.array(region,dtype=bool),rope=rope,minheight=25)
        if items:out.append(max(items,key=lambda a:a['area']))
    return out

def extract(im,anim):
    w,h=im.size
    if anim=='elbow':
        a=np.array(im).copy();yy,xx=np.indices((h,w));a[(xx>w*.7075)&(xx<w*.77)&(yy>h*.31)&(yy<h*.53)]=255;im=Image.fromarray(a)
    if anim=='run':return polygons(im,[[(x1,236),(x2,236),(x2,500),(x1,500)] for x1,x2 in [(43,260),(289,536),(550,789),(814,1045),(1064,1309),(1340,1558)]])
    if anim=='jump':
        # The drawn floor line joins the first and last sprites. Remove only
        # thin horizontal rules outside vertical body support before cropping.
        from scipy import ndimage as ndi
        a=np.array(im).copy();fg=a.min(2)<118
        line=ndi.binary_opening(fg,structure=np.ones((1,round(w*.45)),dtype=bool))
        support=ndi.binary_opening(fg,structure=np.ones((19,1),dtype=bool))
        a[ndi.binary_dilation(line,iterations=1)&~support]=255;im=Image.fromarray(a)
        return polygons(im,[[(32,486),(323,486),(323,879),(32,879)],[(420,345),(734,345),(734,771),(420,771)],[(831,266),(1114,266),(1114,731),(831,731)],[(1250,471),(1512,471),(1512,879),(1250,879)]])
    if anim=='throw':return polygons(im,[[(18,400),(382,400),(382,873),(18,873)],[(372,300),(667,300),(667,873),(372,873)],[(654,224),(1044,224),(1044,841),(654,841)],[(1050,338),(1209,338),(1213,469),(1275,474),(1291,536),(1298,572),(1260,581),(1202,556),(1198,611),(1228,689),(1230,735),(1211,773),(1210,815),(1241,834),(1243,868),(1146,868),(1143,839),(1155,779),(1112,749),(1066,779),(1026,817),(1019,869),(959,869),(959,839),(987,787),(1008,748),(983,734),(961,709),(958,677),(1034,578),(1054,520)],[(1319,452),(1420,375),(1511,373),(1530,405),(1525,536),(1543,575),(1569,578),(1575,606),(1564,630),(1532,629),(1513,615),(1514,652),(1543,700),(1547,746),(1526,778),(1519,804),(1545,827),(1571,833),(1572,864),(1487,864),(1469,846),(1474,808),(1458,779),(1414,765),(1385,796),(1379,831),(1384,869),(1304,869),(1298,849),(1315,806),(1337,763),(1302,757),(1284,735),(1286,708),(1312,647),(1334,609),(1336,583),(1320,576)]])
    if anim=='climb':return polygons(im,CLIMB,True)
    if anim=='entry':return polygons(im,ENTRY,True)
    if anim=='ropePose':return polygons(im,[[(24,493),(89,481),(164,477),(184,500),(229,493),(232,524),(221,551),(224,583),(211,609),(205,672),(218,746),(220,789),(209,793),(214,824),(232,836),(231,856),(170,856),(162,803),(99,801),(87,832),(87,858),(43,858),(39,839),(56,794),(28,783),(39,735),(52,670),(58,620),(31,599)]],True)
    if anim=='kick':
        return polygons(im,[[(40,137),(276,137),(276,435),(40,435)],[(426,135),(635,135),(635,435),(426,435)],[(774,140),(947,140),(950,228),(1028,210),(1051,199),(1060,218),(1049,253),(1030,258),(995,269),(942,289),(901,336),(891,387),(877,432),(815,434),(825,400),(821,388),(786,366),(801,320),(774,279)],[(1266,136),(1471,136),(1471,435),(1266,435)]])
    if anim=='bat':
        return polygons(im,[[(12,327),(344,327),(344,867),(12,867)],[(321,218),(636,218),(636,865),(321,865)],[(726,350),(894,347),(936,463),(957,505),(1090,522),(1095,553),(941,540),(901,553),(890,589),(927,702),(965,813),(979,840),(978,862),(904,862),(895,821),(854,759),(797,739),(748,793),(710,837),(711,860),(645,860),(645,832),(684,762),(721,719),(705,710),(674,685),(626,665),(622,639),(646,582),(634,551),(731,547)],[(1054,357),(1231,352),(1242,512),(1238,561),(1338,580),(1343,615),(1233,609),(1223,670),(1226,731),(1234,801),(1266,829),(1264,858),(1185,858),(1177,824),(1177,760),(1120,746),(1083,773),(1042,815),(1044,849),(979,849),(975,827),(994,783),(1006,748),(968,729),(951,694),(950,657),(1026,613),(1067,567),(1057,558)],[(1337,351),(1545,351),(1542,569),(1588,702),(1589,746),(1574,758),(1537,734),(1534,790),(1579,827),(1578,857),(1492,857),(1484,829),(1450,780),(1412,758),(1375,800),(1348,826),(1340,853),(1273,853),(1273,826),(1294,784),(1307,749),(1266,720),(1258,688),(1307,644),(1341,606)]])
    if anim=='guitar':
        # Clean first, wind-up, and last frames. Overlapping contact is adapted
        # with Bronson's own throw body plus the existing isolated guitar prop.
        return polygons(im,[[(28,304),(314,304),(314,823),(28,823)],[(328,220),(641,220),(641,823),(328,823)],[(1287,304),(1579,304),(1579,823),(1287,823)]])
    if anim=='dive':return polygons(im,[[(642,417),(698,388),(702,363),(751,359),(785,372),(822,354),(841,328),(915,326),(945,353),(947,398),(941,421),(989,437),(1021,435),(1041,452),(1036,474),(1009,479),(974,468),(939,466),(925,498),(884,537),(865,556),(846,579),(817,580),(795,567),(775,562),(742,570),(704,554),(701,538),(677,547),(656,540),(650,525),(666,498),(682,482),(642,465)],[(1042,465),(1150,446),(1250,445),(1250,545),(1284,587),(1288,626),(1252,633),(1210,599),(1216,635),(1225,661),(1209,697),(1210,724),(1195,747),(1167,742),(1144,717),(1142,690),(1155,664),(1129,662),(1104,695),(1077,727),(1054,729),(1042,708),(1045,677),(1075,625),(1010,609),(977,605),(964,579),(964,549),(984,518),(1026,508)]],True)
    region=np.zeros((h,w),dtype=bool);start=.22
    if anim in ('elbow','carryChair'):start=.18
    region[int(h*start):h-8,8:w-8]=True
    items=clean_mask(im,region,minheight=25 if anim in ('fallFront','fallBack','fallBackReverse','rise','down') else 58)
    items=[a for a in items if a['w']<w*.55 and a['h']<h*.85]
    items.sort(key=lambda a:a['y']+a['h']/2);rows=[]
    for a in items:
        cy=a['y']+a['h']/2
        if not rows or cy-np.mean([b['y']+b['h']/2 for b in rows[-1]])>h*.24:rows.append([a])
        else:rows[-1].append(a)
    items=[a for row in rows for a in sorted(row,key=lambda a:a['x'])]
    if anim=='idle':items=[items[0],items[2]] # the source labels its side views in reverse
    if anim=='down':items=[items[1],items[-1]]
    if anim in ('defeat','exhausted'):items=items[-1:]
    if anim=='grapple':items=items[:2] # intact tie-up preparation; no fixed opponent
    if anim in ('fallBack','fallBackReverse'):items=items[:5]
    if anim=='fallBackReverse':
        for a in items:a['image']=ImageOps.mirror(a['image'])
    return items

def chair_frames(frames,A,anchor):
    """Compose the supplied chair with Bronson's own body; no new fighter art."""
    carry=frames[A['carryChair'][0]['frame']]
    # Isolate the outward chair from the first right-facing carrying frame.
    # The top-row source has a 273px body and chair at x=210..306, y=257..383.
    scale=carry.height/273
    prop=carry.crop((round(130*scale),round(83*scale),carry.width,round(212*scale)))
    prop.thumbnail((76,103))
    prepared=[]
    for body_key,body_index,position,angle in [('lift',4,'over',75),('throw',3,'front',-20)]:
        e=A[body_key][body_index];body=frames[e['frame']];gear=prop.rotate(angle,expand=True,resample=Image.Resampling.BICUBIC)
        x=round(body.width/2-gear.width/2) if position=='over' else body.width-16
        y=-gear.height+26 if position=='over' else round(body.height*.30-gear.height*.70)
        top=max(0,-y);left=max(0,-x);canvas=Image.new('RGBA',(max(body.width,x+gear.width)+left,body.height+top))
        canvas.alpha_composite(body,(left,top));canvas.alpha_composite(gear,(x+left,y+top))
        ent=dict(frame=len(frames),w=canvas.width,h=canvas.height,**anchor(canvas,'chair'));frames.append(canvas);prepared.append(ent)
    A['chair']=[A['carryChair'][0],prepared[0],prepared[1],prepared[1],A['carryChair'][0]]
