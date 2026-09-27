// BeatCheat Pro — event normalization and conservative cut policy.
function clamp(x,a=0,b=1){return Math.max(a,Math.min(b,x));}
const EVENT_PRIORITY={downbeat:3,beat:2,onset:1};

function normalizeEvents(events,options={}){
  const minSpacing=options.minSpacing??0.16,out=[];
  for(const event of [...events].sort((a,b)=>a.time-b.time)){
    if(!Number.isFinite(event.time)||event.time<0)continue;
    const normalized={...event,confidence:clamp(Number(event.confidence)||0),strength:Math.max(0,Number(event.strength)||0)};
    const previous=out[out.length-1];
    if(previous&&normalized.time-previous.time<minSpacing){
      const p=EVENT_PRIORITY[previous.type]||0,n=EVENT_PRIORITY[normalized.type]||0;
      if(normalized.confidence>previous.confidence||(normalized.confidence===previous.confidence&&n>p))out[out.length-1]=normalized;
      continue;
    }
    out.push(normalized);
  }
  return out;
}
function scoreCutCandidate(event,context={}){
  const confidence=clamp(event.confidence||0),strength=clamp((event.strength||0)/4);
  const sourceBonus=event.source==="onset+beat"?.12:event.source==="native-dsp"?.06:event.source==="spectral-flux"?.04:0;
  const typeBonus=event.type==="downbeat"?.05:event.type==="beat"?.02:0;
  const evidenceBonus=context.hasNearbyOnset?.08:0;
  const boundaryPenalty=context.nearExistingCut?.30:0;
  const shortClipPenalty=context.shortShot?.20:0;
  return clamp(.48*confidence+.28*strength+sourceBonus+typeBonus+evidenceBonus-boundaryPenalty-shortClipPenalty);
}
function buildCutPlan(events,options={}){
  const minShot=options.minShotLength??.35,threshold=options.threshold??.78,onsetWindow=options.onsetWindow??.075,plan=[];
  const normalized=normalizeEvents(events,{minSpacing:options.minEventSpacing??.16});
  for(const event of normalized){
    const nearbyOnset=normalized.some(other=>other!==event&&other.type==="onset"&&Math.abs(other.time-event.time)<=onsetWindow);
    const nearExistingCut=plan.length&&event.time-plan[plan.length-1].time<minShot;
    const score=scoreCutCandidate(event,{nearExistingCut:!!nearExistingCut,hasNearbyOnset:nearbyOnset});
    if(score<threshold||nearExistingCut)continue;
    plan.push({time:event.time,eventType:event.type,confidence:event.confidence,strength:event.strength,score,source:event.source,reason:nearbyOnset?"beat reinforced by nearby audio onset":event.type==="downbeat"?"strong bar-start candidate":"strong audio event"});
  }
  return plan;
}
module.exports={normalizeEvents,scoreCutCandidate,buildCutPlan};