#include "beatcheatpro.h"
#include <cassert>
#include <cmath>
#include <cstddef>
#include <iostream>
#include <vector>

int main(){
  constexpr double sr=11025.0, seconds=12.0;
  std::vector<float> x(static_cast<std::size_t>(sr*seconds),0.0f);
  // Synthetic four-on-the-floor pulse train. Pulses are intentionally short so
  // the test exercises onset evidence rather than sustained energy.
  for(double t=.25;t<seconds;t+=.5){
    const std::size_t start=static_cast<std::size_t>(t*sr);
    for(std::size_t n=0;n<24 && start+n<x.size();n++){
      const double u=1.0-static_cast<double>(n)/24.0;
      x[start+n]=static_cast<float>(.95*u);
    }
  }
  const auto r=beatcheatpro::analyze(x.data(),x.size(),sr);
  assert(r.bpm>115.0&&r.bpm<125.0);
  assert(!r.events.empty());
  assert(r.quality>=0.0f&&r.quality<=1.0f);
  std::cout<<"bpm="<<r.bpm<<" events="<<r.events.size()<<" quality="<<r.quality<<"\n";
  return 0;
}