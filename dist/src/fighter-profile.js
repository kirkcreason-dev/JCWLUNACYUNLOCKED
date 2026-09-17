// Ratings remain the approved roster values; these rules express them in play.
export function fighterProfile(f){
  const power=f.power||1,speed=f.speed||1,technique=f.technique||1;
  if(speed>=1.15)return {id:'flyer',label:'HIGH FLYER',tip:'Fast approaches · longer finisher reach · frequent aerial attacks',grab:.12,heavy:.60,climb:.42,jump:.22,weapon:.08};
  if(technique>=1.15)return {id:'technician',label:'TECHNICIAN',tip:'More grapples and submissions · efficient guard recovery',grab:.40,heavy:.55,climb:.15,jump:.08,weapon:.12};
  if(power>=1.13)return {id:'powerhouse',label:'POWERHOUSE',tip:'Heavy strikes · hard-hitting close-range finisher',grab:.30,heavy:.84,climb:.07,jump:.04,weapon:.30};
  return {id:'brawler',label:'BRAWLER',tip:'Balanced strikes, weapons and throws',grab:.22,heavy:.72,climb:.18,jump:.10,weapon:.22};
}
export function finisherMove(f,base){
  switch(fighterProfile(f).id){
    case 'flyer':return {...base,reach:174,damage:28,knock:100};
    case 'technician':return {...base,reach:157,damage:29,stun:.95,knock:65};
    case 'powerhouse':return {...base,reach:140,damage:35,knock:155};
    default:return base;
  }
}
