"""Build the five supplied September packs, preserving every existing roster slot.
Usage: python tools/expansion33.py /path/to/extracted-folders
Source layouts are reviewed, not uniform sprite grids. Audit lists source hashes,
crops, and adaptations; output keeps original pixel proportions.
"""
import json, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageDraw
from scipy import ndimage as ndi
from roster_expansion import clean_mask
from sprite_anchor import frame_anchor
from apply_website_stats import apply

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets'
FIGHTERS=[('atiba','Atiba','#ffd126'),('jp-grayson','JP Grayson','#e53343'),('tommy','Tommy','#c9c9ce'),('shaggy-2-dope','Shaggy 2 Dope','#5aff24'),('jacksyn','Jacksyn','#bf642d')]
PATTERNS={'idle':'standing','walk':'walking.png','run':'running','chair':'attack with chair','bat':'attack with bat','guitar':'attack with guitar','trashcan':'attack with trashcan','carryChair':'walk with chair','carryBat':'walk with bat','carryGuitar':'walk with guitar','carryTrashcan':'walk with trashcan','lift':'lifting overhead','throw':'throwing','lifted':'being lifted','thrown':'being thrown','hurt':'dazed','fallBack':'falling back','fallFront':'falling forward','down':'laying','rise':'getting','taunt':'taunting','victory':'victory','defeat':'defeated','jump':'jumping.png','pin':'pinning','kick':'kicking','climb':'climbing on top','entry':'climbing through','dive':'jumping off','ropePose':'climbing on rope','ko':'passed out'}
OVERRIDES={'atiba':{'carryGuitar':'Atiba walk with giutar.png','rise':'Atiba getting back up.png'},'jp-grayson':{'idle':'JP Grayson standing.png','lifted':'JP getting lifted overhead.png','rise':'JP getting backup.png','climb':'JP climbing on corner rope.png','ropePose':'JP climb on rope.png'},'tommy':{'rise':'Tommy getting up.png','climb':'Tommy climbing on corner rope.png','entry':'Tommy walking through ropes.png'},'shaggy-2-dope':{'carryBat':'Shagy walk with bat.png','rise':'Shaggy getting up.png','lifted':'Shaggy getting lifted up.png','climb':'Shaggy climbing on corner rope.png'},'jacksyn':{'lift':'Jacksyn getting lifted up.png','rise':'Jacksyn getting up from facedown.png'}}

def selected(im,rect=None,poly=None,rope=False,preserve_white=False):
    w,h=im.size
    mask=Image.new('1',im.size)
    if poly: ImageDraw.Draw(mask).polygon([(x*w/1200,y*h/675) for x,y in poly],fill=1)
    else:
        x,y,r,b=rect or (8,200,1192,640)
        ImageDraw.Draw(mask).rectangle((x*w/1200,y*h/675,r*w/1200,b*h/675),fill=1)
    if preserve_white and not rope:
        a=np.array(im);fg=(a.min(2)<240)&np.array(mask,bool)
        fg=ndi.binary_closing(fg,iterations=1)&np.array(mask,bool)
        labels,n=ndi.label(fg);items=[]
        for k,s in enumerate(ndi.find_objects(labels),1):
            if not s:continue
            ys,xs=s;base=labels[s]==k;bh,bw=base.shape
            if base.sum()<2500 or bh<20 or bw<35:continue
            rgb=a[s].astype('int16')
            if ((rgb.max(2)-rgb.min(2)>50)&base).sum()<base.sum()*.04:continue
            holes=ndi.binary_fill_holes(base)&~base
            # Retain white face paint and costume detail, leaving lower body gaps.
            alpha=base|(holes&(np.arange(bh)[:,None]<bh*.6))
            items.append(dict(image=Image.fromarray(np.dstack((a[s],alpha.astype('uint8')*255))),x=xs.start,y=ys.start,w=bw,h=bh,area=int(alpha.sum())))
    else:items=clean_mask(im,np.array(mask,bool),rope=rope,minheight=20)
    return items

def extract(im,anim,id):
    from functools import partial
    selected=partial(globals()['selected'],preserve_white=id=='shaggy-2-dope')
    w,h=im.size
    # Erase pale printed grid lines, preserving saturated clothing and dark outlines.
    a=np.array(im).copy();v=a.astype('int16')
    if id!='shaggy-2-dope':a[(v.min(2)>175)&(v.max(2)-v.min(2)<18)]=255
    if anim in ('throw','jump','thrown'):
        yy=np.arange(h)[:,None]
        dust=(yy>h*.80)&(v[:,:,0]>100)&(v[:,:,1]>65)&(v[:,:,2]>35)&(v[:,:,0]>v[:,:,2]*1.25)&(v[:,:,1]>v[:,:,2]*1.1)
        shadow=(yy>h*.7)&(v.max(2)-v.min(2)<15)&(v.min(2)>65)&(v.max(2)<180)
        a[dust|shadow]=255
    im=Image.fromarray(a)
    if anim=='climb':
        # Three top-of-corner poses; earlier bodies intersect printed posts.
        polys=[[(700,370),(711,334),(764,284),(816,276),(840,305),(829,343),(848,386),(842,404),(823,396),(811,380),(797,382),(808,410),(817,422),(807,434),(773,432),(755,407),(743,414),(752,431),(749,443),(714,445),(701,428),(710,405)],[(860,351),(874,311),(920,264),(957,240),(988,246),(997,275),(986,303),(1003,325),(1020,343),(1020,368),(1005,372),(990,350),(975,343),(990,371),(988,401),(991,415),(1000,425),(995,437),(951,438),(944,424),(951,392),(936,380),(916,404),(908,439),(906,462),(879,462),(873,444),(880,410),(890,377),(876,367),(872,378),(861,375)],[(1027,329),(1044,286),(1081,248),(1090,214),(1128,203),(1146,220),(1145,250),(1165,290),(1190,313),(1195,341),(1180,345),(1162,328),(1142,310),(1155,365),(1153,406),(1169,421),(1167,441),(1119,441),(1116,423),(1118,384),(1103,360),(1087,400),(1080,430),(1080,460),(1044,460),(1041,442),(1053,404),(1066,361),(1058,311),(1044,330),(1046,344),(1030,344)]]
        return [max(selected(im,poly=p,rope=True),key=lambda v:v['area']) for p in polys]
    if anim=='ropePose':return selected(im,(916,185,1188,623),rope=True)
    if anim=='entry':return selected(im,(969,185,1188,623),rope=True)
    if anim=='dive':
        # Only free-flight body, excluding takeoff post and landing dust/ring.
        rect=(395,215,785,412) if id=='jp-grayson' else (423,235,795,369) if id=='jacksyn' else (425,215,780,421)
        return [max(selected(im,rect),key=lambda v:v['area'])]
    if anim=='guitar':
        # Neighboring bodies overlap in the strike panel. Contact is supplied by
        # the wrestler's own forward throw with the existing isolated guitar prop.
        return [max(selected(im,r),key=lambda v:v['area']) for r in [(20,200,238,610),(250,150,470,610),(975,200,1180,610)]]
    if anim=='bat':
        # Crossed bats join adjacent bodies. Retain separate ready/wind-up poses;
        # contact receives an isolated body below after the whole sheet is read.
        top=125 if id=='shaggy-2-dope' else 200
        ready=[max(selected(im,r),key=lambda v:v['area']) for r in [(12,top,240,628),(242,140,474,628)]]
        contact=[(475,630),(493,561),(526,484),(514,437),(511,374),(516,290),(548,top),(615,top),(640,280),(637,330),(666,345),(687,354),(798,358),(798,389),(687,394),(651,412),(647,459),(678,515),(685,580),(719,613),(719,631),(655,631),(636,564),(594,516),(563,539),(534,595),(524,630)]
        return ready+[max(selected(im,poly=contact),key=lambda v:v['area'])]
    if anim=='chair':
        return [max(selected(im,r),key=lambda v:v['area']) for r in [(12,100,237,634),(244,100,475,634),(482,235,730,634),(739,235,959,634),(967,190,1190,634)]]
    start=195 if anim not in ('walk','run','carryChair','kick','ko') else (140 if anim=='ko' else 125 if anim=='carryChair' else 165)
    if anim in ('throw','carryBat'):start=155
    if id=='shaggy-2-dope':start=90 if anim in ('carryChair','lift') else 110
    items=selected(im,(8,start,1192,635))
    items=[v for v in items if v['h']<h*.83 and (v['w']<w*.58 or anim=='ko')]
    if anim=='thrown':items=[v for v in items if v['h']>v['w']*.25]
    if anim in ('walk','run','carryChair','kick','down'):
        rows=[[],[]]
        for v in items:rows[int(v['y']+v['h']/2>h*.61)].append(v)
        rows=[sorted(row,key=lambda v:v['x']) for row in rows]
        if anim in ('walk','run','kick'):items=rows[1]
        elif anim=='carryChair':items=rows[0]
        else:items=rows[0][-1:]+rows[1][-1:]
    else:items.sort(key=lambda v:v['x'])
    if anim=='defeat':items=items[-1:]
    if anim=='ko':items=[max(items,key=lambda v:v['area'])]
    return items

def main(src):
    roster=json.loads((OUT/'roster.json').read_text());audit=[]
    if len(sys.argv)>2 and (ROOT/'tools/expansion33-audit.json').exists():
        audit=[v for v in json.loads((ROOT/'tools/expansion33-audit.json').read_text()) if v['fighter'] not in sys.argv[2:]]
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
        # Four-direction rope sheets include apron/post fragments. The clean
        # crouched corner pose supplies the setup animation instead.
        parts['ropePose']=parts['climb'][:1]
        if id in ('atiba','tommy','jacksyn'):
            # Shared dust joins later fall poses; use this fighter's clean ground pose.
            parts['fallFront']=parts['fallFront'][:2]+parts['down'][-1:]
        if id=='atiba':parts['hurt']=parts['idle'][:1];parts['defeat']=parts['pin'][1:2]
        if id=='tommy':parts['throw']=[parts['lift'][0],parts['lift'][1],parts['lift'][-1],parts['kick'][2],parts['idle'][-1]];parts['victory']=parts['taunt'][-1:]
        if id=='jacksyn':parts['thrown']=[parts['lifted'][-1],parts['fallBack'][2],parts['down'][-1]]
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
        record=dict(id=id,name=name,style='All-rounder',color=color,power=1,speed=1,technique=1,toughness=1,finisher='LUNACY FINISHER',edition='2026-09',animations=A,weapons=['chair','bat','guitar','trashcan'],guitarGrip={'xFromRight':10,'height':.64},atlas=f'./assets/{id}.png',atlasSize=list(atlas.size))
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
    (ROOT/'tools/expansion33-audit.json').write_text(json.dumps(audit,indent=2))

if __name__=='__main__':main(Path(sys.argv[1]))
