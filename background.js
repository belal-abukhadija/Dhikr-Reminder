// Default settings
const DEFAULT_SETTINGS = {
  isEnabled: true,
  intervalMinutes: 5,
  playSound: true,
  requireInteraction: false,
  dhikrList: [
    "استغفر الله",
    "سبحان الله",
    "الحمد لله",
    "الله أكبر",
    "لا إله إلا الله"
  ]
};

const ICON_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAAi0lEQVR42u3WMQ3AMAwEwXv4N2xio1CgAQH1ZweT/F9uD9/m92M3+2P2c3+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4A1nEaR8P2lKAAAAAASUVORK5CYII=";

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.sync.get(["isEnabled", "intervalMinutes", "dhikrList", "playSound", "requireInteraction"]);
  
  // Save defaults if not present
  if (data.isEnabled === undefined) {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    setupAlarm(DEFAULT_SETTINGS.isEnabled, DEFAULT_SETTINGS.intervalMinutes);
  } else {
    setupAlarm(data.isEnabled, data.intervalMinutes);
  }
});

// Setup or clear the alarm
function setupAlarm(isEnabled, intervalMinutes) {
  chrome.alarms.clear("dhikrAlarm");
  if (isEnabled) {
    chrome.alarms.create("dhikrAlarm", {
      delayInMinutes: intervalMinutes, // First trigger delay
      periodInMinutes: intervalMinutes // Repeating interval
    });
  }
}

// Listen for alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "dhikrAlarm") {
    const data = await chrome.storage.sync.get(["isEnabled", "dhikrList", "playSound", "requireInteraction"]);
    if (data.isEnabled && data.dhikrList && data.dhikrList.length > 0) {
      // Pick a random Dhikr
      const randomDhikr = data.dhikrList[Math.floor(Math.random() * data.dhikrList.length)];
      
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon-48.png", // Standard real file target
        title: "Dhikr Reminder",
        message: randomDhikr,
        priority: 2,
        silent: data.playSound === false,
        requireInteraction: data.requireInteraction === true
      });
    }
  }
});

// Listen for messages from popup or options page to update alarms
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateSettings") {
    chrome.storage.sync.get(["isEnabled", "intervalMinutes"], (data) => {
      setupAlarm(data.isEnabled, data.intervalMinutes);
    });
    // Respond immediately
    sendResponse({ success: true });
  } else if (message.action === "testNotification") {
    chrome.storage.sync.get(["playSound", "requireInteraction"], (data) => {
      chrome.notifications.create("test-dhikr-id", {
        type: "basic",
        iconUrl: "icon-48.png", // Pointing directly to a standard external file name since data URIs occasionally fail in strict Chromium environments.
        title: "Test Reminder",
        message: "سبحان الله",
        priority: 2,
        silent: data.playSound === false,
        requireInteraction: data.requireInteraction === true
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, id: notificationId });
        }
      });
    });
    return true; // Keep message channel open for async sendResponse
  }
});
