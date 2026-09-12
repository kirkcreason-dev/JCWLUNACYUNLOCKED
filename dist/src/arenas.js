// The artwork determines the arena names. Crop the smaller legacy rings to the same fighting lane.
export const ARENAS = [
  {name:'BLOODYMANIA'},
  {name:'HELL’S PIT'},
  {name:'MADHOUSE'},
  {name:'RUSTED WAREHOUSE'},
  {name:'FUNHOUSE',crop:[356,181,960,540]},
  {name:'LUNACY OUTDOORS',crop:[291,86,1090,613.125]},
].map((arena,index)=>({...arena,src:`./assets/arena-${index}.jpg`}));
