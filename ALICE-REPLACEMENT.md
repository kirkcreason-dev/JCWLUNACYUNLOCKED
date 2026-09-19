# Alice Crowley replacement — v0.20.1

The supplied Alice Crowley.zip replaces Alice's existing portrait and every runtime sprite. Her `alice-crowley` identity, roster order, approved 8 Power / 6 Speed / 8 Technique / 9 Toughness, and Uni-Lariat are unchanged. Other fighters' records and artwork remain identical to v0.20.0.

The source ZIP is included unchanged at `source-packs/Alice-Crowley.zip`. It contains 26 PNG sheets. `tools/alice-replacement-audit.json` records each source hash, selected bounds, animation counts and adaptations.

| Action | Replacement artwork / handling |
|---|---|
| Selection and results | Front standing pose; side standing pose for gameplay |
| Walk, run, chair and bat carry | Five authored right-facing frames; renderer mirrors for left |
| Guitar and trash-can carry | Five supplied left-facing poses normalized to right |
| Light attack and throw | Two intact poses from AV throwing.png; later overlapping panels excluded |
| Bare-hand heavy / air kick | New five-frame kick sheet with the extended leg at contact |
| Chair and bat attack | Authored ready, wind-up, contact and recovery poses mapped to existing hit timing |
| Guitar and trash-can attack | New throw poses with measured code-drawn props; no separate attack sheet was supplied |
| Climb and perch | Four isolated body poses from the new corner sheet; posts and ropes excluded |
| Dive | Intact airborne splash pose from the supplied top-rope sheet |
| Top-rope taunt | New taunt artwork at the existing rope height |
| Falls, resting, pinned and KO | Supplied forward/backward and face-up/down artwork with normalized endpoints |
| Recovery | Correct source row order, beginning at the matching resting pose; back recovery adapts the supplied front recovery after its face-up start |
| Victory, defeat, dazed and lift | Corresponding replacement sheets |

The atlas is 2048 × 1890 with 105 unique prepared frames. It uses about 4% fewer decoded pixels than Alice's previous 2048 × 1972 atlas. Every PNG is fully encoded and decode-checked before replacement. No old Alice artwork is referenced by her runtime animations.

All her portrait surfaces and match atlas use a fighter-specific image revision, so cached old images are refreshed without invalidating other fighters. Adapted attack overlays are suppressed while carrying an authored weapon pose to avoid duplicate weapons. Existing game rules and online v20 / LU200 rooms remain; use this release on both devices to see matching artwork.

To rebuild only Alice after any legacy asset-preparation passes:

```sh
python3 tools/replace_alice.py source-packs/Alice-Crowley.zip
npm test
npm run check
```

Pillow, NumPy and SciPy are needed only for rebuilding the artwork. Native rendering review is available through `node tools/review_alice.mjs` with `@napi-rs/canvas`; the game itself still runs directly from `dist`.

Verification: 280 automated tests pass, including complete PNG scanlines, source ZIP identity, directional gaits, fall/recovery endpoints, weapon overlays and image cache revisions. Native canvas views were inspected in both facings and desktop/phone viewport modes. No physical-device or browser QA was performed for this asset update. Nothing was pushed or deployed.
