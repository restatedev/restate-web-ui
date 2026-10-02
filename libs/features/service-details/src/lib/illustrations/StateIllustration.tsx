import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';
import { explanationItemStyles } from './primitives';
import { JournalLines, Section, timelineStyles } from './timeline';

const KEYS: { name: string; width: string }[] = [
  { name: 'k1', width: '70%' },
  { name: 'k2', width: '46%' },
  { name: 'k3', width: '84%' },
];

const GET_LINE_TOP = '2.9375rem';
const RETURN_LINE_TOP = '4.125rem';

const styles = tv({
  slots: {
    story:
      'grid grid-cols-[6.25rem_11.5rem_6.25rem] items-start gap-2 px-3 pt-3 pb-2.5 text-[0.65625rem] text-gray-500',
    keyChips: 'flex gap-[3px]',
    keyChip:
      'inline-flex h-3 items-center rounded-[3px] border border-blue-700/10 bg-blue-50 px-[4px] font-mono text-[0.4375rem] leading-none font-semibold text-blue-700',
  },
});

function StateKeys({ active }: { active?: string[] }) {
  const s = timelineStyles();
  return (
    <div className={s.stateBlock()} aria-hidden="true">
      {KEYS.map((key) => {
        const isActive = !active || active.includes(key.name);
        return (
          <span key={key.name} className={s.stateLine()}>
            <span className={s.stateKey()}>{key.name}</span>
            <span
              className={s.stateBar({
                className: isActive ? undefined : s.stateBarMuted(),
              })}
              style={{ width: key.width }}
            />
          </span>
        );
      })}
    </div>
  );
}

function Node({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  const ts = timelineStyles();
  return (
    <div className={ts.flowNode()}>
      <span className={ts.nodeTitle()}>
        <Icon name={icon} className={ts.nodeIcon()} />
        {title}
      </span>
      {children}
    </div>
  );
}

function KeyChips({ keys }: { keys: string[] }) {
  const s = styles();
  return (
    <span className={s.keyChips()}>
      {keys.map((key) => (
        <span key={key} className={s.keyChip()}>
          {key}
        </span>
      ))}
    </span>
  );
}

function StateStory({ mode }: { mode: 'eager' | 'lazy' }) {
  const s = styles();
  const ts = timelineStyles();
  const isEager = mode === 'eager';
  return (
    <div className={s.story()} role="img" aria-label={`${mode} state loading`}>
      <Node icon={IconName.Database} title="Restate">
        <span className={ts.nodeTag()}>state</span>
        <StateKeys />
      </Node>

      <div
        className={ts.wires()}
        style={{ minHeight: isEager ? undefined : '6.25rem' }}
      >
        <span className={ts.wire()} style={{ top: '1.5rem' }}>
          <span className={ts.dotStart()} />
          <span className={ts.arrowRight()} />
        </span>
        <span
          className={ts.chip({ className: ts.packet() })}
          style={{ top: '1.5rem' }}
        >
          <span className={ts.chipTag()}>request</span>
          {isEager && <KeyChips keys={KEYS.map((key) => key.name)} />}
        </span>
        {!isEager && (
          <>
            <span
              className={ts.wire({ className: ts.wireDashed() })}
              style={{ top: GET_LINE_TOP }}
            >
              <span className={ts.dotEnd()} />
              <span className={ts.arrowLeft()} />
              <span className={ts.wireLabel()}>get("k2")</span>
            </span>
            <span className={ts.wire()} style={{ top: RETURN_LINE_TOP }}>
              <span className={ts.dotStart()} />
              <span className={ts.arrowRight()} />
            </span>
            <span
              className={ts.packet({ className: ts.packetBare() })}
              style={{ top: RETURN_LINE_TOP }}
            >
              <KeyChips keys={['k2']} />
            </span>
          </>
        )}
        <span className={ts.flowCaption()}>
          {isEager
            ? 'the whole state travels with the request'
            : 'a round trip brings back only that key'}
        </span>
      </div>

      <Node icon={IconName.Function} title="handler">
        <JournalLines rows={2} state="solid" entry='ctx.get("k2")' />
        <span className={ts.nodeTag()}>
          {isEager ? 'local read' : 'fetch k2'}
        </span>
      </Node>
    </div>
  );
}

export function EagerStateExplanation({ className }: { className?: string }) {
  return (
    <p className={explanationItemStyles({ surface: 'light', className })}>
      <strong className="font-medium">Eager:</strong> Restate sends the object's
      whole state along with the request, so every <code>ctx.get</code> inside
      the handler is served from that local copy.
    </p>
  );
}

export function LazyStateExplanation({ className }: { className?: string }) {
  return (
    <p className={explanationItemStyles({ surface: 'light', className })}>
      <strong className="font-medium">Lazy:</strong> the request carries no
      state. Each <code>ctx.get</code> fetches just that key from Restate, which
      keeps requests small for objects with large state.
    </p>
  );
}

export function StateLoadingIllustration({
  lazy = false,
  explanation = false,
  className,
}: {
  lazy?: boolean;
  explanation?: boolean;
  className?: string;
}) {
  const s = timelineStyles();
  const note = (mode: 'eager' | 'lazy') =>
    (lazy ? 'lazy' : 'eager') === mode ? 'current' : undefined;
  return (
    <div className={s.root({ className })}>
      <Section title="Eager" note={note('eager')}>
        <StateStory mode="eager" />
      </Section>
      {explanation && (
        <EagerStateExplanation className={s.sectionExplanation()} />
      )}
      <Section title="Lazy" note={note('lazy')}>
        <StateStory mode="lazy" />
      </Section>
      {explanation && (
        <LazyStateExplanation className={s.sectionExplanation()} />
      )}
    </div>
  );
}
