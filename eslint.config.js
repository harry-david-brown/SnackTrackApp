// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^\\.\\./",
              message: "Use a configured path alias for cross-directory imports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "features/**/*.{ts,tsx}",
    ],
    ignores: ["**/*.test.{ts,tsx}", "features/navigation/NavigationPolicyProvider.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "expo-router",
              importNames: ["router", "useRouter"],
              message: "Use useAppNavigation from @features/navigation for imperative navigation.",
            },
          ],
          patterns: [
            {
              regex: "^\\.\\./",
              message: "Use a configured path alias for cross-directory imports.",
            },
          ],
        },
      ],
    },
  }
]);
