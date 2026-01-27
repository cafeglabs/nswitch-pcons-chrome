/**
 * Popup UI Controller
 * Handles the user interface for the extension popup
 */

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginButton = document.getElementById('loginButton');
const manualLoginButton = document.getElementById('manualLoginButton');
const sessionTokenInput = document.getElementById('sessionTokenInput');
const logoutButton = document.getElementById('logoutButton');
const refreshButton = document.getElementById('refreshButton');
const devicesList = document.getElementById('devicesList');
const deviceModal = document.getElementById('deviceModal');
const closeModal = document.getElementById('closeModal');
const errorMessage = document.getElementById('errorMessage');

// State
let currentDeviceId = null;
let devices = [];

/**
 * Initialize the popup
 */
async function initialize() {
  try {
    const response = await sendMessage({ type: 'GET_AUTH_STATUS' });

    if (response.authenticated) {
      showDashboard();
      loadDevices();
    } else {
      showLogin();
    }
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  }
}

/**
 * Send message to background script
 */
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Show login screen
 */
function showLogin() {
  loginScreen.classList.remove('hidden');
  dashboardScreen.classList.add('hidden');
}

/**
 * Show dashboard screen
 */
function showDashboard() {
  loginScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
}

/**
 * Show error message
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 5000);
}

/**
 * Load devices from background
 */
async function loadDevices() {
  try {
    devicesList.innerHTML = '<div class="loading">Loading devices...</div>';

    const response = await sendMessage({ type: 'GET_DEVICES' });
    devices = response.devices || [];

    if (devices.length === 0) {
      devicesList.innerHTML = '<div class="loading">No devices found</div>';
      return;
    }

    renderDevices();
  } catch (error) {
    devicesList.innerHTML = '<div class="loading">Failed to load devices</div>';
    showError('Failed to load devices: ' + error.message);
  }
}

/**
 * Render devices list
 */
function renderDevices() {
  devicesList.innerHTML = '';

  devices.forEach(device => {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.onclick = () => openDeviceModal(device.deviceId);

    card.innerHTML = `
      <div class="device-card-header">
        <div class="device-name">${device.name}</div>
        <div class="device-status">
          <span class="status-indicator"></span>
          <span>Active</span>
        </div>
      </div>
      <div class="device-stats-mini">
        <div class="stat-mini">
          <div class="stat-mini-label">Played Today</div>
          <div class="stat-mini-value">${device.playingTimeFormatted}</div>
        </div>
        <div class="stat-mini">
          <div class="stat-mini-label">Remaining</div>
          <div class="stat-mini-value">${device.timeRemainingFormatted}</div>
        </div>
      </div>
    `;

    devicesList.appendChild(card);
  });
}

/**
 * Open device modal
 */
function openDeviceModal(deviceId) {
  const device = devices.find(d => d.deviceId === deviceId);
  if (!device) return;

  currentDeviceId = deviceId;

  // Update modal content
  document.getElementById('modalDeviceName').textContent = device.name;
  document.getElementById('modalPlayingTime').textContent = device.playingTimeFormatted;
  document.getElementById('modalTimeRemaining').textContent = device.timeRemainingFormatted;

  // Set input values
  document.getElementById('playtimeLimitInput').value = device.limitTime === -1 ? 0 : device.limitTime;

  // Bedtime inputs - gray out if not enabled
  const bedtimeAlarmInput = document.getElementById('bedtimeAlarmInput');
  const bedtimeEndInput = document.getElementById('bedtimeEndInput');
  const setBedtimeBtn = document.getElementById('setBedtimeBtn');

  if (device.bedtimeEnabled) {
    bedtimeAlarmInput.value = device.bedtimeAlarm || '';
    bedtimeEndInput.value = device.bedtimeEnd || '';
    bedtimeAlarmInput.style.opacity = '1';
    bedtimeEndInput.style.opacity = '1';
    bedtimeAlarmInput.disabled = false;
    bedtimeEndInput.disabled = false;
  } else {
    bedtimeAlarmInput.value = '';
    bedtimeEndInput.value = '';
    bedtimeAlarmInput.placeholder = 'Not set';
    bedtimeEndInput.placeholder = 'Not set';
    bedtimeAlarmInput.style.opacity = '0.5';
    bedtimeEndInput.style.opacity = '0.5';
    bedtimeAlarmInput.disabled = false;  // Keep enabled so user can set it
    bedtimeEndInput.disabled = false;
  }

  // Render players
  const playersList = document.getElementById('playersList');
  const playersSection = document.getElementById('playersSection');

  // Filter players to only show ones with valid data (nickname and/or playing_time)
  const validPlayers = device.players && device.players.length > 0
    ? device.players.filter(player => player.nickname || (player.playing_time && player.playing_time > 0))
    : [];

  if (validPlayers.length > 0) {
    playersSection.style.display = 'block';
    playersList.innerHTML = validPlayers.map(player => `
      <div class="player-item">
        <img class="player-avatar" src="${player.player_image || 'icons/icon48.png'}" alt="${player.nickname}" onerror="this.src='icons/icon48.png'" />
        <div class="player-info">
          <div class="player-name">${player.nickname}</div>
          <div class="player-time">${formatMinutes(player.playing_time || 0)} played</div>
        </div>
      </div>
    `).join('');
  } else {
    // Hide the players section entirely if no valid data
    playersSection.style.display = 'none';
  }

  // Render applications
  const appsList = document.getElementById('applicationsList');
  const appsSection = document.getElementById('applicationsSection');

  // Filter applications to only show ones with valid data (name and/or playtime)
  const validApps = device.applications && device.applications.length > 0
    ? device.applications.filter(app => app.name || app.title || (app.today_time_played && app.today_time_played > 0))
    : [];

  if (validApps.length > 0) {
    appsSection.style.display = 'block';
    appsList.innerHTML = validApps.map(app => `
      <div class="app-item">
        <img class="app-icon" src="${app.image_url || app.imageUrl || 'icons/icon48.png'}" alt="${app.name || app.title || 'Unknown'}" onerror="this.src='icons/icon48.png'" />
        <div class="app-info">
          <div class="app-name">${app.name || app.title || 'Unknown Application'}</div>
          <div class="app-time">${formatMinutes(app.today_time_played || app.playingTime || 0)} played today</div>
        </div>
      </div>
    `).join('');
  } else {
    // Hide the applications section entirely if no valid data
    appsSection.style.display = 'none';
  }

  deviceModal.classList.remove('hidden');
}

/**
 * Close device modal
 */
function closeDeviceModal() {
  deviceModal.classList.add('hidden');
  currentDeviceId = null;
}

/**
 * Format minutes to human readable
 */
function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Handle bonus time action
 */
async function addBonusTime(minutes) {
  if (!currentDeviceId) return;

  try {
    await sendMessage({
      type: 'ADD_BONUS_TIME',
      deviceId: currentDeviceId,
      minutes: minutes
    });

    await refreshCurrentDevice();
    showError('Added ' + minutes + ' minutes of bonus time');
  } catch (error) {
    showError('Failed to add bonus time: ' + error.message);
  }
}

/**
 * Handle suspend software
 */
async function suspendSoftware() {
  if (!currentDeviceId) return;

  try {
    await sendMessage({
      type: 'SUSPEND_SOFTWARE',
      deviceId: currentDeviceId
    });

    await refreshCurrentDevice();
    showError('Software suspended');
  } catch (error) {
    showError('Failed to suspend software: ' + error.message);
  }
}

/**
 * Set playtime limit
 */
async function setPlaytimeLimit() {
  if (!currentDeviceId) return;

  const minutes = parseInt(document.getElementById('playtimeLimitInput').value);
  if (isNaN(minutes) || minutes < 0) {
    showError('Please enter a valid number of minutes');
    return;
  }

  try {
    await sendMessage({
      type: 'SET_PLAYTIME_LIMIT',
      deviceId: currentDeviceId,
      minutes: minutes === 0 ? -1 : minutes
    });

    await refreshCurrentDevice();
    showError('Playtime limit updated');
  } catch (error) {
    showError('Failed to set playtime limit: ' + error.message);
  }
}

/**
 * Set bedtime
 */
async function setBedtime() {
  if (!currentDeviceId) return;

  const bedtimeAlarm = document.getElementById('bedtimeAlarmInput').value;
  const bedtimeEnd = document.getElementById('bedtimeEndInput').value;

  try {
    await sendMessage({
      type: 'SET_BEDTIME',
      deviceId: currentDeviceId,
      bedtimeAlarm: bedtimeAlarm || null,
      bedtimeEnd: bedtimeEnd || null
    });

    await refreshCurrentDevice();
    showError('Bedtime settings updated');
  } catch (error) {
    showError('Failed to set bedtime: ' + error.message);
  }
}

/**
 * Refresh current device data
 */
async function refreshCurrentDevice() {
  await loadDevices();

  if (currentDeviceId) {
    const device = devices.find(d => d.deviceId === currentDeviceId);
    if (device) {
      openDeviceModal(currentDeviceId);
    }
  }
}

/**
 * Event Listeners
 */

// Login button
loginButton.addEventListener('click', async () => {
  try {
    await sendMessage({ type: 'START_LOGIN' });
  } catch (error) {
    showError('Failed to start login: ' + error.message);
  }
});

// Manual login button
manualLoginButton.addEventListener('click', async () => {
  const sessionToken = sessionTokenInput.value.trim();
  if (!sessionToken) {
    showError('Please enter a session token');
    return;
  }

  try {
    await sendMessage({
      type: 'MANUAL_LOGIN',
      sessionToken: sessionToken
    });
    showDashboard();
    loadDevices();
  } catch (error) {
    showError('Failed to login: ' + error.message);
  }
});

// Logout button
logoutButton.addEventListener('click', async () => {
  try {
    await sendMessage({ type: 'LOGOUT' });
    showLogin();
  } catch (error) {
    showError('Failed to logout: ' + error.message);
  }
});

// Refresh button
refreshButton.addEventListener('click', () => {
  loadDevices();
});

// Close modal button
closeModal.addEventListener('click', closeDeviceModal);

// Modal action buttons
document.querySelectorAll('.btn-action').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;

    switch (action) {
      case 'bonus-5':
        await addBonusTime(5);
        break;
      case 'bonus-15':
        await addBonusTime(15);
        break;
      case 'bonus-30':
        await addBonusTime(30);
        break;
      case 'bonus-60':
        await addBonusTime(60);
        break;
      case 'limit-off':
        if (!currentDeviceId) return;
        try {
          await sendMessage({
            type: 'SET_PLAYTIME_LIMIT',
            deviceId: currentDeviceId,
            minutes: -1
          });
          await refreshCurrentDevice();
          showError('Daily limit turned off');
        } catch (error) {
          showError('Failed to turn off limit: ' + error.message);
        }
        break;
    }
  });
});

// Set playtime limit button
document.getElementById('setPlaytimeLimitBtn').addEventListener('click', setPlaytimeLimit);

// Set bedtime button
document.getElementById('setBedtimeBtn').addEventListener('click', setBedtime);

// Listen for auth complete messages
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'AUTH_COMPLETE') {
    showDashboard();
    loadDevices();
  } else if (message.type === 'AUTH_ERROR') {
    showError('Authentication failed: ' + message.error);
  } else if (message.type === 'AUTH_LOGOUT') {
    showLogin();
  }
});

/**
 * Load and display version from manifest
 */
function loadVersion() {
  const manifest = chrome.runtime.getManifest();
  const versionElement = document.getElementById('version');
  if (versionElement && manifest.version) {
    versionElement.textContent = manifest.version;
  }
}

// Initialize on load
loadVersion();
initialize();
