import { Badge } from '@restate/ui/badge';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { explanationItemStyles } from './primitives';
import { Section, timelineStyles } from './timeline';

const styles = tv({
  slots: {
    story:
      'grid grid-cols-[auto_minmax(10rem,1fr)_auto] grid-rows-[auto_auto_auto] items-center gap-x-2 gap-y-2 px-3 pt-3 pb-2.5 text-[0.65625rem] text-gray-500',
    card: 'flex h-7 min-w-[7.5rem] items-center gap-1.5 rounded-lg border bg-gray-50 px-2 text-[0.65625rem] leading-tight font-medium whitespace-nowrap text-zinc-600 shadow-xs',
    cardIcon: 'h-3 w-3 shrink-0 text-zinc-400',
    cardName: 'truncate',
    target: 'row-span-2 self-center',
    lane: 'relative row-span-2 min-w-0 self-stretch',
    topOut:
      'absolute top-[0.875rem] right-[1.5rem] -left-2 h-[0.375rem] rounded-tr-md border-t border-r border-dashed border-slate-300',
    topIn:
      'absolute top-[1.25rem] -right-2 left-[calc(100%-1.5rem)] h-[0.375rem] rounded-bl-md border-b border-l border-dashed border-slate-300',
    bottomOut:
      'absolute right-[1.5rem] bottom-[0.875rem] -left-2 h-[0.375rem] rounded-br-md border-r border-b border-dashed border-slate-300',
    bottomIn:
      'absolute top-[2.375rem] -right-2 left-[calc(100%-1.5rem)] h-[0.375rem] rounded-tl-md border-t border-l border-dashed border-slate-300',
    arrowBottomEdge:
      'absolute right-0 bottom-[-3px] h-[5px] w-[5px] rotate-45 border-t border-r border-slate-400',
    arrowTopEdge:
      'absolute top-[-3px] right-0 h-[5px] w-[5px] rotate-45 border-t border-r border-slate-400',
    blockedWire:
      'absolute top-[0.875rem] -left-2 w-[55%] border-t border-dashed border-slate-300/70',
    stop: 'absolute top-[-5px] right-0 h-[11px] w-px bg-slate-400',
    badge:
      'absolute top-[-4px] left-1/2 h-3.5 -translate-x-1/2 -translate-y-full gap-[3px] rounded px-1 text-[0.4375rem] leading-none font-semibold tracking-[0.03em] uppercase',
    badgeIcon: 'h-2 w-2 shrink-0',
    caption:
      'col-start-2 row-start-3 text-center text-[0.59375rem] leading-tight text-gray-400',
  },
});

function EndpointCard({
  icon,
  name,
  className,
}: {
  icon: IconName;
  name: string;
  className?: string;
}) {
  const s = styles();
  return (
    <div className={s.card({ className })}>
      <Icon name={icon} className={s.cardIcon()} />
      <span className={s.cardName()} title={name}>
        {name}
      </span>
    </div>
  );
}

function AccessStory({
  mode,
  service,
}: {
  mode: 'public' | 'private';
  service: string;
}) {
  const s = styles();
  const isPublic = mode === 'public';
  const badge = (
    <Badge
      size="xs"
      variant={isPublic ? 'success' : 'default'}
      className={s.badge()}
    >
      <Icon
        name={isPublic ? IconName.Http : IconName.Security}
        className={s.badgeIcon()}
      />
      {mode}
    </Badge>
  );
  return (
    <div className={s.story()} role="img" aria-label={`${mode} access`}>
      <EndpointCard icon={IconName.Http} name="Ingress" />
      <div className={s.lane()}>
        {isPublic ? (
          <>
            <span className={s.topOut()}>{badge}</span>
            <span className={s.topIn()}>
              <span className={s.arrowBottomEdge()} />
            </span>
          </>
        ) : (
          <span className={s.blockedWire()}>
            <span className={s.stop()} />
            {badge}
          </span>
        )}
        <span className={s.bottomOut()} />
        <span className={s.bottomIn()}>
          <span className={s.arrowTopEdge()} />
        </span>
      </div>
      <EndpointCard icon={IconName.Box} name={service} className={s.target()} />
      <EndpointCard icon={IconName.Box} name="another service" />
      <span className={s.caption()}>
        {isPublic
          ? 'reachable over HTTP and from other services'
          : 'only other Restate services can call it'}
      </span>
    </div>
  );
}

export function PublicAccessExplanation({ className }: { className?: string }) {
  return (
    <p className={explanationItemStyles({ surface: 'light', className })}>
      <strong className="font-medium">Public:</strong> anyone who can reach the
      ingress can invoke the service over HTTP, and so can handlers of other
      Restate services.
    </p>
  );
}

export function PrivateAccessExplanation({
  className,
}: {
  className?: string;
}) {
  return (
    <p className={explanationItemStyles({ surface: 'light', className })}>
      <strong className="font-medium">Private:</strong> the ingress refuses
      calls to it. Only handlers of other Restate services can invoke it,
      through the SDK.
    </p>
  );
}

export function AccessIllustration({
  isPublic = true,
  service,
  explanation = false,
  className,
}: {
  isPublic?: boolean;
  service?: string;
  handler?: string;
  explanation?: boolean;
  className?: string;
}) {
  const s = timelineStyles();
  const serviceName = service ?? 'Service';
  const note = (mode: 'public' | 'private') =>
    (isPublic ? 'public' : 'private') === mode ? 'current' : undefined;
  return (
    <div className={s.root({ className })}>
      <Section title="Public" note={note('public')}>
        <AccessStory mode="public" service={serviceName} />
      </Section>
      {explanation && (
        <PublicAccessExplanation className={s.sectionExplanation()} />
      )}
      <Section title="Private" note={note('private')}>
        <AccessStory mode="private" service={serviceName} />
      </Section>
      {explanation && (
        <PrivateAccessExplanation className={s.sectionExplanation()} />
      )}
    </div>
  );
}
