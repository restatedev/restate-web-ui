#!/usr/bin/env node

// Uses `pnpm licenses list` to check all production dependencies.
// Workaround for https://github.com/pnpm/pnpm/issues/6328: the buf package
// requires a manually-added integrity hash in pnpm-lock.yaml.

const { execSync } = require('child_process');

const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'Unlicense',
  'Python-2.0',
  'BlueOak-1.0.0',
  'MPL-2.0',
  'Unknown',
];

function isAllowed(license) {
  const parts = license.replace(/[()]/g, '').split(/\s+(?:OR|AND)\s+/i);
  return parts.some((l) => ALLOWED_LICENSES.includes(l.trim()));
}

const output = execSync('pnpm licenses list --json --prod', {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});
const data = JSON.parse(output);

const violations = [];
let total = 0;

for (const [license, packages] of Object.entries(data)) {
  for (const pkg of packages) {
    total++;
    if (!isAllowed(license)) {
      violations.push({ name: pkg.name, version: pkg.version, license });
    }
  }
}

if (violations.length > 0) {
  console.error(
    `\n❌ Found ${violations.length} package(s) with disallowed licenses:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.name}@${v.version}: ${v.license}`);
  }
  console.error(`\nAllowed licenses: ${ALLOWED_LICENSES.join(', ')}`);
  process.exit(1);
} else {
  console.log(
    `✅ All ${total} production packages have allowed licenses.`,
  );
}
