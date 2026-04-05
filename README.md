# dcraw-emu-wasm

A modern, high-performance WebAssembly port of LibRaw's `dcraw_emu`, designed for browser-based RAW image processing.

This project serves as a modern spiritual successor to the excellent [zfedoran/dcraw.js](https://github.com/zfedoran/dcraw.js/), bringing up-to-date camera profiles and solving the critical memory limitations of the past.

## Background & Motivation

For a long time, `zfedoran/dcraw.js` was the go-to solution for parsing RAW files in the browser. However, because its updates stopped around 2018 (relying on the older `dcraw.c`), it lacks support for newer camera profiles. 

Furthermore, when attempting to output full-resolution uncompressed TIFFs, the older Emscripten compilation approach often hit a hard memory ceiling. This caused the virtual filesystem (MEMFS) to crash with a `RangeError: Invalid array length` when generating massive byte arrays.

**dcraw-emu-wasm** solves these issues by:
1. **Using LibRaw:** Replacing `dcraw.c` with the actively maintained LibRaw, providing support for the latest cameras.
2. **Dynamic Memory Growth & Large Stack:** Compiled with modern Emscripten flags (`ALLOW_MEMORY_GROWTH=1`, large `INITIAL_MEMORY`), safely handling 100MB+ TIFF outputs without throwing RangeErrors.
3. **WebAssembly SIMD:** Compiled with `-msimd128` for massive performance improvements during demosaicing and color processing.
4. **Modularized Instantiation:** Prevents memory leaks and state pollution across multiple processing runs.

## Features

- Parse and decode RAW images entirely in the browser.
- Extract thumbnails or process full-resolution images (TIFF/PPM).
- Lightning-fast processing using WebAssembly SIMD.
- Safe, modular initialization for stable use in SPA frameworks (React, Vue, etc.).

## Usage

Since the WebAssembly module is modularized, you must instantiate it before use. This prevents memory leaks and state collision between multiple renders.

```javascript
import createDcrawModule from './dist/dcraw_emu.js';

async function processRawImage(rawFileBuffer) {
  // 1. Initialize a fresh WebAssembly module instance
  let Module = await createDcrawModule();
  let outputData;

  try {
    // 2. Write the raw file into the virtual filesystem
    Module.FS.writeFile('/input.raw', rawFileBuffer);

    // 3. Execute dcraw_emu 
    // Example: -T (TIFF output), -w (Use camera white balance)
    Module.callMain(['-T', '-w', '/input.raw']);

    // 4. Read the generated file from the virtual filesystem
    outputData = Module.FS.readFile('/input.tiff');
    
  } catch (error) {
    console.error("Failed to process RAW:", error);
  } finally {
    // 5. Clean up the reference to free the memory via Garbage Collection
    Module = null;
  }

  return outputData; // Uint8Array of the TIFF file
}