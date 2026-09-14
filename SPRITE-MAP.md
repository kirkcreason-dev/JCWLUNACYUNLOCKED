# New artwork → playable actions

The seven new sets are Able, Dani Mo, Facade, J-Rod, Matt Cross, Vincenzo, and Caleb Konley. They use their own supplied artwork. The existing nine unrelated wrestlers stay in the roster. Re-running `prepare_new_assets.py` replaces matching IDs rather than creating duplicate characters.

All **435 supplied image files** are referenced in `tools/new-asset-audit.json`. The table below explains how their action families become playable. This does **not** mean every alternate view, duplicate pose, illustration label, or clipped figure is played in sequence: a side-view fighter needs consistent facing, complete bodies, and contact poses matched to the damage window.

| Supplied action family | In-game trigger / use |
|---|---|
| Standing | Idle stance; front-facing crop for character selection |
| Walking | Left/right arrows or sliding phone D-pad; reverse frame order for backsteps |
| Running | Hold one direction for 0.42 seconds, or use Shift / left-stick click |
| Walking with chair / bat / guitar / trashcan | Select weapon with Q or WEAPON, then move; first pose while standing |
| Attacking with chair / bat / guitar / trashcan | HEAVY / X uses selected equipment; distinct timing, damage, range, and contact art |
| Elbow / forward throwing pose | HIT / Z; forward contact, recoil, then stance |
| Kicking | Unarmed HEAVY where a kicking sheet exists; otherwise forward strike |
| Grappling / lifting overhead | GRAB / C near a standing opponent; initial grapple can be broken |
| Throwing | End of a successful grapple; throw direction stays toward the ring in corners |
| Being lifted / being thrown | Actual selected defender's dedicated poses where supplied; otherwise intact-body rotation |
| Dazed / hurt | Hit reaction; knockback and stun use combat rules |
| Passed out / leaning | Exhausted reaction after a guard break |
| Falling backward | Strong knockdowns and finishers before lying down |
| Falling forward | Slams and missed dives before lying down |
| Lying face up / face down | Matching downed state; face up while pinned |
| Getting up | Recovery after knockdown, accelerated by alternating escape taps |
| Pinning | GRAB beside a downed opponent; selected attacker stays above actual defender |
| Jumping | Up arrow / JUMP; chamber, airborne, and landing pose selection |
| Climbing on top of ropes | GRAB at either corner while opponent is out of grapple range |
| Jumping off ropes | Attack / jump / GRAB from a perch; full-meter FINISH produces a stronger dive |
| Climbing through / on ropes | Short round-entry sequence; intended as entrance artwork, not free movement outside the ring |
| Taunting / victory | E / TAUNT gives meter only after completion; victory pose after winning |
| Defeated / kneeling | Defeat animation; kneeling reaction after a non-KO round loss |

The phone controls expose all these player actions through the D-pad, HIT, HEAVY, GRAB, FINISH, WEAPON, and TAUNT. GRAB changes to CLIMB, DIVE, PIN, or BREAK when appropriate. Pin/knockdown escape replaces the attack deck with the repeated-tap escape control.

## Source-specific adaptations

- **Able, Dani Mo, J-Rod:** no dedicated elbow/kick sheet is supplied, so complete forward-hand throw artwork supplies unarmed strikes. Dedicated lifted/thrown sheets are used for the defender. Separate directional rows are reduced to one consistent facing and mirrored by the renderer.
- **Facade, Matt Cross, Vincenzo:** no unarmed walking sheet is supplied; the run cycle plays at walking speed until running begins. Their authored elbow and kick sheets supply unarmed attacks. No dedicated being-lifted/thrown sheets are supplied, so the whole selected character rotates through those states.
- **Facade:** no standalone jump or lying-down sheet is supplied. A tucked run pose supplies the jump, and final falling poses supply face-down/face-up. The first two recovery figures touch in the source; recovery starts with the clean prone figure before the remaining intact rise poses.
- **Matt Cross and Vincenzo guitars:** the extended/smash panels clip part of the body or weapon at their borders. Contact uses an intact throwing body holding a separate guitar isolated from Matt Cross's supplied guitar sheet; the weapon is positioned for each body. Their intact wind-up and recovery artwork is retained. The guitar breaks after two successful hits.
- **Ropes and entrances:** reviewed silhouette regions remove most baked-in rope, post, and floor scenery. The renderer supplies the corner platform; scenery from the illustration is not used as a second physical ring. Fine antialiasing or tiny scenery remnants can remain in illustrated edge pixels.
- **Source viewpoints:** rear views in attack or climb sequences are excluded when they would turn a side-on combatant away mid-action. Dust-only components, text, borders, touching neighboring figures, and clipped figures are excluded. The original ZIPs are unchanged.
- **Finisher labels:** ground specials share charged knockdown rules, and corner specials share powered dive rules. A finisher's name does not imply unique signature choreography absent from the artwork.

- **Caleb Konley:** all 28 sheets are mapped, including the two kneeling variants (kneel and defeat). Running supplies unarmed walking; the taunt/victory sheet serves both actions; the dazed sheet supplies exhaustion because no separate exhausted sheet exists. His elbow contact excludes a detached impact spark. His dedicated kick, jump, floor, recovery, pin, and rope sheets are used. No lifted/thrown defender sheet is supplied, so his intact body rotates when another fighter throws him. His clipped guitar contact uses his intact throwing pose with the previously prepared Matt Cross guitar prop; the audit records that shared prepared prop separately.

Both fighters are drawn separately for grapple, lift, throw, and pin. This allows any roster pairing and avoids an incorrect opponent baked into another character's pose. All new inputs, equipment, fall direction, and rope states are carried by the v0.6 multiplayer protocol.

## v0.6 additions

- **Sally Boy:** uses all 27 supplied files, including elbow, kick, five-step throw, and six-step climb. Running supplies ordinary walking. A kneeling pose supplies defeat; dazed supplies exhaustion. The intact selected opponent rotates during lifts/throws because no defender sheets were supplied.
- **Big Vito:** all 29 files are mapped, including the misspelled forward-fall filename. Throw panels are cropped individually so dust and touching illustrations cannot replace the contact pose.
- **Bruce Wayans:** all 28 files are mapped. The file called “jumping” actually contains two running cycles; the right-facing cycle supplies running, with a tucked running frame adapted for ordinary jumping.
- **Alice Crowley:** all 29 files are mapped despite misspelled walking, chair, and lifted filenames. The “bat” file supplies carrying; the attack sheet supplies the strike.
- **Ruffo:** all 31 files are mapped. The second recovery file supplies back-fall recovery, the extra rope pose starts the climb, and the prone “passed out” illustration is reserved for a KO. Dazed supplies standing exhaustion. Some sheet headings use another name; the uploaded folder identity is retained.
- **Able(1):** all 29 source files match the earlier Able archive byte-for-byte. No duplicate roster slot or unnecessary replacement is added.
- **Submission:** Down + GRAB uses a low ground-grapple pose against the separately rendered opponent. An unescaped hold awards a tap-out; the extra artwork does not imply a newly authored signature submission animation.

### Announcement and combat artwork

| Supplied art | Runtime trigger |
|---|---|
| PINFALLED! | Three-count pinfall, early round-end banner |
| KICK OUT! | Defender escapes a pin |
| TAP OUT! | Submission reaches its hold limit before escape |
| YOU WIN! | Local player's match victory; local versus winner screen |
| LUNACY! | Finisher activation, including powered dives |
| Small debris — 8 frames | Ordinary strike contact |
| Impact smoke — 8 frames | Heavy/weapon contact |
| Wide ground dust — 12 frames | Landing and slam, with different sizes |
| Guard puff — 8 frames | Successfully blocked contact |

Banner checkerboards are removed during preparation. Effect PNG alpha is retained. Effects are cosmetic, capped at 24 concurrent animations, expire automatically, and are disabled with reduced motion.

## Source-sheet audit

Every unique fighter source file is mapped below. Raw coordinates are in `tools/new-asset-audit.json`; duplicate directions and malformed panels are not treated as separate gameplay actions.

### Able — 29 sheets

| Source file | Prepared actions |
|---|---|
| Able attacking with bat.jpg | bat |
| Able attacking with chair.png | chair |
| Able attacking with guitar.jpg | guitar |
| Able attacking with trashcan.jpg | trashcan |
| Able being lifted overhead.jpg | lifted |
| Able being thrown.jpg | thrown |
| Able climbing on ropes.jpg | entry |
| Able climbing on top corners.jpg | climb |
| Able dazzed.jpg | hurt |
| Able defeated pose.jpg | defeat |
| Able falling backwards.jpg | fallBack |
| Able falling forward.jpg | fallFront |
| Able getting up from facedown.jpg | rise |
| Able jumping off corner ropes.jpg | dive |
| Able jumping.jpg | jump |
| Able laying facedown and faceup.jpg | down |
| Able lifting overhead.jpg | lift |
| Able passed out.jpg | exhausted |
| Able pinning.jpg | pin |
| Able running.jpg | run |
| Able standing.jpg | idle |
| Able taunting.jpg | taunt |
| Able throwing.jpg | throw |
| Able victory stance.jpg | victory |
| Able walking with bat.jpg | carryBat |
| Able walking with chair.jpg | carryChair |
| Able walking with guitar.jpg | carryGuitar |
| Able walking with trashcan.jpg | carryTrashcan |
| Able walking.jpg | walk |

### Dani Mo — 29 sheets

| Source file | Prepared actions |
|---|---|
| Dani Mo attacking with bat.jpg | bat |
| Dani Mo attacking with chair.jpg | chair |
| Dani Mo attacking with guitar.jpg | guitar |
| Dani Mo attacking with trashcan.jpg | trashcan |
| Dani Mo being lifted overhead.jpg | lifted |
| Dani Mo being thrown.jpg | thrown |
| Dani Mo climbing on rope.jpg | entry |
| Dani Mo climbing on top rope corner.jpg | climb |
| Dani Mo dazed.jpg | hurt |
| Dani Mo defeated pose.jpg | defeat |
| Dani Mo falling backwards.jpg | fallBack |
| Dani Mo falling forward.jpg | fallFront |
| Dani Mo getting back up from facedown.jpg | rise |
| Dani Mo jumping off corner ropes.jpg | dive |
| Dani Mo jumping.jpg | jump |
| Dani Mo laying facedown and up.jpg | down |
| Dani Mo lifting overhead.jpg | lift |
| Dani Mo passed out.jpg | exhausted |
| Dani Mo pinning.jpg | pin |
| Dani Mo running.jpg | run |
| Dani Mo standing.jpg | idle |
| Dani Mo taunting.jpg | taunt |
| Dani Mo throwing.jpg | throw |
| Dani Mo victory pose.jpg | victory |
| Dani Mo walking with bat.jpg | carryBat |
| Dani Mo walking with chair.jpg | carryChair |
| Dani Mo walking with guitar.jpg | carryGuitar |
| Dani Mo walking with trashcan.jpg | carryTrashcan |
| Dani Mo walking.jpg | walk |

### Facade — 25 sheets

| Source file | Prepared actions |
|---|---|
| Facade attack with bat.png | bat |
| Facade attack with chair.png | chair |
| Facade attack with elbow.png | elbow |
| Facade attack with guitar.png | guitar |
| Facade attack with trashcan.png | trashcan |
| Facade climb on top ropes.png | climb |
| Facade climbing through rope.png | entry |
| Facade dazed.png | hurt |
| Facade getting up from facedown.png | rise |
| Facade grappling.png | grapple |
| Facade jumping off corner.png | dive |
| Facade kicking.png | kick |
| Facade kneeling.png | kneel |
| Facade lifting overhead.png | lift |
| Facade pinning.png | pin |
| Facade running.png | run |
| Facade standing.png | idle |
| Facade throwing.png | throw |
| Facade victory.png | taunt, victory |
| Facade walking with bat.png | carryBat |
| Facade walking with guitar.png | carryGuitar |
| Facade walking with trashcan.png | carryTrashcan |
| facade falling backwards.png | fallBack |
| facade falling forwards.png | fallFront |
| facade walking with chair.png | carryChair |

### J-Rod — 29 sheets

| Source file | Prepared actions |
|---|---|
| J-Rod attack with bat.jpg | bat |
| J-Rod attack with chair.jpg | chair |
| J-Rod attack with guitar.jpg | guitar |
| J-Rod attack with trashcan.jpg | trashcan |
| J-Rod being thrown.jpg | thrown |
| J-Rod climbing on ropes.jpg | entry |
| J-Rod climbing on top rope corner.jpg | climb |
| J-Rod dazed.jpg | hurt |
| J-Rod defeated pose.jpg | defeat |
| J-Rod falling backwards.jpg | fallBack |
| J-Rod falling forward.jpg | fallFront |
| J-Rod getting lifted overhead.jpg | lifted |
| J-Rod getting up from facedown.jpg | rise |
| J-Rod jumping off corner ropes.jpg | dive |
| J-Rod jumping.jpg | jump |
| J-Rod laying facedown and up.jpg | down |
| J-Rod lifting overhead.jpg | lift |
| J-Rod passed out.jpg | exhausted |
| J-Rod pinning.jpg | pin |
| J-Rod running.jpg | run |
| J-Rod standing.jpg | idle |
| J-Rod taunting.jpg | taunt |
| J-Rod throwing.jpg | throw |
| J-Rod victory stance.jpg | victory |
| J-Rod walk with bat.jpg | carryBat |
| J-Rod walk with chair.jpg | carryChair |
| J-Rod walking with guitar.jpg | carryGuitar |
| J-Rod walking with trashcan.jpg | carryTrashcan |
| J-Rod walking.jpg | walk |

### Matt Cross — 28 sheets

| Source file | Prepared actions |
|---|---|
| MC attack with bat.png | bat |
| MC attack with chair.png | chair |
| MC attack with guitar.png | guitar, propGuitar |
| MC attack with trashcan.png | trashcan |
| MC climbing on top corner ropes.png | climb |
| MC climbing through ropes.png | entry |
| MC dazed.png | hurt |
| MC defeated.png | defeat |
| MC elbow attack.png | elbow |
| MC falling backwards.png | fallBack |
| MC falling forward.png | fallFront |
| MC getting back up.png | rise |
| MC grapple.png | grapple |
| MC jumping off corner ropes.png | dive |
| MC jumping.png | jump |
| MC kicking.png | kick |
| MC kneeling.png | kneel |
| MC laying facedown and faceup.png | down |
| MC lifting overhead.png | lift |
| MC pinning.png | pin |
| MC running.png | run |
| MC throwing.png | throw |
| MC victory stance.png | taunt, victory |
| MC walking with bat.png | carryBat |
| MC walking with chair.png | carryChair |
| MC walking with guitar.png | carryGuitar |
| MC walking with trashcan.png | carryTrashcan |
| Matt Cross standing.png | idle |

### Vincenzo — 29 sheets

| Source file | Prepared actions |
|---|---|
| MC attack with guitar.png | propGuitar |
| Vinc attack with bat.png | bat |
| Vinc attack with chair.png | chair |
| Vinc attack with guitar.png | guitar |
| Vinc attack with trashcan.png | trashcan |
| Vinc climb through ropes.png | entry |
| Vinc climbing top rope corner.png | climb |
| Vinc dazed.png | hurt |
| Vinc defeated pose.png | defeat |
| Vinc elbow attack.png | elbow |
| Vinc falling backwards.png | fallBack |
| Vinc falling forwards.png | fallFront |
| Vinc getting up from facedown.png | rise |
| Vinc grappling.png | grapple |
| Vinc jumping off top ropes.png | dive |
| Vinc jumping.png | jump |
| Vinc kicking.png | kick |
| Vinc kneeling.png | kneel |
| Vinc laying facedown and faceup.png | down |
| Vinc lifting overhead.png | lift |
| Vinc pinning.png | pin |
| Vinc running.png | run |
| Vinc taunting.png | taunt, victory |
| Vinc throwing (unique).png | throw |
| Vinc walking with bat.png | carryBat |
| Vinc walking with chair.png | carryChair |
| Vinc walking with guitar.png | carryGuitar |
| Vinc walking with trashcan.png | carryTrashcan |
| Vincenzo standing.png | idle |

### Caleb Konley — 28 sheets

| Source file | Prepared actions |
|---|---|
| CK attack with bat.png | bat |
| CK attack with chair.png | chair |
| CK attack with guitar.png | guitar |
| CK attack with trashcan.png | trashcan |
| CK climb on top rope corner.png | climb |
| CK climb through ropes.png | entry |
| CK dazed.png | hurt |
| CK elbow attack.png | elbow |
| CK falling backwards.png | fallBack |
| CK falling forwards.png | fallFront |
| CK getting up from facedown.png | rise |
| CK grappling.png | grapple |
| CK jumping off corner ropes.png | dive |
| CK jumping.png | jump |
| CK kicking.png | kick |
| CK kneeling.png | defeat |
| CK laying facedown and faceup.png | down |
| CK lifting overhead.png | lift |
| CK pinning.png | pin |
| CK running.png | run |
| CK throwing wrestler.png | throw |
| CK victory.png | taunt, victory |
| CK walking with bat.png | carryBat |
| CK walking with chair.png | carryChair |
| CK walking with guitar.png | carryGuitar |
| CK walking with trashcan.png | carryTrashcan |
| Calabe kneeling.png | kneel |
| Caleb Konley standing.png | idle |

### Sally Boy — 27 sheets

| Source file | Prepared actions |
|---|---|
| SB Attack with bat.png | bat |
| SB attack with trashcan.png | trashcan |
| SB attacking with chair.png | chair |
| SB attacking with guitar.png | guitar |
| SB climb through rope.png | entry |
| SB climbing on top ropes.png | climb |
| SB dazed.png | hurt |
| SB elbow attack.png | elbow |
| SB falling backwards.png | fallBack |
| SB falling forward.png | fallFront |
| SB getting up from facedown.png | rise |
| SB grappling throwing.png | throw |
| SB grappling.png | grapple |
| SB jumping off top corner ropes.png | dive |
| SB jumping.png | jump |
| SB kicking.png | kick |
| SB kneeling.png | kneel |
| SB laying facedown and faceup.png | down |
| SB lifting up overhead.png | lift |
| SB pinning.png | pin |
| SB running.png | run |
| SB taunting.png | taunt, victory |
| SB walking with bat.png | carryBat |
| SB walking with chair.png | carryChair |
| SB walking with guitar.png | carryGuitar |
| SB walking with trashcan.png | carryTrashcan |
| Sally Boy standing.png | idle |

### Big Vito — 29 sheets

| Source file | Prepared actions |
|---|---|
| Big Vito attacking with bat.jpg | bat |
| Big Vito attacking with chair.jpg | chair |
| Big Vito attacking with guitar.jpg | guitar |
| Big Vito attacking with trashcan.jpg | trashcan |
| Big Vito being lifted overhead.jpg | lifted |
| Big Vito being thrown.jpg | thrown |
| Big Vito climbing on ropes.jpg | entry |
| Big Vito climbing on top ropes.jpg | climb |
| Big Vito dazed.jpg | hurt |
| Big Vito defeated pose.jpg | defeat |
| Big Vito falling backwards.jpg | fallBack |
| Big Vito falling farwards.jpg | fallFront |
| Big Vito getting up from facedown.jpg | rise |
| Big Vito jumping off corner.jpg | dive |
| Big Vito jumping.jpg | jump |
| Big Vito laying facedown and faceup.jpg | down |
| Big Vito lifting overhead.jpg | lift |
| Big Vito passed out.jpg | exhausted |
| Big Vito pinning.jpg | pin |
| Big Vito running.jpg | run |
| Big Vito standing.jpg | idle |
| Big Vito taunting.jpg | taunt |
| Big Vito throwing.jpg | throw |
| Big Vito victory pose.jpg | victory |
| Big Vito walking with bat.jpg | carryBat |
| Big Vito walking with chair.jpg | carryChair |
| Big Vito walking with guitar.jpg | carryGuitar |
| Big Vito walking with trashcan.jpg | carryTrashcan |
| Big Vito walking.jpg | walk |

### Bruce Wayans — 28 sheets

| Source file | Prepared actions |
|---|---|
| Bruce Wayans attack with bat.jpg | bat |
| Bruce Wayans attack with chair.jpg | chair |
| Bruce Wayans attack with guitar.jpg | guitar |
| Bruce Wayans attacking with trashcan.jpg | trashcan |
| Bruce Wayans being lifted up overhead.jpg | lifted |
| Bruce Wayans being thrown.jpg | thrown |
| Bruce Wayans climbing on top ropes.jpg | climb |
| Bruce Wayans dazed.jpg | hurt |
| Bruce Wayans defeated pose.jpg | defeat |
| Bruce Wayans falling backwards.jpg | fallBack |
| Bruce Wayans falling forwards.jpg | fallFront |
| Bruce Wayans getting up from facedown.jpg | rise |
| Bruce Wayans jumping off corner ropes.jpg | dive |
| Bruce Wayans jumping.jpg | run |
| Bruce Wayans laying facedown and faceup.jpg | down |
| Bruce Wayans lifting overhead.jpg | lift |
| Bruce Wayans on the ropes.jpg | entry |
| Bruce Wayans passed out.jpg | exhausted |
| Bruce Wayans pinning.jpg | pin |
| Bruce Wayans standing.jpg | idle |
| Bruce Wayans taunting.jpg | taunt |
| Bruce Wayans throwing.jpg | throw |
| Bruce Wayans victory stance.jpg | victory |
| Bruce Wayans walk with bat.jpg | carryBat |
| Bruce Wayans walk with chair.jpg | carryChair |
| Bruce Wayans walk with guitar.jpg | carryGuitar |
| Bruce Wayans walking left and right.jpg | walk |
| Bruce Wayans walking with trashcan.jpg | carryTrashcan |

### Alice Crowley — 29 sheets

| Source file | Prepared actions |
|---|---|
| Alice Crlowley laying faceup and facedown.jpg | down |
| Alice Crlowley walking.jpg | walk |
| Alice Crowley attack with bat.jpg | bat |
| Alice Crowley attack with guitar.jpg | guitar |
| Alice Crowley attacking with chair.jpg | chair |
| Alice Crowley attacking with trashcan.jpg | trashcan |
| Alice Crowley bat.jpg | carryBat |
| Alice Crowley being liefted.jpg | lifted |
| Alice Crowley being thrown.jpg | thrown |
| Alice Crowley climbing on ropes.jpg | entry |
| Alice Crowley climbing on top ropes.jpg | climb |
| Alice Crowley dazed.jpg | hurt |
| Alice Crowley defeated.jpg | defeat |
| Alice Crowley falling backwards.jpg | fallBack |
| Alice Crowley falling farwards.jpg | fallFront |
| Alice Crowley getting up from facedown.jpg | rise |
| Alice Crowley jumping off corner ropes.jpg | dive |
| Alice Crowley jumping.jpg | jump |
| Alice Crowley lifting overhead.jpg | lift |
| Alice Crowley passed out.jpg | exhausted |
| Alice Crowley pinning.jpg | pin |
| Alice Crowley running.jpg | run |
| Alice Crowley standing.jpg | idle |
| Alice Crowley taunting.jpg | taunt |
| Alice Crowley throwing.jpg | throw |
| Alice Crowley victory.jpg | victory |
| Alice Crowley walking with guitar.jpg | carryGuitar |
| Alice Crowley walking with trashcan.jpg | carryTrashcan |
| Alice Crowly walking with chair.jpg | carryChair |

### Ruffo — 31 sheets

| Source file | Prepared actions |
|---|---|
| Ruffo attacking with bat.jpg | bat |
| Ruffo attacking with chair.jpg | chair |
| Ruffo attacking with guitar.jpg | guitar |
| Ruffo attacking with trashcan.jpg | trashcan |
| Ruffo being lifted overhead.jpg | lifted |
| Ruffo being thrown.jpg | thrown |
| Ruffo climbing on corner ropes.jpg | climb |
| Ruffo climbing through ropes.jpg | entry |
| Ruffo climing on ropes.jpg | ropePose |
| Ruffo dazed.jpg | hurt |
| Ruffo defeated pose.jpg | defeat |
| Ruffo falling backwards.jpg | fallBack |
| Ruffo falling forwards.jpg | fallFront |
| Ruffo getting back up from facedown.jpg | rise |
| Ruffo getting up from face up.jpg | riseBack |
| Ruffo grappling and thowing.jpg | throw, grapple |
| Ruffo jumping off corner ropes.jpg | dive |
| Ruffo jumping.jpg | jump |
| Ruffo laying facedown and faceup.jpg | down |
| Ruffo lifting overhead.jpg | lift |
| Ruffo passed out.jpg | ko |
| Ruffo pinning .jpg | pin |
| Ruffo running left and right.jpg | run |
| Ruffo standing.jpg | idle |
| Ruffo taunting.jpg | taunt |
| Ruffo victory stance.jpg | victory |
| Ruffo walking left and right.jpg | walk |
| Ruffo walking with bat.jpg | carryBat |
| Ruffo walking with chair.jpg | carryChair |
| Ruffo walking with guitar.jpg | carryGuitar |
| Ruffo walking with trashcan.jpg | carryTrashcan |


### Kongo Kong — 29 files (28 unique sheets)

Kongo is roster ID 21. He uses his authored elbows, kicks, four weapon attacks, carrying cycles, lifting/throwing, pinning, grappling, taunting/victory, jumps, falls, floor poses, recovery, kneeling, defeat, corner climb, entry, and dive. Running supplies slower unarmed walking. The dazed cycle supplies exhaustion; there is no separate exhausted sheet. A selected opponent uses its own lifted/thrown sheet where available; Kongo's intact idle body rotates when he is the defender because this archive has no dedicated defender sheets.

The top kick row faces right; the bottom run row faces right. The first elbow stance faces left in the source and is mirrored. Down uses the two resting poses, facedown then faceup. The backward fall excludes a final facedown variant. Defeat uses the right-facing kneeling view instead of cycling four directions. All seven corner poses and five entry poses are extracted using Kongo-specific silhouettes; the two clean airborne dive figures exclude the ring.

Bat contact artwork touches the following body, requiring individual outlines. Guitar contact is complete and uses its original five-frame sequence without the shared guitar-prop replacement. Printed hit sparks and the fall sheet header are excluded. The alternate guitar filename is an exact duplicate and adds no gameplay frames.

| Source file | Gameplay use |
| --- | --- |
| KK attack with bat.png | bat |
| KK attack with chair.png | chair |
| KK attack with guitar.png | guitar |
| KK attack with trrashcan.png | trashcan |
| KK climbing on top ropes corner.png | climb |
| KK climbing through ropes.png | entry |
| KK dazed.png | hurt |
| KK defeated.png | defeat |
| KK elbow attack.png | elbow |
| KK falling backwards.png | fallBack |
| KK falling forwards.png | fallFront |
| KK getting up from facedown.png | rise |
| KK grappling.png | grapple |
| KK jumping off top rope.png | dive |
| KK jumping.png | jump |
| KK kicking.png | kick |
| KK laying facedown and faceup.png | down |
| KK lifting up overhead.png | lift |
| KK pinning.png | pin |
| KK running.png | run |
| KK throwing.png | throw |
| KK tuanting.png | taunt, victory |
| KK walk with guitar.png | carryGuitar |
| KK walk with trashcan.png | carryTrashcan |
| KK walking with bat.png | carryBat |
| KK walking with chair.png | carryChair |
| Kongo Kong attack with guitar.png | Duplicate of KK attack with guitar.png |
| Kongo Kong standing.png | idle |
| kk kneeling.png | kneel |


### Father Bronson — 35 sheets

Father Bronson is ID 22. His sheet headings sometimes reverse the direction labels, so facing follows the actual body: stance uses the third figure, walk/run use the right-facing top rows, and the leftward guitar carry is mirrored. Backward falls use separate supplied directional sequences; the opposite-facing source is normalized during preparation and selected by the renderer. Down keeps one resting facedown and one resting faceup pose. Defeat/exhaustion use a side view, not a rotating sequence of four directions.

There is no chair-attack sheet. The prepared chair attack combines his own carrying-chair prop with his lift wind-up and forward throwing body. Guitar contact overlaps the next figure; it uses his intact throw pose and the existing prepared guitar prop. His actual kick is separated from the printed second Bronson; opponents in the match always come from the chosen opponent definition. No separate lifted/thrown defender sprites were supplied, so his own intact body rotates through those states.

The seven-frame corner sheet supplies climbing; the six-frame variant supplies the initial rope-grip pose. Five entry poses are retained. Flying apex and descent supply the dive; the printed ring is removed. The paired grapple sheet, alternate simple backward fall ending facedown, and front-facing guitar carry are reviewed alternatives rather than forced into unrelated actions. The second overhead-lift source supplies clean grapple preparation. The audit explicitly records these three exceptions instead of claiming every illustrated panel is a playable frame.

| Source file | Gameplay use / review |
| --- | --- |
| Father Bronson 4 way stance.png | idle |
| Father Bronson Climbing rops on top.jpg | climb |
| Father Bronson Elbow Attack.png | elbow |
| Father Bronson Grapple.png | Paired, occluded bodies; replaced by intact tie-up preparation from the second lift sheet. |
| Father Bronson Jumping & landing.png | jump |
| Father Bronson Kick.png | kick |
| Father Bronson Lying down-up.png | down |
| Father Bronson Running.png | run |
| Father Bronson Walking.png | walk |
| Father Bronson atk w trashcan.jpg | trashcan |
| Father Bronson atk with bat.jpeg | bat |
| Father Bronson atk with guitar.jpg | guitar |
| Father Bronson climbing ropes.jpg | ropePose |
| Father Bronson dazed.jpg | hurt |
| Father Bronson fall backward.jpg | Alternate backward sequence ends facedown; dedicated directional back-fall sheets provide consistent landings. |
| Father Bronson fall forward.jpeg | fallFront |
| Father Bronson falling left.png | fallBack |
| Father Bronson falling right.jpg | fallBackReverse |
| Father Bronson getting up.jpg | rise |
| Father Bronson lift overhead.jpg | lift |
| Father Bronson lose pose 2.jpg | defeat |
| Father Bronson lose pose.jpg | kneel |
| Father Bronson passed out.jpg | exhausted |
| Father Bronson pinning.jpg | pin |
| Father Bronson taunt.jpg | taunt |
| Father Bronson throwing.png | throw |
| Father Bronson top rope jump.jpg | dive |
| Father Bronson victory.jpg | victory |
| Father Bronson walk left w guitar.jpg | carryGuitar |
| Father Bronson walk w trashcan.jpeg | carryTrashcan |
| Father Bronson walk with bat.jpg | carryBat |
| Father Bronson walk with chair.png | carryChair |
| Father Bronson walking through ropes.jpg | entry |
| Father Bronsons lift overhead 2.jpg | grapple |
| Father Bronsons walk right w guitar.jpg | Alternate front-facing carry; the side-facing left carry is normalized and mirrored for both directions. |

## Hokane — v0.7.2

All 31 sheets in `Hokane Sprite Set.zip` have a mapped use. The first nine original fighters and the preceding fourteen expanded fighters remain unchanged.

- Ten unarmed walking poses are successive frames. The running sheet mixes directions within each labeled row; six actual right-facing frames are selected and mirrored by the renderer as needed.
- Source standing/defeat/rope setup sheets contain viewing directions, not an animation cycle. Use a front portrait and right-facing gameplay poses.
- The source has no separate punch or kick sheet. Unarmed attacks use the intact forward-hand throw pose with the existing contact timing. The overhead throw wind-up is never the light-attack contact.
- Chair, bat, guitar, and trashcan attacks/carries use supplied artwork. Guitar contact is adapted with Hokane’s own throw body and a guitar isolated from the first guitar sheet pose. Crossed bats obscure the last recovery body, so the clean ready pose is reused there.
- Six clean corner-climb frames follow the separate rope setup. The first back-view climb panel is post-occluded and excluded. Five rope entrance poses and two airborne dive poses exclude the printed ring and neighboring bodies.
- The five-frame and six-frame front falls are used for opposing facings. Dedicated back falls, lying poses, recovery, defeat, and passed-out KO art are mapped separately. Raised/lifted and thrown poses depict only Hokane, so any roster opponent can perform the grapple.
- Printed captions, floor lines, large paper holes, and shadows are removed. Source hand/rope occlusion can leave small edge remnants; no original fully occluded body part is invented.
- Supplied finisher name is blank on the website. “Lunacy Finisher” names the existing generic mechanic; no new signature choreography is claimed.

Rebuild: `python tools/prepare_new_assets.py /path/to/extracted/folders hokane`.

| Action | Source sheet | Prepared poses |
| --- | --- | ---: |
| idle | Hokane standing.jpg | 1 |
| walk | Hokane walking.jpg | 10 |
| run | Hokane running.jpg | 6 |
| chair | Hokane attack with chair.jpg | 5 |
| bat | Hokane attack with bat.jpg | 5 |
| guitar | Hokane attack with guitar.jpg | 3 |
| trashcan | Hokane attack with trashcan.jpg | 5 |
| carryChair | Hokane walking with chair.jpg | 5 |
| carryBat | Hokane walk with bat.jpg | 5 |
| carryGuitar | Hokane walk with guitar.jpg | 5 |
| carryTrashcan | Hokane walking with trashcan.jpg | 5 |
| lift | Hokane lifting up overhead.jpg | 5 |
| throw | Hokane throwing.jpg | 5 |
| lifted | Hokane getting lifted overhead.jpg | 5 |
| thrown | Hokane being thrown.jpg | 5 |
| hurt | Hokane dazed.jpg | 4 |
| fallBack | Hokane falling backwards.jpg | 5 |
| fallFront | Hokane falling forwards.jpg | 5 |
| down | Hokane laying facedown and faceup.jpg | 2 |
| rise | Hokane getting up from facedown.jpg | 6 |
| taunt | Hokane taunting.jpg | 5 |
| victory | Hokane victory.jpg | 5 |
| defeat | Hokane defeated.png | 1 |
| jump | Hokane jumping.jpg | 4 |
| pin | Hokane pinning.jpg | 4 |
| climb | Hokane climbing on top ropes.jpg | 6 |
| entry | Hokane climbing through ropes.jpg | 5 |
| dive | Hokane jumping off corner ropes.jpg | 2 |
| propGuitar | Hokane attack with guitar.jpg | 1 |
| ropePose | Hokane climbing on ropes.jpg | 1 |
| ko | Hokane passed out.jpg | 1 |
| fallFrontReverse | Hokane falling forward.jpg | 6 |
