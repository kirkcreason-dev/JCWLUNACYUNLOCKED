// Grip positions measured on the original nine fighters' normalized atlas poses.
// Values are relative to the feet, in the facing-right render coordinate space.
const GRIPS={
 'violent-j':{ready:[53,105],hit:[97,115],idle:[6,80],walk:[-14,80],run:[65,140]},
 '2-tuff-tony':{ready:[55,110],hit:[105,120],idle:[6,80],walk:[-3,80],run:[66,142]},
 'willie-mack':{ready:[40,130],hit:[112,160],idle:[7,100],walk:[-2,90],run:[72,142]},
 'mickie-knuckles':{ready:[53,85],hit:[97,123],idle:[5,90],walk:[-8,87],run:[-8,87]},
 'kerry-morton':{ready:[65,105],hit:[98,123],idle:[5,91],walk:[-8,87],run:[60,126]},
 'mr-happy':{ready:[55,85],hit:[97,120],idle:[5,95],walk:[-5,88],run:[70,145]},
 'moshpit-mike':{ready:[66,100],hit:[98,123],idle:[4,91],walk:[-5,90],run:[70,139]},
 'cokane':{ready:[55,85],hit:[99,123],idle:[7,90],walk:[-3,86],run:[68,143]},
 'yabo':{ready:[55,85],hit:[98,121],idle:[7,90],walk:[11,86],run:[72,137]},
};
export function weaponGrip(f,entry,offsetX=0){
 // Replacement packs can provide a grip measured on the exact source pose.
 if(entry?.weaponGrip)return {x:entry.weaponGrip[0]+offsetX,y:entry.weaponGrip[1]};
 const points=GRIPS[f.definition.id]||GRIPS['2-tuff-tony'],light=f.definition.animations.light;
 const same=pose=>pose&&entry&&pose.x===entry.x&&pose.y===entry.y&&pose.w===entry.w&&pose.h===entry.h;
 let grip=points.idle;
 if(f.move){grip=same(light[1])?points.hit:same(light[0])||same(light[2])?points.ready:points.idle;}
 else if(f.state==='walk')grip=points.walk;
 else if(f.state==='run')grip=points.run;
 return {x:grip[0]+offsetX,y:grip[1]};
}
