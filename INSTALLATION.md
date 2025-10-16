# SafeInnocence Installation Guide

Complete guide to install and configure SafeInnocence extension.

## Prerequisites

Before installing, ensure you meet these requirements:

### System Requirements
- **Chrome Browser:** Version 138 or later
- **Operating System:**
  - Windows 10 or 11
  - macOS 13+ (Ventura or later)
  - Linux
  - ChromeOS (Chromebook Plus only)
- **Storage:** At least 22GB free disk space
- **Hardware:**
  - GPU with more than 4GB VRAM, OR
  - CPU with 16GB+ RAM and 4+ cores
- **Internet:** Unmetered connection for initial AI model download

### Check Your Chrome Version

1. Open Chrome
2. Go to `chrome://settings/help`
3. Verify you have Chrome 138 or later

If you need to update Chrome, download from: https://www.google.com/chrome/

## Installation Steps

### Step 1: Generate Extension Icons

Before loading the extension, you need to generate the icon files:

1. Navigate to the `icons/` folder
2. Open `convert-icons.html` in your browser
3. Click the download buttons to save:
   - icon16.png
   - icon48.png
   - icon128.png
4. Save all files in the `icons/` directory

See `icons/GENERATE_ICONS.md` for alternative methods.

### Step 2: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Type `chrome://extensions/` in address bar, OR
   - Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" switch in top-right corner

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Browse to the `SafeInnocence` folder
   - Click "Select Folder"

4. **Verify Installation**
   - SafeInnocence should appear in your extensions list
   - The shield icon should appear in your toolbar

### Step 3: Configure AI Models

1. **Open Settings Page**
   - Click the SafeInnocence extension icon
   - Click "Settings" button

2. **Check AI Status**
   - Look at the "AI Status" section
   - You should see one of these messages:
     - "AI models ready!" - You're all set!
     - "AI models ready to download" - Continue to next step
     - "AI models unavailable" - Check system requirements

3. **Download AI Models (if needed)**
   - Visit any website
   - The models will download automatically
   - This may take 10-30 minutes depending on internet speed
   - Monitor progress at `chrome://on-device-internals`

### Step 4: Configure Settings

1. **Open Settings**
   - Click extension icon → Settings

2. **Choose Protection Level**
   - **High** (Recommended): Maximum protection
   - **Medium**: Balanced
   - **Low**: Minimum blocking

3. **Set Block Threshold**
   - Default: 3 inappropriate items
   - Lower = more strict
   - Higher = more lenient

4. **Enable/Disable Features**
   - ✓ Analyze Images (recommended)
   - ✓ Analyze Text Content (recommended)
   - ✓ Show Notifications (optional)

5. **Save Settings**
   - Click "Save Settings" button

## First Use

### Testing the Extension

1. Visit a safe website (e.g., news site)
2. Check extension icon - should show no alerts
3. Open extension popup to see statistics
4. Visit settings to verify AI status

### Understanding the Interface

**Extension Popup:**
- Toggle protection on/off
- View statistics (pages analyzed, content blocked)
- Quick access to settings

**Settings Page:**
- Configure protection sensitivity
- Enable/disable features
- View AI model status
- Check system information

## Troubleshooting Installation

### Extension Won't Load

**Problem:** "Manifest file is missing or unreadable"

**Solution:**
- Verify all files are present in folder
- Check manifest.json exists and is valid
- Ensure you selected the correct folder

### Icons Not Showing

**Problem:** Extension loads but no icon appears

**Solution:**
- Generate icon files (see Step 1)
- Ensure icon files are in `icons/` directory
- Reload extension: `chrome://extensions/` → Click reload

### AI Models Not Downloading

**Problem:** Models stuck on "ready to download"

**Solution:**
- Check you have 22GB+ free space
- Ensure internet connection is unmetered
- Restart Chrome
- Visit a website to trigger download
- Check `chrome://on-device-internals` for details

### "AI APIs Not Available" Error

**Problem:** Settings show "AI APIs not available"

**Solution:**
- Update Chrome to version 138+
- Check operating system compatibility
- Verify hardware requirements (GPU/CPU)
- Not available on mobile devices

## Uninstallation

If you need to remove SafeInnocence:

1. Go to `chrome://extensions/`
2. Find SafeInnocence
3. Click "Remove"
4. Confirm removal

**Note:** AI models will remain on your system. To remove them:
1. Go to `chrome://on-device-internals`
2. Follow instructions to clear AI models

## Getting Help

If you encounter issues:

1. **Check Requirements**
   - Review system requirements above
   - Verify Chrome version

2. **Review Logs**
   - Open DevTools (F12)
   - Check Console for errors
   - Look for "SafeInnocence" messages

3. **Check AI Status**
   - Visit `chrome://on-device-internals`
   - Verify model download status
   - Check available disk space

4. **Reset Settings**
   - Open extension settings
   - Click "Reset to Defaults"
   - Reload any open tabs

## Next Steps

After successful installation:

1. **Browse Normally**
   - Extension works automatically
   - No additional action needed

2. **Monitor Statistics**
   - Click extension icon to view stats
   - Check pages analyzed and content blocked

3. **Adjust Settings**
   - Fine-tune sensitivity as needed
   - Enable/disable features based on preference

4. **Review Blocked Content**
   - Check browser notifications
   - Review extension badge alerts

## Additional Resources

- **Main Documentation:** README.md
- **Icon Generation:** icons/GENERATE_ICONS.md
- **Chrome AI Documentation:** https://developer.chrome.com/docs/ai/built-in
- **Check AI Availability:** chrome://on-device-internals

## Privacy Notice

SafeInnocence:
- Processes everything locally on your device
- Does NOT send data to external servers
- Does NOT track your browsing
- Does NOT collect personal information

All AI processing happens on-device using Chrome's built-in Gemini Nano model.

---

**Installation Complete!** 🎉

SafeInnocence is now protecting your browsing experience. The extension works automatically in the background to keep children safe from inappropriate content.
