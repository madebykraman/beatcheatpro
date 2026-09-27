// BeatCheat Pro — onset/beat analysis.
// Design goal: actual musical events first; BPM is a structural prior, never the answer.

function hann(n, N) { return 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)); }
function median(a) { if (!a.length) return 0; const b = [...a].sort((x,y)=>x-y); return b[(b.length-1)>>1]; }
function mean(a) { return a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0; }
function std(a) { const m=mean(a); return Math.sqrt(mean(a.map(x=>(x-m)*(x-m)))); }

function dftMagnitudes(frame, bins) {
  const N=frame.length, out=new Float32Array(bins);
  for (let k=0;k<bins;k++) {
    let re=0, im=0, w=-2*Math.PI*k/N;
    for (let n=0;n<N;n++) { const a=w*n, x=frame[n]*hann(n,N); re+=x*Math.cos(a); im+=x*Math.sin(a); }
    out[k]=Math.hypot(re,im);
  }
  return out;
}

function resampleLinear(x, fromRate, toRate) {
  if (fromRate === toRate) return x;
  const n=Math.max(1,Math.round(x.length*toRate/fromRate)), y=new Float32Array(n), ratio=fromRate/toRate;
  for(let i=0;i<n;i++){const p=i*ratio, a=Math.floor(p), b=Math.min(a+1,x.length-1), f=p-a; y[i]=x[a]*(1-f)+x[b]*f;}
  return y;
}

export function analyze(samples, sampleRate, options={}) {
  const targetRate=options.analysisRate||11025;
  const x=resampleLinear(samples,sampleRate,targetRate);
  const frame=1024, hop=256, bins=256;
  const count=Math.max(0,Math.floor((x.length-frame)/hop));
  const flux=new Float32Array(count), energy=new Float32Array(count);
  let prev=new Float32Array(bins);

  for(let i=0;i<count;i++){
    const start=i*hop, fr=x.subarray(start,start+frame), mag=dftMagnitudes(fr,bins);
    let f=0,e=0;
    for(let k=0;k<bins;k++){const d=mag[k]-prev[k]; if(d>0) f+=d; prev[k]=mag[k];}
    for(let n=0;n<fr.length;n++) e+=fr[n]*fr[n];
    flux[i]=f; energy[i]=Math.sqrt(e/fr.length);
  }

  // Normalize against slow local statistics so loud sections do not dominate.
  const novelty=new Float32Array(count), radius=18;
  for(let i=0;i<count;i++){
    const lo=Math.max(0,i-radius), hi=Math.min(count,i+radius+1), local=[];
    for(let j=lo;j<hi;j++) local.push(flux[j]);
    const base=median(local), scale=std(local)+1e-8;
    novelty[i]=Math.max(0,(flux[i]-base)/scale);
  }

  // Peak-pick actual onset candidates.
  const minFrames=Math.max(1,Math.round((options.minSpacing||0.22)*targetRate/hop));
  const threshold=options.threshold||0.55;
  const candidates=[];
  for(let i=2;i<count-2;i++){
    if(novelty[i] < threshold) continue;
    let peak=true;
    for(let j=Math.max(0,i-2);j<=Math.min(count-1,i+2);j++) if(j!==i && novelty[j]>novelty[i]) peak=false;
    if(!peak || (candidates.length && i-candidates[candidates.length-1].frame<minFrames)) continue;
    candidates.push({frame:i,time:i*hop/targetRate,strength:novelty[i]});
  }

  // Tempo estimate from autocorrelation of the onset envelope.
  const minBpm=55,maxBpm=190;
  let bestLag=0,bestScore=-Infinity;
  for(let bpm=minBpm;bpm<=maxBpm;bpm+=0.5){
    const lag=Math.round((60/bpm)*targetRate/hop);
    if(lag<2 || lag>=count) continue;
    let s=0,n=0;
    for(let i=lag;i<count;i++){s+=novelty[i]*novelty[i-lag];n++;}
    const score=n?s/n:0;
    if(score>bestScore){bestScore=score;bestLag=lag;}
  }
  const bpm=bestLag ? 60/(bestLag*hop/targetRate) : 0;

  // Refine beat phase against real onsets. This prevents a synthetic BPM grid
  // from drifting away from the audio.
  const period=bestLag||Math.round(0.5*targetRate/hop);
  let bestPhase=0,bestPhaseScore=-Infinity;
  for(let phase=0;phase<period;phase++){
    let s=0;
    for(let t=phase;t<count;t+=period) s+=novelty[t];
    if(s>bestPhaseScore){bestPhaseScore=s;bestPhase=phase;}
  }

  const beats=[];
  for(let f=bestPhase;f<count;f+=period){
    const lo=Math.max(0,f-3),hi=Math.min(count-1,f+3);
    let pf=f;
    for(let j=lo;j<=hi;j++) if(novelty[j]>novelty[pf]) pf=j;
    const t=pf*hop/targetRate;
    beats.push({time:t,type:"beat",confidence:Math.min(1,0.45+novelty[pf]/6),strength:novelty[pf]});
  }

  // Merge true onset candidates with beat structure. A candidate near a beat
  // upgrades the beat confidence; off-grid candidates remain independent.
  for(const b of beats){
    const near=candidates.reduce((best,c)=>Math.abs(c.time-b.time)<Math.abs((best?.time??1e9)-b.time)?c:best,null);
    if(near && Math.abs(near.time-b.time)<0.085){
      b.time=near.time; b.confidence=Math.min(1,Math.max(b.confidence,0.55+near.strength/5)); b.source="onset+beat";
    } else b.source="beat-grid";
  }

  const events=[...beats];
  for(const c of candidates){
    if(!beats.some(b=>Math.abs(b.time-c.time)<0.08) && c.strength>=1.15){
      events.push({time:c.time,type:"onset",confidence:Math.min(1,0.45+c.strength/4),strength:c.strength,source:"spectral-flux"});
    }
  }
  events.sort((a,b)=>a.time-b.time);

  const quality=Math.min(1,0.35+bestScore/(bestScore+2));
  return {bpm,quality,duration:samples.length/sampleRate,events,novelty:Array.from(novelty),analysisRate:targetRate};
}