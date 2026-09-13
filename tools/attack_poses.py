"""Reviewed pose choices from the supplied atlases; never modifies atlas pixels.

Run after preparing assets, or pass an existing roster.json to update its metadata.
"""
import json
import sys
from pathlib import Path


def apply_attack_poses(fighter):
    animations = fighter['animations']
    # Two source sheets contain a detached dust puff between complete figures.
    # Keep it out of the runtime sequence, without repacking the original atlas.
    animations['throw'] = [frame for frame in animations['throw'] if frame['h'] >= 100]
    throws = animations['throw']
    if fighter['id'] == 'willie-mack':
        # This sheet is authored toward the left, unlike the rest of the roster.
        for frame in throws:
            frame['flipX'] = True
            # His throw sheet has no overhead lift, so the generic raised-arm
            # enlargement made his body grow whenever he attacked.
            frame['drawScale'] = .84
        guard, contact = throws[1], throws[0]
    else:
        guard, contact = throws[0], throws[3]
    # Closed/forward hands make a short shove strike. Raised overhead poses belong
    # only to grapples. Repeat the guard for recoil, then return to the exact idle.
    animations['light'] = [dict(frame) for frame in (guard, contact, guard, animations['idle'][0])]
    return fighter


if __name__ == '__main__':
    path = Path(sys.argv[1])
    roster = json.loads(path.read_text())
    path.write_text(json.dumps([apply_attack_poses(f) for f in roster], separators=(',', ':')))
