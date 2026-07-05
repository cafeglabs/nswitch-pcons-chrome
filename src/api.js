/**
 * Nintendo Parental Controls API Client
 * Based on pynintendoauth and pynintendoparental Python libraries
 */

const API_ENDPOINTS = {
  AUTHORIZE: 'https://accounts.nintendo.com/connect/1.0.0/authorize',
  SESSION_TOKEN: 'https://accounts.nintendo.com/connect/1.0.0/api/session_token',
  TOKEN: 'https://accounts.nintendo.com/connect/1.0.0/api/token',
  MY_ACCOUNT: 'https://api.accounts.nintendo.com/2.0.0/users/me',
  PARENTAL_CONTROL: 'https://app.lp1.znma.srv.nintendo.net'
};

const CLIENT_ID = '54789befb391a838';  // Nintendo Parental Controls app client ID
const DEBUG = false; // Set to true only for local troubleshooting

class NintendoAuth {
  constructor() {
    this.sessionToken = null;
    this.accessToken = null;
    this.accessTokenExpiry = null;
    this.accountId = null;
    this.codeVerifier = null;
  }

  /**
   * Generate a random string for PKCE challenge
   */
  _generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate code challenge for PKCE
   */
  async _generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate login URL for Nintendo authentication
   */
  async generateLoginUrl() {
    this.codeVerifier = this._generateRandomString(32);
    const codeChallenge = await this._generateCodeChallenge(this.codeVerifier);
    const state = this._generateRandomString(16);

    const params = new URLSearchParams({
      state: state,
      redirect_uri: `npf${CLIENT_ID}://auth`,
      client_id: CLIENT_ID,
      scope: 'openid user moonUser:administration moonDevice:create moonOwnedDevice:administration moonParentalControlSetting moonParentalControlSetting:update moonParentalControlSettingState moonPairingState moonSmartDevice:administration moonDailySummary moonMonthlySummary',
      response_type: 'session_token_code',
      session_token_code_challenge: codeChallenge,
      session_token_code_challenge_method: 'S256',
      theme: 'login_form'
    });

    return `${API_ENDPOINTS.AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Exchange session token code for session token
   */
  async getSessionToken(sessionTokenCode) {
    const response = await fetch(API_ENDPOINTS.SESSION_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        session_token_code: sessionTokenCode,
        session_token_code_verifier: this.codeVerifier
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Session token request failed:', response.status, errorText);
      throw new Error(`Failed to get session token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.session_token) {
      throw new Error('No session token in response');
    }

    this.sessionToken = data.session_token;
    return this.sessionToken;
  }

  /**
   * Get access token from session token
   */
  async refreshAccessToken() {
    const response = await fetch(API_ENDPOINTS.TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        session_token: this.sessionToken,
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Access token request failed:', response.status, errorText);
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.id_token) {
      throw new Error('No id_token in response');
    }

    // Nintendo parental controls API uses id_token, not access_token
    this.accessToken = data.id_token;
    this.accessTokenExpiry = Date.now() + (data.expires_in * 1000);
    return this.accessToken;
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    if (!this.accessToken || Date.now() >= this.accessTokenExpiry - 60000) {
      await this.refreshAccessToken();
    }

    const response = await fetch(API_ENDPOINTS.MY_ACCOUNT, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    const data = await response.json();
    this.accountId = data.id;
    return data;
  }

  /**
   * Check if access token is expired
   */
  isAccessTokenExpired() {
    return !this.accessToken || Date.now() >= this.accessTokenExpiry - 60000;
  }
}

class NintendoParentalControl {
  constructor(auth) {
    this.auth = auth;
    this.devices = {};
  }

  /**
   * Make authenticated request to parental control API
   */
  async _apiRequest(path, method = 'GET', body = null) {
    if (this.auth.isAccessTokenExpired()) {
      await this.auth.refreshAccessToken();
    }

    const headers = {
      'Authorization': `Bearer ${this.auth.accessToken}`,
      'User-Agent': 'moon_ANDROID/2.4.0 (com.nintendo.znma; build:660; ANDROID 34)',
      'X-Moon-App-Id': 'com.nintendo.znma',
      'X-Moon-Os': 'ANDROID',
      'X-Moon-Os-Version': '34',
      'X-Moon-Model': 'Pixel 4 XL',
      'X-Moon-App-Display-Version': '2.4.0',
      'X-Moon-App-Internal-Version': '660',
      'X-Moon-TimeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      'X-Moon-Os-Language': navigator.language || 'en-US',
      'X-Moon-App-Language': navigator.language || 'en-US'
    };

    const options = {
      method,
      headers
    };

    // Only set Content-Type and body for non-GET requests
    if (body && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const url = `${API_ENDPOINTS.PARENTAL_CONTROL}${path}`;
    if (DEBUG) console.log(`API Request: ${method} ${url}`);

    const response = await fetch(url, options);

    if (DEBUG) console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Initialize and fetch devices
   */
  async initialize() {
    const data = await this._apiRequest('/v2/actions/user/fetchOwnedDevices', 'GET');

    if (data.ownedDevices) {
      for (const deviceData of data.ownedDevices) {
        const device = new Device(this, deviceData);
        this.devices[deviceData.deviceId] = device;
        // Fetch full device details including settings, players, and applications
        await device.update();
      }
    }

    return this.devices;
  }

  /**
   * Get daily summaries for a device
   */
  async getDailySummaries(deviceId) {
    return await this._apiRequest(`/v2/actions/playSummary/fetchDailySummaries?deviceId=${deviceId}`, 'GET');
  }

  /**
   * Get monthly summary for a device
   */
  async getMonthlySummary(deviceId, year, month) {
    return await this._apiRequest(`/v2/actions/playSummary/fetchMonthlySummary?deviceId=${deviceId}&year=${year}&month=${month}`, 'GET');
  }
}

class Device {
  constructor(api, data) {
    this.api = api;
    this.updateFromData(data);
  }

  /**
   * Update device data
   */
  updateFromData(data) {
    this.deviceId = data.deviceId;
    this.name = data.label || 'Nintendo Switch';
    this.syncState = data.parentalControlSettingState?.updatedAt;
    this.extra = data;

    // These will be populated when we fetch full device details
    this.limitTime = -1;
    this.todayPlayingTime = 0;
    this.todayTimeRemaining = 0;
    this.timerMode = null;
    this.bedtimeAlarm = null;
    this.bedtimeEnd = null;
    this.bedtimeEnabled = false;
    this.forcedTermination = null;
    this.alarmsEnabled = false;
    this.players = [];
    this.applications = [];
    this.playTimerRegulations = null;  // Store full regulations object for updates
  }

  /**
   * Refresh device data with full parental control settings and daily summaries
   */
  async update() {
    // Fetch parental control settings (limits, bedtime, whitelist, etc.)
    const settings = await this.api._apiRequest(`/v2/actions/parentalControlSetting/fetchParentalControlSetting?deviceId=${this.deviceId}`, 'GET');
    this._parseParentalControlSettings(settings);

    // Fetch daily summaries for actual play data (today's playtime, players, apps)
    try {
      const summaryData = await this.api.getDailySummaries(this.deviceId);
      this._parseDailySummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch daily summaries:', error);
    }

    return this;
  }

  /**
   * Parse parental control settings from API response
   */
  _parseParentalControlSettings(data) {
    if (!data.parentalControlSetting) return;

    const pcs = data.parentalControlSetting;

    // Store full playTimerRegulations for updates
    if (pcs.playTimerRegulations) {
      this.playTimerRegulations = pcs.playTimerRegulations;
      this.timerMode = pcs.playTimerRegulations.timerMode;
      this.forcedTermination = pcs.playTimerRegulations.restrictionMode;

      // Extract daily time limit from nested structure
      const dailyRegs = pcs.playTimerRegulations.dailyRegulations;
      if (dailyRegs?.timeToPlayInOneDay) {
        this.limitTime = dailyRegs.timeToPlayInOneDay.limitTime || -1;
      }

      // Extract bedtime from daily regulations
      if (dailyRegs?.bedtime) {
        this.bedtimeEnabled = dailyRegs.bedtime.enabled || false;

        // Only populate times if bedtime is actually enabled
        if (this.bedtimeEnabled) {
          const startTime = dailyRegs.bedtime.startingTime;
          const endTime = dailyRegs.bedtime.endingTime;

          if (startTime) {
            this.bedtimeAlarm = `${String(startTime.hour).padStart(2, '0')}:${String(startTime.minute).padStart(2, '0')}`;
          }
          if (endTime) {
            this.bedtimeEnd = `${String(endTime.hour).padStart(2, '0')}:${String(endTime.minute).padStart(2, '0')}`;
          }
        }
      }
    }

    // Alarm visibility
    if (pcs.alarmSetting) {
      this.alarmsEnabled = pcs.alarmSetting.visibility === 'VISIBLE';
    }

    // Applications whitelist
    if (pcs.whitelistedApplicationList) {
      this.applications = pcs.whitelistedApplicationList;
    }

    // Today's playing time from ownedDevice data
    if (data.ownedDevice?.device) {
      const device = data.ownedDevice.device;

      // Today's total playing time
      if (device.todayPlayingTime) {
        this.todayPlayingTime = device.todayPlayingTime.playingTime || 0;
      }

      // Extra playing time (bonus time remaining)
      if (device.extraPlayingTime?.inOneDay) {
        this.todayTimeRemaining = device.extraPlayingTime.inOneDay.duration || 0;
      }
    }
  }

  /**
   * Parse daily summary data to get actual play times, players, and applications
   */
  _parseDailySummary(data) {
    if (!data) return;

    const summaries = data.dailySummaries || data.items || [];
    if (summaries.length === 0) return;

    // Find today's summary
    const today = new Date().toISOString().split('T')[0];
    const todaySummary = summaries.find(s => s.date === today) || summaries[0];
    if (!todaySummary) return;

    // Update today's total playing time
    if (todaySummary.playingTime !== undefined) {
      this.todayPlayingTime = todaySummary.playingTime;
    }

    // Update players from summary data
    const players = todaySummary.players || [];
    if (players.length > 0) {
      this.players = players.map(p => ({
        nickname: p.profile?.nickname || '',
        player_image: p.profile?.imageUri || '',
        playing_time: p.playingTime || 0
      }));
    }

    // Collect applications from players' playedGames, aggregating across players
    const appMap = new Map();
    for (const player of players) {
      const games = player.playedGames || [];
      for (const game of games) {
        const appId = game.meta?.applicationId || game.meta?.title;
        const playTime = game.playingTime || 0;
        if (appMap.has(appId)) {
          appMap.get(appId).today_time_played += playTime;
          appMap.get(appId).playingTime += playTime;
        } else {
          appMap.set(appId, {
            name: game.meta?.title || '',
            title: game.meta?.title || '',
            image_url: game.meta?.imageUri?.small || '',
            imageUrl: game.meta?.imageUri?.small || '',
            today_time_played: playTime,
            playingTime: playTime
          });
        }
      }
    }

    const apps = Array.from(appMap.values());
    if (apps.length > 0) {
      this.applications = apps;
    }
  }

  /**
   * Update maximum daily playtime
   */
  async updateMaxDailyPlaytime(minutes) {
    if (!this.playTimerRegulations) {
      throw new Error('Play timer regulations not loaded');
    }

    // Clone the regulations object and update the limit time
    const updatedRegulations = JSON.parse(JSON.stringify(this.playTimerRegulations));

    // Update the nested limitTime value
    if (!updatedRegulations.dailyRegulations) {
      updatedRegulations.dailyRegulations = {};
    }
    if (!updatedRegulations.dailyRegulations.timeToPlayInOneDay) {
      updatedRegulations.dailyRegulations.timeToPlayInOneDay = {};
    }

    updatedRegulations.dailyRegulations.timeToPlayInOneDay.limitTime = minutes;
    updatedRegulations.dailyRegulations.timeToPlayInOneDay.enabled = minutes > 0;

    await this.api._apiRequest('/v3/actions/parentalControlSetting/updatePlayTimer', 'POST', {
      deviceId: this.deviceId,
      playTimerRegulations: updatedRegulations
    });
    await this.update();
  }

  /**
   * Add extra playtime
   */
  async addExtraTime(minutes) {
    await this.api._apiRequest('/v2/actions/device/updateExtraPlayingTime', 'POST', {
      deviceId: this.deviceId,
      status: 'TO_ADDED',
      additionalTime: minutes
    });
    await this.update();
  }

  /**
   * Set bedtime alarm (note: this likely requires full bedtime object)
   */
  async setBedtimeAlarm(startTime, endTime) {
    if (!this.playTimerRegulations) {
      throw new Error('Play timer regulations not loaded');
    }

    // Helper to convert "HH:MM" to {hour, minute} object
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      const [hour, minute] = timeStr.split(':').map(Number);
      return { hour, minute };
    };

    // Clone the regulations object and update bedtime
    const updatedRegulations = JSON.parse(JSON.stringify(this.playTimerRegulations));

    if (!updatedRegulations.dailyRegulations) {
      updatedRegulations.dailyRegulations = {};
    }
    if (!updatedRegulations.dailyRegulations.bedtime) {
      updatedRegulations.dailyRegulations.bedtime = {};
    }

    // Convert HH:MM strings to {hour, minute} objects
    const startTimeObj = parseTime(startTime);
    const endTimeObj = parseTime(endTime || this.bedtimeEnd);

    updatedRegulations.dailyRegulations.bedtime.startingTime = startTimeObj;
    updatedRegulations.dailyRegulations.bedtime.endingTime = endTimeObj;
    updatedRegulations.dailyRegulations.bedtime.enabled = !!(startTimeObj && endTimeObj);

    await this.api._apiRequest('/v3/actions/parentalControlSetting/updatePlayTimer', 'POST', {
      deviceId: this.deviceId,
      playTimerRegulations: updatedRegulations
    });
    await this.update();
  }

  /**
   * Suspend the currently running software
   * Note: The actual suspend endpoint needs to be verified
   */
  async suspendSoftware() {
    // This endpoint is not in the documented ENDPOINTS, may need to be found
    await this.api._apiRequest('/v2/actions/device/suspend', 'POST', {
      deviceId: this.deviceId
    });
    await this.update();
  }

  /**
   * Format remaining time as human readable
   */
  getFormattedTimeRemaining() {
    if (this.limitTime === -1 || this.limitTime === 0) {
      return 'Unlimited';
    }

    // Calculate actual remaining time: daily limit + bonus time - time played
    const totalRemaining = Math.max(0, this.limitTime + this.todayTimeRemaining - this.todayPlayingTime);

    const hours = Math.floor(totalRemaining / 60);
    const minutes = totalRemaining % 60;
    return `${hours}h ${minutes}m`;
  }

  /**
   * Format playing time as human readable
   */
  getFormattedPlayingTime() {
    const hours = Math.floor(this.todayPlayingTime / 60);
    const minutes = this.todayPlayingTime % 60;
    return `${hours}h ${minutes}m`;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NintendoAuth, NintendoParentalControl, Device };
}
