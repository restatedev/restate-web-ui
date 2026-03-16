#!/usr/bin/env node

const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { join } = require('path');

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
];

// Packages missing the "license" field in their package.json.
const KNOWN_PACKAGES = {
  // Generated protobuf code from buf.build, no license field in package.json
  '@buf/restatedev_service-protocol.bufbuild_es': 'Apache-2.0',
  // https://github.com/streamich/fast-shallow-equal/blob/master/LICENSE
  'fast-shallow-equal': 'Unlicense',
  // https://github.com/streamich/react-universal-interface/blob/master/LICENSE
  'react-universal-interface': 'Unlicense',
};

function collectPackages(deps, packages = new Map()) {
  if (!deps) return packages;
  for (const [name, info] of Object.entries(deps)) {
    const key = `${name}@${info.version}`;
    if (!packages.has(key)) {
      packages.set(key, { name, version: info.version, path: info.path });
      collectPackages(info.dependencies, packages);
    }
  }
  return packages;
}

function getLicense(name, pkgDir) {
  if (KNOWN_PACKAGES[name]) return KNOWN_PACKAGES[name];
  try {
    const pkgPath = join(pkgDir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.license) return pkg.license;
    if (Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
      return pkg.licenses.map((l) => l.type || l).join(' OR ');
    }
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

function isAllowed(license) {
  if (!license || license === 'UNKNOWN') return false;
  const parts = license.replace(/[()]/g, '').split(/\s+(?:OR|AND)\s+/i);
  return parts.some((l) => ALLOWED_LICENSES.includes(l.trim()));
}

const output = execSync('pnpm ls --json --prod --depth=Infinity', {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});
const root = JSON.parse(output)[0];
const packages = collectPackages(root.dependencies);

const violations = [];
for (const [key, { name, path: pkgDir }] of packages) {
  const license = getLicense(name, pkgDir);
  if (!isAllowed(license)) {
    violations.push({ package: key, license });
  }
}

if (violations.length > 0) {
  console.error(
    `\n❌ Found ${violations.length} package(s) with disallowed licenses:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.package}: ${v.license}`);
  }
  console.error(`\nAllowed licenses: ${ALLOWED_LICENSES.join(', ')}`);
  console.error(
    'If a package uses a permissive license not in the list, add it to ALLOWED_LICENSES in scripts/check-licenses.js',
  );
  console.error(
    'For packages with no license field (e.g. generated code), add them to KNOWN_PACKAGES\n',
  );
  process.exit(1);
} else {
  console.log(
    `✅ All ${packages.size} production packages have allowed licenses.`,
  );
}
