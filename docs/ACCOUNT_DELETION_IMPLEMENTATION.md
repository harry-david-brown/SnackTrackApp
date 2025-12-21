# Account Deletion Feature - Frontend Implementation Guide

## Overview

This document provides all the context needed to implement the account deletion feature in the frontend. Users will be able to delete their account from the profile screen, which will permanently remove all their data from the system.

## API Endpoint

### Endpoint Details
- **Method:** `DELETE`
- **URL:** `${API_BASE_URL}/auth/delete-account`
- **Authentication:** Required (JWT Bearer token)
- **Content-Type:** `application/json`

### Request

#### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Body (Optional)
```json
{
  "refreshToken": "<user_refresh_token>"
}
```

**Note:** The `refreshToken` is optional but recommended. If provided, it will be revoked during account deletion, ensuring the user cannot use it after deletion.

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

#### Error Responses

**401 Unauthorized**
- Missing or invalid access token
- Token has expired
```json
{
  "error": "Access token is required"
}
```

**404 Not Found**
- User account not found (shouldn't happen if token is valid)
```json
{
  "error": "User not found"
}
```

**500 Internal Server Error**
- Server error during deletion
```json
{
  "error": "Failed to delete account",
  "details": "Error message"
}
```

## What Gets Deleted

When a user deletes their account, the following data is permanently removed:

1. **All Receipts** - All order history and spending data
2. **OAuth Accounts** - Google, Apple, or other OAuth connections
3. **User Record** - The user account itself
4. **Cached Data** - All cached analytics and summaries
5. **Refresh Tokens** - If provided in the request, refresh tokens are revoked

**⚠️ Important:** This action is **irreversible**. Once deleted, the account and all associated data cannot be recovered.

## Implementation Steps

### 1. Add Delete Account Button

Add a button to the profile/settings screen:

```tsx
// Example: ProfileScreen.tsx or SettingsScreen.tsx
import { useState } from 'react';
import { Alert } from 'react-native';

const ProfileScreen = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data, including:\n\n• All receipts and order history\n• All spending analytics\n• OAuth connections\n\nThis action is irreversible.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ],
      { cancelable: true }
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'This is your last chance to cancel. Your account will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: performAccountDeletion,
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    setIsDeleting(true);
    try {
      // Implementation below
    } catch (error) {
      // Error handling below
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View>
      {/* Other profile content */}
      
      <Button
        title="Delete Account"
        onPress={handleDeleteAccount}
        disabled={isDeleting}
        color="red"
      />
    </View>
  );
};
```

### 2. Implement API Call

Create or update your API service:

```typescript
// services/authApi.ts or similar
import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

export const deleteAccount = async (
  accessToken: string,
  refreshToken?: string
): Promise<DeleteAccountResponse> => {
  const response = await axios.delete<DeleteAccountResponse>(
    `${API_BASE_URL}/auth/delete-account`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: refreshToken ? { refreshToken } : {},
    }
  );
  return response.data;
};
```

### 3. Complete Implementation Example

```typescript
// Complete example with error handling
import { deleteAccount } from '../services/authApi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const performAccountDeletion = async () => {
  setIsDeleting(true);
  
  try {
    const { accessToken, refreshToken } = useAuth();
    
    if (!accessToken) {
      Alert.alert('Error', 'You must be logged in to delete your account');
      return;
    }

    // Call the API
    await deleteAccount(accessToken, refreshToken);
    
    // Success - clear local state and navigate
    await clearUserData(); // Clear local storage, cache, etc.
    await signOut(); // Sign out the user
    
    Alert.alert(
      'Account Deleted',
      'Your account has been permanently deleted.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to login/signup screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  } catch (error: any) {
    console.error('Account deletion error:', error);
    
    let errorMessage = 'Failed to delete account. Please try again.';
    
    if (error.response) {
      // API returned an error
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (status === 404) {
        errorMessage = 'Account not found. It may have already been deleted.';
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'Network error. Please check your connection and try again.';
    }
    
    Alert.alert('Deletion Failed', errorMessage);
  } finally {
    setIsDeleting(false);
  }
};
```

### 4. Post-Deletion Actions

After successful deletion, you should:

1. **Clear Local Storage**
   ```typescript
   // Clear all user-related data from AsyncStorage/secure storage
   await AsyncStorage.multiRemove([
     'accessToken',
     'refreshToken',
     'userId',
     'userEmail',
     // ... any other user data
   ]);
   ```

2. **Clear Cache**
   ```typescript
   // Clear any cached data (receipts, analytics, etc.)
   await clearReceiptsCache();
   await clearAnalyticsCache();
   ```

3. **Sign Out User**
   ```typescript
   // Update auth context/state
   setUser(null);
   setAccessToken(null);
   setRefreshToken(null);
   ```

4. **Navigate to Login**
   ```typescript
   // Reset navigation stack to login screen
   navigation.reset({
     index: 0,
     routes: [{ name: 'Login' }],
   });
   ```

## UX Recommendations

### 1. Confirmation Flow
- **First Alert:** Explain what will be deleted and that it's irreversible
- **Second Alert:** Final confirmation ("Are you absolutely sure?")
- Use destructive styling (red) for delete buttons

### 2. Loading State
- Show loading indicator during deletion
- Disable the button while deletion is in progress
- Prevent navigation away during deletion

### 3. Error Handling
- Show user-friendly error messages
- Handle network errors gracefully
- Provide retry option for transient errors

### 4. Success Feedback
- Show success message
- Automatically navigate to login screen
- Clear all user data from the app

### 5. Accessibility
- Ensure buttons are accessible via screen readers
- Provide clear labels and descriptions
- Support keyboard navigation

## Security Considerations

1. **Token Storage:** Ensure access tokens are stored securely (use secure storage)
2. **Token Refresh:** If deletion fails due to expired token, prompt user to re-authenticate
3. **Network Security:** Always use HTTPS in production
4. **Error Messages:** Don't expose sensitive information in error messages

## Testing Checklist

- [ ] Delete account with valid token
- [ ] Delete account without refresh token (optional field)
- [ ] Delete account with invalid/expired token (should fail gracefully)
- [ ] Network error handling
- [ ] Loading states during deletion
- [ ] Confirmation dialogs work correctly
- [ ] Post-deletion cleanup (local storage, cache, navigation)
- [ ] User cannot access app after deletion
- [ ] Refresh token is revoked (if provided)

## Example Error Handling

```typescript
const handleDeleteError = (error: any) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        // Token expired or invalid
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again to delete your account.',
          [
            {
              text: 'OK',
              onPress: () => signOut(),
            },
          ]
        );
        break;
        
      case 404:
        // User not found (shouldn't happen)
        Alert.alert(
          'Account Not Found',
          'Your account could not be found. It may have already been deleted.'
        );
        break;
        
      case 500:
        // Server error
        Alert.alert(
          'Server Error',
          'We encountered an error while deleting your account. Please try again later or contact support.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: performAccountDeletion },
          ]
        );
        break;
        
      default:
        Alert.alert(
          'Error',
          data?.error || 'Failed to delete account. Please try again.'
        );
    }
  } else if (error.request) {
    // Network error
    Alert.alert(
      'Network Error',
      'Please check your internet connection and try again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: performAccountDeletion },
      ]
    );
  } else {
    // Other error
    Alert.alert('Error', 'An unexpected error occurred. Please try again.');
  }
};
```

## API Base URL

The API base URL should be:
- **Production:** `https://snacktrackapi-production.up.railway.app`
- **Development:** `http://localhost:3000` (if testing locally)

Make sure to use the correct environment variable for your build configuration.

## Support

If you encounter any issues during implementation:

1. Check the API documentation at `/api-docs` (Swagger UI)
2. Review the test suite: `tests/test-account-deletion-comprehensive.sh`
3. Check server logs for detailed error messages
4. Contact the backend team for assistance

## Related Documentation

- Authentication flow: See existing auth implementation
- Token management: See `AuthContext` or similar
- Error handling utilities: See `errorUtils.ts` or similar

---

**Last Updated:** December 2024  
**API Version:** Current production  
**Status:** ✅ Production-ready and tested

