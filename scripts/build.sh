#!/bin/bash
# build.sh
# dcraw-emu-wasm build instructions

# A setting to stop processing if an error occurs
set -e

echo "=== Starting LibRaw WebAssembly Build ==="

# 1. Generating configure scripts (Force copy missing files for Autotools)

echo "--- Generating configure scripts ---"
libtoolize --force --copy
aclocal
automake --add-missing --copy --foreign
autoconf

# 2. Emscripten settings (Disable shared libraries and OpenMP for Wasm)
echo "--- Running emconfigure ---"
emconfigure ./configure --disable-shared --disable-openmp

# 3. Compiling LibRaw
echo "--- Running emmake ---"
# Note: The sample code (half_mt, etc.) is designed to always produce errors,
#       so we add '|| true' to prevent the script from stopping.
emmake make || true

# 4. Packaging the Wasm module
echo "--- Compiling dcraw_emu to WebAssembly ---"
emcc samples/dcraw_emu.cpp lib/.libs/libraw_r.a \
  -I. \
  -O3 \
  -msimd128 \
  -flto \
  -s WASM=1 \
  -s FORCE_FILESYSTEM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MAXIMUM_MEMORY=2147483648 \
  -s INITIAL_MEMORY=536870912 \
  -s STACK_SIZE=67108864 \
  -s "EXPORTED_RUNTIME_METHODS=['FS', 'callMain']" \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createDcrawModule" \
  -o ../dist/dcraw_emu.js

echo "=== Build Complete! ==="