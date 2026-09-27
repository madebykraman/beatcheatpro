#include "beatcheatpro.h"
#include <algorithm>
#include <cmath>
namespace beatcheatpro {
AnalysisResult analyze(const float* samples,std::size_t count,double sampleRate){
  AnalysisResult out{};
  if(!samples||count<1024||sampleRate<=0)return out;
  constexpr std::size_t hop=256,frame=1024;
  double previous=0;
  for(std::size_t i=0;i+frame<=count;i+=hop){
    double energy=0;
    for(std::size_t n=0;n<frame;n++){const double x=samples[i+n];energy+=x*x;}
    energy=std::sqrt(energy/frame);
    const double novelty=std::max(0.0,energy-previous);previous=energy;
    if(novelty>0.04){
      Event e;
      e.timeSeconds=static_cast<double>(i)/sampleRate;
      e.strength=static_cast<float>(std::min(4.0,novelty*40.0));
      e.confidence=static_cast<float>(std::min(1.0,0.35+novelty*8.0));
      e.type=EventType::Onset;
      out.events.push_back(e);
    }
  }
  out.quality=out.events.empty()?0.0f:0.25f;
  return out;
}
}