/**
 * Pure schedule arithmetic. MUST NOT reference chrome.* or the DOM —
 * test/schedule.test.js imports this module directly under Node.
 */

const HM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "07:00" -> 420 minutes past midnight. Invalid input -> null. */
export function parseHM(hm) {
  if (typeof hm !== 'string') return null;
  const m = HM_RE.exec(hm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 420 -> "07:00" */
export function formatHM(minutes) {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Is `nowMinutes` inside [start, end)?
 * Start inclusive, end exclusive. start === end covers the whole day.
 * start > end wraps past midnight.
 */
export function isWithinActiveWindow(nowMinutes, startMinutes, endMinutes) {
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/** Milliseconds -> "12s" | "3m 12s" | "2h 05m". Never negative. */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${String(total % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function localMinutes(timestamp) {
  const d = new Date(timestamp);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * What should the status line say? Returns a language-free descriptor; the
 * caller maps `kind` onto an i18n string.
 *
 * Precedence: paused > empty > outsideWindow > countdown.
 */
export function describeNext({ isEnabled, enabledCount, activeWindow, scheduledTime, now }) {
  if (!isEnabled) return { kind: 'paused' };
  if (!enabledCount) return { kind: 'empty' };

  if (activeWindow && activeWindow.enabled) {
    const start = parseHM(activeWindow.start);
    const end = parseHM(activeWindow.end);
    if (start !== null && end !== null && !isWithinActiveWindow(localMinutes(now), start, end)) {
      return { kind: 'outsideWindow', resumesAt: formatHM(start) };
    }
  }

  return { kind: 'countdown', ms: scheduledTime ? Math.max(0, scheduledTime - now) : 0 };
}
