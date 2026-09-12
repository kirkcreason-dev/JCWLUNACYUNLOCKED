# JCW Lunacy: Lunacy Unlocked

A playable 2D arcade wrestling fighter built from the supplied JCW wrestler sheets, arena artwork, and Genesis-style Fight Club track. Version **0.6.0**.

The skippable 4.4-second startup flashes the supplied Creaso·Norse emblem, Creaso·Norse wordmark, JCW hatchet artwork, and Psychopathic Records header. It then reveals the new neon title screen. The title screen uses the supplied Lunacy graffiti logo and starts your music on PRESS START. This update adds Sally Boy, Big Vito, Bruce Wayans, Alice Crowley, and Ruffo, bringing the roster to 21. It includes the supplied announcement artwork, animated combat effects, and a playable submission hold. Able’s re-upload matches his existing artwork exactly. Arrow-key PC movement, phone controls, the previous roster, and original Firebase multiplayer are retained. See [SPRITE-MAP.md](SPRITE-MAP.md), [MULTIPLAYER.md](MULTIPLAYER.md), and [CHANGELOG.md](CHANGELOG.md).

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

- Twenty-one playable wrestlers: Violent J, 2 Tuff Tony, Willie Mack, Mickie Knuckles, Kerry Morton, Mr. Happy, Moshpit Mike, Cokane, Yabo, Able, Dani Mo, Facade, J-Rod, Matt Cross, Vincenzo, Caleb Konley, Sally Boy, Big Vito, Bruce Wayans, Alice Crowley, and Ruffo.
- Online multiplayer through the original JCW Firebase project: private room codes and Quick Match.
- VS CPU with three difficulty levels; local two-player versus; a twenty-opponent arcade run.
- Six arenas: Bloodymania, Hell’s Pit, Madhouse, Rusted Warehouse, Funhouse, and Lunacy Outdoors. The last two are recovered from the legacy ZIP.
- The recovered JCW theme and the existing Genesis-style Fight Club track; choose either in CONTROLS. The supplied JCW theme starts when you press PRESS START. You can mute it or choose the alternate track.
- Practice mode: a passive opponent, unlimited time, full finisher meter, and automatic reset after a KO, pinfall, or tap-out.
- Phone controls with a sliding D-pad, simultaneous movement and attacks, optional hold-to-repeat HIT, a repeated-tap escape button, finisher charge display, and context-sensitive GRAB / PIN / BREAK / CLIMB / DIVE labels, plus separate WEAPON and TAUNT buttons.
- Movement, running, jump, strike, unarmed heavy, block and guard break, overhead grapple throw, directional falls, recovery, pin and kick-out, submission and hold escape, and a meter-powered finisher.
- The twelve expanded-roster wrestlers can cycle between bare hands, chair, bat, guitar, and trashcan; taunt for meter; climb either corner; and dive onto standing or downed opponents. The original nine retain their authored chair move set.
- Best-of-three rounds, 99-second timer, KO, pinfall, and submission victories, match results, rematch, pause, and character selection.
- Keyboard, touch controls, and standard-mapped gamepads. Two controllers can play together locally.
- Supplied PINFALLED, KICK OUT, TAP OUT, YOU WIN, and LUNACY announcement graphics; animated hit debris, impact smoke, guard puffs, and ground dust. Effects respect reduced-motion preferences.
- Fixed 60 Hz simulation, attack startup / active / recovery windows, input buffering, fair simultaneous hits, one damage application per move, impact feedback, and synthesized hit sounds.

The start screen lets you choose a fighter, opponent, mode, difficulty, and arena. Choose **FIGHT** for offline modes. For online play, select **ONLINE MULTIPLAYER**, then **CREATE ROOM**, **JOIN ROOM**, or **QUICK MATCH**. The host chooses the arena, and the match starts after both clients load their wrestlers. Online matches continue while menus are open; after a result, return to the online lobby for another room. PRESS START plays a short original arcade chime and starts the selected track (JCW THEME by default); an explicit mute choice is remembered. **CONTROLS** also contains music, touch-control visibility, touch strike repeat, and vibration preferences. These choices are saved on this device when browser storage is available.

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

**Phone view:** landscape places controls in side rails outside the ring. Portrait uses a 4:3 canvas with a closer camera and larger HUD. Portrait mode is playable without rotating the phone. Pausing and opening CONTROLS hides the touch deck, and losing focus clears input. Use CONTROLS → TOUCH CONTROLS → ALWAYS SHOW if your device does not identify itself as a touch screen. Vibration only runs on supporting devices.

**Run:** keep moving in one direction for about half a second to accelerate. Shift starts the run immediately; touch players simply hold the D-pad. Releasing direction stops movement.

**Weapons:** tap WEAPON (Q) to cycle bare hands → chair → bat → guitar → trashcan → bare hands. HEAVY uses the selected weapon and the corresponding wind-up, contact, and recovery art. A guitar breaks after two landed attacks. Blocking and misses do not count toward its durability. Changing weapon has a short recovery; grappling or climbing puts it away. New wrestlers without a kick sheet use an intact forward strike for unarmed heavy.

**Taunt:** press TAUNT (E). Complete the one-second pose to earn 12 meter; an enemy hit interrupts the reward. A four-second cooldown prevents constant taunt rewards.

**Corners:** approach either corner with the opponent more than 135 game units away, then press GRAB when it says CLIMB. On top, press GRAB, jump, or an attack to DIVE; use FINISH with full meter for a stronger dive. Down safely dismounts, and waiting three seconds also dismounts. A dive can hit a downed opponent, followed by a pin. Blocking counters it; missing causes a vulnerable landing and a small health penalty. A nearby opponent takes grapple/pin priority over climbing.

**Grapple:** get close and press grapple. The attacker lifts and throws the actual selected opponent. Grapples bypass block. A missed grapple has recovery. Tap grapple within the first 0.22 seconds of being grabbed to break the throw. Corner throws send the opponent back toward the ring without teleporting the attacker.

**Pin:** press grapple beside a downed opponent. The referee counts three. A pinned player alternates strike and heavy to escape; holding a button does not repeatedly count, and pressing strike and heavy together does not count as alternating. Healthy opponents are harder to pin, and CPU resistance depends on damage and difficulty.

**Submission:** hold Down and press GRAB next to a downed opponent. The ground hold resolves after 3.6 seconds if the defender cannot escape. Alternate strike/heavy on keyboard or gamepad, or tap ESCAPE on phone. Healthy opponents naturally resist. A successful hold awards a fall by TAP OUT; a normal GRAB still starts a three-count pin.

**Finisher:** fill the LUNACY meter by giving and taking damage. Use the finisher at close range when the meter is full. Missing still spends the meter. The legacy build supplies finisher names for Violent J, 2 Tuff Tony, Willie Mack, Kerry Morton, Moshpit Mike, and Cokane. These names appear in selection and during activation. Ground finishers use shared charged knockdown rules with the selected weapon or unarmed pose. The twelve expanded-roster wrestlers can also spend full meter on a corner dive. Finisher names are presentation labels; separate signature holds, flips, and move-specific choreography have not been recreated.

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

Some poses are adapted from other supplied actions: ordinary strikes use authored elbows or selected forward-hand throw poses with recoil, and 2 Tuff Tony's pin uses a kneeling recovery pose. New dedicated lifted/thrown poses are used where supplied; otherwise the intact selected opponent rotates through the throw. All 340 sheets in the twelve unique fighter archives appear in `tools/new-asset-audit.json`. Duplicate viewing directions, clipped figures, scenery, and labels are excluded from runtime sequences. Matt Cross, Vincenzo, Caleb Konley, and the five v0.6 additions use their intact bodies with the prepared guitar prop where original contact artwork overlaps or clips. Rope scenery is removed with reviewed regions and narrow background repairs; tiny illustrated edge remnants may remain. See `SPRITE-MAP.md`. Ring exits, story dialogue, persistent unlocks, and unique signature choreography remain outside this build. All twenty-one wrestlers are available immediately.

To rebuild the artwork, keep the extracted original folders outside the repository and run:

```sh
python -m pip install Pillow numpy scipy
python tools/prepare_assets.py /absolute/path/to/extracted/asset-folders
```

The original preparation command recreates the first nine wrestlers. For the remaining twelve, extract their ZIPs into sibling folders with the character names used in `tools/prepare_new_assets.py`, then run:

```sh
python tools/prepare_new_assets.py /path/to/extracted/folders
# Optional targeted update, preserving other fighters:
python tools/prepare_new_assets.py /path/to/extracted/folders sally-boy big-vito bruce-wayans alice-crowley ruffo
python tools/prepare_banners.py /path/to/banner/uploads
python tools/prepare_combat_fx.py /path/to/effect/uploads
```

Preparation needs Pillow, numpy, and scipy; playing the prepared game needs none of these. The nine announcement/effect PNGs are packed into transparent textures. The ground-dust sheet has four first-row frames and eight second-row frames; its 12-step timeline preserves the original scale.

## Validation and release status

**100 automated tests pass.** The checker validates 21 fighters, 1,970 animation entries, six arenas, both music choices, module syntax, and UI references. Coverage includes all supplied weapon sets, submissions and escapes, online roster/snapshot transport, effect lifetime and reduced motion, and renderer crop bounds. The prior 16 fighter definitions and image bytes are unchanged.

All five added fighters were visually reviewed in the actual renderer across attacks, weapons, lifting, throws, pins, climbs, dives, and falls. Live Alice Crowley/Ruffo browser clients connected through Firebase; guest attacks, synchronized damage/meter, and room closure were observed. Desktop and phone browser checks are recorded in [TESTING.md](TESTING.md). Both online players need v0.6.0. Physical phones, hardware controllers, and real-world network latency still need device testing. This ZIP has not been deployed to GitHub.
