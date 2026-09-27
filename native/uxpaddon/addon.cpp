#include "UxpAddon.h"
#include "beatcheatpro.h"
#include <cstddef>
#include <cstdint>
#include <vector>

namespace {
using namespace beatcheatpro;

addon_value analyze_native(addon_env env, addon_callback_info info) {
  std::size_t argc = 0;
  addon_value* argv = nullptr;
  addon_get_cb_info(env, info, &argc, &argv, nullptr, nullptr);
  if (argc < 2) return addon_undefined(env);

  std::size_t sampleCount = 0;
  float* samples = nullptr;
  double sampleRate = 0;
  addon_get_arraybuffer_info(env, argv[0], reinterpret_cast<void**>(&samples), &sampleCount);
  addon_get_value_double(env, argv[1], &sampleRate);

  const auto result = analyze(samples, sampleCount / sizeof(float), sampleRate);
  auto out = addon_create_object(env);
  addon_set_named_property(env, out, "bpm", addon_create_double(env, result.bpm));
  addon_set_named_property(env, out, "quality", addon_create_double(env, result.quality));

  auto events = addon_create_array(env, result.events.size());
  for (std::size_t i = 0; i < result.events.size(); ++i) {
    auto e = addon_create_object(env);
    addon_set_named_property(env, e, "time", addon_create_double(env, result.events[i].timeSeconds));
    addon_set_named_property(env, e, "confidence", addon_create_double(env, result.events[i].confidence));
    addon_set_named_property(env, e, "strength", addon_create_double(env, result.events[i].strength));
    addon_set_named_property(env, e, "type", addon_create_int32(env, static_cast<int>(result.events[i].type)));
    addon_set_element(env, events, i, e);
  }
  addon_set_named_property(env, out, "events", events);
  return out;
}

addon_value init(addon_env env, addon_value exports) {
  addon_property_descriptor desc{};
  desc.name = "analyze";
  desc.method = analyze_native;
  addon_define_properties(env, exports, 1, &desc);
  return exports;
}

void terminate() {}

}

UXP_ADDON_INIT(init);
UXP_ADDON_TERMINATE(terminate);
