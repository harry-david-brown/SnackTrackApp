export default {
  expo: {
    name: "Snack Track",
    slug: "snack-track",
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
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.snacktrack.app"
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
                ? 'https://api.snacktrack.com'  // Your production API URL
                : 'http://localhost:3000'),      // Development fallback
      eas: {
        projectId: "your-project-id-here"
      }
    }
  }
};

