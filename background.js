/**
 * Background Service Worker
 * Manages authentication state and API communication
 */

// Import required modules
importScripts('src/api.js', 'src/storage.js', 'src/auth.js');

// Global instances
let authHandler = null;
let parentalControlAPI = null;
let devices = {};
let authTabId = null;

/**
 * Handle the auth redirect URL
 */
function handleAuthRedirect(url, tabId) {
  try {
    console.log('Processing auth redirect:', url);

    // Extract session token code
    const urlForParsing = url.replace('npf54789befb391a838://', 'https://');
    const urlObj = new URL(urlForParsing);
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    const sessionTokenCode = hashParams.get('session_token_code');

    if (sessionTokenCode) {
      console.log('Captured session token code:', sessionTokenCode.substring(0, 20) + '...');

      // Store for retrieval
      chrome.storage.local.set({
        captured_session_token_code: sessionTokenCode,
        captured_at: Date.now()
      });

      // Notify any open auth helper pages
      chrome.runtime.sendMessage({
        type: 'AUTH_CODE_CAPTURED',
        sessionTokenCode: sessionTokenCode
      }).catch(() => {
        // Ignore if no listeners
        console.log('No auth helper page listening');
      });

      // Close the auth tab
      if (tabId) {
        chrome.tabs.remove(tabId).catch(() => {
          console.log('Could not close auth tab');
        });
      } else if (authTabId) {
        chrome.tabs.remove(authTabId).catch(() => {
          console.log('Could not close tracked auth tab');
        });
        authTabId = null;
      }
    }
  } catch (error) {
    console.error('Error parsing redirect URL:', error);
  }
}

/**
 * Listen for Nintendo auth redirects using webNavigation
 * This detects when the browser tries to navigate to the npf:// URL
 */
chrome.webNavigation.onErrorOccurred.addListener((details) => {
  if (details.url && details.url.startsWith('npf54789befb391a838://auth')) {
    console.log('Detected Nintendo auth redirect via onErrorOccurred');
    handleAuthRedirect(details.url, details.tabId);
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.url && details.url.startsWith('npf54789befb391a838://auth')) {
    console.log('Detected Nintendo auth redirect via onBeforeNavigate');
    handleAuthRedirect(details.url, details.tabId);
  }
});

/**
 * Initialize the extension (guarded against concurrent calls)
 */
let initPromise = null;

async function initialize() {
  if (initPromise) return initPromise;
  initPromise = _doInitialize();
  return initPromise;
}

async function _doInitialize() {
  authHandler = new AuthenticationHandler();
  const authenticated = await authHandler.initialize();

  if (authenticated) {
    console.log('User is authenticated');
    await initializeParentalControl();
  } else {
    console.log('User needs to authenticate');
  }
}

/**
 * Initialize parental control API
 */
async function initializeParentalControl() {
  try {
    parentalControlAPI = new NintendoParentalControl(authHandler.getAuth());
    devices = await parentalControlAPI.initialize();
    console.log('Devices loaded:', Object.keys(devices).length);
  } catch (error) {
    console.error('Failed to initialize parental control:', error);
  }
}

/**
 * Message handler for communication with popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.type) {
        case 'GET_AUTH_STATUS':
          if (authHandler && !authHandler.isAuthenticated) {
            // Service worker may have restarted; try re-initializing from storage
            await authHandler.initialize();
            if (authHandler.isAuthenticated) {
              await initializeParentalControl();
            }
          }
          sendResponse({
            authenticated: authHandler && authHandler.checkAuth()
          });
          break;

        case 'START_LOGIN':
          // Open auth helper page
          chrome.tabs.create({ url: 'auth-helper.html' });
          sendResponse({ success: true });
          break;

        case 'OPEN_AUTH_TAB':
          // Open the auth tab from background script
          console.log('Opening auth tab with URL:', request.url);
          chrome.tabs.create({ url: request.url }, (tab) => {
            authTabId = tab.id;
            console.log('Auth tab opened:', authTabId);
            sendResponse({ success: true, tabId: tab.id });
          });
          return true; // Keep channel open for async response
          break;

        case 'AUTH_TAB_OPENED':
          // Track the auth tab ID for automatic closure
          authTabId = request.tabId;
          console.log('Tracking auth tab:', authTabId);
          sendResponse({ success: true });
          break;

        case 'COMPLETE_LOGIN':
          // Get code verifier from storage
          const result = await chrome.storage.local.get(['auth_code_verifier']);
          if (!result.auth_code_verifier) {
            sendResponse({ success: false, error: 'Code verifier not found' });
            break;
          }

          // Set code verifier and complete login
          authHandler.auth.codeVerifier = result.auth_code_verifier;
          const loginSuccess = await authHandler.completeLogin(request.sessionTokenCode);

          if (loginSuccess) {
            await initializeParentalControl();
            // Clean up code verifier
            await chrome.storage.local.remove(['auth_code_verifier']);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Login failed' });
          }
          break;

        case 'MANUAL_LOGIN':
          await authHandler.loginWithSessionToken(request.sessionToken);
          await initializeParentalControl();
          sendResponse({ success: true });
          break;

        case 'LOGOUT':
          await authHandler.logout();
          devices = {};
          parentalControlAPI = null;
          sendResponse({ success: true });
          break;

        case 'GET_DEVICES':
          if (!parentalControlAPI) {
            await initializeParentalControl();
          }
          // Re-fetch fresh data from API for each device
          if (devices) {
            for (const deviceId in devices) {
              try {
                await devices[deviceId].update();
              } catch (error) {
                console.error('Failed to refresh device:', deviceId, error);
              }
            }
          }
          const deviceList = Object.values(devices).map(device => ({
            deviceId: device.deviceId,
            name: device.name,
            limitTime: device.limitTime,
            todayPlayingTime: device.todayPlayingTime,
            todayTimeRemaining: device.todayTimeRemaining,
            playingTimeFormatted: device.getFormattedPlayingTime(),
            timeRemainingFormatted: device.getFormattedTimeRemaining(),
            timerMode: device.timerMode,
            bedtimeAlarm: device.bedtimeAlarm,
            bedtimeEnd: device.bedtimeEnd,
            bedtimeEnabled: device.bedtimeEnabled,
            forcedTermination: device.forcedTermination,
            alarmsEnabled: device.alarmsEnabled,
            players: device.players,
            applications: device.applications
          }));
          sendResponse({ devices: deviceList });
          break;

        case 'UPDATE_DEVICE':
          const device = devices[request.deviceId];
          if (device) {
            await device.update();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Device not found' });
          }
          break;

        case 'SET_PLAYTIME_LIMIT':
          const deviceForLimit = devices[request.deviceId];
          if (deviceForLimit) {
            await deviceForLimit.updateMaxDailyPlaytime(request.minutes);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Device not found' });
          }
          break;

        case 'ADD_BONUS_TIME':
          const deviceForBonus = devices[request.deviceId];
          if (deviceForBonus) {
            await deviceForBonus.addExtraTime(request.minutes);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Device not found' });
          }
          break;

        case 'SET_BEDTIME':
          const deviceForBedtime = devices[request.deviceId];
          if (deviceForBedtime) {
            if (request.bedtimeAlarm) {
              await deviceForBedtime.setBedtimeAlarm(request.bedtimeAlarm);
            }
            if (request.bedtimeEnd) {
              await deviceForBedtime.setBedtimeEnd(request.bedtimeEnd);
            }
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Device not found' });
          }
          break;

        case 'SUSPEND_SOFTWARE':
          const deviceForSuspend = devices[request.deviceId];
          if (deviceForSuspend) {
            await deviceForSuspend.suspendSoftware();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Device not found' });
          }
          break;

        case 'GET_DAILY_SUMMARIES':
          if (parentalControlAPI) {
            const summaries = await parentalControlAPI.getDailySummaries(request.deviceId);
            sendResponse({ summaries });
          } else {
            sendResponse({ success: false, error: 'Not authenticated' });
          }
          break;

        case 'GET_MONTHLY_SUMMARY':
          if (parentalControlAPI) {
            const summary = await parentalControlAPI.getMonthlySummary(
              request.deviceId,
              request.year,
              request.month
            );
            sendResponse({ summary });
          } else {
            sendResponse({ success: false, error: 'Not authenticated' });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown request type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

/**
 * Auto-refresh device data every 5 minutes
 */
setInterval(async () => {
  if (authHandler && authHandler.checkAuth() && devices) {
    try {
      for (const deviceId in devices) {
        await devices[deviceId].update();
      }
      console.log('Devices refreshed');
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

// Initialize on install or startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  initialize();
});

// Initialize immediately
initialize();
