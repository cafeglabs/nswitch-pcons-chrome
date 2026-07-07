# Troubleshooting Guide

## Authentication Issues

### "User needs to authenticate" message persists

**Solution 1: Use the Authentication Helper**

1. Click the extension icon
2. Click "Sign in with Nintendo"
3. Follow ALL steps in the helper page carefully:
   - Click "Open Nintendo Login"
   - Log in to Nintendo
   - **Copy the ENTIRE redirect URL** (starts with `npf54789befb391a838://auth#`)
   - Paste it into the helper page
   - Click "Complete Login"

**Common mistakes:**
- ❌ Not copying the complete URL
- ❌ Copying only part of the URL
- ❌ Not including the `#session_token_code=...` part

✅ **Correct URL format:**
```
npf54789befb391a838://auth#session_token_code=eyJhbG...&state=abc123&session_state=xyz789
```

### "Invalid Request" error from Nintendo

This was fixed in the latest version. Make sure you:

1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Find "Switch Family Controls"
   - Click the reload button (🔄)

2. **Clear old auth data**:
   - Right-click extension icon → Inspect
   - In Console, run: `chrome.storage.local.clear(() => console.log('Cleared'))`
   - Close inspector and try again

### Can't copy the redirect URL

If the page redirects too quickly or closes:

1. **Open browser's Network Inspector first**:
   - Press F12 to open DevTools
   - Go to Network tab
   - Make sure "Preserve log" is checked
   - Then complete the Nintendo login
   - Look for the `npf54789befb391a838://auth#...` URL in the network log

2. **Or use the Manual Session Token method**:
   - Use [nxapi](https://github.com/samuelthomas2774/nxapi) to get a session token
   - In extension, click "Advanced: Login with Session Token"
   - Paste the token and click "Login"

## Device Issues

### No devices showing up

**Check 1: Parental Controls Configured**
- Make sure parental controls are set up on your Nintendo Switch
- Go to Switch Settings → Parental Controls → check if it's configured

**Check 2: Switch is Online**
- Your Switch must be connected to the internet
- The parental controls data is stored in Nintendo's cloud

**Check 3: Refresh**
- Click the refresh button (🔄) in the extension
- Wait a few seconds for data to load

**Check 4: Check Console for Errors**
1. Right-click extension icon → Inspect
2. Go to Console tab
3. Look for any error messages
4. Share them in a GitHub issue if needed

### Data not updating

The extension auto-refreshes every 5 minutes. To manually refresh:
- Click the refresh button (🔄) in the dashboard

## Permission Errors

### "Extension requires additional permissions"

1. Go to `chrome://extensions/`
2. Find "Switch Family Controls"
3. Make sure these permissions are enabled:
   - Storage
   - Web Navigation

### CORS or network errors

This usually means Nintendo's API is blocking the request. Check:

1. Make sure you're using the latest version
2. Check your internet connection
3. Try logging out and back in
4. Nintendo may be doing maintenance (check [Nintendo Support](https://www.nintendo.com/support/))

## Feature Issues

### Can't set playtime limits

Make sure:
- You're authenticated with the correct account
- You have parental control permissions for the device
- The limit is in valid range (0 for unlimited, or 15-360 minutes)

### Bonus time not working

Nintendo restricts bonus time:
- Only 5, 10, 15, or 30 minute increments
- Check if you've already granted bonus time today

### Bedtime settings won't save

Make sure:
- Time format is correct (HH:MM in 24-hour format)
- Bedtime end must be after bedtime start
- You have the correct permissions

## Debugging

### Enable Debug Logging

1. Right-click extension icon → Inspect
2. Keep the Console tab open
3. Try the action that's failing
4. Look for detailed error messages

### Check API Responses

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "nintendo"
4. Attempt the failing action
5. Check the API response for error details

### Export Debug Info

Run this in the extension's Console:

```javascript
chrome.storage.local.get(null, (data) => {
  console.log('Storage (tokens removed for security):');
  const safe = {...data};
  delete safe.nintendo_auth_data;
  delete safe.nintendo_encryption_key;
  console.log(safe);
});
```

## Still Need Help?

### Before Opening an Issue

Please provide:
1. Chrome version
2. Extension version
3. What you were trying to do
4. What actually happened
5. Console error messages
6. Network tab screenshots (with sensitive data removed)

### Known Limitations

- Extension can't intercept custom URL schemes automatically (hence the manual copy/paste)
- Nintendo API rate limits may cause temporary issues
- Requires internet connection for all operations
- Depends on Nintendo's API (may change without notice)

## Emergency: Complete Reset

If nothing works, do a complete reset:

```javascript
// In extension Console (right-click icon → Inspect)
chrome.storage.local.clear(() => {
  console.log('All data cleared');
  location.reload();
});
```

Then:
1. Reload extension in `chrome://extensions/`
2. Start authentication from scratch
3. Use the Authentication Helper carefully

---

**Still having issues?** Open an issue on GitHub with debug details!
