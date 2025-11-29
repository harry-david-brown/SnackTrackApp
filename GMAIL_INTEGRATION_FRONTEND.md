# Gmail Integration - Frontend Implementation

## Overview

The Gmail OAuth integration has been successfully implemented in the SnackTrack React Native app. Users can now connect their Gmail accounts and automatically import Uber Eats receipts directly from their email.

## Implementation Summary

### Files Created/Modified

#### New Files:
1. **`services/gmailApi.ts`** - Gmail API service for backend communication
   - `getAuthUrl()` - Get OAuth URL for mobile apps
   - `exchangeToken()` - Exchange authorization code for tokens
   - `getStatus()` - Check Gmail connection status
   - `importReceipts()` - Import receipts from Gmail
   - `disconnect()` - Disconnect Gmail account

2. **`components/GmailConnection.tsx`** - Gmail connection component
   - OAuth flow handling with deep links
   - Connection status display
   - Import functionality
   - Disconnect option
   - User-friendly UI with instructions

#### Modified Files:
1. **`app/(tabs)/upload.tsx`** - Added Gmail import option
   - New "Import from Gmail" card alongside ZIP upload
   - Modal for Gmail connection flow
   - Integration with existing upload flow

2. **`package.json`** - Added dependency
   - `expo-web-browser` for OAuth browser flow

## Features Implemented

### 1. OAuth Flow
- ✅ Opens system browser for Google OAuth
- ✅ Uses deep linking (`snacktrack://oauth/callback`)
- ✅ Handles authorization code exchange
- ✅ Stores tokens securely on backend
- ✅ Error handling for failed authorization

### 2. Connection Management
- ✅ Check connection status on component mount
- ✅ Display connection status with email
- ✅ Connect/Disconnect functionality
- ✅ Visual feedback with loading states

### 3. Receipt Import
- ✅ Import receipts with "Add New" or "Replace All" options
- ✅ Display import results (count, total amount)
- ✅ Refresh analytics after import
- ✅ Trigger processing loader and navigation to wrapped journey

### 4. User Experience
- ✅ Clear instructions and information cards
- ✅ Privacy assurance messaging
- ✅ Consistent styling with existing app design
- ✅ Loading indicators for async operations
- ✅ Error messages with actionable information

## Deep Linking Configuration

The app is already configured with the URL scheme `snacktrack://` in `app.config.js`:

```javascript
{
  "scheme": "snacktrack",
  "extra": {
    "router": {
      "origin": "snacktrack://"
    }
  }
}
```

OAuth callbacks will be handled at: `snacktrack://oauth/callback?code=xxx&state=xxx`

## Backend Integration

The frontend integrates with the following backend endpoints (already implemented):

1. **GET `/gmail/auth-url`** - Get OAuth URL
2. **POST `/gmail/exchange-token`** - Exchange authorization code
3. **GET `/gmail/status`** - Check connection status
4. **POST `/gmail/import`** - Import receipts
5. **POST `/gmail/disconnect`** - Disconnect Gmail

## User Flow

1. **Open Upload Screen** → Tap "Import from Gmail" card
2. **Gmail Connection Modal** → Shows connection status and instructions
3. **Connect Gmail** → Opens system browser for Google OAuth
4. **Authorize** → User grants Gmail read-only access
5. **Callback** → App receives authorization code via deep link
6. **Exchange Token** → Backend stores OAuth tokens
7. **Import Receipts** → User taps "Import Receipts" button
8. **Choose Import Mode** → "Add New" or "Replace All"
9. **Processing** → Shows loader while importing
10. **Complete** → Analytics refreshed, navigates to wrapped journey

## Testing the Integration

### Prerequisites

1. **Backend Setup:**
   - Gmail OAuth credentials configured in backend `.env`
   - `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` set
   - `MOBILE_REDIRECT_URI=snacktrack://oauth/callback`

2. **Google Cloud Console:**
   - Add `snacktrack://oauth/callback` to authorized redirect URIs
   - Enable Gmail API
   - Create OAuth 2.0 credentials

### Manual Testing Steps

1. **Start the App:**
   ```bash
   cd SnackTrackApp
   npm start
   ```

2. **Navigate to Upload Tab:**
   - Tap on "Upload" in bottom navigation
   - You should see two cards: "Upload ZIP File" and "Import from Gmail"

3. **Test Gmail Connection:**
   - Tap "Import from Gmail" card
   - Modal should open showing "Gmail Not Connected"
   - Tap "Connect Gmail" button
   - System browser should open with Google OAuth screen
   - Sign in with Google account
   - Grant Gmail read-only permission
   - App should receive callback and show "Gmail Connected"

4. **Test Receipt Import:**
   - With Gmail connected, tap "Import Receipts"
   - Choose "Add New" or "Replace All"
   - Wait for import to complete
   - Should see success message with count and total amount
   - Analytics should refresh automatically

5. **Test Disconnect:**
   - Tap "Disconnect" button
   - Confirm disconnection
   - Status should change to "Gmail Not Connected"

### Debugging

If OAuth flow fails:

1. **Check Backend Logs:**
   ```bash
   # Look for Gmail OAuth URL generation
   🔐 Generated Gmail OAuth URL for user: [userId]
   
   # Look for token exchange
   ✅ Received Gmail OAuth tokens for user: [userId]
   ✅ Stored Gmail tokens for user: [userId]
   ```

2. **Check App Console:**
   - Look for deep link handling logs
   - Check for API errors in network requests

3. **Verify Configuration:**
   - Backend: `MOBILE_REDIRECT_URI=snacktrack://oauth/callback`
   - Google Cloud Console: Redirect URI matches
   - App: Scheme is `snacktrack`

4. **Common Issues:**
   - **"No refresh token received"**: Make sure `prompt: 'consent'` is set in OAuth URL
   - **Deep link not working**: Check URL scheme configuration in `app.config.js`
   - **API errors**: Verify backend is running and accessible
   - **OAuth popup doesn't close**: This is expected - use back button to return to app

## Production Deployment

### iOS
1. Add URL scheme to Info.plist (already handled by Expo)
2. Test deep linking on physical device
3. Submit for App Store review with OAuth disclosure

### Android
1. Add intent filter to AndroidManifest.xml (already handled by Expo)
2. Test deep linking on physical device
3. Submit to Play Store with OAuth disclosure

## Security Considerations

- ✅ OAuth tokens stored securely on backend (not in app)
- ✅ Only read-only Gmail access requested
- ✅ Authorization header used for all API requests
- ✅ No Gmail credentials stored in app
- ✅ HTTPS required for production OAuth

## Future Enhancements

- [ ] Automatic scheduled imports
- [ ] Import progress indicator
- [ ] Support for other delivery services (DoorDash, Grubhub)
- [ ] Import history tracking
- [ ] Batch import with background processing

## Troubleshooting

### OAuth Flow Issues
- Ensure backend OAuth credentials are valid
- Check redirect URI matches in Google Cloud Console
- Verify deep linking is configured correctly

### Import Issues
- Check user has Uber Eats receipt emails
- Verify Gmail API is enabled in Google Cloud Console
- Check backend logs for parsing errors

### UI Issues
- Verify expo-web-browser is installed
- Check modal rendering on different screen sizes
- Test on both iOS and Android

## Support

For issues or questions:
1. Check backend logs for detailed error messages
2. Verify Gmail OAuth setup in Google Cloud Console
3. Test with mock data mode first (backend feature)
4. Review API documentation in GMAIL_INTEGRATION.md

---

**Implementation Status:** ✅ Complete and ready for testing

**Next Steps:** Test on physical devices and deploy to production

