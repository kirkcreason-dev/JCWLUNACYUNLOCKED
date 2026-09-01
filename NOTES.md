# Lunacy Unlocked — notes

Static site, no build step. Runs off `file://` as well as HTTP, because
`sprites/manifest.data.js` inlines the sprite manifest.

```
python3 -m http.server 8000    # http://localhost:8000
```

Current: **36 wrestlers, 2,418 frames, 0 missing.** 39 roster entries — the
other three (`abel`, `jacksyn`, `ruffo`) are tinted placeholders. `violentj`
is secret: type `WHOOPWHOOP` on the select screen, tap the title 7x, or `?vj`.

## Sprite manifests — read before touching art

| File | Role |
|---|---|
| `sprites/manifest.json` | **Source of truth.** Edit this one. |
| `sprites/manifest.data.js` | **Generated** from it. Loaded by the `<script>` at index.html:250. |
| `sprites/manifest.legacy.json` | Dead. Old paths, reference only. |

`loadAssets()` reads `window.__LUNACY_SPRITES__ || fetch('manifest.json')`, so
**`manifest.data.js` always wins.** Edit `manifest.json` without regenerating
`manifest.data.js` and the game silently loads the stale copy — your change
does nothing, with no error anywhere. This has already caused one lost batch
of work. The two are currently in sync; keep them that way.

Regenerate from the game root after editing `manifest.json`:

```python
import json
m = json.load(open('sprites/manifest.json'))
with open('sprites/manifest.data.js','w') as f:
    f.write("window.__LUNACY_SPRITES__ = ")
    json.dump(m, f, separators=(',',':'), sort_keys=True)
    f.write(";\n")
```

## Held weapon size

`drawWeaponSprite(...)` uses a flat `targetH * 0.42` for every weapon. An
earlier build had a per-weapon `HELD_WEAPON_SCALE` table (chair 0.34, kendo
0.42, trashcan 0.32, lid 0.18, guitar 0.34, belt 0.26) — it shrank the chair,
lid and belt too much and was deliberately reverted. Don't reintroduce it
without looking at a chair in-hand first.

## index.html — section map (2,884 lines; CSS 10-152, JS 251-2882)

| Line | Section |
|---|---|
| 259 | DATA — `W()` factory, `wrestlers[]`, `WEAPON_TYPES`, `STAGES` |
| 391 | AUDIO — synthesized WebAudio |
| 559 | ASSETS — `loadAssets()`, manifest precedence above |
| 638 | SELECT SCREEN |
| 674 | SECRET CHARACTER |
| 758 | CANVAS |
| 764 | MATCH STATE — `TIME_LIMIT` 180s, `TIME_LIMIT_TICKS` |
| 853 | MATCH FLOW |
| 971 | GEOMETRY — mat/rope rects as fractions of the arena image |
| 1185 | COMBAT CORE |
| 1301 | THROWS — pair art: `gGrappleL/R`, `gThrowL/R`, `gOverhead` |
| 1450 | SIM STEP |
| 1734 | AI |
| 1913 | ONLINE — Firebase RTDB, host-authoritative, 12 Hz |
| 2237 | HUD |
| 2369 | RENDER |
| 2809 | FIXED-TIMESTEP LOOP |

Arenas: RUSTED WAREHOUSE, HELL'S PIT, MADHOUSE, BLOODYMANIA.

`drawFighter` has a missing-art guard — it draws a loud placeholder and logs
`MISSING ART for <id>`. If a wrestler shows as a colored block, check the
console and the manifest sync above.

## Other files

- `admin.html` — match-report dashboard, reads `/reports.json`. Standalone.
- `jcw_intro_theme.mp3` — loaded at index.html:855, falls back to synth audio
  if absent. Not in the working folder, so don't delete it from the repo.
- TCG button on the select screen points at `tcg/index.html` — not built yet.

## Online

Firebase RTDB, project `jcw-lunacy`, SDK lazy-loaded from gstatic. Host runs
the sim and broadcasts snapshots normalized to `floorRect` fractions. The web
API key is public by design, so **RTDB security rules are the only thing
guarding the database** — worth reviewing.
