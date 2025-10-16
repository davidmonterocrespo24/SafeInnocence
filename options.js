/**
 * SafeInnocence Options Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check if this is first run
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('welcome') === 'true') {
    document.getElementById('welcomeMessage').style.display = 'block';
  }

  // Check AI availability
  await checkAIAvailability();

  // Load current settings
  await loadSettings();

  // Setup event listeners
  setupEventListeners();
});

/**
 * Check AI API availability
 */
async function checkAIAvailability() {
  const statusElement = document.getElementById('aiStatus');

  try {
    if (!('LanguageModel' in self && 'Summarizer' in self)) {
      statusElement.innerHTML = '⚠️ AI APIs not available. Please ensure you are using Chrome 138 or later.';
      statusElement.style.color = '#d32f2f';
      return;
    }

    // Check Prompt API availability
    const promptAvailability = await LanguageModel.availability();

    // Check Summarizer API availability
    const summarizerAvailability = await Summarizer.availability();

    if (promptAvailability === 'unavailable' && summarizerAvailability === 'unavailable') {
      statusElement.innerHTML = '⚠️ AI models unavailable. Your device may not meet the requirements.';
      statusElement.style.color = '#d32f2f';
    } else if (promptAvailability === 'downloadable' || summarizerAvailability === 'downloadable') {
      statusElement.innerHTML = '📥 AI models ready to download. They will download automatically when you visit a website.';
      statusElement.style.color = '#ff9800';
    } else if (promptAvailability === 'downloading' || summarizerAvailability === 'downloading') {
      statusElement.innerHTML = '⏳ AI models are currently downloading. This may take several minutes.';
      statusElement.style.color = '#2196F3';
    } else {
      statusElement.innerHTML = '✓ AI models ready! SafeInnocence is fully operational.';
      statusElement.style.color = '#4CAF50';
    }
  } catch (error) {
    console.error('Error checking AI availability:', error);
    statusElement.innerHTML = '⚠️ Error checking AI status: ' + error.message;
    statusElement.style.color = '#d32f2f';
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || getDefaultSettings();

    // Populate form fields
    document.getElementById('sensitivity').value = settings.sensitivity;
    document.getElementById('blockThreshold').value = settings.blockThreshold;
    document.getElementById('analyzeImages').checked = settings.analyzeImages;
    document.getElementById('analyzeText').checked = settings.analyzeText;
    document.getElementById('notifyOnBlock').checked = settings.notifyOnBlock;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Get default settings
 */
function getDefaultSettings() {
  return {
    enabled: true,
    sensitivity: 'high',
    blockThreshold: 3,
    analyzeImages: true,
    analyzeText: true,
    notifyOnBlock: true
  };
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    await saveSettings();
    showSuccessMessage();
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      await chrome.storage.local.set({
        settings: getDefaultSettings()
      });
      await loadSettings();
      showSuccessMessage();
    }
  });
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      enabled: true,
      sensitivity: document.getElementById('sensitivity').value,
      blockThreshold: parseInt(document.getElementById('blockThreshold').value),
      analyzeImages: document.getElementById('analyzeImages').checked,
      analyzeText: document.getElementById('analyzeText').checked,
      notifyOnBlock: document.getElementById('notifyOnBlock').checked
    };

    await chrome.storage.local.set({ settings });

    // Reload all tabs to apply new settings
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.url && !tab.url.startsWith('chrome://')) {
        chrome.tabs.reload(tab.id);
      }
    });
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Show success message
 */
function showSuccessMessage() {
  const message = document.getElementById('successMessage');
  message.style.display = 'block';

  setTimeout(() => {
    message.style.display = 'none';
  }, 3000);
}
