import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SecretFighters,SECRET_FIGHTERS,SECRET_KEY} from '../dist/src/secret-fighters.js';
import {Championship} from '../dist/src/championship.js';
import {ArcadeRewards} from '../dist/src/arcade-rewards.js';
import {RosterSelection} from '../dist/src/roster-selection.js';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url)));
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};};
const present=roster.filter(f=>SECRET_FIGHTERS.includes(f.id)).map(f=>f.id); // roster order, as the UI lists them
const main=await readFile(new URL('../dist/src/main.js',import.meta.url),'utf8');
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');

test('the four shipped secrets are real roster fighters; Evil Dead is reserved for when he is added',()=>{
 assert.deepEqual([...present].sort(),['dj-clay','jeff-lane','shaggy-2-dope','violent-j']);
 assert.ok(SECRET_FIGHTERS.includes('evil-dead'));assert.ok(!roster.some(f=>f.id==='evil-dead'));
});
test('secrets are hidden from the pick list until unlocked, then every fighter is playable',()=>{
 const s=new SecretFighters(roster,storage());
 assert.equal(s.unlocked(),false);assert.equal(s.present.length,4);
 const before=s.indices();assert.equal(before.length,roster.length-4);
 for(const i of before)assert.ok(!s.isSecret(roster[i].id));
 for(const id of present)assert.equal(s.playable(id),false);
 const revealed=s.unlock('able');assert.deepEqual(revealed.map(f=>f.id),present);
 assert.equal(s.unlocked(),true);assert.equal(s.indices().length,roster.length);
 assert.deepEqual(s.unlock('able'),[],'second unlock reveals nothing new');
 for(let i=0;i<roster.length;i++)assert.equal(s.indices()[i],i,'unlocked order matches the roster order');
});
test('the unlock persists on this browser and survives a reload; tampered records are ignored',()=>{
 const store=storage();new SecretFighters(roster,store).unlock('ruffo');
 const again=new SecretFighters(roster,store);assert.equal(again.unlocked(),true);assert.equal(again.saved,true);
 const record=JSON.parse(store.data.get(SECRET_KEY));assert.equal(record.version,1);assert.equal(record.by,'ruffo');assert.ok(!Number.isNaN(Date.parse(record.date)));
 for(const bad of ['{"version":1}','{"version":1,"unlocked":"yes","by":"x","date":"y"}','[]','nope','{"version":2,"unlocked":true,"by":"x","date":"y"}']){store.setItem(SECRET_KEY,bad);assert.equal(new SecretFighters(roster,store).unlocked(),false,bad);}
});
test('without storage the unlock lasts for the session and reports saving unavailable',()=>{
 const s=new SecretFighters(roster,null);s.unlock('x');assert.equal(s.unlocked(),true);assert.equal(s.saved,false);
 const throwing={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
 const t=new SecretFighters(roster,throwing);assert.equal(t.unlocked(),false);t.unlock('x');assert.equal(t.unlocked(),true);assert.equal(t.saved,false);
});
test('a title won before this update unlocks the secrets at boot; a run in progress does not',()=>{
 const store=storage(),c=new Championship(roster,store,()=>.31);
 for(let i=0;i<3;i++)c.settle(c.start('able','hard',0),true);
 assert.deepEqual(new SecretFighters(roster,store).adopt(c),[],'three road wins are not a title');
 for(let i=3;i<5;i++)c.settle(c.start('able','hard',0),true);
 const s=new SecretFighters(roster,store);assert.deepEqual(s.adopt(c).map(f=>f.id),present);assert.equal(JSON.parse(store.data.get(SECRET_KEY)).by,'able');
 assert.deepEqual(new SecretFighters(roster,store).adopt(c),[],'already unlocked');
});
test('winning the belt with a secret opponent on the road, or as a secret fighter, both still count; the record keeps the crowned fighter',()=>{
 const store=storage(),c=new Championship(roster,store,()=>.31),s=new SecretFighters(roster,store);
 for(let i=0;i<5;i++)c.settle(c.start('violent-j','easy',1),true);
 assert.deepEqual(s.adopt(c).map(f=>f.id),present);assert.equal(s.record().by,'violent-j');
});
test('the pick list pages over playable fighters only, and the page selection maps back to roster indices',()=>{
 const s=new SecretFighters(roster,storage()),playable=s.indices(),pages=new RosterSelection(playable.length,12);
 const seen=new Set();for(let p=0;p<pages.pages;p++){pages.turn(p-pages.page);for(const pos of pages.visible)seen.add(playable[pos]);}
 assert.equal(seen.size,roster.length-4);for(const id of present)assert.ok(!seen.has(roster.findIndex(f=>f.id===id)));
 assert.equal(pages.choose(playable.indexOf(roster.findIndex(f=>f.id==='violent-j'))),false,'a hidden secret cannot be chosen');
 assert.equal(pages.choose(playable.indexOf(roster.findIndex(f=>f.id==='able'))),true);
});
test('secret fighters still appear as CPU opponents, so arcade medals and championship draws are unchanged',()=>{
 const store=storage(),rewards=new ArcadeRewards(roster,store),c=new Championship(roster,store,()=>.31);
 const defeated=roster.filter(f=>f.id!=='able').map(f=>f.id);assert.ok(present.every(id=>defeated.includes(id)));
 assert.ok(rewards.award({fighter:'able',difficulty:'easy',defeated,mode:'arcade',won:true}).fresh);
 assert.equal(c.start('able','normal',0).path.length,5);
});
test('main.js wires the unlock to the crowned result and hides secrets from the roster grid and picker',()=>{
 assert.match(main,/secrets=new SecretFighters\(roster,campaignStorage\);secrets\.adopt\(championships\)/);
 assert.match(main,/outcome==='crowned'&&secrets\?secrets\.unlock\(run\.fighter\)/);
 assert.match(main,/playable=secrets\?secrets\.indices\(\)/);
 assert.match(main,/new RosterSelection\(playable\.length/);
 assert.match(main,/rosterSelection\?\.choose\(playable\.indexOf\(index\)\)/);
 assert.match(main,/if\(secrets&&!secrets\.playable\(roster\[chosen\]\.id\)\)\{choose\(playable\[0\]\);\}/,'a locked secret can never start a match');
 for(const id of ['secret-note','secret-unlock'])assert.ok(html.includes(`id="${id}"`),`index.html has #${id}`);
});
