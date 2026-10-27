cmake_minimum_required(VERSION 3.15)
project(audioforge_dsp)

add_library(audioforge_dsp SHARED
    ../../../../native_dsp/src/audioforge_dsp.cpp
)

include_directories(
    ../../../../native_dsp/include
)

target_link_libraries(audioforge_dsp
    android
    log
    OpenSLES
)
