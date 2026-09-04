# Launch ads runbook

SnackTrack launch ads are disabled by default. Do not enable them until the API migration, admin console, and an AdMob-enabled native app binary are all deployed.

## Required production configuration

Set these values in the production EAS build environment:

- `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
- `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`
- `EXPO_PUBLIC_ADMOB_NATIVE_IOS_AD_UNIT_ID`
- `EXPO_PUBLIC_ADMOB_NATIVE_ANDROID_AD_UNIT_ID`

Development, preview, and staging builds use Google's test application and native-ad IDs. Native ads cannot be tested in Expo Go; use a development or EAS build.

## Before submission

1. In AdMob, block gambling, predatory lending, political, misleading financial, and sensitive-content categories.
2. Update the published privacy policy to describe AdMob/Google processing while stating that SnackTrack does not send receipt contents, spending details, restaurant names, item names, provider identities, account identifiers, or custom audiences to the SDK.
3. Update the App Store privacy answers for the final SDK behavior.
4. Mark the Google Play release as containing ads and complete its Data safety answers.
5. Verify UMP states for consent required, consent not required, consent denied, and limited ads.
6. Verify Google test ads on physical iOS and Android development builds.

## Rollout

1. Deploy migration 017, the API, and the admin console with the master switch off.
2. Release the native binaries with the master switch off.
3. Set iOS and Android rollout to 5%, provide a clear audit reason, then enable the master switch.
4. Observe crashes, load failures, retention, and Wrapped completion for 24–48 hours.
5. Move each platform independently through 25%, 50%, and 100% only while health remains acceptable.

## Emergency disable

Use **Monetization → Disable all ads** in the admin console and provide an audit reason. This action does not depend on the displayed configuration version. Foreground clients refresh immediately on foreground and at least every 60 seconds; a disabled or stale response removes the current ad and prevents new requests.

After disabling, confirm that requests stop in the Monetization metrics after allowing for the existing offline analytics queue delay.

## Reconciliation

- Count requests, loads, impressions, clicks, failures, and paid callbacks from the mobile SDK events.
- Compare callback totals with the admin dashboard after the offline queue has flushed.
- Keep AdMob-reported revenue separated by currency; never add currencies together or apply an implicit conversion.
- A session impression is counted only after the SDK impression callback, and the default cap is one per cold app process.
