# Evil Dead — v0.21.0

Evil Dead is fighter index 39 (40th in the roster), with stable ID `evil-dead`. The complete supplied 31-sheet ZIP is preserved as `source-packs/Evil-Dead.zip`. No ratings or named finisher came with the pack: Power, Speed, Technique and Toughness use neutral 1.0 multipliers, and the game uses its generic Lunacy Finisher. These are provisional game defaults. The historical approval table is unchanged.

## Source mappings

| Game use | Supplied source | Preparation |
| --- | --- | --- |
| Portrait / idle | ED standing.png | Front portrait; RIGHT gameplay stance. |
| Walk / run / kicks | ED walking.png; ED running.png; ED kicking.png | Right-facing source rows; renderer mirrors left. |
| Weapon attacks | Four ED attack with ... sheets | Chair/bat/guitar reordered to put forward contact in the active window; trash-can retains its overhead wind-up. |
| Carried weapons | Four ED walk with ... sheets | Chair uses RIGHT row; bat/guitar/trash-can are mirrored from LEFT artwork. |
| Light strike / grapple / throw | ED throwing.png; ED kicking.png; ED lifting overhead.png | Light attack adapts the forward shove; heavy uses the authored kick. Shared timing, combos, counters and aerial strikes apply. |
| Falls / recovery / pins | Fall, laying, getting-up and pinning sheets | Face-down front rest and face-up back rest; matching endpoints, back recovery from reversed back-fall poses. |
| Climb / perch / dive | ED climbing on corner rope.png; ED jumping off corner rope.png | Three isolated corner bodies, cleaned rope remnants; free-flight dive pose. Common climb body calibration avoids growth. |
| Taunt / victory / defeat / hurt | ED taunting.png; ED victory.png; ED defeated.png; ED dazed.png | Use supplied character poses; remove disconnected labels and effects. |
| Other supplied source poses | ED passed out.png; ED climbing through rope.png; ED climbing on rope.png | Preserved and audited; runtime uses matching back-rest, clean idle and clean corner poses to avoid scale changes and duplicate scenery. |
| Lifted / thrown | ED getting lifted overhead.png; ED being thrown.png | Use intact horizontal carry and airborne body poses. |

## Rebuild

Run `python3 tools/add_evil_dead.py` from the project root. Pillow, NumPy and SciPy are required. The importer reads the preserved ZIP, checks every sheet is accounted for, prepares only Evil Dead’s atlas/portrait, and appends or replaces only his record. PNGs are completely encoded and decoded before atomic replacement. `tools/evil-dead-source-audit.json` records all source hashes and crop bounds.

Then run `npm test` and `npm run check`. Optional `node tools/review_evil_dead.mjs` renders twelve combat states and two phone canvas layouts with `@napi-rs/canvas`; it is a native render review, not browser/device testing.

## Compatibility

All 39 earlier fighter records and media remain unchanged. Existing championship saves and arcade medals still load; new full arcade runs face 39 opponents. Both online players need v0.21.0, using v21 / LU210 rooms. The v0.20.3 dive/get-up collision fix is retained. No push or deployment.
