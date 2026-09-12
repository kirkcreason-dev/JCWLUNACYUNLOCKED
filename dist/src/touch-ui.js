import {THROW_BREAK_WINDOW,LEFT,RIGHT} from './engine.js';
// Context is derived from match state; the UI never grants damage or escape progress itself.
export function touchContext(match,localIndex=0){
  const me=match.fighters[localIndex],other=match.fighters[1-localIndex],distance=Math.abs(me.x-other.x);
  const pin=match.pin?.attacker===1-localIndex,down=me.state==='down';
  const beingThrown=match.grapple?.attacker===1-localIndex,breaking=beingThrown&&match.grapple.time<=THROW_BREAK_WINDOW;
  const canPin=other.state==='down'&&distance<125&&!match.grapple&&!match.pin;
  const canClimb=Boolean(me.definition?.animations?.climb)&&(me.x<LEFT+65||me.x>RIGHT-65)&&distance>135&&!match.grapple&&!match.pin;
  const perched=me.state==='perch',climbing=me.state==='climb';
  const escape=match.phase==='fight'&&(pin||down);
  const need=7+Math.round((100-me.hp)*.1);
  let hint='Slide to move · Down to block';
  if(match.phase==='intro')hint='Get ready · Up jumps, down blocks';
  else if(match.phase==='roundEnd')hint=match.options.mode==='practice'?'Practice resets in a moment':'Next round coming up';
  else if(pin)hint=match.pin.kind==='submission'?'Tap ESCAPE to break the hold!':'Tap KICK OUT as fast as you can!';
  else if(down)hint='Tap GET UP to recover sooner';
  else if(breaking)hint='Tap BREAK as the grab starts!';
  else if(beingThrown)hint='Brace for landing · Tap GET UP after the slam';
  else if(match.pin?.attacker===localIndex)hint=match.pin.kind==='submission'?'Submission locked · Keep the pressure on':'Hold the pin · Listen for the three-count';
  else if(canPin)hint='Tap PIN · Hold Down + PIN for a submission';
  else if(perched)hint='Tap an attack to DIVE · Down climbs off';
  else if(climbing)hint='Climbing · Get ready to dive';
  else if(canClimb)hint='Tap CLIMB, then attack to dive';
  else if(me.state==='taunt')hint='Finish the taunt to earn Lunacy';
  else if(me.meter>=100)hint=distance<157?'Your finisher is ready!':'Finisher ready · Move closer';
  else if(distance>150)hint='Move closer to land your attacks';
  return {escape,escapeLabel:pin?(match.pin.kind==='submission'?'ESCAPE':'KICK OUT'):'GET UP',escapeProgress:pin?Math.min(1,match.pin.escape/need):0,
    grabLabel:breaking?'BREAK':canPin?'PIN':perched?'DIVE':canClimb?'CLIMB':'GRAB',grabDetail:breaking?'TAP NOW':canPin?'3 COUNT':perched?'TOP ROPE':canClimb?'TOP ROPE':distance<106?'THROW':'GET CLOSE',
    weapon:(me.weapon||'chair').toUpperCase(),heavy:perched?'DIVE':me.weapon==='none'?(me.definition?.animations?.kick?'KICK':'STRIKE'):(me.weapon||'chair').toUpperCase(),ready:me.meter>=100,meter:Math.floor(me.meter),hint};
}
