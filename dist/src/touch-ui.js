import {throwBreakWindow,onTopRope,canCornerThrow,weaponRemaining,POLE_RETRIEVE_TIME,LEFT,RIGHT,canPin as pinInRange,nearRopes,escapeTarget} from './engine.js?v=0.21.0';
// Context is derived from match state; the UI never grants damage or escape progress itself.
export function touchContext(match,localIndex=0){
  const me=match.fighters[localIndex],other=match.fighters[1-localIndex],distance=Math.abs(me.x-other.x);
  const pin=match.pin?.attacker===1-localIndex,down=me.state==='down';
  const beingThrown=match.grapple?.attacker===1-localIndex,breaking=beingThrown&&match.grapple.time<=throwBreakWindow(match.grapple);
  const canPin=me.z===0&&pinInRange(me,other)&&!match.grapple&&!match.pin;
  const holding=match.pin?.attacker===localIndex;
  const canClimb=Boolean(me.definition?.animations?.climb)&&(me.x<LEFT+65||me.x>RIGHT-65)&&distance>135&&!match.grapple&&!match.pin;
  const perched=onTopRope(me),climbing=me.state==='climb',cornerThrow=canCornerThrow(me,other)&&!match.grapple&&!match.pin;
  const retrieve=me.state==='perch'&&match.pole&&!match.pole.claimed&&Math.abs(me.x-match.pole.x)<40;
  const pickUp=match.pole?.looseX!=null&&Math.abs(me.x-match.pole.looseX)<80;
  const escape=match.phase==='fight'&&(pin||down);
  const need=escapeTarget(me.hp);
  let hint='Slide to move · Down to block';
  if(match.phase==='intro')hint='Get ready · Up jumps, down blocks';
  else if(match.phase==='roundEnd')hint=match.options.mode==='practice'?'Practice resets in a moment':'Next round coming up';
  else if(pin)hint=match.pin.kind==='submission'?'Tap ESCAPE to break the hold!':'Tap KICK OUT as fast as you can!';
  else if(down)hint='Tap GET UP to recover sooner';
  else if(breaking)hint='Tap BREAK as the grab starts!';
  else if(beingThrown)hint='Brace for landing · Tap GET UP after the slam';
  else if(holding)hint=nearRopes(other)?'Too close to the ropes · Rope break':match.pin.kind==='submission'?'Submission locked · Tap RELEASE to let go':'Hold the pin · Tap RELEASE to let go';
  else if(canPin)hint=nearRopes(other)?'Near the ropes · A pin here will break':'Tap PIN · Hold Down + PIN for a submission';
  else if(cornerThrow)hint='Tap SUPERPLEX to throw from the top rope!';
  else if(retrieve)hint='Hold CLAIM to take the chair · Down climbs off';
  else if(me.state==='ropeTaunt')hint='Top-rope taunt · Stay safe to earn 20 Lunacy';
  else if(perched)hint='TAUNT earns 20 · Attack dives · Down climbs off';
  else if(climbing)hint='Climbing · Get ready to dive';
  else if(canClimb)hint='Tap CLIMB, then attack to dive';
  else if(me.state==='taunt')hint='Finish the taunt to earn Lunacy';
  else if(me.move==='light'&&me.confirmed&&me.chain<2)hint=me.chain===0?'Hit landed · Tap HIT or HEAVY to link':'Two hits · Tap HEAVY to finish the chain';
  else if(me.z>0)hint='Tap HEAVY for an air strike';
  else if(me.state==='block')hint='Hold Down + HEAVY for a guard counter';
  else if(me.meter>=100)hint=distance<157?'Your finisher is ready!':'Finisher ready · Move closer';
  else if(me.state==='run'&&me.walkDirection===me.facing)hint='Tap HEAVY while running to close the gap';
  else if(distance<=175&&!me.move&&['idle','walk','block'].includes(me.state)&&me.reversalCooldown===0&&me.guard>=20)hint='Press Down just before a strike to REVERSE';
  else if(pickUp)hint='Tap WEAPON to pick up the dropped chair';
  else if(match.pole&&!match.pole.claimed)hint=`Chair on the ${match.pole.x<640?'left':'right'} pole · CLIMB, then hold CLAIM`;
  else if(distance>150)hint='Move closer to land your attacks';
  return {escape,escapeLabel:pin?(match.pin.kind==='submission'?'ESCAPE':'KICK OUT'):'GET UP',escapeProgress:pin?Math.min(1,match.pin.escape/need):0,
    grabLabel:holding?'RELEASE':breaking?'BREAK':canPin?'PIN':cornerThrow?'SUPERPLEX':retrieve?'CLAIM':perched?'DIVE':canClimb?'CLIMB':'GRAB',grabDetail:holding?'LET GO':breaking?'TAP NOW':canPin?'3 COUNT':cornerThrow?'EXTRA DAMAGE':retrieve?`${Math.floor(match.pole.progress/POLE_RETRIEVE_TIME*100)}% · HOLD`:perched?'TOP ROPE':canClimb?'TOP ROPE':distance<106?'THROW':'GET CLOSE',
    weapon:(me.weapon||'chair').toUpperCase(),weaponDetail:pickUp?'PICK UP CHAIR':me.weapon==='none'?(match.pole&&!match.pole.claimed?'CLIMB FOR CHAIR':'BARE HANDS'):`${me.weapon.toUpperCase()} · ${weaponRemaining(me)} HITS`,heavy:perched?'DIVE':me.z>0?'AIR STRIKE':me.state==='block'?'COUNTER':me.weapon==='none'?(me.definition?.animations?.kick?'KICK':'STRIKE'):(me.weapon||'chair').toUpperCase(),ready:me.meter>=100,meter:Math.floor(me.meter),hint};
}
