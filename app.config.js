export default {
  expo: {
    name: "Snack Track",
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
      favicon: "./assets/favicon.png"
    },
    extra: {
      // Environment-specific API URLs
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 
              (process.env.NODE_ENV === 'production' 
                ? 'https://snacktrackapi-production.up.railway.app'  // Production API URL
                : 'https://snacktrackapi-production.up.railway.app'),      // Development fallback
      eas: {
        projectId: "2b22d384-eb66-4917-8552-e0782cb72176"
      },
      router: {
        origin: "snacktrack://"
      }
    }
  }
};

