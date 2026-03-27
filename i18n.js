const TRANSLATIONS = {
  en: {
    // Header
    headerTitle: "Dhikr Reminder",
    headerSubtitle: "Keep your tongue moist with Allah’s remembrance.",

    // Status
    statusActive: "Active",
    statusPaused: "Paused",
    statusRunning: "Reminders are running",
    statusOff: "Reminders are turned off",

    // Popup
    settingsBtn: "Settings & Customization",
    everyMins: (n) => `Every ${n} min${n > 1 ? 's' : ''}`,

    // Settings
    sectionSettings: "Settings",
    remindEvery: "Remind me every",
    intervalUnit: "min",
    playSound: "Play Sound",
    playSoundDesc: "System notification chime",
    persistentAlert: "Persistent Alert",
    persistentAlertDesc: "Stays until dismissed",
    saveSettings: "Save Settings",
    settingNote: "Chrome limits background alarms to a minimum of 1 minute.",
    language: "Language",
    languageDesc: "Switch interface language",

    // Dhikr list
    sectionDhikrList: "My Dhikr List",
    emptyList: "Your list is empty. Add a dhikr below.",
    addPlaceholder: "Add a new dhikr",
    addBtn: "+ Add",

    // Test
    testNotification: "Send Test Notification",

    // Toasts
    toastSaved: "Settings saved",
    toastAdded: "Dhikr added",
    toastUpdated: "Dhikr updated",
    toastDeleted: "Dhikr deleted",
    toastTestSent: "Test notification sent!",
    toastError: "Error",
  },

  ar: {
    headerTitle: "تذكير الأذكار",
    headerSubtitle: "اجعل لسانك رطباً بذكر الله.",

    statusActive: "نشط",
    statusPaused: "متوقف",
    statusRunning: "التذكيرات تعمل",
    statusOff: "التذكيرات متوقفة",

    settingsBtn: "الإعدادات والتخصيص",
    everyMins: (n) => `كل ${n} دقيقة`,

    sectionSettings: "الإعدادات",
    remindEvery: "ذكّرني كل",
    intervalUnit: "د",
    playSound: "تشغيل الصوت",
    playSoundDesc: "صوت إشعار النظام",
    persistentAlert: "إشعار دائم",
    persistentAlertDesc: "يبقى حتى يتم إغلاقه",
    saveSettings: "حفظ الإعدادات",
    settingNote: "يحدّ كروم المنبّهات الخلفية بحد أدنى دقيقة واحدة.",
    language: "اللغة",
    languageDesc: "تبديل لغة الواجهة",

    sectionDhikrList: "قائمة أذكاري",
    emptyList: "القائمة فارغة. أضف ذكراً أدناه.",
    addPlaceholder: "أضف ذكراً جديداً",
    addBtn: "+ إضافة",

    testNotification: "إرسال إشعار تجريبي",

    toastSaved: "تم حفظ الإعدادات",
    toastAdded: "تمت إضافة الذكر",
    toastUpdated: "تم تحديث الذكر",
    toastDeleted: "تم حذف الذكر",
    toastTestSent: "تم إرسال الإشعار التجريبي!",
    toastError: "خطأ",
  }
};

let currentLang = 'en';

async function loadLanguage() {
  const data = await chrome.storage.sync.get(['language']);
  currentLang = data.language || 'en';
  applyLanguage();
  return currentLang;
}

async function setLanguage(lang) {
  currentLang = lang;
  await chrome.storage.sync.set({ language: lang });
  applyLanguage();
}

function t(key, ...args) {
  const val = TRANSLATIONS[currentLang][key];
  if (typeof val === 'function') return val(...args);
  return val || TRANSLATIONS.en[key] || key;
}

function applyLanguage() {
  const isRTL = currentLang === 'ar';

  // Set dir and lang on html
  document.documentElement.lang = currentLang;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', isRTL);

  // Translate all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (translated) el.textContent = translated;
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translated = t(key);
    if (translated) el.placeholder = translated;
  });

  // Translate titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const translated = t(key);
    if (translated) el.title = translated;
  });

  // Update all language toggle buttons — show the OTHER language name
  const label = isRTL ? 'English' : 'عربي';
  document.querySelectorAll('.lang-toggle-header, .lang-toggle-inline').forEach(btn => {
    btn.textContent = label;
  });
}

function getLang() {
  return currentLang;
}
