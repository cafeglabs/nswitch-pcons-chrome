/**
 * Authentication Helper Page Script
 */

let loginUrl = '';
let codeVerifier = '';

// Generate login URL
async function generateLoginUrl() {
  try {
    codeVerifier = generateRandomString(32);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(16);

    // Store code verifier
    await chrome.storage.local.set({ auth_code_verifier: codeVerifier });

    const params = new URLSearchParams({
      state: state,
      redirect_uri: 'npf54789befb391a838://auth',
      client_id: '54789befb391a838',
      scope: 'openid user moonUser:administration moonDevice:create moonOwnedDevice:administration moonParentalControlSetting moonParentalControlSetting:update moonParentalControlSettingState moonPairingState moonSmartDevice:administration moonDailySummary moonMonthlySummary',
      response_type: 'session_token_code',
      session_token_code_challenge: codeChallenge,
      session_token_code_challenge_method: 'S256',
      theme: 'login_form'
    });

    const url = `https://accounts.nintendo.com/connect/1.0.0/authorize?${params.toString()}`;
    return url;
  } catch (error) {
    console.error('Error generating login URL:', error);
    throw error;
  }
}

function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.style.display = 'block';
}

// Open login button
document.getElementById('openLoginBtn').addEventListener('click', async () => {
  try {
    if (!loginUrl) {
      showStatus('Generating login URL...', 'success');
      loginUrl = await generateLoginUrl();
    }

    if (!loginUrl) {
      throw new Error('Login URL is empty');
    }

    // Open directly with window.open (simpler and more reliable)
    const authWindow = window.open(loginUrl, '_blank');

    if (!authWindow) {
      showStatus('❌ Popup blocked! Please allow popups for this extension.', 'error');
      console.error('Window.open returned null - popup blocked');
    } else {
      showStatus('✅ Login page opened in new tab. After you log in, the code will be captured automatically!', 'success');
    }

  } catch (error) {
    console.error('Error opening login:', error);
    showStatus('❌ Error: ' + error.message, 'error');
  }
});

// Pre-generate login URL on page load
(async () => {
  try {
    loginUrl = await generateLoginUrl();
  } catch (error) {
    console.error('Error pre-generating URL:', error);
  }
})();

// Submit button
document.getElementById('submitBtn').addEventListener('click', async () => {
  const redirectUrl = document.getElementById('redirectUrlInput').value.trim();

  if (!redirectUrl) {
    showStatus('Please paste the redirect URL.', 'error');
    return;
  }

  if (!redirectUrl.startsWith('npf54789befb391a838://auth')) {
    showStatus('Invalid URL. Make sure you copied the complete URL starting with npf54789befb391a838://auth', 'error');
    return;
  }

  try {
    showStatus('Processing authentication...', 'success');

    // Extract session token code from URL
    const urlForParsing = redirectUrl.replace('npf54789befb391a838://', 'https://');
    const url = new URL(urlForParsing);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const sessionTokenCode = hashParams.get('session_token_code');

    if (!sessionTokenCode) {
      showStatus('Could not find session_token_code in URL. Please make sure you copied the complete URL.', 'error');
      return;
    }

    // Send to background script
    chrome.runtime.sendMessage({
      type: 'COMPLETE_LOGIN',
      sessionTokenCode: sessionTokenCode
    }, (response) => {
      if (response.success) {
        showStatus('✅ Authentication successful! You can close this tab and return to the extension.', 'success');
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        showStatus('❌ Authentication failed: ' + response.error, 'error');
      }
    });

  } catch (error) {
    showStatus('Error processing URL: ' + error.message, 'error');
  }
});

// Listen for automatic code capture
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_CODE_CAPTURED') {
    // Show success message
    document.getElementById('autoStatus').style.display = 'block';
    showStatus('🎉 Authentication code captured! Completing login...', 'success');

    // Complete the login
    chrome.runtime.sendMessage({
      type: 'COMPLETE_LOGIN',
      sessionTokenCode: message.sessionTokenCode
    }, (response) => {
      if (response.success) {
        showStatus('✅ Authentication successful! You can close this tab and return to the extension.', 'success');
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        showStatus('❌ Authentication failed: ' + response.error, 'error');
      }
    });
  }
});
