import test from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../dist/src/audio.js';
function fixture(){const calls=[];const media={play(){calls.push('play');return Promise.resolve();},pause(){calls.push('pause');},canPlayType(){return '';}};const sound=new Sound(media);return {sound,media,calls};}
test('opening starts the supplied theme within the gesture, without toggling an enabled track off',async()=>{
 const saved=globalThis.window;globalThis.window={};try{const {sound,media,calls}=fixture();const result=sound.start();assert.equal(calls[0],'play');assert.equal(media.src,'./assets/jcw-theme.mp3');assert.equal(media.loop,true);await result;await sound.start();assert.equal(sound.enabled,true);assert.ok(!calls.includes('pause'));}finally{globalThis.window=saved;}
});
test('explicit mute survives pause/resume and later enabling resumes playback',async()=>{
 const saved=globalThis.window;globalThis.window={};try{const {sound,calls}=fixture();await sound.start();await sound.enable();assert.equal(sound.enabled,false);const n=calls.length;sound.suspend();sound.resume();assert.ok(!calls.slice(n).includes('play'));await sound.enable();assert.equal(calls.at(-1),'play');}finally{globalThis.window=saved;}
});
test('pause preserves track position and resume never replaces the selected source',async()=>{
 const saved=globalThis.window;globalThis.window={};try{const {sound,media,calls}=fixture();media.currentTime=42;sound.setTrack('fight-club');await sound.start();sound.suspend();sound.resume();assert.equal(media.currentTime,42);assert.equal(media.src,'./assets/fight-club.mp3');assert.equal(calls.at(-1),'play');}finally{globalThis.window=saved;}
});
test('an audio-device or autoplay rejection does not block opening the game',async()=>{
 const saved=globalThis.window;globalThis.window={};try{const {sound,media}=fixture();media.play=()=>Promise.reject(new Error('device unavailable'));await assert.doesNotReject(()=>sound.start());}finally{globalThis.window=saved;}
});
