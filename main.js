const { entrypoints } = require("uxp");
const { localFileSystem } = require("uxp").storage;
const app = require("premierepro").app;

let analysis = null;
let loadedAudio = null;

function $(id){ return document.getElementById(id); }
function setStatus(s){ $("status").textContent=s; }

async function chooseAudio(){
  const file=await localFileSystem.getFileForOpening({types:["wav"]});
  if(!file) return;
  try {
    const buffer=await file.read({format:"binary"});
    loadedAudio={file,buffer};
    $("fileName").textContent=file.name;
    $("analyze").disabled=false;
    setStatus("Audio loaded. Ready to analyze.");
  } catch(e){ setStatus("Could not read audio: "+e.message); }
}

async function runAnalysis(){
  if(!loadedAudio) return;
  setStatus("Analyzing waveform and onset envelope…");
  $("analyze").disabled=true;
  try {
    const {decodeWav}=require("./src/wav.js");
    const {analyze}=require("./src/dsp.js");
    const wav=decodeWav(loadedAudio.buffer);
    analysis=analyze(wav.samples,wav.sampleRate,{
      threshold:Number($("confidence").value),
      minSpacing:Number($("spacing").value)
    });
    const visible=analysis.events.filter(e=>
      e.confidence>=Number($("confidence").value) &&
      (($("beats").checked&&e.type==="beat")||($("onsets").checked&&e.type==="onset"))
    );
    $("bpm").textContent=analysis.bpm?analysis.bpm.toFixed(1):"—";
    $("events").textContent=visible.length;
    $("quality").textContent=Math.round(analysis.quality*100)+"%";
    $("markers").disabled=!visible.length;
    setStatus("Analysis complete. "+visible.length+" musical events ready.");
  } catch(e){ setStatus("Analysis failed: "+e.message); }
  finally { $("analyze").disabled=false; }
}

async function createMarkers(){
  if(!analysis) return;
  try {
    const project=await app.Project.getActiveProject();
    const sequence=await project.getActiveSequence();
    if(!sequence) throw new Error("No active Premiere sequence.");
    const markers=await require("premierepro").Markers.getMarkers(sequence);
    const threshold=Number($("confidence").value);
    const useBeats=$("beats").checked, useOnsets=$("onsets").checked;
    const events=analysis.events.filter(e=>e.confidence>=threshold &&
      ((useBeats&&e.type==="beat")||(useOnsets&&e.type==="onset")));
    for(let i=0;i<events.length;i++){
      const e=events[i];
      const tt=require("premierepro").TickTime.createWithSeconds(e.time);
      const name=e.type==="beat" ? "BC BEAT" : "BC ONSET";
      const comment="BeatCheat Pro | confidence="+e.confidence.toFixed(2)+" | source="+e.source;
      const action=markers.createAddMarkerAction(name,"Comment",tt,require("premierepro").TickTime.createWithSeconds(0),comment);
      await action.execute();
    }
    setStatus("Created "+events.length+" BeatCheat Pro markers.");
  } catch(e){ setStatus("Marker export failed: "+e.message); }
}

$("choose").addEventListener("click",chooseAudio);
$("analyze").addEventListener("click",runAnalysis);
$("markers").addEventListener("click",createMarkers);
$("confidence").addEventListener("input",e=>$("confidenceOut").textContent=Number(e.target.value).toFixed(2));
$("spacing").addEventListener("input",e=>$("spacingOut").textContent=Number(e.target.value).toFixed(2)+"s");

entrypoints.setup({
  plugin:{create(){ console.log("BeatCheat Pro loaded"); }},
  panels:{
    "beatcheat-panel":{show(){ /* UI is already in index.html */ }}
  },
  commands:{
    "analyze-command":()=>setStatus("Open the BeatCheat Pro panel to choose audio and analyze.")
  }
});