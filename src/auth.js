/**
 * Authentication Flow Handler
 * Manages the Nintendo login process and token extraction
 */

class AuthenticationHandler {
  constructor() {
    this.storage = new SecureStorage();
    this.auth = new NintendoAuth();
    this.isAuthenticated = false;
  }

  /**
   * Initialize authentication from stored data
   */
  async initialize() {
    try {
      const authData = await this.storage.loadAuthData();
      if (authData) {
        this.auth.sessionToken = authData.sessionToken;
        this.auth.accessToken = authData.accessToken;
        this.auth.accessTokenExpiry = authData.accessTokenExpiry;
        this.auth.accountId = authData.accountId;

        // Check if we need to refresh
        if (this.auth.isAccessTokenExpired()) {
          await this.auth.refreshAccessToken();
          await this.saveAuthData();
        }

        this.isAuthenticated = true;
        return true;
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
    }
    return false;
  }

  /**
   * Start the login process
   */
  async startLogin() {
    const loginUrl = await this.auth.generateLoginUrl();

    // Open login page in new tab
    chrome.tabs.create({ url: loginUrl }, (tab) => {
      // Listen for the redirect URL
      this.listenForAuthRedirect(tab.id);
    });
  }

  /**
   * Listen for authentication redirect
   */
  listenForAuthRedirect(tabId) {
    const listener = (details) => {
      if (details.tabId !== tabId) return;

      // Check if URL matches the redirect pattern (npf<client_id>://auth)
      const redirectUrlPattern = /npf[0-9a-f]+:\/\/auth/;
      if (redirectUrlPattern.test(details.url)) {
        // Extract session token code from URL
        // The URL format is: npf<client_id>://auth#session_token_code=xxx&state=yyy&session_state=zzz
        // Convert custom scheme to https:// for URL parsing
        const urlForParsing = details.url.replace(/npf[0-9a-f]+:\/\//, 'https://');

        try {
          const url = new URL(urlForParsing);
          // The parameters are in the hash, not query string
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const sessionTokenCode = hashParams.get('session_token_code');

          if (sessionTokenCode) {
            // Remove listener
            chrome.webNavigation.onBeforeNavigate.removeListener(listener);

            // Close the tab
            chrome.tabs.remove(tabId);

            // Complete login
            this.completeLogin(sessionTokenCode);
          }
        } catch (error) {
          console.error('Error parsing redirect URL:', error);
        }
      }
    };

    chrome.webNavigation.onBeforeNavigate.addListener(listener);
  }

  /**
   * Complete login with session token code
   */
  async completeLogin(sessionTokenCode) {
    try {
      console.log('Starting login process with session token code');

      // Exchange code for session token
      console.log('Exchanging code for session token...');
      await this.auth.getSessionToken(sessionTokenCode);
      console.log('Session token obtained');

      // Get access token
      console.log('Getting access token...');
      await this.auth.refreshAccessToken();
      console.log('Access token obtained');

      // Get account info
      console.log('Fetching account info...');
      await this.auth.getAccountInfo();
      console.log('Account info retrieved, ID:', this.auth.accountId);

      // Save auth data
      console.log('Saving authentication data...');
      await this.saveAuthData();
      console.log('Authentication data saved');

      this.isAuthenticated = true;

      // Notify popup that login is complete
      chrome.runtime.sendMessage({ type: 'AUTH_COMPLETE' });
      console.log('Login completed successfully');

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      chrome.runtime.sendMessage({
        type: 'AUTH_ERROR',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Manual login with session token (for advanced users)
   */
  async loginWithSessionToken(sessionToken) {
    try {
      this.auth.sessionToken = sessionToken;
      await this.auth.refreshAccessToken();
      await this.auth.getAccountInfo();
      await this.saveAuthData();
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error('Manual login failed:', error);
      throw error;
    }
  }

  /**
   * Save current authentication data
   */
  async saveAuthData() {
    const authData = {
      sessionToken: this.auth.sessionToken,
      accessToken: this.auth.accessToken,
      accessTokenExpiry: this.auth.accessTokenExpiry,
      accountId: this.auth.accountId
    };
    await this.storage.saveAuthData(authData);
  }

  /**
   * Logout and clear all data
   */
  async logout() {
    await this.storage.clearAuthData();
    this.auth = new NintendoAuth();
    this.isAuthenticated = false;
    chrome.runtime.sendMessage({ type: 'AUTH_LOGOUT' });
  }

  /**
   * Get current authentication object
   */
  getAuth() {
    return this.auth;
  }

  /**
   * Check authentication status
   */
  checkAuth() {
    return this.isAuthenticated && !!this.auth.sessionToken;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthenticationHandler };
}
