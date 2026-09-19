# Weapons, top-rope moves and pole matches — v0.20.0

## Weapons

WEAPON cycles the available equipment in ordinary matches. Every fighter has bare hands, chair, bat, guitar and trash can; Tony also has a bottle. Each now has a distinct purpose. Damage below is the base value before the fighter's approved Power/Toughness and combo modifiers.

| Attack | Base damage | Reach | Landed hits before breaking | Use |
|---|---:|---:|---:|---|
| Bare-hand heavy | 11 | 124 | Unlimited | Quicker wind-up and recovery |
| Chair | 17 | 155 | 4 | Strong impact and guard pressure; running hit knocks down |
| Bat | 12 | 178 | 6 | Longest reach, quicker than the larger weapons |
| Guitar | 23 | 160 | 2 | High damage and knockdown, longer recovery |
| Trash can | 21 | 140 | 3 | Highest guard pressure and knockdown, slowest wind-up |
| Tony's bottle | 18 | 128 | 1 | Fast, short-range knockdown; breaks on contact |

Misses, blocks and ordinary jabs do not use durability. Equipped weapon finishers do. Switching away and back keeps the weapon's wear; a broken weapon is skipped until the next round. A fresh round restores equipment. Remaining hits appear in the desktop HUD and phone WEAPON label. Approved wrestler ratings are unchanged.

For the original nine fighters, the added weapon props now use measured hand positions for standing, walking, running and attack poses. Contact follows the attack's actual timing. The supplied character sprite sheets remain unchanged; these added weapons use code-drawn props with the existing fighter animations.

## Top-rope taunt

Climb either corner with GRAB when there is enough space from the opponent. Press TAUNT at the top to pose for one second and earn **20 Lunacy**, instead of the ground taunt's 12. An interrupted taunt earns nothing. You remain on the turnbuckle after the reward; press an attack to dive or Down to climb off. The top-rope taunt has a six-second cooldown, and the overall perch limit remains six seconds so taunting cannot hold the corner indefinitely.

## Superplex

Approach a perched opponent and press **GRAB**. You can also use GRAB while perched if a standing opponent is close below. On phones the button reads **SUPERPLEX**. Both wrestlers rise to the corner, then the attacker throws the defender into the ring.

The superplex deals **28 base damage**, compared with a normal throw's 17, using the same Power, Technique and Toughness modifiers. The attacker has a landing recovery. The defender can tap GRAB/BREAK during the first **0.38 seconds** to escape; a successful break returns the elevated wrestler to the perch without damage. Simultaneous corner grabs break fairly. CPU opponents can perform and escape the move.

## Weapon on a pole

Choose **WEAPON ON A POLE · CPU** or **WEAPON ON A POLE · 2 PLAYER** in the mode selector. Use the normal CPU difficulty or local second-player controls. This mode is offline; ordinary online matches include the new weapon rules and rope moves.

1. Both fighters begin bare-handed. A chair hangs above the marked corner.
2. Make space, climb that corner with GRAB, then **hold GRAB/CLAIM for 1.05 seconds**. The progress bar shows retrieval. Releasing the button or being knocked/grabbed off cancels progress.
3. Use the chair's four hits to gain an advantage. A knockdown, grapple, pin, another climb or pressing WEAPON drops it. Either fighter can move within pickup range and press WEAPON to take it; wear stays with the chair.
4. Win by KO, pinfall or submission. Claiming the chair does not itself award a fall. The match is best of three, with the normal time limit.
5. A new chair appears on the opposite corner each round. If it breaks, finish the current fall with your other moves.

CPU opponents seek the pole, contest the corner and pick up dropped gear. Pole mode prevents ordinary weapon cycling, so the suspended chair is the only weapon available in that match.

## Existing progress and testing

Championship records, arcade medals, the updated Nocturnal Deadhead credits and the supplied audio remain included. New online combat uses v20 / LU200 rooms; both online players need this release.

Simulation tests cover every fighter's new rope actions in both corners, interrupted retrievals, shared weapon wear, escape timing and network snapshots. Native canvas images were inspected for grip placement and phone ring framing. Browser CSS, physical touch feel and device performance still need tester play. The full ZIP is not a deployment.
