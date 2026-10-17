# Bigfoot — v0.23.0

The standard roster has **40 fighters**. Bigfoot replaces Yabo at index 8. He is
available through the usual fighter pages, direct picker and opponent list.
On a portrait phone he appears on page 2. All 39 other fighter records,
artwork and source packs are preserved.

## Supplied assets

- `source-packs/Big-Foot.zip`: the original 31-sheet artwork pack.
- `source-packs/JCW-Big-Foot-Sound-Pack.zip`: the complete sound pack, including
  its README, manifest and preview. Only its 12 short WAVs are used in play.
- `dist/assets/bigfoot.png`: transparent 2048 × 2835 runtime atlas.
- `dist/assets/bigfoot-portrait.png`: front-facing selection portrait.
- `tools/bigfoot-source-audit.json` and `tools/bigfoot-sound-audit.json` record
  source hashes, crop bounds, normalization and imported sound metadata.

The importer uses the supplied right-facing walk/run/kick rows and mirrors the
left-facing weapon carry sheets. Pose scale is calibrated per sheet, including
airborne and horizontal poses; it is not stretched to an equal bounding-box
height. Feet and body anchors stabilize movement. Sheet titles, captions,
neighboring sprites, ropes and posts are excluded from runtime poses.

Clean idle/climb poses replace scenery-bearing ring-entry/rope sheets. No
chair-walking sheet was supplied, so the held-chair stance is used while
carrying a chair. Face-up/back and face-down/front rests are shared with their
fall and recovery endpoints. The face-up rest also supplies the pinned/KO pose.

## Gameplay and sound

Bigfoot supports the existing strike combos, kicks, grapples, pins, submissions,
taunts, climbs, rope taunts, dives, superplexes, four common weapons and bare
hands. His supplied six-frame **Chokeslam** has a 0.42-second wind-up,
0.18-second contact window and 0.48-second recovery. In close range against a
grounded, unguarded target, the opponent follows the lift and drop. The defender
can use GRAB during the normal throw-break window. A guarded, airborne or
out-of-range target follows normal strike/block/miss rules. The move uses the
normal 31-point base finisher damage, spends the full meter, and does not wear
out a weapon he happens to be carrying.

The lift sound is trimmed to the grip/lift interval. Impact plays once on the
fifth authored pose; no combined clip or duplicate generic impact is layered
over it. Hurt, attack, heavy steps, landing, taunt and victory cues use the
supplied synthesized sounds. The idle growl plays once at the round bell.
Footsteps require real movement, variants alternate, and pause/mute releases
voices. Audio keeps the existing three-request loader, 16 MiB decoded-sample
budget and 24-voice cap. Preview audio is never decoded by the game.

No ratings were supplied for Bigfoot. His four multipliers use neutral 1.0
defaults, with no invented website ratings or approval-table entries. His
finisher name comes directly from the supplied special sheet.

## Saves and online play

Existing stable fighter IDs, championship saves, match totals and earned
medals remain valid. New arcade runs face 39 opponents. Interrupted older runs remove Yabo and
append Bigfoot without counting him as defeated. If the active opponent was
Yabo, that bout checkpoint is cleared and play continues with the remaining
opponents. All other bout checkpoints remain. Upcoming championship Yabo
bouts are replaced; completed championship stages and titles are retained.
Completed historical Yabo stages appear as COMPLETED BOUT. Bigfoot has his own championship,
arcade and difficulty records. Online requires this version on both devices:
protocol `lunacy-2d-v22`, room/queue prefix `LU230-`.

## Verification and rebuild

Run `python3 tools/add_bigfoot.py` with Pillow, NumPy and SciPy to rebuild his
assets. It changes only his record and files. `npm test` passes 327 tests;
`npm run check` verifies 40 fighters, 4,961 animation entries, six arenas,
both music tracks and 61 runtime sound samples. Tests include close-range
chokeslams, blocks, misses, interruptions, throw breaks, online snapshots,
both directions/player slots, older saves and rewards on all difficulties.

`node tools/review_bigfoot.mjs` renders combat and phone canvas previews using
`@napi-rs/canvas`. Visual review covered extracted poses, weapon contacts,
climbs, pinning, throws, dive and chokeslam contact. This is native-canvas and
automated validation; browser, live multiplayer and physical-phone testing
were not performed. The complete ZIP is provided without a push or deployment.
