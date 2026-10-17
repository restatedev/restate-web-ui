#!/usr/bin/env node

const { execSync } = require('child_process');

function runJson(cmd) {
  const raw = execSync(cmd).toString();
  const lines = raw.split('\n');
  // pnpm prepends warnings ([WARN] …) and trailing status lines around nx's
  // JSON output. Scan from the bottom up and try to parse from each line that
  // looks like a JSON start; first parseable substring wins.
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trimStart();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) continue;
    try {
      return JSON.parse(lines.slice(i).join('\n'));
    } catch {
      // not the JSON line; keep searching
    }
  }
  throw new Error(`No JSON found in output of \`${cmd}\`:\n${raw}`);
}

const projects = runJson('pnpm nx show projects --affected --json');
let isFailed = false;
for (const project of projects) {
  const projectData = runJson(`pnpm nx show project ${project} --json`);
  const path = projectData.root;
  const tsConfigsRaw = execSync(`find ${path} -iname 'tsconfig*.json'`);
  const tsConfigs = tsConfigsRaw.toString().split('\n').filter(Boolean);

  for (const tsConfig of tsConfigs) {
    console.group('\x1b[1m' + `pnpm tsc -p ${tsConfig}`);

    try {
      execSync(`pnpm tsc -p ${tsConfig}`, { stdio: 'inherit' });
    } catch (error) {
      isFailed = true;
    }
    console.groupEnd();
  }
}

if (isFailed) {
  throw new Error('Type check has failed');
}
