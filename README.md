# Nintendo Switch Parental Controls - Chrome Extension

An open-source Chrome browser extension for monitoring and managing Nintendo Switch parental controls. Built based on the [Home Assistant Nintendo Parental Controls integration](https://www.home-assistant.io/integrations/nintendo_parental_controls/).

## Features

- **Real-time Monitoring**: View screen time usage and remaining playtime for all your Nintendo Switch devices
- **Remote Controls**: Manage parental settings directly from your browser
  - Set daily playtime limits
  - Configure bedtime alarms
  - Grant bonus playtime (15 or 30 minutes)
  - Suspend running software remotely
- **Secure Storage**: All authentication tokens are encrypted using AES-256-GCM
- **Multiple Devices**: Support for monitoring multiple Nintendo Switch consoles
- **Player Tracking**: View individual player statistics and application usage

## Installation

### Prerequisites

- Google Chrome or any Chromium-based browser (Edge, Brave, Opera, etc.)
- A Nintendo Account with parental controls configured
- **Important**: Do NOT have the official Nintendo Switch Parental Controls mobile app installed on the device you use for authentication

### Install from Source

1. Clone or download this repository:
   ```bash
   git clone https://github.com/yourusername/nintendo-switch-parental-controls-extension.git
   cd nintendo-switch-parental-controls-extension
   ```

2. Generate icon images (required):
   ```bash
   # Install dependencies if you have ImageMagick
   convert icons/icon.svg -resize 16x16 icons/icon16.png
   convert icons/icon.svg -resize 48x48 icons/icon48.png
   convert icons/icon.svg -resize 128x128 icons/icon128.png

   # Or use any online SVG to PNG converter to create:
   # - icons/icon16.png (16x16)
   # - icons/icon48.png (48x48)
   # - icons/icon128.png (128x128)
   ```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `nintendo-switch-parental-controls-extension` folder

4. The extension icon should appear in your browser toolbar

## Usage

### First Time Setup

1. Click the extension icon in your browser toolbar
2. Click "Sign in with Nintendo"
3. A helper page will open with step-by-step instructions
4. Click "Open Nintendo Login" to authenticate
5. Sign in with your Nintendo Account credentials
6. After clicking "Select this person", copy the redirect URL from your browser's address bar
7. Paste the URL into the helper page and click "Complete Login"
8. You'll see your Nintendo Switch device(s) in the dashboard

**Note:** The redirect URL will look like `npf54789befb391a838://auth#session_token_code=...` - make sure to copy the entire URL!

### Alternative: Manual Authentication

For advanced users who want to use an existing session token:

1. Click "Advanced: Login with Session Token"
2. Paste your session token
3. Click "Login"

To obtain a session token manually, you can use tools like [nxapi](https://github.com/samuelthomas2774/nxapi) or extract it from the authentication flow.

### Dashboard

The main dashboard shows all your registered Nintendo Switch devices with:

- Current playtime today
- Remaining playtime
- Quick access to device controls

### Device Controls

Click on any device to access detailed controls:

**Quick Actions:**
- Add 15 or 30 minutes of bonus playtime
- Suspend currently running software

**Daily Playtime Limit:**
- Set a time limit in minutes (0 for unlimited)
- Changes take effect immediately

**Bedtime Settings:**
- Configure bedtime start and end times
- Set when the console should be restricted

**Player Statistics:**
- View individual player profiles
- See per-player playtime

**Application Usage:**
- View recently played games/apps
- See playtime per application

## How It Works

This extension is based on reverse-engineered Nintendo Parental Controls API used by:

- [pynintendoauth](https://github.com/pantherale0/pynintendoauth) - Nintendo authentication library
- [pynintendoparental](https://github.com/pantherale0/pynintendoparental) - Parental controls API wrapper
- [Home Assistant integration](https://github.com/home-assistant/core/tree/dev/homeassistant/components/nintendo_parental_controls)

### Authentication Flow

1. Generate PKCE challenge for secure OAuth flow
2. User authenticates with Nintendo Account
3. Intercept the redirect URL containing the session token code
4. Exchange code for session token
5. Use session token to obtain access tokens
6. Store encrypted credentials in Chrome's secure storage

### API Communication

The extension communicates with Nintendo's cloud services:

- **Authentication**: `accounts.nintendo.com`
- **Parental Controls**: `api-lp1.pctl.srv.nintendo.net`

All API requests require valid OAuth access tokens, which are automatically refreshed when expired.

## Development

### Project Structure

```
nintendo-switch-parental-controls-extension/
├── manifest.json           # Extension manifest (Manifest V3)
├── background.js           # Service worker for background tasks
├── popup.html              # Popup UI HTML
├── popup.js                # Popup UI logic
├── css/
│   └── popup.css           # Popup styles
├── src/
│   ├── api.js              # Nintendo API client
│   ├── auth.js             # Authentication handler
│   └── storage.js          # Encrypted storage utilities
├── icons/
│   ├── icon.svg            # Source icon
│   ├── icon16.png          # 16x16 icon
│   ├── icon48.png          # 48x48 icon
│   └── icon128.png         # 128x128 icon
└── README.md               # This file
```

### Key Components

**Background Service Worker** (`background.js`):
- Manages authentication state
- Coordinates API requests
- Auto-refreshes device data every 5 minutes

**API Client** (`src/api.js`):
- Handles Nintendo authentication (OAuth with PKCE)
- Provides parental control API methods
- Manages device state and updates

**Encrypted Storage** (`src/storage.js`):
- AES-256-GCM encryption for sensitive data
- Secure key generation and storage
- Chrome storage API integration

**Authentication Handler** (`src/auth.js`):
- Orchestrates login flow
- Token management and refresh
- Session persistence

### Building

This is a pure JavaScript extension with no build step required. Simply modify the files and reload the extension in `chrome://extensions/`.

### Testing

1. Make changes to source files
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension card
4. Test your changes

## Security

- All authentication tokens are encrypted using AES-256-GCM before storage
- Encryption keys are stored separately in Chrome's secure storage
- No credentials are sent to any third-party servers
- All communication is directly with Nintendo's official API servers
- Uses Content Security Policy to prevent XSS attacks

## Privacy

This extension:

- Only stores encrypted Nintendo authentication tokens locally
- Does NOT collect, transmit, or share any personal data
- Communicates exclusively with Nintendo's official servers
- Does NOT include any analytics or tracking

## Known Limitations

- Requires internet connection for all operations (cloud-based API)
- Cannot make local connections to Switch devices
- Subject to Nintendo API rate limits
- Bonus playtime increments are limited to 5-30 minutes (Nintendo restriction)

## Troubleshooting

### "Failed to load devices"

- Ensure you're logged in with the correct Nintendo Account
- Check that parental controls are configured on your Nintendo Switch
- Try logging out and back in
- Verify your internet connection

### "Authentication failed"

- Make sure the official Nintendo Parental Controls app is NOT installed on your device
- Try clearing the extension data: Settings → Extensions → Nintendo Switch Parental Controls → Remove
- Reinstall the extension

### Device data not updating

- Click the refresh button (🔄) in the dashboard
- The extension auto-refreshes every 5 minutes
- Check that your Switch is connected to the internet

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### To-Do

- [ ] Add monthly/weekly usage statistics
- [ ] Export usage reports
- [ ] Multiple language support
- [ ] Dark mode theme
- [ ] Notification system for time limits
- [ ] Firefox support

## License

MIT License - feel free to use and modify as needed.

## Disclaimer

This is an unofficial, community-developed extension. It is not affiliated with, endorsed by, or sponsored by Nintendo. Use at your own risk.

The extension uses reverse-engineered Nintendo APIs that could change at any time. Nintendo may restrict access or change authentication methods without notice.

## Credits

Based on the excellent work by:

- [pantherale0](https://github.com/pantherale0) - pynintendoauth and pynintendoparental libraries
- [Home Assistant](https://www.home-assistant.io/) - Nintendo Parental Controls integration
- Nintendo - for creating the parental controls system

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Sources:**
- [Home Assistant Nintendo Parental Controls Integration](https://www.home-assistant.io/integrations/nintendo_parental_controls/)
- [pynintendoauth GitHub Repository](https://github.com/pantherale0/pynintendoauth)
- [pynintendoparental GitHub Repository](https://github.com/pantherale0/pynintendoparental)
- [Home Assistant Core Repository](https://github.com/home-assistant/core/tree/dev/homeassistant/components/nintendo_parental_controls)
