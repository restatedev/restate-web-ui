import { ContentPanel, ContentPanelBody } from '@restate/ui-content-panel';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { ATTEMPT_FIXTURES } from './attemptFixtures';
import { buildAttemptRecord } from './attemptRecord';
import { AttemptRecordView } from './AttemptRecordView';

const fixtureStyles = tv({
  base: 'flex min-w-0 flex-1 basis-56 flex-col gap-1 rounded-xl border px-3 py-2 text-left text-xs transition',
  variants: {
    isSelected: {
      true: 'border-accent/40 bg-surface shadow-sm',
      false: 'border-default bg-subtle text-muted hover:bg-surface',
    },
  },
});

function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fixtureId = searchParams.get('fixture') ?? ATTEMPT_FIXTURES[0]?.id;
  const view =
    searchParams.get('view') === 'waterfall' ? 'waterfall' : 'attempts';
  const fixture =
    ATTEMPT_FIXTURES.find((item) => item.id === fixtureId) ??
    ATTEMPT_FIXTURES[0];

  const record = useMemo(
    () =>
      fixture
        ? buildAttemptRecord(fixture.rows, {
            now: Date.parse(fixture.now),
            createdAt: fixture.invocation.created_at,
            completedAt: fixture.invocation.completed_at,
            isCompleted: Boolean(fixture.invocation.completed_at),
          })
        : undefined,
    [fixture],
  );

  if (!fixture || !record) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pt-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Icon name={IconName.Restart} className="h-5 w-5 text-muted" />
          Attempt record preview
        </h1>
        <p className="text-sm text-muted">
          Mock invocations on the explicit recovery protocol, built from
          fixtures that follow the attempt record contract. The invocation page
          shows the same views for real invocations.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {ATTEMPT_FIXTURES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={fixtureStyles({ isSelected: item.id === fixture.id })}
            onClick={() =>
              setSearchParams((old) => {
                const next = new URLSearchParams(old);
                next.set('fixture', item.id);
                return next;
              })
            }
          >
            <span className="font-medium text-secondary">{item.title}</span>
            <span className="font-mono text-2xs text-subtle">
              {item.invocation.target}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{fixture.description}</p>
      <ContentPanel
        tabs={{
          items: [
            { id: 'attempts', label: 'Attempts' },
            { id: 'waterfall', label: 'Waterfall' },
          ],
          defaultId: 'attempts',
          queryParam: 'view',
        }}
      >
        <ContentPanelBody>
          <AttemptRecordView
            key={fixture.id}
            record={record}
            view={view}
            title={fixture.invocation.target}
          />
        </ContentPanelBody>
      </ContentPanel>
    </div>
  );
}

export const attemptsPreview = { Component };
