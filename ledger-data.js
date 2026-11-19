(function(global){
'use strict';
const D=global.FractionData||(typeof require==='function'?require('./fraction-data.js'):null);
function bits(value){return Uint8Array.from(global.atob(value||''),c=>c.charCodeAt(0))}
function mask(state,event){const a=bits(state?.c?.[event.device]),i=Number(event.slot);return (a[i>>2]||0)>>((i&3)*2)&3}
function packRanks(groups){const bytes=[];for(let stage=1;stage<=17;stage++)for(const value of (groups[stage]||[0,0,0]).slice(0,3)){let n=value>=0?value*2:-value*2-1;while(n>=128){bytes.push((n&127)|128);n=Math.floor(n/128)}bytes.push(n)}return global.btoa(String.fromCharCode(...bytes))}
function unpackRanks(value){const raw=bits(value),values=[];let n=0,shift=0;for(const b of raw){n+=(b&127)*2**shift;if(b&128)shift+=7;else{values.push(n&1?-(n+1)/2:n/2);n=0;shift=0}}const out={};for(let stage=1;stage<=17;stage++){const v=values.slice((stage-1)*3,stage*3);if(v.length===3&&v.some(x=>x))out[stage]=[...v,0]}return out}
function applyDay(current,events){
 const x=JSON.parse(JSON.stringify(current||{v:3,t:[0,0,0,0],g:{},s:{},c:{}}));x.g||={};x.s||={};x.c||={};
 for(const e of events.slice().sort((a,b)=>a.at-b.at)){
  if(!Number.isInteger(e.slot)||e.slot<0||e.slot>20000||!/^[a-f0-9]{32}$/.test(e.device)||e.stage<1||e.stage>17)throw Error('제출 식별자가 올바르지 않습니다.');
  const flag=e.ok?1:2,old=mask(x,e)|(e.legacyMask||0);if(old&flag)continue;
  const raw=bits(x.c[e.device]),a=new Uint8Array(Math.max(raw.length,(e.slot>>2)+1));a.set(raw);a[e.slot>>2]=(a[e.slot>>2]&~(3<<((e.slot&3)*2)))|((old|flag)<<((e.slot&3)*2));x.c[e.device]=global.btoa(String.fromCharCode(...a));
  const rawPoints=Number(e.correctPoints),award=global.FractionScoring?global.FractionScoring.eventPoints(e):(Number.isInteger(rawPoints)&&rawPoints>=1&&rawPoints<=100?rawPoints:(e.stage>=11?10:1));const delta=e.ok?award:-1,st=x.g[e.stage]||[0,0,0,0];
  x.t[e.ok?0:1]++;x.t[2]+=delta;x.t[3]++;st[e.ok?0:1]++;st[2]+=delta;if(!old)st[3]++;x.g[e.stage]=st;
  const candidates=Object.entries(x.s).filter(([,s])=>s[1]<=e.at).sort((a,b)=>b[1][1]-a[1][1]);
  const last=candidates[0],id=last&&e.at-last[1][1]<D.GAP?last[0]:'s_'+e.at+'_'+e.device.slice(-5)+'_'+e.slot;
  const session=x.s[id]||[e.at,e.at,0,0,0];session[1]=Math.max(session[1],e.at);session[e.ok?2:3]++;session[4]++;x.s[id]=session;x.last=Math.max(x.last||0,e.at);
 }x.r=packRanks(x.g);return x;
}
function add(a,v){a||={correct:0,wrong:0,score:0,totalSolved:0};a.correct=Number(a.correct||0)+Number(v?.[0]||0);a.wrong=Number(a.wrong||0)+Number(v?.[1]||0);a.score=Number(a.score||0)+Number(v?.[2]||0);a.totalSolved=Number(a.totalSolved??(a.correct+a.wrong-v[0]-v[1]))+Number(v?.[3]||0);return a}
function fold(base,days){
 const x={...base,total:{...base.total},stages:Object.fromEntries(Object.entries(base.stages||{}).filter(([,v])=>v).map(([k,v])=>[k,{...v}])),activity:{...base.activity},_ledger3:days,_baseline3:base};
 for(const [date,day]of Object.entries(days)){
  if(day.t)x.total=add(x.total,day.t);
  const activity={...x.activity[date],stages:Object.fromEntries(Object.entries(x.activity[date]?.stages||{}).map(([k,v])=>[k,{...v}])),sessions:{...x.activity[date]?.sessions}};
  for(const [stage,v]of Object.entries(day.g||(day.r?unpackRanks(day.r):{}))){if(!v)continue;x.stages[stage]=add(x.stages[stage],[v[0],v[1],v[2],v[0]+v[1]]);const old=activity.stages[stage]||{};activity.stages[stage]={...old,correct:Number(old.correct||0)+v[0],wrong:Number(old.wrong||0)+v[1],totalSolved:Number(old.totalSolved||0)+v[3]}}
  for(const [id,v]of Object.entries(day.s||{}))activity.sessions['v3_'+id]={startAt:v[0],endAt:v[1],correct:v[2],wrong:v[3],totalSolved:v[4],solved:v[4]};
  const ordered=Object.entries(activity.sessions).sort((a,b)=>a[1].startAt-b[1].startAt),merged=[];for(const [id,session]of ordered){const previous=merged.at(-1),isNew=id.startsWith('v3_');if(previous&&(previous[2]||isNew)&&session.startAt-previous[1].endAt<D.GAP){const a=previous[1];a.endAt=Math.max(a.endAt,session.endAt);a.correct+=session.correct;a.wrong+=session.wrong;a.totalSolved=Number(a.totalSolved??a.solved??0)+Number(session.totalSolved??session.solved??0);a.solved=a.totalSolved;previous[2]=true}else merged.push([id,{...session},isNew])}activity.sessions=Object.fromEntries(merged.map(([id,value])=>[id,value]));
  activity.lastActiveAt=Math.max(Number(activity.lastActiveAt||0),Number(day.last||0));if(day.t||day.g||day.s)x.activity[date]=activity;
 }
 if(base.activity||Object.values(days).some(day=>day.s))for(const date of Object.keys(x.activity))if(D.riskFor(x,date).count>=2)x.activity[date]={...x.activity[date],locked:true};
 return x;
}
function preview(current,events){const days={...current._ledger3};const legacy=[];for(const event of events){if(!event.device){legacy.push(event);continue}const date=D.dateKey(new Date(event.at||Date.parse(event.date)));days[date]=applyDay(days[date], [event])}const next=fold(current._baseline3||current,days);return legacy.length?D.applyResults(next,legacy,{}):next}
function isApplied(student,event){const at=event.at||Date.parse(event.date);return Number.isFinite(at)&&!!(event.device&&Number.isInteger(event.slot)&&(mask(student?._ledger3?.[D.dateKey(new Date(at))],event)&(event.ok?1:2)))}
const pageDevice=global.crypto.randomUUID().replace(/-/g,''),slots=new Map();
function stamp(event,key){const scope=key+':'+D.dateKey(new Date(event.at||Date.parse(event.date)));if(!slots.has(scope))slots.set(scope,new Map());const map=slots.get(scope);if(!map.has(event.questionId))map.set(event.questionId,map.size);return {...event,at:event.at||Date.parse(event.date),compactVersion:3,device:pageDevice,slot:map.get(event.questionId)}}
async function assign(events,key){for(const e of events){if(e.device&&Number.isInteger(e.slot))continue;if(e.compactVersion===3){Object.assign(e,stamp(e,key));continue}const bytes=await global.crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+':'+D.dateKey(new Date(e.at))+':'+e.questionId));e.device=Array.from(new Uint8Array(bytes).slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');e.slot=0}}
const initialized=new Set();
async function ensureStudent(db,studentRef,identity){
 // Freeze legacy parent writes first. Old tabs cannot race this new ledger.
 const target=studentRef.toString();if(!initialized.has(target)){let created=false;
  if(!(await studentRef.child('nickname').once('value')).exists()){
   if(!identity?.nickname)throw Error('학생 정보를 확인해 주세요.');
   try{await studentRef.update({...identity,total:{correct:0,wrong:0,score:0,totalSolved:0},totalSolved:0,totalCorrect:0});created=true}catch(error){if(!(await studentRef.child('nickname').once('value')).exists())throw error}
  }
  await studentRef.child('compactV3/version').transaction(v=>v===3?undefined:3,undefined,false);if(created){await D.studentKeys(studentRef.parent);await studentRef.parent.parent.child('lightRoster/keys/'+studentRef.key).set(true)}initialized.add(target);
 }
}
async function submit(db,studentRef,events,identity){await ensureStudent(db,studentRef,identity);
 const list=[];
 for(const e of events){
  if(e.compactVersion!==3){
   if(e.eventId&&(await studentRef.child('processedEvents/'+e.eventId).once('value')).exists())continue;
   const q=encodeURIComponent(String(e.questionId||e.eventId)).replace(/\./g,'%2E');
   const seen=(await studentRef.child('activity/'+D.dateKey(new Date(e.at))+'/stages/'+e.stage+'/questions/'+q).once('value')).val();e.legacyMask=(seen?.correct?1:0)|(seen?.wrong?2:0);if(e.legacyMask&(e.ok?1:2))continue;
  }list.push(e);
 }
 const groups={};for(const e of list)(groups[D.dateKey(new Date(e.at))]||=[]).push(e);
 const committed={};for(const [date,batch]of Object.entries(groups)){const result=await studentRef.child('compactV3/days/'+date).transaction(value=>{const next=applyDay(value,batch);return JSON.stringify(next)===JSON.stringify(value)?undefined:next},undefined,false);const stored=result.snapshot.val();if(!stored||!batch.every(e=>(mask(stored,e)&(e.ok?1:2))||(e.legacyMask&(e.ok?1:2))))throw Error('제출 저장을 확인하지 못했습니다.');committed[date]=stored}
 return committed;
}
const api={packRanks,unpackRanks,applyDay,fold,preview,isApplied,stamp,assign,ensureStudent,submit};global.Ledger3=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
