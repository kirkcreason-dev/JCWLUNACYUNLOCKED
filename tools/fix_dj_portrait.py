"""Rebuild DJ Clay's front-facing UI portrait from his original standing sheet.
Run after legacy atlas preparation: python3 tools/fix_dj_portrait.py
Gameplay animation pixels and metadata are untouched.
"""
from pathlib import Path
import hashlib,io,json
from PIL import Image,ImageOps
from expansion36 import extract

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'source-packs/dj-clay-standing.png'
sheet=ImageOps.contain(Image.open(source).convert('RGB'),(1600,1067))
poses=extract(sheet,'idle','dj-clay')
assert len(poses)==4,'Review changed standing-sheet layout before rebuilding.'
front=poses[0];portrait=front['image'].copy();portrait.thumbnail((220,320),Image.Resampling.LANCZOS)
buffer=io.BytesIO();portrait.save(buffer,format='PNG',optimize=True);data=buffer.getvalue()
Image.open(io.BytesIO(data)).verify()
path=ROOT/'dist/assets/dj-clay-portrait.png';temp=path.with_suffix('.tmp');temp.write_bytes(data);temp.replace(path)
with Image.open(path) as saved:saved.load()
rosterPath=ROOT/'dist/assets/roster.json';roster=json.loads(rosterPath.read_text());dj=next(f for f in roster if f['id']=='dj-clay')
dj['artVersion']='2026-09-19-front'
rosterPath.write_text(json.dumps(roster,separators=(',',':')))
report={'version':'0.20.2','fighter':'dj-clay','source':'DJ Clay(1).zip / DJ Clay/DJ Clay standing.png','sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'pose':'FRONT','bounds':{k:int(front[k]) for k in ['x','y','w','h']},'portraitSize':list(portrait.size),'portraitSHA256':hashlib.sha256(data).hexdigest(),'gameplayAtlasChanged':False}
(ROOT/'tools/dj-portrait-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
