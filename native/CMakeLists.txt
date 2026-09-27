cmake_minimum_required(VERSION 3.20)
project(BeatCheatProDSP LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(beatcheatpro_dsp STATIC src/detector.cpp)
target_include_directories(beatcheatpro_dsp PUBLIC include)

if(MSVC)
  target_compile_options(beatcheatpro_dsp PRIVATE /O2 /W4)
else()
  target_compile_options(beatcheatpro_dsp PRIVATE -O3 -Wall -Wextra -Wpedantic)
endif()

include(CTest)
if(BUILD_TESTING)
  add_executable(beatcheatpro_detector_smoke tests/detector_smoke.cpp)
  target_link_libraries(beatcheatpro_detector_smoke PRIVATE beatcheatpro_dsp)
  add_test(NAME beatcheatpro_detector_smoke COMMAND beatcheatpro_detector_smoke)

  add_executable(beatcheatpro_detector_edge tests/detector_edge.cpp)
  target_link_libraries(beatcheatpro_detector_edge PRIVATE beatcheatpro_dsp)
  add_test(NAME beatcheatpro_detector_edge COMMAND beatcheatpro_detector_edge)
endif()

option(BUILD_UXP_ADDON "Build the Premiere UXP native addon bridge" OFF)
set(UXP_HYBRID_SDK_ROOT "" CACHE PATH "Adobe UXP Hybrid Plugin SDK root")
if(BUILD_UXP_ADDON)
  if(NOT UXP_HYBRID_SDK_ROOT)
    message(FATAL_ERROR "BUILD_UXP_ADDON=ON requires UXP_HYBRID_SDK_ROOT")
  endif()
  add_library(beatcheatpro_uxpaddon SHARED uxpaddon/addon.cpp)
  target_link_libraries(beatcheatpro_uxpaddon PRIVATE beatcheatpro_dsp)
  target_include_directories(beatcheatpro_uxpaddon PRIVATE
    "${UXP_HYBRID_SDK_ROOT}/src/api"
    "${UXP_HYBRID_SDK_ROOT}/src/utilities"
    "${CMAKE_CURRENT_SOURCE_DIR}/include"
  )
  set_target_properties(beatcheatpro_uxpaddon PROPERTIES
    OUTPUT_NAME "beatcheatpro_dsp"
    SUFFIX ".uxpaddon"
  )
endif()
