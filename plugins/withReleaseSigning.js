const { withAppBuildGradle } = require('expo/config-plugins');
const fs = require('node:fs');

// Keep the policy after a clean prebuild as well as in the checked-in project.
const marker = '// SnackTrack release signing policy';
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') throw new Error('SnackTrack release signing requires Groovy Gradle');
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents += '\n' + fs.readFileSync(require.resolve('./release-signing.gradle'), 'utf8');
    }
    return mod;
  });
};
