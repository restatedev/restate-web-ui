import { createElement, useEffect, useId, useRef, useState } from 'react';
import { Spinner } from '@restate/ui-loading';
import { tv } from '@restate/util-styles';
import { elementsCssUrl, elementsJsUrl } from '../assets';

const API_TAG = 'elements-api';
const JSON_SCHEMA_VIEWER_TAG = 'elements-json-schema-viewer';

type ElementsApiElement = HTMLElement & {
  tryItFetcher?: typeof globalThis.fetch;
};

let elementsLoading: Promise<void> | undefined;

function loadElements() {
  if (customElements.get(API_TAG)) {
    return Promise.resolve();
  }
  elementsLoading ??= new Promise<void>((resolve, reject) => {
    const styled = new Promise<void>((resolveStyle) => {
      if (document.querySelector(`link[href="${elementsCssUrl}"]`)) {
        resolveStyle();
        return;
      }
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = elementsCssUrl;
      stylesheet.onload = () => resolveStyle();
      stylesheet.onerror = () => resolveStyle();
      document.head.append(stylesheet);
    });
    if (!document.querySelector(`script[src="${elementsJsUrl}"]`)) {
      const script = document.createElement('script');
      script.src = elementsJsUrl;
      script.async = true;
      script.onerror = () => {
        script.remove();
        elementsLoading = undefined;
        reject(new Error('Failed to load Stoplight Elements'));
      };
      document.head.append(script);
    }
    Promise.all([styled, customElements.whenDefined(API_TAG)]).then(() =>
      resolve(),
    );
  });
  return elementsLoading;
}

function useElements(tagName: string) {
  const [isDefined, setIsDefined] = useState(
    () =>
      typeof customElements !== 'undefined' &&
      customElements.get(tagName) !== undefined,
  );
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (isDefined) {
      return;
    }
    let isCancelled = false;
    loadElements()
      .then(() => customElements.whenDefined(tagName))
      .then(() => {
        if (!isCancelled) {
          setIsDefined(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setHasFailed(true);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [isDefined, tagName]);

  return { isDefined, hasFailed };
}

function ElementsLoading({ hasFailed }: { hasFailed: boolean }) {
  return (
    <div className="flex items-center gap-1.5 py-2 text-sm text-muted">
      {hasFailed ? (
        'Failed to load'
      ) : (
        <>
          <Spinner className="h-4 w-4" />
          Loading…
        </>
      )}
    </div>
  );
}

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
  const { isDefined, hasFailed } = useElements(API_TAG);

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
  }, [tryItFetcher, isDefined]);

  if (!isDefined) {
    return <ElementsLoading hasFailed={hasFailed} />;
  }

  return createElement(API_TAG, {
    ref: apiRef,
    id,
    apiDescriptionDocument,
    router: 'hash',
    layout,
  });
};

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
  const { isDefined, hasFailed } = useElements(JSON_SCHEMA_VIEWER_TAG);

  if (!isDefined) {
    return <ElementsLoading hasFailed={hasFailed} />;
  }

  return createElement(JSON_SCHEMA_VIEWER_TAG, {
    className: schemaStyles({ className }),
    schema,
    disableCrumbs: true,
    renderRootTreeLines: true,
  });
};
