// BeatCheat Pro — Adobe UXP Hybrid bridge.
//
// This file intentionally keeps the Adobe SDK surface at the edge.
// The detector itself has no UXP dependency and is unit-testable independently.
//
// The exact addon_apis calls below follow the Adobe Hybrid SDK template/API
// shipped through the Adobe Developer Console. Do not copy Node-API headers
// into this project: UxpAddon.h/UxpAddonShared.h are the supported bridge.

#include "UxpAddon.h"
#include "UxpAddonShared.h"
#include "beatcheatpro.h"

namespace {
addon_value init(addon_env env, addon_value exports) {
  // The SDK template owns the initialization ABI. Native exports will be
  // registered here once the extracted SDK version is selected for the build.
  // Keeping this function intentionally minimal prevents DSP code from
  // depending on Adobe's evolving bridge types.
  (void)env;
  return exports;
}

void terminate() {}
}

UXP_ADDON_INIT(init);
UXP_ADDON_TERMINATE(terminate);
