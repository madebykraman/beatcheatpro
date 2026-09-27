// BeatCheat Pro — reference detector v0.2.
// Evidence-first: BPM proposes hypotheses; audio evidence decides events.

function hann(n,N){return .5-.5*Math.cos(2*Math.PI*n/(N-1));}
function median(a){if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y);return b[(b.length-1)>>1];}
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:0;}
function std(a){const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)*(x-m))));}
function dft(frame,bins){
  const N=frame.length,re=new Float32Array(bins),im=new Float32Array(bins),mag=new Float32Array(bins);
  for(let k=0;k<bins;k++){let r=0,q=0,w=-2*Math.PI*k/N;for(let n=0;n<N;n++){const z=frame[n]*hann(n,N),a=w*n;r+=z*Math.cos(a);q+=z*Math.sin(a);}re[k]=r;im[k]=q;mag[k]=Math.hypot(r,q);}
  return{re,im,mag};
}
function resample(x,a,b){if(a===b)return x;const n=Math.max(1,Math.round(x.length*b/a)),y=new Float32Array(n),ratio=a/b;for(let i=0;i<n;i++){const p=i*ratio,j=Math.floor(p),k=Math.min(j+1,x.length-1),f=p-j;y[i]=x[j]*(1-f)+x[k]*f;}return y;}
function normalizeNovelty(raw,radius=18){
  const out=new Float32Array(raw.length);
  for(let i=0;i<raw.length;i++){const lo=Math.max(0,i-radius),hi=Math.min(raw.length,i+radius+1),a=[];for(let j=lo;j<hi;j++)a.push(raw[j]);out[i]=Math.max(0,(raw[i]-median(a))/(std(a)+1e-8));}
  return out;
}
function bandFlux(prev,current,lo,hi){
  let s=0;for(let k=lo;k<hi;k++)s+=Math.max(0,current[k]-prev[k]);return s;
}
function estimateTempo(novelty,rate,hop){
  const hyps=[];
  for(let bpm=55;bpm<=190;bpm+=.5){
    const lag=Math.round((60/bpm)*rate/hop);if(lag<2||lag>=novelty.length)continue;
    let s=0,n=0;for(let i=lag;i<novelty.length;i++){s+=novelty[i]*novelty[i-lag];n++;}
    hyps.push({bpm,lag,score:n?s/n:0});
  }
  hyps.sort((a,b)=>b.score-a.score);
  return hyps.slice(0,6);
}
function trackPhase(novelty,lag,search=5){
  let phase=0,best=-Infinity;
  for(let p=0;p<lag;p++){let s=0;for(let i=p;i<novelty.length;i+=lag){for(let d=-search;d<=search;d++){const j=i+d;if(j>=0&&j<novelty.length)s+=novelty[j]/(1+Math.abs(d));}}if(s>best){best=s;phase=p;}}
  return phase;
}
function analyze(samples,sampleRate,options={}){
  const rate=options.analysisRate||11025,x=resample(samples,sampleRate,rate),frame=1024,hop=256,bins=256,count=Math.max(0,Math.floor((x.length-frame)/hop));
  const low=new Float32Array(count),mid=new Float32Array(count),high=new Float32Array(count),energy=new Float32Array(count);
  let prev=null;
  for(let i=0;i<count;i++){
    const fr=x.subarray(i*hop,i*hop+frame),spec=dft(fr,bins),m=spec.mag;
    if(prev){
      low[i]=bandFlux(prev,m,2,32);
      mid[i]=bandFlux(prev,m,32,96);
      high[i]=bandFlux(prev,m,96,220);
    }
    let e=0;for(let n=0;n<fr.length;n++)e+=fr[n]*fr[n];energy[i]=Math.sqrt(e/fr.length);prev=m;
  }
  const nl=normalizeNovelty(low),nm=normalizeNovelty(mid),nh=normalizeNovelty(high),novelty=new Float32Array(count);
  for(let i=0;i<count;i++)novelty[i]=.55*nl[i]+.30*nm[i]+.15*nh[i];

  const minFrames=Math.max(1,Math.round((options.minSpacing??.16)*rate/hop)),threshold=options.threshold??.55,candidates=[];
  for(let i=2;i<count-2;i++){
    if(novelty[i]<threshold)continue;
    let peak=true;for(let j=Math.max(0,i-3);j<=Math.min(count-1,i+3);j++)if(j!==i&&novelty[j]>novelty[i])peak=false;
    if(!peak||candidates.length&&i-candidates[candidates.length-1].frame<minFrames)continue;
    const drum=.6*nl[i]+.3*nm[i]+.1*nh[i];
    candidates.push({frame:i,time:i*hop/rate,strength:novelty[i],drumStrength:drum});
  }

  const hypotheses=estimateTempo(novelty,rate,hop);
  if(!hypotheses.length)return{bpm:0,quality:0,duration:samples.length/sampleRate,events:[],novelty:Array.from(novelty),tempoHypotheses:[]};
  const best=hypotheses[0],phase=trackPhase(novelty,best.lag);
  const beats=[];
  for(let f=phase;f<count;f+=best.lag){
    let pf=f,bestLocal=-Infinity;for(let d=-5;d<=5;d++){const j=f+d;if(j>=0&&j<count&&novelty[j]>bestLocal){bestLocal=novelty[j];pf=j;}}
    const evidence=novelty[pf],nearest=candidates.reduce((a,c)=>!a||Math.abs(c.time-pf*hop/rate)<Math.abs(a.time-pf*hop/rate)?c:a,null);
    const near=nearest&&Math.abs(nearest.time-pf*hop/rate)<.09;
    beats.push({time:near?nearest.time:pf*hop/rate,type:"beat",confidence:Math.min(1,.40+evidence/5+(near?.16:0)),strength:evidence,source:near?"onset+beat":"beat-grid"});
  }

  const events=[...beats];
  for(const c of candidates)if(c.strength>=1.15&&!beats.some(b=>Math.abs(b.time-c.time)<.075)){
    events.push({time:c.time,type:"onset",confidence:Math.min(1,.42+c.strength/4),strength:c.strength,source:"spectral-flux"});
  }

  // Infer bar phase only when the beat evidence is sufficiently stable.
  const stable=best.score>0.08;
  if(stable&&beats.length>=8){
    let barBest=0,barScore=-Infinity;
    for(let p=0;p<4;p++){let s=0;for(let i=p;i<beats.length;i+=4)s+=beats[i].strength||0;if(s>barScore){barScore=s;barBest=p;}}
    for(let i=barBest;i<beats.length;i+=4){beats[i].type="downbeat";beats[i].confidence=Math.min(1,beats[i].confidence+.10);beats[i].source+=":bar";}
  }

  events.sort((a,b)=>a.time-b.time);
  const quality=Math.max(0,Math.min(1,.30+best.score/(best.score+1.5)));
  return{bpm:best.bpm,quality,duration:samples.length/sampleRate,events,novelty:Array.from(novelty),tempoHypotheses:hypotheses,analysisRate:rate};
}
module.exports={analyze,estimateTempo};