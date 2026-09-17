"""Prepare the supplied DJ Clay, Jeff Lane and Shane Mercer packs.
Usage: python tools/expansion36.py /path/to/extracted-folders [fighter-id...]
Coordinates normalized to 1200 x 675, without distorting source proportions.
"""
import json, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageDraw
from scipy import ndimage as ndi
from expansion33 import selected, PATTERNS as PREVIOUS_PATTERNS
from sprite_anchor import frame_anchor
from apply_website_stats import apply
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets'
FIGHTERS=[('dj-clay','DJ Clay','#28caff'),('jeff-lane','Jeff Lane','#73ee28'),('shane-mercer','Shane Mercer','#ef6332')]
PATTERNS={**PREVIOUS_PATTERNS,'special':'Bass Blast'}
OVERRIDES={
 'dj-clay':{'rise':'Clay getting back up.png','lifted':'Clay getting lifted overhead.png','climb':'Clay climb on top corner rope.png','entry':'Clay climb through rope.png','ropePose':'Clay climb on rope.png'},
 'jeff-lane':{'rise':'JL getting back up.png','lifted':'JL being lifted up.png','climb':'JL climbing top ropes.png','entry':'JL climb through ropes.png','ropePose':'JL climb on ropes.png','carryBat':'JL walking with bat.png','carryGuitar':'JL walking with guitar.png'},
 'shane-mercer':{'rise':'SM getting back up.png','lifted':'SM getting lifted up.png'}
}

def extract(im,anim,id):
    # A pale grid line must not join neighboring figures. Internal white armor
    # is retained by connected silhouette hole filling.
    a=np.array(im);v=a.astype('int16');a[(v.min(2)>175)&(v.max(2)-v.min(2)<15)]=255
    im=Image.fromarray(a)
    def items(rect=None,poly=None):
        found=selected(im,rect,poly,preserve_white=True)
        if id!='dj-clay':
            # These two costumes have no large white panels. Keep small logo
            # details, but clear enclosed white background between raised arms.
            for frame in found:
                pixels=np.array(frame['image']);white=(pixels[:,:,:3].min(2)>235)&(pixels[:,:,3]>0)
                labels,n=ndi.label(white);sizes=np.bincount(labels.ravel());remove=sizes>500;remove[0]=False
                pixels[:,:,3][remove[labels]]=0;frame['image']=Image.fromarray(pixels)
        return found
    def largest(rect=None,poly=None):return max(items(rect,poly),key=lambda x:x['area'])
    if anim=='climb':
        # Use two/three complete top poses, outlining soles above black posts.
        if id=='dj-clay':
            polys=[[(698,195),(853,195),(853,360),(815,390),(781,396),(767,377),(754,416),(713,416),(696,365)],[(860,140),(1040,140),(1040,323),(1002,380),(949,387),(947,365),(936,415),(881,419),(859,335)],[(1034,104),(1191,104),(1191,304),(1177,345),(1185,397),(1131,407),(1117,383),(1100,417),(1051,417),(1057,353),(1034,311)]]
        elif id=='jeff-lane':
            polys=[[(851,202),(1019,202),(1019,342),(1001,369),(1001,413),(951,419),(948,382),(920,408),(909,459),(876,468),(863,445),(876,394),(848,339)],[(1028,170),(1189,170),(1189,325),(1174,355),(1187,416),(1154,427),(1129,409),(1117,385),(1084,437),(1043,433),(1048,397),(1065,345),(1028,328)]]
        else:
            polys=[[(856,228),(1018,228),(1018,343),(1000,356),(989,378),(1001,411),(964,423),(949,410),(934,389),(911,435),(910,461),(884,466),(873,448),(882,416),(898,372),(856,348)],[(1028,190),(1185,190),(1185,327),(1163,353),(1164,389),(1174,409),(1166,420),(1129,420),(1112,403),(1111,370),(1095,394),(1082,438),(1055,441),(1048,427),(1059,379),(1068,345),(1028,328)]]
        return [largest(poly=p) for p in polys]
    if anim in ('ropePose','entry'):
        # Audit the supplied scenery sheet; runtime uses clean own poses below.
        return [largest((970,185,1192,625))]
    if anim=='dive':
        rect={'dj-clay':(451,215,789,432),'jeff-lane':(438,170,788,414),'shane-mercer':(447,182,768,416)}[id]
        return [largest(rect)]
    if anim=='special':
        # Keep the cyan sound waves, which are separate components from the body.
        result=[]
        for rect in [(50,48,310,330),(435,54,721,332),(887,55,1175,332),(48,364,399,633),(426,354,868,633),(905,350,1175,635)]:
            x,y,r,b=rect;w,h=im.size;crop=im.crop((round(x*w/1200),round(y*h/675),round(r*w/1200),round(b*h/675)));rgb=np.array(crop);fg=rgb.min(2)<240
            labels,n=ndi.label(fg);sizes=np.bincount(labels.ravel());keep=sizes>12;keep[0]=False;fg=keep[labels];fg=ndi.binary_fill_holes(fg)
            ys,xs=np.where(fg);s=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1));pic=Image.fromarray(np.dstack((rgb[s],fg[s].astype('uint8')*255)))
            result.append(dict(image=pic,x=round(x*w/1200)+int(xs.min()),y=round(y*h/675)+int(ys.min()),w=pic.width,h=pic.height,area=int(fg.sum())))
        return result
    if anim=='bat':
        regions=[(5,145,240,603),(217,114,465,608)]
        poly=[(465,197),(650,197),(676,314),(780,339),(780,393),(678,400),(674,465),(705,609),(466,610)]
        if id=='dj-clay':poly=[(459,197),(649,197),(660,335),(766,346),(766,380),(667,384),(665,490),(700,593),(461,595)]
        return [largest(r) for r in regions]+[largest(poly=poly)]
    if anim=='trashcan' and id=='dj-clay':
        return [largest(r) for r in [(4,220,239,636),(243,210,478,636),(475,109,707,636),(708,245,993,638),(992,255,1197,638)]]
    if anim=='guitar':
        regions=[(12,210,233,590),(246,148,480,590),(966,210,1190,590)] if id=='jeff-lane' else [(12,185,238,626),(249,119,474,626),(976,180,1192,626)]
        return [largest(r) for r in regions]
    start=110
    if anim=='fallFront' and id!='shane-mercer':start=80
    if anim=='idle':start=100
    if anim=='ko':start=145
    found=items((6,start,1194,640))
    found=[v for v in found if v['h']>im.height*.07 and (v['w']<im.width*.62 or anim=='ko')]
    rows=anim in ('walk','run','carryChair','kick','down') or (id in ('dj-clay','jeff-lane') and anim in ('fallFront','rise'))
    if rows:
        split=im.height*(.58 if anim in ('fallFront','rise') else .61)
        top=sorted([v for v in found if v['y']+v['h']/2<split],key=lambda v:v['x']);bottom=sorted([v for v in found if v['y']+v['h']/2>=split],key=lambda v:v['x'])
        if anim in ('walk','run','kick','carryChair'):found=bottom
        elif anim=='down':found=top[-1:]+bottom[-1:]
        else:found=top+bottom
    else:found.sort(key=lambda v:v['x'])
    if anim=='defeat':found=found[-1:]
    if anim=='ko':found=[max(found,key=lambda v:v['area'])]
    return found

def main(src):
    roster=json.loads((OUT/'roster.json').read_text());audit=[]
    if len(sys.argv)>2 and (ROOT/'tools/expansion36-audit.json').exists():
        audit=[v for v in json.loads((ROOT/'tools/expansion36-audit.json').read_text()) if v['fighter'] not in sys.argv[2:]]
    for id,name,color in FIGHTERS:
        if len(sys.argv)>2 and id not in sys.argv[2:]:continue
        files=sorted((src/name).glob('*.png'));parts={};used=set()
        for anim,pattern in PATTERNS.items():
            p=next((p for p in files if pattern.lower() in p.name.lower()),None)
            if anim in OVERRIDES.get(id,{}):p=src/name/OVERRIDES[id][anim]
            if p is None:continue
            original=Image.open(p).convert('RGB');im=ImageOps.contain(original,(1600,1067))
            found=extract(im,anim,id)
            if not found:raise ValueError(f'No usable {id} {anim}: {p.name}')
            parts[anim]=found;used.add(p)
            audit.append(dict(fighter=id,animation=anim,source=str(p.relative_to(src)),sourceSHA256=hashlib.sha256(p.read_bytes()).hexdigest(),count=len(found),bounds=[{k:v[k] for k in ('x','y','w','h')} for v in found]))
        assert used==set(files),(id,'Unmapped source',set(files)-used)
        # Source gaps and scenery are covered with this fighter's own art.
        parts['ropePose']=parts['climb'][:1]
        parts['entry']=parts['idle'][-1:] if 'idle' in parts else parts['taunt'][1:2]
        if id=='jeff-lane':
            parts['idle']=parts['taunt'][1:2]
            parts['throw']=[parts['lift'][0],parts['lift'][1],parts['lift'][-1],parts['kick'][2],parts['idle'][0]]
        if id=='dj-clay':
            parts['idle']=parts['idle'][-1:]
            parts['down'][1]['image']=ImageOps.mirror(parts['down'][1]['image'])
        # Normalize each authored sequence to the same 220 px standing scale.
        frames=[];A={};preview=[]
        portrait=parts['idle'][0]['image'].copy();portrait.thumbnail((220,320));portrait.save(OUT/f'{id}-portrait.png')
        for anim,items in parts.items():
            if anim=='idle':items=items[-1:]
            ref=max(v['h'] for v in items)
            if anim in ('chair','guitar','trashcan','bat'):ref=items[0]['h']
            elif anim in ('down','ko'):ref=max(v['w'] for v in items)*1.07
            elif anim=='defeat':ref=items[0]['h']/.58
            elif anim in ('fallFront','fallBack','rise'):ref=max(v['h'] for v in items)
            elif anim=='jump':ref/= .76
            elif anim=='dive':ref=max(v['w'] for v in items)*.90
            elif anim=='lifted':ref=items[0]['h']/.84
            elif anim=='thrown':ref=items[0]['h']/.88
            elif anim=='run':ref/=.83
            elif anim=='climb':ref=items[-1]['h']
            elif anim=='special':ref=items[0]['h']
            entry=[]
            for i,v in enumerate(items):
                pic=v['image'];scale=min(220/ref,380/pic.width,330/pic.height)
                pic=pic.resize((round(pic.width*scale),round(pic.height*scale)),Image.Resampling.LANCZOS)
                if anim=='carryGuitar':pic=ImageOps.mirror(pic)
                e=dict(frame=len(frames),w=pic.width,h=pic.height,**frame_anchor(pic,anim));entry.append(e);frames.append(pic);preview.append((anim,i,pic))
            A[anim]=entry
        A['light']=[A['throw'][0],A['throw'][3],A['throw'][-1],A['idle'][0]]
        A['heavy']=A['chair'];A['grapple']=A['throw'][:1];A['exhausted']=A['hurt'];A['kneel']=A['defeat']
        base=next(f for f in roster if f['id']=='matt-cross');e=base['animations']['propGuitar'][0]
        prop=Image.open(OUT/'matt-cross.png').crop((e['x'],e['y'],e['x']+e['w'],e['y']+e['h']))
        A['propGuitar']=[dict(frame=len(frames),w=prop.width,h=prop.height,**frame_anchor(prop,'propGuitar'))];frames.append(prop)
        A['guitar']=[A['guitar'][0],A['guitar'][1],A['throw'][3],A['guitar'][-1]]
        # Bat follows a full wind-up; use intact ready as recovery. Actual contact
        # frame is isolated from the sheet by a polygon in the next review pass.
        A['bat']=[A['bat'][0],A['bat'][1],A['bat'][2],A['bat'][0]]
        width=2048;x=y=rowh=0;positions=[]
        for pic in frames:
            if x+pic.width+4>width:y+=rowh+4;x=0;rowh=0
            positions.append((x,y));x+=pic.width+4;rowh=max(rowh,pic.height)
        atlas=Image.new('RGBA',(width,y+rowh+4))
        for pic,pos in zip(frames,positions):atlas.alpha_composite(pic,pos)
        for entries in A.values():
            for e in entries:e['x'],e['y']=positions[e['frame']]
        atlas.save(OUT/f'{id}.png')
        record=dict(id=id,name=name,style='All-rounder',color=color,power=1,speed=1,technique=1,toughness=1,finisher='BASS BLAST' if id=='dj-clay' else 'LUNACY FINISHER',edition='2026-09',animations=A,weapons=['chair','bat','guitar','trashcan'],guitarGrip={'xFromRight':10,'height':.64},atlas=f'./assets/{id}.png',atlasSize=list(atlas.size))
        slot=next((i for i,f in enumerate(roster) if f['id']==id),None)
        if slot is None:roster.append(record)
        else:roster[slot]=record
        sheet=Image.new('RGB',(1600,((len(preview)+7)//8)*260),'#393344');d=ImageDraw.Draw(sheet)
        for i,(anim,j,pic) in enumerate(preview):
            x=i%8*200;y=i//8*260;pic=ImageOps.contain(pic,(194,225));sheet.paste(pic,(x+(200-pic.width)//2,y+250-pic.height),pic);d.text((x+5,y+5),f'{anim} {j}',fill='white')
        sheet.save(ROOT/'tools'/f'review-{id}.jpg',quality=90)
        print(id,len(frames),atlas.size,flush=True)
    roster=apply(roster,json.loads((OUT/'website-stats.json').read_text()))
    (OUT/'roster.json').write_text(json.dumps(roster,separators=(',',':')))
    (ROOT/'tools/expansion36-audit.json').write_text(json.dumps(audit,indent=2))

if __name__=='__main__':main(Path(sys.argv[1]))
