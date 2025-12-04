export default {
  expo: {
    name: "SnackTrack",
    slug: "snack-track",
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
          // iOS URL scheme must be in format: com.googleusercontent.apps.CLIENT_ID_PART
          // Using web client ID for now (will work for iOS when you set it up)
          // Format: com.googleusercontent.apps.92555573714-vc42kgncpjcda8dog4g7j2ri13750pci
          iosUrlScheme: process.env.EXPO_PUBLIC_GMAIL_IOS_CLIENT_ID 
            ? `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GMAIL_IOS_CLIENT_ID.split('.apps.googleusercontent.com')[0]}`
            : "com.googleusercontent.apps.92555573714-vc42kgncpjcda8dog4g7j2ri13750pci"
        }
      ]
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.snacktrack.mobile",
      buildNumber: "2",
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
      package: "com.snacktrack.app"
    },
    web: {
      favicon: "./assets/icon.png"
    },
    extra: {
      // Default to Railway production API
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://snacktrackapi-production.up.railway.app',
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
      },
      appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'development'
    }
  }
};

