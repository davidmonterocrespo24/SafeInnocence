/**
 * SafeInnocence Background Service Worker
 * Manages extension lifecycle and settings
 */

// Initialize default settings
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default settings on first install
    await chrome.storage.local.set({
      settings: {
        enabled: true,
        sensitivity: 'high',
        blockThreshold: 3,
        analyzeImages: true,
        analyzeText: true,
        notifyOnBlock: true
      },
      statistics: {
        totalPagesAnalyzed: 0,
        totalContentBlocked: 0,
        totalPagesBlocked: 0
      }
    });

    // Open welcome page
    chrome.tabs.create({
      url: 'options.html?welcome=true'
    });
  }
});

/**
 * Convert a Blob to a data URL
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentBlocked') {
    handleContentBlocked(request.data, sender.tab);
  } else if (request.action === 'pageBlocked') {
    handlePageBlocked(request.data, sender.tab);
  } else if (request.action === 'getSettings') {
    getSettings().then(sendResponse);
    return true; // Keep channel open for async response
  } else if (request.type === 'fetchImageAsDataURL') {
    // Handle cross-origin image fetching
    fetch(request.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => blobToDataURL(blob))
      .then(dataUrl => {
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch(error => {
        console.error('SafeInnocence: Background fetch failed:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }
});

/**
 * Handle content blocked event
 */
async function handleContentBlocked(data, tab) {
  try {
    // Update statistics
    const result = await chrome.storage.local.get(['statistics']);
    const stats = result.statistics || {};

    stats.totalContentBlocked = (stats.totalContentBlocked || 0) + 1;

    await chrome.storage.local.set({ statistics: stats });

    // Show notification if enabled
    const settings = await getSettings();
    if (settings.notifyOnBlock) {
      showNotification('Content Blocked', `Inappropriate content detected on ${tab.url}`);
    }
  } catch (error) {
    console.error('SafeInnocence: Error handling content blocked:', error);
  }
}

/**
 * Handle page blocked event
 */
async function handlePageBlocked(data, tab) {
  try {
    // Update statistics
    const result = await chrome.storage.local.get(['statistics']);
    const stats = result.statistics || {};

    stats.totalPagesBlocked = (stats.totalPagesBlocked || 0) + 1;
    stats.totalPagesAnalyzed = (stats.totalPagesAnalyzed || 0) + 1;

    await chrome.storage.local.set({ statistics: stats });

    // Show notification
    const settings = await getSettings();
    if (settings.notifyOnBlock) {
      showNotification('Page Blocked', `This page contains inappropriate content for children`);
    }

    // Update badge
    chrome.action.setBadgeText({ text: '!', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#d32f2f', tabId: tab.id });
  } catch (error) {
    console.error('SafeInnocence: Error handling page blocked:', error);
  }
}

/**
 * Get current settings
 */
async function getSettings() {
  const result = await chrome.storage.local.get(['settings']);
  return result.settings || {
    enabled: true,
    sensitivity: 'high',
    blockThreshold: 3,
    analyzeImages: true,
    analyzeText: true,
    notifyOnBlock: true
  };
}

/**
 * Show notification to user
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

// Track page navigation
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) { // Main frame only
    // Update statistics
    const result = await chrome.storage.local.get(['statistics']);
    const stats = result.statistics || {};

    stats.totalPagesAnalyzed = (stats.totalPagesAnalyzed || 0) + 1;

    await chrome.storage.local.set({ statistics: stats });

    // Reset badge
    chrome.action.setBadgeText({ text: '', tabId: details.tabId });
  }
});

// Handle context menu (future feature)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyzeImage',
    title: 'Analyze with SafeInnocence',
    contexts: ['image']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzeImage') {
    // Send message to content script to analyze specific image
    chrome.tabs.sendMessage(tab.id, {
      action: 'analyzeSpecificImage',
      imageUrl: info.srcUrl
    });
  }
});
