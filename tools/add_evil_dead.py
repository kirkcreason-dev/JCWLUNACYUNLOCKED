"""Build Evil Dead's runtime atlas from the supplied, unmodified 31-sheet ZIP.

Run: python3 tools/add_evil_dead.py
Requires Pillow, NumPy and SciPy. Only Evil Dead's record/assets are written.
All coordinates are source-relative (1200 x 675), never image stretching.
"""
import hashlib
import io
import json
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage as ndi
from sprite_anchor import frame_anchor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/assets'
SOURCE = ROOT / 'source-packs/Evil-Dead.zip'
FILES = {
    'idle': 'standing', 'walk': 'walking', 'run': 'running', 'jump': 'jumping',
    'kick': 'kicking', 'chair': 'attack with chair', 'bat': 'attack with bat',
    'guitar': 'attack with guitar', 'trashcan': 'attack with trashcan',
    'carryChair': 'walk with chair', 'carryBat': 'walk with bat',
    'carryGuitar': 'walk with guitar', 'carryTrashcan': 'walk with trashcan',
    'lift': 'lifting overhead', 'throw': 'throwing', 'lifted': 'getting lifted overhead',
    'thrown': 'being thrown', 'hurt': 'dazed', 'down': 'laying facedown and faceup',
    'fallFront': 'falling forward', 'fallBack': 'falling backwards',
    'rise': 'getting up from facedown', 'taunt': 'taunting', 'victory': 'victory',
    'defeat': 'defeated', 'pin': 'pinning', 'climb': 'climbing on corner rope',
    'entry': 'climbing through rope', 'dive': 'jumping off corner rope',
    'ropePose': 'climbing on rope', 'ko': 'passed out',
}
# Isolate complete bodies above the ropes/post. Pose 6 is a side-facing perch.
CLIMBS = [
    [(638,100),(773,100),(783,155),(808,161),(811,177),(794,188),(777,183),
     (758,200),(774,227),(776,244),(795,251),(794,262),(759,270),(742,266),
     (740,244),(728,222),(703,222),(692,272),(683,313),(698,324),(697,337),
     (644,337),(644,322),(657,287),(653,246),(652,222),(640,223)],
    [(952,65),(1099,65),(1100,146),(1123,165),(1120,178),(1105,180),
     (1085,172),(1071,192),(1067,227),(1084,238),(1082,250),(1037,250),
     (1029,240),(1034,217),(1037,196),(1016,203),(1008,250),(990,285),
     (990,296),(1014,301),(1014,311),(960,313),(956,297),(967,265),
     (962,233),(964,207),(954,182)],
    [(543,365),(692,365),(695,419),(679,447),(668,471),(685,490),
     (697,501),(693,512),(676,516),(666,509),(654,495),(646,487),
     (634,505),(641,516),(639,525),(596,526),(582,520),(589,497),
     (581,481),(555,486),(543,470)],
]


def components(im, rect=None, poly=None):
    w, h = im.size
    region = Image.new('1', im.size)
    d = ImageDraw.Draw(region)
    if poly:
        d.polygon([(x*w/1200, y*h/675) for x, y in poly], fill=1)
    else:
        x, y, r, b = rect or (0, 0, 1200, 675)
        d.rectangle((x*w/1200, y*h/675, r*w/1200, b*h/675), fill=1)
    rgb = np.array(im)
    mask = ndi.binary_closing(rgb.min(2) < 240, iterations=1) & np.array(region, bool)
    labels, _ = ndi.label(mask)
    result = []
    for label, sl in enumerate(ndi.find_objects(labels), 1):
        if not sl:
            continue
        ys, xs = sl
        body = labels[sl] == label
        pixels = rgb[sl].astype('int16')
        # Headers/captions, impact marks and floor lines are not the brown costume.
        r, g, b = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]
        brown = (r > 35) & (r < 185) & (g > 15) & (g > b*1.15) & (r > g*1.12) & (r < g*2.4)
        if body.sum() < 2000 or (brown & body).sum() < 180:
            continue
        holes = ndi.binary_fill_holes(body) & ~body
        hl, _ = ndi.label(holes)
        sizes = np.bincount(hl.ravel())
        small = sizes < 220
        small[0] = False
        alpha = body | small[hl]
        pic = Image.fromarray(np.dstack((rgb[sl], alpha.astype('uint8')*255)))
        result.append(dict(image=pic, x=xs.start, y=ys.start, w=pic.width, h=pic.height, area=int(alpha.sum())))
    return result


def extract(im, anim):
    def largest(rect=None, poly=None):
        return max(components(im, rect, poly), key=lambda v: v['area'])
    if anim == 'climb':
        found = [largest(poly=p) for p in CLIMBS]
        for v, threshold in zip(found, [.27, .34, .50]):
            a=np.array(v['image']);r,g,b=(a[:,:,i].astype('int16') for i in range(3))
            # Red ropes cross open gaps below the face; retain the red skull.
            rope=(r>120)&(r>g*2.4)&(r>b*2.4)&(np.arange(v['h'])[:,None]>v['h']*threshold)
            rope=ndi.binary_dilation(rope,iterations=3)
            a[:,:,3][rope]=0;v['image']=Image.fromarray(a)
        # The first pose has a pale rope highlight in the gap under its forearm.
        v=found[0];a=np.array(v['image'])
        xs=(np.arange(v['w'])+v['x'])*1200/im.width
        ys=(np.arange(v['h'])+v['y'])*675/im.height
        gap=(xs[None,:]>727)&(xs[None,:]<789)&(ys[:,None]>180)&(ys[:,None]<196)
        a[:,:,3][gap]=0;v['image']=Image.fromarray(a)
        return found
    if anim == 'dive':
        # The third pose is free flight, with no post or neighboring figure.
        return [largest((372, 282, 710, 435))]
    if anim in ('entry', 'ropePose'):
        # Audit scenery-bearing sheets; clean own idle/climb poses are used in play.
        return [largest()]
    found = components(im)
    if anim == 'guitar':
        # The printed subtitle touches the overhead guitar at its upper edge.
        found = [largest(r) for r in [(0,190,210,614),(208,75,435,614),
                                      (430,145,656,614),(646,225,935,614),(889,271,1200,614)]]
    if anim in ('walk', 'run', 'kick', 'carryChair', 'down'):
        rows = [[], []]
        for v in found:
            rows[int((v['y'] + v['h']/2) / im.height > .55)].append(v)
        rows = [sorted(row, key=lambda v: v['x']) for row in rows]
        return [rows[0][-1], rows[1][0]] if anim == 'down' else rows[1]
    found.sort(key=lambda v: v['x'])
    if anim == 'defeat':
        found = found[-1:]
    return found


def face_span(pic):
    a = np.array(pic).astype('int16')
    r, g, b, alpha = (a[:, :, i] for i in range(4))
    red = (r > 100) & (g < r*.48) & (b < r*.45) & (alpha > 180)
    red = ndi.binary_closing(red, iterations=2)
    labels, n = ndi.label(red)
    if not n:
        return None
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    sl = ndi.find_objects((labels == sizes.argmax()).astype('uint8'))[0]
    return max(sl[0].stop-sl[0].start, sl[1].stop-sl[1].start)


def png(path, im):
    data = io.BytesIO(); im.save(data, format='PNG')
    encoded = data.getvalue()
    with Image.open(io.BytesIO(encoded)) as check:
        check.load(); assert check.size == im.size and check.mode == 'RGBA'
    temp = path.with_suffix('.tmp'); temp.write_bytes(encoded); temp.replace(path)


def main():
    parts = {}; audit = []
    with zipfile.ZipFile(SOURCE) as z:
        sources = {n for n in z.namelist() if n.endswith('.png') and not n.startswith('__MACOSX')}
        assert sources == {f'Evil Dead/ED {name}.png' for name in FILES.values()}
        for anim, name in FILES.items():
            filename = f'Evil Dead/ED {name}.png'; data = z.read(filename)
            original = Image.open(io.BytesIO(data)).convert('RGB')
            im = ImageOps.contain(original, (1600, 1200))
            items = extract(im, anim); assert items, anim
            parts[anim] = items
            audit.append(dict(animation=anim, source=filename, sha256=hashlib.sha256(data).hexdigest(),
                              count=len(items), bounds=[{k:v[k] for k in ('x','y','w','h')} for v in items]))
            print(anim, len(items), [(v['w'],v['h']) for v in items], flush=True)
    assert len(parts['idle']) == 4
    portrait = parts['idle'][0]['image'].copy(); portrait.thumbnail((220,320))
    png(OUT/'evil-dead-portrait.png', portrait)
    parts['idle'] = parts['idle'][-1:]
    for anim in ('carryBat', 'carryGuitar', 'carryTrashcan'):
        for item in parts[anim]:
            item['image'] = ImageOps.mirror(item['image'])
    parts['entry'] = parts['idle']; parts['ropePose'] = parts['climb'][:1]
    # A single common body calibration follows the skull across changing poses,
    # so crouches, jumps and horizontal falls never become a different-sized body.
    target_face = face_span(parts['idle'][0]['image'])*220/parts['idle'][0]['h']
    frames = []; animations = {}; previews = []
    for anim, items in parts.items():
        entries = []
        for i, item in enumerate(items):
            pic = item['image']; span = face_span(pic)
            if anim in ('climb','ropePose'):
                # The side-view skull has separated red cheek/jaw islands. Use
                # the common source-sheet head size for all three climb poses.
                span=max(face_span(v['image']) for v in parts['climb'])
            scale = target_face/span if span else 220/pic.height
            scale = min(scale, 380/pic.width, 330/pic.height)
            pic = pic.resize((max(1,round(pic.width*scale)),max(1,round(pic.height*scale))),Image.Resampling.LANCZOS)
            entry = dict(frame=len(frames),w=pic.width,h=pic.height,**frame_anchor(pic,anim))
            entries.append(entry); frames.append(pic); previews.append((anim,i,pic))
        animations[anim] = entries
    A = animations
    for anim in ('chair','bat','guitar'):
        raw=A[anim]; assert len(raw)==5, (anim,len(raw))
        A[anim]=[raw[0],raw[2],raw[3],raw[4],raw[0]]
    A['light']=[A['throw'][1],A['throw'][3],A['throw'][-1],A['idle'][0]]
    A['heavy']=A['chair']; A['grapple']=A['kick'][:1]; A['exhausted']=A['hurt']; A['kneel']=A['defeat']
    A['fallFront'][-1]=dict(A['down'][0]); A['fallBack'][-1]=dict(A['down'][1])
    A['rise'][0]=dict(A['down'][0]); A['rise'][-1]=dict(A['idle'][0])
    A['riseBack']=[dict(e) for e in reversed(A['fallBack'])]; A['riseBack'][-1]=dict(A['idle'][0])
    A['ko']=[dict(A['down'][1])]
    # Held overhead uses the authored horizontal body, without cycling standing poses.
    A['lifted']=[A['lifted'][2]]
    A['thrown']=[A['thrown'][0],A['thrown'][3]]
    for anim in ('walk','run','carryChair','carryBat','carryGuitar','carryTrashcan'):
        for e in A[anim]:
            pic=frames[e['frame']];alpha=np.array(pic.getchannel('A'))
            xs=np.where(alpha[int(pic.height*.43):int(pic.height*.55)]>180)[1]
            if len(xs):e['anchorX']=round(float(np.median(xs)),2)
    width=2048;x=y=rowh=0;positions=[]
    for pic in frames:
        if x+pic.width+4>width:y+=rowh+4;x=0;rowh=0
        positions.append((x,y));x+=pic.width+4;rowh=max(rowh,pic.height)
    atlas=Image.new('RGBA',(width,y+rowh+4))
    for pic,pos in zip(frames,positions):atlas.alpha_composite(pic,pos)
    for entries in A.values():
        for e in entries:e['x'],e['y']=positions[e['frame']]
    png(OUT/'evil-dead.png',atlas)
    record=dict(id='evil-dead',name='Evil Dead',style='Brawler',color='#f44336',power=1,speed=1,
                technique=1,toughness=1,finisher='LUNACY FINISHER',websiteStats=None,edition='2026-09',artVersion='2026-09-22',
                balanceSource='Neutral game defaults; ratings and finisher not supplied',animations=A,
                weapons=['chair','bat','guitar','trashcan'],atlas='./assets/evil-dead.png',atlasSize=list(atlas.size))
    roster=json.loads((OUT/'roster.json').read_text())
    slot=next((i for i,f in enumerate(roster) if f['id']=='evil-dead'),None)
    if slot is None:roster.append(record)
    else:roster[slot]=record
    (OUT/'roster.json').write_text(json.dumps(roster,separators=(',',':')))
    (ROOT/'tools/evil-dead-source-audit.json').write_text(json.dumps(dict(sourceSHA256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),sheets=audit,atlasSize=atlas.size,frameCount=len(frames)),indent=2)+'\n')
    review=ROOT/'review';review.mkdir(exist_ok=True)
    sheet=Image.new('RGB',(1600,((len(previews)+7)//8)*260),'#393344');d=ImageDraw.Draw(sheet)
    for i,(anim,j,pic) in enumerate(previews):
        x=i%8*200;y=i//8*260;pic=ImageOps.contain(pic,(194,225))
        sheet.paste(pic,(x+(200-pic.width)//2,y+250-pic.height),pic);d.text((x+5,y+5),f'{anim} {j}',fill='white')
    sheet.save(review/'evil-dead-extracted.jpg',quality=93)
    print('Saved',atlas.size,len(frames),'prepared frames; roster',len(roster))


if __name__ == '__main__':
    main()
