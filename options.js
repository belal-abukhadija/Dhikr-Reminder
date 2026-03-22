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

  // Load current settings from storage
  const data = await chrome.storage.sync.get(['isEnabled', 'intervalMinutes', 'dhikrList', 'playSound', 'requireInteraction']);

  let currentDhikrList = data.dhikrList || [];

  // Initialize UI
  intervalInput.value = data.intervalMinutes || 5;
  soundToggle.checked = data.playSound !== false; // default true
  persistentToggle.checked = data.requireInteraction === true; // default false
  masterToggle.checked = data.isEnabled !== false; // default true
  updateStatusUI(masterToggle.checked);
  renderDhikrList();

  // Master Toggle logic
  masterToggle.addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;
    await chrome.storage.sync.set({ isEnabled });
    updateStatusUI(isEnabled);
    chrome.runtime.sendMessage({ action: "updateSettings" });
  });

  function updateStatusUI(isEnabled) {
    const statusCardContainer = document.getElementById('statusCardContainer');
    if (isEnabled) {
      statusLabel.textContent = "Status: Active";
      statusLabel.style.color = "var(--primary-color)";
      statusSub.textContent = "Extension is running";
      if(statusCardContainer) statusCardContainer.classList.remove('paused');
    } else {
      statusLabel.textContent = "Status: Paused";
      statusLabel.style.color = "var(--text-muted)";
      statusSub.textContent = "Reminders are turned off";
      if(statusCardContainer) statusCardContainer.classList.add('paused');
    }
  }

  // Handle Save Settings
  saveSettingsBtn.addEventListener('click', async () => {
    let newInterval = parseInt(intervalInput.value, 10);
    if (isNaN(newInterval) || newInterval < 1) newInterval = 1;
    intervalInput.value = newInterval; // update input to reflect valid amount

    await chrome.storage.sync.set({
      intervalMinutes: newInterval,
      playSound: soundToggle.checked,
      requireInteraction: persistentToggle.checked
    });

    // Notify background script to update alarms
    chrome.runtime.sendMessage({ action: "updateSettings" });
    showToast("Settings saved successfully!");
  });

  // Handle form submit for adding a new Dhikr
  addDhikrForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newText = newDhikrInput.value.trim();
    if (!newText) return;

    currentDhikrList.push(newText);
    await updateDhikrStorage();

    newDhikrInput.value = '';
    renderDhikrList();
    showToast("Dhikr added");
  });

  // Render the list items dynamically
  function renderDhikrList() {
    dhikrListContainer.innerHTML = '';

    if (currentDhikrList.length === 0) {
      dhikrListContainer.innerHTML = `<li style="text-align:center; padding: 20px; color: var(--text-muted);">Your list is empty. Add a phrase below.</li>`;
    }

    currentDhikrList.forEach((dhikr, index) => {
      const li = document.createElement('li');
      li.className = 'dhikr-item';

      const span = document.createElement('span');
      span.className = 'dhikr-text';
      span.textContent = dhikr;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'dhikr-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => handleEdit(index);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = () => handleDelete(index);

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(actionsDiv); // Actions on the left
      li.appendChild(span); // Text on the right (since RTL context)

      dhikrListContainer.appendChild(li);
    });

    listCount.textContent = `${currentDhikrList.length} item${currentDhikrList.length !== 1 ? 's' : ''}`;
  }

  function handleEdit(index) {
    const newText = prompt("Edit your Dhikr:", currentDhikrList[index]);
    if (newText !== null && newText.trim() !== '') {
      currentDhikrList[index] = newText.trim();
      updateDhikrStorage().then(() => {
        renderDhikrList();
        showToast("Dhikr updated");
      });
    }
  }

  function handleDelete(index) {
    if (confirm('Are you sure you want to delete this Dhikr?')) {
      currentDhikrList.splice(index, 1);
      updateDhikrStorage().then(() => {
        renderDhikrList();
        showToast("Dhikr deleted");
      });
    }
  }

  function updateDhikrStorage() {
    return chrome.storage.sync.set({ dhikrList: currentDhikrList });
  }

  // Simple toast UI helper
  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'var(--text-main)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = 'var(--radius-sm)';
    toast.style.boxShadow = 'var(--shadow-md)';
    toast.style.zIndex = '1000';
    toast.style.transition = 'opacity 0.3s ease';

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Test Notification
  testNotificationBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "testNotification" }, (response) => {
      if (chrome.runtime.lastError) {
        alert("Message Error: " + chrome.runtime.lastError.message);
      } else if (response && response.error) {
        alert("Chrome API Error: " + response.error + "\n\nThis usually means your notification icon is missing or invalid. Please add a valid 48x48 PNG named 'icon-48.png' to the folder.");
      } else {
        alert("Notification sent to Windows! \n\nIf you still don't see it, please check that:\n1. Windows 'Do Not Disturb' or 'Focus Assist' is turned OFF.\n2. Notifications for Google Chrome are enabled in Windows Settings.");
      }
    });
  });

});
