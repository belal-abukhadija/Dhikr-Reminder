import {
  getState, setState, subscribe, flush, countEnabled,
} from './js/store.js';
import { initLanguage, t } from './js/i18n.js';
import { describeNext, formatCountdown } from './js/schedule.js';
import { createIntervalControl } from './js/interval-control.js';

const ALARM_NAME = 'dhikrAlarm';

const el = (id) => document.getElementById(id);

const ui = {
  status: el('status'),
  statusLabel: el('statusLabel'),
  statusSub: el('statusSub'),
  statusA11y: el('statusA11y'),
  master: el('masterToggle'),
  segmented: el('intervalSegmented'),
  custom: el('intervalCustom'),
  intervalInput: el('intervalInput'),
  intervalError: el('intervalError'),
  openSettings: el('openSettingsBtn'),
};

let state = null;
let scheduledTime = null;

/* ═══════════ INTERVAL ═══════════ */

const interval = createIntervalControl({
  segmented: ui.segmented,
  custom: ui.custom,
  input: ui.intervalInput,
  error: ui.intervalError,
  getMinutes: () => state.intervalMinutes,
  onCommit: (minutes, { immediate }) => {
    state.intervalMinutes = minutes;
    setState({ intervalMinutes: minutes }, { immediate });
    notifyBackground();
  },
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
  interval.build();
  interval.paint();
  paintStatus();

  window.setInterval(paintStatus, 1000);

  subscribe(async (next) => {
    state = next;
    await refreshAlarm();
    ui.master.checked = state.isEnabled;
    interval.paint();
    paintStatus();
  });
}

// The popup can close well inside the 400ms debounce window.
window.addEventListener('pagehide', flush);

init();
