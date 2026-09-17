# Lunacy Unlocked — gameplay guide, v0.14.0

## Timed reversals

Press **Down** on keyboard/phone, or **LB** on a gamepad, just before a normal strike lands. Stay blocking through contact. The first **0.12 seconds** of a fresh guard can reverse the attack, provided at least **20 guard** remains. Each attempt starts a **1.2-second cooldown**. Holding guard or repeatedly tapping during cooldown does not renew the window.

A reversal costs no health or guard, gives **12 Lunacy**, and staggers the attacker for **0.32 seconds**. Release block and tap HIT to punish. The counterattack uses its normal range and damage. You cannot reverse while still attacking or stunned; a held block resumes ordinary defense on recovery. Finishers, grabs and dives use their existing defenses and cannot be reversed by this mechanic.

## Second Wind

Once per round, opponent damage that leaves you alive at **30 health or less** grants **25 Lunacy** and **20 guard**, capped at 100. The cue identifies which player received it. Spend a ready finisher wisely or defend and build the remaining meter for a comeback.

Health, hitstun and knockdowns remain unchanged. A knockout stays a knockout. Missed-dive self-damage does not award Second Wind. The opportunity resets for each new round; both players and CPU fighters get the same benefit.

## Pace and running attacks

Walking, running, air steering and horizontal dive travel are 12% faster. Attack wind-up and recovery are 10% shorter; the active contact windows, base damage, hit-stop, match timer, throw-break and pin/submission escape rules stay the same. The same simulation runs on every device. Touch HOLD HIT repeats in step with the shorter strike recovery.

Run toward the other wrestler, then tap **HEAVY** for a short lunge. Hold direction to build into a run automatically, or use the existing run control with at least 0.2 seconds of forward movement. The lunge carries you about 45 ring units and works with every heavy weapon. It deals normal damage, can be interrupted or blocked, and keeps its full recovery. A backward run, airborne attack, combo follow-up, or standing Shift + HEAVY does not trigger the lunge. A landed hit displays **RUNNING HIT** unless combo/counter feedback takes priority.

Between rounds, the result pause is now 2.4 seconds rather than 3 seconds. The opening countdown still gives both players time to get ready.

## Strike chains

Get close, land **HIT**, then tap **HIT** again during the impact to link the second strike. Tap **HEAVY** after either jab to finish the sequence. On Player 1's keyboard, try **Z → Z → X**. On a standard gamepad, use **X → X → Y**. Touch players use the same HIT and HEAVY buttons.

The game accepts a follow-up during hit-stop and starts it after the jab's active frames. The second hit deals 85% of normal damage; the third deals 70%. The sequence allows two jabs and one heavy, with no further recovery cancel. A blocked or missed attack keeps its full recovery. Slow weapons still give the defender an opportunity to block before the heavy lands. Holding touch HIT continues the existing regular strike repeat; tap deliberately to make a chain.

**COUNTER** means you interrupted an opponent's attack startup. It does not add a hidden damage bonus. The hit count updates in place so consecutive numbers remain readable.

## Movement and defense

Holding a direction accelerates smoothly into a run over roughly 0.38 seconds. Shift or the controller's left-stick click still runs immediately. Attacks, guarding, knockdowns, and holds reset run buildup. Releasing a direction stops movement input; impact knockback still settles normally.

Hold Down to block on the first legal frame after hitstun or standing up. An attack buffered near the end of recovery starts as soon as recovery finishes. Attacking gives up any remaining wakeup invulnerability.

Guard waits 0.7 seconds after a blocked hit before regenerating. Moving freely recovers guard faster than holding block. A dive into a strong block leaves the diver vulnerable; a dive that empties the defender's guard breaks through.

## Grabs, pins, and submissions

Tap GRAB close to a standing opponent to throw. When caught, tap GRAB within the opening **0.28 seconds** to break it; the screen shows the relevant button. Both players grabbing on the same simulation frame break apart immediately. Hitstun cannot be converted into an instant guaranteed grab.

A downed opponent must finish landing before a pin starts. A tap near the end of the fall is buffered. Hold Down while tapping GRAB for a submission; that modifier stays attached to the buffered command even if you release Down.

Pins and submissions within 55 ring units of either boundary trigger a **ROPE BREAK** before the first count. Use a throw toward the center to set up a better pin. Tap GRAB again after the opening 0.3 seconds of your hold to release it yourself; the phone button reads RELEASE.

While pinned, alternate HIT and HEAVY on keyboard/gamepad or tap the large phone escape button. Holding one button or pressing both together does not accumulate repeated escapes. Healthy wrestlers still resist early pins naturally. The existing three-count and submission victory rules remain.

## CPU and online play

The CPU approaches within useful striking range, avoids choosing short jabs from too far away, can deliberately repeat attacks, avoids futile rope-side pins, and saves finishers while an opponent is down or getting up. Difficulty continues to control decision timing, blocking, throw breaks, and pin escape assistance.

Both online players must use compatible **v0.14.0** builds. The host applies these same rules to both players. The guest receives chain counts, confirmed-hit hints, grab cues, and hold/rope-break events. See MULTIPLAYER.md for the transport details and TESTING.md for what was verified.

All 36 existing fighters, supplied ratings, animation atlases, arenas, startup artwork, and music are retained. Practice mode still provides full meter and a passive opponent for learning the timing.

## v0.8.1 phone selector

Use MORE / BACK to browse the full roster, or PICK ANY FIGHTER to jump directly to any of the 24 names. USE FIGHTER opens the phone match setup, including the four website stat bars. FIGHTERS returns to the roster. After a new match is ready, unused fighter/arena image references are released so a long arcade run does not retain the entire roster's artwork. Combat rules and v8 online compatibility are unchanged from v0.8.0.

## v0.8.2 phone matches

The ring and touch buttons now fit the visible phone viewport and its safe areas. Portrait uses a closer camera; landscape has a larger two-line name display and narrower control rails. The camera leaves room for airborne fighters. Browser toolbar changes refresh layout without resetting an unchanged canvas. Rotation clears held buttons and pauses offline matches; online matches continue with neutral input until the next press.

CONTROLS → DISPLAY → SAVE BATTERY uses 30 fps presentation. Automatic uses up to 60 fps. Both keep the same 60 Hz fight simulation, buffered actions, damage, and online protocol. Phone rendering sizes the canvas to the actual ring display and reduces decorative particles and glow. Optional artwork downloads no longer block PRESS START. All 24 wrestlers remain available.
