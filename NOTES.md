# Lunacy Unlocked — rebuild notes

This folder (`~/Desktop/LUNACY_REBUILT_CLEAN`) is the **current working build**.
`~/Documents/jcwlunacy-unlocked` is the older GitHub copy
(`kirkcreason-dev/JCWLUNACYUNLOCKED`, commit 7f5ccf1) — keep it as reference only.

2,172 files, 73 MB. Static, no build step. Runs off `file://` as well as HTTP,
because `sprites/manifest.data.js` inlines the manifest.

```
python3 -m http.server 8000    # http://localhost:8000
```

## What changed vs. the GitHub copy

- **4 new arenas**: RUSTED WAREHOUSE, HELL'S PIT, MADHOUSE, BLOODYMANIA
  (funhouse + old lunacy retired; warehouse geometry retuned).
- **Violent J merged into `index.html`** — `vj_addon.js` is gone. Unlock is
  unchanged: type `WHOOPWHOOP`, tap the title 7×, or `?vj`.
- **Missing-art guard** (`drawFighter`, ~line 2678): draws a loud placeholder
  body and logs `MISSING ART for <id>` instead of rendering nothing. This is
  what the old build lacked — `loadImg` still sets `onerror = resolve`, so 404s
  are still silent at load time, but they can't produce an invisible fighter.
- **Deterministic clock**: `TIME_LIMIT_TICKS` replaces wall-clock seconds —
  matters for online desync.
- **All four broken characters fixed**: bronson, hokane, haleyj, kongokong now
  have complete art. yabo gained real art too.
- New **`ax` anchor points** across the manifest — the feet-plant fix, so poses
  with a weapon swung out no longer drift.
- TCG button on the select screen → `tcg/index.html`. **Not built yet**; the
  folder isn't here, so it's a dead link until that ships.

## Sprite manifests — read this before touching art

Three files in `sprites/`:

| File | Role |
|---|---|
| `manifest.json` | **The source of truth.** Edit this one. |
| `manifest.data.js` | **Generated** from it. Loaded by a `<script>` tag at index.html:250. |
| `manifest.legacy.json` | Dead — old paths, 242 missing files. Reference only. |

`loadAssets()` reads `window.__LUNACY_SPRITES__ || fetch('manifest.json')` —
so **`manifest.data.js` always wins.** If you edit `manifest.json` and don't
regenerate `manifest.data.js`, the game silently loads the stale copy and your
change does nothing.

**This had already happened.** Fixed 2026-08-26: `manifest.data.js` was 18 days
behind `manifest.json`, which meant at runtime yabo had no art, and cokane,
kerry, mickie, moshpit and mrhappy were missing their run cycles, taunts, dives,
weapon-carry walks, weapon swings and `_refH`/`_dirTrue` scaling. The two files
were merged (json won every shared state; 25 grapple/throw states that only
existed in data.js were carried back in) and data.js regenerated from the result.
Originals are in `sprites/_backup_2026-08-26/`.

Current state: **36 wrestlers, 2,443 frames, 0 missing.** Both manifests are
byte-identical in content. `manifest.data.js` carries
`window.__LUNACY_SPRITES_BUILD__` — bump it when you regenerate.

To regenerate after editing `manifest.json`, from the game root:

```python
import json
m = json.load(open('sprites/manifest.json'))
with open('sprites/manifest.data.js','w') as f:
    f.write("window.__LUNACY_SPRITES__ = ")
    json.dump(m, f, separators=(',',':'), sort_keys=True)
    f.write(";\nwindow.__LUNACY_SPRITES_BUILD__ = 'YYYY-MM-DD';\n")
```

## Roster

39 entries. 36 have their own art; **abel, jacksyn, ruffo** are still tinted
placeholders (`base` + `hue` — aliased to a base body and hue-rotated at load).
`violentj` is secret. `// not built: Luigi Primo (approval: NO)`.

## index.html — section map (2,893 lines; CSS 10–152, JS 251–2891)

| Line | Section |
|---|---|
| 259 | DATA — `W()` factory, `wrestlers[]`, `WEAPON_TYPES`, `STAGES` |
| 391 | AUDIO — synthesized WebAudio, no sound files |
| 568 | ASSETS — `loadAssets()`, the manifest precedence above |
| 647 | SELECT SCREEN |
| 683 | SECRET CHARACTER — Violent J unlock |
| 767 | CANVAS |
| 773 | MATCH STATE — `M`, `TIME_LIMIT` 180s, `TIME_LIMIT_TICKS` |
| 831 | JUICE HELPERS |
| 862 | MATCH FLOW |
| 980 | GEOMETRY — mat/rope rects as fractions of the arena image |
| 1022 | INPUT |
| 1194 | COMBAT CORE |
| 1310 | THROWS — pair art: `gGrappleL/R`, `gThrowL/R`, `gOverhead` |
| 1459 | SIM STEP |
| 1743 | AI |
| 1879 | REMOTE PLAYER |
| 1922 | ONLINE — Firebase RTDB, host-authoritative, 12 Hz |
| 2246 | HUD |
| 2378 | RENDER |
| 2818 | FIXED-TIMESTEP LOOP |
| 2831 | WIRE UP |

## Online

Firebase RTDB, project `jcw-lunacy`, SDK 10.14.1 lazy-loaded from gstatic.
Host runs the sim and broadcasts snapshots normalized to `floorRect` fractions;
guest sends inputs and renders interpolation. Config inline at ~line 1940 — the
web API key is public by design, so **RTDB security rules are the only thing
guarding the database.** Worth reviewing.
