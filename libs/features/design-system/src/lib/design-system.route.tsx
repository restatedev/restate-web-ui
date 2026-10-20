import themeCss from '@restate/util-styles/theme.css?raw';
import { tv } from '@restate/util-styles';
import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import { Card, CardHeader, CardRow } from '@restate/ui-card';
import {
  FormFieldCheckbox,
  FormFieldInput,
  Switch,
} from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { ListPageHeader } from '@restate/ui-layout';
import { Link } from '@restate/ui-link';
import { Section, SectionContent, SectionTitle } from '@restate/ui-section';
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import {
  FAMILIES,
  NAMESPACES,
  familyOf,
  isInverse,
  parseThemeTokens,
  tierOf,
  type Family,
  type ThemeToken,
} from './tokens';

const TOKENS = parseThemeTokens(themeCss);

const BG_TIERS = [
  'subtle',
  'muted',
  'emphasis',
  'strong',
  'vivid',
  'base',
  'hover',
  'pressed',
];

const FAMILY_MEANING: Record<Family, string> = {
  accent: 'Interactive and brand: buttons, links, selection, focus',
  info: 'Informational status and running work',
  success: 'Succeeded, healthy',
  warning: 'Recoverable problems and risky actions',
  danger: 'Failures, errors, invalid input, destructive actions',
  pending: 'Waiting its turn: inbox, blocked queues, degraded health',
};

const SECTIONS = [
  ['surfaces', 'Surfaces'],
  ['text', 'Text'],
  ['families', 'Status families'],
  ['components', 'Components'],
  ['recipes', 'Recipes'],
  ['tokens', 'All tokens'],
] as const;

const CHECKER =
  'repeating-conic-gradient(var(--background-color-emphasis) 0 25%, var(--background-color-surface) 0 50%) 0 0 / 10px 10px';

const swatchStyles = tv({
  base: 'flex h-12 w-full items-center justify-center rounded-lg border border-tint-subtle text-lg font-semibold',
  variants: {
    backdrop: {
      surface: 'bg-surface',
      inverse: 'bg-inverse',
      none: '',
    },
  },
});

const stateStyles = tv({
  slots: {
    tile: 'flex flex-col gap-2 rounded-xl border p-3',
    label: 'font-mono text-2xs',
    target:
      'rounded-lg px-3 py-1.5 text-left text-sm outline-offset-2 outline-focus focus-visible:outline-2',
  },
  variants: {
    on: {
      surface: {
        tile: 'bg-surface',
        label: 'text-subtle',
        target: 'text-secondary hover:bg-muted pressed:bg-emphasis',
      },
      canvas: {
        tile: 'bg-canvas',
        label: 'text-subtle',
        target: 'text-secondary hover:bg-tint-subtle pressed:bg-tint',
      },
      icon: {
        tile: 'bg-surface',
        label: 'text-subtle',
        target:
          'w-fit px-1.5 text-tertiary hover:bg-tint pressed:bg-tint-strong',
      },
      inverse: {
        tile: 'border-inverse bg-inverse',
        label: 'text-inverse-muted',
        target:
          'text-inverse-secondary hover:bg-inverse-tint pressed:bg-inverse-tint-strong',
      },
    },
  },
});

const recipes = tv({
  slots: {
    panel: 'rounded-2xl border bg-surface p-4 text-sm text-tertiary shadow-xs',
    field:
      'w-full rounded-lg border border-default bg-muted px-2 py-1.5 text-sm text-primary shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] placeholder:text-subtle focus:outline-2 focus:outline-focus',
    banner:
      'flex gap-2 rounded-xl border border-warning bg-warning-subtle p-3 text-0.5xs text-warning',
    bannerIcon: 'h-5 w-5 shrink-0 fill-warning text-on-warning',
    badge:
      'w-fit rounded-md border border-danger-strong/10 bg-danger-subtle px-1.5 py-0.5 text-xs font-medium text-danger-strong',
    chip: 'w-fit rounded bg-muted px-1 py-px text-2xs font-medium text-tertiary',
    inverse:
      'rounded-xl border border-inverse bg-inverse/90 px-3 py-2 text-sm text-inverse-secondary shadow-[inset_0_1px_0_0_var(--box-shadow-color-inverse-edge)] backdrop-blur-xl',
    skeleton: 'h-5 w-32 animate-pulse rounded-full bg-emphasis/70',
  },
});

function cssVar(token: ThemeToken) {
  return `var(${token.variable})`;
}

function formatValue(token: ThemeToken) {
  if (token.alias) {
    return `→ ${token.alias}`;
  }
  return token.value
    .replace(/var\(--color-([a-z0-9-]+)\)/g, '$1')
    .replace(/^--alpha\((.+)\)$/, '$1');
}

function swatchStyle(token: ThemeToken): CSSProperties {
  const color = cssVar(token);
  const family = familyOf(token);
  switch (token.utility) {
    case 'text':
    case 'decoration':
      return family && tierOf(token, family) === 'on'
        ? { color, background: `var(--fill-${family})` }
        : { color };
    case 'border':
    case 'ring':
    case 'outline':
    case 'stroke':
      return { boxShadow: `inset 0 0 0 3px ${color}` };
    case 'shadow':
      return {
        boxShadow: `0 8px 18px -6px color-mix(in oklab, ${color} 45%, transparent)`,
      };
    default:
      return {
        background: `linear-gradient(${color}, ${color}), ${isInverse(token) ? 'var(--background-color-inverse)' : CHECKER}`,
      };
  }
}

function Swatch({ token }: { token: ThemeToken }) {
  const isText = token.utility === 'text' || token.utility === 'decoration';
  const isFilled =
    !isText && !['border', 'ring', 'outline', 'stroke'].includes(token.utility);
  return (
    <span
      className={swatchStyles({
        backdrop: isFilled ? 'none' : isInverse(token) ? 'inverse' : 'surface',
      })}
      style={swatchStyle(token)}
    >
      {isText ? 'Aa' : null}
    </span>
  );
}

function TokenCard({ token, label }: { token: ThemeToken; label?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Swatch token={token} />
      <div className="flex min-w-0 flex-col">
        <code
          className="truncate font-mono text-xs font-medium text-primary"
          title={label ?? token.className}
        >
          {label ?? token.className}
        </code>
        <span className="truncate font-mono text-2xs text-subtle">
          {formatValue(token)}
        </span>
      </div>
    </div>
  );
}

function Block({
  id,
  title,
  description,
  children,
}: PropsWithChildren<{ id: string; title: string; description: ReactNode }>) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="max-w-[72ch] text-sm leading-6 text-muted">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function Label({ children }: PropsWithChildren) {
  return <code className="font-mono text-2xs text-subtle">{children}</code>;
}

function Surfaces() {
  const states = [
    ['surface', 'On a surface', 'hover:bg-muted pressed:bg-emphasis'],
    [
      'canvas',
      'Nav and mixed backgrounds',
      'hover:bg-tint-subtle pressed:bg-tint',
    ],
    ['icon', 'Icon buttons', 'hover:bg-tint pressed:bg-tint-strong'],
    [
      'inverse',
      'On an inverse surface',
      'hover:bg-inverse-tint pressed:bg-inverse-tint-strong',
    ],
  ] as const;
  return (
    <Block
      id="surfaces"
      title="Surfaces"
      description="Layers stack from sunken rails and the page canvas to raised surfaces and floating frames, then quiet and inset areas. Hover the examples below to see the matching interaction states."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-sunken p-3">
          <Label>bg-sunken · sidebar and docked rails</Label>
        </div>
        <div className="rounded-2xl border bg-elevated p-3 shadow-lg">
          <Label>bg-elevated · popover, menu and dialog frames</Label>
        </div>
      </div>
      <div className="rounded-2xl border bg-canvas p-3 sm:p-4">
        <Label>bg-canvas · page and in-page frames</Label>
        <div className="mt-2 rounded-xl border bg-surface p-3 shadow-xs">
          <Label>bg-surface · panels, menu sections, dialog bodies</Label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-subtle p-3">
              <Label>bg-subtle · card bodies, quiet areas</Label>
              <p className="mt-1 text-sm text-tertiary">
                Rows and values sit here with text-tertiary.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="rounded-lg border border-default bg-muted px-2 py-1.5 text-sm text-primary">
                bg-muted · inputs and chips
              </span>
              <span className="rounded-lg bg-emphasis px-2 py-1.5 text-sm text-secondary">
                bg-emphasis · pressed, skeletons
              </span>
              <span className="rounded-lg bg-strong px-2 py-1.5 text-sm text-secondary">
                bg-strong · stronger neutral fill
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {states.map(([on, title, recipe]) => {
          const styles = stateStyles({ on });
          return (
            <div key={on} className={styles.tile()}>
              <span className={styles.label()}>{recipe}</span>
              <AriaButton className={styles.target()}>
                {on === 'icon' ? (
                  <Icon name={IconName.Copy} className="h-4 w-4" />
                ) : (
                  title
                )}
              </AriaButton>
            </div>
          );
        })}
      </div>
    </Block>
  );
}

function TextTokens() {
  const text = TOKENS.filter(
    (token) => token.utility === 'text' && !familyOf(token),
  );
  const regular = text.filter((token) => !isInverse(token));
  const inverse = text.filter(isInverse);
  return (
    <Block
      id="text"
      title="Text"
      description="Six levels on regular surfaces, four on inverse surfaces. Pick a lower level instead of adding opacity."
    >
      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <div className="divide-y divide-muted overflow-hidden rounded-xl border bg-surface">
          {regular.map((token) => (
            <div
              key={token.name}
              className="flex items-baseline gap-4 px-4 py-2.5"
            >
              <code className="w-32 shrink-0 font-mono text-xs text-muted">
                {token.className}
              </code>
              <span
                className="truncate text-sm"
                style={{ color: cssVar(token) }}
              >
                Invocation completed after 3 attempts in 1.2s
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-2 rounded-xl border border-inverse bg-inverse px-4 py-3">
          {inverse.map((token) => (
            <div key={token.name} className="flex items-baseline gap-4">
              <code className="w-40 shrink-0 font-mono text-xs text-inverse-muted">
                {token.className}
              </code>
              <span
                className="truncate text-sm"
                style={{ color: cssVar(token) }}
              >
                Created 2d 22h ago
              </span>
            </div>
          ))}
        </div>
      </div>
    </Block>
  );
}

function FamilyRow({ family }: { family: Family }) {
  const tokens = TOKENS.filter((token) => familyOf(token) === family);
  const bg = BG_TIERS.flatMap((tier) =>
    tokens.filter(
      (token) => token.utility === 'bg' && tierOf(token, family) === tier,
    ),
  );
  const v = (namespace: string, tier = '') =>
    `var(--${namespace}-${family}${tier ? `-${tier}` : ''})`;
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-mono text-sm font-semibold text-primary">
          {family}
        </h3>
        <p className="text-sm text-muted">{FAMILY_MEANING[family]}</p>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {bg.map((token) => (
          <TokenCard
            key={token.name}
            token={token}
            label={tierOf(token, family)}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span style={{ color: v('text-color', 'subtle') }}>
          text-{family}-subtle
        </span>
        <span style={{ color: v('text-color') }}>text-{family}</span>
        <span style={{ color: v('text-color', 'strong') }}>
          text-{family}-strong
        </span>
        <span
          className="rounded-md border px-1.5 py-0.5 text-xs font-medium"
          style={{
            background: v('background-color', 'subtle'),
            borderColor: `color-mix(in oklab, ${v('border-color', 'strong')} 20%, transparent)`,
            color: v('text-color', 'strong'),
          }}
        >
          badge
        </span>
        <span
          className="rounded-md border px-1.5 py-0.5 text-xs"
          style={{
            background: v('background-color', 'subtle'),
            borderColor: v('border-color'),
            color: v('text-color'),
          }}
        >
          banner
        </span>
        <span
          className="rounded-md px-2 py-0.5 text-xs font-medium text-inverse"
          style={{ background: v('background-color') }}
        >
          solid
        </span>
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: v('fill'),
            color: `var(--text-color-on-${family})`,
          }}
        >
          !
        </span>
      </div>
    </div>
  );
}

function Families() {
  return (
    <Block
      id="families"
      title="Status families"
      description="Every family has the same tiers, so a pattern built for one works for all of them. Swatches show the bg tiers; the row below shows text, border and fill pairings."
    >
      <div className="flex flex-col gap-3">
        {FAMILIES.map((family) => (
          <FamilyRow key={family} family={family} />
        ))}
      </div>
    </Block>
  );
}

function Group({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Section>
      <SectionTitle>{title}</SectionTitle>
      <SectionContent className="flex flex-wrap items-center gap-3">
        {children}
      </SectionContent>
    </Section>
  );
}

function Components() {
  const intents = [
    'none',
    'default',
    'info',
    'success',
    'warning',
    'pending',
    'danger',
  ] as const;
  return (
    <Block
      id="components"
      title="Components"
      description="The shared components from @restate/ui-*. Reach for these before writing classes."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <Group title="Button">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="icon" aria-label="Copy">
            <Icon name={IconName.Copy} className="h-4 w-4" />
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </Group>
        <Group title="Link">
          <Link href="#components">Primary</Link>
          <Link href="#components" variant="secondary">
            Secondary
          </Link>
          <Link href="#components" variant="button">
            Button
          </Link>
          <Link href="#components" variant="secondary-button">
            Secondary button
          </Link>
          <Link href="#components" variant="destructive-button">
            Destructive button
          </Link>
        </Group>
        <Group title="Badge">
          <Badge>default</Badge>
          <Badge variant="info">info</Badge>
          <Badge variant="success">success</Badge>
          <Badge variant="warning">warning</Badge>
          <Badge variant="danger">danger</Badge>
          <Badge variant="success" size="sm">
            sm
          </Badge>
        </Group>
        <Group title="Form controls">
          <FormFieldInput
            name="example"
            label="Input"
            placeholder="Placeholder"
            className="w-48"
          />
          <FormFieldInput
            name="disabled"
            label="Disabled"
            placeholder="Disabled"
            disabled
            className="w-48"
          />
          <FormFieldCheckbox name="checkbox" value="on" defaultChecked>
            Checkbox
          </FormFieldCheckbox>
          <Switch defaultSelected>Switch</Switch>
        </Group>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {intents.map((intent) => (
          <Card key={intent} intent={intent}>
            <CardHeader title={`Card · ${intent}`} icon={IconName.Layers} />
            <CardRow label="Attempts">3</CardRow>
            <CardRow label="Duration">1.2s</CardRow>
          </Card>
        ))}
      </div>
    </Block>
  );
}

function Recipe({
  title,
  classes,
  children,
}: PropsWithChildren<{ title: string; classes: string[] }>) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4 shadow-xs">
      <h3 className="text-sm font-medium text-secondary">{title}</h3>
      <div className="flex min-h-12 items-center rounded-lg bg-canvas p-3">
        {children}
      </div>
      {classes.map((value) => (
        <code
          key={value}
          className="rounded-md bg-subtle px-2 py-1 font-mono text-2xs leading-5 wrap-break-word text-tertiary"
        >
          {value}
        </code>
      ))}
    </div>
  );
}

function Recipes() {
  const r = recipes();
  return (
    <Block
      id="recipes"
      title="Recipes"
      description="The most common hand-written combinations in the codebase. Copy them when no component fits."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Recipe title="Panel on the page" classes={[r.panel()]}>
          <div className={r.panel()}>Panel content</div>
        </Recipe>
        <Recipe title="Text field" classes={[r.field()]}>
          <input className={r.field()} placeholder="Search services…" />
        </Recipe>
        <Recipe title="Banner" classes={[r.banner(), r.bannerIcon()]}>
          <div className={r.banner()}>
            <Icon name={IconName.TriangleAlert} className={r.bannerIcon()} />
            This deployment has breaking changes.
          </div>
        </Recipe>
        <Recipe title="Status badge" classes={[r.badge()]}>
          <span className={r.badge()}>Failed</span>
        </Recipe>
        <Recipe title="Neutral chip" classes={[r.chip()]}>
          <span className={r.chip()}>rev. 1</span>
        </Recipe>
        <Recipe title="Floating inverse panel" classes={[r.inverse()]}>
          <div className={r.inverse()}>Oct 16, 2026, 6:29:02 PM</div>
        </Recipe>
        <Recipe title="Skeleton" classes={[r.skeleton()]}>
          <span className={r.skeleton()} />
        </Recipe>
      </div>
    </Block>
  );
}

function AllTokens() {
  return (
    <Block
      id="tokens"
      title="All tokens"
      description={
        <>
          Parsed from <code className="font-mono">theme.css</code> at build
          time, so this list is always complete. An arrow means the token points
          at another one.
        </>
      }
    >
      {NAMESPACES.map(({ prefix, utility }) => {
        const tokens = TOKENS.filter((token) => token.utility === utility);
        if (tokens.length === 0) {
          return null;
        }
        return (
          <div key={utility} className="flex flex-col gap-2">
            <h3 className="font-mono text-sm font-semibold text-secondary">
              {utility}-*{' '}
              <span className="font-normal text-subtle">--{prefix}*</span>
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-3 gap-y-4 rounded-xl border bg-surface p-4 shadow-xs">
              {tokens.map((token) => (
                <TokenCard key={token.variable} token={token} />
              ))}
            </div>
          </div>
        );
      })}
    </Block>
  );
}

function Component() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 sm:px-6">
      <div className="flex flex-col gap-3">
        <ListPageHeader
          icon={IconName.Layers}
          title="Design system"
          className="px-0 pb-0"
        >
          Role-based color tokens from @restate/util-styles/theme.css and the
          shared components built on them. The written guide, with when to use
          what, lives in libs/util/styles/DESIGN.md.
        </ListPageHeader>
        <nav className="flex flex-wrap gap-1">
          {SECTIONS.map(([id, title]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg px-2.5 py-1 text-sm text-tertiary no-underline outline-offset-2 outline-focus hover:bg-tint-subtle focus-visible:outline-2"
            >
              {title}
            </a>
          ))}
        </nav>
      </div>
      <Surfaces />
      <TextTokens />
      <Families />
      <Components />
      <Recipes />
      <AllTokens />
    </div>
  );
}

export const designSystem = { Component };
