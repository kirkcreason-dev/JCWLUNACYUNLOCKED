import assert from 'node:assert/strict';

const normalize=value=>String(value).toLowerCase().replace(/[^a-z0-9]/g,'');

export function checkRosterApprovals(roster,record){
  assert.equal(record.scale,10);
  assert.equal(new Set(record.entries.map(e=>e.id)).size,record.entries.length,'Duplicate approval entry');
  for(const entry of record.entries){
    assert.equal(typeof entry.approved,'boolean',`${entry.name}: approval must be explicit`);
    const aliases=[entry.id,entry.name,...(entry.aliases||[])].map(normalize);
    const fighter=roster.find(f=>f.id===entry.id||[f.id,f.name,f.websiteStats?.websiteName].some(value=>value&&aliases.includes(normalize(value))));
    if(!entry.approved){assert.ok(!fighter,`${entry.name}: marked NO in supplied approval table`);continue;}
    if(!fighter)continue; // Approval alone does not supply a character's artwork.
    for(const key of ['power','speed','technique','toughness']){
      const value=entry.ratings?.[key];
      assert.ok(Number.isInteger(value)&&value>=1&&value<=record.scale,`${entry.name}: invalid ${key}`);
      assert.equal(fighter.websiteStats?.[key],value,`${entry.name}: ${key} differs from supplied table`);
      assert.equal(fighter[key],Math.round((.70+.05*value)*100)/100,`${entry.name}: incorrect ${key} multiplier`);
    }
    assert.equal(fighter.websiteStats.finisher||null,entry.finisher,`${entry.name}: listed finisher differs`);
    assert.equal(fighter.finisher,(entry.finisher||'Lunacy Finisher').toUpperCase(),`${entry.name}: game finisher differs`);
  }
}
