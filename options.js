import {
  getState, setState, subscribe, flush, countEnabled, makeId, DEFAULT_TEXTS,
  MAX_DHIKR, MAX_DHIKR_LENGTH,
} from './js/store.js';
import { initLanguage, setLanguage, getLang, t, applyLanguage } from './js/i18n.js';
import { describeNext, formatCountdown, parseHM } from './js/schedule.js';
import { showToast, showUndo, mountToastHost } from './js/toast.js';
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
  windowToggle: el('windowToggle'),
  windowBody: el('windowBody'),
  windowStart: el('windowStart'),
  windowEnd: el('windowEnd'),
  windowFill: el('windowFill'),
  windowHint: el('windowHint'),
  sound: el('soundToggle'),
  persistent: el('persistentToggle'),
  testBtn: el('testBtn'),
  testResult: el('testResult'),
  testResultText: el('testResultText'),
  healthBanner: el('healthBanner'),
  healthBannerText: el('healthBannerText'),
};

const listUi = {
  root: el('dhikrList'),
  count: el('listCount'),
  warning: el('listWarning'),
  warningText: el('listWarningText'),
  form: el('addForm'),
  input: el('addInput'),
  error: el('addError'),
  addCount: el('addCount'),
  restore: el('restoreDefaultsBtn'),
  exportBtn: el('exportBtn'),
  importBtn: el('importBtn'),
  importFile: el('importFile'),
};

const ICON = {
  grip: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
};

let state = null;
let scheduledTime = null;
/** id of the row currently in edit mode, or null. */
let editingId = null;

function notifyBackground() {
  chrome.runtime.sendMessage({ action: 'updateSettings' }, () => {
    void chrome.runtime.lastError;          // no receiver is harmless here
    refreshAlarm().then(paintStatus);
  });
}

/* ═══════════ STATUS ═══════════ */

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
    ? `${ui.statusLabel.textContent}. ${state.intervalMinutes} ${t('intervalUnit')}.`
    : `${ui.statusLabel.textContent}. ${sub}`;
}

ui.master.addEventListener('change', () => {
  state.isEnabled = ui.master.checked;
  setState({ isEnabled: state.isEnabled }, { immediate: true }).then(notifyBackground);
  paintStatus();
});

/* ═══════════ INTERVAL ═══════════ */

const interval = createIntervalControl({
  segmented: ui.segmented,
  custom: ui.custom,
  input: ui.intervalInput,
  error: ui.intervalError,
  getMinutes: () => state.intervalMinutes,
  onCommit: (minutes, { immediate }) => {
    state.intervalMinutes = minutes;
    // Await the write: rebuildAlarm() reads storage, so firing it before the
    // debounced write lands would re-arm the alarm on the previous interval.
    setState({ intervalMinutes: minutes }, { immediate }).then(() => {
      notifyBackground();
      showToast(t('toastSaved'));
    });
  },
});

/* ═══════════ ACTIVE WINDOW ═══════════ */

function paintWindow() {
  const { enabled, start, end } = state.activeWindow;
  ui.windowToggle.checked = enabled;
  ui.windowBody.hidden = !enabled;
  ui.windowStart.value = start;
  ui.windowEnd.value = end;

  const s = parseHM(start);
  const e = parseHM(end);
  if (s === null || e === null) return;

  const pct = (m) => `${(m / 1440) * 100}%`;

  if (s === e) {
    ui.windowFill.style.insetInlineStart = '0';
    ui.windowFill.style.inlineSize = '100%';
    ui.windowHint.textContent = t('windowAllDay');
  } else if (s < e) {
    ui.windowFill.style.insetInlineStart = pct(s);
    ui.windowFill.style.inlineSize = pct(e - s);
    ui.windowHint.textContent = '';
  } else {
    // Overnight: draw start → midnight; the wrap is explained in the hint.
    ui.windowFill.style.insetInlineStart = pct(s);
    ui.windowFill.style.inlineSize = pct(1440 - s);
    ui.windowHint.textContent = t('windowOvernight');
  }
}

ui.windowToggle.addEventListener('change', () => {
  state.activeWindow = { ...state.activeWindow, enabled: ui.windowToggle.checked };
  setState({ activeWindow: state.activeWindow }, { immediate: true });
  paintWindow();
  paintStatus();
});

for (const [input, key] of [[ui.windowStart, 'start'], [ui.windowEnd, 'end']]) {
  input.addEventListener('change', () => {
    if (parseHM(input.value) === null) {
      input.value = state.activeWindow[key];
      showToast(t('errBadTime'));
      return;
    }
    state.activeWindow = { ...state.activeWindow, [key]: input.value };
    setState({ activeWindow: state.activeWindow }, { immediate: true });
    paintWindow();
    paintStatus();
  });
}

/* ═══════════ NOTIFICATIONS ═══════════ */

ui.sound.addEventListener('change', () => {
  state.playSound = ui.sound.checked;
  setState({ playSound: state.playSound }, { immediate: true });
  showToast(t('toastSaved'));
});

ui.persistent.addEventListener('change', () => {
  state.requireInteraction = ui.persistent.checked;
  setState({ requireInteraction: state.requireInteraction }, { immediate: true });
  showToast(t('toastSaved'));
});

async function checkHealth() {
  const level = await new Promise((resolve) => chrome.notifications.getPermissionLevel(resolve));
  const blocked = level === 'denied';
  ui.healthBanner.hidden = !blocked;
  if (blocked) ui.healthBannerText.textContent = t('healthBlocked');
}

ui.testBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'testNotification' }, (response) => {
    ui.testResult.hidden = false;

    if (chrome.runtime.lastError || response?.error) {
      ui.testResult.className = 'banner error';
      ui.testResultText.textContent =
        `${t('toastError')}: ${chrome.runtime.lastError?.message ?? response.error}`;
      return;
    }

    // Chrome accepted it. We cannot detect OS-level DND, so say so plainly
    // rather than claiming a success the user may not have seen.
    ui.testResult.className = 'banner';
    ui.testResultText.textContent = t('healthNoShow');
    showToast(t('toastTestSent'));
  });
});

/* ═══════════ LANGUAGE ═══════════ */

for (const btn of document.querySelectorAll('[data-lang-switch]')) {
  btn.addEventListener('click', async () => {
    await setLanguage(getLang() === 'en' ? 'ar' : 'en');
    repaintAll();
  });
}

/* ═══════════ DHIKR LIST ═══════════ */

/** The single write path for every list mutation. */
function commitList(nextList, toastKey) {
  state.dhikrList = nextList;
  setState({ dhikrList: nextList }, { immediate: true });
  renderList();
  paintStatus();
  if (toastKey) showToast(t(toastKey));
}

function paintListMeta() {
  listUi.count.textContent = String(state.dhikrList.length);
  listUi.addCount.textContent = t('counter', state.dhikrList.length, MAX_DHIKR);

  // Surface the configurations that produce no notifications at all.
  // background.js used to hit these cases and silently do nothing.
  let warning = '';
  if (state.dhikrList.length === 0) warning = t('listEmptyWarning');
  else if (countEnabled(state) === 0) warning = t('listNoneEnabledWarning');

  listUi.warning.hidden = !warning;
  listUi.warningText.textContent = warning;
}

/** Swap an item with its neighbour. Returns false at the ends. */
function move(id, delta) {
  const from = state.dhikrList.findIndex((d) => d.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= state.dhikrList.length) return false;
  const next = [...state.dhikrList];
  [next[from], next[to]] = [next[to], next[from]];
  commitList(next, 'toastReordered');
  return true;
}

function buildRow(item) {
  const li = document.createElement('li');
  li.className = 'item';
  li.dataset.id = item.id;
  li.draggable = true;
  if (!item.enabled) li.classList.add('disabled');

  const grip = document.createElement('span');
  grip.className = 'item-grip';
  grip.innerHTML = ICON.grip;
  grip.tabIndex = 0;
  grip.setAttribute('role', 'button');
  grip.setAttribute('aria-label', t('reorderAria', item.text));

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'toggle sm';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.className = 'toggle-input';
  toggle.checked = item.enabled;
  toggle.setAttribute('aria-label', t('enableAria', item.text));
  const track = document.createElement('span');
  track.className = 'toggle-track';
  toggleLabel.append(toggle, track);

  const text = document.createElement('span');
  text.className = 'item-text';
  text.textContent = item.text;

  const actions = document.createElement('span');
  actions.className = 'item-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn-icon';
  editBtn.innerHTML = ICON.edit;
  editBtn.setAttribute('aria-label', t('editAria', item.text));

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn-icon danger';
  delBtn.innerHTML = ICON.trash;
  delBtn.setAttribute('aria-label', t('deleteAria', item.text));

  actions.append(editBtn, delBtn);
  li.append(grip, toggleLabel, text, actions);

  toggle.addEventListener('change', () => {
    commitList(state.dhikrList.map((d) => (
      d.id === item.id ? { ...d, enabled: toggle.checked } : d
    )));
  });

  editBtn.addEventListener('click', () => startEdit(item.id));
  delBtn.addEventListener('click', () => deleteItem(item.id));

  // Keyboard path for drag, which is otherwise mouse-only.
  grip.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!delta) return;
    e.preventDefault();
    if (move(item.id, delta)) {
      listUi.root.querySelector(`[data-id="${item.id}"] .item-grip`)?.focus();
    }
  });

  return li;
}

function renderList() {
  if (!state) return;

  if (state.dhikrList.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = t('emptyList');
    listUi.root.replaceChildren(li);
  } else {
    listUi.root.replaceChildren(...state.dhikrList.map(buildRow));
  }

  paintListMeta();
}

/* ═══════════ EDIT ═══════════ */

/** Explicit Save/Cancel — blur-save misfired when clicking another row. */
function startEdit(id) {
  if (editingId) return;
  const li = listUi.root.querySelector(`[data-id="${id}"]`);
  const item = state.dhikrList.find((d) => d.id === id);
  if (!li || !item) return;

  editingId = id;
  li.classList.add('editing');

  const row = document.createElement('span');
  row.className = 'edit-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'field field-arabic';
  input.value = item.text;
  input.maxLength = MAX_DHIKR_LENGTH;

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn-icon';
  saveBtn.innerHTML = ICON.check;
  saveBtn.setAttribute('aria-label', t('saveEdit'));

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn-icon';
  cancelBtn.innerHTML = ICON.close;
  cancelBtn.setAttribute('aria-label', t('cancelEdit'));

  row.append(input, saveBtn, cancelBtn);
  li.querySelector('.item-text').replaceWith(row);
  li.querySelector('.item-actions').remove();

  input.focus();
  input.select();

  const finish = () => { editingId = null; renderList(); };

  const commit = () => {
    const text = input.value.trim();
    if (!text || text === item.text) { finish(); return; }
    if (state.dhikrList.some((d) => d.id !== id && d.text === text)) {
      showToast(t('errDuplicate'));
      input.focus();
      return;
    }
    editingId = null;
    commitList(
      state.dhikrList.map((d) => (d.id === id ? { ...d, text } : d)),
      'toastUpdated',
    );
  };

  saveBtn.addEventListener('click', commit);
  cancelBtn.addEventListener('click', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
  });
}

/* ═══════════ DELETE + UNDO ═══════════ */

function deleteItem(id) {
  const index = state.dhikrList.findIndex((d) => d.id === id);
  if (index < 0) return;
  const removed = state.dhikrList[index];

  commitList(state.dhikrList.filter((d) => d.id !== id));

  showUndo(t('toastDeleted'), () => {
    const restored = [...state.dhikrList];
    restored.splice(Math.min(index, restored.length), 0, removed);
    commitList(restored, 'toastRestored');
  });
}

/* ═══════════ ADD ═══════════ */

function validateNew(text) {
  if (!text) return t('errEmpty');
  if (text.length > MAX_DHIKR_LENGTH) return t('errTooLong', MAX_DHIKR_LENGTH);
  if (state.dhikrList.length >= MAX_DHIKR) return t('errFull', MAX_DHIKR);
  if (state.dhikrList.some((d) => d.text === text)) return t('errDuplicate');
  return '';
}

listUi.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = listUi.input.value.trim();
  const error = validateNew(text);

  listUi.error.textContent = error;
  listUi.input.classList.toggle('invalid', Boolean(error));
  if (error) { listUi.input.focus(); return; }

  commitList([...state.dhikrList, { id: makeId(), text, enabled: true }], 'toastAdded');
  listUi.input.value = '';
  listUi.input.focus();
});

listUi.input.addEventListener('input', () => {
  listUi.error.textContent = '';
  listUi.input.classList.remove('invalid');
});

/* ═══════════ DRAG TO REORDER ═══════════ */

let dragId = null;

listUi.root.addEventListener('dragstart', (e) => {
  const li = e.target.closest('.item');
  if (!li) return;
  dragId = li.dataset.id;
  li.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
});

listUi.root.addEventListener('dragover', (e) => {
  const li = e.target.closest('.item');
  if (!li || !dragId || li.dataset.id === dragId) return;
  e.preventDefault();
  li.classList.add('drag-over');
});

listUi.root.addEventListener('dragleave', (e) => {
  e.target.closest('.item')?.classList.remove('drag-over');
});

listUi.root.addEventListener('drop', (e) => {
  const li = e.target.closest('.item');
  if (!li || !dragId) return;
  e.preventDefault();

  const from = state.dhikrList.findIndex((d) => d.id === dragId);
  const to = state.dhikrList.findIndex((d) => d.id === li.dataset.id);
  dragId = null;
  if (from < 0 || to < 0 || from === to) { renderList(); return; }

  const next = [...state.dhikrList];
  next.splice(to, 0, next.splice(from, 1)[0]);
  commitList(next, 'toastReordered');
});

listUi.root.addEventListener('dragend', () => {
  dragId = null;
  renderList();
});

/* ═══════════ RESTORE DEFAULTS ═══════════ */

listUi.restore.addEventListener('click', () => {
  const have = new Set(state.dhikrList.map((d) => d.text));
  const missing = DEFAULT_TEXTS.filter((text) => !have.has(text));

  if (!missing.length) { showToast(t('toastNothingToRestore')); return; }

  const room = MAX_DHIKR - state.dhikrList.length;
  if (room <= 0) { showToast(t('errFull', MAX_DHIKR)); return; }

  const added = missing.slice(0, room).map((text) => ({ id: makeId(), text, enabled: true }));
  const before = state.dhikrList;

  // Adds only what is missing — never wipes the user's own entries.
  commitList([...before, ...added]);
  showUndo(t('toastDefaultsRestored', added.length), () => commitList(before, 'toastRestored'));
});

/* ═══════════ EXPORT / IMPORT ═══════════ */

listUi.exportBtn.addEventListener('click', () => {
  const body = state.dhikrList.map((d) => d.text).join('\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));

  const a = document.createElement('a');
  a.href = url;
  a.download = 'dhikr-list.txt';
  a.click();

  URL.revokeObjectURL(url);
  showToast(t('toastExported'));
});

listUi.importBtn.addEventListener('click', () => listUi.importFile.click());

listUi.importFile.addEventListener('change', async () => {
  const file = listUi.importFile.files?.[0];
  listUi.importFile.value = '';            // allow re-importing the same file
  if (!file) return;

  let text;
  try {
    text = await file.text();
  } catch (err) {
    showToast(`${t('toastError')}: ${err.message}`);
    return;
  }

  const have = new Set(state.dhikrList.map((d) => d.text));
  const before = state.dhikrList;
  const added = [];

  for (const raw of text.split(/\r?\n/)) {
    if (before.length + added.length >= MAX_DHIKR) break;
    const line = raw.trim().slice(0, MAX_DHIKR_LENGTH);
    if (!line || have.has(line)) continue;  // merge, skipping duplicates
    have.add(line);
    added.push({ id: makeId(), text: line, enabled: true });
  }

  if (!added.length) { showToast(t('toastNothingToRestore')); return; }

  commitList([...before, ...added]);
  showUndo(t('toastImported', added.length), () => commitList(before, 'toastRestored'));
});

/* ═══════════ INIT ═══════════ */

function repaintAll() {
  applyLanguage();
  interval.build();
  interval.paint();
  paintWindow();
  paintStatus();
  renderList();
}

async function init() {
  mountToastHost();
  await initLanguage();
  state = await getState();
  await refreshAlarm();

  ui.master.checked = state.isEnabled;
  ui.sound.checked = state.playSound;
  ui.persistent.checked = state.requireInteraction;

  repaintAll();
  await checkHealth();

  window.setInterval(paintStatus, 1000);

  subscribe(async (next) => {
    // Storage changed elsewhere — the popup, or another device.
    if (editingId) return;                  // don't yank the row being edited
    state = next;
    await refreshAlarm();
    ui.master.checked = state.isEnabled;
    ui.sound.checked = state.playSound;
    ui.persistent.checked = state.requireInteraction;
    interval.paint();
    paintWindow();
    paintStatus();
    renderList();
  });
}

window.addEventListener('pagehide', flush);

init();
