# Lunacy Unlocked — notes

Static site, no build step. Runs off `file://` as well as HTTP, because
`sprites/manifest.data.js` inlines the sprite manifest.

```
python3 -m http.server 8000    # http://localhost:8000
```

Current: **36 wrestlers, 2,546 frames, 0 missing.** 39 roster entries — the
other three (`abel`, `jacksyn`, `ruffo`) are tinted placeholders. `violentj`
is secret: type `WHOOPWHOOP` on the select screen, tap the title 7x, or `?vj`.

Version history lives in the root `*_REPORT_v*.txt` files (v6 grapple art,
v7 rope/top-rope, v8 falls/get-ups).

## Sprite manifests — read before touching art

| File | Role |
|---|---|
| `sprites/manifest.json` | **Source of truth.** Edit this one. |
| `sprites/manifest.data.js` | **Generated** from it. Loaded by the `<script>` at index.html:250. |
| `sprites/manifest.legacy.json` | Dead. Old paths, reference only. |

`loadAssets()` reads `window.__LUNACY_SPRITES__ || fetch('manifest.json')`, so
**`manifest.data.js` always wins.** Edit `manifest.json` without regenerating
`manifest.data.js` and the game silently loads the stale copy — your change
does nothing, with no error anywhere. This has already cost one batch of work.
The two are currently in sync; keep them that way.

Regenerate from the game root after editing `manifest.json`:

```python
import json
m = json.load(open('sprites/manifest.json'))
with open('sprites/manifest.data.js','w') as f:
    f.write("window.__LUNACY_SPRITES__ = ")
    json.dump(m, f, separators=(',',':'), sort_keys=True)
    f.write(";\n")
```

## Held weapon size — do not "fix" this

`drawWeaponSprite(...)` uses a flat `targetH * 0.42` for every weapon. An
earlier build had a per-weapon `HELD_WEAPON_SCALE` table (chair 0.34, kendo
0.42, trashcan 0.32, lid 0.18, guitar 0.34, belt 0.26). It shrank the chair,
lid and belt too much and was deliberately reverted. Don't reintroduce it
without looking at a chair in-hand first.

## index.html — section map (3,133 lines; CSS 10-152, JS 251-3131)

| Line | Section |
|---|---|
| 259 | DATA — `W()` factory, `wrestlers[]`, `WEAPON_TYPES`, `STAGES` |
| 382 | AUDIO — synthesized WebAudio, no sound files |
| 559 | ASSETS — `loadAssets()`, manifest precedence above |
| 638 | SELECT SCREEN |
| 674 | SECRET CHARACTER |
| 758 | CANVAS |
| 764 | MATCH STATE — `TIME_LIMIT` 180s, `TIME_LIMIT_TICKS` |
| 822 | JUICE HELPERS |
| 853 | MATCH FLOW |
| 971 | GEOMETRY — mat/rope rects as fractions of the arena image |
| 1013 | INPUT |
| 1188 | COMBAT CORE |
| 1322 | THROWS — pair art: `aGrappleL/R`, `aThrow`, `aThrown`, `aLifted`, `aPin` |
| 1531 | SIM STEP |
| 1867 | AI |
| 2006 | REMOTE PLAYER |
| 2386 | HUD |
| 2518 | RENDER |
| 3058 | FIXED-TIMESTEP LOOP |

Arenas: RUSTED WAREHOUSE, HELL'S PIT, MADHOUSE, BLOODYMANIA.

`drawFighter` has a missing-art guard — it draws a loud placeholder and logs
`MISSING ART for <id>`. If a wrestler renders as a coloured block, check the
console and the manifest sync above.

Knockdowns go through `setDownState()` (v8), which stores `downTimer`,
`downTotal` and `fallFace` together — use it rather than assigning those
directly, or remote playback loses recovery timing.

## Other files

- `admin.html` — match-report dashboard, reads `/reports.json`. Standalone.
- `jcw_intro_theme.mp3` — loaded at index.html, falls back to synth audio if
  absent. It is not in the working folder, so don't delete it from the repo.
- TCG button on the select screen points at `tcg/index.html` — not built yet.
- `_check.js` in the working folder is a byte-identical copy of index.html's
  inline JS, used for syntax checking. Deliberately not committed — it goes
  stale the moment index.html changes.

## Online

Firebase RTDB, project `jcw-lunacy`, SDK lazy-loaded from gstatic. Host runs
the sim and broadcasts snapshots normalized to `floorRect` fractions. The web
API key is public by design, so **RTDB security rules are the only thing
guarding the database** — worth reviewing.
