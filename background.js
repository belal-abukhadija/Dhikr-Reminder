import { getState } from './js/store.js';
import { parseHM, isWithinActiveWindow } from './js/schedule.js';

const ALARM_NAME = 'dhikrAlarm';

// Notifications are rendered by the OS, outside any page, so they cannot read
// js/i18n.js. Keep this in sync with the `headerTitle` key there.
const TITLE = { en: 'The Reminder', ar: 'المُذكِر' };

/** Rebuild the periodic alarm from current settings. */
async function rebuildAlarm() {
  const state = await getState();
  await chrome.alarms.clear(ALARM_NAME);
  if (!state.isEnabled) return;
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: state.intervalMinutes,
    periodInMinutes: state.intervalMinutes,
  });
}

/**
 * Is now inside the active window?
 *
 * The alarm stays periodic and the notification is gated here, rather than
 * scheduling next-window-start alarms. That keeps the scheduler trivially
 * reconstructible after a service-worker restart; the cost is one cheap wake
 * per interval overnight.
 */
function isWithinWindow(activeWindow, date = new Date()) {
  if (!activeWindow?.enabled) return true;
  const start = parseHM(activeWindow.start);
  const end = parseHM(activeWindow.end);
  if (start === null || end === null) return true;
  return isWithinActiveWindow(date.getHours() * 60 + date.getMinutes(), start, end);
}

function notify(id, message, state) {
  return new Promise((resolve) => {
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: TITLE[state.language] ?? TITLE.en,
      message,
      priority: 2,
      silent: state.playSound === false,
      requireInteraction: state.requireInteraction === true,
    }, (notificationId) => {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve({ success: true, id: notificationId });
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  // getState() runs migrate(), so this both seeds defaults and upgrades v1 data.
  const state = await getState();
  await chrome.storage.sync.set(state);
  await rebuildAlarm();
});

chrome.runtime.onStartup.addListener(rebuildAlarm);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  const state = await getState();
  if (!state.isEnabled) return;
  if (!isWithinWindow(state.activeWindow)) return;

  const eligible = state.dhikrList.filter((d) => d.enabled);
  if (!eligible.length) {
    // This path used to silently do nothing. The UI now warns about it too.
    console.warn('[dhikr] alarm fired with no enabled dhikr — nothing to show');
    return;
  }

  const pick = eligible[Math.floor(Math.random() * eligible.length)];
  await notify(`dhikr-${Date.now()}`, pick.text, state);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === 'updateSettings') {
    rebuildAlarm().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message?.action === 'testNotification') {
    getState()
      .then((state) => notify('dhikr-test', state.dhikrList[0]?.text ?? 'سبحان الله', state))
      .then(sendResponse);
    return true;
  }

  return false;
});
