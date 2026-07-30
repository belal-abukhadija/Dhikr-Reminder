/**
 * The single owner of chrome.storage.sync.
 *
 * `migrate` and `countEnabled` are pure and covered by test/store.test.js.
 * Everything else touches chrome.* and is verified by loading the extension.
 */

export const MAX_DHIKR = 100;
export const MAX_DHIKR_LENGTH = 200;
export const MIN_INTERVAL = 1;
export const MAX_INTERVAL = 1440;
const DEBOUNCE_MS = 400;

const DEFAULT_WINDOW = { enabled: false, start: '07:00', end: '22:00' };

export const DEFAULTS = {
  schemaVersion: 2,
  isEnabled: true,
  intervalMinutes: 5,
  playSound: true,
  requireInteraction: false,
  language: 'en',
  activeWindow: { ...DEFAULT_WINDOW },
  dhikrList: [
    { id: 'default-1', text: 'استغفر الله', enabled: true },
    { id: 'default-2', text: 'سبحان الله', enabled: true },
    { id: 'default-3', text: 'الحمد لله', enabled: true },
    { id: 'default-4', text: 'الله أكبر', enabled: true },
    { id: 'default-5', text: 'لا إله إلا الله', enabled: true },
  ],
};

/** The five default texts, for the "restore defaults" action. */
export const DEFAULT_TEXTS = DEFAULTS.dhikrList.map((d) => d.text);

export const STORAGE_KEYS = Object.keys(DEFAULTS);

export function makeId() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const HM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function clampInterval(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS.intervalMinutes;
  return Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Math.trunc(n)));
}

function bool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normaliseWindow(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WINDOW };
  return {
    enabled: bool(raw.enabled, DEFAULT_WINDOW.enabled),
    start: HM_RE.test(raw.start) ? raw.start : DEFAULT_WINDOW.start,
    end: HM_RE.test(raw.end) ? raw.end : DEFAULT_WINDOW.end,
  };
}

/**
 * Normalise raw storage into a complete v2 state.
 *
 * Pure and idempotent. Called on every read rather than only from onInstalled,
 * because v1 data can arrive later via sync from a device that has not been
 * updated yet.
 */
export function migrate(raw, idFactory = makeId) {
  const source = raw && typeof raw === 'object' ? raw : {};

  const list = Array.isArray(source.dhikrList) ? source.dhikrList : DEFAULTS.dhikrList;
  const dhikrList = [];
  for (const entry of list) {
    if (dhikrList.length >= MAX_DHIKR) break;
    const isObject = entry && typeof entry === 'object';
    const rawText = isObject ? entry.text : entry;
    if (typeof rawText !== 'string') continue;
    const text = rawText.trim().slice(0, MAX_DHIKR_LENGTH);
    if (!text) continue;
    dhikrList.push({
      id: isObject && typeof entry.id === 'string' && entry.id ? entry.id : idFactory(),
      text,
      enabled: isObject ? bool(entry.enabled, true) : true,
    });
  }

  return {
    schemaVersion: 2,
    isEnabled: bool(source.isEnabled, DEFAULTS.isEnabled),
    intervalMinutes: clampInterval(
      source.intervalMinutes === undefined ? DEFAULTS.intervalMinutes : source.intervalMinutes,
    ),
    playSound: bool(source.playSound, DEFAULTS.playSound),
    requireInteraction: bool(source.requireInteraction, DEFAULTS.requireInteraction),
    language: source.language === 'ar' ? 'ar' : 'en',
    activeWindow: normaliseWindow(source.activeWindow),
    dhikrList,
  };
}

export function countEnabled(state) {
  const list = state && Array.isArray(state.dhikrList) ? state.dhikrList : [];
  return list.filter((d) => d.enabled).length;
}

/** Read and normalise the full state. */
export async function getState() {
  const raw = await chrome.storage.sync.get(STORAGE_KEYS);
  return migrate(raw);
}

let pending = null;
let timer = null;

function write() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!pending) return;
  const patch = pending;
  pending = null;
  chrome.storage.sync.set(patch).catch((err) => {
    console.error('[dhikr] storage write failed', err);
  });
}

/**
 * Queue a patch. Discrete controls pass `immediate: true`; typing does not, so
 * chrome.storage.sync's 120-writes-per-minute quota is respected.
 */
export function setState(patch, { immediate = false } = {}) {
  pending = { ...(pending || {}), ...patch };
  if (immediate) { write(); return; }
  if (timer) clearTimeout(timer);
  timer = setTimeout(write, DEBOUNCE_MS);
}

/** Write any pending patch now. Call from `pagehide`. */
export function flush() {
  write();
}

/** Notify on any sync change, with the full normalised state. */
export function subscribe(fn) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    getState().then(fn);
  });
}
