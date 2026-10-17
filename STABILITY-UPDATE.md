# Lunacy Unlocked 0.22.1 — arcade recovery and pole CPU

This follow-up is based on the verified v0.22.0 archive, SHA-256
`0bd5899a0c25a5a294ea4ff7db2386fe5d0d6597dadbade9b6ce9d25bb696d5f`.

## v0.22.1 follow-up

A controller regression reproduced the prior result overlay making retry controls
inert after a failed next-opponent load. Recovery now dismisses the old overlays,
and a completed result reopens after a graphics reset without counting twice.

Character select discovers saved runs and offers **RESUME ARCADE**, restoring the
saved fighter, difficulty, arena sequence and completed falls. Existing v0.22.0
saves without a last-played timestamp remain compatible. New timestamps identify
the most recently played incomplete run. Other saved runs remain available by
selecting their fighter and difficulty. Completed runs are excluded.

Pending saves now retry when leaving/hiding the page, returning to character
select or using the recovery Reload button. This covers win/loss totals, arcade
progress, medals and championship progress. Repeating a result also retries an
unsaved total without adding another win. Persistent storage failures continue
to be labeled session-only; a browser/device crash cannot guarantee a retry.

The full suite now has **314 passing tests**, with seven added regressions and
stronger assertions on recovery controls. The core match simulation is unchanged
from v0.22.0; its 120-match pole stress result below was not rerun for this UI and
save-retry update. No browser or physical-device validation is claimed.
All 40 fighters, the original art and sound files, source packs, roster approvals,
DJ Clay portrait, Alice replacement, Evil Dead and the dive/get-up correction remain included.

## Original v0.22.0 faults and changes

- **Pole CPU:** the AI stopped within 65 pixels of a pole inset 18 pixels from
  the boundary. Climbing requires being within 65 pixels of the boundary itself.
  The resulting 18-pixel gap repeatedly produced grab whiffs (punch poses).
  The AI now uses the actual climbing boundary on both sides.
- **Graphics restoration:** the renderer received `contextrestored`, but the
  controller's runtime-error flag continued to stop every frame. Restoration now
  clears that stop, repaints, and offers Resume for the same offline match.
  Online players return to the lobby instead of continuing an unsynchronized match.
- **Loading/retry:** simulation and rendering pause while the next fighter/arena
  decode. A loading overlay offers cancel; failed loads retain the same saved
  opponent and show retry/reload. Repeated failed retries keep these controls
  accessible. Cancelled requests cannot restore an obsolete match. The active
  artwork cache remains two fighter atlases and one arena.
- **Interrupted drawing:** retry resets the canvas save/transform stack left by
  a failed draw. Animation callbacks are rescheduled in `finally`. Hidden pages
  cannot advance an offline match.
- **Arcade progress:** a separate save per fighter and difficulty stores opponent
  order, defeated opponents and completed falls. Checkpoints are written before
  optional effects/audio. A finished winning fall survives a reload before the
  result overlay. An interrupted round restarts at full health; the rest of the
  run stays saved. Losing allows retrying that opponent. Start Over is explicit.
- **Game-win record:** complete solo/online matches increment a local win/loss
  total once; practice, local two-player and individual falls are excluded.
  Result receipts suppress duplicate counting after recovery. Existing medals
  and championship records use their existing save keys and are preserved.

## Counter limitation

The supplied v0.21.0 project had no lifetime game-win counter, account statistics,
or external achievements integration. This release adds a clearly labeled local
record, starting with matches played in this version. Historical totals cannot be
reconstructed from medals. If Zee's counter is on another site or account page,
its screenshot/URL and integration source are needed to investigate it separately.

## Saving and recovery

Use the same browser and site address, then choose **RESUME ARCADE**.
You can also pick the same fighter/difficulty and choose **CONTINUE ARCADE RUN**. Keep using the same deployed address when updating:
local saves are not shared between localhost, file URLs, or different websites.
If storage is blocked/full, the interface reports session-only progress.
Clearing browser site data removes local saves. Do not clear it to update the game.
An existing v0.21.0 arcade run cannot be recovered after a reload because that
version never saved it.

A recovered canvas offers **RESUME** without restarting the round. For other
errors, use Retry; after a browser reload, use Continue Arcade Run. A small local
error record (`lunacy-last-error-v1`) retains the last caught error's message,
stack, mode, fighter indices and round for diagnosis. No report is transmitted.

## v0.22.0 verification retained

- `npm test`: 307 passing tests, including saved 39-opponent runs on all three
  difficulties, reload after a final fall, duplicate-result suppression, invalid
  saves, storage failure and preserving fighter/difficulty isolation.
- Main controller tests with a mocked DOM/device adapters exercise real button
  callbacks, loading failure/retry/cancel, hidden pages, and graphics restoration.
- Pole corner regression covers all 40 fighters, both sides and three difficulties
  (240 combinations), with no failed-grab punches while retrieving the chair.
- `node tools/soak.mjs --pole`: 120 complete matches, 527186 simulation steps,
  bounded finite state and valid network snapshots.
- `npm run check`: JavaScript syntax, UI references, all 40 wrestlers, 4894
  animation entries, six arenas, two music tracks and 49 runtime sound samples.

These are deterministic engine/controller checks, not live browser or physical
phone tests. The changes address confirmed code faults and prevent full-run loss;
they do not establish the cause of every reported black screen or device crash.
Tester follow-up: device model, browser, version displayed, whether the failure
occurs mid-fight or between opponents, and a screenshot of the affected counter.

## Delivery

Full ZIP only. No push or deployment was performed. Use the existing README
instructions to run locally (`npm start`) or replace the hosted game files.
The online v21/LU210 protocol is unchanged because roster/state compatibility is
unchanged; using the latest build on both devices is recommended.
