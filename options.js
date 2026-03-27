document.addEventListener('DOMContentLoaded', async () => {
  const intervalInput = document.getElementById('intervalInput');
  const soundToggle = document.getElementById('soundToggle');
  const persistentToggle = document.getElementById('persistentToggle');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const dhikrListContainer = document.getElementById('dhikrList');
  const addDhikrForm = document.getElementById('addDhikrForm');
  const newDhikrInput = document.getElementById('newDhikrInput');
  const listCount = document.getElementById('listCount');
  const testNotificationBtn = document.getElementById('testNotificationBtn');
  const masterToggle = document.getElementById('masterToggle');
  const statusLabel = document.getElementById('statusLabel');
  const statusSub = document.getElementById('statusSub');
  const statusBar = document.getElementById('statusBar');
  const langToggleBtnInline = document.getElementById('langToggleBtnInline');

  // Load language first
  await loadLanguage();

  // Load current settings from storage
  const data = await chrome.storage.sync.get(['isEnabled', 'intervalMinutes', 'dhikrList', 'playSound', 'requireInteraction']);

  let currentDhikrList = data.dhikrList || [];

  // Initialize UI
  intervalInput.value = data.intervalMinutes || 1;
  soundToggle.checked = data.playSound !== false;
  persistentToggle.checked = data.requireInteraction === true;
  masterToggle.checked = data.isEnabled !== false;
  updateStatusUI(masterToggle.checked);
  renderDhikrList();

  // Language toggle (both header and inline buttons)
  function handleLangToggle() {
    const newLang = getLang() === 'en' ? 'ar' : 'en';
    setLanguage(newLang).then(() => {
      updateStatusUI(masterToggle.checked);
      renderDhikrList();
    });
  }

  langToggleBtnInline.addEventListener('click', handleLangToggle);

  // Master Toggle
  masterToggle.addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;
    await chrome.storage.sync.set({ isEnabled });
    updateStatusUI(isEnabled);
    chrome.runtime.sendMessage({ action: "updateSettings" });
  });

  function updateStatusUI(isEnabled) {
    if (isEnabled) {
      statusLabel.textContent = t('statusActive');
      statusSub.textContent = t('statusRunning');
      statusBar.classList.add('active');
      statusBar.classList.remove('paused');
    } else {
      statusLabel.textContent = t('statusPaused');
      statusSub.textContent = t('statusOff');
      statusBar.classList.remove('active');
      statusBar.classList.add('paused');
    }
  }

  // Save Settings
  saveSettingsBtn.addEventListener('click', async () => {
    let newInterval = parseInt(intervalInput.value, 10);
    if (isNaN(newInterval) || newInterval < 1) newInterval = 1;
    intervalInput.value = newInterval;

    await chrome.storage.sync.set({
      intervalMinutes: newInterval,
      playSound: soundToggle.checked,
      requireInteraction: persistentToggle.checked
    });

    chrome.runtime.sendMessage({ action: "updateSettings" });
    showToast(t('toastSaved'));
  });

  // Add Dhikr
  addDhikrForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newText = newDhikrInput.value.trim();
    if (!newText) return;

    currentDhikrList.push(newText);
    await updateDhikrStorage();
    newDhikrInput.value = '';
    renderDhikrList();
    showToast(t('toastAdded'));
  });

  // Render list
  function renderDhikrList() {
    dhikrListContainer.innerHTML = '';

    if (currentDhikrList.length === 0) {
      dhikrListContainer.innerHTML = `<li class="empty-state">${t('emptyList')}</li>`;
    }

    currentDhikrList.forEach((dhikr, index) => {
      const li = document.createElement('li');
      li.className = 'dhikr-item';

      const span = document.createElement('span');
      span.className = 'dhikr-text';
      span.textContent = dhikr;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'dhikr-actions';

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.title = 'Edit';
      editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
      editBtn.onclick = () => handleEdit(li, index);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon delete';
      deleteBtn.title = 'Delete';
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
      deleteBtn.onclick = () => handleDelete(index);

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(actionsDiv);
      li.appendChild(span);

      dhikrListContainer.appendChild(li);
    });

    listCount.textContent = currentDhikrList.length;
  }

  // Inline edit
  function handleEdit(li, index) {
    if (li.classList.contains('editing')) return;

    li.classList.add('editing');
    const textSpan = li.querySelector('.dhikr-text');
    const currentText = textSpan.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = currentText;

    textSpan.replaceWith(input);
    input.focus();
    input.select();

    const save = async () => {
      const newText = input.value.trim();
      if (newText && newText !== currentText) {
        currentDhikrList[index] = newText;
        await updateDhikrStorage();
        showToast(t('toastUpdated'));
      }
      renderDhikrList();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = currentText; input.blur(); }
    });
  }

  function handleDelete(index) {
    currentDhikrList.splice(index, 1);
    updateDhikrStorage().then(() => {
      renderDhikrList();
      showToast(t('toastDeleted'));
    });
  }

  function updateDhikrStorage() {
    return chrome.storage.sync.set({ dhikrList: currentDhikrList });
  }

  // Toast
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // Test Notification
  testNotificationBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "testNotification" }, (response) => {
      if (chrome.runtime.lastError) {
        showToast(t('toastError') + ": " + chrome.runtime.lastError.message);
      } else if (response && response.error) {
        showToast(t('toastError') + ": check icon-48.png");
      } else {
        showToast(t('toastTestSent'));
      }
    });
  });
});
