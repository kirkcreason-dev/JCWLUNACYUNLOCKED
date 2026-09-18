// These are synthetic game voice palettes, not recordings of the wrestlers.
const HIGHER_VOICES=new Set(['mickie-knuckles','dani-mo','j-rod','alice-crowley','ring-rat']);
export const gruntGroup=id=>HIGHER_VOICES.has(id)?'female_oof_synthetic':'male_oof_synthetic';
export function impactGroup(event,match){
  const attacker=match?.fighters?.[event.attacker],style=event.style||attacker?.attackStyle;
  if(event.move==='special'&&(event.fighter||attacker?.definition?.id)==='dj-clay')return null;
  if(event.move==='light')return 'punch_hit';
  if(style==='kick')return 'kick_hit';
  const weapon=['chair','bat','guitar','trashcan','bottle'].includes(style)?style:['bat','guitar','trashcan','bottle'].includes(event.move)?event.move:null;
  // No bottle recording was supplied; the short bat impact is the closest pack sound.
  return weapon?({chair:'chair_hit',bat:'bat_hit',guitar:'guitar_smash',trashcan:'trashcan_hit',bottle:'bat_hit'})[weapon]:'punch_hit';
}
