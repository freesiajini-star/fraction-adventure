(function(global){
'use strict';
const ROOT='fractionAdventure17/monthly', GAP=30*60*1000;
const pad=n=>String(n).padStart(2,'0');
const dateFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});const dateKey=d=>dateFormatter.format(d);
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

// Network scope matters: project(snapshot) runs AFTER Firebase downloads it.
// Discover keys with shallow REST, then subscribe only to displayed child paths.
const rosterLoads=new Map();
async function studentKeys(ref){
 const directory=ref.parent.child('lightRoster'),cached=(await directory.once('value')).val();if(cached?.v===3)return Object.keys(cached.keys||{});
 // One-time monthly bootstrap reads nickname leaves only, never student histories.
 const id=ref.toString();if(rosterLoads.has(id))return rosterLoads.get(id);const job=(async()=>{const found={};for(let c=1;c<=12;c++){const group=await Promise.all(Array.from({length:40},async(_,i)=>{const key='c'+c+'s'+pad(i+1),name=(await ref.child(key+'/nickname').once('value')).val();return name?key:null}));for(const key of group)if(key)found[key]=true}
 const result=await directory.transaction(value=>({v:3,keys:{...value?.keys,...found}}));return Object.keys(result.snapshot.val()?.keys||{});})();rosterLoads.set(id,job);try{return await job}finally{rosterLoads.delete(id)}
}
async function readNicknames(ref,classNo){
 const keys=(await studentKeys(ref)).filter(key=>key.startsWith('c'+Number(classNo)+'s'));
 const entries=await Promise.all(keys.map(async key=>[key,{classNo:Number(classNo),nickname:(await ref.child(key+'/nickname').once('value')).val()}]));return Object.fromEntries(entries);
}
function watchStudentsLight(ref,notify,onError,project=studentView,ownKey=null,ownOnly=false){
 const records={},subscriptions=new Map(),dirty=new Set();let closed=false,timer=null,busy=false,own=null,paused=ownKey!==null&&!ownOnly&&!!global.document?.hidden;const directory=ref.parent.child('lightRoster/keys');
 const empty={val:()=>null,exists:()=>false,forEach:()=>false};
 const month=ref.parent.key;
 const dates=()=>{const count=month===monthKey(new Date())?Number(dateKey(new Date()).slice(-2)):new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();return Array.from({length:count},(_,i)=>month+'-'+pad(i+1))};
 const flush=()=>{timer=null;if(closed)return;for(const key of dirty){const row=subscriptions.get(key);if(row){const days={};for(const date of dates()){const day={};for(const field of ['t','g','r','s','last','c']){const value=row.snaps['compactV3/days/'+date+'/'+field]?.val();if(value!=null)day[field]=value}if(Object.keys(day).length)days[date]=day}records[key]=global.Ledger3.fold(project({key,child:name=>row.snaps[name]||empty}),days)}}dirty.clear();notify({...records},{ready:[...subscriptions.values()].every(row=>[...row.handlers.keys()].every(field=>Object.hasOwn(row.snaps,field)))})};
 const changed=key=>{dirty.add(key);if(!timer&&!closed)timer=setTimeout(flush,150)};
 const listen=(key,field)=>{const row=subscriptions.get(key);if(!row||row.handlers.has(field)||(paused&&ownKey!==null&&key!==own))return;const leaf=ref.child(key+'/'+field),handler=snap=>{if(closed||subscriptions.get(key)!==row)return;row.snaps[field]=snap;if(field==='classNo')refreshStages(key);changed(key)};row.handlers.set(field,[leaf,handler]);leaf.on('value',handler,onError)};
 const unlisten=(row,field)=>{const item=row.handlers.get(field);if(item){item[0].off('value',item[1]);row.handlers.delete(field);delete row.snaps[field]}};
 function refreshDays(key){const row=subscriptions.get(key);if(!row)return;const mine=key===own,teacher=ownKey===null,ownClass=Number(/^c(\d+)s/.exec(own||'')?.[1]||0),same=teacher||!!ownClass&&Number(row.snaps.classNo?.val())===ownClass;
  for(const date of dates())for(const field of ['t','g','r','s','last','c']){const name='compactV3/days/'+date+'/'+field,wanted=field==='t'||(field==='g'&&(teacher||mine))||(field==='r'&&same&&!teacher&&!mine)||((field==='s'||field==='last')&&(teacher||mine))||(field==='c'&&mine);if(wanted)listen(key,name);else unlisten(row,name)}
 }
 function refreshStages(key){const row=subscriptions.get(key);if(!row)return;const ownClass=Number(/^c(\d+)s/.exec(own||'')?.[1]||0);if(ownKey===null||(ownClass&&Number(row.snaps.classNo?.val())===ownClass))listen(key,'stages');else unlisten(row,'stages');refreshDays(key)}
const add=key=>{if(!subscriptions.has(key))subscriptions.set(key,{snaps:{},handlers:new Map()});for(const field of (ownKey===null?['classNo','studentNo','nickname','total','presence','currentStage','currentStageAt']:['classNo','studentNo','nickname','total']))listen(key,field);refreshStages(key);if(ownKey===null||key===own)listen(key,'activity')};
 const drop=key=>{const row=subscriptions.get(key);if(row)for(const field of [...row.handlers.keys()])unlisten(row,field);subscriptions.delete(key);delete records[key];dirty.delete(key)};
 function setOwn(key){if(own===key)return;const previous=own;own=key||null;if(previous&&ownKey!==null){const row=subscriptions.get(previous);if(row){unlisten(row,'activity');for(const field of [...row.handlers.keys()])if(field.startsWith('processedEvents/'))unlisten(row,field);changed(previous)}}if(own){add(own);listen(own,'activity');(ownOnly?Promise.resolve():studentKeys(ref)).then(()=>{if(!closed&&own&&!ownOnly)directory.child(own).set(true)}).catch(error=>{if(!closed)onError?.(error)})}for(const key of subscriptions.keys())refreshStages(key)}
 async function discover(){
  if(closed||busy)return;busy=true;
  try{
   if(ownKey)setOwn(ownKey());
   const keys=ownOnly?(own?[own]:[]):await studentKeys(ref);if(closed)return;
   const active=new Set(keys);if(own)active.add(own);
   for(const key of active)add(key);for(const key of [...subscriptions.keys()])if(!active.has(key))drop(key);
   if(!timer)timer=setTimeout(flush,150);
  }catch(error){if(!closed)onError?.(error)}finally{busy=false}
 }
 const rosterAdded=snap=>{if(!closed&&/^c[0-9]{1,2}s[0-9]{2}$/.test(snap.key))add(snap.key)};const rosterRemoved=snap=>{if(!closed&&snap.key!==own){drop(snap.key);if(!timer)timer=setTimeout(flush,150)}};
const dayTimer=setInterval(()=>{for(const key of subscriptions.keys())refreshDays(key)},15000);discover().then(()=>{if(!closed&&!ownOnly){directory.on('child_added',rosterAdded,onError);directory.on('child_removed',rosterRemoved,onError)}});
 return {setOwn,pause(){if(ownKey===null||ownOnly)return;paused=true;for(const [key,row]of subscriptions)if(key!==own)for(const [field,[leaf,handler]]of row.handlers){leaf.off('value',handler);row.handlers.delete(field)}},resume(){if(closed)return;paused=false;for(const key of subscriptions.keys())add(key)},applyDayLocal(key,days){add(key);const row=subscriptions.get(key);for(const [date,day]of Object.entries(days))for(const field of ['t','g','r','s','last','c']){const value=day[field]??null;row.snaps['compactV3/days/'+date+'/'+field]={val:()=>value}}dirty.add(key);clearTimeout(timer);flush()},watchReceipts(ids){if(!own)return;add(own);const row=subscriptions.get(own),wanted=new Set(ids.map(id=>'processedEvents/'+id));for(const field of [...row.handlers.keys()])if(field.startsWith('processedEvents/')&&!wanted.has(field))unlisten(row,field);for(const field of wanted)listen(own,field)},off(){closed=true;directory.off('child_added',rosterAdded);directory.off('child_removed',rosterRemoved);clearInterval(dayTimer);clearTimeout(timer);for(const key of [...subscriptions.keys()])drop(key)}};
}
async function readMonthLight(ref){return new Promise((resolve,reject)=>{let watch;watch=watchStudentsLight(ref,(data,meta)=>{if(meta.ready){watch.off();resolve(data)}},error=>{watch?.off();reject(error)},dashboardStudent)})}
function watchStudentLight(ref,key,notify,onError){return watchStudentsLight(ref,data=>notify(data[key]||{}),onError,studentView,()=>key,true)}
const api={watchStudentLight,readMonthLight,studentKeys,readNicknames,watchStudentsLight,dashboardStudent,studentView,watchStudents,ROOT,GAP,pad,dateKey,monthKey,addDays,sessionsFor,dayTotal,riskFor,applyResults,NICKNAME_ICONS,nicknameText,nicknameHTML,studentRankRows,classAverageRanks};global.FractionData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
