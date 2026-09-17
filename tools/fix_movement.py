"""Reviewed facing corrections and body-based locomotion anchors. Source PNGs stay untouched."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'dist/assets/roster.json';roster=json.loads(p.read_text())
# Zero-based poses visually confirmed to face left in the source artwork.
LEFT={
 'violent-j':{'run':list(range(5))},
 'willie-mack':{'walk':[4],'run':[5]},
 'kerry-morton':{'run':list(range(4))},
 'mr-happy':{'run':list(range(5))},
 'moshpit-mike':{'run':list(range(4))},
 'cokane':{'run':list(range(5))},'yabo':{'run':list(range(5))},
 'able':{'run':list(range(4))},'dani-mo':{'run':list(range(4))},
 'facade':{'walk':list(range(6)),'run':list(range(6)),'jump':[0]},
 'j-rod':{'run':list(range(4))},
 'matt-cross':{'walk':list(range(6)),'run':list(range(6))},
 'vincenzo':{'walk':list(range(6)),'run':list(range(6))},
 'caleb-konley':{'walk':list(range(6)),'run':list(range(6))},
 'sally-boy':{'walk':list(range(6)),'run':list(range(6))},
 'big-vito':{'run':list(range(4)),'carryGuitar':[3]},
 'bruce-wayans':{'run':[0,1]},'alice-crowley':{'run':list(range(4))},
 'ruffo':{'run':[0,1]},
}
for fighter in ('able','dani-mo','j-rod','vincenzo','sally-boy','bruce-wayans','alice-crowley','ruffo'):
 LEFT.setdefault(fighter,{})['carryGuitar']=[3]
LEFT['dj-clay']={'carryBat':list(range(5)),'carryTrashcan':list(range(5))}
LEFT['jeff-lane']={'carryBat':list(range(5)),'carryTrashcan':list(range(5))}
LEFT['shane-mercer']={'carryBat':list(range(5))}
report=[]
for f in roster:
 a=f['animations'];changes=[]
 for anim,indices in LEFT.get(f['id'],{}).items():
  for i in indices:a[anim][i]['flipX']=True
  changes.append(f'{anim}: corrected facing at {indices}')
 if f['id']=='2-tuff-tony':continue # Separately reviewed hip anchors and fall transitions.
 atlas=np.asarray(Image.open(ROOT/f"dist/assets/{f['id']}.png").getchannel('A'))
 def center(e):
  pixels=atlas[e['y']+int(e['h']*.43):e['y']+int(e['h']*.55),e['x']:e['x']+e['w']]
  xs=np.where(pixels>180)[1]
  return float(np.median(xs)) if len(xs) else e['w']/2
 idle=a['idle'][0];offset=(center(idle)-idle['anchorX'])*(-1 if idle.get('flipX') else 1)
 for anim in ('walk','run',*({'dj-clay':['carryBat','carryTrashcan'],'shane-mercer':['carryGuitar']}.get(f['id'],[]))):
  frames=a[anim];offsets=[(center(e)-e['anchorX'])*(-1 if e.get('flipX') else 1) for e in frames]
  if max(offsets)-min(offsets)>12:
   for e in frames:e['anchorX']=round(max(0,min(e['w'],center(e)-offset*(-1 if e.get('flipX') else 1))),2)
   changes.append(f'{anim}: replace alternating-foot anchor (torso offset spread {max(offsets)-min(offsets):.1f}px)')
 if f['id']=='big-vito':
  # Imported "jump" contains background ropes and a miniature body. Use the
  # existing full-size crouch/airborne poses from his lifted sequence instead.
  a['jump']=[dict(a['lifted'][i]) for i in (0,1,1,0)]
  changes.append('jump: use clean full-size crouch/airborne poses instead of rope-panel art')
 if f['id'] in ('violent-j','willie-mack','mickie-knuckles','mr-happy','moshpit-mike','cokane','yabo'):
  a['down'][0]=dict(a['rise'][0]);changes.append('front knockdown: use face-down resting pose matching recovery')
 if f['id']=='matt-cross':
  # The imported kick panel cuts off his head; the engine already falls back
  # to his intact unarmed strike when no dedicated kick sequence is present.
  a.pop('kick',None);changes.append('unarmed heavy: use intact strike instead of head-clipped kick art')
 if f['id']=='steven-flowe':
  a['ko']=[dict(a['down'][-1])];changes.append('KO: hold a flat resting pose, not a standing fall frame')
 if f['id'] in ('atiba','tommy','jacksyn'):
  a['fallFront'][-1]=dict(a['down'][0]);changes.append('front fall: finish face-down at the correct body size')
 if f['id']=='father-bronson':
  a['dive']=sorted(a['dive'],key=lambda e:e['frame'],reverse=True);changes.append('dive: crouched launch before extended flight')
 if changes:report.append({'id':f['id'],'changes':changes})
p.write_text(json.dumps(roster,separators=(',',':')))
# The versioned movement-audit.json records the full comparison with v0.15.0.
# Do not overwrite that historical report when this idempotent repair is rerun.
print('Corrected',len(report),'fighters plus Tony; source artwork unchanged.')
