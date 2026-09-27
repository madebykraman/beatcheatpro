#include "beatcheatpro.h"
#include <algorithm>
#include <cmath>
#include <complex>
#include <cstddef>
#include <limits>
#include <numeric>
#include <vector>

namespace beatcheatpro {
namespace {
constexpr double kPi = 3.14159265358979323846;
constexpr std::size_t kFrame = 1024;
constexpr std::size_t kHop = 256;

void fft(std::vector<std::complex<double>>& a) {
  const std::size_t n=a.size();
  for(std::size_t i=1,j=0;i<n;i++){
    std::size_t bit=n>>1;
    for(;j&bit;bit>>=1) j^=bit;
    j^=bit;
    if(i<j) std::swap(a[i],a[j]);
  }
  for(std::size_t len=2;len<=n;len<<=1){
    const double ang=-2.0*kPi/static_cast<double>(len);
    const std::complex<double> wlen(std::cos(ang),std::sin(ang));
    for(std::size_t i=0;i<n;i+=len){
      std::complex<double> w(1.0,0.0);
      for(std::size_t j=0;j<len/2;j++){
        const auto u=a[i+j],v=a[i+j+len/2]*w;
        a[i+j]=u+v;a[i+j+len/2]=u-v;w*=wlen;
      }
    }
  }
}

double median(std::vector<double> v){
  if(v.empty()) return 0.0;
  std::sort(v.begin(),v.end());
  return v[v.size()/2];
}

double normalize(const std::vector<double>& x,std::size_t i,std::size_t radius=18){
  const std::size_t lo=i>radius?i-radius:0,hi=std::min(x.size(),i+radius+1);
  std::vector<double> w;w.reserve(hi-lo);
  for(std::size_t j=lo;j<hi;j++)w.push_back(x[j]);
  const double m=median(w);
  double var=0;for(double z:w)var+=(z-m)*(z-m);
  const double sd=std::sqrt(var/std::max<std::size_t>(1,w.size()));
  return std::max(0.0,(x[i]-m)/(sd+1e-9));
}

double lagScore(const std::vector<double>& n,std::size_t lag){
  if(lag<2||lag>=n.size())return 0;
  double s=0;std::size_t count=0;
  for(std::size_t i=lag;i<n.size();i++){s+=n[i]*n[i-lag];count++;}
  return count?s/static_cast<double>(count):0;
}
}

AnalysisResult analyze(const float* samples,std::size_t count,double sampleRate){
  AnalysisResult out{};
  if(!samples||count<kFrame||sampleRate<=0)return out;

  const std::size_t frames=1+(count-kFrame)/kHop;
  std::vector<double> low(frames),mid(frames),high(frames),novelty(frames);
  std::vector<double> previous(kFrame/2,0.0),spectrum(kFrame/2,0.0);

  for(std::size_t f=0;f<frames;f++){
    std::vector<std::complex<double>> a(kFrame);
    double energy=0;
    for(std::size_t n=0;n<kFrame;n++){
      const double x=samples[f*kHop+n];
      energy+=x*x;
      const double win=.5-.5*std::cos(2.0*kPi*n/(kFrame-1));
      a[n]=x*win;
    }
    fft(a);
    for(std::size_t k=0;k<kFrame/2;k++)spectrum[k]=std::abs(a[k]);
    if(f){
      for(std::size_t k=2;k<kFrame/2;k++){
        const double d=std::max(0.0,spectrum[k]-previous[k]);
        if(k<32)low[f]+=d;
        else if(k<96)mid[f]+=d;
        else if(k<220)high[f]+=d;
      }
    }
    previous=spectrum;
  }

  for(std::size_t i=0;i<frames;i++){
    const double l=normalize(low,i),m=normalize(mid,i),h=normalize(high,i);
    novelty[i]=.55*l+.30*m+.15*h;
  }

  struct Hyp{double bpm;std::size_t lag;double score;};
  std::vector<Hyp> hyps;
  for(double bpm=55;bpm<=190.0001;bpm+=.5){
    const auto lag=static_cast<std::size_t>(std::llround((60.0/bpm)*sampleRate/kHop));
    if(lag>=2&&lag<frames)hyps.push_back({bpm,lag,lagScore(novelty,lag)});
  }
  if(hyps.empty())return out;
  std::sort(hyps.begin(),hyps.end(),[](const Hyp&a,const Hyp&b){return a.score>b.score;});
  const Hyp best=hyps.front();
  out.bpm=best.bpm;

  std::size_t phase=0;double phaseScore=-std::numeric_limits<double>::infinity();
  for(std::size_t p=0;p<best.lag;p++){
    double s=0;
    for(std::size_t i=p;i<frames;i+=best.lag){
      double local=0;
      for(int d=-5;d<=5;d++){const auto j=static_cast<long long>(i)+d;if(j>=0&&static_cast<std::size_t>(j)<frames)local=std::max(local,novelty[j]/(1.0+std::abs(d)));}
      s+=local;
    }
    if(s>phaseScore){phaseScore=s;phase=p;}
  }

  struct Candidate{std::size_t frame;double time;double strength;};
  std::vector<Candidate> candidates;
  const std::size_t minFrames=std::max<std::size_t>(1,static_cast<std::size_t>(std::llround(.16*sampleRate/kHop)));
  for(std::size_t i=2;i+2<frames;i++){
    if(novelty[i]<.55)continue;
    bool peak=true;for(std::size_t j=i>3?i-3:0;j<=std::min(frames-1,i+3);j++)if(j!=i&&novelty[j]>novelty[i]){peak=false;break;}
    if(!peak||(!candidates.empty()&&i-candidates.back().frame<minFrames))continue;
    candidates.push_back({i,static_cast<double>(i*kHop)/sampleRate,novelty[i]});
  }

  std::vector<Event> beats;
  for(std::size_t f=phase;f<frames;f+=best.lag){
    std::size_t refined=f;double peak=-1;
    for(int d=-5;d<=5;d++){const auto j=static_cast<long long>(f)+d;if(j>=0&&static_cast<std::size_t>(j)<frames&&novelty[j]>peak){peak=novelty[j];refined=static_cast<std::size_t>(j);}}
    double t=static_cast<double>(refined*kHop)/sampleRate;const Candidate* near=nullptr;double dist=.09;
    for(const auto& c:candidates){const double d=std::abs(c.time-t);if(d<dist){dist=d;near=&c;}}
    Event e{};e.timeSeconds=near?near->time:t;e.strength=static_cast<float>(std::max(0.0,peak));e.confidence=static_cast<float>(std::min(1.0,.40+peak/5.0+(near?.16:0.0)));e.type=EventType::Beat;beats.push_back(e);
  }

  const bool stable=best.score>.08;
  if(stable&&beats.size()>=8){
    std::size_t bar=0;double bs=-1;
    for(std::size_t p=0;p<4;p++){double s=0;for(std::size_t i=p;i<beats.size();i+=4)s+=beats[i].strength;if(s>bs){bs=s;bar=p;}}
    for(std::size_t i=bar;i<beats.size();i+=4){beats[i].type=EventType::Downbeat;beats[i].confidence=std::min(1.0f,beats[i].confidence+.10f);}
  }

  out.events=beats;
  for(const auto& c:candidates){
    bool used=false;for(const auto& b:beats)if(std::abs(b.timeSeconds-c.time)<.075){used=true;break;}
    if(!used&&c.strength>=1.15){Event e{};e.timeSeconds=c.time;e.strength=static_cast<float>(c.strength);e.confidence=static_cast<float>(std::min(1.0,.42+c.strength/4.0));e.type=EventType::Onset;out.events.push_back(e);}
  }
  std::sort(out.events.begin(),out.events.end(),[](const Event&a,const Event&b){return a.timeSeconds<b.timeSeconds;});
  out.quality=static_cast<float>(std::max(0.0,std::min(1.0,.30+best.score/(best.score+1.5))));
  return out;
}
}