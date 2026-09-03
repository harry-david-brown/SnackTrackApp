/* global describe, it, expect, __dirname */

const appConfig = require('../../app.config.js').default;
const fs = require('node:fs');
const path = require('node:path');

describe('Expo app configuration', () => {
  it('supports only the native mobile platforms', () => {
    expect(appConfig.expo.platforms).toEqual(['ios', 'android']);
    expect(appConfig.expo.web).toBeUndefined();
  });

  it('registers Microsoft login callbacks in Expo and checked-in native projects', () => {
    expect(appConfig.expo.scheme).toEqual(
      expect.arrayContaining(['msauth.com.snacktrack.mobile', 'msauth']),
    );
    expect(appConfig.expo.android.intentFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'VIEW',
          data: expect.arrayContaining([
            expect.objectContaining({ scheme: 'msauth', host: 'com.snacktrack.app' }),
          ]),
        }),
      ]),
    );

    const androidManifest = fs.readFileSync(
      path.join(__dirname, '../../android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );
    expect(androidManifest).toContain(
      '<data android:scheme="msauth" android:host="com.snacktrack.app"/>',
    );

    const iosInfoPlist = fs.readFileSync(
      path.join(__dirname, '../../ios/SnackTrack/Info.plist'),
      'utf8',
    );
    expect(iosInfoPlist).toContain('<string>msauth.com.snacktrack.mobile</string>');
  });
});
