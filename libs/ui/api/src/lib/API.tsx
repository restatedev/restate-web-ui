import { createElement, useEffect, useId, useRef, useState } from 'react';
import { Spinner } from '@restate/ui-loading';
import { tv } from '@restate/util-styles';

const API_TAG = 'elements-api';
const JSON_SCHEMA_VIEWER_TAG = 'elements-json-schema-viewer';

type ElementsApiElement = HTMLElement & {
  tryItFetcher?: typeof globalThis.fetch;
};

export const API = ({
  apiDescriptionDocument,
  layout = 'responsive',
  tryItFetcher,
}: {
  apiDescriptionDocument?: string;
  layout?: 'sidebar' | 'responsive' | 'stacked';
  tryItFetcher?: typeof globalThis.fetch;
}) => {
  const id = useId();
  const apiRef = useRef<ElementsApiElement>(null);

  useEffect(() => {
    const element = apiRef.current;
    if (!element) {
      return;
    }
    element.tryItFetcher = tryItFetcher;

    return () => {
      if (element.tryItFetcher === tryItFetcher) {
        element.tryItFetcher = undefined;
      }
    };
  }, [tryItFetcher]);

  return createElement(API_TAG, {
    ref: apiRef,
    id,
    apiDescriptionDocument,
    router: 'hash',
    layout,
  });
};

function useIsCustomElementDefined(tagName: string) {
  const [isDefined, setIsDefined] = useState(
    () =>
      typeof customElements !== 'undefined' &&
      customElements.get(tagName) !== undefined,
  );

  useEffect(() => {
    if (isDefined) {
      return;
    }
    let isCancelled = false;
    customElements.whenDefined(tagName).then(() => {
      if (!isCancelled) {
        setIsDefined(true);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [isDefined, tagName]);

  return isDefined;
}

const schemaStyles = tv({
  base: 'stoplight block [&_svg.fa-fw]:ml-1 [&_svg.fa-fw]:text-2xs!',
});
export const JsonSchemaViewer = ({
  schema,
  className,
}: {
  schema?: unknown;
  className?: string;
}) => {
  const isDefined = useIsCustomElementDefined(JSON_SCHEMA_VIEWER_TAG);

  if (!isDefined) {
    return (
      <div className="flex items-center gap-1.5 py-2 text-sm text-muted">
        <Spinner className="h-4 w-4" />
        Loading…
      </div>
    );
  }

  return createElement(JSON_SCHEMA_VIEWER_TAG, {
    className: schemaStyles({ className }),
    schema,
    disableCrumbs: true,
    renderRootTreeLines: true,
  });
};
