import { createElement, useCallback, useEffect, useId, useState } from 'react';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { tv } from '@restate/util-styles';
import { elementsCssUrl, elementsJsUrl } from '../assets';

const API_TAG = 'elements-api';
const JSON_SCHEMA_VIEWER_TAG = 'elements-json-schema-viewer';

type ElementsApiElement = HTMLElement & {
  tryItFetcher?: typeof globalThis.fetch;
};

let elementsLoading: Promise<void> | undefined;

function injectStylesheet() {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`link[href="${elementsCssUrl}"]`)) {
      resolve();
      return;
    }
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = elementsCssUrl;
    stylesheet.onload = () => resolve();
    stylesheet.onerror = () => {
      stylesheet.remove();
      reject(new Error('Failed to load Stoplight Elements styles'));
    };
    document.head.append(stylesheet);
  });
}

function injectScript() {
  return new Promise<void>((resolve, reject) => {
    if (
      customElements.get(API_TAG) ||
      document.querySelector(`script[src="${elementsJsUrl}"]`)
    ) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = elementsJsUrl;
    script.async = true;
    script.onload = () => {
      if (customElements.get(API_TAG)) {
        resolve();
        return;
      }
      script.remove();
      reject(new Error('Stoplight Elements did not define its elements'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Failed to load Stoplight Elements'));
    };
    document.head.append(script);
  });
}

function loadElements() {
  elementsLoading ??= Promise.all([injectStylesheet(), injectScript()]).then(
    () => customElements.whenDefined(API_TAG).then(() => undefined),
    (error: unknown) => {
      elementsLoading = undefined;
      throw error;
    },
  );
  return elementsLoading;
}

export function preloadElements() {
  if (typeof document === 'undefined') {
    return;
  }
  loadElements().catch(() => undefined);
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

const loadingStyles = tv({
  slots: {
    base: 'flex items-center gap-1.5 py-2 text-sm text-muted',
    icon: 'h-4 w-4',
  },
  variants: {
    fill: {
      true: {
        base: 'h-full w-full justify-center gap-2.5 py-12',
        icon: 'h-5 w-5',
      },
    },
    hasFailed: {
      true: {
        base: 'text-danger',
        icon: 'h-3.5 w-3.5',
      },
    },
  },
});

function ElementsLoading({
  hasFailed,
  fill = false,
}: {
  hasFailed: boolean;
  fill?: boolean;
}) {
  const { base, icon } = loadingStyles({ fill, hasFailed });
  return (
    <div className={base()}>
      {hasFailed ? (
        <>
          <Icon name={IconName.TriangleAlert} className={icon()} />
          Failed to load
        </>
      ) : (
        <>
          <Spinner className={icon()} />
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
  const { isDefined, hasFailed } = useElements(API_TAG);
  const apiRef = useCallback(
    (element: ElementsApiElement | null) => {
      if (!element) {
        return;
      }
      element.tryItFetcher = tryItFetcher;
      return () => {
        if (element.tryItFetcher === tryItFetcher) {
          element.tryItFetcher = undefined;
        }
      };
    },
    [tryItFetcher],
  );

  if (!isDefined) {
    return <ElementsLoading hasFailed={hasFailed} fill />;
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
