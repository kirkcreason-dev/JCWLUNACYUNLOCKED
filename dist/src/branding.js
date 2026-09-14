// Use the exact supplied PNG for UI and arena signs. These are scene overlays,
// not rewritten arena files, so the original ropes, geometry and artwork remain.
export const UNLOCKED_CROP=[24,88,2000,512];
export const ARENA_WORDMARKS={
  0:[{box:[714,230,224,50]},{box:[610,709,442,59],rope:[610,712,442,8]}],
  1:[{box:[748,232,168,42]},{box:[494,882,232,55]}],
  3:[{box:[740,226,204,43]}]
};
export function drawArenaWordmarks(ctx,background,index,logo,width=1280,height=720){
  const slots=ARENA_WORDMARKS[index];if(!slots)return;
  ctx.save();ctx.scale(width/1672,height/941);
  for(const {box,rope} of slots){
    ctx.fillStyle='#080709';ctx.fillRect(...box);
    if(logo)ctx.drawImage(logo,...UNLOCKED_CROP,...box);
    // This mat logo sits behind the foreground rope, as in the supplied arena.
    if(rope)ctx.drawImage(background,...rope,...rope);
  }
  ctx.restore();
}
