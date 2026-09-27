// BeatCheat Pro detector contract.
// JS and native Hybrid DSP implementations must return this shape.
const DetectorEventType=Object.freeze({BEAT:"beat",ONSET:"onset",DOWNBEAT:"downbeat"});
function validateResult(result){
  if(!result||!Array.isArray(result.events))throw new Error("Invalid BeatCheat Pro detector result.");
  for(const e of result.events){
    if(!Number.isFinite(e.time)||e.time<0)throw new Error("Detector event has invalid time.");
    if(!["beat","onset","downbeat"].includes(e.type))throw new Error("Detector event has invalid type.");
    if(!Number.isFinite(e.confidence)||e.confidence<0||e.confidence>1)throw new Error("Detector confidence must be 0..1.");
  }
  return result;
}
module.exports={DetectorEventType,validateResult};