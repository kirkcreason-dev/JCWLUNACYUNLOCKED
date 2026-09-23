import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkRosterApprovals} from '../tools/roster-approval.mjs';
const roster=JSON.parse(await readFile(new URL('../dist/assets/roster.json',import.meta.url),'utf8'));
const record=JSON.parse(await readFile(new URL('../roster-approvals.json',import.meta.url),'utf8'));

test('the current roster matches the supplied approval table and does not grant approval to unlisted fighters',()=>{
  checkRosterApprovals(roster,record);
  assert.deepEqual(record.entries.filter(e=>!e.approved).map(e=>e.name),['HollyHood Haley J','Luigi Primo','Sophia Rose']);
  assert.equal(record.entries.filter(e=>e.approved).length,35);
  assert.deepEqual(roster.filter(f=>!record.entries.some(e=>e.id===f.id)).map(f=>f.id),['violent-j','shaggy-2-dope','dj-clay','jeff-lane','evil-dead']);
});
test('the release check blocks excluded characters even if an importer gives them a different ID',()=>{
  for(const entry of record.entries.filter(e=>!e.approved)){
    for(const identity of [{id:entry.id,name:'Imported Fighter'},{id:'alternate-id',name:entry.name}]){
      assert.throws(()=>checkRosterApprovals([...roster,{...roster[0],...identity}],record),/marked NO/);
    }
  }
});
