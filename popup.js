document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusLabel = document.getElementById('statusLabel');
  const intervalLabel = document.getElementById('intervalLabel');
  const optionsBtn = document.getElementById('optionsBtn');
  const statusBar = document.getElementById('statusBar');
  // Load language first
  await loadLanguage();

  // Load current settings from storage
  const data = await chrome.storage.sync.get(['isEnabled', 'intervalMinutes']);

  // Set initial state
  toggleSwitch.checked = data.isEnabled !== false;
  updateUI(toggleSwitch.checked, data.intervalMinutes || 1);

  // Handle toggle change
  toggleSwitch.addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;
    await chrome.storage.sync.set({ isEnabled });
    updateUI(isEnabled, data.intervalMinutes || 1);
    chrome.runtime.sendMessage({ action: "updateSettings" });
  });

  // Open Options Page
  optionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  function updateUI(isEnabled, intervalMinutes) {
    if (isEnabled) {
      statusLabel.textContent = t('statusActive');
      statusBar.classList.add('active');
      statusBar.classList.remove('paused');
      intervalLabel.textContent = t('everyMins', intervalMinutes);
    } else {
      statusLabel.textContent = t('statusPaused');
      statusBar.classList.remove('active');
      statusBar.classList.add('paused');
      intervalLabel.textContent = t('statusOff');
    }
  }
});
