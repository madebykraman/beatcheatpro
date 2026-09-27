// BeatCheat Pro — minimal PCM WAV reader.
// Native Hybrid DSP can replace this decoder without changing detector contracts.
function u16(v,o){return v[o]|(v[o+1]<<8);}
function u32(v,o){return(v[o]|(v[o+1]<<8)|(v[o+2]<<16)|(v[o+3]<<24))>>>0;}
function decodeWav(buffer){
  const v=new Uint8Array(buffer),dv=new DataView(buffer);
  if(v.length<44||String.fromCharCode(v[0],v[1],v[2],v[3])!=="RIFF"||String.fromCharCode(v[8],v[9],v[10],v[11])!=="WAVE")throw new Error("Unsupported audio: expected a PCM WAV file.");
  let p=12,channels=0,sampleRate=0,bits=0,audioFormat=0,dataOffset=-1,dataSize=0;
  while(p+8<=v.length){
    const id=String.fromCharCode(v[p],v[p+1],v[p+2],v[p+3]),size=u32(v,p+4);
    if(id==="fmt "){audioFormat=u16(v,p+8);channels=u16(v,p+10);sampleRate=u32(v,p+12);bits=u16(v,p+22);}
    else if(id==="data"){dataOffset=p+8;dataSize=Math.min(size,v.length-dataOffset);break;}
    p+=8+size+(size&1);
  }
  if(audioFormat!==1||!channels||!sampleRate||!dataSize||![16,24,32].includes(bits))throw new Error("BeatCheat Pro currently accepts uncompressed PCM WAV (16/24/32-bit).");
  const bps=bits/8,frameBytes=bps*channels,frames=Math.floor(dataSize/frameBytes),mono=new Float32Array(frames);
  for(let i=0;i<frames;i++){
    let sum=0;
    for(let c=0;c<channels;c++){
      const o=dataOffset+i*frameBytes+c*bps;let x;
      if(bits===16)x=dv.getInt16(o,true)/32768;
      else if(bits===24){let n=v[o]|(v[o+1]<<8)|(v[o+2]<<16);if(n&0x800000)n|=0xff000000;x=n/8388608;}
      else x=dv.getInt32(o,true)/2147483648;
      sum+=x;
    }
    mono[i]=sum/channels;
  }
  return{samples:mono,sampleRate,duration:frames/sampleRate,channels,bits};
}
module.exports={decodeWav};