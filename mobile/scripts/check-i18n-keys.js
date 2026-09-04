/**
 * Verifies every `t('some.key')` in app/ and src/ resolves in the merged
 * English catalogue. Run with `node scripts/check-i18n-keys.js`.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/messages/en.json'), 'utf8'));

// Transpile mobile-strings.ts to plain JS so we can require it.
const src = fs.readFileSync(path.join(root, 'src/i18n/mobile-strings.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const mobile = mod.exports.mobileStrings;

const isDict = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) out[k] = isDict(out[k]) && isDict(v) ? merge(out[k], v) : v;
  return out;
}
const catalogue = merge(en, mobile.en);
const lookup = (key) => key.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), catalogue);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx?|js)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'src'))];
const re = /\bt\(\s*(['"`])([a-zA-Z0-9_.]+)\1/g;
const missing = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = re.exec(text))) {
    if (typeof lookup(m[2]) !== 'string') {
      const line = text.slice(0, m.index).split('\n').length;
      missing.push(`${path.relative(root, file)}:${line} ${m[2]}`);
    }
  }
}

// Mobile-only strings missing in zh / ko (they fall back to English silently).
function flat(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) isDict(v) ? flat(v, `${prefix}${k}.`, out) : out.push(prefix + k);
  return out;
}
const enKeys = new Set(flat(mobile.en));
for (const loc of ['zh', 'ko']) {
  const have = new Set(flat(mobile[loc]));
  const gaps = [...enKeys].filter((k) => !have.has(k));
  if (gaps.length) console.log(`${loc}: ${gaps.length} mobile strings fall back to English:\n  ${gaps.join('\n  ')}`);
}

if (missing.length) {
  console.error(`Missing i18n keys (${missing.length}):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`i18n OK — ${files.length} files scanned, every static t() key resolves.`);
