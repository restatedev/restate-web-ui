import { Invocation, useListDeployments } from '@restate/data-access/admin-api';
import { Deployment } from '@restate/features/overview-route';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';

const RESTATE_SDK_REGEXP =
  /restate-sdk-(?<sdk>[typescript|go|kotlin|java|rust|python]+)\/(?<version>[\d\\.]+)?/;
function getSDKVersion(value: Invocation['last_attempt_server'] = '') {
  if (!value) {
    return {};
  }
  const { sdk, version } = value.match(RESTATE_SDK_REGEXP)?.groups ?? {};
  if (sdk) {
    return { sdk, version };
  } else {
    return {};
  }
}

const langStyles = tv({
  base: 'aspect-square',
  variants: {
    lang: {
      typescript: 'py-1',
      go: 'mr-0.5',
      kotlin: 'py-[0.3125rem]',
      rust: 'py-0.5',
      python: 'py-1',
      java: '-mt-2',
    },
  },
});
const LANG_ICONS = {
  typescript: IconName.Typescript,
  rust: IconName.Rust,
  go: IconName.Go,
  python: IconName.Python,
  java: IconName.Java,
  kotlin: IconName.Kotlin,
} as const;

type Lang = keyof typeof LANG_ICONS;

function LanguageIcon({
  lang,
  className,
}: {
  lang: string;
  className?: string;
}) {
  if (Object.keys(LANG_ICONS).includes(lang)) {
    return (
      <Icon
        name={LANG_ICONS[lang as Lang]}
        className={langStyles({ lang: lang as Lang, className })}
      />
    );
  }
  return null;
}

function SDK({
  lastAttemptServer,
}: {
  lastAttemptServer: Invocation['last_attempt_server'];
}) {
  const { sdk, version } = getSDKVersion(lastAttemptServer);

  if (!sdk) {
    return null;
  }

  return (
    <>
      <LanguageIcon lang={sdk} className="w-6 h-6 shrink-0 opacity-80" />
      SDK/{version && <div className=" font-semibold truncate">{version}</div>}
    </>
  );
}

const styles = tv({
  base: 'text-xs  flex flex-col items-start',
});

export function DeploymentCell({
  invocation,
  className,
}: {
  invocation: Invocation;
  className?: string;
}) {
  const { data } = useListDeployments();
  const deploymentId =
    invocation.last_attempt_deployment_id ?? invocation.pinned_deployment_id;
  if (deploymentId) {
    const deployment = data?.deployments.get(deploymentId);
    const revision = deployment?.services.find(
      ({ name }) => name === invocation.target_service_name
    )?.revision;

    return revision ? (
      <div className={styles({ className })}>
        <Deployment
          deploymentId={deploymentId}
          revision={revision}
          className="text-xs p-0 pr-0.5 m-0 [&_a:before]:rounded-md max-w-full"
          highlightSelection={false}
        />
        <div className="[font-size:85%] font-mono font-semibold text-zinc-500/80 flex items-center border border-transparent ml-7 max-w-[calc(100%-1.75rem)] -mt-0.5">
          <SDK lastAttemptServer={invocation.last_attempt_server} />
        </div>
      </div>
    ) : null;
  }
  return null;
}
