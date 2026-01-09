import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import { OptionListItemWithTooltip } from './utils';

const COMMIT_KEYS = [
  'github.commit.sha',
  'github_commit_sha',
  'github.sha',
  'github_sha',
];
const REPO_KEYS = ['github.repository', 'github_repository'];
const ACTION_RUN_ID_KEYS = [
  'github.actions.run.id',
  'github_actions_run_id',
  'github_run_id',
  'github.run.id',
];

export function Metadata({
  metadata: metadataList,
  className,
}: {
  metadata?: Record<string, string>;
  className?: string;
}) {
  const metadata = Object.entries(metadataList ?? {});
  const metadataExcludingGithub = metadata.filter(
    ([name]) =>
      ![...COMMIT_KEYS, ...ACTION_RUN_ID_KEYS, ...REPO_KEYS].includes(name),
  );

  if (metadata.length > 0) {
    return (
      <Section className={className}>
        <SectionTitle>Metadata</SectionTitle>
        <SectionContent className="p-0">
          <GithubMetadata metadata={metadataList} />
        </SectionContent>
        {metadataExcludingGithub.length > 0 && (
          <SectionContent className="p-0" raised={false}>
            <div className="mt-2 grid grid-cols-[1fr_2fr] text-xs font-medium text-gray-400">
              <div className="pl-2">Key</div>
              <div className="pl-2">Value</div>
            </div>

            <div className="flex flex-col rounded-[calc(0.75rem-0.125rem)] border shadow-xs">
              {metadataExcludingGithub.map(([name, value]) => (
                <OptionListItemWithTooltip
                  name={name}
                  value={value}
                  key={name}
                />
              ))}
            </div>
          </SectionContent>
        )}
        <span className="px-3 py-2 text-xs leading-4 text-gray-500">
          Metadata attached at the time of registration.
        </span>
      </Section>
    );
  }

  return null;
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
  base: 'flex items-center px-1.5 py-1 text-0.5xs font-medium text-gray-500',
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
              className="bg-blue-50 text-blue-600"
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
              className="bg-blue-50 text-blue-600"
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
            className="text-blue-600"
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
            className="text-blue-600"
          >
            <Icon name={IconName.CirclePlay} className="h-3.5 w-3.5" />
          </Link>
        </HoverTooltip>
      )}
    </div>
  );
}
