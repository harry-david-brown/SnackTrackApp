/* global __dirname */

/**
 * Prevent palette drift by rejecting raw color strings in application source.
 * Color values belong in constants/theme.ts; consumers should import Colors.
 */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const appRoot = path.resolve(__dirname, '..');
const sourceRoots = ['app', 'components', 'contexts', 'features', 'hooks', 'utils'];
const colorLiteralPattern =
  /^(?:#[0-9a-f]{3,8}|rgba?\s*\(|white$|black$|transparent$)/i;

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const violations = [];
const visualViolations = [];

for (const filePath of sourceRoots.flatMap((root) =>
  collectFiles(path.join(appRoot, root)))) {
  if (/\.(?:test|spec)\.[jt]sx?$/.test(filePath)) continue;
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(appRoot, filePath);
  const storyTypography = relativePath.startsWith(`components${path.sep}wrapped${path.sep}`)
    || relativePath.startsWith(`components${path.sep}sharing${path.sep}`);
  if (!storyTypography && /fontWeight\s*:\s*['"](?:700|800|900|bold)['"]/.test(sourceText)) {
    visualViolations.push(`${relativePath} uses a heavy ordinary-product font weight`);
  }
  if (/\bMascotPlaceholder\b/.test(sourceText)) {
    visualViolations.push(`${relativePath} uses the deprecated mascot placeholder`);
  }
  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    let value = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      value = node.text.trim();
    } else if (ts.isTemplateExpression(node)) {
      value = node.getText(source).slice(1, -1).trim();
    }

    if (value && colorLiteralPattern.test(value)) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      violations.push(
        `${path.relative(appRoot, filePath)}:${position.line + 1}:${position.character + 1} ${value}`,
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (violations.length > 0) {
  console.error(
    'Raw color values must be declared in constants/theme.ts and consumed through Colors:\n',
  );
  console.error(violations.join('\n'));
  process.exitCode = 1;
}

if (visualViolations.length > 0) {
  console.error('Visual-system violations:\n');
  console.error(visualViolations.join('\n'));
  process.exitCode = 1;
}

if (violations.length === 0 && visualViolations.length === 0) {
  console.log('Visual-system check passed: central colors, restrained product weights, and production mascots are enforced.');
}
