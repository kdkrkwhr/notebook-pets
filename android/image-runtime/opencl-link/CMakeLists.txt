cmake_minimum_required(VERSION 3.22)
project(notebuddy_opencl_link LANGUAGES C)
if(NOT ANDROID OR NOT ANDROID_ABI STREQUAL "arm64-v8a")
    message(FATAL_ERROR "This is an Android arm64 link-time artifact only")
endif()
set(ENABLE_OPENCL_LAYERS OFF CACHE BOOL "" FORCE)
set(ENABLE_OPENCL_LOADER_MANAGED_DISPATCH OFF CACHE BOOL "" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)
add_subdirectory("${OPENCL_LOADER_SOURCE}" loader)
# Android vendor libraries need not expose Linux OPENCL_1.x symbol versions.
# This header-backed link artifact is never packaged or run on the phone.
set_target_properties(OpenCL PROPERTIES LINK_FLAGS "" VERSION "" SOVERSION "")
