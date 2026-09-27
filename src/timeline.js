// BeatCheat Pro — sequence-time mapping.
function fileStem(name){return String(name||"").replace(/\.[^.]+$/,"").toLowerCase();}
function buildMapping(audioFileName,trackItem,startTimeSeconds,inPointSeconds,speed){
  const expected=fileStem(audioFileName),actual=fileStem(trackItem.name||"");
  const sourceNameMatches=expected===actual||expected.includes(actual)||actual.includes(expected);
  const rate=Number.isFinite(speed)&&speed!==0?speed:1;
  return{sourceNameMatches,sourceFileName:audioFileName,sequenceStartSeconds:startTimeSeconds,sourceInSeconds:inPointSeconds,speed:rate};
}
function sourceToSequenceSeconds(mapping,sourceSeconds){return mapping.sequenceStartSeconds+(sourceSeconds-mapping.sourceInSeconds)/mapping.speed;}
module.exports={buildMapping,sourceToSequenceSeconds};