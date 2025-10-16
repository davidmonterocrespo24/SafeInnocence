/**
 * SafeInnocence Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Load current statistics
  await loadStatistics();

  // Load settings
  await loadSettings();

  // Setup event listeners
  setupEventListeners();
});

/**
 * Load statistics from storage
 */
async function loadStatistics() {
  try {
    const result = await chrome.storage.local.get(['statistics']);
    const stats = result.statistics || {
      totalPagesAnalyzed: 0,
      totalContentBlocked: 0,
      totalPagesBlocked: 0
    };

    document.getElementById('pagesAnalyzed').textContent = stats.totalPagesAnalyzed;
    document.getElementById('contentBlocked').textContent = stats.totalContentBlocked;
    document.getElementById('pagesBlocked').textContent = stats.totalPagesBlocked;
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || { enabled: true };

    document.getElementById('enableToggle').checked = settings.enabled;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Enable/disable toggle
  document.getElementById('enableToggle').addEventListener('change', async (e) => {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};

      settings.enabled = e.target.checked;

      await chrome.storage.local.set({ settings });

      // Reload active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.reload(tab.id);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Reset statistics button
  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all statistics?')) {
      await chrome.storage.local.set({
        statistics: {
          totalPagesAnalyzed: 0,
          totalContentBlocked: 0,
          totalPagesBlocked: 0
        }
      });

      await loadStatistics();
    }
  });
}
