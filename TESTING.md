# v0.16.0 — Verification and device handoff

## Completed here

- `npm test`: 227 passing tests, including rebound cancellation/network state, smooth lift landing, style/finisher tradeoffs, coaching, image timeouts/retry backoff, render-budget hysteresis, and audio lifecycle bounds.
- `npm run check`: all JavaScript parses, HTML references resolve, 36 approved fighters, 4,076 animation entries, six arenas and both music tracks validated.
- `node tools/soak.mjs`: 108 full matches completed across all 36 fighters and easy/normal/hard. 450,685 fixed simulation steps; finite positions and health, ring bounds and valid network snapshots throughout. This measures correctness, not browser frame rate.
- Optional `tools/review_flow.mjs` with linkedom 0.18.12: startup, 36 roster options, pause/help/resume, arena eviction, five championship wins, automatic supplied credits, transcript names, focus target, belt result, defense continuation, and online menu wording. Uses a DOM model without a browser engine, network or CSS layout.
- Native canvas desktop, portrait and landscape combat-event renders reviewed. Existing render tests still cover all fighters' animation crops and facing directions.
- Supplied credits PNG preserved byte for byte, alongside the prior six UI images. Roster ratings, names, finishers and prior animation metadata unchanged from v0.15.3.

## Remaining real-device checks

Interactive browser access was previously denied, so this pass uses unit tests, a DOM model and native canvas rendering. No new browser or physical-device QA was performed. These results do not prove the reported device-specific lag or crashes are gone.

On an iPhone/Safari, Android/Chrome and a desktop browser:

1. Play ten consecutive matches with different fighters and arenas; rematch, return to select, and revisit a fighter. Watch for page reloads, missing sprites, lag or stuck loading.
2. Rotate the phone, background it, resume, mute/unmute and change the music/effects volumes. Confirm no stuck buttons, ongoing paused audio or flashing HUD.
3. Run into each rope, block out of a rebound, land a running heavy, throw, pin and escape. Compare a flyer, technician and powerhouse.
4. Finish the championship. Confirm the credits appear, every control is reachable in both orientations, Read Credits is legible, and Defend Your Title starts the defense. Reload between matches to check saved progress.
5. Connect two v0.16.0 clients using LU160 rooms; confirm old-version rooms stay separate and disconnections remain clear.

# v0.15.3 — Pause and time-limit artwork

- 215 automated tests pass; validation passes for 36 fighters and 4,076 animation entries.
- Native canvas review renders a real time-limit round ending in desktop, portrait and landscape layouts.
- PAUSED is restricted to offline pause and graphics-recovery dialogs; online continuing/disconnected states hide the image. Responsive CSS limits image height on short screens.
- Both supplied PNGs are included byte for byte. No new browser or physical-device testing, and no live deployment.

# v0.15.2 — Supplied game artwork

- 215 automated tests pass; asset validation passes for 36 fighters and 4,076 animation entries.
- Native canvas renders reviewed for reversal and Second Wind events in desktop, portrait, and landscape layouts.
- The four copied PNGs match the uploads byte for byte.
- Selection uses only the outer ornamental border, excluding pictured placeholder controls. Belt visibility retains the existing crowned/defended result path.
- No new interactive browser or physical-device testing, and no live deployment.

# v0.15.1 — All-fighter animation review

215 automated tests pass; static checks pass for 36 fighters, 4,076 animation entries, six arenas, both music tracks and roster approvals. The suite includes the existing 108 seeded CPU match cases.

Native contact sheets were visually reviewed for all 36 fighters: idle/walk/run, strikes, weapon attacks/carrying, falls, grounded/recovery states, jumps, climbs, dives, grapple/throw poses and celebrations. All portrait files were reviewed together; DJ Clay's portrait is intact, but his reported selection-screen problem has not been reproduced.

New tests exercise every walk/run/carry frame in both facing directions and during backpedaling; verify render crops and transforms; check grounded and KO states after front/back falls; and cover Tony's fall transitions, Big Vito's clean jump poses, repaired front-fall landings and Matt Cross's intact heavy-strike fallback. Offline alpha-band measurements put the torso-offset spread within each walk/run loop at 11 pixels or less, compared with jumps exceeding 100 pixels in several original loops. This measures alignment, not animation quality or device performance.

All 97 non-roster asset files are byte-identical to v0.15.0. Ratings, finishers, roster membership and combat-engine code are preserved. No new runtime image processing or animation system was added. The source PNGs remain untouched; repairs use frame metadata and existing poses.

No new interactive-browser, physical-phone or live-online test was performed. Browser preview access was previously denied by the browser permission check. Native rendering and unit tests do not establish that every visual issue on every device is resolved. This ZIP has not been deployed.

Reproduce with `npm test`, `npm run check`, and optionally `node tools/review_all_fighters.mjs` with @napi-rs/canvas. The shipped browser game has no new dependency. The repair scripts need Python, Pillow and NumPy; they are optional maintenance tools. See tools/movement-audit.json for the per-fighter record.

# v0.15.0 — Championship mode

209 automated tests pass. Static checks pass for UI references, JavaScript, 36 fighters, 4,076 animation entries, six arenas, both music tracks and roster approvals.

New tests cover unique title paths for every fighter, five wins to a title, consecutive defenses, belt loss and retained records, retrying a road loss, reloading the current bout, separate fighter/difficulty saves, corrupt saves, storage quota failure, duplicate/stale results across tabs, and real best-of-three CPU combat in championship mode. The previous 201 gameplay, rendering, input and online tests still pass.

The new mode changes no fighter art, roster data, ratings, combat engine or online protocol. Browser preview access to the local server was denied by the browser permission check. Live DOM flow, rendered belt/setup layout and physical-phone testing were not verified this turn. No deployment was performed.

Run `npm test` and `npm run check` to reproduce the automated checks. Manual acceptance: choose Championship on phone/desktop, finish five matches, view the belt, defend it, lose it, return to selection, reload and resume, then switch fighter/difficulty and verify separate progress. Leave mid-match and confirm the same opponent restarts. Test storage-blocked/private browsing for the session-only message.

# v0.14.0 — Reversals and Second Wind

201 automated tests pass. `npm run check` passes: 36 unique fighters, 4,076 animation entries, six arenas, both music tracks and the supplied approval record.

- Reversals are tested through actual attack timing from both player slots and both ring orientations, across jab, heavy, bat, guitar and trashcan. A counter jab lands during the earned opening. Holding/spamming block, low guard, early release and hitstun do not bypass the timing/cooldown rules.
- Finisher blocks, grapple/throw breaks and dive defenses retain their existing rules. Normal held-guard and first-recovery-frame guard tests are separate from fresh-block reversal tests.
- Second Wind is tested at the 30-health boundary, once per round, for both players and for strikes, throws, dives and finishers. Resource caps, no healing or cancelled hitstun, lethal hits and missed-dive self-damage are covered.
- Keyboard, phone touch and gamepad inputs produce the same reversal. Online packets preserve a fresh block re-press even between sends, transfer new state and events once, and reject older v13 snapshots. Online room lifecycle tests pass under v14 / LU140.
- Existing tests cover all 108 seeded CPU matches (36 fighters at three difficulties), combos, running attacks, damage rules, phone input and identical simulation at 30/60 fps presentation.
- Native desktop, portrait and landscape review of actual reversal/comeback events found an initially clipped landscape cue. Both notices now draw in screen coordinates below the HUD. Updated renders were visually checked in all three layouts.
- Native HUD-rail pixel checks pass with zero changed pixels in desktop, portrait and landscape across all six arenas while hit shake changes. Cues add no whole-screen flash or additional particle systems.
- All 98 asset files, including roster and ratings data, remain byte-identical to v0.13.0. The 36-fighter roster and supplied NO exclusions remain intact.

Reproduce with `npm test` and `npm run check`. Optional native rendering tools: `node tools/review_reversals.mjs` and `node tools/review_flicker.mjs`, requiring `@napi-rs/canvas`. The shipped game has no new runtime dependency. No new interactive-browser, physical-device or live Firebase test was performed. This ZIP has not been deployed; both online players must load v0.14.0.

# v0.13.0 — Gameplay pace, running attacks and roster approvals

189 automated tests pass. `npm run check` passes for 36 unique fighters, 4,076 animation entries, six arenas and both music tracks.

- Travel tests measure a 12% speed increase while the round clock remains unchanged. Actual simulated attacks recover earlier and can still connect during their late active frames with unchanged damage.
- Running heavies close a small gap from both sides with bare hands, chair, bat, guitar and trashcan. Misses/blocks keep recovery; standing, airborne and retreating heavies do not grant a forward lunge. Online snapshots deliver movement and running-hit feedback.
- Touch HIT repeat follows the shorter recovery and stops cleanly on release. Existing attack-pose, combo-limit, guard, throw-break, pin/escape and 30/60 fps simulation tests pass.
- All 108 seeded full CPU matches finish: 36 fighters on each of three difficulties. Existing online lifecycle/input tests pass with v13 / LU130, including rejection of v12 clients.
- The supplied approval record contains 35 YES and 3 NO entries. All 32 listed playable fighters match its ratings and finisher names. The release validator rejects NO entries even under an alternate imported ID. Four unlisted existing fighters are retained without inferring a new approval.
- All 98 asset files, including the roster and website snapshot, are byte-identical to v0.12.1. No art or audio was added for this gameplay change.
- Native pixel regression still reports zero changed HUD-rail pixels across all six arenas in desktop, portrait and landscape layouts while hit shake varies. The earlier synchronized presentation, opaque rails and reduced shake remain intact.

Reproduce with `npm test`, `npm run check`, and optionally `node tools/review_flicker.mjs` with `@napi-rs/canvas`. Validation uses deterministic simulation, the in-memory online adapter, and native canvas. No new physical-device, interactive browser or live Firebase test was performed. This full ZIP has not been deployed; both online players must reload v0.13.0.

# v0.12.1 — Screen flicker correction

180 automated tests pass. `npm run check` passes: 36 unique fighters, 4,076 animation entries, six arenas and both music tracks.

- New regressions check synchronized context creation, no visible-buffer clear, no whole-screen special flash, and bounded phone/desktop hit shake.
- `node tools/review_flicker.mjs` checks actual native-canvas pixels in the stationary top and bottom HUD rails while hit shake changes. All six arenas pass in desktop, portrait and landscape layouts, with zero changed rail pixels. The same checks against v0.12.0 detected over one million changed pixels per layout across the six arenas. Scores and timers were held fixed to isolate background leakage.
- Native desktop and portrait output was visually reviewed. These tests do not reproduce browser/GPU scanout or establish the outcome on the reporting player's hardware. Reload after installing v0.12.1, since canvas context settings are fixed on creation.
- Phone resize handling now runs before the same-frame draw. Gameplay, roster/artwork and online protocol remain unchanged; v12 / LU120 rooms remain compatible. This ZIP is not deployed.

The browser risk is documented in [Chrome's canvas guidance](https://developer.chrome.com/blog/desynchronized#avoiding_flicker): desynchronized drawing combined with clearing the visible canvas can flicker. Removing that mode addresses this risk; the native regression separately verifies the reproduced HUD/background flicker.

Reproduce with `npm test`, `npm run check`, and (with optional `@napi-rs/canvas`) `node tools/review_flicker.mjs`.

# v0.12.0 — 36 fighters — September 17, 2026

177 automated tests pass. `npm run check` passes: 36 unique fighters, 4,076 animation entries, six arenas and both music tracks.

- Tests include all 36 fighters across easy, normal and hard CPU matches (108 completion matches), six-page selection and rotation, all three new online host/join slots and old-protocol rejection.
- Bass Blast tests verify meter consumption, contact artwork during the real damage window, recovery and attacks in both directions.
- All 92 source sheets are audited. The original 33 roster records and 90 existing asset files compare unchanged against v0.11.0.
- Prepared sprite sheets, 12 native Match/Renderer scenarios per new fighter, Bass Blast phases and five phone viewport layouts were visually reviewed. These are native canvas renders with schematic control bounds, not interactive browser or physical-device tests.
- Previous stability changes remain included. Crash rates and thermal/FPS behavior still require checks on the affected hardware. Live Firebase was not retested; this ZIP has not been deployed.

Reproduce with `npm test` and `npm run check`. Optional native review requires `@napi-rs/canvas`: `node tools/render_review.mjs dj-clay` (or `jeff-lane`, `shane-mercer`) and `node tools/review_roster36.mjs`.

# v0.11.0 — 33 fighters — September 16, 2026

171 automated tests pass. `npm run check` passes: 33 unique fighters, 3,653 animation entries, six arenas and both music tracks.

- Coverage includes all 33 fighters on three CPU difficulties (99 completion matches), six-page phone selection and rotation, new online host/join indices, v11 compatibility and all 148 source sheet hashes.
- Original 28 roster records and 80 existing artwork/audio files compare unchanged against v0.10.1.
- Prepared sprite sheets and native Match/Renderer output were reviewed. Missing or scenery-obscured poses use documented adaptations in SPRITE-MAP.md.
- Prior lazy image loading, cache release, bounded effects and runtime recovery remain included. Automated/native-canvas checks do not establish physical-device crash rates or browser FPS; affected desktop and phone hardware still need testing.
- This ZIP is not deployed. Both online players need v0.11.0 / LU110 rooms.

Reproduce with `npm test` and `npm run check`.

# v0.10.1 — Stability and performance — September 16, 2026

164 automated tests pass. `npm run check` passes: 28 unique fighters, 2,986 animation entries, six arenas, both music tracks, valid JavaScript and UI references.

- The suite covers lazy optional-art batches and in-flight deduplication, decoded-image release, bounded desktop/phone effects, all 28 fighters, all 84 CPU completion matches, online transport, and phone geometry.
- The runtime now pauses on recoverable graphics errors and resets cleanly after a canvas context restore. Browser/device crash rates and thermal behavior still need testing on the affected hardware.
- The supplied artwork and full 28-fighter roster remain included. This ZIP has not been pushed or deployed to GitHub Pages; online players should use v0.10.1.

# v0.10.0 — Krule and Jeeves — September 14, 2026

161 automated tests pass. `npm run check` passes: 28 unique fighters, 2,986 animation entries, six arenas, both music tracks, valid JavaScript and UI references.

- Krule and Jeeves occupy roster indices 26 and 27. All 59 supplied sheets have audited uses and source hashes. Tests cover exact JCW ratings, animation coverage, clean contact poses, four weapons, and phone selection through the final partial page.
- Krule has no dedicated thrown-victim sheet. His own lifted, tumbling and face-up landing poses supply that sequence. Jeeves's crossed recovery bats are replaced with his own clean ready pose. These choices are documented in the preparation tool/audit.
- CPU checks finish matches for all 28 fighters on easy, normal and hard (84 matches). Both new fighters host and join via the in-memory Firebase-shaped adapter; v9 rooms and out-of-range fighters are rejected by v10 / LU100 clients.
- Native Match/Renderer output was visually reviewed for twelve combat scenarios per new fighter and five phone sizes. Detailed weapon and rope frames were reviewed separately. No physical-phone, interactive-browser, or live Firebase verification was performed.
- All 26 previous roster records and 76 existing artwork/audio files are unchanged from v0.9.0. Supplied UNLOCKED branding and phone performance work remain included.
- This ZIP has not been pushed or deployed to GitHub Pages. Both online players need v0.10.0.

Reproduce with `npm test` and `npm run check`. Native review additionally needs optional `@napi-rs/canvas`: `node tools/review_roster28.mjs`, `node tools/render_review.mjs krule`, and `node tools/render_review.mjs jeeves`.

# v0.9.0 — 26-fighter release — September 14, 2026

157 automated tests pass. `npm run check` passes: 26 unique fighters, 2,703 animation entries, six arenas, both music tracks, valid JavaScript and UI references.

- Steven Flowe and EC3 are roster indices 24 and 25. All 60 supplied PNG sheets have audited uses and source hashes. Tests cover exact website ratings, clean attack contacts, expected movement/weapon/fall/rope frame counts, and complete selection access.
- Both new fighters can host and join through the in-memory Firebase-shaped transport. Protocol v9 and LU90 rooms reject v8 clients and out-of-range fighters.
- CPU completion checks cover all 26 fighters on easy, normal, and hard (78 matches). Every fighter also passes the chained-hit check from both sides.
- Phone paging includes the final two-fighter page; selection survives rotation. Native Match/Renderer output was reviewed at five phone sizes and across 12 combat scenarios for each new fighter. These are native rendering reviews, not physical-phone or browser tests.
- The original 24 roster records and all 72 existing artwork/audio files are unchanged from v0.8.3. The roster and website ratings files gain only the two fighters (and the new ratings retrieval date).
- No live Firebase or GitHub Pages deployment was performed for this release. Both online players must load v0.9.0.

Reproduce with `npm test`, `npm run check`, and optionally `node tools/review_roster26.mjs` / `node tools/render_review.mjs steven-flowe` / `node tools/render_review.mjs ec3` (native canvas dependency required only for image review).

# v0.8.3 supplied UNLOCKED artwork — September 14, 2026

The static module/asset/UI checker passes. All **21 targeted renderer and phone-performance tests** pass after the branding change. No new tests were added for the visual replacement. The earlier 152-test gameplay baseline is retained below; this pass changes branding and rendering only.

The supplied UNLOCKED PNG is byte-identical to the attachment. All 73 previous asset files remain unchanged. The renderer uses the new image at five known wordmarks across three arenas and restores the foreground rope above the Bloodymania mat logo. Title, selection, and header use the same source image with CSS framing. Browser-tab titles and screen-reader labels keep their text names.

`node tools/review_branding.mjs` produced and was used to inspect a native-canvas before/after review of all five arena placements and the image at interface sizes. HTML nesting and image references pass. Renderer and artwork-loader entry imports are versioned for the new release. No fresh browser or physical-device test is claimed; the previous browser access restriction remains.

The full v0.8.3 ZIP contains all 24 fighters and the v0.8.2 phone work. These branding changes have not been pushed or deployed from this conversation.

---

# v0.8.2 phone optimization — September 14, 2026

**152 automated tests pass.** `npm run check` passes JavaScript syntax, HTML references, 24 fighters, 2,418 animation records, six arenas, and both music tracks. HTML nesting passes. All 73 existing assets, including the roster and website ratings, are byte-identical to v0.8.1.

Ten added regressions cover viewport geometry and minimum button sizes across 14 phone/safe-area configurations with online/offline layouts; backing-resolution bounds and aspect ratio; unchanged-canvas resize notifications; camera framing during airborne poses; 30/60 fps presentation on simulated 60/90/120 Hz displays; idle and hidden-tab drawing; identical 60 Hz Match outcomes with either presentation rate; partial/failed optional artwork loading; world/HUD canvas transforms; and bounded phone effects with combat cues preserved.

The real engine and renderer were drawn with native canvas at portrait and landscape phone sizes using `node tools/review_phone.mjs`. The resulting review combines actual game images with schematic control rectangles from the layout function. It is not a browser screenshot. It confirmed readable larger landscape names, closer portrait combat, correctly scaled canvas output, and separate ring/control areas. The shortest landscape layouts put WEAPON and TAUNT in the top bar to preserve thumb space.

The earlier local-browser access restriction still applies. This pass does **not** claim physical-phone testing, fresh browser interaction, measured device FPS/temperature/battery savings, or a live Firebase retest. Geometry and timing assertions are programmatic; real Safari/Chrome rendering and multi-touch feel remain device checks. Automatic rendering is capped at 60 fps; SAVE BATTERY uses 30 fps presentation while the unchanged simulation and input sampling retain 60 Hz timing. Performance improvements are code changes, not device benchmark results.

Reproduce with `npm test` and `npm run check`. Native image review additionally needs optional `@napi-rs/canvas`; the game itself needs no package installation. This complete 24-fighter ZIP has not been deployed to the user's phone link.

---

# v0.8.1 phone selector — September 13, 2026

**142 tests pass.** The module/asset checker passes 24 fighters, 2,418 animation entries, six arenas, both music tracks, and HTML references including versioned URLs. HTML nesting was checked after restructuring selection.

Six new regressions cover:

- Every one of the 24 names appears exactly once across phone, landscape, and desktop page sets.
- Every direct-picker selection resolves to the correct actual Match fighter without changing the opponent.
- Page browsing preserves the chosen fighter; invalid choices are rejected.
- Hokane remains selected and visible after portrait/landscape/desktop page-size changes.
- A 23-opponent arcade traversal retains only active atlas/arena references and removes obsolete resolved-cache entries.
- Mirror matches share one atlas; evicted fighters can be reloaded.

All 73 existing asset files, including roster data and website ratings, are byte-identical to v0.8.0. The mobile selection layout now uses explicit pages and normal document flow; its CSS was reviewed in source. The existing local-browser restriction remains, so this pass does not claim a fresh browser rendering check, a physical-phone test, or measured mobile memory/FPS improvements. The cache check establishes released JavaScript references; actual browser image/GPU cache reclamation is browser-dependent.

The connected GitHub source was inspected to diagnose the nine-fighter report: Lunacyunlocked2 contains nine; JCWLUNACYUNLOCKED/main contains 21 at v0.6.0. The user's exact phone URL has not yet been identified. This 24-fighter ZIP has not been deployed.

---

# v0.8.0 gameplay refinement — September 13, 2026

**136 automated tests pass.** `npm run check` passes: 24 fighters, 2,418 animation entries, six arenas, both music tracks, valid JavaScript and UI references.

- Baseline: all 114 v0.7.2 tests passed before editing.
- Added 22 targeted tests covering three-hit chains and scaling in both directions, limits on repeated jabs, blocked/whiffed recovery, simultaneous grabs, hitstun grab prevention, first-frame blocking/wakeup input, run reset, airborne recovery, delayed guard regeneration, dive guard breaks, buffered submissions, both rope boundaries, manual release, CPU attack spacing, online compatibility, delayed guest inputs, all-roster jab chains, and readable combo counters.
- The three CPU roster tests complete **72 matches**: all 24 CPU fighters on easy, normal, and hard, against passive opponents. These establish complete match flow and numerical stability, not human difficulty or competitive balance.
- Existing transport tests verify host/guest readiness, Quick Match, room cleanup, ordered presses, snapshots, and result delivery through the in-memory Firebase-shaped adapter. Version 0.8.0 uses the separate LU80 room/queue namespace and v8 protocol so older clients cannot join incompatible matches.
- Byte comparison against the v0.7.2 ZIP confirmed every existing asset file is unchanged: 73 files including the complete roster/website data, atlases, portraits, arenas, music, logos, and effects.
- Ran `node tools/review_gameplay.mjs` and visually inspected six actual Match/Renderer scenarios: three-hit chain, startup counter, grab-break window, rope break, dive guard break, and portrait grab cue. Corrected overlapping combo counts after the first render and inspected the updated image. These are native canvas renders, not browser screenshots.
- Attempted the provided local browser QA fixture. The browser returned `net::ERR_BLOCKED_BY_CLIENT`; no alternate browser route was used. No fresh interactive desktop/mobile-browser, physical phone/controller, or live Firebase test was completed. Existing historical live-service checks below do not establish current device behavior.

Reproduce gameplay checks with `npm test` and `npm run check`. Native visual review additionally needs the optional `@napi-rs/canvas` development package. The playable build itself still needs no install/build step; run `npm start` and open http://localhost:8080.

This full ZIP has not been pushed or deployed.

---

# v0.7.1 release checks — September 13, 2026

**110 automated tests pass.** Static validation covers 23 fighters, 2,264 animation entries, six arenas, both music choices, module syntax, and UI asset references.

- Restored the complete v0.7.0 ZIP and verified its SHA-256 before editing. All 22 prior fighter definitions, gameplay stats, atlases, portraits, music, effects, and arena bytes remain unchanged.
- Retrieved Father Bronson's current website stats: Power 8, Speed 6, Technique 7, Toughness 8; finisher The Red Bloom. Added those exact fields to the dated source snapshot and derived gameplay multipliers.
- Reviewed all 35 supplied sheets and prepared transparent frames. Fixed a joined throw/recovery body, running captions touching heads, the drawn floor line hiding two jump poses, a printed opponent touching the kick, and stray neighboring coat artwork in the dive.
- Native canvas review uses actual Match transitions and Renderer output for strike, heavy, chair, bat, guitar, trash can, lift, throw, pin, climb, dive, and fall. Detailed contact sheets cover the complete animation set. Checked chair/guitar placement after adapting the missing/overlapping contact artwork.
- Tests assert complete jump/throw counts, one body per attack crop, all reviewed source uses/exceptions, exact website fields, and selection of the reverse back-fall texture when facing left. Existing all-roster weapon, CPU, input, touch, pin/submission, audio, and renderer checks include Bronson.
- Online host and guest tests cover Father Bronson, artwork readiness, correct roster definition, snapshots, out-of-range IDs, and cleanup through the in-memory Firebase-shaped transport. These tests do not claim a new live Firebase connection.

No fresh interactive browser test was performed. The prior local-preview access rejection remains respected; no alternate browser route was used. Physical phones/controllers and real-world network latency remain outside this pass. Historical checks below are retained for context. This ZIP has not been deployed to GitHub.

---

# v0.7.0 release checks — September 13, 2026

**106 automated tests pass.** Static checks validate 22 fighters, 2,116 animation entries, six arenas, both music tracks, module syntax, and UI references.

- Verified all 21 previous IDs, animation definitions, atlases, and portraits against the complete v0.6.0 ZIP. Existing artwork is byte-identical.
- Reviewed all Kongo frames and twelve actual Match/Renderer scenarios: strike, heavy, chair, bat, guitar, trash can, lift, throw, pin, climb, dive, and forward fall. Corrected a merged three-body bat contact and a header mistakenly detected as a fall frame. Removed printed elbow/kick sparks and corrected the first elbow pose's facing.
- Accounted for all 29 Kongo source files. The two guitar sheets match by SHA-256; one supplies gameplay and the duplicate is explicitly recorded with zero additional frames.
- Verified website ratings against the site's `STATS` table, which labels the four fields Power, Speed, Technique, and Toughness. The bundled snapshot contains exact values for 21 matched roster entries. Violent J is unlisted. Tests verify actual damage, speed, resistance, and grapple behavior.
- Extended online host/guest tests to Kongo, including correct definitions and snapshot application, roster bounds, old-protocol rejection, and cleanup through the in-memory Firebase-shaped transport. All existing movement, touch escape, weapon, CPU, submission, audio, and renderer tests pass.
- Updated the four-rating profile layout and retained arrow-key/D-pad controls and mobile touch behavior. **A fresh browser preview was denied by the browser access review.** No new interactive desktop/phone or live Firebase check was completed in this pass. No alternate browser route was attempted.

The native canvas renders exercise the actual engine and renderer; they are not screenshots of a phone browser. Physical devices, controller hardware, and adverse network latency remain untested. Earlier browser and live-service checks below are historical and do not imply a fresh v0.7 check. This ZIP has not been deployed to GitHub.

---

# v0.6.0 release checks — September 12, 2026

**100 automated tests pass.** Static checks cover 21 fighters, 1,970 animation entries, six arenas, both music tracks, module syntax, and UI asset references. The 340 unique fighter sheets all appear in the audit. The five announcement textures and four effect textures decode with transparency; the effects contain 36 animation frames. Four supplied startup logos are included with their original pixels.

- Verified that the prior 16 fighter definitions, atlases, and portraits exactly match v0.5.1.
- Reviewed Sally Boy, Big Vito, Bruce Wayans, Alice Crowley, and Ruffo through the actual Match/Renderer code: strike, heavy, all weapons, lift, throw, pin, climb, dive, and fall.
- Tested submissions from either player, successful tap-outs, alternating-input escapes, healthy resistance, prevention of held/simultaneous-button auto-escape, and online snapshot/event round trips.
- Checked combat-effect positions, source bounds, expiry, concurrent cap, and reduced-motion behavior. Checked announcement routing and Ruffo's back recovery/KO selection.
- Tested startup audio requests, explicit mute, pause/resume, selected-track preservation, and rejection handling without interrupting gameplay.
- Browser Practice: Sally Boy versus Ruffo, arrow movement, strike/heavy, phone finisher, Lunacy graphic, and contextual pin/submission hint.
- Live Firebase: Alice Crowley hosted; Ruffo joined the private room. Both clients displayed the same round/timer, positions, damage and meter after a guest heavy attack. Host departure closed the room and the guest received the expected connection-ended message. No Firebase settings or access rules were changed.
- Startup browser checks: the first emblem and the final Psychopathic Records panel appear in sequence, then the new Lunacy title screen. The audio element loaded `jcw-theme.mp3`, reported playing after PRESS START, and advanced from 0.17 seconds to more than 31 seconds across the intro/title transition. The title and roster preserve the new graffiti styling.
- Reviewed the new title at 390 × 844, 320 × 568, and 844 × 390. ENTER THE LUNACY remains visible and reachable. SKIP INTRO ends the startup immediately and reveals the title while music continues.

Quick Match, physical touch hardware, controller hardware, and adverse real-world latency were not repeated in this pass. Earlier checks are preserved below as history. This release is delivered as a ZIP and has not been deployed to the user's GitHub repository.

---

# v0.5.1 Caleb Konley testing — September 12, 2026

**89 automated tests pass.** The checker validates **16 fighters, 1,341 animation entries, six arenas, and both music tracks**. Caleb's 28 supplied source files are recorded in the audit; the complete new-source audit now covers 196 sheets, plus one explicit reference to the existing prepared guitar prop.

Caleb participates in the existing every-roster attack, all-weapon damage, unarmed heavy, CPU-match, renderer, and asset-bound checks. The added multiplayer test creates Caleb as either host or guest using the in-memory Firebase-shaped transport, loads the correct fighter definitions, applies snapshots, and rejects out-of-range IDs and the old protocol. The guitar-overlay test now covers all three characters using the prop, in both directions.

Visual review covered the actual renderer's twelve combat scenarios for Caleb and detailed source/atlas sheets for attacks, rope actions, jumps, directional falls, and recovery. The first review caught a detached elbow spark mistakenly selected as the contact body. It was excluded; contact now retains the whole wrestler. Rope masks preserve the white wrist bands; the clipped guitar contact is replaced with Caleb's intact forward pose holding the existing guitar prop. The defeat sequence uses the proper standing-to-kneeling scale.

In a 390 × 844 browser viewport, Caleb was selected against Matt Cross in Practice. Arrow-key movement reached the opponent; touch HIT displayed the complete elbow pose and reduced the opponent's health. Weapon selection and the complete D-pad/action deck were checked. The desktop roster was checked as a four-by-four grid with all sixteen names. No new live Firebase room, physical phone, mobile Safari/Android, hardware controller, or network-latency test was performed in this character-only pass. Prior live-service observations remain below and do not imply a new live Caleb match. This ZIP has not been deployed.

To reproduce just Caleb's source preparation:

```sh
python tools/prepare_new_assets.py /path/to/extracted/folders caleb-konley
python tools/review_new_assets.py caleb-konley
node tools/render_review.mjs caleb-konley
node tools/check.mjs
node --test tests/*.test.mjs
```

The first command expects `Caleb Konley/` under the supplied folder and the existing roster/atlases included in this project. Pillow, NumPy, and SciPy are preparation dependencies; the optional renderer review uses `@napi-rs/canvas`. None is required to play.

---

# v0.5.0 artwork and mechanics testing — September 12, 2026

All **88 automated tests pass**, plus the static checker: **15 wrestlers, 1,197 animation entries, 6 arenas, both music tracks**. All 168 image sheets in the six new archives are referenced by the new asset audit. This is source/action coverage; duplicate directions and broken poses are deliberately omitted from playable sequences.

The 17 added tests cover new action rules, real damage with every new fighter and weapon, weapon durability, run/release behavior, taunt interruption/cooldown, both corners, dismounts, standing/downed dive targets, miss/block vulnerability, powered dives, subsequent pins, input routing, network pose/equipment fields, CPU matches, attacker layering, and guitar contact overlays. Existing tests continue to cover the original combat, multiplayer lifecycle, touch escape, and all roster pairings.

Visual review used the actual Match and Renderer to draw twelve scenarios for each of the six new wrestlers: HIT, unarmed HEAVY, chair, bat, guitar, trashcan, lift, thrown opponent, pin, climb, dive, and forward fall. Detailed extracted-frame sheets were also inspected for attacks, falls, recovery, jumps, and rope poses. Fixes included overlapping source figures, border fragments, backward views, clipped feet, disappearing guitars, and P2 hiding P1's attacking arm. The two clipped guitar contact poses now combine an intact source body with a guitar isolated from the supplied artwork. No generated wrestler artwork was substituted.

Browser observations:

| Game viewport | Observed result |
|---|---|
| 1280 × 800 | Fifteen-character grid uses five columns; roster, selection, and FIGHT are reachable. |
| 390 × 844 | Portrait HUD, full D-pad, primary actions, WEAPON and TAUNT fit; new fighter gameplay and online controls render. |
| 320 × 568 | Small-phone action deck and utility buttons fit without horizontal overflow. |
| 844 × 390 | Landscape side rails keep controls outside the ring, including utility buttons. |

A real Firebase room connected a Vincenzo host to a Facade guest on Funhouse. Both banners identified the same room and their P1/P2 roles. Both directions of movement were visible; guest chair selection appeared on both fighters' views, guest chair attacks reduced host health on both screens, and the guest's completed taunt increased meter from 24% to 36%. Leaving through CHARACTER SELECT closed the room and the guest displayed CONNECTION ENDED / This room has closed. The owned test room was removed. The final filtered browser error log contained no application errors; browser-extension metadata errors were excluded.

The live v0.5 check used room-code joining. Quick Match has automated v0.5 coverage and prior v0.4 live coverage below; it was not repeated live in this artwork pass. Dedicated corner/dive rules and their snapshot fields were checked in simulation/renderer tests, not in a full live online dive sequence. No complete live best-of-three match, hardware controller, physical phone, mobile Safari/Android, tactile two-thumb comfort, or long-distance latency benchmark was performed. These are browser viewport checks, not physical-device certification. The ZIP has not been deployed to GitHub Pages.

For reproducible visual review, use `python tools/review_new_assets.py` (Pillow) and optionally `node tools/render_review.mjs` after installing `@napi-rs/canvas` locally with `npm install --no-save @napi-rs/canvas`. These development dependencies are unnecessary for the game and its automated test suite.

---

# v0.4.0 multiplayer testing — September 10, 2026

All **71 automated tests pass**, plus the static project checker. The 17 new multiplayer tests cover room handshakes, simultaneous join attempts, cold Firebase transaction caches, Quick Match, cancellation, owner-only cleanup, disconnect handling, ordered/duplicate/stale input, guest touch pin escape, human P2 control, snapshot interpolation, grapple height, and round/results transport. The remaining 54 tests retain the earlier combat and mobile-control coverage.

Two independent browser game clients connected to the **actual supplied JCW Firebase project**, using its real pinned JavaScript SDK. The in-memory test transport was not used in the browser.

Observed live:

- CREATE ROOM and JOIN ROOM selected Violent J and Willie Mack and used the host’s Funhouse arena. Both clients entered the same room as P1/P2.
- QUICK MATCH paired two clients into a separate new-engine room, without using the legacy matchmaking queue.
- Arrow movement from both sides was visible on the other screen. The shared timer and fighter positions updated on both clients.
- A guest touch HEAVY hit reduced the host’s health. A host touch HIT reduced the guest’s health. Combat meter changes arrived on the joining client’s own touch button.
- Leaving as either host or guest produced connection-ended feedback on the remaining client. Test rooms were closed afterward.
- Both clients used 390 × 844 game viewports with their complete touch controls visible. No application error was present in the final filtered browser log.

The browser checks found and fixed an unavailable randomUUID function on the HTTP preview and a Firebase transaction that incorrectly aborted on an initial null cache. Automated coverage now includes both cases. Host onDisconnect room removal is registered and covered by the transport tests; a physical network outage was not performed.

The cloud browser ran slowly. These checks establish connectivity and observed synchronization, not a real-device latency or frame-rate benchmark. A complete live best-of-three match, physical phones, mobile Safari/Android, long-distance connections, and hardware controllers were not tested in this pass. Match result transport and pin/grapple behavior are covered by automated tests. This build is not deployed to GitHub Pages.

See [MULTIPLAYER.md](MULTIPLAYER.md) for controls and the retained Firebase architecture.

---

# Previous v0.3.1 testing — September 10, 2026

## v0.7.2 — Hokane

- `node --test --test-reporter=dot tests/*.test.mjs`: **114 passing tests**.
- `node tools/check.mjs`: **24 fighters, 2,418 animation entries, six arenas, both music choices**, valid modules, UI references, assets, dimensions, and anchors.
- Hokane’s four ratings exactly match the website’s September 13, 2026 stats table. The unlisted finisher remains generic. Tests check forward contact poses, no printed shadow frames, source coverage, directional fall selection, and the KO state.
- Hokane selects and starts as host or guest, survives snapshot serialization, and rejects out-of-range roster indices through the in-memory Firebase-shaped transport. This does not establish live Firebase connectivity.
- All 31 source sheets were inspected; prepared animation sheets and twelve actual Match/Renderer scenarios were reviewed. Corrections include mixed directions in the running sheet, touching weapon figures, printed ropes, shadow-only detections, dive neighbors, and background voids.
- Previous 23 fighter definitions and all existing prepared artwork, music, arenas, and effects are unchanged from v0.7.1.
- No fresh interactive desktop/phone browser or live-service test was performed. Earlier checks and limitations remain below. ZIP delivery only; not deployed to GitHub.

## Automated checks

All **54 tests pass** with `node --test tests/*.test.mjs` (also available as `npm test`). `node tools/check.mjs` passes syntax, HTML references, atlas bounds and anchors, nine wrestlers, 372 animation entries, six arenas, and both music choices.

Coverage includes full simulated CPU matches, every roster pairing, combat timing, simultaneous hits, input buffering, blocking, throws, corner behavior, pins and escapes, practice resets, arrow-key routing, controller assignment logic, diagonal D-pad sliding, multiple pointer IDs, cancellation, and touch HIT repeat. The new attack tests check the actual damage window, a real simulated HIT for every wrestler facing either direction, recovery to idle, and corrected sprite metadata.

## Browser checks

The game ran in a desktop Chromium browser inside a same-origin viewport fixture. Sizes below are game viewport sizes, not physical devices or mobile browser emulation.

| Game viewport | Observed result |
|---|---|
| 1280 × 800 | Match, header, pause, help/settings, and optional touch deck work. Resized ring keeps the complete touch deck visible. |
| 390 × 844 | Portrait camera, larger HUD, touch deck, and both recovered arenas render. Pause was moved out of the wrestling action. |
| 320 × 568 | No horizontal overflow. D-pad targets measure about 44.8 × 44.8 CSS px; action targets about 66 × 62 px. All attack buttons fit on screen. |
| 844 × 390 | Ring sits between the left D-pad and right action buttons. D-pad targets measure 48 × 48 CSS px. |

Timed arrow-key events sent through the game’s normal listeners moved the player. Native pointer clicks on the touch controls triggered attacks: HEAVY and FINISHER reduced the practice opponent’s health and caused knockback/knockdown. Practice kept its unlimited timer and full player meter. Pause/resume and settings persistence were exercised. After the sprite fix, Willie Mack’s HIT was triggered through both the keyboard fixture and the touch button.

All nine revised HIT sequences were also rendered through the actual renderer for visual inspection at preparation, contact, recoil, and settled phases, facing both ways. These were renderer inspection images, not screenshots of nine live matches.

## Problems corrected

- HIT used lifting poses, producing a crouch-and-raised-arms motion. It now uses reviewed forward-hand poses and a short recoil before returning to stance.
- Willie Mack’s throw sheet faced backward and used an enlargement intended for overhead poses. His strike/throw metadata corrects facing and scale.
- Cokane and Yabo had isolated dust sprites in their throw sequences. Those entries are excluded without changing the original atlas pixels.
- Chair sequences with different frame counts could enter follow-through during the active damage window. Contact art now stays aligned with that window.
- Pause covered the ring in portrait, and an always-visible touch deck could fall below the desktop viewport. Both layouts were corrected.

## Remaining device checks

No physical phone, two-thumb comfort test, mobile Safari/Android browser test, audible music check, vibration check, or real controller test was performed. Multitouch and controller logic were checked by automated input tests, not hardware. The cloud browser ran slowly, so this is not a frame-rate benchmark. Fullscreen was unavailable in this browser; the game displayed its fallback message, but fullscreen layout still needs a supported browser check.

This ZIP has not been deployed to GitHub Pages.

## Repeat locally

Run `npm start` for the game, or `npm run dev` and visit `http://localhost:8080/__qa__` for viewport buttons and timed keyboard inputs. The fixture is available only with the QA server flag; it is not part of the published `dist` site. Use an actual phone to check simultaneous thumb movement and attacks, slide-out release, pin escape, orientation changes, sound, and vibration before calling the mobile build fully device-tested.
