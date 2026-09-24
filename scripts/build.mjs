import { readFile, writeFile, rm, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CleanCSS from 'clean-css';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('🏗️  Starting Health Tracker production build...');
const startTime = Date.now();

// 1. Clean & recreate dist directory
await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

// 2. Minify CSS
console.log('🎨 Minifying styles.css...');
const cssPath = path.join(rootDir, 'frontend', 'styles.css');
const cssRaw = await readFile(cssPath, 'utf8');
const minifiedCssResult = new CleanCSS({
  level: 2,
  compatibility: '*'
}).minify(cssRaw);

if (minifiedCssResult.errors.length > 0) {
  throw new Error(`CSS minification failed: ${minifiedCssResult.errors.join(', ')}`);
}
await writeFile(path.join(distDir, 'styles.min.css'), minifiedCssResult.styles, 'utf8');
console.log(`✓ Generated dist/styles.min.css (${(minifiedCssResult.styles.length / 1024).toFixed(1)} KB)`);

// 3. Copy frontend assets & modules to dist
console.log('📦 Copying frontend modules to dist/frontend...');
await cp(path.join(rootDir, 'frontend'), path.join(distDir, 'frontend'), { recursive: true });

// 4. Generate production index.html pointing to styles.min.css
console.log('📄 Building production index.html...');
const indexHtmlPath = path.join(rootDir, 'index.html');
const indexHtmlRaw = await readFile(indexHtmlPath, 'utf8');
const prodHtml = indexHtmlRaw.replace('frontend/styles.css', 'styles.min.css');
await writeFile(path.join(distDir, 'index.html'), prodHtml, 'utf8');

const duration = Date.now() - startTime;
console.log(`✨ Health Tracker build completed in ${duration}ms -> dist/`);
