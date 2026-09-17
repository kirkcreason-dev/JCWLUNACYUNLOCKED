// A sustained expensive draw reduces presentation cost once per session.
// The simulation remains fixed at 60 Hz; quality never oscillates mid-match.
export class RenderBudget {
  constructor(){this.frames=0;this.total=0;this.limited=false;}
  observe(milliseconds){if(this.limited||!Number.isFinite(milliseconds)||milliseconds<0)return false;this.total+=Math.min(milliseconds,80);if(++this.frames<90)return false;const expensive=this.total/this.frames>11;this.frames=0;this.total=0;if(expensive)this.limited=true;return expensive;}
}
