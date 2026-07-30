import { t } from './i18n.js';
import { MIN_INTERVAL, MAX_INTERVAL } from './store.js';

export const PRESETS = [1, 3, 5, 15, 30];

/**
 * Shared interval picker — preset segmented control plus a custom field.
 * Used by both the popup and the settings page.
 *
 * `getMinutes()` reads the current value.
 * `onCommit(minutes, { immediate })` writes it; `immediate: false` means the
 * caller should debounce, which is what typing in the custom field needs.
 */
export function createIntervalControl({ segmented, custom, input, error, getMinutes, onCommit }) {
  function build() {
    const buttons = PRESETS.map((minutes) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seg-btn';
      btn.setAttribute('role', 'radio');
      btn.dataset.minutes = String(minutes);
      btn.textContent = String(minutes);
      btn.setAttribute('aria-label', `${minutes} ${t('intervalUnit')}`);
      return btn;
    });

    const customBtn = document.createElement('button');
    customBtn.type = 'button';
    customBtn.className = 'seg-btn seg-btn-custom';
    customBtn.setAttribute('role', 'radio');
    customBtn.dataset.custom = 'true';
    customBtn.textContent = t('intervalCustom');

    segmented.replaceChildren(...buttons, customBtn);
  }

  function paint() {
    const minutes = getMinutes();
    const isPreset = PRESETS.includes(minutes);

    for (const btn of segmented.querySelectorAll('.seg-btn')) {
      const selected = btn.dataset.custom
        ? !isPreset
        : Number(btn.dataset.minutes) === minutes;
      btn.setAttribute('aria-checked', String(selected));
      // Only the selected radio is tabbable; arrows move within the group.
      btn.tabIndex = selected ? 0 : -1;
    }

    custom.hidden = isPreset;

    // Never rewrite the field while it has focus — a storage change landing
    // mid-typing would otherwise replace what is being typed and jump the caret.
    if (document.activeElement !== input) input.value = String(minutes);
  }

  function commit(minutes) {
    onCommit(Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, minutes)), { immediate: true });
    paint();
  }

  segmented.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    error.textContent = '';

    if (btn.dataset.custom) {
      // Reveal the field but leave the stored value alone until they type.
      custom.hidden = false;
      for (const b of segmented.querySelectorAll('.seg-btn')) {
        b.setAttribute('aria-checked', String(b === btn));
        b.tabIndex = b === btn ? 0 : -1;
      }
      input.focus();
      input.select();
      return;
    }

    commit(Number(btn.dataset.minutes));
  });

  // Arrow-key navigation, as role="radiogroup" requires.
  segmented.addEventListener('keydown', (e) => {
    const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();

    const buttons = [...segmented.querySelectorAll('.seg-btn')];
    const horizontal = e.key === 'ArrowRight' || e.key === 'ArrowLeft';
    const rtl = document.documentElement.dir === 'rtl';
    const delta = horizontal && rtl ? -step : step;

    const current = Math.max(0, buttons.findIndex((b) => b.getAttribute('aria-checked') === 'true'));
    const next = buttons[(current + delta + buttons.length) % buttons.length];
    next.click();
    next.focus();
  });

  input.addEventListener('input', () => {
    const raw = input.value.trim();
    const n = Number(raw);
    const valid = raw !== '' && Number.isFinite(n) && n >= MIN_INTERVAL && n <= MAX_INTERVAL;

    input.classList.toggle('invalid', !valid);
    error.textContent = valid ? '' : t('intervalRange', MIN_INTERVAL, MAX_INTERVAL);
    if (!valid) return;                     // keep the last valid stored value

    onCommit(Math.trunc(n), { immediate: false });
  });

  // Snap back to the stored value if the field is left invalid.
  input.addEventListener('blur', () => {
    input.classList.remove('invalid');
    error.textContent = '';
    input.value = String(getMinutes());
  });

  return { build, paint };
}
