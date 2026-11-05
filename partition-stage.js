
const partitionBags = new Map();

function drawPartitionBag(key, values) {
  let bag = partitionBags.get(key);
  if (!bag?.length) {
    bag = [...values];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    partitionBags.set(key, bag);
  }
  return bag.pop();
}

function makeContinuous() {
  const kind = drawPartitionBag('kind', ['clock','clock','clock','planner','strip','strip','numberline','numberline']);
  const circular = kind === 'clock' || kind === 'planner';
  const parts = [2, 3, 4, 6];
  const d = drawPartitionBag(kind + '-parts', circular ? parts : [2, 3, 4, 5, 6]);
  const total = kind === 'clock' ? 12 : kind === 'planner' ? 24 : d * (Math.random() < .5 ? 2 : 3);
  const step = total / d;
  const rotation = circular ? drawPartitionBag(kind + '-rotation-' + d, Array.from({length:step}, (_, i) => i)) : 0;
  const equal = (count, offset = 0) =>
    Array.from({length:count - (circular ? 0 : 1)}, (_, i) => offset + (i + (circular ? 0 : 1)) * total / count);
  const uneven = Array.from({length:d - 1}, (_, i) => i + 1);
  const unevenReverse = uneven.map(x => total - x).reverse();
  const wrongCounts = circular ? parts.filter(n => n !== d).slice(0, 2) : [d + 1, d === 2 ? 4 : d - 1];
  const unequal = cuts => circular ? [0, ...cuts].map(x => (x + rotation) % total).sort((a,b) => a-b) : cuts;
  const options = [
    {cuts:equal(d, rotation), correct:true},
    {cuts:unequal(uneven), correct:false},
    {cuts:unequal(unevenReverse), correct:false},
    ...wrongCounts.map(n => ({
      cuts:circular ? equal(n, rotation % (total / n)) : equal(n).map(Math.round), correct:false
    }))
  ];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const subject = {clock:'시계판의 12시간', planner:'생활계획표의 하루 24시간', strip:total+' cm 색 띠', numberline:'수직선의 0 cm부터 '+total+' cm까지'};
  return {t:'continuous',kind,d,total,rotation,options,answer:options.findIndex(x => x.correct),
    prompt:subject[kind]+(circular?'을':'를')+' 똑같이 '+d+'부분으로 나눈 그림을 고르세요.'};
}

function partitionLengthSVG(question, option) {
  const left = 20, right = 326, y = 54, isStrip = question.kind === 'strip';
  const x = n => left + (right - left) * n / question.total;
  let svg = '<svg viewBox="0 21 368 '+(isStrip?87:69)+'" role="img" aria-label="'+(isStrip?'센티미터 눈금이 있는 색 띠':'센티미터 수직선')+'">';
  svg += '<path d="M'+left+' '+y+'H'+(right+(isStrip?0:13))+'" fill="none" stroke="var(--continuous-rim)" stroke-width="1.7"/>';
  if (isStrip) svg += '<rect x="'+left+'" y="66" width="'+(right-left)+'" height="32" rx="2" fill="var(--continuous-fill)" stroke="var(--continuous-rim)" stroke-width="1.7"/>';
  for (let i=0; i<=question.total; i++) {
    const pos=x(i);
    svg += '<path d="M'+pos+' '+(y-6)+'V'+(isStrip?y:y+6)+'" stroke="var(--continuous-rim)" stroke-width="1.5"/>';
    svg += '<text x="'+pos+'" y="'+(isStrip?40:79)+'" text-anchor="middle" font-size="13" fill="var(--continuous-text)">'+i+'</text>';
  }
  svg += '<text x="337" y="'+(isStrip?40:79)+'" font-size="12" fill="var(--continuous-text)">(cm)</text>';
  if (isStrip) {
    for (const cut of option.cuts) svg += '<path d="M'+x(cut)+' 66V98" stroke="var(--continuous-line)" stroke-width="2.6"/>';
  } else {
    const boundaries = [0, ...option.cuts, question.total];
    for (let i = 1; i < boundaries.length; i++) {
      const from = x(boundaries[i-1]), to = x(boundaries[i]);
      const rise = Math.min(27, (to-from)*.55);
      svg += '<path d="M'+from+' '+y+' Q'+((from+to)/2)+' '+(y-rise)+' '+to+' '+y+'" fill="none" stroke="var(--continuous-line)" stroke-width="1.8"/>';
    }
  }
  return svg+'</svg>';
}

function partitionClockSVG(question, option) {
  const planner=question.kind==='planner';
  const point=(value,radius) => {
    const angle=value/question.total*2*Math.PI;
    return [120+radius*Math.sin(angle),120-radius*Math.cos(angle)];
  };
  let svg='<svg viewBox="0 0 240 240" role="img" aria-label="'+(planner?'24시간 생활계획표':'1시부터 12시까지 표시한 시계')+'">';
  if (planner) svg+='<circle cx="120" cy="120" r="106" fill="#fffdf9" stroke="#3e4149" stroke-width="2.7"/>';
  else svg+='<circle cx="120" cy="120" r="106" fill="var(--continuous-fill)" stroke="var(--continuous-rim)" stroke-width="4"/><circle cx="120" cy="120" r="99" fill="#fffdf9" stroke="var(--continuous-rim)" stroke-width="1"/>';
  if (planner) {
    for (let i=0; i<24; i++) {
      svg+='<path d="M'+point(i,105).join(' ')+'L'+point(i,i%6===0?95:i%3===0?98:101).join(' ')+'" stroke="#3e4149" stroke-width="'+(i%6===0?2.2:1.2)+'"/>';
    }
  } else {
    for (let i=0; i<60; i++) {
      const major=i%5===0;
      svg+='<path d="M'+point(i/5,96).join(' ')+'L'+point(i/5,major?87:92).join(' ')+'" stroke="var(--continuous-rim)" stroke-width="'+(major?2:1)+'"/>';
    }
  }
  for (const value of option.cuts) {
    svg+='<path d="M120 120L'+point(value,98).join(' ')+'" stroke="var(--continuous-line)" stroke-width="2.8"/>';
  }
  const hours=planner?[24,3,6,9,12,15,18,21]:Array.from({length:12},(_,i)=>i+1);
  for (const hour of hours) {
    const [x,y]=point(hour,75);
    svg+='<text x="'+x+'" y="'+(y+6)+'" text-anchor="middle" font-size="18" font-weight="700" fill="'+(planner?'#3e4149':'var(--continuous-text)')+'" stroke="#fffdf9" stroke-width="4" paint-order="stroke">'+hour+'</text>';
  }
  return svg+'<circle cx="120" cy="120" r="4" fill="'+(planner?'#3e4149':'var(--continuous-line)')+'"/></svg>';
}

function renderContinuous() {
  const planner=q.kind==='planner';
  const circular=q.kind==='clock'||planner;
  const numbers=['①','②','③','④','⑤'];
  const cards=q.options.map((option,i) => {
    const svg=circular?partitionClockSVG(q,option):partitionLengthSVG(q,option);
    const motifs=['❀','☀','🍂','❄','✧'];
    const title=planner?'<span class="planner-title"><span aria-hidden="true">'+motifs[i]+'</span> 생활계획표 <span aria-hidden="true">'+motifs[i]+'</span></span>':'';
    return '<button type="button" class="continuous-option '+(planner?'planner-card planner-paper-'+i:circular?'':'length-option')+'" data-continuous="'+i+'" aria-pressed="false" aria-label="'+(i+1)+'번 그림"><strong>'+numbers[i]+'</strong>'+title+svg+'</button>';
  }).join('');
  return '<p class="continuous-instruction">부분의 개수와 각 부분의 '+(circular?'시간의 길이':'길이')+'를 함께 살펴 보세요.</p><div class="continuous-choices'+(circular?' time-choices':'')+'">'+cards+'</div>';
}

function continuousExplanation(question) {
  if (question.kind==='clock'||question.kind==='planner') {
    return question.total+'시간을 '+question.d+'부분으로 똑같이 나누면 한 부분은 '+(question.total/question.d)+'시간입니다. 나누기 시작하는 위치가 달라도 각 부분의 크기는 같습니다.';
  }
  return question.total+' cm를 '+question.d+'부분으로 똑같이 나누면 한 부분은 '+(question.total/question.d)+' cm입니다.';
}

function makeMeasuredFraction(type, measure) {
  const times = [
    { total:24, unit:'시간', whole:'하루', denominators:[2,3,4,6,8,12] },
    { total:7, unit:'일', whole:'일주일', denominators:[7] },
    { total:3, unit:'시간', whole:'3시간', denominators:[3] },
    { total:6, unit:'시간', whole:'6시간', denominators:[2,3,6] },
    { total:12, unit:'시간', whole:'12시간', denominators:[2,3,4,6] }
  ];
  let total, unit, whole, d;
  if (measure === 'time') {
    const entry = pick(times);
    ({total, unit, whole} = entry);
    d = pick(entry.denominators);
  } else {
    unit = pick(['mm','cm','m','km']);
    d = pick([2,3,4,5,6,7,8,10]);
    total = d * rnd(2,6);
    whole = total+' '+unit;
  }
  const n = rnd(1,d-1);
  const k = total/d;
  const used = n*k;
  const fraction = frac(n,d);
  const questionUnit = unit==='일' ? '며칠' : '몇 '+unit;
  let prompt = whole+'의 '+fraction+'만큼은 '+questionUnit+'일까요?';
  if (type==='remain') {
    const remaining = '<u class="remain-underline">남은 '+(measure==='time'?'시간':'길이')+'</u>';
    if (measure==='length') {
      prompt = '길이가 '+whole+'인 줄 중 '+fraction+'만큼 사용했습니다. '+remaining+'는 몇 '+unit+'일까요?';
    } else if (unit==='일') {
      prompt = '일주일의 '+fraction+'에 해당하는 날에 운동했습니다. 운동하지 않은 날은 며칠일까요?';
    } else {
      const activity = whole==='하루' ? '잠을 잤습니다' : '독서를 했습니다';
      prompt = whole+'의 '+fraction+' 동안 '+activity+'. '+remaining+'은 몇 시간일까요?';
    }
  }
  return {t:type,measure,total,unit,d,n,k,used,prompt,answer:type==='remain'?total-used:used};
}

function measuredFractionExplanation(question) {
  const {total,unit,d,n,k,used,answer,t} = question;
  const start = '전체 '+total+' '+unit+'를 '+d+'부분으로 똑같이 나누면 한 부분의 크기는 '+k+' '+unit+'입니다. '+n+'부분의 크기는 '+used+' '+unit+'입니다.';
  return t==='remain' ? start+' 전체에서 이만큼을 빼면 남은 양은 '+answer+' '+unit+'입니다.' : start;
}
