import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const npmTagsUrl = 'https://registry.npmjs.org/-/package/@excalidraw/excalidraw/dist-tags';
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function checkConsistency(root) {
  const problems = [];
  function readJson(path) {
    try {
      return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
    } catch (error) {
      problems.push(`${path}: ${error.message}`);
    }
  }
  function checkValue(path, actual, expected) {
    if (actual !== expected) {
      problems.push(`${path}: expected exactly ${JSON.stringify(expected)}, found ${JSON.stringify(actual) ?? 'missing'}.`);
    }
  }

  const upstream = readJson('upstream.json');
  const manifest = readJson('frontend/package.json');
  const lock = readJson('frontend/package-lock.json');
  const editor = upstream?.editor;
  if (!editor || typeof editor !== 'object' || Array.isArray(editor)) {
    problems.push('upstream.json: missing editor provenance block.');
  } else {
    for (const field of ['package', 'version', 'integrity']) {
      if (typeof editor[field] !== 'string' || !editor[field].trim()) {
        problems.push(`upstream.json: editor.${field} must be a non-empty string.`);
      }
    }
    if (typeof editor.version === 'string' && !exactVersion.test(editor.version)) {
      problems.push('upstream.json: editor.version must be an exact version, not a range.');
    }
    if (typeof editor.package === 'string' && editor.package.trim()) {
      const lockPath = `node_modules/${editor.package}`;
      const installed = lock?.packages?.[lockPath];
      if (typeof editor.version === 'string' && editor.version.trim()) {
        checkValue(`frontend/package.json dependencies[${editor.package}]`, manifest?.dependencies?.[editor.package], editor.version);
        checkValue(`frontend/package-lock.json packages[${lockPath}].version`, installed?.version, editor.version);
      }
      if (typeof editor.integrity === 'string' && editor.integrity.trim()) {
        checkValue(`frontend/package-lock.json packages[${lockPath}].integrity`, installed?.integrity, editor.integrity);
      }
    }
  }
  if (problems.length) {
    console.error('Editor upstream consistency check failed:\n' + problems.map((problem) => `- ${problem}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`Editor upstream consistency check passed (${editor.package}@${editor.version}).`);
  return editor;
}

async function fetchData(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.trim();
  }
}

async function reportProduction(editor) {
  try {
    const data = await fetchData(editor.productionVersionUrl);
    const build = typeof data === 'string' ? data : data?.version;
    const parsed = typeof build === 'string' && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)-([0-9a-f]{7,40})$/i.exec(build);
    if (!parsed || !Number.isFinite(Date.parse(parsed[1]))) {
      throw new Error('invalid build id; expected <ISO timestamp>-<short hash>');
    }
    const status = editor.commit?.startsWith(parsed[2]) ? 'match'
      : Date.parse(parsed[1]) > Date.parse(editor.releasedAt) ? 'newer' : 'different';
    console.log(`excalidraw.com: ${build} (${status}).`);
  } catch (error) {
    console.warn(`Warning: could not check excalidraw.com: ${error.message}`);
  }
}

async function reportNpm(editor) {
  try {
    const data = await fetchData(npmTagsUrl);
    if (typeof data?.next !== 'string' || !data.next.trim()) throw new Error('missing npm next dist-tag');
    console.log(`npm next: ${data.next} (${data.next === editor.version ? 'match' : 'different'}).`);
  } catch (error) {
    console.warn(`Warning: could not check npm next: ${error.message}`);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      offline: { type: 'boolean', default: false },
      root: { type: 'string', default: defaultRoot },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(`Usage: node scripts/check-editor-upstream.mjs [--offline] [--root <dir>] [--help]

Verify editor provenance against the frontend manifest and lockfile.
Without --offline, also report excalidraw.com and npm next drift (report-only).
--root defaults to the repository containing this script.
Consistency failures exit 1; drift and network warnings exit 0.`);
    return;
  }
  const editor = checkConsistency(resolve(values.root));
  if (!editor || values.offline) return;
  console.log(`Pinned editor: ${editor.version}; commit ${editor.commit}; released ${editor.releasedAt}.`);
  await Promise.all([reportProduction(editor), reportNpm(editor)]);
}

try {
  await main();
} catch (error) {
  console.error(`Editor upstream check failed: ${error.message}`);
  process.exitCode = 1;
}
