(function(global){
'use strict';
const ROOT='fractionAdventure17/monthly', GAP=30*60*1000;
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
 for(const r of events.slice().sort((a,b)=>Number(a.at)-Number(b.at))){if(x.processedEvents[r.eventId])continue;const stage=Number(r.stage);if(!Number.isInteger(stage)||stage<1||stage>17)continue;
  const increment=a=>{a=a||{};a.correct=Number(a.correct||0)+(r.ok?1:0);a.wrong=Number(a.wrong||0)+(r.ok?0:1);a.score=Number(a.score||0)+(r.ok?(global.FractionScoring?global.FractionScoring.eventPoints(r):(stage>=11?10:1)):-1);a.totalSolved=Number(a.totalSolved??(a.correct+a.wrong-1))+1;return a};
  x.stages[stage]=increment(x.stages[stage]);x.total=increment(x.total);
  const ts=Number(r.at),day=dateKey(new Date(ts));const activity=x.activity[day]||{sessions:{}};activity.sessions=activity.sessions||{};
  activity.stages=activity.stages||{};
  const stageDay=activity.stages[stage]||{totalSolved:0,correct:0,wrong:0,questions:{}};
  stageDay.questions=stageDay.questions||{};
  const questionKey=encodeURIComponent(String(r.questionId||r.eventId)).replace(/\./g,'%2E');
  const seen=stageDay.questions[questionKey]||{};
  if(!seen.counted){stageDay.totalSolved=Number(stageDay.totalSolved||0)+1;seen.counted=true}
  const outcome=r.ok?'correct':'wrong';
  if(!seen[outcome]){stageDay[outcome]=Number(stageDay[outcome]||0)+1;seen[outcome]=true}
  stageDay.questions[questionKey]=seen;activity.stages[stage]=stageDay;
  const ordered=Object.entries(activity.sessions).filter(([,s])=>Number(s.endAt)<=ts).sort((a,b)=>b[1].endAt-a[1].endAt);const last=ordered[0];
  const id=last&&ts-last[1].endAt<GAP?last[0]:'s_'+ts+'_'+r.eventId.slice(-6);const session=activity.sessions[id]||{startAt:ts,endAt:ts,totalSolved:0,correct:0,wrong:0};
  session.endAt=Math.max(session.endAt,ts);session.totalSolved=Number(session.totalSolved??session.solved??0)+1;session.correct=Number(session.correct||0)+(r.ok?1:0);session.wrong=Number(session.wrong||0)+(r.ok?0:1);session.solved=session.totalSolved;activity.sessions[id]=session;activity.lastActiveAt=Math.max(Number(activity.lastActiveAt||0),ts);x.activity[day]=activity;if(riskFor(x,day).count>=2)activity.locked=true;x.processedEvents[r.eventId]=ts;
 }
 x.totalSolved=Number(x.total.totalSolved||0);x.totalCorrect=Number(x.total.correct||0);x.solved=x.totalCorrect;return x;
}
const NICKNAME_ICONS={고양이:'🐱',토끼:'🐰',여우:'🦊',늑대:'🐺',사자:'🦁',호랑이:'🐯',표범:'🐆',치타:'🐆',코끼리:'🐘',기린:'🦒',얼룩말:'🦓',코뿔소:'🦏',판다:'🐼',코알라:'🐨',캥거루:'🦘',나무늘보:'🦥',고슴도치:'🦔',다람쥐:'🐿️',햄스터:'🐹',수달:'🦦',비버:'🦫',라쿤:'🦝',너구리:'🦝',사슴:'🦌',산양:'🐐',염소:'🐐',양:'🐑',알파카:'🦙',낙타:'🐪',당나귀:'🫏',말:'🐴',고릴라:'🦍',침팬지:'🐵',여우원숭이:'🐒',박쥐:'🦇',곰:'🐻',북극곰:'🐻‍❄️',카피바라:'🐹',미어캣:'🐾',쿼카:'🐾',라마:'🦙',스컹크:'🦨',멧돼지:'🐗',바다코끼리:'🦭',재규어:'🐆',참새:'🐦',꾀꼬리:'🎶',까치:'🐦',비둘기:'🕊️',제비:'🐦',독수리:'🦅',매:'🦅',솔개:'🦅',부엉이:'🦉',올빼미:'🦉',두루미:'🪶',황새:'🦢',백로:'🪿',왜가리:'🐦',원앙:'🦆',거위:'🪿',백조:'🦢',펭귄:'🐧',갈매기:'🐦',앵무새:'🦜',공작:'🦚',타조:'🪶',플라밍고:'🦩',딱따구리:'🐦',물총새:'🐦',종다리:'🐦',꿩:'🐦',청둥오리:'🦆',투칸:'🐦',카나리아:'🐤',홍관조:'🐦',물까치:'🐦',돌고래:'🐬',향유고래:'🐋',범고래:'🐋',상어:'🦈',가오리:'🐟',문어:'🐙',오징어:'🦑',해파리:'🪼',불가사리:'⭐',해마:'🐠',거북이:'🐢',물개:'🦭',바다사자:'🦭',흰동가리:'🐠',소라:'🐚',소라게:'🦀',일각고래:'🐋',게:'🦀',금붕어:'🐟',나비:'🦋',잠자리:'🪰',무당벌레:'🐞',반딧불이:'✨',사슴벌레:'🪲',장수풍뎅이:'🪲',개미:'🐜',꿀벌:'🐝',달팽이:'🐌'};
const nicknameText=name=>!name||name==='—'?'—':(NICKNAME_ICONS[name]||'⭐')+' '+name;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nicknameHTML=name=>!name||name==='—'?'—':`<span class="nick-icon" aria-hidden="true">${NICKNAME_ICONS[name]||'⭐'}</span> ${escape(name)}`;
function studentRankRows(students,classNo,stage){if(!Number(classNo))return [];return Object.entries(students).filter(([,x])=>Number(x.classNo)===Number(classNo)).map(([key,x])=>{const a=stage==null?x.total:x.stages?.[stage];return {key,name:x.nickname||'동물',cl:Number(x.classNo),studentNo:Number(x.studentNo),correct:Number(a?.correct||0),wrong:Number(a?.wrong||0),score:Number(a?.score||0)}}).filter(x=>x.correct+x.wrong>0).sort((a,b)=>b.score-a.score||b.correct-a.correct||a.wrong-b.wrong||a.studentNo-b.studentNo)}
function classAverageRanks(students){const classes=new Map();for(const x of Object.values(students)){const c=Number(x.classNo);if(!c||Number(x.total?.correct||0)+Number(x.total?.wrong||0)<=0)continue;const row=classes.get(c)||{classNo:c,count:0,total:0};row.count++;row.total+=Number(x.total?.score||0);classes.set(c,row)}return [...classes.values()].map(x=>({...x,average:x.total/x.count})).sort((a,b)=>b.average-a.average||b.total-a.total||a.classNo-b.classNo)}

// Keep unchanged students intact and materialize only the fields used by the UI.
function studentView(snap,includeActivity=true,eventIds=[]){
 const out={};for(const field of ['classNo','studentNo','nickname','total','stages','currentStage','currentStageAt','presence'])out[field]=snap.child(field).val();
 if(includeActivity)out.activity=snap.child('activity').val();
 if(eventIds.length){out.processedEvents={};for(const id of eventIds)if(snap.child('processedEvents/'+id).exists())out.processedEvents[id]=true}
 return out;
}
function dashboardStudent(snap){
 const out=studentView(snap,false);out.activity={};
 snap.child('activity').forEach(day=>{
  const item={sessions:day.child('sessions').val(),locked:day.child('locked').val(),lastActiveAt:day.child('lastActiveAt').val(),stages:{}};
  day.child('stages').forEach(stage=>{item.stages[stage.key]={};for(const field of ['totalSolved','correct','wrong'])item.stages[stage.key][field]=stage.child(field).val()});
  out.activity[day.key]=item;
 });return out;
}
function watchStudents(ref,notify,onError,project=studentView){
 const students={};let ready=false,closed=false,timer=null;
 const emit=()=>{if(ready&&!closed&&!timer)timer=setTimeout(()=>{timer=null;if(!closed)notify({...students})},150)};
 const changed=snap=>{students[snap.key]=project(snap);emit()};
 const removed=snap=>{delete students[snap.key];emit()};
 const failed=e=>{if(!closed)onError?.(e)};
 ref.on('child_added',changed,failed);ref.on('child_changed',changed,failed);ref.on('child_removed',removed,failed);
 ref.once('value').then(()=>{ready=true;emit()},failed);
 return {off(){closed=true;clearTimeout(timer);ref.off('child_added',changed);ref.off('child_changed',changed);ref.off('child_removed',removed)}};
}
const api={dashboardStudent,studentView,watchStudents,ROOT,GAP,pad,dateKey,monthKey,addDays,sessionsFor,dayTotal,riskFor,applyResults,NICKNAME_ICONS,nicknameText,nicknameHTML,studentRankRows,classAverageRanks};global.FractionData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
