#!/usr/bin/env node

const { execSync } = require('child_process');

const projects = execSync('pnpm nx show projects --affected --json');
let isFailed = false;
for (const project of JSON.parse(projects)) {
  const projectData = execSync(`pnpm nx show project ${project} --json`);
  const path = JSON.parse(projectData).root;
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
