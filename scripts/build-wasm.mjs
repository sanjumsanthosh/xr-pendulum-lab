import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

mkdirSync('public/wasm', { recursive: true });
const exports = ['reset', 'step', 'hold', 'release', 'angle', 'velocity', 'time', 'prediction', 'period', 'count']
  .map(name => `_lab_${name}`);
const result = spawnSync(process.env.EMXX || 'em++', [
  'web/pendulum-wasm.cpp', '-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror', '--no-entry',
  '-sMODULARIZE=1', '-sEXPORT_ES6=1', '-sENVIRONMENT=web,node', '-sFILESYSTEM=0',
  '-sALLOW_MEMORY_GROWTH=1', `-sEXPORTED_FUNCTIONS=${JSON.stringify(exports)}`,
  '-o', 'public/wasm/pendulum.js',
], {
  stdio: 'inherit',
  env: { ...process.env, EM_CACHE: process.env.EM_CACHE || resolve('.cache/emscripten') },
});
if (result.error) {
  console.error('Cannot start em++. Install Emscripten and activate its environment, or set EMXX.');
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
