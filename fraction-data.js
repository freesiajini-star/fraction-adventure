(function(global){
'use strict';
const ROOT='fractionAdventure/monthly', GAP=30*60*1000;
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const monthKey=d=>dateKey(d).slice(0,7);
const addDays=(key,n)=>{const d=new Date(key+'T12:00:00+09:00');d.setUTCDate(d.getUTCDate()+n);return dateKey(d)};
const sessionsFor=(x,date)=>Object.values(x?.activity?.[date]?.sessions||{}).filter(s=>Number(s.endAt)>0).sort((a,b)=>a.startAt-b.startAt);
const dayTotal=(x,date)=>sessionsFor(x,date).reduce((n,s)=>n+Number(s.totalSolved??s.solved??0),0);
function riskFor(x,date){const sessions=sessionsFor(x,date),daily=dayTotal(x,date),sessionMax=Math.max(0,...sessions.map(s=>Number(s.totalSolved??s.solved??0)));const hit={daily500:daily>=500,threeDays300:[0,-1,-2].every(n=>dayTotal(x,addDays(date,n))>=300),session200:sessionMax>=200,sevenSessions:sessions.length>=7};return {hit,count:Object.values(hit).filter(Boolean).length,daily,sessionMax,sessions:sessions.length}}
function applyResults(current,events,identity){
 const x=JSON.parse(JSON.stringify(current||{}));Object.assign(x,identity);x.stages=x.stages||{};x.processedEvents=x.processedEvents||{};x.activity=x.activity||{};
 x.total=x.total||{correct:0,wrong:0,score:0,totalSolved:0};
 for(const r of events.slice().sort((a,b)=>Number(a.at)-Number(b.at))){if(x.processedEvents[r.eventId])continue;const stage=Number(r.stage);if(!Number.isInteger(stage)||stage<1||stage>16)continue;
  const increment=a=>{a=a||{};a.correct=Number(a.correct||0)+(r.ok?1:0);a.wrong=Number(a.wrong||0)+(r.ok?0:1);a.score=Number(a.score||0)+(r.ok?(stage>=10?10:1):-1);a.totalSolved=Number(a.totalSolved??(a.correct+a.wrong-1))+1;return a};
  x.stages[stage]=increment(x.stages[stage]);x.total=increment(x.total);
  const ts=Number(r.at),day=dateKey(new Date(ts));const activity=x.activity[day]||{sessions:{}};activity.sessions=activity.sessions||{};
  const ordered=Object.entries(activity.sessions).filter(([,s])=>Number(s.endAt)<=ts).sort((a,b)=>b[1].endAt-a[1].endAt);const last=ordered[0];
  const id=last&&ts-last[1].endAt<GAP?last[0]:'s_'+ts+'_'+r.eventId.slice(-6);const session=activity.sessions[id]||{startAt:ts,endAt:ts,totalSolved:0,correct:0,wrong:0};
  session.endAt=Math.max(session.endAt,ts);session.totalSolved=Number(session.totalSolved??session.solved??0)+1;session.correct=Number(session.correct||0)+(r.ok?1:0);session.wrong=Number(session.wrong||0)+(r.ok?0:1);session.solved=session.totalSolved;activity.sessions[id]=session;activity.lastActiveAt=Math.max(Number(activity.lastActiveAt||0),ts);x.activity[day]=activity;x.processedEvents[r.eventId]=ts;
 }
 x.totalSolved=Number(x.total.totalSolved||0);x.totalCorrect=Number(x.total.correct||0);x.solved=x.totalCorrect;return x;
}
const api={ROOT,GAP,pad,dateKey,monthKey,addDays,sessionsFor,dayTotal,riskFor,applyResults};global.FractionData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
