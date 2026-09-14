"""Apply the reviewed, dated website snapshot without making runtime web requests.
Power: damage; speed: movement; technique: grapple damage; toughness: resistance.
The website supplies ratings, not this game's conversion or move choreography.
"""
import json
from pathlib import Path

def apply(roster, snapshot):
    for fighter in roster:
        ratings=snapshot['ratings'].get(fighter['id'])
        fighter['websiteStats']=ratings
        if ratings is None:
            fighter.setdefault('technique',1.0)
            continue
        for key in ('power','speed','technique','toughness'):
            rating=ratings[key]
            if type(rating) is not int or not 1 <= rating <= snapshot['scale']:
                raise ValueError(f"Invalid website rating: {fighter['id']} {key}")
            fighter[key]=round(.70+.05*rating,2)
        fighter['finisher']=(ratings['finisher'] or 'Lunacy Finisher').upper()
    return roster

if __name__=='__main__':
    assets=Path(__file__).resolve().parents[1]/'dist/assets'
    roster=apply(json.loads((assets/'roster.json').read_text()),json.loads((assets/'website-stats.json').read_text()))
    (assets/'roster.json').write_text(json.dumps(roster,separators=(',',':')))
    print(f"Website stats applied to {sum(bool(f['websiteStats']) for f in roster)} of {len(roster)} fighters.")
