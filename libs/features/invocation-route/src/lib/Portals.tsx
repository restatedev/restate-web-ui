import { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';

export function getTimelineId(
  invocationId: string,
  index?: number,
  type?: string,
  category?: string
) {
  return `${invocationId}-journal-timeline-${category}-${type}-${index}`;
}

export function getEntryId(
  invocationId: string,
  index?: number,
  type?: string,
  category?: string
) {
  return `${invocationId}-journal-entry-${category}-${type}-${index}`;
}

export function TimelinePortal({
  children,
  index,
  invocationId,
  type,
  category,
}: PropsWithChildren<{
  invocationId: string;
  index?: number;
  type?: string;
  category?: string;
}>) {
  const element = document.querySelector(
    `[data-id=${getTimelineId(invocationId, index, type, category)}]`
  );

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

export function EntryPortal({
  children,
  index,
  invocationId,
  type,
  category,
}: PropsWithChildren<{
  invocationId: string;
  index?: number;
  type?: string;
  category?: string;
}>) {
  const element = document.querySelector(
    `[data-id=${getEntryId(invocationId, index, type, category)}]`
  );
  console.log(element);
  if (!element) {
    return null;
  }

  return createPortal(children, element);
}
