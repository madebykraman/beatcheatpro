#pragma once
#include <cstdint>
#include <vector>
namespace beatcheatpro {
enum class EventType : std::uint8_t { Beat=0, Onset=1, Downbeat=2 };
struct Event {
  double timeSeconds{};
  float confidence{};
  float strength{};
  EventType type{EventType::Onset};
};
struct AnalysisResult {
  double bpm{};
  float quality{};
  std::vector<Event> events;
};
AnalysisResult analyze(const float* samples, std::size_t count, double sampleRate);
}