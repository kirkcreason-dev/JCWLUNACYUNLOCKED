import test from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../dist/src/audio.js';
function context(){const nodes=[];const param={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};const node=()=>{const n={frequency:param,Q:param,gain:param,connect(){},disconnect(){this.disconnected=true;},start(){},stop(){}};nodes.push(n);return n;};return {nodes,state:'running',currentTime:3,sampleRate:8000,destination:{},createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createBuffer:(_c,n)=>({getChannelData:()=>new Float32Array(n)}),suspend:()=>Promise.resolve(),resume:()=>Promise.resolve()};}
function sound(){const s=new Sound({play:()=>Promise.resolve(),pause(){}});s.enabled=true;s.context=context();return s;}
test('effect bursts have bounded voices and release every audio node on completion or pause',()=>{
 const s=sound();for(let i=0;i<100;i++)s.play([{type:'hit',move:'heavy'},{type:'slam'}]);assert.ok(s.voices.size<=24);assert.ok(s.voices.size>0);
 for(const v of [...s.voices])v.dispose();assert.equal(s.voices.size,0);assert.ok(s.context.nodes.every(n=>n.disconnected));
 s.bell();assert.ok(s.voices.size>0);s.suspend();assert.equal(s.voices.size,0);s.play([{type:'hit'}]);assert.equal(s.voices.size,0);
});
test('muting effects keeps music independent and device failures never reach the game loop',()=>{
 const s=sound();s.setMix(.4,0);s.play([{type:'slam'}]);assert.equal(s.voices.size,0);assert.equal(s.music.volume,.4);
 s.setMix(.4,.7);s.context.createOscillator=()=>{throw new Error('lost device');};assert.doesNotThrow(()=>s.play([{type:'fight'},{type:'reversal'}]));s.stopEffects();assert.equal(s.voices.size,0);
});
