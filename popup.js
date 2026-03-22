document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusLabel = document.getElementById('statusLabel');
  const intervalLabel = document.getElementById('intervalLabel');
  const optionsBtn = document.getElementById('optionsBtn');

  // Load current settings from storage
  const data = await chrome.storage.sync.get(['isEnabled', 'intervalMinutes']);
  
  // Set initial state
  toggleSwitch.checked = data.isEnabled !== false; // Default true
  updateUI(toggleSwitch.checked, data.intervalMinutes || 1);

  // Handle toggle change
  toggleSwitch.addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;
    await chrome.storage.sync.set({ isEnabled });
    updateUI(isEnabled, data.intervalMinutes || 1);
    
    // Notify background script to update alarms
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
      statusLabel.textContent = "Status: Active";
      statusLabel.style.color = "var(--success-color)";
      intervalLabel.textContent = `Reminding every ${intervalMinutes} min${intervalMinutes > 1 ? 's' : ''}`;
    } else {
      statusLabel.textContent = "Status: Paused";
      statusLabel.style.color = "var(--text-muted)";
      intervalLabel.textContent = "Reminders are turned off";
    }
  }
});
