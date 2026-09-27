const {entrypoints}=require("uxp");
const {localFileSystem}=require("uxp").storage;
const ppro=require("premierepro"),app=ppro.app;
let analysis=null,loadedAudio=null,mapping=null,cutPlan=null;
function $(id){return document.getElementById(id);}
function setStatus(s){$("status").textContent=s;}
function selectedEvents(){
  const threshold=Number($("confidence").value);
  return (analysis?.events||[]).filter(e=>e.confidence>=threshold&&((($("beats").checked||$("downbeats").checked)&&(e.type==="beat"||e.type==="downbeat"))||($("onsets").checked&&e.type==="onset"))&&(!(e.type==="downbeat")||$("downbeats").checked));
}
async function chooseAudio(){
  const file=await localFileSystem.getFileForOpening({types:["wav"]});if(!file)return;
  try{const buffer=await file.read({format:"binary"});loadedAudio={file,buffer};$("fileName").textContent=file.name;$("analyze").disabled=false;$("mapClip").disabled=false;setStatus("Audio loaded. Ready to analyze.");}
  catch(e){setStatus("Could not read audio: "+e.message);}
}
async function mapSelectedClip(){
  if(!loadedAudio)return;
  try{
    const project=await app.Project.getActiveProject(),sequence=await project.getActiveSequence(),selection=await sequence.getSelection();
    const items=await selection.getTrackItems();
    if(!items.length)throw new Error("Select the matching audio clip in the timeline first.");
    const item=items[0],name=await item.getName(),start=(await item.getStartTime()).seconds,inPoint=(await item.getInPoint()).seconds,speed=await item.getSpeed();
    const {buildMapping}=require("./src/timeline.js");
    mapping=buildMapping(loadedAudio.file.name,{name},start,inPoint,speed);
    $("mapping").textContent=(mapping.sourceNameMatches?"Mapped":"Warning: filename mismatch")+" · sequence "+start.toFixed(3)+"s · source in "+inPoint.toFixed(3)+"s · speed "+speed.toFixed(3)+"x";
    setStatus(mapping.sourceNameMatches?"Timeline mapping calibrated.":"Mapping created, but verify the selected clip is the same source.");
  }catch(e){setStatus("Mapping failed: "+e.message);}
}
async function runAnalysis(){
  if(!loadedAudio)return;
  setStatus("Analyzing waveform and onset envelope…");$("analyze").disabled=true;
  try{
    const {decodeWav}=require("./src/wav.js"),{analyze}=require("./src/dsp.js"),{getNativeAddon}=require("./src/native.js"),wav=decodeWav(loadedAudio.buffer);
    const native=getNativeAddon();
    if(native&&typeof native.analyze==="function"){
      const raw=native.analyze(wav.samples.buffer,wav.sampleRate);
      const parsed=typeof raw==="string"?JSON.parse(raw):raw;
      analysis={...parsed,events:parsed.events.map(e=>({time:e.time,confidence:e.confidence,strength:e.strength,type:e.type===2?"downbeat":e.type===1?"onset":"beat",source:"native-dsp"})),duration:wav.duration};
    }else{
      analysis=analyze(wav.samples,wav.sampleRate,{threshold:Number($("confidence").value),minSpacing:Number($("spacing").value)});
    }
    const visible=selectedEvents();
    $("bpm").textContent=analysis.bpm?analysis.bpm.toFixed(1):"—";$("events").textContent=visible.length;$("quality").textContent=Math.round(analysis.quality*100)+"%";
    $("previewCuts").disabled=!visible.length;$("markers").disabled=!visible.length;$("cutCount").textContent="—";
    $("cutPreview").hidden=true;cutPlan=null;
    setStatus("Analysis complete. "+visible.length+" musical events ready.");
  }catch(e){setStatus("Analysis failed: "+e.message);}finally{$("analyze").disabled=false;}
}
function previewCuts(){
  if(!analysis)return;
  try{
    const {buildTimelineCutPlan}=require("./src/cut-plan.js");
    cutPlan=buildTimelineCutPlan(selectedEvents(),mapping,{threshold:Number($("confidence").value),minEventSpacing:Number($("spacing").value),minShotLength:.35});
    $("cutCount").textContent=cutPlan.length;
    $("cutList").innerHTML=cutPlan.slice(0,24).map((item,i)=>'<div class="cut-row"><span>'+(String(i+1).padStart(2,"0"))+'</span><strong>'+item.sequenceTime.toFixed(3)+'s</strong><em>'+item.score.toFixed(2)+'</em><small>'+item.reason+'</small></div>').join("")||( '<div class="muted">No candidates meet the current safety threshold.</div>');
    $("cutPreview").hidden=false;
    setStatus(cutPlan.length+" safe cut candidates generated. Nothing has been changed in the timeline.");
  }catch(e){setStatus("Cut preview failed: "+e.message);}
}
async function createMarkers(){
  if(!analysis)return;
  try{
    const project=await app.Project.getActiveProject(),sequence=await project.getActiveSequence();if(!sequence)throw new Error("No active Premiere sequence.");
    const markers=await ppro.Markers.getMarkers(sequence);
    const events=selectedEvents();
    const {sourceToSequenceSeconds}=require("./src/timeline.js");
    const plan=events.map(e=>{const t=mapping?sourceToSequenceSeconds(mapping,e.time):e.time;return{name:e.type==="downbeat"?"BC DOWNBEAT":e.type==="beat"?"BC BEAT":"BC ONSET",time:ppro.TickTime.createWithSeconds(t),duration:ppro.TickTime.createWithSeconds(0),comments:"BeatCheat Pro | confidence="+e.confidence.toFixed(2)+" | source="+e.source+(mapping?" | mapped":" | sequence-zero")};});
    const committed=project.lockedAccess(()=>project.executeTransaction(compound=>{for(const item of plan)compound.addAction(markers.createAddMarkerAction(item.name,"Comment",item.time,item.duration,item.comments));},"BeatCheat Pro — Create Beat Markers"));
    if(!committed)throw new Error("Premiere rejected the marker transaction.");
    setStatus("Created "+events.length+" BeatCheat Pro markers.");
  }catch(e){setStatus("Marker export failed: "+e.message);}
}
$("choose").addEventListener("click",chooseAudio);
$("mapClip").addEventListener("click",mapSelectedClip);
$("analyze").addEventListener("click",runAnalysis);
$("previewCuts").addEventListener("click",previewCuts);
$("markers").addEventListener("click",createMarkers);
$("confidence").addEventListener("input",e=>{$("confidenceOut").textContent=Number(e.target.value).toFixed(2);if(analysis)$("previewCuts").disabled=!selectedEvents().length;});
$("spacing").addEventListener("input",e=>{$("spacingOut").textContent=Number(e.target.value).toFixed(2)+"s";});
entrypoints.setup({plugin:{create(){console.log("BeatCheat Pro loaded");}},panels:{"beatcheat-panel":{show(){}}},commands:{"analyze-command":()=>setStatus("Open the BeatCheat Pro panel to choose audio and analyze.")}});
