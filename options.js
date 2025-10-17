/**
 * SafeInnocence Options Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Load theme preference (default to dark mode)
  const result = await chrome.storage.local.get(['theme']);
  const theme = result.theme || 'dark';
  applyTheme(theme);

  // Check if this is first run
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('welcome') === 'true') {
    document.getElementById('welcomeMessage').style.display = 'block';
  }

  // Check AI availability
  await checkAIAvailability();

  // Load current settings
  await loadSettings();

  // Load blocked sites
  await loadBlockedSites();

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
    const result = await chrome.storage.local.get(['settings', 'masterPasswordHash']);
    const settings = result.settings || getDefaultSettings();

    // Populate form fields
    document.getElementById('sensitivity').value = settings.sensitivity;
    document.getElementById('blockThreshold').value = settings.blockThreshold;
    document.getElementById('analyzeImages').checked = settings.analyzeImages;
    document.getElementById('analyzeText').checked = settings.analyzeText;
    document.getElementById('notifyOnBlock').checked = settings.notifyOnBlock;

    // Note: Don't populate password fields (security)
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

  // Theme toggle button
  document.getElementById('themeToggle').addEventListener('click', async () => {
    const body = document.body;
    const isLightMode = body.classList.contains('light-mode');
    const newTheme = isLightMode ? 'dark' : 'light';

    applyTheme(newTheme);
    await chrome.storage.local.set({ theme: newTheme });
  });
}

/**
 * Apply theme to page
 */
function applyTheme(theme) {
  const body = document.body;
  const container = document.querySelector('.container');
  const content = document.querySelector('.content');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  // Get all elements that need theme classes
  const sectionTitles = document.querySelectorAll('.section-title');
  const formLabels = document.querySelectorAll('.form-label');
  const formDescriptions = document.querySelectorAll('.form-description');
  const inputs = document.querySelectorAll('select, input[type="number"], input[type="password"]');
  const checkboxGroups = document.querySelectorAll('.checkbox-group');
  const blockedSiteItems = document.querySelectorAll('.blocked-site-item');
  const blockedSiteUrls = document.querySelectorAll('.blocked-site-url');
  const blockedSiteMetas = document.querySelectorAll('.blocked-site-meta');
  const buttons = document.querySelectorAll('.button-secondary');
  const aiStatus = document.querySelectorAll('.ai-status');
  const aiStatusText = document.querySelectorAll('.ai-status-text');
  const warnings = document.querySelectorAll('.warning');
  const infoBoxes = document.querySelectorAll('.info-box');

  if (theme === 'light') {
    body.classList.add('light-mode');
    container.classList.add('light-mode');
    content.classList.add('light-mode');
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark Mode';

    sectionTitles.forEach(el => el.classList.add('light-mode'));
    formLabels.forEach(el => el.classList.add('light-mode'));
    formDescriptions.forEach(el => el.classList.add('light-mode'));
    inputs.forEach(el => el.classList.add('light-mode'));
    checkboxGroups.forEach(el => el.classList.add('light-mode'));
    blockedSiteItems.forEach(el => el.classList.add('light-mode'));
    blockedSiteUrls.forEach(el => el.classList.add('light-mode'));
    blockedSiteMetas.forEach(el => el.classList.add('light-mode'));
    buttons.forEach(el => el.classList.add('light-mode'));
    aiStatus.forEach(el => el.classList.add('light-mode'));
    aiStatusText.forEach(el => el.classList.add('light-mode'));
    warnings.forEach(el => el.classList.add('light-mode'));
    infoBoxes.forEach(el => el.classList.add('light-mode'));
  } else {
    body.classList.remove('light-mode');
    container.classList.remove('light-mode');
    content.classList.remove('light-mode');
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light Mode';

    sectionTitles.forEach(el => el.classList.remove('light-mode'));
    formLabels.forEach(el => el.classList.remove('light-mode'));
    formDescriptions.forEach(el => el.classList.remove('light-mode'));
    inputs.forEach(el => el.classList.remove('light-mode'));
    checkboxGroups.forEach(el => el.classList.remove('light-mode'));
    blockedSiteItems.forEach(el => el.classList.remove('light-mode'));
    blockedSiteUrls.forEach(el => el.classList.remove('light-mode'));
    blockedSiteMetas.forEach(el => el.classList.remove('light-mode'));
    buttons.forEach(el => el.classList.remove('light-mode'));
    aiStatus.forEach(el => el.classList.remove('light-mode'));
    aiStatusText.forEach(el => el.classList.remove('light-mode'));
    warnings.forEach(el => el.classList.remove('light-mode'));
    infoBoxes.forEach(el => el.classList.remove('light-mode'));
  }
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

    // Handle master password
    const masterPassword = document.getElementById('masterPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (masterPassword || confirmPassword) {
      if (masterPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }

      if (masterPassword.length < 4) {
        alert('Password must be at least 4 characters long!');
        return;
      }

      // Hash the password (simple SHA-256)
      const passwordHash = await hashPassword(masterPassword);
      await chrome.storage.local.set({ masterPasswordHash: passwordHash });

      // Clear password fields
      document.getElementById('masterPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    }

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
 * Hash password using SHA-256
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password
 */
async function verifyPassword(inputPassword) {
  const result = await chrome.storage.local.get(['masterPasswordHash']);
  if (!result.masterPasswordHash) {
    return true; // No password set
  }

  const inputHash = await hashPassword(inputPassword);
  return inputHash === result.masterPasswordHash;
}

/**
 * Load blocked sites
 */
async function loadBlockedSites() {
  try {
    const result = await chrome.storage.local.get(['blockedSites']);
    const blockedSites = result.blockedSites || [];

    const container = document.getElementById('blockedSitesList');
    const noSitesMessage = document.getElementById('noBlockedSites');

    if (blockedSites.length === 0) {
      noSitesMessage.style.display = 'block';
      container.innerHTML = '';
      return;
    }

    noSitesMessage.style.display = 'none';
    container.innerHTML = '';

    blockedSites.forEach((site, index) => {
      const siteItem = document.createElement('div');
      siteItem.className = 'blocked-site-item';

      const siteInfo = document.createElement('div');
      siteInfo.className = 'blocked-site-info';

      const url = document.createElement('div');
      url.className = 'blocked-site-url';
      url.textContent = site.url;

      const meta = document.createElement('div');
      meta.className = 'blocked-site-meta';

      const badge = document.createElement('span');
      badge.className = `blocked-site-badge ${site.blockType === 'total' ? 'badge-total' : 'badge-partial'}`;
      badge.textContent = site.blockType === 'total' ? 'Total Block' : 'Partial Block';

      const date = document.createElement('span');
      date.textContent = new Date(site.timestamp).toLocaleString();

      const status = document.createElement('span');
      status.className = `blocked-site-badge ${site.unblocked ? 'badge-unblocked' : ''}`;
      if (site.unblocked) {
        status.textContent = site.unblocked === 'temporary' ? 'Temp Unblocked' : 'Unblocked';
      }

      meta.appendChild(badge);
      meta.appendChild(date);
      if (site.unblocked) {
        meta.appendChild(status);
      }

      siteInfo.appendChild(url);
      siteInfo.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'blocked-site-actions';

      if (!site.unblocked) {
        const unblockBtn = document.createElement('button');
        unblockBtn.className = 'btn-small btn-unblock';
        unblockBtn.textContent = 'Unblock';
        unblockBtn.onclick = () => unblockSite(index, 'permanent');
        actions.appendChild(unblockBtn);
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-small btn-remove';
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => removeSite(index);
      actions.appendChild(removeBtn);

      siteItem.appendChild(siteInfo);
      siteItem.appendChild(actions);
      container.appendChild(siteItem);
    });
  } catch (error) {
    console.error('Error loading blocked sites:', error);
  }
}

/**
 * Unblock site
 */
async function unblockSite(index, type) {
  try {
    // Check password
    const result = await chrome.storage.local.get(['masterPasswordHash']);
    if (result.masterPasswordHash) {
      const password = prompt('Enter master password to unblock:');
      if (!password) return;

      const isValid = await verifyPassword(password);
      if (!isValid) {
        alert('Incorrect password!');
        return;
      }
    }

    const result2 = await chrome.storage.local.get(['blockedSites']);
    const blockedSites = result2.blockedSites || [];

    blockedSites[index].unblocked = type;

    await chrome.storage.local.set({ blockedSites });
    await loadBlockedSites();
    showSuccessMessage();
  } catch (error) {
    console.error('Error unblocking site:', error);
  }
}

/**
 * Remove site from list
 */
async function removeSite(index) {
  try {
    // Check password
    const result = await chrome.storage.local.get(['masterPasswordHash']);
    if (result.masterPasswordHash) {
      const password = prompt('Enter master password to remove:');
      if (!password) return;

      const isValid = await verifyPassword(password);
      if (!isValid) {
        alert('Incorrect password!');
        return;
      }
    }

    if (!confirm('Are you sure you want to remove this site from the list?')) {
      return;
    }

    const result2 = await chrome.storage.local.get(['blockedSites']);
    const blockedSites = result2.blockedSites || [];

    blockedSites.splice(index, 1);

    await chrome.storage.local.set({ blockedSites });
    await loadBlockedSites();
    showSuccessMessage();
  } catch (error) {
    console.error('Error removing site:', error);
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
