#include "UxpAddon.h"
#include "UxpAddonShared.h"
#include "beatcheatpro.h"

#include <cstddef>
#include <sstream>
#include <string>

namespace {
addon_value Analyze(addon_env env, addon_callback_info info) {
    try {
        size_t argc = 2;
        addon_value args[2] = { nullptr, nullptr };
        if (UxpAddonApis.uxp_addon_get_cb_info(env, info, &argc, args, nullptr, nullptr) != addon_ok ||
            argc < 2) {
            return nullptr;
        }

        void* raw = nullptr;
        size_t byteLength = 0;
        if (UxpAddonApis.uxp_addon_get_arraybuffer_info(env, args[0], &raw, &byteLength) != addon_ok ||
            !raw || byteLength < sizeof(float) || (byteLength % sizeof(float)) != 0) {
            return nullptr;
        }

        double sampleRate = 0.0;
        if (UxpAddonApis.uxp_addon_get_value_double(env, args[1], &sampleRate) != addon_ok ||
            sampleRate <= 0.0) {
            return nullptr;
        }

        const auto* samples = static_cast<const float*>(raw);
        const auto result = beatcheatpro::analyze(
            samples, byteLength / sizeof(float), sampleRate);

        std::ostringstream json;
        json.precision(9);
        json << "{\"bpm\":" << result.bpm
             << ",\"quality\":" << result.quality
             << ",\"events\":[";
        for (std::size_t i = 0; i < result.events.size(); ++i) {
            if (i) json << ",";
            const auto& e = result.events[i];
            json << "{\"time\":" << e.timeSeconds
                 << ",\"confidence\":" << e.confidence
                 << ",\"strength\":" << e.strength
                 << ",\"type\":" << static_cast<int>(e.type) << "}";
        }
        json << "]}";

        const std::string text = json.str();
        addon_value out = nullptr;
        if (UxpAddonApis.uxp_addon_create_string_utf8(
                env, text.c_str(), text.size(), &out) != addon_ok) {
            return nullptr;
        }
        return out;
    } catch (...) {
        return nullptr;
    }
}

addon_value Init(addon_env env, addon_value exports, const addon_apis& apis) {
    addon_value fn = nullptr;
    if (apis.uxp_addon_create_function(
            env, nullptr, 0, Analyze, nullptr, &fn) != addon_ok) {
        apis.uxp_addon_throw_error(
            env, nullptr, "BeatCheat Pro: create_function failed");
        return exports;
    }

    if (apis.uxp_addon_set_named_property(
            env, exports, "analyze", fn) != addon_ok) {
        apis.uxp_addon_throw_error(
            env, nullptr, "BeatCheat Pro: export registration failed");
    }
    return exports;
}

void Terminate(addon_env) {}
}

UXP_ADDON_INIT(Init)
UXP_ADDON_TERMINATE(Terminate)
