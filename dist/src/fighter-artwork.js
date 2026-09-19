// Artwork revisions invalidate only the changed fighter's cached images.
const revision=f=>f.artVersion?`?v=${encodeURIComponent(f.artVersion)}`:'';
export const fighterPortrait=f=>`./assets/${f.id}-portrait.png${revision(f)}`;
export const fighterAtlas=f=>f.atlas+revision(f);
