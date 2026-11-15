<div align="center">

# 🕰️ XR Pendulum Lab

**One C++17 physics core. Running natively, in WebAssembly, and in WebXR.**

An interactive pendulum lab for checking simulation against theory — adjustable length and
gravity, three pendulums at once, live period measurement, frame-time profiling, and a browser
view you can step into.

<br>

[![C++17](https://img.shields.io/badge/C%2B%2B-17-00599C?logo=cplusplus&logoColor=white)](./pendulum.hpp)
[![Three.js](https://img.shields.io/badge/Three.js-0.186-000000?logo=threedotjs&logoColor=white)](./web/main.js)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-emscripten-654FF0?logo=webassembly&logoColor=white)](./scripts/build-wasm.mjs)
[![OpenXR](https://img.shields.io/badge/XR-controllers-blue)]()
[![Tests](https://img.shields.io/badge/tests-native%20%2B%20wasm-brightgreen)](./tests)

</div>

---

## What it is

Most physics demos show an animation and call it simulation. This one measures itself:

- **Theory vs. simulation, side by side.** `T = 2π√(L/g)` is computed analytically; the simulated
  period is measured from actual zero-crossings, not assumed.
- **Sub-frame crossing detection.** The period is interpolated between the two samples that
  straddle a crossing, so the measurement isn't quantised to the frame rate.
- **One core, three consumers.** The same header compiles into the native test binary and into the
  WASM module the browser runs — no second implementation to drift.
- **Three pendulums, one scene.** Lengths scale per pendulum so you can watch `L` change the period
  in real time.

## How it works

```
            pendulum.hpp  (C++17, no deps)
           /            \
   tests/physics.cpp    web/pendulum-wasm.cpp
        │                        │
   native binary           emscripten → .wasm
        │                        │
   scripts/test-native.mjs   web/main.js (Three.js + WebXR)
        │                        │
     node --test            HUD + controls + controllers
```

### The integrator

Semi-implicit Euler, one step:

```cpp
const double acceleration = -gravity * std::sin(state.angleRadians) / length;
state.angularVelocity += acceleration * dt;
state.angleRadians   += state.angularVelocity * dt;
```

Small-angle period is the closed form; the simulated period comes from `PeriodMeasurement`, which
records each downward zero-crossing, linearly interpolates the crossing time between samples, and
averages the intervals. That difference — analytic vs. measured — is the point of the lab.

### In the browser

- `three@0.186` scene, orbit controls with damping, and an XR button when a headset is available.
- HUD panels are canvas textures: period, measured period, error, and median frame time over the
  last 30 frames.
- Controls drive length and gravity straight into the WASM instance; changing them resets the lab
  cleanly rather than leaving stale state behind.

## Run it

```bash
npm install

npm run dev      # builds wasm, then vite on 127.0.0.1
npm run build    # production build
npm run preview  # serve the build

npm test         # native C++ test + wasm test
```

The WASM build needs **emscripten** (`emcc`) on your PATH; the native tests need a C++17 compiler
(`c++`, or set `CXX`).

### Tests

`npm test` runs two suites:

1. **Native** — compiles `tests/physics.cpp` with `-std=c++17 -Wall -Wextra -Werror` and runs it.
2. **WASM** — `node --test tests/wasm.test.mjs` against the built module.

Warnings are errors in the native build on purpose: a physics core that compiles with warnings is a
physics core you don't trust.

## Project layout

```text
pendulum.hpp              the core: state, step, analytic period, period measurement
main.cpp                  native entry point
tests/physics.cpp         native assertions
tests/wasm.test.mjs       wasm-level tests
web/main.js               Three.js scene, controls, HUD, XR
web/pendulum-wasm.cpp     emscripten bindings
scripts/build-wasm.mjs    emcc invocation
scripts/test-native.mjs   compile-and-run harness
```

## Status

Working: simulation, measurement, native + WASM parity, browser scene with profiling.
Planned: richer OpenXR controller interaction (grab and release the bob), and an error-vs-`dt`
sweep that makes the integrator's accuracy visible instead of claimed.

## Author

[@sanjumsanthosh](https://github.com/sanjumsanthosh)
