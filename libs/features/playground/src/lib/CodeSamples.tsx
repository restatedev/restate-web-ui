import { memo, useId, useRef, useState } from 'react';
import { Code, Snippet } from '@restate/ui-code';
import { Copy } from '@restate/ui-copy';
import { tv } from '@restate/util-styles';
import {
  toCurl,
  toFetch,
  toPython,
  toGoClient,
  toJavaClient,
  toPythonClient,
  toTypeScriptClient,
  type PlaygroundRequest,
  type RestateClientSnippetInput,
} from '@restate/util-openapi';
import { SegmentedControl } from './SegmentedControl';

const GROUP_STORAGE_KEY = 'restate.playground.sampleGroup';

type SampleGroup = 'sdk' | 'http';
type Highlight = 'typescript' | 'python' | 'bash' | 'java' | 'go';

interface SampleInput {
  request: PlaygroundRequest;
  client?: RestateClientSnippetInput;
}

interface SampleLanguage {
  value: string;
  label: string;
  highlight: Highlight;
  render: (input: SampleInput) => string | undefined;
}

function sdkLanguage(
  value: string,
  label: string,
  highlight: Highlight,
  toClient: (client: RestateClientSnippetInput) => string | undefined,
): SampleLanguage {
  return {
    value,
    label,
    highlight,
    render: ({ client }) => (client ? toClient(client) : undefined),
  };
}

const GROUPS: {
  value: SampleGroup;
  label: string;
  title: string;
  storageKey: string;
  languages: SampleLanguage[];
}[] = [
  {
    value: 'sdk',
    label: 'SDK',
    title: 'Call the handler with a Restate SDK client',
    storageKey: 'restate.playground.sdkLanguage',
    languages: [
      sdkLanguage('typescript', 'TS', 'typescript', toTypeScriptClient),
      sdkLanguage('java', 'Java', 'java', toJavaClient),
      sdkLanguage('go', 'Go', 'go', toGoClient),
      sdkLanguage('python', 'Python', 'python', toPythonClient),
    ],
  },
  {
    value: 'http',
    label: 'HTTP',
    title: 'Send the same request with any HTTP client',
    storageKey: 'restate.playground.sampleLanguage',
    languages: [
      {
        value: 'curl',
        label: 'cURL',
        highlight: 'bash',
        render: ({ request }) => toCurl(request),
      },
      {
        value: 'fetch',
        label: 'JS',
        highlight: 'typescript',
        render: ({ request }) => toFetch(request),
      },
      {
        value: 'python',
        label: 'Python',
        highlight: 'python',
        render: ({ request }) => toPython(request),
      },
    ],
  },
];

function readStored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

const tabStyles = tv({
  base: '-mb-px border-b-2 pb-2 text-sm font-medium outline-offset-2 outline-focus transition-colors focus-visible:rounded focus-visible:outline-2',
  variants: {
    isSelected: {
      true: 'border-neutral-strong text-primary',
      false:
        'border-transparent text-tertiary hover:border-neutral hover:text-primary',
    },
  },
});

export const CodeSamples = memo(function CodeSamples({
  samples,
}: {
  samples: SampleInput;
}) {
  const id = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [group, setGroup] = useState<SampleGroup>(() =>
    readStored(GROUP_STORAGE_KEY) === 'http' ? 'http' : 'sdk',
  );
  const [languages, setLanguages] = useState<Record<string, string | null>>(
    () =>
      Object.fromEntries(
        GROUPS.map(({ value, storageKey }) => [value, readStored(storageKey)]),
      ),
  );

  const available = GROUPS.map((candidate) => ({
    ...candidate,
    languages: candidate.languages.flatMap((language) => {
      const code = language.render(samples);
      return code === undefined ? [] : [{ ...language, code }];
    }),
  })).filter(({ languages }) => languages.length > 0);
  const current =
    available.find(({ value }) => value === group) ?? available[0];
  const language =
    current?.languages.find(
      ({ value }) => value === languages[current.value],
    ) ?? current?.languages[0];

  if (!current || !language) {
    return null;
  }

  const selectGroup = (value: SampleGroup) => {
    setGroup(value);
    writeStored(GROUP_STORAGE_KEY, value);
  };
  const tabId = (value: SampleGroup) => `${id}-${value}-tab`;
  const panelId = `${id}-panel`;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-end gap-4 border-b border-default">
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Code sample"
          className="flex shrink-0 gap-5"
        >
          {available.map(({ value, label, title }, index) => (
            <button
              key={value}
              id={tabId(value)}
              type="button"
              role="tab"
              title={title}
              aria-selected={value === current.value}
              aria-controls={panelId}
              tabIndex={value === current.value ? 0 : -1}
              className={tabStyles({ isSelected: value === current.value })}
              onClick={() => selectGroup(value)}
              onKeyDown={(event) => {
                const step =
                  event.key === 'ArrowRight'
                    ? 1
                    : event.key === 'ArrowLeft'
                      ? -1
                      : 0;
                if (!step) {
                  return;
                }
                event.preventDefault();
                const nextIndex =
                  (index + step + available.length) % available.length;
                const next = available[nextIndex];
                if (next) {
                  selectGroup(next.value);
                  tabsRef.current
                    ?.querySelectorAll<HTMLButtonElement>('[role=tab]')
                    [nextIndex]?.focus();
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-1.5 ml-auto flex min-w-0 items-center gap-1">
          {current.languages.length > 1 && (
            <SegmentedControl
              label="Language"
              className="min-w-0 shrink overflow-x-auto"
              value={language.value}
              options={current.languages.map(({ value, label }) => ({
                value,
                label,
              }))}
              onChange={(value) => {
                setLanguages((previous) => ({
                  ...previous,
                  [current.value]: value,
                }));
                writeStored(current.storageKey, value);
              }}
            />
          )}
          <Copy copyText={language.code} className="p-1.5" />
        </div>
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(current.value)}>
        <Code className="max-h-96 overflow-auto">
          <Snippet language={language.highlight}>{language.code}</Snippet>
        </Code>
      </div>
    </section>
  );
});
