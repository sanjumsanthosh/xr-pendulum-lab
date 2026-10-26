import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = mkdtempSync(join(tmpdir(), 'pendulum-test-'));
try {
  const binary = join(directory, 'physics-test');
  for (const [command, args] of [
    [process.env.CXX || 'c++', ['-std=c++17', '-Wall', '-Wextra', '-Werror', 'tests/physics.cpp', '-o', binary]],
    [binary, []],
  ]) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
