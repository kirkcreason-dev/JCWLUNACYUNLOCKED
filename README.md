# JCW Lunacy: Lunacy Unlocked

A playable 2D arcade wrestling fighter built from the supplied JCW wrestler sheets, arena artwork, and Genesis-style Fight Club track. Version **0.20.3**.

## Secret fighters (v0.21.0)

Violent J, Jeff Lane, DJ Clay and Shaggy 2 Dope are hidden from the fighter picker until the championship belt is won once on this browser. See CHANGELOG.md and GAMEPLAY.md. Use v0.21.0 on both devices for online play.

## Top-rope dive recovery fix (v0.20.3)

A dive now connects when its target starts getting up, including the brief protected frames after standing. A connecting dive no longer passes through the opponent and charges the diver missed-landing damage. Strong blocks still stop dives, guard breaks still connect, and genuine misses retain their normal penalty. Ordinary strikes/grabs and throw-break/kickout protection keep their existing rules.

All 39 fighters, Alice’s replacement, DJ Clay’s corrected portrait, phone corner fixes, sounds and saved progress remain included. Full ZIP only; no deployment.

## DJ Clay portrait fix (v0.20.2)

DJ Clay now faces forward on fighter selection, opponent previews and results. The original source FRONT pose replaces the side-view portrait, and a fighter-specific image revision refreshes cached copies. His gameplay atlas and all combat animations remain unchanged. The Alice replacement and previous phone/gameplay fixes are included.

## Alice Crowley replacement (v0.20.1)

Alice's portrait and complete runtime sprite atlas now use the supplied 26-sheet replacement pack. Her existing roster slot, approved ratings and Uni-Lariat remain. Movement faces the correct direction, bare-hand heavy uses her new kick, and falls/recovery use matching body-sized endpoints. Guitar and trash-can attacks adapt the new throw poses with measured weapon props; walking uses the supplied carried-weapon art.

The phone corner/background fix, top-rope taunts, superplexes, pole matches, all 39 fighters, sounds, credits and saves from v0.20.0 remain included. Changed Alice images have their own cache revision. See [ALICE-REPLACEMENT.md](ALICE-REPLACEMENT.md) for source mappings and rebuild instructions. Full ZIP only; no deployment.

The gameplay refinement adds confirmed strike chains, gradual run acceleration, fair simultaneous grab breaks, more responsive recovery, rope breaks, manual hold release, and smarter CPU attack spacing. The original 36 wrestlers remain intact; Josh Bishop, Ring Rat and The Green Phantom bring the roster to 39. The supplied startup logos, title artwork, arenas, effects, and music are included. See [GAMEPLAY.md](GAMEPLAY.md) for the updated fight rules and [TESTING.md](TESTING.md) for validation and limitations.

## Weapons, top-rope moves and pole matches (v0.20.0)

- Distinct bare-hand and weapon attacks, stronger weapon impacts, persistent wear and remaining-hit labels. Added weapon props track the hands and actual attack phases.
- TAUNT on the top rope earns 20 meter if completed safely. GRAB beside a perched opponent—or from the perch with an opponent close below—performs a higher-damage superplex. The defender gets a 0.38-second break window.
- WEAPON ON A POLE is available against CPU or in local two-player mode. Climb the marked corner, hold CLAIM to take the chair, and win two falls. Knockdowns drop the chair for either player to pick up. A new chair appears each round.
- Fixed the duplicated/stretched phone background at the corners. Portrait uses a fitted 4:3 stage with one arena, and normal corner travel and jumps keep the camera steady.
- All 39 fighters, supplied media, previous fixes, championship progress and arcade medals remain included. Online uses v20 / LU200 rooms for the new combat rules; pole mode is offline.

See [WEAPONS-AND-POLE.md](WEAPONS-AND-POLE.md) for controls, weapon values and rules.

## Updated championship credits (v0.19.1)

The supplied replacement credits artwork now appears after the championship win and through VIEW CREDITS. The readable credits replace Mark Ward with Nocturnal Deadhead; previously requested 3-Zee and Son of Man remain in the text list. Online compatibility stays on v19 / LU190.

## Supplied sound packs (v0.19.0)

The supplied wrestling effects now follow punches, kicks, weapon contact, slams, rope rebounds, landings, footsteps and the bell. DJ Clay uses his button, charge and bass sounds at the firing frame of his finisher, including misses. An interrupted wind-up stops the charge. Music and effects still have separate volume controls.

Sounds load in the background with bounded memory and simultaneous playback. Missing or delayed files use the existing procedural cues without delaying a match. All 53 supplied WAV files are preserved; 49 individual samples are used during play. See [AUDIO.md](AUDIO.md) for mappings and testing notes.

## Tester update and illustrated controls (v0.18.0)

- All 39 fighters have bare hands, chair, bat, guitar and trash can; 2 Tuff Tony also has a bottle. The original nine now taunt, climb and dive using their own supplied poses.
- Corrected display names: Abel and Jackson. Stable internal IDs preserve existing saves and source mappings.
- Free movement faces travel. Attacks and blocks turn toward the opponent. Matt Cross/Steven Flowe locomotion and jump scales are adjusted; Vito uses full-size airborne poses. Matching fall/rest endpoints avoid size pops. Tony and Kerry use backward body rotation for face-up back bumps and pins, without the inverted fall frames.
- Down + HEAVY commits to a guard counter. HEAVY in the air is an air strike. Both use the fighter's own strike/kick art. A confirmed HIT → HIT → HEAVY chain ends in a knockdown. Blocks and whiffs retain recovery; no infinite chain.
- Arcade rewards per fighter: Easy bronze/Lunacy Survivor, Normal silver/Roster Wrecker, Hard gold/Lunacy Legend. Each medal adds a portrait frame; all three earn a Triple Crown frame. Achievements save locally. Arcade runs themselves remain single-session runs; championships retain their existing checkpoints.
- Taller portrait ring, shorter landscape HUD, safe-area/fullscreen handling, and a stable camera envelope during normal jumps. Browser bars and rotation recompute the layout without repeated canvas clearing.
- Stronger, throttled vibration on supported devices; gesture activation, a TEST VIBRATION button, and explicit unsupported/declined feedback. Unsupported browsers cannot be made to vibrate by game code. See [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate).
- Supplied touch-control sheet used unchanged through CSS regions: D-pad, HIT/HEAVY/FINISH, contextual GRAB states and recovery. Weapon names, finisher charge and escape progress stay live. The original functional controls remain the fallback if this optional artwork fails to load.

Full source plus playable `dist` are included. No push or deployment. If regenerating character atlases, run `python3 tools/apply_tester_fixes.py` after the older extraction/repair passes, then `npm test` and `npm run check`.

## Roster update (v0.17.0)

Josh Bishop, Ring Rat and The Green Phantom are playable in all modes. Their 86 source sheets are tracked in `tools/expansion39-audit.json`. Ratings come from the supplied approval table. Josh’s pack prints “Caleb Konley” in its headers; the supplied artwork is used under the Josh Bishop file identity, with those headers removed. Green Phantom’s unspecified finisher remains Lunacy Finisher.

## Gameplay and stability update (v0.16.0)

- Run into the ropes to rebound, then use HEAVY to attack on the way back. Down cancels into guard. Grapple lifts now rise smoothly instead of jumping upward at the start of the lift.
- Ratings determine CPU fighting styles: flyers prefer aerial attacks, technicians favor throws/submissions, powerhouses favor heavy attacks, and brawlers mix their options. Finishers trade reach against damage and knockback by style. Technique improves guard recovery. Approved ratings and finisher names remain unchanged.
- Original synthesized arcade punches, slams, rope sounds, bell, referee mat slaps and crowd reactions. Separate music/effect volume controls. These are procedural sounds, not recordings or character voices.
- Win the five-match championship and your supplied credits artwork opens automatically. Read Credits offers the names as accessible text; Defend Your Title continues the saved run. Successful defenses show the belt result without replaying completion credits automatically.
- Contextual first-match tips explain approach, strikes, combos, reversals, pins, escapes and finishers. Tips remember completed lessons, can be disabled, and can be reset in Controls.
- Decoded match artwork is evicted before the next match loads; old arena requests cannot repopulate the cache. Image requests time out, failed optional art backs off, and sound nodes are capped and explicitly released. Automatic display reduces rendering cost after sustained expensive draws; combat still simulates at 60 Hz.

**Online:** use v0.20.3 on both devices. The host runs the corrected dive collision; snapshot format and v20 / LU200 rooms remain compatible. New games use v20 / LU200 rooms so older gameplay builds cannot join these matches. Existing championship saves remain compatible.

Validation details and device handoff are in TESTING.md. Automated checks cover the full roster, online selection, championship saves and credits, phone pagination, and native canvas rendering. Physical-device playtesting remains necessary.

## Pause and time-limit artwork (v0.15.3)

The supplied PAUSED image appears on the offline pause menu, including graphics-recovery pauses. Online menus and disconnect notices retain accurate text without PAUSED artwork. TIME OUT! appears briefly when a round ends at the time limit, followed by the normal round winner or draw. Text remains available if optional banner artwork has not loaded. Both PNGs are included unchanged.

## Supplied artwork (v0.15.2)

Your championship belt now appears when you win or defend the title. REVERSAL! and SECOND WIND! use the supplied artwork with player/meter labels below the HUD in desktop and phone layouts. Optional artwork loads asynchronously, with text cues available if loading fails. The selection-screen artwork provides the ornamental border around the live roster and setup controls; its pictured placeholder grid and buttons are not displayed as interactive controls. All four original PNGs are included unchanged.

## Fighter animation repairs (v0.15.1)

Reviewed movement, combat, fall/recovery and supplementary frames for all 39 fighters. Corrected mixed-facing walk/run and weapon-carry poses, and aligned jittery locomotion to the body instead of the alternating lowest foot. Tony now settles flat after falling. Big Vito uses clean full-size airborne poses, Steven Flowe holds a flat KO pose, and Atiba/Tommy/Jacksyn finish front falls face-down without a size jump. Bronson launches his dive before extending into flight. Matt Cross uses his intact unarmed strike instead of the source kick panel that clips his head; heavy-attack timing and damage are retained.

All supplied image/audio files, fighter ratings, finishers and Championship mode remain included. The DJ Clay selection-screen side-view issue is corrected in v0.20.2 using his original front-facing standing pose. This is a full replacement ZIP, not a live deployment. See TESTING.md and tools/movement-audit.json for scope and limitations.

## Championship mode (v0.15.0)

Choose **CHAMPIONSHIP**, your wrestler and difficulty, then **START CHAMPIONSHIP**. Win five best-of-three matches: opening bout, quarterfinal, contender match, semifinal and title match. Each run draws five distinct opponents and places the strongest of that draw in the title match, using normal roster stats. Arenas rotate automatically from your starting arena.

Win the title to receive the Lunacy championship belt, then select **DEFEND YOUR TITLE** for a fresh challenger. Consecutive challengers do not repeat. The game tracks title wins, defenses this reign and your best defense streak. A loss during the five-match road retries that same opponent; a lost defense starts a new five-match chase while retaining title-win and best-streak records.

Progress saves on this browser after each match, separately for each fighter and difficulty. Return to the same fighter/difficulty and choose **CONTINUE CHAMPIONSHIP** or **DEFEND YOUR TITLE**. Quitting or reloading mid-match restarts that match, not the whole run. Records are local to this browser, not synced across devices; clearing browser data removes them. When browser storage is blocked, the game displays that progress lasts only for the session.

This is a solo CPU mode. Local versus, the full-roster arcade run, practice and online play remain available. This mode was introduced in v0.15.0; current combat and online rules are described above. The full ZIP is not deployed automatically.

## Reversals and Second Wind (v0.14.0)

Press **block just before a normal strike connects**, keep guarding through impact, then release and counterattack. A successful reversal staggers the attacker for 0.32 seconds and earns 12 Lunacy. The timing window is 0.12 seconds, each attempt has a 1.2-second cooldown, and at least 20 guard is required. Holding block still works normally. Finishers, grabs and dives retain their existing counters. Use Down on keyboard/phone or LB on gamepad; no new buttons are needed.

**Second Wind** triggers once per round when opponent damage leaves you alive at 30 health or less: gain 25 Lunacy and 20 guard, capped at 100. It can put a comeback finisher within reach, but does not heal, cancel hitstun or rescue a KO. Missing a dive does not earn the boost. Both players and the CPU use the same rules.

New cues appear below the HUD in desktop, phone portrait and phone landscape, with distinct short sounds and optional touch vibration. Existing steady HUD rails, reduced shake and bounded effects remain. All 39 fighters, approval exclusions and supplied assets are retained.

Both online players must load **v0.17.0**, using v17 / LU170 rooms. This ZIP has not been deployed.

## Faster gameplay and running attacks (v0.13.0)

Movement is 12% faster, with run buildup shortened from 0.42 to 0.38 seconds. Attack wind-up and recovery are 10% shorter, while active contact windows, damage, match clock, throw breaks and pin escapes retain their timing. Walking/running animation cadence and touch HIT repeat follow the new pace.

Build into a run toward your opponent, then tap HEAVY for a short lunge. It closes about 45 ring units without extra damage; a miss or block still leaves the attacker committed to recovery. A RUNNING HIT cue confirms a landed attack. No extra button is needed on phone, keyboard or gamepad. The pause after a round is shortened from 3.0 to 2.4 seconds. The screen flicker fixes and phone render limits remain in place.

Reload after uploading; the version under FIGHT should read v0.17.0.

## Roster approvals

[ROSTER-APPROVALS.md](ROSTER-APPROVALS.md) records the supplied table and [roster-approvals.json](roster-approvals.json) supports the release check. HollyHood Haley J, Luigi Primo and Sophia Rose are excluded. They were absent from the baseline, so the roster remains **39**. All 35 table-listed playable fighters match the supplied ratings and finisher names. The four existing fighters absent from the table are retained without assigning a new YES approval. Josh Bishop, Ring Rat and The Green Phantom now use their supplied packs and table-approved ratings.

## Steadier screen (v0.12.1)

Gameplay now uses synchronized drawing and an opaque repaint to avoid showing partly drawn frames. The top and bottom HUD panels remain opaque and stationary during hit shake, the whole-screen finisher flash is removed, and shake is reduced. Phone viewport changes are applied in the same animation callback as the repaint. The current release retains these presentation fixes while updating gameplay and online compatibility as described above.

## DJ Clay, Jeff Lane and Shane Mercer (v0.12.0)

The roster now contains 39 fighters. DJ Clay has his supplied six-frame Bass Blast finisher animation, synchronized to the existing meter and damage rules. Jeff Lane and Shane Mercer have movement, weapon, grapple, recovery and rope animations from their supplied packs. Seven portrait pages expose every fighter. Shane Mercer uses published JCW ratings; DJ Clay and Jeff Lane use game balance values without claiming website ratings. Current online play requires v0.17.0 / LU160 rooms.

## Five new fighters (v0.11.0)

Atiba, JP Grayson, Tommy, Shaggy 2 Dope, and Jacksyn join as fighters 29–33. Portrait page six now contains Tommy, Shaggy, Jacksyn, DJ Clay, Jeff Lane and Shane Mercer. Their supplied sheets provide prepared animations and portraits; adaptations for missing or overlapping poses are documented in SPRITE-MAP.md. Four have published JCW ratings; Shaggy uses game balance values with no website rating claimed.

## Stability and rendering (v0.10.1)

Optional announcement and combat-effect images now load on demand, so a phone does not decode every decorative PNG before the first match. Evicted fighter and arena images release their decoded source, event queues are bounded during bursts, and stale image downloads cannot reinsert old fighters into the cache. The animation loop catches recoverable graphics/runtime faults and pauses with a restart action instead of taking down the match. Desktop and phone simulation remain deterministic; only presentation is reduced when battery/low-power mode is active.

## Krule and Jeeves (v0.10.0)

Krule and Jeeves join as fighters 27 and 28. Their supplied portraits and animation sets cover movement, four weapons, grapples, pins, recoveries, and rope moves. Both use ratings from jcwlunacy.net; Krule's finisher remains marked as unlisted there. Current online play uses v17 / LU170 rooms; both players should use v0.17.0.

## Steven Flowe and EC3 (v0.9.0)

Steven Flowe and EC3 join as fighters 25 and 26, with their supplied animation sets, four weapons, rope moves, and ratings/finishers from jcwlunacy.net. The first 24 roster slots are unchanged. Phone paging and direct selection include both new fighters. The v0.9.0 release introduced LU90 rooms; the current release uses LU160.

## Supplied UNLOCKED branding (v0.8.3)

The supplied neon UNLOCKED artwork replaces the text treatment in the header, opening screen, and fighter selection. The same PNG appears over all five existing UNLOCKED signs, mat, and apron wordmarks across Bloodymania, Hell’s Pit, and Rusted Warehouse. Other arenas have no existing UNLOCKED wordmarks to replace. The opening background now uses the same branded canvas as gameplay.

The original PNG is included byte-for-byte as `dist/assets/banners/unlocked.png`; CSS frames its empty margins and blends the black background into the interface. Arena placement is handled by the renderer, preserving the original arena images and the foreground rope over the mat graphic. Text remains in page titles and accessibility labels so the game is still named correctly for browser tabs and screen readers. Phone layouts, existing fighters, and gameplay rules are retained. Multiplayer uses protocol v17 for the current gameplay rules.

## Phone fighter selection

This package contains **39 fighters**. On a portrait phone, use **MORE / BACK** to browse seven pages (six fighters per page), or use **PICK ANY FIGHTER** to select any name directly. **USE FIGHTER** opens match setup. The **FIGHTERS** button takes you back; rotation preserves your chosen wrestler. Website stats are visible in the phone setup panel.

If an older game link has exactly nine wrestlers, it is a different build. At the time of this fix, the GitHub `Lunacyunlocked2` source contained nine, while the `JCWLUNACYUNLOCKED` main source contained 21 (v0.6.0). This v0.17.0 package has not been deployed to either repository.

## Phone match optimization (v0.8.2)

- The ring and thumb controls fit the visible phone screen, including browser toolbar changes, notches, and the home indicator. Portrait keeps controls below the ring; landscape uses narrower side controls and a larger HUD.
- A steady full-ring camera keeps normal corner travel and jumps at the same scale, with extra headroom for unusually tall aerial moves.
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

- Thirty-nine playable wrestlers: Violent J, 2 Tuff Tony, Willie Mack, Mickie Knuckles, Kerry Morton, Mr. Happy, Moshpit Mike, Cokane, Yabo, Abel, Dani Mo, Facade, J-Rod, Matt Cross, Vincenzo, Caleb Konley, Sally Boy, Big Vito, Bruce Wayans, Alice Crowley, Ruffo, Kongo Kong, Father Bronson, Hokane, Steven Flowe, EC3, Krule, Jeeves, Atiba, JP Grayson, Tommy, Shaggy 2 Dope, Jackson, DJ Clay, Jeff Lane, Shane Mercer, Josh Bishop, Ring Rat, The Green Phantom.
- Online multiplayer through the original JCW Firebase project: private room codes and Quick Match.
- VS CPU with three difficulty levels; local two-player versus; a thirty-eight-opponent arcade run.
- Six arenas: Bloodymania, Hell’s Pit, Madhouse, Rusted Warehouse, Funhouse, and Lunacy Outdoors. The last two are recovered from the legacy ZIP.
- The recovered JCW theme and the existing Genesis-style Fight Club track; choose either in CONTROLS. The supplied JCW theme starts when you press PRESS START. You can mute it or choose the alternate track.
- Practice mode: a passive opponent, unlimited time, full finisher meter, and automatic reset after a KO, pinfall, or tap-out.
- Phone controls with a sliding D-pad, simultaneous movement and attacks, optional hold-to-repeat HIT, a repeated-tap escape button, finisher charge display, and context-sensitive GRAB / PIN / BREAK / CLIMB / DIVE labels, plus separate WEAPON and TAUNT buttons.
- Movement, running, jump, strike, unarmed heavy, block and guard break, overhead grapple throw, directional falls, recovery, pin and kick-out, submission and hold escape, and a meter-powered finisher.
- All 39 wrestlers can cycle between bare hands, chair, bat, guitar and trash can; taunt for meter; climb either corner; and dive onto standing or downed opponents. Tony also has a bottle.
- Best-of-three rounds, 99-second timer, KO, pinfall, and submission victories, match results, rematch, pause, and character selection.
- Keyboard, touch controls, and standard-mapped gamepads. Two controllers can play together locally.
- Supplied PINFALLED, KICK OUT, TAP OUT, YOU WIN, and LUNACY announcement graphics; animated hit debris, impact smoke, guard puffs, and ground dust. Effects respect reduced-motion preferences.
- Fixed 60 Hz simulation, attack startup / active / recovery windows, input buffering, fair simultaneous hits, one damage application per move, impact feedback, supplied sound samples and procedural fallback cues.

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

**Phone view:** landscape places controls in side rails outside the ring. Portrait uses a fitted 4:3 stage and larger HUD, with controls below. One proportional arena shares the fighters' steady camera; moving to a corner cannot reveal a second backdrop or change the normal scale. The match layout follows the visible screen as browser bars change. Turning the phone pauses an offline match and clears held input. Portrait mode is playable without rotating the phone. Pausing and opening CONTROLS hides the touch deck, and losing focus clears input. Use CONTROLS → TOUCH CONTROLS → ALWAYS SHOW if your device does not identify itself as a touch screen. Vibration only runs on supporting devices.

**Run:** keep moving in one direction for about 0.38 seconds to accelerate. Shift starts the run immediately; touch players simply hold the D-pad. Releasing direction stops movement.

**Weapons:** tap WEAPON (Q) to cycle bare hands → chair → bat → guitar → trashcan → bare hands. HEAVY uses the selected weapon and the corresponding wind-up, contact, and recovery art. Weapons break after their hit allowance: chair 4, bat 6, guitar 2, trash can 3, Tony’s bottle 1. Switching preserves wear; a new round restores equipment. Blocking and misses do not spend durability. Changing weapon has a short recovery; grappling or climbing puts it away. New wrestlers without a kick sheet use an intact forward strike for unarmed heavy.

**Taunt:** press TAUNT (E). Complete the one-second pose to earn 12 meter; an enemy hit interrupts the reward. A four-second cooldown prevents constant taunt rewards.

**Corners:** approach either corner with the opponent more than 135 game units away, then press GRAB when it says CLIMB. On top, press GRAB, jump, or an attack to DIVE; use FINISH with full meter for a stronger dive. Down safely dismounts, and staying six seconds also dismounts. A dive can hit a downed opponent, followed by a pin. Blocking counters it; missing causes a vulnerable landing and a small health penalty. A nearby opponent takes grapple/pin priority over climbing.

**Grapple:** get close and press grapple. The attacker lifts and throws the actual selected opponent. Grapples bypass block. A missed grapple has recovery. Tap grapple within the first 0.28 seconds of being grabbed to break the throw. Corner throws send the opponent back toward the ring without teleporting the attacker.

**Pin:** press grapple beside a downed opponent. The referee counts three. A pinned player alternates strike and heavy to escape; holding a button does not repeatedly count, and pressing strike and heavy together does not count as alternating. Healthy opponents are harder to pin, and CPU resistance depends on damage and difficulty.

**Submission:** hold Down and press GRAB next to a downed opponent. The ground hold resolves after 3.6 seconds if the defender cannot escape. Alternate strike/heavy on keyboard or gamepad, or tap ESCAPE on phone. Healthy opponents naturally resist. A successful hold awards a fall by TAP OUT; a normal GRAB still starts a three-count pin.

**Finisher:** fill the LUNACY meter by giving and taking damage. Use the finisher at close range when the meter is full. Missing still spends the meter. The legacy build supplies finisher names for Violent J, 2 Tuff Tony, Willie Mack, Kerry Morton, Moshpit Mike, and Cokane. These names appear in selection and during activation. Ground finishers use shared charged knockdown rules with the selected weapon or unarmed pose. All 39 wrestlers can also spend full meter on a corner dive. Finisher names are presentation labels; separate signature holds, flips, and move-specific choreography have not been recreated.

**Responsiveness:** button taps are retained even if pressed and released between simulation ticks. Actions entered up to 0.16 seconds before recovery ends can execute when the fighter is ready. Keyboard and gamepad attack holds do not auto-repeat. Touch HIT optionally repeats at roughly 0.43-second intervals; it still uses the same startup, recovery, range, and damage rules.

**Block:** stops incoming strikes while guard remains. A fresh, correctly timed block reverses a normal strike; release block and strike back during the attacker’s short stagger. Heavy pressure can break the guard. Throws counter blocking. Aerial attacks can miss depending on the fighters' relative height.

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

See [TESTING.md](TESTING.md) for the current v0.17.0 checks. This release adds targeted regressions for chains, grab clashes, recovery input, guard damage, dives, pins, CPU spacing, online messages, lazy artwork loading, bounded effects, and cache release. Both online players should use v0.17.0. The complete 36-fighter roster, website stats, and asset bytes are retained.

The local browser preview was blocked, so this pass uses automated simulation and native canvas renders of the actual Match/Renderer. No new live Firebase or physical phone/controller test was performed. This ZIP has not been deployed.
