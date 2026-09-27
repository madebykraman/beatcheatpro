#include "beatcheatpro.h"

#include <cassert>
#include <cmath>
#include <cstddef>
#include <vector>

int main() {
  assert(beatcheatpro::analyze(nullptr, 0, 44100.0).events.empty());

  constexpr double sr = 11025.0;
  constexpr double seconds = 8.0;
  std::vector<float> x(static_cast<std::size_t>(sr * seconds), 0.0f);

  // Deliberately offset from frame boundaries. The detector should refine
  // the beat toward the actual transient rather than snapping to its grid.
  for (double t = .237; t < seconds; t += .5) {
    const auto start = static_cast<std::size_t>(std::llround(t * sr));
    for (std::size_t n = 0; n < 18 && start + n < x.size(); ++n) {
      x[start + n] = static_cast<float>(1.0 - static_cast<double>(n) / 18.0);
    }
  }

  const auto result = beatcheatpro::analyze(x.data(), x.size(), sr);
  assert(result.bpm > 115.0 && result.bpm < 125.0);
  assert(result.quality >= 0.0f && result.quality <= 1.0f);
  assert(!result.events.empty());

  bool foundOffsetTransient = false;
  for (const auto& event : result.events) {
    if (std::abs(event.timeSeconds - .237) < .035) {
      foundOffsetTransient = true;
      break;
    }
  }
  assert(foundOffsetTransient);
  return 0;
}
