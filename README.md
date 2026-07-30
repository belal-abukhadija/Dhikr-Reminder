# Dhikr Reminder Chrome Extension

A beautiful, minimalist Dhikr (Islamic remembrance) reminder for your daily routine. This Chrome extension helps you maintain a consistent habit of Dhikr by sending periodic notifications directly to your browser.

## Surfaces

- **Popup** (`popup.html`) — status with a live countdown to the next reminder, master on/off, interval presets, and a link to settings.
- **Settings page** (`options.html`) — full configuration, opened in its own tab.

## Settings

| Setting | Notes |
|---|---|
| Reminders on/off | Master switch; clears the alarm when off |
| Interval | Presets 1/5/15/30/60, or a custom value from 1 to 1440 minutes |
| Active window | Optional. Reminders fire only between the two times; overnight ranges supported |
| Play sound | Mutes the system chime when off |
| Persistent alert | Notification stays until dismissed |
| Language | English or Arabic, with full RTL layout |

All settings save automatically — there is no Save button. Typed input is debounced
400ms to stay inside `chrome.storage.sync`'s 120-writes-per-minute quota.

## Dhikr list

Add, edit, delete (with undo), enable or disable entries individually, and reorder by
drag or `Alt+↑` / `Alt+↓`. Restore missing defaults, or export and import the list as
plain text, one dhikr per line. Limits: 100 entries, 200 characters each.

## Development

No dependencies and no build step. Load the repo root as an unpacked extension (see
Method 1 below).

Run the tests:

    npm test          # or: node --test "test/*.test.js"

Tests cover `js/schedule.js` (active-window arithmetic including the overnight wrap,
countdown formatting) and `js/store.js` (the v1→v2 storage migration). Both modules
are free of `chrome.*` so Node imports them directly.

## Known limitation

An extension cannot detect Windows Focus Assist or macOS Do Not Disturb. If Chrome
accepts a test notification but nothing appears on screen, check those system
settings — the extension says as much rather than reporting a success it cannot
verify.

---

## How to Install the Extension

There are two primary ways to install this extension on your browser:

### Method 1: Install from Source (Developer Mode) on your browser
This is the quickest method if you just downloaded the code from GitHub.

1. Download or clone this repository to your computer. If you downloaded a `.zip` file, extract it to a folder.
2. Open Google Chrome and navigate to `chrome://extensions/` in the address bar.
3. Turn on **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button that appears in the top left corner.
5. Select the folder containing the extension files.
6. The Dhikr Reminder extension is now installed! Pin it to your toolbar for easy access.

### Method 2: Install from the Chrome Web Store
*(Note: Use this method if the extension is officially published)*

1. Navigate to the extension's page on the [Chrome Web Store](#). 
2. Click the blue **Add to Chrome** button.
3. Click **Add extension** in the popup to confirm.
4. The extension will securely install and be added to your browser automatically.

---

## How to Publish to the Chrome Web Store

If you want to officially publish this extension so anyone can download it via Method 2, follow these straightforward steps:

1. **ZIP the Files:** Select all the necessary files in this project folder (`manifest.json`, `.html`, `.js`, `.css`, and icon image files) and compress them into a single `.zip` folder. Keep the files at the root of the ZIP, not inside a subfolder.
2. **Access the Developer Dashboard:** Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) and sign in with a Google account. *(Note: Google requires a one-time $5 registration fee to become a developer).*
3. **Upload the Extension:**
   - Click the **New Item** button in the dashboard.
   - Upload the `.zip` file you created in step 1.
4. **Complete the Store Listing:**
   - Add your title ("Dhikr Reminder") and a detailed description.
   - Upload the required graphics (a 128x128 icon, screenshots of the extension, and a 1280x800 promotional marquee image).
   - Fill out the privacy practices, ensuring you justify the use of "alarms," "notifications," and "storage" permissions.
5. **Submit:** Once all fields are complete and saved, click **Submit for Review**. 
6. **Wait for Approval:** Google's team will review the extension (this usually takes a day to a few weeks). Once approved, it will automatically go live on the Chrome Web Store!
