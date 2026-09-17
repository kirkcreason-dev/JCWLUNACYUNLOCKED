"""Correct Tony's mixed-facing source poses and ground state without altering artwork."""
import json
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'dist/assets/roster.json'
r=json.loads(p.read_text());f=next(f for f in r if f['id']=='2-tuff-tony');a=f['animations']
a['walk'][-1]['flipX']=True
a['run'][-1]['flipX']=True
# Anchor the hip line consistently; the lowest planted foot alternates sides.
for e in a['run']:e['anchorX']=round(e['w']*(.46 if e.get('flipX') else .54),2)
if 'fallBack' not in a:
 a['fallBack']=[dict(e) for e in a['down']]
 a['fallFront']=[dict(e) for e in a['down']]
a['down']=[dict(a['rise'][0])]
a['ko']=[dict(a['rise'][0])]
p.write_text(json.dumps(r,separators=(',',':')))
print('Tony: corrected walk/run facing, hip anchors and fall-to-ground transitions.')
