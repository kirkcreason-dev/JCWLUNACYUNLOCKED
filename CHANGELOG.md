# Changelog

## 0.6.0 — Expanded roster, combat artwork, and console startup

- Add Sally Boy, Big Vito, Bruce Wayans, Alice Crowley, and Ruffo: 21 playable fighters and a 20-opponent arcade ladder. Able(1) is an exact duplicate of the earlier Able source.
- Map all 340 unique supplied fighter sheets, with explicit filename corrections, individually reviewed rope/throw regions, complete guitar-contact bodies, and Ruffo's extra recovery/KO states. Preserve the previous 16 fighter definitions and images byte-for-byte.
- Add all five announcement graphics and all four combat-effect sheets (36 frames). Contact, blocks, slams, landings, pinfalls, kick-outs, finishers, tap-outs, and player victory trigger their matching artwork.
- Add submissions with Down + GRAB near a downed opponent; alternate strike/heavy or tap ESCAPE to escape. Normal GRAB keeps three-count pins. Synchronize hold type and escape events online.
- Restyle the opening and selection screens with the supplied Lunacy graffiti art, neon colors, wrestler portraits, and clear phone targets.
- Add the four supplied startup logos: Creaso·Norse emblem, Creaso·Norse wordmark, JCW hatchet, and Psychopathic Records. PRESS START unlocks the theme music and original synthesized arcade chime; the 4.4-second intro can be skipped. Reduced motion shows a static logo layout.
- Start the supplied JCW theme on PRESS START. Preserve mute/track preferences and resume music without resetting its position.
- Use rooms `LU6-`, protocol `lunacy-2d-v4`; both players need v0.6.0.

Validation: 100 automated tests pass. Visual reviews cover all five added fighters in the actual renderer. Live browser clients connected through the original Firebase service with Alice Crowley and Ruffo; movement, guest attacks, health/meter synchronization, and host-room closure were observed. See TESTING.md for exact browser/audio scope. No GitHub deployment included.

## 0.5.1 — Caleb Konley

- Add Caleb as the sixteenth fighter using all 28 supplied source sheets across the action families. Arcade Run now has fifteen opponents.
- Integrate elbows, kicks, all four weapons, carried movement, taunts, throws, pins, jumps, rope climbs/dives, directional falls, recovery, and both kneeling variants.
- Remove an isolated impact spark from the elbow sequence, preserve wrist tape in rope poses, adapt the clipped guitar contact with an intact body, and maintain body scale during defeat.
- Keep all existing wrestler IDs and artwork stable; allow targeted asset rebuilds without dropping earlier audit entries.
- Use a four-by-four desktop roster, accept Caleb in multiplayer, and keep incompatible clients in separate rooms (`LU51-`, protocol `lunacy-2d-v3`).

Validation: 89 automated tests and static checks pass. Caleb was reviewed in the actual renderer and played in browser Practice using arrow movement and touch attacks. His online host/guest selection and snapshots pass transport tests; the real Firebase connection was not retested for this character-only update. No deployment included.

## 0.5.0 — New wrestler artwork and complete action families

- Integrate Able, Dani Mo, Facade, J-Rod, Matt Cross, and Vincenzo from the six new sprite archives; keep the original nine wrestlers. Replace matching IDs on repeated asset builds.
- Map all 168 source sheets to action families, with reviewed transparent silhouettes and anchors. Correct source-facing differences, touching poses, rope backgrounds, and clipped guitar contact panels.
- Add running; four selectable weapons and carried-weapon movement; guitar breakage; interruptible meter-building taunts; both corner climbs, safe dismounts, dives, blocked/missed dive recovery, and powered dives.
- Use dedicated falls, exhaustion, lifted/thrown poses where supplied, kneeling defeats, entry poses, and victory animations. Draw the active attacker above the defender so contact is visible.
- Add phone WEAPON and TAUNT buttons, contextual CLIMB/DIVE, automatic running, equipment labels, and portrait/landscape layouts. Preserve arrow-key/D-pad movement and all existing escape mechanics.
- Expand the roster grid and arcade run to fifteen fighters / fourteen opponents.
- Extend the original Firebase integration to new inputs, equipment, poses, and timing. Isolate compatible matches under `LU5-` and protocol `lunacy-2d-v2`.

Validation: 88 automated tests, static checks, all six fighters visually reviewed in the renderer, four browser viewport sizes, and a real Firebase host/guest room with equipment, guest damage, taunt/meter updates, and clean room closure. Physical-device and latency limits are recorded in TESTING.md. This ZIP has not been deployed.

## 0.4.0 — Original Firebase multiplayer restored

- Reuse the supplied JCW Firebase project and the original create-room, join-room, and atomic Quick Match design.
- Adapt host-controlled simulation and interpolated guest snapshots to the current engine. Sync fighters, arena, health, meter, animation, grapples, pins, timer, rounds, and results.
- Preserve ordered button presses across delayed/coalesced packets; ignore duplicate inputs and release stale movement.
- Both online players use arrow keys or their own touch/gamepad controls. Joining players get their own PIN / BREAK / KICK OUT and finisher state.
- Wait for both clients to load artwork; reserve guest seats atomically; clean up owned rooms and listeners; show connection-loss feedback. Online menus keep the shared match running.
- Separate new-engine rooms and matchmaking from the incompatible legacy wire format. Existing Firebase rules and unrelated data are unchanged.
- Fix a real Firebase cold-cache transaction issue found during browser testing, and support browsers without crypto.randomUUID.

Validation: 71 automated tests and static checks pass. Two live Firebase browser clients completed room-code joining and Quick Match; movement, health/meter updates from touch attacks, and leaving were observed. Physical phones and long-distance latency remain untested. No GitHub deployment is included.

## 0.3.1 — Browser testing and attack pose fixes

- Replace HIT’s crouch-and-overhead-lift sequence with selected forward-hand poses, recoil, and a return to the original stance for all nine wrestlers. Existing atlas pixels are preserved.
- Correct Willie Mack’s reversed throw sheet and attack body scale. Remove detached dust-only entries from Cokane’s and Yabo’s throw sequences.
- Hold chair contact art throughout the combat engine’s active damage window for both four-frame and five-frame sheets.
- Move pause into the top controls so it cannot cover the wrestlers; keep phone header buttons reachable.
- Fit the ring and optional touch deck together on desktop/tablet screens.
- Add an opt-in local browser QA fixture (`npm run dev`, then `/__qa__`) with viewport sizes and timed keyboard inputs. `npm start` serves only the game.

Validation: 54 automated checks and static asset/module checks pass. Desktop-browser layout and gameplay checks completed; physical-phone feel, audio output, haptics, and controller hardware remain unverified. See `TESTING.md`.

## 0.3.0 — PC and phone controls; legacy content recovery

- Player 1 now uses arrow-key movement plus Z / X / C / V actions. J / K / L / U remain aliases. Local Player 2 uses WASD with F / G / H / R; 1 / 2 / 3 / 0 remain action aliases. Solo WASD still controls Player 1.
- Rebuilt the phone controls as a sliding cross-shaped D-pad and larger two-column action pad. Diagonal motion, multi-finger input, a neutral center, drag-out release, and pointer cancellation are handled by the input adapter.
- Optional touch HIT repeat; other attacks still require fresh taps.
- Contextual GRAB / PIN / BREAK, a finisher charge/readiness display, and a single repeatedly tapped GET UP / KICK OUT button. Pin escape still runs through the combat engine’s alternating-input rules.
- Portrait camera follows the fighters with a closer view and larger HUD; landscape reserves side rails for the controls. No forced orientation. Help/pause dialogs fit the viewport and hide the touch deck.
- Added Practice with a passive opponent, unlimited time, full meter, and resets after KO/pinfall.
- Added optional touch vibration, saved control/music preferences, and an always-show touch-control setting.
- Load arena artwork on demand instead of fetching every arena at startup.

### Recovered from `LUNACY_REBUILT_CLEAN(2).zip`

| Source material | Integration |
|---|---|
| `jcw_intro_theme.mp3` | Selectable JCW theme; existing Fight Club music also available |
| `ui/arena_funhouse.jpg` | Funhouse arena, framed to our fighting lane |
| `ui/arena_lunacy.jpg` | Lunacy Outdoors arena, framed to our fighting lane |
| Legacy wrestler metadata | Six existing fighters’ finisher names in selection and activation banners |
| Contextual wrestling action design | Phone GRAB / PIN / BREAK and recovery controls adapted to our engine |
| Existing arena artwork | Corrected labels: arena 2 is Madhouse; arena 3 is Rusted Warehouse |

The legacy ZIP includes additional characters with placeholder/recolored bodies, low-resolution art, a different movement model, rope/weapon systems, and Firebase networking. Those systems require their own integration and were not imported into this update. Existing character atlas pixels are unchanged. Named finishers retain the current common attack animation.

Validation: 51 automated tests and static asset/module checks pass. This update has not been browser/device playtested or deployed to GitHub.

# Changes

## 0.2.1 — GitHub Pages root entry

- Add a root `index.html` that opens the existing game in `dist/index.html`.
- Add `.nojekyll` and instructions for publishing from `main / (root)`.
- Preserve the existing Actions deployment workflow and all game files.

## 0.2.0 — Refinement

- Retain fast keyboard and touch taps between simulation frames. Add a 160 ms action buffer near recovery and preserve input during impact freezes.
- Resolve simultaneous strikes fairly, including double knockouts.
- Apply knockback over time instead of snapping positions. Keep standing fighters separated at the ring edges.
- Remove attacker teleportation from corner grapples. Ease the opponent into the grab, rotate the intact sprite during the lift, and throw inward from corners.
- Add a 220 ms throw-break window using the grapple button; CPU throw-break decisions follow difficulty.
- Ease into pin positions and push apart on kick-out. Require genuine alternating escape inputs; pressing both buttons together does not advance escape. Remove duplicated CPU escape contributions.
- Finish an active throw or pin before resolving an expired timer. Clear airborne/unfinished moves at round end.
- Anchor weapon animations at the feet, reverse walk cycles during retreat, and add subtle grounded idle breathing.
- Align attack poses with impact timing. Improve finisher feedback and health damage trails while keeping the HUD stable during arena shake.
- Show an opponent preview, winner portrait, and device-specific control reminders.
- Retain controller player assignments after disconnection and pause safely. Improve modal focus, disabled touch state, short taps, held-input clearing, and music resume behavior.
- Move landscape touch controls beside the scaled ring so buttons do not cover the match.
- Reuse image loading requests for mirror matches and reset effects between matches.
- Pass 38 automated engine, input, and renderer tests, plus syntax, UI-reference, atlas-bound, and foot-anchor checks.

Browser/device playtesting remains pending. The prepared artwork is retained; no new character artwork or roster changes were introduced.

## 0.1.0 — Initial playable build

Nine wrestlers, four supplied arenas, CPU/local versus/arcade modes, chair attacks, throws, pins, finishers, keyboard/touch/gamepad controls, audio, and GitHub Pages setup.
