import { Invocation } from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';

const RESTATE_SDK_REGEXP =
  /restate-sdk-(?<sdk>[typescript|go|kotlin|java|rust|python]+)\/(?<version>[\d\\.]+)?/;
export function getSDKVersion(value: Invocation['last_attempt_server'] = '') {
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
      kotlin: 'py-1.25',
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

const sdkStyles = tv({
  base: 'flex items-center border border-transparent font-mono font-semibold text-zinc-500/80',
});
export function SDK({
  lastAttemptServer,
  className,
}: {
  lastAttemptServer: Invocation['last_attempt_server'];
  className?: string;
}) {
  const { sdk, version } = getSDKVersion(lastAttemptServer);

  if (!sdk) {
    return null;
  }

  return (
    <div className={sdkStyles({ className })}>
      <LanguageIcon lang={sdk} className="h-6 w-6 shrink-0 opacity-70" />
      <div className="inline-flex items-center">
        SDK/
        {version && <div className="truncate">{version}</div>}
      </div>
    </div>
  );
}
