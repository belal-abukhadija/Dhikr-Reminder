import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, migrate, countEnabled } from '../js/store.js';

/** Deterministic id factory so migrate output is comparable. */
function ids() {
  let n = 0;
  return () => `id${++n}`;
}

test('DEFAULTS is a complete v2 state', () => {
  assert.equal(DEFAULTS.schemaVersion, 2);
  assert.equal(DEFAULTS.intervalMinutes, 5);
  assert.equal(DEFAULTS.isEnabled, true);
  assert.equal(DEFAULTS.playSound, true);
  assert.equal(DEFAULTS.requireInteraction, false);
  assert.equal(DEFAULTS.language, 'en');
  assert.deepEqual(DEFAULTS.activeWindow, { enabled: false, start: '07:00', end: '22:00' });
  assert.equal(DEFAULTS.dhikrList.length, 5);
  assert.ok(DEFAULTS.dhikrList.every((d) => d.enabled === true && typeof d.text === 'string'));
});

test('migrate fills defaults for empty storage', () => {
  const state = migrate({}, ids());
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.dhikrList.length, 5);
  assert.deepEqual(state.activeWindow, { enabled: false, start: '07:00', end: '22:00' });
});

test('migrate converts a v1 string list to objects', () => {
  const state = migrate({
    isEnabled: true,
    intervalMinutes: 3,
    playSound: false,
    requireInteraction: true,
    dhikrList: ['سبحان الله', 'الحمد لله'],
  }, ids());

  assert.equal(state.schemaVersion, 2);
  assert.deepEqual(state.dhikrList, [
    { id: 'id1', text: 'سبحان الله', enabled: true },
    { id: 'id2', text: 'الحمد لله', enabled: true },
  ]);
  assert.equal(state.intervalMinutes, 3, 'preserves existing settings');
  assert.equal(state.playSound, false);
  assert.equal(state.requireInteraction, true);
});

test('migrate is idempotent', () => {
  const once = migrate({ dhikrList: ['سبحان الله'] }, ids());
  const twice = migrate(structuredClone(once), ids());
  assert.deepEqual(twice, once);
});

test('migrate preserves an already-v2 list unchanged', () => {
  const v2 = { ...DEFAULTS, dhikrList: [{ id: 'keep-me', text: 'الله أكبر', enabled: false }] };
  assert.deepEqual(migrate(structuredClone(v2), ids()).dhikrList, v2.dhikrList);
});

test('migrate drops blank entries and trims text', () => {
  const state = migrate({ dhikrList: ['  سبحان الله  ', '', '   ', 'الحمد لله'] }, ids());
  assert.deepEqual(state.dhikrList.map((d) => d.text), ['سبحان الله', 'الحمد لله']);
});

test('migrate backfills ids and enabled on partial v2 objects', () => {
  const state = migrate({ schemaVersion: 2, dhikrList: [{ text: 'الله أكبر' }] }, ids());
  assert.deepEqual(state.dhikrList, [{ id: 'id1', text: 'الله أكبر', enabled: true }]);
});

test('migrate clamps intervalMinutes into 1..1440', () => {
  assert.equal(migrate({ intervalMinutes: 0 }, ids()).intervalMinutes, 1);
  assert.equal(migrate({ intervalMinutes: -7 }, ids()).intervalMinutes, 1);
  assert.equal(migrate({ intervalMinutes: 999999 }, ids()).intervalMinutes, 1440);
  assert.equal(migrate({ intervalMinutes: 'abc' }, ids()).intervalMinutes, 5, 'falls back to default');
  assert.equal(migrate({ intervalMinutes: 7.8 }, ids()).intervalMinutes, 7, 'truncates');
});

test('migrate repairs an invalid activeWindow', () => {
  assert.deepEqual(
    migrate({ activeWindow: { enabled: true, start: '25:00', end: 'nope' } }, ids()).activeWindow,
    { enabled: true, start: '07:00', end: '22:00' },
  );
});

test('migrate truncates an over-long list and over-long text', () => {
  const long = Array.from({ length: 130 }, (_, i) => `dhikr ${i}`);
  assert.equal(migrate({ dhikrList: long }, ids()).dhikrList.length, 100);

  const state = migrate({ dhikrList: ['ذ'.repeat(250)] }, ids());
  assert.equal(state.dhikrList[0].text.length, 200);
});

test('migrate rejects an unknown language', () => {
  assert.equal(migrate({ language: 'fr' }, ids()).language, 'en');
  assert.equal(migrate({ language: 'ar' }, ids()).language, 'ar');
});

test('countEnabled counts only enabled entries', () => {
  assert.equal(countEnabled({ dhikrList: [] }), 0);
  assert.equal(countEnabled({ dhikrList: [{ enabled: true }, { enabled: false }] }), 1);
  assert.equal(countEnabled({}), 0);
});
