export default {
  expo: {
    name: "SnackTrack",
    slug: "snack-track",
    owner: "snacktrack",
    scheme: "snacktrack",
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
          // Build URL scheme from unique iOS client ID: com.googleusercontent.apps.{uniqueId}
          iosUrlScheme: `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GMAIL_IOS_CLIENT_ID}`
        }
      ],
      "expo-apple-authentication"
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
      versionCode: 2
    },
    web: {
      favicon: "./assets/icon.png"
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
      eas: {
        projectId: "2b22d384-eb66-4917-8552-e0782cb72176"
      },
      router: {
        origin: "snacktrack://"
      }
    }
  }
};
