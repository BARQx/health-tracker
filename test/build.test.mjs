import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('build script produces minified assets in dist/', () => {
  // Execute build script
  execSync('node scripts/build.mjs', { cwd: rootDir, stdio: 'pipe' });

  const distDir = path.join(rootDir, 'dist');
  const stylesMinPath = path.join(distDir, 'styles.min.css');
  const indexHtmlPath = path.join(distDir, 'index.html');
  const formulasJsPath = path.join(distDir, 'frontend', 'formulas.js');

  assert.ok(existsSync(stylesMinPath), 'dist/styles.min.css should exist');
  assert.ok(existsSync(indexHtmlPath), 'dist/index.html should exist');
  assert.ok(existsSync(formulasJsPath), 'dist/frontend/formulas.js should exist');

  const htmlContent = readFileSync(indexHtmlPath, 'utf8');
  assert.ok(htmlContent.includes('styles.min.css'), 'dist/index.html should reference styles.min.css');
});
