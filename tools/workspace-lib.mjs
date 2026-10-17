#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, data) =>
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
const updateJson = (file, update) => {
  if (existsSync(file)) {
    writeJson(file, update(readJson(file)));
  }
};

const aliases = Object.entries(
  readJson('tsconfig.base.json').compilerOptions.paths,
).map(([alias, [target]]) => [alias, target.replace(/^\.\//, '')]);
const rootPackage = readJson('package.json');

for (const root of process.argv.slice(2).map((dir) => dir.replace(/\/$/, ''))) {
  const projectFile = join(root, 'project.json');
  if (!existsSync(projectFile)) {
    console.log(`skipped ${root}: no project.json`);
    continue;
  }

  const libAliases = aliases.filter(([, target]) =>
    target.startsWith(`${root}/`),
  );
  const mainAlias = libAliases.find(
    ([, target]) => target === `${root}/src/index.ts`,
  )?.[0];
  if (!mainAlias) {
    throw new Error(`${root}: no tsconfig path alias for src/index.ts`);
  }
  const subpathExports = Object.fromEntries(
    libAliases
      .filter(([alias]) => alias !== mainAlias)
      .map(([alias, target]) => {
        if (!alias.startsWith(`${mainAlias}/`)) {
          throw new Error(`${root}: ${alias} is not a subpath of ${mainAlias}`);
        }
        return [
          `.${alias.slice(mainAlias.length)}`,
          `./${target.slice(root.length + 1)}`,
        ];
      }),
  );

  const packageName = mainAlias.replace(
    /^(@[^/]+\/[^/]+)\/(.+)$/,
    (_, scope, rest) => `${scope}-${rest.replaceAll('/', '-')}`,
  );
  const {
    $schema,
    '// targets': targetsHint,
    name,
    targets,
    ...nx
  } = readJson(projectFile);

  writeJson(join(root, 'package.json'), {
    name: packageName,
    private: true,
    type: 'module',
    exports: Object.keys(subpathExports).length
      ? { '.': './src/index.ts', ...subpathExports }
      : './src/index.ts',
    nx: {
      name,
      ...nx,
      ...(targets && Object.keys(targets).length ? { targets } : {}),
    },
  });
  rmSync(projectFile);

  updateJson(join(root, 'tsconfig.json'), ({ extends: base, ...config }) => ({
    extends: base,
    ...config,
    compilerOptions: {
      composite: true,
      noEmit: false,
      emitDeclarationOnly: true,
      ...config.compilerOptions,
    },
  }));
  updateJson(join(root, 'tsconfig.lib.json'), (config) => ({
    ...config,
    compilerOptions: {
      rootDir: 'src',
      outDir: 'out-tsc/lib',
      tsBuildInfoFile: 'out-tsc/lib/tsconfig.lib.tsbuildinfo',
      ...config.compilerOptions,
    },
  }));
  updateJson(join(root, 'tsconfig.spec.json'), (config) => ({
    ...config,
    compilerOptions: {
      outDir: 'out-tsc/spec',
      tsBuildInfoFile: 'out-tsc/spec/tsconfig.spec.tsbuildinfo',
      ...config.compilerOptions,
    },
    references: [
      ...(config.references ?? []).filter(
        ({ path }) => path !== './tsconfig.lib.json',
      ),
      { path: './tsconfig.lib.json' },
    ],
  }));

  rootPackage.devDependencies[packageName] = 'workspace:*';
  console.log(`${root} -> ${packageName}`);
}

rootPackage.devDependencies = Object.fromEntries(
  Object.entries(rootPackage.devDependencies).sort(([a], [b]) =>
    a.localeCompare(b),
  ),
);
writeJson('package.json', rootPackage);
