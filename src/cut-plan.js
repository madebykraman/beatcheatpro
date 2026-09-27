const {buildCutPlan}=require("./events.js");

function buildTimelineCutPlan(events,mapping,options={}){
  const sequenceEvents=events.map(event=>({...event,sequenceTime:mapping?mapping.sequenceStartSeconds+(event.time-mapping.sourceInSeconds)/mapping.speed:event.time}));
  const plan=buildCutPlan(sequenceEvents.map(event=>({...event,time:event.sequenceTime})),options);
  return plan.map(item=>({...item,sourceTime:mapping?mapping.sourceInSeconds+(item.time-mapping.sequenceStartSeconds)*mapping.speed:item.time,sequenceTime:item.time}));
}

function buildSegments(cutPlan,clipStartSeconds,clipEndSeconds){
  if(!Number.isFinite(clipStartSeconds)||!Number.isFinite(clipEndSeconds)||clipEndSeconds<=clipStartSeconds)return [];
  const cuts=[...new Set(cutPlan.map(item=>item.sequenceTime).filter(time=>Number.isFinite(time)&&time>clipStartSeconds&&time<clipEndSeconds))].sort((a,b)=>a-b);
  const boundaries=[clipStartSeconds,...cuts,clipEndSeconds];
  return boundaries.slice(0,-1).map((start,i)=>({index:i,start,end:boundaries[i+1],duration:boundaries[i+1]-start,cutAtStart:i>0,cutAtEnd:i<boundaries.length-2}));
}
module.exports={buildTimelineCutPlan,buildSegments};