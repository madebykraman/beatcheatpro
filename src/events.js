// BeatCheat Pro — event normalization and cut policy.
function clamp(x,a=0,b=1){return Math.max(a,Math.min(b,x));}
function normalizeEvents(events,options={}){
  const minSpacing=options.minSpacing??0.16,out=[];
  for(const event of [...events].sort((a,b)=>a.time-b.time)){
    if(!Number.isFinite(event.time)||event.time<0)continue;
    if(out.length&&event.time-out[out.length-1].time<minSpacing){
      if(event.confidence>(out[out.length-1].confidence||0))out[out.length-1]={...event};
      continue;
    }
    out.push({...event,confidence:clamp(Number(event.confidence)||0)});
  }
  return out;
}
function scoreCutCandidate(event,context={}){
  const confidence=clamp(event.confidence||0),strength=clamp((event.strength||0)/4);
  const sourceBonus=event.source==="onset+beat"?.12:event.source==="spectral-flux"?.04:0;
  const boundaryPenalty=context.nearExistingCut?.30:0;
  return clamp(.55*confidence+.33*strength+sourceBonus-boundaryPenalty);
}
function buildCutPlan(events,options={}){
  const minShot=options.minShotLength??.35,threshold=options.threshold??.78,plan=[];
  for(const event of normalizeEvents(events,{minSpacing:options.minEventSpacing??.16})){
    const score=scoreCutCandidate(event,{nearExistingCut:plan.length&&event.time-plan[plan.length-1].time<minShot});
    if(score<threshold)continue;
    if(plan.length&&event.time-plan[plan.length-1].time<minShot)continue;
    plan.push({time:event.time,eventType:event.type,confidence:event.confidence,score,source:event.source,reason:event.source==="onset+beat"?"beat confirmed by audio onset":"strong audio event"});
  }
  return plan;
}
module.exports={normalizeEvents,scoreCutCandidate,buildCutPlan};