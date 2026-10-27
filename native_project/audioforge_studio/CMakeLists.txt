cmake_minimum_required(VERSION 3.15)
project(audioforge_dsp VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(
    native_dsp/include
)

add_library(audioforge_dsp SHARED
    native_dsp/src/audioforge_dsp.cpp
)

set_target_properties(audioforge_dsp PROPERTIES
    OUTPUT_NAME "audioforge_dsp"
    CXX_VISIBILITY_PRESET default
    VISIBILITY_INLINES_HIDDEN 0
)

if (WIN32)
    target_compile_definitions(audioforge_dsp PRIVATE AUDIOFORGE_EXPORTS)
endif()
