# JCW Lunacy: Lunacy Unlocked

A playable 2D arcade wrestling fighter built from the supplied JCW wrestler sheets, arena artwork, and Genesis-style Fight Club track. Version **0.12.1**.

The gameplay refinement adds confirmed strike chains, gradual run acceleration, fair simultaneous grab breaks, more responsive recovery, rope breaks, manual hold release, and smarter CPU attack spacing. The original 33 wrestlers remain intact; three additions bring the roster to 36. The supplied startup logos, title artwork, arenas, effects, and music are included. See [GAMEPLAY.md](GAMEPLAY.md) for the updated fight rules and [TESTING.md](TESTING.md) for validation and limitations.

## Steadier screen (v0.12.1)

Gameplay now uses synchronized drawing and an opaque repaint to avoid showing partly drawn frames. The top and bottom HUD panels remain opaque and stationary during hit shake, the whole-screen finisher flash is removed, and shake is reduced. Phone viewport changes are applied in the same animation callback as the repaint. All 36 fighters, character effects, gameplay rules and v12 / LU120 multiplayer compatibility remain intact. Reload the page after installing this build; the version under FIGHT should read v0.12.1.

## DJ Clay, Jeff Lane and Shane Mercer (v0.12.0)

The roster now contains 36 fighters. DJ Clay has his supplied six-frame Bass Blast finisher animation, synchronized to the existing meter and damage rules. Jeff Lane and Shane Mercer have movement, weapon, grapple, recovery and rope animations from their supplied packs. Six portrait pages expose every fighter. Shane Mercer uses published JCW ratings; DJ Clay and Jeff Lane use game balance values without claiming website ratings. Both online players need v0.12.0 / LU120 rooms.

## Five new fighters (v0.11.0)

Atiba, JP Grayson, Tommy, Shaggy 2 Dope, and Jacksyn join as fighters 29–33. Portrait page six now contains Tommy, Shaggy, Jacksyn, DJ Clay, Jeff Lane and Shane Mercer. Their supplied sheets provide prepared animations and portraits; adaptations for missing or overlapping poses are documented in SPRITE-MAP.md. Four have published JCW ratings; Shaggy uses game balance values with no website rating claimed.

## Stability and rendering (v0.10.1)

Optional announcement and combat-effect images now load on demand, so a phone does not decode every decorative PNG before the first match. Evicted fighter and arena images release their decoded source, event queues are bounded during bursts, and stale image downloads cannot reinsert old fighters into the cache. The animation loop catches recoverable graphics/runtime faults and pauses with a restart action instead of taking down the match. Desktop and phone simulation remain deterministic; only presentation is reduced when battery/low-power mode is active.

## Krule and Jeeves (v0.10.0)

Krule and Jeeves join as fighters 27 and 28. Their supplied portraits and animation sets cover movement, four weapons, grapples, pins, recoveries, and rope moves. Both use ratings from jcwlunacy.net; Krule's finisher remains marked as unlisted there. Current online play uses v12 / LU120 rooms; both players should use v0.12.0.

## Steven Flowe and EC3 (v0.9.0)

Steven Flowe and EC3 join as fighters 25 and 26, with their supplied animation sets, four weapons, rope moves, and ratings/finishers from jcwlunacy.net. The first 24 roster slots are unchanged. Phone paging and direct selection include both new fighters. The v0.9.0 release introduced LU90 rooms; the current release uses LU120.

## Supplied UNLOCKED branding (v0.8.3)

The supplied neon UNLOCKED artwork replaces the text treatment in the header, opening screen, and fighter selection. The same PNG appears over all five existing UNLOCKED signs, mat, and apron wordmarks across Bloodymania, Hell’s Pit, and Rusted Warehouse. Other arenas have no existing UNLOCKED wordmarks to replace. The opening background now uses the same branded canvas as gameplay.

The original PNG is included byte-for-byte as `dist/assets/banners/unlocked.png`; CSS frames its empty margins and blends the black background into the interface. Arena placement is handled by the renderer, preserving the original arena images and the foreground rope over the mat graphic. Text remains in page titles and accessibility labels so the game is still named correctly for browser tabs and screen readers. Phone layouts, existing fighters, and gameplay rules are retained. Multiplayer uses protocol v12 for the 36-fighter roster.

## Phone fighter selection

This package contains **36 fighters**. On a portrait phone, use **MORE / BACK** to browse six pages (six fighters per page), or use **PICK ANY FIGHTER** to select any name directly. **USE FIGHTER** opens match setup. The **FIGHTERS** button takes you back; rotation preserves your chosen wrestler. Website stats are visible in the phone setup panel.

If an older game link has exactly nine wrestlers, it is a different build. At the time of this fix, the GitHub `Lunacyunlocked2` source contained nine, while the `JCWLUNACYUNLOCKED` main source contained 21 (v0.6.0). This v0.12.1 package has not been deployed to either repository.

## Phone match optimization (v0.8.2)

- The ring and thumb controls fit the visible phone screen, including browser toolbar changes, notches, and the home indicator. Portrait keeps controls below the ring; landscape uses narrower side controls and a larger HUD.
- A closer combat camera pulls back for airborne wrestlers so jumps and lifts have room below the HUD.
- Rotation clears held inputs and pauses offline matches. Online play keeps running and sends neutral input until you press again.
- Automatic display mode sizes the canvas for the screen and caps rendering at 60 fps, including on 90/120 Hz displays. **CONTROLS → DISPLAY → SAVE BATTERY** reduces rendering to 30 fps. Combat simulation and input sampling stay at 60 Hz in either mode.
- Phone rendering limits decorative particles and glow effects. Static menus and paused matches do not continuously repaint the canvas; hidden tabs do not draw it.
- Only the visible roster page requests its portraits. Optional banners and combat effects load only when needed, with text/impact fallbacks if a download fails. All supplied artwork remains in the package.

The automated and native-canvas checks are documented in TESTING.md. Physical-device touch response, thermal behavior, and browser FPS still need device testing.

## Play locally

Install Node.js 20 or newer, open a terminal in this folder, and run:

```sh
npm start
```

Open **http://localhost:8080**. No `npm install` or build dependencies are required. Keep the terminal open while playing. Double-clicking `index.html` will not work because browser ES modules and asset loading need HTTP.

Alternatively, with Python 3:

```sh
python -m http.server 8080 --directory dist
```

## Included

- Twenty-four playable wrestlers: Violent J, 2 Tuff Tony, Willie Mack, Mickie Knuckles, Kerry Morton, Mr. Happy, Moshpit Mike, Cokane, Yabo, Able, Dani Mo, Facade, J-Rod, Matt Cross, Vincenzo, Caleb Konley, Sally Boy, Big Vito, Bruce Wayans, Alice Crowley, Ruffo, Kongo Kong, Father Bronson, and Hokane.
- Online multiplayer through the original JCW Firebase project: private room codes and Quick Match.
- VS CPU with three difficulty levels; local two-player versus; a twenty-three-opponent arcade run.
- Six arenas: Bloodymania, Hell’s Pit, Madhouse, Rusted Warehouse, Funhouse, and Lunacy Outdoors. The last two are recovered from the legacy ZIP.
- The recovered JCW theme and the existing Genesis-style Fight Club track; choose either in CONTROLS. The supplied JCW theme starts when you press PRESS START. You can mute it or choose the alternate track.
- Practice mode: a passive opponent, unlimited time, full finisher meter, and automatic reset after a KO, pinfall, or tap-out.
- Phone controls with a sliding D-pad, simultaneous movement and attacks, optional hold-to-repeat HIT, a repeated-tap escape button, finisher charge display, and context-sensitive GRAB / PIN / BREAK / CLIMB / DIVE labels, plus separate WEAPON and TAUNT buttons.
- Movement, running, jump, strike, unarmed heavy, block and guard break, overhead grapple throw, directional falls, recovery, pin and kick-out, submission and hold escape, and a meter-powered finisher.
- The fifteen expanded-roster wrestlers can cycle between bare hands, chair, bat, guitar, and trashcan; taunt for meter; climb either corner; and dive onto standing or downed opponents. The original nine retain their authored chair move set.
- Best-of-three rounds, 99-second timer, KO, pinfall, and submission victories, match results, rematch, pause, and character selection.
- Keyboard, touch controls, and standard-mapped gamepads. Two controllers can play together locally.
- Supplied PINFALLED, KICK OUT, TAP OUT, YOU WIN, and LUNACY announcement graphics; animated hit debris, impact smoke, guard puffs, and ground dust. Effects respect reduced-motion preferences.
- Fixed 60 Hz simulation, attack startup / active / recovery windows, input buffering, fair simultaneous hits, one damage application per move, impact feedback, and synthesized hit sounds.

The start screen lets you choose a fighter, opponent, mode, difficulty, and arena. Choose **FIGHT** for offline modes. For online play, select **ONLINE MULTIPLAYER**, then **CREATE ROOM**, **JOIN ROOM**, or **QUICK MATCH**. The host chooses the arena, and the match starts after both clients load their wrestlers. Online matches continue while menus are open; after a result, return to the online lobby for another room. PRESS START plays a short original arcade chime and starts the selected track (JCW THEME by default); an explicit mute choice is remembered. **CONTROLS** also contains music, display/battery mode, touch-control visibility, touch strike repeat, and vibration preferences. These choices are saved on this device when browser storage is available.

## Controls

| Action | Player 1 | Player 2 (local versus) | Standard gamepad |
|---|---|---|---|
| Move | Left / Right arrows | A / D | Stick or D-pad |
| Jump | Up arrow | W | A / south |
| Strike | Z (or J) | F (or 1) | X / west |
| Heavy / selected weapon | X (or K) | G (or 2) | Y / north |
| Grapple / pin / climb / dive | C (or L) | H (or 3) | B / east |
| Submission (downed opponent) | Down + C | S + H | LB + B |
| Block | Down arrow | S | LB / D-pad down |
| Finisher | V (or U) | R (or 0) | RB |
| Change weapon | Q | T | LT |
| Taunt | E | Y | RT |
| Run immediately | Left Shift + direction | Right Shift + direction | Left stick click + direction |
| Pause | Esc or P | Esc or P | Start |

In solo modes, WASD remains a movement alias for Player 1. In local versus, WASD belongs to Player 2, so both keyboard players can move independently. Player 2 can also use numpad 1, 2, 3, and 0. Touch controls operate your own wrestler: Player 1 offline and the host online, or Player 2 when joining an online match. Both online players use the Player 1 keyboard mappings on their own device. Standard browser gamepad support depends on the controller/browser pairing.

**Phone:** slide your left thumb across the cross-shaped D-pad; diagonals support moving and jumping. The middle rests neutral. Lift your thumb or slide outside the pad to stop. Use another finger on the action buttons while moving. Hold HIT for repeated ordinary strikes, or turn that option off in CONTROLS. Heavy, grapple, finisher, and escape actions require fresh presses. GRAB becomes PIN beside a downed opponent and BREAK during an enemy grapple. When downed or pinned, a large GET UP / KICK OUT button replaces the action cluster. Tap it repeatedly; the input adapter supplies alternating strike/heavy presses to the existing escape rules. Holding it does not escape automatically.

**Phone view:** landscape places controls in side rails outside the ring. Portrait uses a 4:3 canvas with a closer camera and larger HUD. The match layout follows the visible screen as browser bars change. Turning the phone pauses an offline match and clears held input. Portrait mode is playable without rotating the phone. Pausing and opening CONTROLS hides the touch deck, and losing focus clears input. Use CONTROLS → TOUCH CONTROLS → ALWAYS SHOW if your device does not identify itself as a touch screen. Vibration only runs on supporting devices.

**Run:** keep moving in one direction for about half a second to accelerate. Shift starts the run immediately; touch players simply hold the D-pad. Releasing direction stops movement.

**Weapons:** tap WEAPON (Q) to cycle bare hands → chair → bat → guitar → trashcan → bare hands. HEAVY uses the selected weapon and the corresponding wind-up, contact, and recovery art. A guitar breaks after two landed attacks. Blocking and misses do not count toward its durability. Changing weapon has a short recovery; grappling or climbing puts it away. New wrestlers without a kick sheet use an intact forward strike for unarmed heavy.

**Taunt:** press TAUNT (E). Complete the one-second pose to earn 12 meter; an enemy hit interrupts the reward. A four-second cooldown prevents constant taunt rewards.

**Corners:** approach either corner with the opponent more than 135 game units away, then press GRAB when it says CLIMB. On top, press GRAB, jump, or an attack to DIVE; use FINISH with full meter for a stronger dive. Down safely dismounts, and waiting three seconds also dismounts. A dive can hit a downed opponent, followed by a pin. Blocking counters it; missing causes a vulnerable landing and a small health penalty. A nearby opponent takes grapple/pin priority over climbing.

**Grapple:** get close and press grapple. The attacker lifts and throws the actual selected opponent. Grapples bypass block. A missed grapple has recovery. Tap grapple within the first 0.28 seconds of being grabbed to break the throw. Corner throws send the opponent back toward the ring without teleporting the attacker.

**Pin:** press grapple beside a downed opponent. The referee counts three. A pinned player alternates strike and heavy to escape; holding a button does not repeatedly count, and pressing strike and heavy together does not count as alternating. Healthy opponents are harder to pin, and CPU resistance depends on damage and difficulty.

**Submission:** hold Down and press GRAB next to a downed opponent. The ground hold resolves after 3.6 seconds if the defender cannot escape. Alternate strike/heavy on keyboard or gamepad, or tap ESCAPE on phone. Healthy opponents naturally resist. A successful hold awards a fall by TAP OUT; a normal GRAB still starts a three-count pin.

**Finisher:** fill the LUNACY meter by giving and taking damage. Use the finisher at close range when the meter is full. Missing still spends the meter. The legacy build supplies finisher names for Violent J, 2 Tuff Tony, Willie Mack, Kerry Morton, Moshpit Mike, and Cokane. These names appear in selection and during activation. Ground finishers use shared charged knockdown rules with the selected weapon or unarmed pose. The fifteen expanded-roster wrestlers can also spend full meter on a corner dive. Finisher names are presentation labels; separate signature holds, flips, and move-specific choreography have not been recreated.

**Responsiveness:** button taps are retained even if pressed and released between simulation ticks. Actions entered up to 0.16 seconds before recovery ends can execute when the fighter is ready. Keyboard and gamepad attack holds do not auto-repeat. Touch HIT optionally repeats at a controlled interval of 0.46 seconds; it still uses the same startup, recovery, range, and damage rules.

**Block:** stops incoming strikes while guard remains. Heavy pressure can break the guard. Throws counter blocking. Aerial attacks can miss depending on the fighters' relative height.

## Put the project in GitHub

Upload the contents of this folder to the root of your repository, keeping `dist`, `tests`, `tools`, and `.github` intact. No generated asset exceeds GitHub's normal per-file size limit.

The included **Check game** workflow runs on pushes and pull requests. It checks module syntax, assets, sprite rectangles, UI references, and the combat simulation.

To publish from your repository root:

1. Upload the **contents** of the `lunacy-unlocked` folder to your repository. The new `index.html` must sit beside the `dist` folder, not inside another enclosing folder.
2. Open **Settings → Pages → Build and deployment**.
3. Set **Source** to **Deploy from a branch**, choose **main** (or your actual branch) and **/(root)**, then **Save**.

The root `index.html` automatically opens `dist/index.html`. Keep the `dist` folder and everything inside it. The included `.nojekyll` file lets GitHub publish the static files directly. Once branch publishing is enabled, pushes to that branch update the site.

If you already use **GitHub Actions** as the Pages source, the existing **Deploy to GitHub Pages** workflow still works: run it from the Actions tab. It publishes only `dist`, whose own `index.html` remains the game entry point.

All paths remain relative, so both publishing methods work at a repository subpath such as `/lunacy-unlocked/` and at a domain root. See [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Workflow reference: [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Project layout

```text
index.html          Root launcher for branch-based GitHub Pages
.github/workflows/   CI and manual GitHub Pages deployment
dist/index.html     Game menus and canvas
dist/style.css      Responsive presentation
dist/phone.css      Fitted phone match layout
dist/src/phone-layout.js Viewport geometry, camera, canvas sizing
dist/src/frame-pacer.js Presentation pacing and idle redraw control
dist/src/optional-artwork.js Nonblocking decorative artwork loading
dist/src/engine.js  Pure deterministic match simulation
dist/src/render.js  Arena, sprite animation, HUD, and impact rendering
dist/src/input.js   Keyboard, touch, and gamepad input
dist/src/audio.js   Music selection and generated sound effects
dist/src/arenas.js  Arena names, artwork paths, and legacy ring crops
dist/src/touch-ui.js Context-sensitive phone labels and escape display
dist/src/main.js    Selection, match flow, arcade run, pause, and results
dist/assets/        Prepared transparent atlases, portraits, arenas, and audio
tests/              Engine, input, touch UI, and animation regression checks
tools/              Local server, validation, asset preparation and audit
```

Run validation with:

```sh
npm run check
npm test
```

`npm run build` performs the static validation; the authored `dist` folder is already the complete distributable.

## Artwork and animation notes

The original uploads are labeled JPEG/PNG sheets rather than runtime-ready uniform grids. `tools/prepare_assets.py` extracts complete figures, removes connected paper backgrounds, preserves enclosed white costume details, normalizes size, and packs tight transparent atlases. `tools/asset-audit.json` records source filenames and crop bounds. `tools/asset-review.jpg` shows representative prepared poses.

The game uses source artwork without the sheet headings, borders, or neighboring poses. Walking direction is corrected where source sheets face the other way. The source folder named `Yahoo` is presented as **Yabo**. Atlas frames carry foot anchors so a swinging chair does not move the whole wrestler sideways. Lifted opponents rotate as a single intact sprite around their body center, with a smooth lift and landing. The runtime does not bake a second wrestler into the attacker sprite: it synchronizes two independently selected characters, avoiding baked-in duplicate opponents.

Some poses are adapted from other supplied actions: ordinary strikes use authored elbows or selected forward-hand throw poses with recoil, and 2 Tuff Tony's pin uses a kneeling recovery pose. New dedicated lifted/thrown poses are used where supplied; otherwise the intact selected opponent rotates through the throw. All 435 image files in the fifteen fighter archives appear in `tools/new-asset-audit.json`. Duplicate viewing directions, clipped figures, scenery, and labels are excluded from runtime sequences. Matt Cross, Vincenzo, Caleb Konley, Father Bronson, Hokane, and the five v0.6 additions use their intact bodies with the prepared guitar prop where original contact artwork overlaps or clips. Rope scenery is removed with reviewed regions and narrow background repairs; tiny illustrated edge remnants may remain. See `SPRITE-MAP.md`. Ring exits, story dialogue, persistent unlocks, and unique signature choreography remain outside this build. All twenty-four wrestlers are available immediately.

To rebuild the artwork, keep the extracted original folders outside the repository and run:

```sh
python -m pip install Pillow numpy scipy
python tools/prepare_assets.py /absolute/path/to/extracted/asset-folders
```

The original preparation command recreates the first nine wrestlers. For the remaining fifteen, extract their ZIPs into sibling folders with the character folder names used in `tools/prepare_new_assets.py` (Hokane’s folder is `Hokane Sprite Set`), then run:

```sh
python tools/prepare_new_assets.py /path/to/extracted/folders
# Optional targeted update, preserving other fighters:
python tools/prepare_new_assets.py /path/to/extracted/folders hokane
python tools/prepare_banners.py /path/to/banner/uploads
python tools/prepare_combat_fx.py /path/to/effect/uploads
```

Preparation needs Pillow, numpy, and scipy; playing the prepared game needs none of these. The nine announcement/effect PNGs are packed into transparent textures. The ground-dust sheet has four first-row frames and eight second-row frames; its 12-step timeline preserves the original scale.

## Validation and release status

See [TESTING.md](TESTING.md) for the current v0.12.1 checks. This release adds targeted regressions for chains, grab clashes, recovery input, guard damage, dives, pins, CPU spacing, online messages, lazy artwork loading, bounded effects, and cache release. Both online players should use v0.12.0. The complete 36-fighter roster, website stats, and asset bytes are retained.

The local browser preview was blocked, so this pass uses automated simulation and native canvas renders of the actual Match/Renderer. No new live Firebase or physical phone/controller test was performed. This ZIP has not been deployed.
