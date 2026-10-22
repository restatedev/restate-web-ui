import { Icon, IconName } from '@restate/ui-icons';
import { HoverTooltip } from '@restate/ui-tooltip';
import { Link } from '@restate/ui-link';
import { tv } from '@restate/util-styles';

const HIDDEN_METADATA_PREFIX = 'dev.restate.';

const COMMIT_KEYS = [
  'github.commit.sha',
  'github_commit_sha',
  'github.sha',
  'github_sha',
  'git.commit.sha',
  'git_commit_sha',
];
const REPO_KEYS = ['github.repository', 'github_repository'];
const ACTION_RUN_ID_KEYS = [
  'github.actions.run.id',
  'github_actions_run_id',
  'github_run_id',
  'github.run.id',
];

const GITHUB_KEYS = [...COMMIT_KEYS, ...ACTION_RUN_ID_KEYS, ...REPO_KEYS];

export function getVisibleMetadataEntries(metadata?: Record<string, string>) {
  return Object.entries(metadata ?? {}).filter(
    ([name]) => !name.startsWith(HIDDEN_METADATA_PREFIX),
  );
}

export function getCustomMetadataEntries(metadata?: Record<string, string>) {
  return getVisibleMetadataEntries(metadata).filter(
    ([name]) => !GITHUB_KEYS.includes(name),
  );
}

export function hasGithubMetadata(metadata?: Record<string, string>) {
  const commitSha = COMMIT_KEYS.reduce<string | undefined>((acc, key) => {
    return acc || metadata?.[key];
  }, undefined);
  const repository = REPO_KEYS.reduce<string | undefined>((acc, key) => {
    return acc || metadata?.[key];
  }, undefined);
  const actionsRunId = ACTION_RUN_ID_KEYS.reduce<string | undefined>(
    (acc, key) => {
      return acc || metadata?.[key];
    },
    undefined,
  );

  if (repository && (commitSha || actionsRunId)) {
    return true;
  }
  return false;
}

const githubStyles = tv({
  base: 'flex items-center px-1.5 py-1 text-0.5xs font-medium text-muted',
});
export function GithubMetadata({
  metadata,
  className,
}: {
  metadata?: Record<string, string>;
  className?: string;
}) {
  const commitSha = COMMIT_KEYS.reduce<string | undefined>((acc, key) => {
    return acc || metadata?.[key];
  }, undefined);
  const repository = REPO_KEYS.reduce<string | undefined>((acc, key) => {
    return acc || metadata?.[key];
  }, undefined);
  const actionsRunId = ACTION_RUN_ID_KEYS.reduce<string | undefined>(
    (acc, key) => {
      return acc || metadata?.[key];
    },
    undefined,
  );

  if (!repository) {
    return null;
  }

  const baseUrl = `https://github.com/${repository}`;
  const commitUrl = commitSha ? `${baseUrl}/commit/${commitSha}` : undefined;
  const actionUrl = actionsRunId
    ? `${baseUrl}/actions/runs/${actionsRunId}`
    : undefined;

  return (
    <div className={githubStyles({ className })}>
      <span className="flex flex-auto items-center pl-1">
        <Icon name={IconName.Github} className="mr-2.5 h-4 w-4" />
        Github
      </span>
      <div className="flex gap-2">
        {commitUrl && (
          <HoverTooltip content="View commit">
            <Link
              href={commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="icon"
              className="bg-accent-subtle text-accent"
            >
              <Icon name={IconName.GitGraph} className="h-4 w-4" />
            </Link>
          </HoverTooltip>
        )}
        {actionUrl && (
          <HoverTooltip content="View GitHub Action run">
            <Link
              href={actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="icon"
              className="bg-accent-subtle text-accent"
            >
              <Icon name={IconName.CirclePlay} className="h-4 w-4" />
            </Link>
          </HoverTooltip>
        )}
      </div>
    </div>
  );
}

const miniGithubMetadataStyles = tv({
  base: 'flex gap-2',
});

export function MiniGithubMetadata({
  metadata,
  className,
}: {
  metadata?: Record<string, string>;
  className?: string;
}) {
  const commitSha = COMMIT_KEYS.reduce<string | undefined>((acc, key) => {
    return acc || metadata?.[key];
  }, undefined);
  const repository = REPO_KEYS.reduce<string | undefined>((acc, key) => {
    return acc || metadata?.[key];
  }, undefined);
  const actionsRunId = ACTION_RUN_ID_KEYS.reduce<string | undefined>(
    (acc, key) => {
      return acc || metadata?.[key];
    },
    undefined,
  );

  if (!repository) {
    return null;
  }

  const baseUrl = `https://github.com/${repository}`;
  const commitUrl = commitSha ? `${baseUrl}/commit/${commitSha}` : undefined;
  const actionUrl = actionsRunId
    ? `${baseUrl}/actions/runs/${actionsRunId}`
    : undefined;

  return (
    <div className={miniGithubMetadataStyles({ className })}>
      {commitUrl && (
        <HoverTooltip content="View commit">
          <Link
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="icon"
            className="text-accent"
          >
            <Icon name={IconName.GitGraph} className="h-3.5 w-3.5" />
          </Link>
        </HoverTooltip>
      )}
      {actionUrl && (
        <HoverTooltip content="View GitHub Action run">
          <Link
            href={actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="icon"
            className="text-accent"
          >
            <Icon name={IconName.CirclePlay} className="h-3.5 w-3.5" />
          </Link>
        </HoverTooltip>
      )}
    </div>
  );
}
