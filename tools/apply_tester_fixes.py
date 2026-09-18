"""Final v0.18 metadata pass after regenerating atlases. Pixels remain unchanged."""
from pathlib import Path
from copy import deepcopy as copy
import json, math
root=Path(__file__).resolve().parents[1]
p=root/'dist/assets/roster.json';roster=json.loads(p.read_text())
for index,f in enumerate(roster):
 a=f['animations'];f['weapons']=['chair','bat','guitar','trashcan']
 if f['id']=='able':f['name']='Abel'
 if f['id']=='jacksyn':f['name']='Jackson'
 if index<9:
  a['chair']=copy(a['heavy'])
  for weapon in ['bat','guitar','trashcan']:a[weapon]=copy(a['light'])
  f['overlayWeapons']=['bat','guitar','trashcan'];a['taunt']=copy(a['victory'])
  a['climb']=[copy(a['rise'][i]) for i in [1,min(2,len(a['rise'])-1)]]+[copy(a['jump'][0])]
  a['dive']=[copy(a['jump'][0]),copy(a['light'][1])]
 if f['id']=='2-tuff-tony':f['weapons'].append('bottle');f['overlayWeapons'].append('bottle');a['bottle']=copy(a['light'])
 if f['id'] in ['2-tuff-tony','kerry-morton']:
  # Rotate the same side-profile body backward: face points up, head left.
  # This avoids the source's headstand/face-down fall and preserves body size.
  base=copy(a['idle'][0]);front=copy(a['rise'][0]);back=dict(base,groundAngle=-math.pi/2)
  a['down']=[front,back];a['ko']=copy(a['down'])
  a['fallBack']=[dict(base,groundAngle=x) for x in [0,-.45,-1.05,-math.pi/2]]
  a['fallFront']=[copy(a['hurt'][0]),copy(a['rise'][1]),copy(front)]
  a['riseBack']=[copy(back)]+copy(a['rise'][1:])
 if f['id'] in ['matt-cross','steven-flowe','big-vito']:
  for e in a['run']:e['drawScale']=1.12
  for e in a['walk']:
   if f['id']=='matt-cross':e['drawScale']=1.12
   else:e.pop('drawScale',None)
  if f['id']!='big-vito':
   for e in a['jump']:e['drawScale']=1.22
  front_id,back_id={'matt-cross':(70,72),'steven-flowe':(82,83),'big-vito':(71,73)}[f['id']]
  poses={e['frame']:e for key in ['fallFront','fallBack','down'] for e in a[key]}
  a['down']=[copy(poses[front_id]),copy(poses[back_id])]
  a['fallBack'][-1]=copy(a['down'][-1]);a['fallFront'][-1]=copy(a['down'][0]);a['ko']=copy(a['down']);a['rise'][0]=copy(a['down'][0])
  if a.get('riseBack'):a['riseBack'][0]=copy(a['down'][-1])
p.write_text(json.dumps(roster,separators=(',',':')))
print('Applied v0.18 tester metadata fixes; original sprite PNGs preserved.')
