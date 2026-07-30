import { getState, setState } from './store.js';

const TRANSLATIONS = {
  en: {
    // Header
    headerTitle: 'Dhikr Reminder',
    headerSubtitle: 'Keep your tongue moist with Allah’s remembrance.',

    // Status
    statusActive: 'Active',
    statusPaused: 'Paused',
    statusOff: 'Reminders are turned off',
    nextIn: (formatted) => `Next in ${formatted}`,
    resumesAt: (time) => `Resumes at ${time}`,
    nothingEnabled: 'No dhikr enabled',

    // Popup
    openSettings: 'Settings & Customization',
    quickInterval: 'Reminder interval',

    // Reminders
    sectionReminders: 'Reminders',
    remindersOn: 'Reminders',
    remindEvery: 'Remind me every',
    intervalUnit: 'min',
    intervalCustom: 'Custom',
    intervalCustomLabel: 'Custom interval in minutes',
    intervalRange: (min, max) => `Enter a number between ${min} and ${max}.`,
    activeWindow: 'Active window',
    activeWindowDesc: 'Only remind me during these hours',
    windowFrom: 'From',
    windowTo: 'To',
    windowOvernight: 'Overnight window — reminders continue past midnight.',
    windowAllDay: 'Start and end match, so reminders run all day.',

    // Notifications
    sectionNotifications: 'Notifications',
    playSound: 'Play sound',
    playSoundDesc: 'System notification chime',
    persistentAlert: 'Persistent alert',
    persistentAlertDesc: 'Stays on screen until dismissed',
    sendTest: 'Send test notification',
    settingNote: 'Chrome limits background alarms to a minimum of 1 minute.',
    healthBlocked: 'Chrome notifications are blocked for this extension. Reminders cannot be shown until you allow them in Chrome settings.',
    healthNoShow: 'Chrome accepted the notification. If you saw nothing, check your system Do Not Disturb or Focus Assist — an extension cannot detect those.',

    // Dhikr list
    sectionDhikrList: 'My Dhikr List',
    emptyList: 'Your list is empty. Add a dhikr below.',
    addPlaceholder: 'Add a new dhikr',
    addBtn: 'Add',
    listEmptyWarning: 'Your list is empty, so no reminders will be shown.',
    listNoneEnabledWarning: 'Every dhikr is disabled, so no reminders will be shown.',
    editAria: (text) => `Edit ${text}`,
    deleteAria: (text) => `Delete ${text}`,
    enableAria: (text) => `Include ${text} in reminders`,
    reorderAria: (text) => `Reorder ${text}. Use Alt with the arrow keys to move it.`,
    saveEdit: 'Save',
    cancelEdit: 'Cancel',
    restoreDefaults: 'Restore defaults',
    exportList: 'Export',
    importList: 'Import',
    counter: (n, max) => `${n} of ${max}`,

    // Language
    language: 'Language',
    languageDesc: 'Switch interface language',

    // Toasts
    toastSaved: 'Settings saved',
    toastAdded: 'Dhikr added',
    toastUpdated: 'Dhikr updated',
    toastDeleted: 'Dhikr deleted',
    toastRestored: 'Dhikr restored',
    toastReordered: 'Order updated',
    toastTestSent: 'Test notification sent',
    toastDefaultsRestored: (n) => `${n} default dhikr restored`,
    toastNothingToRestore: 'Nothing new to add — they are all in your list already',
    toastImported: (n) => `${n} dhikr imported`,
    toastExported: 'List exported',
    toastError: 'Error',
    undo: 'Undo',

    // Validation
    errEmpty: 'Enter some text first.',
    errDuplicate: 'That dhikr is already in your list.',
    errTooLong: (max) => `Keep it under ${max} characters.`,
    errFull: (max) => `Your list is full (${max} maximum).`,
    errBadTime: 'Use a 24-hour time like 07:00.',
  },

  ar: {
    headerTitle: 'تذكير الأذكار',
    headerSubtitle: 'اجعل لسانك رطباً بذكر الله.',

    statusActive: 'نشط',
    statusPaused: 'متوقف',
    statusOff: 'التذكيرات متوقفة',
    nextIn: (formatted) => `التالي بعد ${formatted}`,
    resumesAt: (time) => `يستأنف في ${time}`,
    nothingEnabled: 'لا يوجد ذكر مُفعَّل',

    openSettings: 'الإعدادات والتخصيص',
    quickInterval: 'مدة التذكير',

    sectionReminders: 'التذكيرات',
    remindersOn: 'التذكيرات',
    remindEvery: 'ذكّرني كل',
    intervalUnit: 'د',
    intervalCustom: 'مخصص',
    intervalCustomLabel: 'مدة مخصصة بالدقائق',
    intervalRange: (min, max) => `أدخل رقماً بين ${min} و ${max}.`,
    activeWindow: 'فترة التذكير',
    activeWindowDesc: 'ذكّرني في هذه الساعات فقط',
    windowFrom: 'من',
    windowTo: 'إلى',
    windowOvernight: 'فترة ليلية — تستمر التذكيرات بعد منتصف الليل.',
    windowAllDay: 'البداية والنهاية متطابقتان، لذا تعمل التذكيرات طوال اليوم.',

    sectionNotifications: 'الإشعارات',
    playSound: 'تشغيل الصوت',
    playSoundDesc: 'صوت إشعار النظام',
    persistentAlert: 'إشعار دائم',
    persistentAlertDesc: 'يبقى على الشاشة حتى يتم إغلاقه',
    sendTest: 'إرسال إشعار تجريبي',
    settingNote: 'يحدّ كروم المنبّهات الخلفية بحد أدنى دقيقة واحدة.',
    healthBlocked: 'إشعارات كروم محجوبة لهذه الإضافة. لا يمكن عرض التذكيرات حتى تسمح بها في إعدادات كروم.',
    healthNoShow: 'قبل كروم الإشعار. إن لم ترَ شيئاً، تحقق من وضع «عدم الإزعاج» أو «مساعد التركيز» في نظامك — لا تستطيع الإضافة كشفهما.',

    sectionDhikrList: 'قائمة أذكاري',
    emptyList: 'القائمة فارغة. أضف ذكراً أدناه.',
    addPlaceholder: 'أضف ذكراً جديداً',
    addBtn: 'إضافة',
    listEmptyWarning: 'قائمتك فارغة، لذا لن تظهر أي تذكيرات.',
    listNoneEnabledWarning: 'كل الأذكار معطّلة، لذا لن تظهر أي تذكيرات.',
    editAria: (text) => `تعديل ${text}`,
    deleteAria: (text) => `حذف ${text}`,
    enableAria: (text) => `تضمين ${text} في التذكيرات`,
    reorderAria: (text) => `ترتيب ${text}. استخدم Alt مع أسهم لوحة المفاتيح للتحريك.`,
    saveEdit: 'حفظ',
    cancelEdit: 'إلغاء',
    restoreDefaults: 'استعادة الافتراضية',
    exportList: 'تصدير',
    importList: 'استيراد',
    counter: (n, max) => `${n} من ${max}`,

    language: 'اللغة',
    languageDesc: 'تبديل لغة الواجهة',

    toastSaved: 'تم حفظ الإعدادات',
    toastAdded: 'تمت إضافة الذكر',
    toastUpdated: 'تم تحديث الذكر',
    toastDeleted: 'تم حذف الذكر',
    toastRestored: 'تمت استعادة الذكر',
    toastReordered: 'تم تحديث الترتيب',
    toastTestSent: 'تم إرسال الإشعار التجريبي',
    toastDefaultsRestored: (n) => `تمت استعادة ${n} ذكراً افتراضياً`,
    toastNothingToRestore: 'لا جديد لإضافته — كلها موجودة في قائمتك بالفعل',
    toastImported: (n) => `تم استيراد ${n} ذكراً`,
    toastExported: 'تم تصدير القائمة',
    toastError: 'خطأ',
    undo: 'تراجع',

    errEmpty: 'أدخل نصاً أولاً.',
    errDuplicate: 'هذا الذكر موجود بالفعل في قائمتك.',
    errTooLong: (max) => `اجعله أقل من ${max} حرفاً.`,
    errFull: (max) => `قائمتك ممتلئة (${max} كحد أقصى).`,
    errBadTime: 'استخدم صيغة 24 ساعة مثل 07:00.',
  },
};

let currentLang = 'en';

export function getLang() {
  return currentLang;
}

export function t(key, ...args) {
  const value = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key];
  if (typeof value === 'function') return value(...args);
  return value ?? key;
}

export async function initLanguage() {
  const state = await getState();
  currentLang = state.language;
  applyLanguage();
  return currentLang;
}

export async function setLanguage(lang) {
  currentLang = lang === 'ar' ? 'ar' : 'en';
  setState({ language: currentLang }, { immediate: true });
  applyLanguage();
}

const ATTRS = [
  ['data-i18n', (el, v) => { el.textContent = v; }],
  ['data-i18n-placeholder', (el, v) => { el.placeholder = v; }],
  ['data-i18n-aria', (el, v) => { el.setAttribute('aria-label', v); }],
  ['data-i18n-title', (el, v) => { el.title = v; }],
];

export function applyLanguage() {
  const isRTL = currentLang === 'ar';
  document.documentElement.lang = currentLang;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

  for (const [attr, apply] of ATTRS) {
    for (const el of document.querySelectorAll(`[${attr}]`)) {
      apply(el, t(el.getAttribute(attr)));
    }
  }

  // Language switches always offer the OTHER language.
  for (const btn of document.querySelectorAll('[data-lang-switch]')) {
    btn.textContent = isRTL ? 'English' : 'عربي';
    btn.setAttribute('aria-label', isRTL ? 'Switch to English' : 'التبديل إلى العربية');
  }
}
