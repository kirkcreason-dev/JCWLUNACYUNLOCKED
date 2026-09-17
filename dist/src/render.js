import {FLOOR,LEFT,RIGHT,THROW_BREAK_WINDOW,escapeTarget,MOVEMENT_PACE} from './engine.js?v=0.16.0';
import {ARENAS} from './arenas.js?v=0.16.0';
import {attackPose} from './attack-animation.js?v=0.16.0';
import {phoneCamera} from './phone-layout.js?v=0.16.0';
import {drawArenaWordmarks} from './branding.js?v=0.16.0';
const fit=(n,min,max)=>Math.max(min,Math.min(max,n));
export class Renderer {
  constructor(canvas,roster,atlases,arenas,banners={},combatFx={},options={}){
    this.bannerArt=banners;this.combatFx=combatFx;this.canvas=canvas;this.onContextLost=options.onContextLost||(()=>{});
    // Present complete frames. Desynchronized drawing can expose the clear or
    // partly painted HUD while the browser scans out the canvas.
    this.ctx=canvas.getContext?.('2d',{alpha:false,desynchronized:false})||canvas.getContext?.('2d');
    if(!this.ctx)throw new Error('2D canvas unavailable');
    this.contextLost=false;this.shade=null;this.shadeHeight=0;
    canvas.addEventListener?.('contextlost',event=>{event.preventDefault?.();this.contextLost=true;this.onContextLost();});
    canvas.addEventListener?.('contextrestored',()=>{this.contextLost=false;this.shade=null;this.reset();});
    this.roster=roster;this.atlases=atlases;this.arenas=arenas;this.reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;this.scheme='keyboard';this.reset();
  }
  reset(){this.particles=[];this.popups=[];this.spriteFx=[];this.healthTrail=[100,100];this.healthWait=[0,0];this.lastHealth=[100,100];this.lastMeter=[0,0];this.shakeOffset=[0,0];this.clock=0;this.graphic=null;}
  receive(events,match=null){for(const e of events){
    this.combatEffect(e,match);
    if(['hit','slam','block'].includes(e.type)){
      const color=e.type==='block'?'#7bd6ff':e.type==='slam'?'#fa258c':'#c1ff32';const y=e.type==='slam'?FLOOR-10:FLOOR-135-(e.z||0);
      if(!this.reduced)for(let i=0;i<(this.lowPower?6:14);i++){const a=Math.random()*Math.PI*2,s=50+Math.random()*300;this.particles.push({x:e.x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.20+Math.random()*.24,max:.45,color,size:2+Math.random()*5});}
      const particleCap=this.lowPower?48:128;
      if(this.particles.length>particleCap)this.particles.splice(0,this.particles.length-particleCap);
      if(e.type==='hit'&&e.combo>1){
        this.popups=this.popups.filter(p=>p.kind!=='combo'||p.attacker!==e.attacker);
        this.popups.push({kind:'combo',attacker:e.attacker,text:`${e.combo} HIT`,x:e.x,y:y-90,life:.65,color:'#c1ff32'});
      }
      else if(e.type==='hit'&&e.counter)this.popups.push({text:'COUNTER',x:e.x,y:y-90,life:.65,color:'#ffe197'});
      else if(e.type==='hit'&&e.running)this.popups.push({text:'RUNNING HIT',x:e.x,y:y-90,life:.65,color:'#c1ff32'});
    }
    if(e.type==='special'){this.graphic={key:'lunacy',life:.8};if(e.name)this.popups.push({text:e.name,x:640,y:245,life:1,color:'#b0ff20'});}
    if(e.type==='round')this.reset();
    if(e.type==='ropeRebound')this.popups.push({text:'REBOUND',x:e.x<640?300:980,y:445,life:.4,color:'#b0ff20'});
    if(e.type==='throwBreak')this.popups.push({text:'THROW BREAK',x:640,y:300,life:.9,color:'#8ee7ff'});
    if(e.type==='notReady')this.popups.push({text:'BUILD YOUR LUNACY METER',x:640,y:225,life:.7,color:'#e8dfea'});
    if(e.type==='kickout')this.graphic={key:'kickout',life:1};
    if(e.type==='holdBreak')this.popups.push({text:'HOLD ESCAPED',x:640,y:320,life:1,color:'#8ee7ff'});
    if(e.type==='ropeBreak')this.popups.push({text:'ROPE BREAK',x:640,y:320,life:1,color:'#8ee7ff'});
    if(e.type==='pinRelease')this.popups.push({text:'HOLD RELEASED',x:640,y:320,life:.7,color:'#e8dfea'});
    if(e.type==='weapon')this.popups.push({text:e.name==='none'?'BARE HANDS':e.name.toUpperCase(),x:640,y:300,life:.7,color:'#ffe197'});
    if(e.type==='weaponBreak')this.popups.push({text:'GUITAR BROKEN',x:640,y:300,life:.8,color:'#ffe197'});
    if(e.type==='taunt')this.popups.push({text:'+12 LUNACY',x:640,y:300,life:.8,color:'#b0ff20'});
    if(e.type==='guardBreak')this.popups.push({text:'GUARD BREAK',x:640,y:340,life:.85,color:'#fa2484'});
    if(e.type==='reversal')this.popups.push({screen:true,art:'reversal',label:`P${e.index+1} · +12 LUNACY`,text:`P${e.index+1} · REVERSAL! +12 LUNACY`,life:.9,color:'#8ee7ff'});
    if(e.type==='secondWind')this.popups.push({screen:true,art:'secondWind',label:`P${e.index+1} · +25 LUNACY`,text:`P${e.index+1} · SECOND WIND! +25 LUNACY`,life:1.25,color:'#ffe197'});
    // A disconnected peer or a very long arcade session must not turn event
    // bursts into an ever-growing presentation queue.
    if(this.popups.length>48)this.popups.splice(0,this.popups.length-48);
  }}
  text(text,x,y,size=24,color='#f5f0e6',align='left',italic=false){const c=this.ctx;c.font=`${italic?'italic ':''}900 ${size}px Arial, sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(text,x,y);}
  hudShade(height){
    if(this.shade&&this.shadeHeight===height)return this.shade;
    const shade=this.ctx.createLinearGradient(0,0,0,210);shade.addColorStop(0,'#08060cf5');shade.addColorStop(.65,'#08060caa');shade.addColorStop(1,'#08060c00');
    this.shade=shade;this.shadeHeight=height;return shade;
  }
  draw(match,arena=0,dt=1/60,menu=false){
    if(this.contextLost||!this.ctx)return false;
    const c=this.ctx,height=this.portrait?960:720;
    c.save();c.scale((this.canvas.width||1280)/1280,(this.canvas.height||height)/height);
    // An opaque repaint replaces the old frame without a cleared intermediate.
    c.save();c.fillStyle='#130b18';c.fillRect(0,0,1280,height);
    const bg=this.arenas[arena]||this.arenas[0];
    if(this.portrait&&bg){c.drawImage(bg,0,0,1280,height);drawArenaWordmarks(c,bg,arena,this.bannerArt.unlocked,1280,height);}
    if((this.portrait||this.compact)&&match&&!menu){const camera=phoneCamera(match.fighters,{portrait:this.portrait,floor:FLOOR});c.translate(camera.x,camera.y);c.scale(camera.zoom,camera.zoom);}
    this.clock+=dt;
    if(dt>0){const shake=!this.reduced&&!menu?Math.min(match?.shake||0,this.lowPower?4:8):0;this.shakeOffset=shake?[(Math.random()-.5)*shake,(Math.random()-.5)*shake*.55]:[0,0];}
    c.translate(...this.shakeOffset);
    if(bg){const crop=ARENAS[arena]?.crop;if(crop)c.drawImage(bg,...crop,0,0,1280,720);else{c.drawImage(bg,0,0,1280,720);drawArenaWordmarks(c,bg,arena,this.bannerArt.unlocked);}}
    if(match&&!menu){
      // Downed opponent is below the attacker during a pin; neither sheet contains an extra wrestler.
      if(match.fighters.some(f=>f.definition.animations.climb))this.corners();
      const order=match.pin?[1-match.pin.attacker,match.pin.attacker]:match.grapple?[match.grapple.attacker,1-match.grapple.attacker]:match.fighters[0].move&&!match.fighters[1].move?[1,0]:[0,1];
      for(const i of order)this.fighter(match.fighters[i],i,match);
      this.effects(dt);c.restore();c.save();
      // Shade is created in screen coordinates, independent of the phone camera.
      c.fillStyle=this.hudShade(height);c.fillRect(0,0,1280,210);
      this.hud(match,arena,dt);this.combatNotices(match);this.banners(match);this.announcements(dt);
    }
    c.restore();c.restore();
  }
  combatNotices(match){
    if(match.phase!=='fight'||match.pin||match.grapple)return;
    let notice;for(let i=this.popups.length-1;i>=0;i--)if(this.popups[i].screen){notice=this.popups[i];break;}if(!notice)return;
    // Screen coordinates keep the cue clear of every phone camera and HUD rail.
    const c=this.ctx,phone=this.portrait||this.compact,y=phone?250:185;
    const art=this.bannerArt[notice.art];
    if(art){
      // Draw the supplied artwork unchanged, framing its lettering in the HUD gap.
      // Screen blending suppresses the black backdrop without editing source pixels.
      const sy=art.height*.18,sh=art.height*.64,width=phone?520:460,height=width*sh/art.width,top=phone?224:151;
      c.save();c.globalAlpha=fit(notice.life*3,0,1);
      c.fillStyle='#100a19eb';c.fillRect(640-width/2-14,top-3,width+28,height+34);
      c.globalCompositeOperation='screen';
      c.drawImage(art,0,sy,art.width,sh,640-width/2,top,width,height);c.restore();
      c.save();c.globalAlpha=fit(notice.life*3,0,1);this.text(notice.label,640,top+height+22,phone?25:21,notice.color,'center',true);c.restore();return;
    }
    c.save();c.globalAlpha=fit(notice.life*3,0,1);c.fillStyle='#100a19ed';c.fillRect(200,y-34,880,49);
    this.text(notice.text,640,y,phone?36:25,notice.color,'center',true);c.restore();
  }
  fighter(f,index,match){
    const c=this.ctx,def=f.definition,atlas=this.atlases[f.id],animations=def.animations;
    if(!atlas)return;
    let anim='idle',progress=null,rotation=0,offsetX=0,offsetY=0,scaleX=1,scaleY=1,centered=false,attackFrame=null,propGuitar=false;
    switch(f.state){
      case 'walk':anim='walk';break;
      case 'run':anim='run';break;
      case 'equip':anim='idle';break;
      case 'taunt':anim='taunt';progress=fit(f.t,0,.999);break;
      case 'climb':anim=animations.ropePose&&f.t<.12?'ropePose':'climb';progress=fit((f.t-(animations.ropePose?.12:0))/(animations.ropePose?.68:.8),0,.999);break;
      case 'perch':anim='climb';progress=.999;break;
      case 'dive':anim='dive';progress=f.t<.18?0:.999;centered=true;break;
      case 'jump':anim='jump';progress=def.edition?(f.vz>300?.28:f.vz>-300?.55:.88):.5;break;
      case 'block':anim=animations.grapple?'grapple':'lift';progress=0;scaleX=.98;break;
      case 'light':case 'heavy':case 'special':{
        const pose=attackPose(def,f.move||f.state,f.t,f.attackStyle);attackFrame=pose.frame;offsetX=pose.offsetX;propGuitar=pose.propGuitar;break;
      }
      case 'hurt':if(!this.reduced&&f.t<.10){scaleX=1.035;scaleY=.97;offsetX=-5;}anim=f.exhausted&&animations.exhausted?'exhausted':'hurt';break;
      case 'down':{
        const fall=f.fallFace==='front'?'fallFront':'fallBack';
        if(animations[fall]&&f.t<(f.fallDuration||0)){anim=fall;progress=fit(f.t/f.fallDuration,0,.999);}
        else{anim=f.hp===0&&animations.ko?'ko':'down';progress=f.fallFace==='front'?0:.999;}break;
      }
      case 'pinned':anim='down';progress=.999;break;
      case 'rise':anim=f.fallFace==='back'&&animations.riseBack?'riseBack':'rise';progress=fit(f.t/.5,0,.999);break;
      case 'grapple':{const t=match.grapple?.time||0;anim=t<.22&&animations.grapple?'grapple':'lift';progress=fit(t/.84,0,.999);break;}
      case 'grabbed':anim='hurt';progress=0;break;
      case 'lifted':centered=true;if(animations.lifted){anim='lifted';progress=fit(((match.grapple?.time||.84)-.32)/.52,0,.999);}else{anim='idle';progress=0;rotation=-Math.PI/2*fit(((match.grapple?.time||.84)-.32)/.42,0,1);}break;
      case 'thrown':centered=true;if(animations.thrown){anim='thrown';progress=.55;}else{anim='idle';progress=0;rotation=-Math.PI/2+Math.sin(f.t*5)*.13;}break;
      case 'throw':anim='throw';progress=.6+fit(f.t/.5,0,.999)*.399;break;
      case 'pin':anim='pin';progress=match.pin?.kind==='submission'?.6:Math.min(.999,fit(f.t/.24,0,1));break;
      case 'defeat':anim=animations.defeat?'defeat':'rise';progress=animations.defeat?.999:.35;break;
      case 'victory':anim='victory';progress=def.edition?fit(f.t/1.5,0,.999):null;break;
    }
    if(['idle','walk','run','equip'].includes(f.state)&&f.weapon&&f.weapon!=='none'){
      const carry='carry'+f.weapon[0].toUpperCase()+f.weapon.slice(1);if(animations[carry]){anim=carry;progress=['idle','equip'].includes(f.state)?0:null;}
    }
    if(match.phase==='intro'&&animations.entry&&match.phaseTime<1.3){
      anim=match.phaseTime<.75?'entry':'walk';progress=match.phaseTime<.75?fit(match.phaseTime/.75,0,.999):null;
      offsetX=-150*(1-fit(match.phaseTime/1.3,0,1));
    }
    if(match.phase==='roundEnd'&&f.state==='down'&&animations.kneel&&f.hp>0&&match.phaseTime>1.5){anim='kneel';progress=fit((match.phaseTime-1.5)/.8,0,.999);}
    if(f.facing===-1&&animations[anim+'Reverse'])anim+='Reverse';
    const fs=animations[anim]?.length?animations[anim]:animations.idle;
    let fi=progress===null?Math.floor(f.t*(anim.startsWith('run')?13*f.definition.speed*MOVEMENT_PACE:anim.startsWith('walk')||anim.startsWith('carry')?10*f.definition.speed*MOVEMENT_PACE:anim==='hurt'?7:4))%fs.length:Math.min(fs.length-1,Math.floor(progress*fs.length));
    if((anim==='walk'||anim==='run'||anim.startsWith('carry'))&&f.walkDirection*f.facing<0)fi=fs.length-1-fi;
    const entry=attackFrame||fs[fi];
    if(!entry)return;
    if(f.state==='idle'&&!this.reduced){const breath=Math.sin(f.t*3.4+index)*.005;scaleY=1+breath;scaleX=1-breath*.4;}
    // Shadows anchor feet to the canvas floor, independently of animation crop bounds.
    c.save();c.globalAlpha=.35*(1-fit(f.z/400,0,.8));c.fillStyle='#050305';c.beginPath();c.ellipse(f.x,FLOOR+3,f.state==='down'||f.state==='pinned'?88:45,10,0,0,Math.PI*2);c.fill();c.restore();
    c.save();c.translate(f.x+offsetX*f.facing,FLOOR-f.z+offsetY);c.scale(f.facing*scaleX,scaleY);c.rotate(rotation);
    if(entry.flipX)c.scale(-1,1);
    if(entry.drawScale)c.scale(entry.drawScale,entry.drawScale);
    if(f.state==='special'&&!this.reduced&&!this.lowPower){c.shadowColor=def.color;c.shadowBlur=30;}
    if(f.invincible>0&&Math.floor(f.invincible*18)%2)c.globalAlpha=.65;
    c.drawImage(atlas,entry.x,entry.y,entry.w,entry.h,centered?-entry.w/2:-(entry.anchorX??entry.w/2),centered?-entry.h/2:-(entry.anchorY??entry.h),entry.w,entry.h);
    if(propGuitar){
      const prop=animations.propGuitar[0];
      c.save();c.translate(entry.w-entry.anchorX-(def.guitarGrip?.xFromRight??19),-entry.h*(def.guitarGrip?.height??(def.id==='vincenzo'?.80:.62)));c.rotate(-Math.PI/2);
      c.drawImage(atlas,prop.x,prop.y,prop.w,prop.h,-prop.w*.5,-20,prop.w,prop.h);c.restore();
    }
    c.restore();
    if(f.state==='block'){
      c.save();c.strokeStyle=f.guard<25?'#ff5072':'#85dfff';c.lineWidth=3;c.globalAlpha=.6;c.beginPath();c.ellipse(f.x+f.facing*45,FLOOR-118,24,90,0,-Math.PI/2,Math.PI/2,f.facing<0);c.stroke();c.restore();
    }
    if(match.phase==='intro'){this.text(index?'P2':'P1',f.x,FLOOR+28,18,index?'#fa6daf':'#b0ff20','center');}
  }
  corners(){
    const c=this.ctx;c.save();
    for(const x of [LEFT+18,RIGHT-18]){
      c.strokeStyle='#342539';c.lineWidth=10;c.beginPath();c.moveTo(x,FLOOR+8);c.lineTo(x,FLOOR-147);c.stroke();
      for(const h of [47,94,140]){c.fillStyle='#17121c';c.fillRect(x-19,FLOOR-h,38,10);c.fillStyle='#b0ff2080';c.fillRect(x-16,FLOOR-h,32,2);}
    }c.restore();
  }
  hud(m,arena,dt=1/60){
    const c=this.ctx,[a,b]=m.fighters;
    if(this.portrait||this.compact){this.phoneHud(m,arena);return;}
    // Opaque, stationary rails prevent bright scenery flickering through them.
    c.fillStyle='#100d17';c.fillRect(0,0,1280,142);c.fillRect(0,660,1280,60);
    for(let i=0;i<2;i++){
      const f=i?b:a,x=i?738:44,w=498,color=i?'#fa268b':'#b0ff20';
      if(f.hp<this.lastHealth[i])this.healthWait[i]=.3;
      this.lastHealth[i]=f.hp;this.healthWait[i]=Math.max(0,this.healthWait[i]-dt);
      if(this.healthWait[i]===0)this.healthTrail[i]=Math.max(f.hp,this.healthTrail[i]-dt*55);
      if(f.hp>this.healthTrail[i])this.healthTrail[i]=f.hp;
      if(f.meter>=100&&this.lastMeter[i]<100)this.popups.push({text:`P${i+1} FINISHER READY`,x:i?990:290,y:170,life:1.2,color});
      this.lastMeter[i]=f.meter;
      c.fillStyle='#100d17ed';c.fillRect(x-10,22,w+20,109);
      this.text(f.definition.name.toUpperCase(),i?x+w:x,47,24,'#fff2e7',i?'right':'left',true);
      this.text(m.options.mode==='online'?`${i===(this.localIndex||0)?'YOU':'ONLINE'} · P${i+1}`:i?(m.options.mode==='local'?'PLAYER 2':'CPU'):'PLAYER 1',i?x:x+w,44,12,color,i?'left':'right');
      c.fillStyle='#3f2034';c.fillRect(x,59,w,22);c.fillStyle='#ffe6cc';const trail=w*this.healthTrail[i]/100;c.fillRect(i?x+w-trail:x,59,trail,22);c.fillStyle=color;const hp=w*f.hp/100;c.fillRect(i?x+w-hp:x,59,hp,22);
      c.fillStyle='#fff5';c.fillRect(i?x+w-hp:x,59,hp,3);
      c.fillStyle='#fff1';c.fillRect(x,87,w,3);c.fillStyle='#bceaff';const guard=w*f.guard/100;c.fillRect(i?x+w-guard:x,87,guard,3);
      c.fillStyle='#ffffff16';c.fillRect(x,101,w-143,8);c.fillStyle=f.meter>=100?'#fff8e3':color;c.fillRect(i?x+(w-143)*(1-f.meter/100):x,101,(w-143)*f.meter/100,8);
      this.text(f.meter>=100?'FINISHER READY':'LUNACY',x+w,111,14,f.meter>=100?'#f4f4d8':'#c3b5ca','right');
      for(let n=0;n<2;n++){c.fillStyle=m.wins[i]>n?color:'#ffffff22';c.beginPath();c.arc(i?x+w-n*19:x+n*19,124,5,0,Math.PI*2);c.fill();}
    }
    c.fillStyle='#100a19f5';c.fillRect(558,15,164,103);c.strokeStyle='#fff3';c.strokeRect(558,15,164,103);
    this.text(m.options.mode==='practice'?'∞':String(Math.ceil(m.remaining)).padStart(2,'0'),640,77,57,m.remaining<15?'#ff5671':'#f6f1e3','center',true);
    this.text(m.options.mode==='practice'?'PRACTICE':`ROUND ${m.round}`,640,102,13,'#b0ff20','center');
    c.fillStyle='#0c0716dd';c.fillRect(38,666,1204,31);this.text(ARENAS[arena]?.name||'',54,687,12,'#d4c5dd');
    const help=this.coachText|| (this.scheme==='gamepad'?'X STRIKE  /  Y HEAVY  /  B GRAPPLE  /  RB FINISHER':this.scheme==='touch'?'HIT  /  HEAVY  /  GRAB TO THROW OR PIN  /  FINISH':'← → MOVE  /  ↑ JUMP  /  ↓ BLOCK  /  Z HIT  /  X HEAVY  /  C GRAB  /  V FINISH');
    this.text(m.pin?(this.scheme==='touch'&&m.pin.attacker===1-(this.localIndex||0)?'TAP KICK OUT REPEATEDLY':`P${2-m.pin.attacker}: ALTERNATE STRIKE + HEAVY TO ESCAPE`):help,640,687,12,m.pin?'#b0ff20':'#d4c5dd','center');
    this.text(m.options.mode==='championship'?m.options.championshipLabel:m.options.mode==='arcade'?`ARCADE · ${(m.options.arcadeIndex||0)+1} / ${m.roster.length-1}`:m.options.mode==='practice'?'PRACTICE':'BEST OF 3',1224,687,12,'#d4c5dd','right');
    if(m.pin){
      const p=m.pin,b=m.fighters[1-p.attacker],need=escapeTarget(b.hp);
      c.fillStyle='#0e0819e8';c.fillRect(460,180,360,72);this.text(p.kind==='submission'?'SUBMISSION':`PIN COUNT  ${p.count||'—'}`,640,209,24,'#fff7e4','center',true);c.fillStyle='#39213f';c.fillRect(488,225,304,8);c.fillStyle='#b0ff20';c.fillRect(488,225,304*fit(p.escape/need,0,1),8);
    }
  }
  phoneHud(m,arena){
    const c=this.ctx;
    c.fillStyle='#100a19';c.fillRect(0,0,1280,204);
    for(let i=0;i<2;i++){
      const f=m.fighters[i],x=i?758:30,w=492,color=i?'#fa268b':'#b0ff20';
      const name=f.definition.name.toUpperCase();
      if(this.compact){const words=name.split(' '),last=words.length>1?words.pop():'';this.text(words.join(' '),i?x+w:x,46,46,'#fff2e7',i?'right':'left',true);this.text(last,i?x+w:x,89,46,'#fff2e7',i?'right':'left',true);}
      else this.text(name,i?x+w:x,51,name.length>14?34:40,'#fff2e7',i?'right':'left',true);
      const healthY=this.compact?104:73,guardY=this.compact?139:115,meterY=this.compact?155:138;
      c.fillStyle='#412136';c.fillRect(x,healthY,w,30);c.fillStyle=color;c.fillRect(i?x+w*(1-f.hp/100):x,healthY,w*f.hp/100,30);
      c.fillStyle='#ffffff20';c.fillRect(x,guardY,w,7);c.fillStyle='#bceaff';c.fillRect(x,guardY,w*f.guard/100,7);
      c.fillStyle='#ffffff20';c.fillRect(x,meterY,w,15);c.fillStyle=f.meter>=100?'#fff8d7':color;c.fillRect(x,meterY,w*f.meter/100,15);
      const labelY=this.compact?200:187;
      this.text(f.meter>=100?'FINISH READY':`LUNACY ${Math.floor(f.meter)}%`,x,labelY,27,color);
      this.text(`${m.wins[i]} FALLS`,x+w,labelY,26,'#ddd2e4','right');
    }
    this.text(m.options.mode==='practice'?'∞':String(Math.ceil(m.remaining)),640,93,82,m.remaining<15?'#ff5671':'#fff5e7','center',true);
    this.text(m.options.mode==='practice'?'PRACTICE':`ROUND ${m.round}`,640,140,25,'#b0ff20','center');
    const footerY=this.portrait?909:669;c.fillStyle='#100a19';c.fillRect(0,footerY,1280,51);this.text(m.options.mode==='championship'?m.options.championshipLabel:this.coachText||ARENAS[arena]?.name||'',640,footerY+35,this.coachText?19:27,'#e5dce9','center');
    if(m.pin){c.fillStyle='#100a19dc';c.fillRect(420,230,440,74);this.text(m.pin.kind==='submission'?'SUBMISSION':`PIN COUNT ${m.pin.count||'—'}`,640,280,42,'#b0ff20','center',true);}
  }
  banners(m){
    const c=this.ctx;let title='',sub='',color='#f6efe5';
    if(m.phase==='fight'&&m.grapple&&m.grapple.time<=THROW_BREAK_WINDOW){
      const defender=1-m.grapple.attacker,key=this.scheme==='touch'?'BREAK':this.scheme==='gamepad'?'B':m.options.mode==='local'&&defender===1?'H':'C';
      const y=this.portrait||this.compact?245:190;
      c.fillStyle='#100a19e8';c.fillRect(400,y-33,480,52);
      this.text(`P${defender+1} · TAP ${key} TO BREAK`,640,y,this.portrait||this.compact?32:25,'#8ee7ff','center',true);
    }
    if(m.phase==='intro'){title=m.phaseTime<1.55?m.options.mode==='practice'?'PRACTICE':`ROUND ${m.round}`:'FIGHT!';sub=m.phaseTime<1.55?(m.options.mode==='practice'?'FULL METER · PASSIVE OPPONENT':'FIRST TO TWO FALLS'):'';color=m.phaseTime<1.55?'#fff3e7':'#b0ff20';}
    if(m.phase==='roundEnd'&&m.phaseTime<1.25&&m.method==='TIME LIMIT'&&this.bannerArt.timeout){this.graphicImage('timeout',640,315,750);return;}
    if(m.phase==='roundEnd'&&m.phaseTime<1.25&&['PINFALL','TAP OUT'].includes(m.method)&&this.bannerArt[m.method==='PINFALL'?'pinfall':'tapout']){this.graphicImage(m.method==='PINFALL'?'pinfall':'tapout',640,315,750);return;}
    if(m.phase==='roundEnd'){title=m.roundWinner===null?'DRAW':`${m.fighters[m.roundWinner].definition.name.toUpperCase()} WINS`;sub=m.options.mode==='practice'?'PRACTICE · RESETTING':m.method;}
    if(title){c.save();c.fillStyle='#0a071ac4';c.fillRect(0,280,1280,119);c.shadowColor='#000';c.shadowBlur=this.lowPower?0:18;this.text(title,640,343,title.length>20?48:66,color,'center',true);this.text(sub,640,377,17,'#d4c6df','center');c.restore();}
  }
  graphicImage(key,x,y,width){const art=this.bannerArt[key];if(!art)return false;const h=width*art.height/art.width;this.ctx.drawImage(art,x-width/2,y-h/2,width,h);return true;}
  announcements(dt){if(!this.graphic)return;this.graphic.life-=dt;if(this.graphic.life<=0){this.graphic=null;return;}const c=this.ctx;c.save();c.globalAlpha=fit(this.graphic.life*5,0,1);if(!this.graphicImage(this.graphic.key,640,230,560))this.text(this.graphic.key==='kickout'?'KICK OUT!':'LUNACY!',640,250,52,'#b0ff20','center',true);c.restore();}
  combatEffect(e,match){
    if(this.reduced||!['hit','block','slam','land'].includes(e.type))return;
    const f=match?.fighters[e.index],ground=['slam','land'].includes(e.type);
    const key=ground?'ground':e.type==='block'?'guard':e.move==='light'?'chips':'impact';
    const asset=this.combatFx[key],x=Number.isFinite(e.x)?e.x:f?.x;if(!asset||!Number.isFinite(x))return;
    const facing=match?.fighters[e.attacker]?.facing||-(f?.facing||-1);
    this.spriteFx.push({key,x,y:ground?FLOOR+3:FLOOR-135-(e.z||0),facing,age:0,size:ground?(e.type==='slam'?330:180):e.type==='block'?150:180});
    if(this.spriteFx.length>(this.lowPower?8:24))this.spriteFx.shift();
  }
  effects(dt){
    const c=this.ctx;
    const active=[];
    for(const fx of this.spriteFx){
      const a=this.combatFx[fx.key];if(!a?.image||!Number.isFinite(a.fps)||!Number.isFinite(a.frames))continue;
      const frame=Math.floor(fx.age*a.fps);fx.age+=dt;if(frame>=a.frames)continue;active.push(fx);
      c.save();c.translate(fx.x,fx.y);c.scale(fx.facing,1);
      c.drawImage(a.image,(frame%a.columns)*a.cell,Math.floor(frame/a.columns)*a.cell,a.cell,a.cell,-fx.size/2,-fx.size*a.anchorY/a.cell,fx.size,fx.size);c.restore();
    }
    this.spriteFx=active.filter(fx=>fx.age<this.combatFx[fx.key].frames/this.combatFx[fx.key].fps);

    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;c.globalAlpha=fit(p.life/p.max,0,1);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size);}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
    for(const p of this.popups){p.life-=dt;if(p.screen)continue;p.y-=dt*30;c.globalAlpha=fit(p.life*3,0,1);this.text(p.text,p.x,p.y,30,p.color,'center',true);}c.globalAlpha=1;this.popups=this.popups.filter(p=>p.life>0);
  }
}
