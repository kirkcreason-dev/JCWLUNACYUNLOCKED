# Online multiplayer

## Play with a friend

1. Both players open the updated game and pick their own wrestler.
2. Select **ONLINE MULTIPLAYER**.
3. One player chooses the arena and presses **CREATE ROOM**.
4. Give the four-letter code to the other player. They enter it and press **JOIN ROOM**.
5. The match starts when both devices have loaded their wrestlers and the host’s arena.

For automatic pairing, both players choose **QUICK MATCH**. Searches last up to 45 seconds and can be cancelled. Unused private codes expire after five minutes.

Both players use **arrow keys + Z / X / C / V, Q for weapons, E for taunts, and Shift to run** on their own computer, or the existing phone/gamepad controls. The host is P1 on the left; the joining player is P2 on the right. The online banner identifies your player. The joining player’s touch buttons use their own meter, pin opportunities, grapple-break window, and kick-out state.

Online matches keep running while the match menu or CONTROLS is open. Those menus release your held inputs. After a result, use **BACK TO ONLINE LOBBY** to create or join another match. A lost connection ends the session with a message; there is no mid-match rejoin or host migration.

## What was recovered

This uses the Firebase project and web configuration from `LUNACY_REBUILT_CLEAN(2).zip`: `jcw-lunacy`. It retains the original architecture: room codes, an atomic Quick Match queue, a host that runs the simulation, guest input packets, and interpolated host snapshots. The existing pinned Firebase 10.14.1 app/database compat scripts load only when online play is requested.

The old code was tied to a different engine. The adapter now synchronizes this build’s wrestler IDs, arena, position, animation, health, guard, meter, grapples, pins, rounds, timer, effects, and result. Version 0.5 also synchronizes selected weapon, attack style, move timing, fall direction, exhaustion, and climb/perch/dive states; weapon and taunt taps use the ordered input stream, and run is a held input. Input and snapshot writes are capped at approximately 20 per second each while a match is running, with only one write in flight per stream. Button press groups retain their order, so delayed packets do not collapse alternating kick-out taps into one simultaneous press. Old or duplicated packets are ignored.

New rooms use `rooms/LU140-ABCD`, with a `lunacy-2d-v14` protocol marker. Quick Match uses `rooms/LU140-queue`. Both players must use v0.14.0 with all 36 fighters. Incompatible older clients are isolated by the new namespace. The old `quickQueue` and old unprefixed rooms are not modified.

Room creation and guest-seat claims use transactions. Both sides confirm artwork readiness before the host starts. The host registers removal of its room on disconnect; the guest registers an offline marker. Leaving removes listeners and clears only the caller’s own queue claim or room. Stalled connections and failed loads show a recovery message.

## Firebase and hosting

The original Firebase web config is included in `dist/src/firebase-config.js`; it is public browser configuration, not a service-account credential. This integration keeps the original game’s unauthenticated connection approach and relies on the project’s existing Realtime Database access rules. No rules, Authentication settings, site accounts, trading data, or other project configuration were changed. No open-access rules file is supplied.

Earlier versions were tested against the live Firebase service. This release was tested with the in-memory Firebase-shaped transport; live connectivity was not retested. If its rules or service settings change later, online play may require an access update by the project owner. This build does not add login, account stats, ranked validation, rollback networking, dedicated match servers, or cross-version play. The host controls match state, as in the original game, so it is intended for casual play rather than cheat-resistant ranked results.

To put this version on GitHub Pages, upload the extracted project contents, including the updated root `index.html` and the complete `dist` folder. Replacing only the HTML would leave the new network modules missing. The game keeps its relative URLs, so the repository subpath continues to work. The delivered ZIP itself has not been deployed.

Roster IDs 16–20 are Sally Boy, Big Vito, Bruce Wayans, Alice Crowley, and Ruffo. Kongo Kong is ID 21 and Father Bronson is ID 22. Hokane is ID 23. The v0.7.2 namespace separates clients that lack the full 24-fighter roster. Host/join tests include Hokane and preserve the correct definition and snapshots. Submission holds and hold-escape events synchronize through host snapshots; both clients render impact and announcement artwork from the same events.

## Testing and maintenance

Run `npm test` and `npm run check`. `tests/online.test.mjs` covers protocol/lifecycle behavior with an in-memory Firebase-shaped transport. The shipped game always uses the real Firebase service. For a local two-client browser check, run `npm run dev`, open `/__qa__`, and choose **Second player 390 × 844**. The QA fixture is not included in `dist` and is served only with the local QA flag.

See [TESTING.md](TESTING.md) for the live two-client observations and device/latency limits. The implementation follows Firebase’s documented [transaction behavior](https://firebase.google.com/docs/database/web/read-and-write#save_data_as_transactions) and [connection/disconnect handling](https://firebase.google.com/docs/database/web/offline-capabilities).

## v0.8.0 gameplay synchronization

The new namespace separates the refined combat rules from older clients. Host snapshots carry confirmed strikes and chain position, and replay rope-break, hold-release, grab, and swing feedback on the guest. Ordered guest taps can break grabs and trigger the same chain rules as local input. Live Firebase connectivity was not retested; the in-memory Firebase-shaped room lifecycle and host/guest transport tests were run.

The v14 protocol carries fresh block presses, reversal cooldowns, Second Wind state and both feedback events. The host awards every reversal and comeback boost; guests receive the same authoritative health, guard and meter values. Older clients use separate rooms.
