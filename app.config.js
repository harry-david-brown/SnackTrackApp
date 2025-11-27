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
      "expo-router"
    ],
    ios: {
      supportsTablet: true,
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

