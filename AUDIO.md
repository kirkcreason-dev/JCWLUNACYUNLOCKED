# Audio — v0.19.0

Both uploaded sound packs are included unchanged in `dist/assets/sfx`. The game uses 49 individual WAV samples from the 53 supplied files. The preview and three combined DJ Clay attacks remain in the package for reference but are not loaded during play.

## Gameplay mapping

| Action | Supplied sound | Behavior |
|---|---|---|
| Light strike / bare-hand heavy | Punch hit | Confirmed contact only |
| Kick-style heavy | Kick hit | Confirmed contact only |
| Chair, bat, guitar, trash can | Matching weapon hit | Uses the attack's recorded style, including a breaking guitar |
| Tony's bottle | Short bat hit | Temporary substitute; no bottle sound was supplied |
| Strike wind-up | Weapon swing | Quiet swing; DJ Clay's special uses its own charge |
| Throw / slam | Body slam in ring | Main impact plus a quiet synthetic grunt |
| Jump landing | Jump landing | Suppressed when the same event batch already has that fighter's slam |
| Rope rebound | Rope bounce | On rebound, not ordinary wall contact |
| Grounded walk / run | Ring footsteps | Quiet, distance-based and throttled; none while airborne or stopped |
| Start / end of round | Ring bell | Replaces the procedural bell when loaded |
| Damage reaction | Synthetic grunt | Rate-limited per fighter; these are synthesized effects, not wrestler voice recordings |
| DJ Clay finisher | Button → charge → bass | Bass starts on the attack's active frame, including misses and blocks |

Other cues, including guard, reversal, count, crowd and Second Wind, retain the existing synthesized effects. Loaded samples replace their corresponding procedural cue. Missing, failed or still-loading samples fall back immediately; no delayed sound is replayed after the action.

## DJ Clay timing

The existing finisher startup is 0.171 seconds. The button cue begins on activation and a short tail of the charge sample ends at startup. The bass starts when the engine enters its active attack frame. This preserves combat speed instead of extending the move to fit the combined recordings' lead-in.

Interrupted wind-ups, pause, mute and round transitions stop the charge. The three bass variants avoid immediate repeats. A corner finisher dive uses the ordinary dive sounds. Online guests receive the sequenced active-frame cue once; actual delivery still depends on connection latency.

## Controls and resource limits

Use CONTROLS to set music and effects volumes separately. Turning effects to zero stops active effects. Disabling sound or pausing an offline match stops effects; an online match continues while its menu is open. Browser audio starts after the player's start/unmute gesture.

- Three concurrent background loaders; eight-second timeouts and 30-second failure backoff.
- Sixteen MiB maximum decoded sample cache; 6,039,936 bytes at 44.1 kHz for all runtime samples.
- At most 24 simultaneous sample/procedural voices, with source and gain nodes disposed after playback.
- Effects compressor and short gain envelopes; footsteps and grunts sit below the primary impacts.
- No sample fetch or decoding in the simulation or rendering loop.

WAV decoding uses the complete file and resamples to the audio context's rate, so device memory usage can differ from the 44.1 kHz audit. See [MDN decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData). Charge trimming uses the source offset and duration supported by [AudioBufferSourceNode.start](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start); the original WAV files are not edited.

## Validation and device handoff

`tools/sound-pack-audit.json` records hashes, duration, format, peak and RMS for every supplied WAV. Automated tests cover resource bounds, event timing, mappings, interruption, online deduplication and cleanup. They use a Web Audio model and PCM inspection, not browser or physical-device listening.

On a phone and desktop, check DJ Clay's hit, miss, block and interrupted charge; compare music against impacts; then pause, mute, background and restore during several matches. Listening and sustained real-device performance still need tester verification. This release is a full ZIP and has not been deployed.
