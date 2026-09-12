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
