// BeatCheat Pro — native capability boundary.
// JavaScript remains the orchestration layer; C++ is an acceleration layer.
let addon=null;
let attempted=false;

function getNativeAddon(){
  if(attempted)return addon;
  attempted=true;
  try{addon=require("beatcheatpro_dsp.uxpaddon");}
  catch(_){addon=null;}
  return addon;
}

function isAvailable(){return !!getNativeAddon();}

module.exports={getNativeAddon,isAvailable};
