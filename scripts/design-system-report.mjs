import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import ts from 'typescript';

const { values: options } = parseArgs({
  options: { base: { type: 'string' } },
});
const SOURCES = ['libs', 'apps/web-ui/app'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'out-tsc', '.react-router']);
const SIZED = new Set(['Icon', 'Spinner', 'Button']);
const PLACEMENT = [
  /^-?m[trblxyse]?-/,
  /^(absolute|relative|fixed|sticky|static|isolate)$/,
  /^-?(inset|top|right|bottom|left|start|end)(-[xy])?-/,
  /^-?z-/,
  /^-?translate-/,
  /^(self|justify-self|place-self|order|col|row)-/,
  /^(grow|shrink)(-\d+)?$/,
  /^flex-(1|auto|none|initial)$/,
  /^basis-/,
  /^(hidden|block|inline-block|inline-flex|flex|inline|contents|visible|invisible)$/,
  /^(pointer-events|cursor)-/,
  /^(group|peer)(\/.+)?$/,
  /^@container/,
  /^(w|h|size)-full$/,
];
const SIZING = /^(min-|max-)?(w|h|size)-/;

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory())
      return SKIP_DIRS.has(entry.name) ? [] : files(file);
    return entry.name.endsWith('.tsx') &&
      !/\.(spec|stories)\.tsx$/.test(entry.name)
      ? [file]
      : [];
  });
}

function utility(className) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < className.length; i++) {
    if (className[i] === '[') depth++;
    else if (className[i] === ']') depth--;
    else if (className[i] === ':' && depth === 0) start = i + 1;
  }
  return className.slice(start).replace(/^!|!$/g, '');
}

function changesLook(component, value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(utility)
    .some(
      (name) =>
        !PLACEMENT.some((pattern) => pattern.test(name)) &&
        (SIZED.has(component) || !SIZING.test(name)),
    );
}

function staticValue(initializer) {
  if (!initializer) return '';
  if (ts.isStringLiteral(initializer)) return initializer.text;
  const expression = ts.isJsxExpression(initializer)
    ? initializer.expression
    : undefined;
  if (
    expression &&
    (ts.isStringLiteral(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression))
  ) {
    return expression.text;
  }
  return null;
}

function measure(root) {
  const stats = new Map();
  for (const file of SOURCES.flatMap((dir) => files(path.join(root, dir)))) {
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('@restate/ui-')) continue;
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const imported = new Map();
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !statement.moduleSpecifier.text.startsWith('@restate/ui-')
      ) {
        continue;
      }
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        const name = (element.propertyName ?? element.name).text;
        if (/^[A-Z]/.test(name)) imported.set(element.name.text, name);
      }
    }
    if (!imported.size) continue;
    const visit = (node) => {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        ts.isIdentifier(node.tagName) &&
        imported.has(node.tagName.text)
      ) {
        const component = imported.get(node.tagName.text);
        const entry = stats.get(component) ?? {
          calls: 0,
          withClassName: 0,
          look: 0,
          computed: 0,
        };
        entry.calls++;
        const attribute = node.attributes.properties.find(
          (property) =>
            ts.isJsxAttribute(property) &&
            property.name.getText() === 'className',
        );
        if (attribute) {
          entry.withClassName++;
          const value = staticValue(attribute.initializer);
          if (value === null) entry.computed++;
          else if (changesLook(component, value)) entry.look++;
        }
        stats.set(component, entry);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return stats;
}

const stats = measure('.');
const rows = [...stats]
  .filter(([, entry]) => entry.look > 0)
  .sort((a, b) => b[1].look - a[1].look || b[1].calls - a[1].calls);
const total = [...stats.values()].reduce(
  (sum, entry) => ({
    calls: sum.calls + entry.calls,
    look: sum.look + entry.look,
    computed: sum.computed + entry.computed,
  }),
  { calls: 0, look: 0, computed: 0 },
);
const percent = (part, whole) =>
  whole ? `${Math.round((part / whole) * 100)}%` : '–';

console.log('### Shared components restyled through className\n');
console.log(
  `${total.look} of ${total.calls} calls to \`@restate/ui-*\` components (${percent(total.look, total.calls)}) pass a \`className\` that changes the look, not only the placement. Computed \`className\` values (${total.computed}) aren't counted. DESIGN.md: \`className\` places a component; props style it.\n`,
);
console.log('| Component | Calls | Restyled | Share |');
console.log('| --- | --: | --: | --: |');
for (const [component, entry] of rows.slice(0, 15)) {
  console.log(
    `| \`${component}\` | ${entry.calls} | ${entry.look} | ${percent(entry.look, entry.calls)} |`,
  );
}
if (rows.length > 15) {
  const rest = rows.slice(15).reduce((sum, [, entry]) => sum + entry.look, 0);
  console.log(`| ${rows.length - 15} more | | ${rest} | |`);
}

function measureBase(ref) {
  const commit = execFileSync('git', ['merge-base', ref, 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-system-base-'));
  try {
    const archive = path.join(dir, 'base.tar');
    execFileSync('git', ['archive', '-o', archive, commit, ...SOURCES]);
    execFileSync('tar', ['-xf', archive, '-C', dir]);
    return measure(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (options.base) {
  const base = measureBase(options.base);
  const before = [...base.values()].reduce((sum, entry) => sum + entry.look, 0);
  const changes = [...new Set([...base.keys(), ...stats.keys()])]
    .map((component) => ({
      component,
      before: base.get(component)?.look ?? 0,
      after: stats.get(component)?.look ?? 0,
    }))
    .filter((change) => change.before !== change.after);
  console.log(
    `\n${before} restyled calls at the merge base with \`${options.base}\`, ${total.look} now.\n`,
  );
  for (const { component, before, after } of changes) {
    console.log(`- \`${component}\`: ${before} → ${after}`);
  }
  if (total.look > before) {
    const grown = changes
      .filter((change) => change.after > change.before)
      .map((change) => `${change.component} +${change.after - change.before}`)
      .join(', ');
    console.error(
      `Restyled calls went up from ${before} to ${total.look} compared with ${options.base} (${grown}). Add a prop or a variant to the component and keep className for placement (DESIGN.md → Contributing).`,
    );
    process.exitCode = 1;
  }
}
