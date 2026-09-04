const rawIosClientId = process.env.EXPO_PUBLIC_GMAIL_IOS_CLIENT_ID;
const iosClientIdUniquePart = rawIosClientId
  ? rawIosClientId.replace(/\.apps\.googleusercontent\.com$/, '')
  : undefined;
const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV || 'development';
const productionAds = appEnvironment === 'production';
const testAdMobAppIds = {
  ios: 'ca-app-pub-3940256099942544~1458002511',
  android: 'ca-app-pub-3940256099942544~3347511713',
};
const adMobIosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || (!productionAds ? testAdMobAppIds.ios : undefined);
const adMobAndroidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || (!productionAds ? testAdMobAppIds.android : undefined);

if (!adMobIosAppId || !adMobAndroidAppId) {
  throw new Error('Production builds require EXPO_PUBLIC_ADMOB_IOS_APP_ID and EXPO_PUBLIC_ADMOB_ANDROID_APP_ID.');
}
if (productionAds && (!process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS_AD_UNIT_ID || !process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID_AD_UNIT_ID)) {
  throw new Error('Production builds require native AdMob ad unit IDs for iOS and Android.');
}

export default {
  expo: {
    name: "SnackTrack",
    slug: "snack-track",
    owner: "snacktrack",
    scheme: ["snacktrack", "msauth.com.snacktrack.mobile", "msauth"],
    platforms: ["ios", "android"],
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    plugins: [
      "expo-router",
      [
        "@react-native-google-signin/google-signin",
        {
          // Build URL scheme from the iOS client ID's unique portion.
          iosUrlScheme: iosClientIdUniquePart
            ? `com.googleusercontent.apps.${iosClientIdUniquePart}`
            : undefined
        }
      ],
      "expo-apple-authentication",
      "expo-notifications",
      [
        "react-native-google-mobile-ads",
        {
          iosAppId: adMobIosAppId,
          androidAppId: adMobAndroidAppId,
          delayAppMeasurementInit: true
        }
      ],
      [
        "expo-media-library",
        {
          // Save-only access for "Save to Photos" in the Wrapped share journey.
          savePhotosPermission: "SnackTrack saves your Wrapped cards to your photo library.",
          isAccessMediaLocationEnabled: false
        }
      ]
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.snacktrack.mobile",
      buildNumber: "5",
      displayName: "SnackTrack",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.snacktrack.app",
      versionCode: 2,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: false,
          data: [{ scheme: "msauth", host: "com.snacktrack.app" }],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    extra: {
      // API URL from environment variable (required - app will fail if not set)
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || 'development',
      // Sentry DSN (optional - app works without it)
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      // Gmail OAuth client IDs (optional - only needed for Gmail integration)
      EXPO_PUBLIC_GMAIL_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GMAIL_ANDROID_CLIENT_ID,
      EXPO_PUBLIC_GMAIL_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GMAIL_IOS_CLIENT_ID,
      EXPO_PUBLIC_GMAIL_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GMAIL_WEB_CLIENT_ID,
      EXPO_PUBLIC_MICROSOFT_LOGIN_CLIENT_ID: process.env.EXPO_PUBLIC_MICROSOFT_LOGIN_CLIENT_ID,
      EXPO_PUBLIC_MICROSOFT_LOGIN_IOS_REDIRECT_URI: process.env.EXPO_PUBLIC_MICROSOFT_LOGIN_IOS_REDIRECT_URI,
      EXPO_PUBLIC_MICROSOFT_LOGIN_ANDROID_REDIRECT_URI: process.env.EXPO_PUBLIC_MICROSOFT_LOGIN_ANDROID_REDIRECT_URI,
      EXPO_PUBLIC_ADMOB_NATIVE_IOS_AD_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS_AD_UNIT_ID,
      EXPO_PUBLIC_ADMOB_NATIVE_ANDROID_AD_UNIT_ID: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID_AD_UNIT_ID,
      eas: {
        projectId: "2b22d384-eb66-4917-8552-e0782cb72176"
      },
      router: {
        origin: "snacktrack://"
      }
    }
  }
};
