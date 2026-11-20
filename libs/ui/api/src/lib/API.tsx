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
let stylesheetLoading: Promise<void> | undefined;
let scriptLoading: Promise<void> | undefined;

function loadStylesheet() {
  stylesheetLoading ??= new Promise<void>((resolve, reject) => {
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
      stylesheetLoading = undefined;
      reject(new Error('Failed to load Stoplight Elements styles'));
    };
    document.head.appendChild(stylesheet);
  });
  return stylesheetLoading;
}

function loadScript() {
  scriptLoading ??= new Promise<void>((resolve, reject) => {
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
    const fail = (message: string) => {
      script.remove();
      scriptLoading = undefined;
      reject(new Error(message));
    };
    script.onload = () => {
      if (customElements.get(API_TAG)) {
        resolve();
        return;
      }
      fail('Stoplight Elements did not define its elements');
    };
    script.onerror = () => fail('Failed to load Stoplight Elements');
    document.head.appendChild(script);
  });
  return scriptLoading;
}

let elementsReady = false;
const readyListeners = new Set<() => void>();

function loadElements() {
  elementsLoading ??= Promise.all([loadStylesheet(), loadScript()]).then(
    async () => {
      await Promise.all([
        customElements.whenDefined(API_TAG),
        customElements.whenDefined(JSON_SCHEMA_VIEWER_TAG),
      ]);
      elementsReady = true;
      readyListeners.forEach((listener) => listener());
    },
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

function useElements() {
  const [isReady, setIsReady] = useState(() => elementsReady);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (isReady) {
      return;
    }
    let isCancelled = false;
    const onReady = () => {
      if (!isCancelled) {
        setIsReady(true);
      }
    };
    readyListeners.add(onReady);
    loadElements().then(onReady, () => {
      if (!isCancelled) {
        setHasFailed(true);
      }
    });
    return () => {
      isCancelled = true;
      readyListeners.delete(onReady);
    };
  }, [isReady]);

  return { isReady, hasFailed: hasFailed && !isReady };
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
  const { isReady, hasFailed } = useElements();
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

  if (!isReady) {
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
  const { isReady, hasFailed } = useElements();

  if (!isReady) {
    return <ElementsLoading hasFailed={hasFailed} />;
  }

  return createElement(JSON_SCHEMA_VIEWER_TAG, {
    className: schemaStyles({ className }),
    schema,
    disableCrumbs: true,
    renderRootTreeLines: true,
  });
};
