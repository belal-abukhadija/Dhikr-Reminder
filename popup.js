import {
  getState, setState, subscribe, flush, countEnabled, MIN_INTERVAL, MAX_INTERVAL,
} from './js/store.js';
import { initLanguage, t } from './js/i18n.js';
import { describeNext, formatCountdown } from './js/schedule.js';

const PRESETS = [1, 5, 15, 30, 60];
const ALARM_NAME = 'dhikrAlarm';

const el = (id) => document.getElementById(id);

const ui = {
  status: el('status'),
  statusLabel: el('statusLabel'),
  statusSub: el('statusSub'),
  statusA11y: el('statusA11y'),
  master: el('masterToggle'),
  segmented: el('intervalSegmented'),
  openSettings: el('openSettingsBtn'),
};

let state = null;
let scheduledTime = null;

/* ═══════════ INTERVAL ═══════════ */

function buildSegmented() {
  ui.segmented.replaceChildren(...PRESETS.map((minutes) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg-btn';
    btn.setAttribute('role', 'radio');
    btn.dataset.minutes = String(minutes);
    btn.textContent = String(minutes);
    btn.setAttribute('aria-label', `${minutes} ${t('intervalUnit')}`);
    return btn;
  }));
}

function paintSegmented() {
  const buttons = [...ui.segmented.querySelectorAll('.seg-btn')];
  for (const btn of buttons) {
    const selected = Number(btn.dataset.minutes) === state.intervalMinutes;
    btn.setAttribute('aria-checked', String(selected));
    // Only the selected radio is tabbable; arrows move within the group.
    btn.tabIndex = selected ? 0 : -1;
  }
  // A custom interval set on the settings page matches no preset here —
  // keep the group reachable by Tab anyway.
  if (!buttons.some((b) => b.getAttribute('aria-checked') === 'true') && buttons[0]) {
    buttons[0].tabIndex = 0;
  }
}

function applyInterval(minutes) {
  state.intervalMinutes = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, minutes));
  setState({ intervalMinutes: state.intervalMinutes }, { immediate: true });
  notifyBackground();
  paintSegmented();
}

ui.segmented.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (btn) applyInterval(Number(btn.dataset.minutes));
});

// Arrow-key navigation, as role="radiogroup" requires.
ui.segmented.addEventListener('keydown', (e) => {
  const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const step = steps[e.key];
  if (!step) return;
  e.preventDefault();

  const buttons = [...ui.segmented.querySelectorAll('.seg-btn')];
  const horizontal = e.key === 'ArrowRight' || e.key === 'ArrowLeft';
  const rtl = document.documentElement.dir === 'rtl';
  const delta = horizontal && rtl ? -step : step;

  const current = buttons.findIndex((b) => b.getAttribute('aria-checked') === 'true');
  const next = buttons[((current < 0 ? 0 : current) + delta + buttons.length) % buttons.length];
  applyInterval(Number(next.dataset.minutes));
  next.focus();
});

/* ═══════════ MASTER TOGGLE ═══════════ */

ui.master.addEventListener('change', () => {
  state.isEnabled = ui.master.checked;
  setState({ isEnabled: state.isEnabled }, { immediate: true });
  notifyBackground();
  paintStatus();
});

ui.openSettings.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

/* ═══════════ STATUS ═══════════ */

function notifyBackground() {
  chrome.runtime.sendMessage({ action: 'updateSettings' }, () => {
    void chrome.runtime.lastError;          // no receiver is harmless here
    refreshAlarm().then(paintStatus);
  });
}

async function refreshAlarm() {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  scheduledTime = alarm ? alarm.scheduledTime : null;
}

function paintStatus() {
  const next = describeNext({
    isEnabled: state.isEnabled,
    enabledCount: countEnabled(state),
    activeWindow: state.activeWindow,
    scheduledTime,
    now: Date.now(),
  });

  const idle = next.kind === 'paused' || next.kind === 'empty';
  ui.status.classList.toggle('paused', idle);
  ui.statusLabel.textContent = next.kind === 'paused' ? t('statusPaused') : t('statusActive');

  let sub;
  if (next.kind === 'paused') sub = t('statusOff');
  else if (next.kind === 'empty') sub = t('nothingEnabled');
  else if (next.kind === 'outsideWindow') sub = t('resumesAt', next.resumesAt);
  else sub = t('nextIn', formatCountdown(next.ms));

  ui.statusSub.textContent = sub;
  // Static for assistive tech — no per-second churn.
  ui.statusA11y.textContent = next.kind === 'countdown'
    ? `${ui.statusLabel.textContent}. ${t('quickInterval')}: ${state.intervalMinutes} ${t('intervalUnit')}.`
    : `${ui.statusLabel.textContent}. ${sub}`;
}

/* ═══════════ INIT ═══════════ */

async function init() {
  await initLanguage();
  state = await getState();
  await refreshAlarm();

  ui.master.checked = state.isEnabled;
  buildSegmented();
  paintSegmented();
  paintStatus();

  window.setInterval(paintStatus, 1000);

  subscribe(async (next) => {
    state = next;
    await refreshAlarm();
    ui.master.checked = state.isEnabled;
    paintSegmented();
    paintStatus();
  });
}

// The popup can close well inside the 400ms debounce window.
window.addEventListener('pagehide', flush);

init();
