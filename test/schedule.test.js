import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHM, formatHM, isWithinActiveWindow, formatCountdown, describeNext,
} from '../js/schedule.js';

test('parseHM parses valid times', () => {
  assert.equal(parseHM('00:00'), 0);
  assert.equal(parseHM('07:00'), 420);
  assert.equal(parseHM('23:59'), 1439);
});

test('parseHM rejects invalid input', () => {
  for (const bad of ['', '7:00', '24:00', '07:60', 'ab:cd', null, undefined, '07']) {
    assert.equal(parseHM(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('formatHM round-trips parseHM', () => {
  assert.equal(formatHM(0), '00:00');
  assert.equal(formatHM(420), '07:00');
  assert.equal(formatHM(1439), '23:59');
});

test('isWithinActiveWindow handles a same-day range', () => {
  const start = 420, end = 1320; // 07:00 -> 22:00
  assert.equal(isWithinActiveWindow(420, start, end), true, 'start is inclusive');
  assert.equal(isWithinActiveWindow(700, start, end), true);
  assert.equal(isWithinActiveWindow(1319, start, end), true);
  assert.equal(isWithinActiveWindow(1320, start, end), false, 'end is exclusive');
  assert.equal(isWithinActiveWindow(419, start, end), false);
  assert.equal(isWithinActiveWindow(0, start, end), false);
});

test('isWithinActiveWindow handles an overnight wrap', () => {
  const start = 1320, end = 420; // 22:00 -> 07:00
  assert.equal(isWithinActiveWindow(1320, start, end), true, 'start is inclusive');
  assert.equal(isWithinActiveWindow(1430, start, end), true);
  assert.equal(isWithinActiveWindow(0, start, end), true, 'past midnight');
  assert.equal(isWithinActiveWindow(419, start, end), true);
  assert.equal(isWithinActiveWindow(420, start, end), false, 'end is exclusive');
  assert.equal(isWithinActiveWindow(700, start, end), false);
});

test('isWithinActiveWindow treats start === end as the whole day', () => {
  assert.equal(isWithinActiveWindow(0, 600, 600), true);
  assert.equal(isWithinActiveWindow(600, 600, 600), true);
  assert.equal(isWithinActiveWindow(1439, 600, 600), true);
});

test('formatCountdown formats each magnitude', () => {
  assert.equal(formatCountdown(0), '0s');
  assert.equal(formatCountdown(-5000), '0s', 'never negative');
  assert.equal(formatCountdown(12_000), '12s');
  assert.equal(formatCountdown(59_999), '59s');
  assert.equal(formatCountdown(60_000), '1m 00s');
  assert.equal(formatCountdown(192_000), '3m 12s');
  assert.equal(formatCountdown(3_600_000), '1h 00m');
  assert.equal(formatCountdown(7_500_000), '2h 05m');
});

const base = {
  isEnabled: true,
  enabledCount: 5,
  activeWindow: { enabled: false, start: '07:00', end: '22:00' },
  scheduledTime: 1_000_000 + 192_000,
  now: 1_000_000,
};

test('describeNext reports paused first', () => {
  assert.deepEqual(
    describeNext({ ...base, isEnabled: false, enabledCount: 0 }),
    { kind: 'paused' },
  );
});

test('describeNext reports an empty enabled list', () => {
  assert.deepEqual(describeNext({ ...base, enabledCount: 0 }), { kind: 'empty' });
});

test('describeNext reports being outside the active window', () => {
  const now = new Date(2026, 0, 1, 2, 0, 0).getTime(); // 02:00 local
  assert.deepEqual(
    describeNext({
      ...base,
      now,
      scheduledTime: now + 60_000,
      activeWindow: { enabled: true, start: '07:00', end: '22:00' },
    }),
    { kind: 'outsideWindow', resumesAt: '07:00' },
  );
});

test('describeNext counts down inside the active window', () => {
  const now = new Date(2026, 0, 1, 9, 0, 0).getTime();
  assert.deepEqual(
    describeNext({
      ...base,
      now,
      scheduledTime: now + 192_000,
      activeWindow: { enabled: true, start: '07:00', end: '22:00' },
    }),
    { kind: 'countdown', ms: 192_000 },
  );
});

test('describeNext counts down when no alarm is scheduled yet', () => {
  assert.deepEqual(describeNext({ ...base, scheduledTime: null }), { kind: 'countdown', ms: 0 });
});
