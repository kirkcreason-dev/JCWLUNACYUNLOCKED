# Website ratings

Source: [JCW Lunacy roster](https://jcwlunacy.net/), retrieved **September 13, 2026**. The site's `STATS` table supplies four ratings out of 10 in this order: **Power, Speed, Technique, Toughness**, followed by an optional finisher. The game's dated snapshot is `dist/assets/website-stats.json`; it requires no live website connection while playing.

The following values are copied from that table. The game's existing display names remain stable. Able matches the site's “Abel”; Moshpit Mike matches “Mosh Pit Mike”; Ruffo and Yabo match their “the Clown” entries. Violent J has no entry in that table, so the UI labels his ratings as unlisted and preserves his previous balance. No website values are invented for him.

| Wrestler | Power | Speed | Technique | Toughness | Site finisher |
| --- | ---: | ---: | ---: | ---: | --- |
| Violent J | — | — | — | — | Not listed |
| 2 Tuff Tony | 8 | 5 | 6 | 10 | The Meteorite |
| Willie Mack | 7 | 7 | 9 | 8 | Stunner |
| Mickie Knuckles | 8 | 5 | 6 | 9 | Not listed |
| Kerry Morton | 7 | 8 | 10 | 7 | Kiss It Goodbye |
| Mr. Happy | 10 | 4 | 6 | 8 | Not listed |
| Moshpit Mike | 6 | 6 | 7 | 8 | Snapmare Powerbomb |
| Cokane | 7 | 8 | 10 | 7 | Coke Slam |
| Yabo | 7 | 8 | 7 | 8 | Not listed |
| Able | 7 | 6 | 7 | 8 | As Above So Below (Tag) |
| Dani Mo | 6 | 8 | 8 | 8 | Moon Mist Twist |
| Facade | 5 | 10 | 8 | 7 | Not listed |
| J-Rod | 9 | 6 | 7 | 8 | Not listed |
| Matt Cross | 6 | 10 | 9 | 6 | Shooting Star Press |
| Vincenzo | 8 | 5 | 6 | 7 | Not listed |
| Caleb Konley | 7 | 8 | 9 | 8 | Burning Hammer |
| Sally Boy | 7 | 8 | 5 | 7 | Hook Kick |
| Big Vito | 9 | 5 | 6 | 10 | Implant DDT |
| Bruce Wayans | 9 | 5 | 7 | 8 | Sucka Busta (Tag) |
| Alice Crowley | 8 | 6 | 8 | 9 | Uni-Lariat |
| Ruffo | 8 | 7 | 7 | 8 | Not listed |
| Kongo Kong | 10 | 5 | 7 | 9 | Not listed |
| Father Bronson | 8 | 6 | 7 | 8 | The Red Bloom |
| Hokane | 8 | 6 | 6 | 8 | Not listed |

## Gameplay conversion

The website does not define this game's physics. Each listed rating is converted to a multiplier using **0.70 + 0.05 × rating**. A 5 gives 0.95×; a 10 gives 1.20×. Selection still displays the actual /10 value.

- Power multiplies outgoing strike, weapon, finisher, dive, and throw damage.
- Speed multiplies walking, running, and horizontal dive movement.
- Technique additionally multiplies grapple-throw damage.
- Toughness divides incoming attack, dive, and throw damage.

For example, Kongo's 10 / 5 / 7 / 9 gives multipliers 1.20 / 0.95 / 1.05 / 1.15. Technique does not alter pin/submission escape inputs, and the four ratings do not change animation contact timing.

Listed finishers replace the old invented labels. An empty site field uses the generic “Lunacy Finisher.” Site names marked “(Tag)” are retained as labels; this is a two-fighter game, and those labels do not add tag partners or unique signature choreography.

To reapply the reviewed snapshot after an asset-only edit, run `python3 tools/apply_website_stats.py`. The expanded-roster preparation script also reapplies it automatically. Both online clients must use v0.7.2 so their roster and damage rules match.


## September 16, 2026 additions

From https://jcwlunacy.net/: Atiba 6/8/8/7 (Sucka Busta (Tag)); JP Grayson and Tommy Grayson 5/9/8/7 (T-Gimmick (Tag)); Jacksyn 6/7/7/8 (As Above So Below (Tag)). Order: power/speed/technique/toughness. Shaggy 2 Dope has no listed ratings in the retrieved data; game balance values are not presented as website ratings. Tag finisher names are labels; this release retains singles gameplay.


## September 17, 2026 additions

The JCW site's published data lists Shane Mercer at power 10, speed 6, technique 7 and toughness 8, with “MoonSault and Battery.” Source: https://jcwlunacy.net/ (retrieved September 17, 2026). DJ Clay and Jeff Lane have no listed ratings in that data; their game balance values remain separate. “Bass Blast” comes from the supplied DJ Clay sprite pack, not a website rating or finisher listing.
