# Quick Start Guide

Get up and running with the Nintendo Switch Parental Controls extension in under 5 minutes!

## Prerequisites

- [ ] Chrome or Chromium-based browser installed
- [ ] Nintendo Account with parental controls configured
- [ ] **Important**: Uninstall the official Nintendo Parental Controls mobile app from your device

## Installation Steps

### 1. Download the Extension

```bash
git clone https://github.com/yourusername/nintendo-switch-parental-controls-extension.git
cd nintendo-switch-parental-controls-extension
```

### 2. Generate Icons

**Option A - Using ImageMagick (if installed):**
```bash
./generate-icons.sh
```

**Option B - Manual (if ImageMagick not available):**
1. Visit https://cloudconvert.com/svg-to-png
2. Upload `icons/icon.svg`
3. Convert to 16x16, 48x48, and 128x128
4. Save as `icon16.png`, `icon48.png`, `icon128.png` in the `icons/` folder

### 3. Load in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Toggle "Developer mode" ON (top-right corner)
4. Click "Load unpacked"
5. Select the `nintendo-switch-parental-controls-extension` folder
6. Extension icon should appear in your toolbar

### 4. Authenticate

1. Click the extension icon
2. Click "Sign in with Nintendo"
3. Enter your Nintendo Account credentials
4. Grant permissions when prompted
5. The tab will close automatically when done

### 5. Start Managing

You're done! You can now:

- View screen time for all devices
- Set playtime limits
- Grant bonus time
- Configure bedtime alarms
- Suspend running games remotely

## Troubleshooting

### Icons won't load?
Make sure you completed step 2 and have all three PNG files in the `icons/` folder.

### Authentication fails?
- Ensure the official Nintendo app is NOT installed on your device
- Try logging out and back in
- Clear browser cache and try again

### No devices showing?
- Verify parental controls are set up on your Switch
- Check that your Switch is connected to the internet
- Click the refresh button (🔄) in the extension

## Next Steps

- Read [README.md](README.md) for detailed feature documentation
- Check [CONTRIBUTING.md](CONTRIBUTING.md) if you want to contribute
- Report issues on GitHub

## Need Help?

Open an issue on GitHub with:
- What you were trying to do
- What happened instead
- Screenshots of any errors
- Browser console output (right-click extension → Inspect → Console)

---

Enjoy managing your Nintendo Switch parental controls from your browser!
