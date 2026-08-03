import type { PropsWithChildren } from 'react';
import { ServiceTarget, type ServiceTargetLinks } from './ServiceTarget';

export interface ParsedTarget {
  service: string;
  serviceKey?: string;
  handler: string;
}

export function parseTarget(target: string): ParsedTarget | undefined {
  if (!target) return undefined;
  const segments = target.split('/');
  const service = segments.at(0);
  const handler = segments.at(-1);
  if (!service || !handler) return undefined;
  const serviceKey =
    segments.length > 2
      ? target.substring(service.length + 1, target.length - handler.length - 1)
      : undefined;
  return { service, serviceKey, handler };
}

export type TargetProps = PropsWithChildren<{
  target?: string;
  className?: string;
  showHandler?: boolean;
  links?: ServiceTargetLinks;
}>;

export function Target({
  target = '',
  className,
  showHandler = true,
  links,
  children,
}: TargetProps) {
  const parsedTarget = parseTarget(target);
  if (!parsedTarget) return null;
  return (
    <ServiceTarget
      {...parsedTarget}
      showHandler={showHandler}
      links={links}
      className={className}
    >
      {children}
    </ServiceTarget>
  );
}
