import test from 'node:test';
import assert from 'node:assert/strict';
import createModule from '../public/wasm/pendulum.js';

test('WebAssembly produces periods from motion and restarts cleanly', async () => {
  const lab = await createModule();
  assert.equal(lab._lab_reset(0, 1, 9.8, 30), 1);
  assert.equal(lab._lab_reset(1, 2, 9.8, 30), 1);
  assert.ok(Number.isNaN(lab._lab_period(0)));
  for (let i = 0; i < 4000; i++) assert.equal(lab._lab_step(0.005), 1);
  assert.ok(Math.abs(lab._lab_period(0) - 2.042) < 0.001);
  assert.ok(Math.abs(lab._lab_period(1) / lab._lab_period(0) - Math.SQRT2) < 0.001);
  assert.ok(lab._lab_count(0) > 5);
  assert.equal(lab._lab_hold(0, -0.3), 1);
  assert.equal(lab._lab_count(0), 0);
  lab._lab_step(0.005);
  assert.equal(lab._lab_angle(0), -0.3);
  assert.equal(lab._lab_velocity(0), 0);
  assert.equal(lab._lab_time(0), 0);
  assert.equal(lab._lab_release(0), 1);
  lab._lab_step(0.005);
  assert.ok(lab._lab_velocity(0) > 0);
  assert.equal(lab._lab_reset(0, 1, 9.8, 0), 1);
  for (let i = 0; i < 100; i++) lab._lab_step(0.005);
  assert.equal(lab._lab_angle(0), 0);
  assert.ok(Number.isNaN(lab._lab_period(0)));
});

test('invalid browser inputs are rejected without corrupting state', async () => {
  const lab = await createModule();
  lab._lab_reset(0, 1, 9.8, 30);
  const angle = lab._lab_angle(0);
  for (const args of [[0, -1, 9.8, 30], [0, 1, NaN, 30], [0, 1, 9.8, 90], [3, 1, 9.8, 30]]) {
    assert.equal(lab._lab_reset(...args), 0);
  }
  for (const dt of [0, -0.1, NaN, Infinity, 1]) assert.equal(lab._lab_step(dt), 0);
  assert.equal(lab._lab_hold(0, NaN), 0);
  assert.equal(lab._lab_release(-1), 0);
  assert.equal(lab._lab_angle(0), angle);
});
