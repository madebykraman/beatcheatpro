const {entrypoints}=require("uxp");
const {localFileSystem}=require("uxp").storage;
const ppro=require("premierepro"),app=ppro.app;
let analysis=null,loadedAudio=null;
function $(id){return document.getElementById(id);}
function setStatus(s){$("status").textContent=s;}
async function chooseAudio(){
  const file=await localFileSystem.getFileForOpening({types:["wav"]});if(!file)return;
  try{const buffer=await file.read({format:"binary"});loadedAudio={file,buffer};$("fileName").textContent=file.name;$("analyze").disabled=false;setStatus("Audio loaded. Ready to analyze.");}
  catch(e){setStatus("Could not read audio: "+e.message);}
}
async function runAnalysis(){
  if(!loadedAudio)return;setStatus("Analyzing waveform and onset envelope…");$("analyze").disabled=true;
  try{
    const {decodeWav}=require("./src/wav.js"),{analyze}=require("./src/dsp.js"),wav=decodeWav(loadedAudio.buffer);
    analysis=analyze(wav.samples,wav.sampleRate,{threshold:Number($("confidence").value),minSpacing:Number($("spacing").value)});
    const visible=analysis.events.filter(e=>e.confidence>=Number($("confidence").value)&&(($("beats").checked&&e.type==="beat")||($("onsets").checked&&e.type==="onset")));
    $("bpm").textContent=analysis.bpm?analysis.bpm.toFixed(1):"—";$("events").textContent=visible.length;$("quality").textContent=Math.round(analysis.quality*100)+"%";$("markers").disabled=!visible.length;setStatus("Analysis complete. "+visible.length+" musical events ready.");
  }catch(e){setStatus("Analysis failed: "+e.message);}finally{$("analyze").disabled=false;}
}
async function createMarkers(){
  if(!analysis)return;
  try{
    const project=await app.Project.getActiveProject(),sequence=await project.getActiveSequence();if(!sequence)throw new Error("No active Premiere sequence.");
    const markers=await ppro.Markers.getMarkers(sequence),threshold=Number($("confidence").value),useBeats=$("beats").checked,useOnsets=$("onsets").checked;
    const events=analysis.events.filter(e=>e.confidence>=threshold&&((useBeats&&e.type==="beat")||(useOnsets&&e.type==="onset")));
    const plan=events.map(e=>({name:e.type==="beat"?"BC BEAT":"BC ONSET",time:ppro.TickTime.createWithSeconds(e.time),duration:ppro.TickTime.createWithSeconds(0),comments:"BeatCheat Pro | confidence="+e.confidence.toFixed(2)+" | source="+e.source}));
    const committed=project.lockedAccess(()=>project.executeTransaction(compound=>{
      for(const item of plan)compound.addAction(markers.createAddMarkerAction(item.name,"Comment",item.time,item.duration,item.comments));
    },"BeatCheat Pro — Create Beat Markers"));
    if(!committed)throw new Error("Premiere rejected the marker transaction.");
    setStatus("Created "+events.length+" BeatCheat Pro markers.");
  }catch(e){setStatus("Marker export failed: "+e.message);}
}
$("choose").addEventListener("click",chooseAudio);$("analyze").addEventListener("click",runAnalysis);$("markers").addEventListener("click",createMarkers);
$("confidence").addEventListener("input",e=>$("confidenceOut").textContent=Number(e.target.value).toFixed(2));
$("spacing").addEventListener("input",e=>$("spacingOut").textContent=Number(e.target.value).toFixed(2)+"s");
entrypoints.setup({plugin:{create(){console.log("BeatCheat Pro loaded");}},panels:{"beatcheat-panel":{show(){}}},commands:{"analyze-command":()=>setStatus("Open the BeatCheat Pro panel to choose audio and analyze.")}});