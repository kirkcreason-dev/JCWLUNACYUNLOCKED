# v0.21.1 secret fighters

Five fighters — Evil Dead, Violent J, Jeff Lane, DJ Clay and Shaggy 2 Dope — stay off the pick list until you win the championship belt once on this browser (any fighter, any difficulty). They can still show up as opponents.

# v0.21.0 — Evil Dead

Evil Dead is selectable in every mode, with shared combos, unarmed kicks, all four common weapons, taunts, rope climbs/dives and corner throws. His neutral multipliers and generic finisher are provisional game defaults. New arcade runs face 39 opponents; existing medals and championship checkpoints remain valid.

# v0.20.3 dive recovery collision

Top-rope dives can hit a downed opponent as they get up and during the last standing recovery frames. A connecting dive scores once and avoids missed-landing self-damage. A strong block still stops it; leaving the dive’s path still causes a normal miss. Ordinary grounded attacks retain their existing get-up protection rules, as do throw breaks and kickouts.

# v0.20.0 weapons and corner combat

See [WEAPONS-AND-POLE.md](WEAPONS-AND-POLE.md) for the current rules. Weapons now have distinct damage, reach, guard pressure and persistent wear. Top-rope TAUNT earns 20 meter if uninterrupted. GRAB near a perched opponent starts a superplex for extra damage, with a 0.38-second defender break window. The mode selector offers weapon-on-pole matches against CPU or a local second player.

# v0.19.0 sound update

CONTROLS has separate music and effects volumes. Supplied wrestling effects follow contact and movement. DJ Clay's finisher now plays his button press, charge and bass blast; an interrupted wind-up stops the charge. Attack timing, damage and meter rules remain the same. Missing audio falls back to the procedural sounds while play continues.

# v0.18.0 controls and rewards

Every fighter starts with bare hands. WEAPON cycles chair, bat, guitar, trash can, then bare hands; Tony has a bottle before bare hands. A guitar breaks after two landed weapon attacks. Everyone can taunt for meter and climb at either corner when the opponent is far enough away.

Move left/right to face your direction of travel. Guarding or attacking faces your opponent. Hold Down + HEAVY for a guard counter: it drops your guard and commits to an unarmed knockdown strike, so mistiming it can be punished. Jump, then HEAVY for an air strike. Land HIT, HIT, HEAVY for a three-hit knockdown chain. Follow-up damage is reduced. Finishers still require full meter.

Clear the entire arcade roster to earn the selected difficulty's medal for that fighter: Easy bronze, Normal silver, Hard gold. Matching portrait frames are applied when that difficulty is selected. All three medals award a Triple Crown frame. Medals save on this browser; blocked storage keeps them for the session and displays that limitation. A loss, partial run, CPU exhibition or championship match never awards an arcade medal. Arcade runs must be completed in one session.

The illustrated phone GRAB button changes to PIN, BREAK, CLIMB, DIVE or RELEASE. Recovery changes to GET UP, KICK OUT or ESCAPE. Weapon and finisher fields are live. Controls → TEST VIBRATION checks supported devices; it reports unavailable or declined vibration honestly. Device silent/DND settings can suppress a request accepted by the browser.

# v0.16.0 play additions

Run into either rope to rebound. Press HEAVY on the return for a running attack; Down cancels into guard. Fighter ratings now also select distinct CPU tactics and finisher tradeoffs, while technique improves guard recovery.

The title win opens the supplied championship credits automatically. Defend Your Title continues the saved campaign. Controls contains separate audio mix sliders, first-match tips and a tip reset.

# Lunacy Unlocked — gameplay guide, v0.15.0

## Championship mode (v0.15.0)

Choose **CHAMPIONSHIP**, your wrestler and difficulty, then **START CHAMPIONSHIP**. Win five best-of-three matches: opening bout, quarterfinal, contender match, semifinal and title match. Each run draws five distinct opponents and places the strongest of that draw in the title match, using normal roster stats. Arenas rotate automatically from your starting arena.

Win the title to receive the Lunacy championship belt, then select **DEFEND YOUR TITLE** for a fresh challenger. Consecutive challengers do not repeat. The game tracks title wins, defenses this reign and your best defense streak. A loss during the five-match road retries that same opponent; a lost defense starts a new five-match chase while retaining title-win and best-streak records.

Progress saves on this browser after each match, separately for each fighter and difficulty. Return to the same fighter/difficulty and choose **CONTINUE CHAMPIONSHIP** or **DEFEND YOUR TITLE**. Quitting or reloading mid-match restarts that match, not the whole run. Records are local to this browser, not synced across devices; clearing browser data removes them. When browser storage is blocked, the game displays that progress lasts only for the session.

This is a solo CPU mode. Local versus, the full-roster arcade run, practice and online play remain available. Current online rooms use v21 / LU210. The full ZIP is not deployed automatically.

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
