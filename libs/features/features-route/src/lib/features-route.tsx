import {
  FEATURE_FLAGS,
  FEATURE_FLAG_METADATA,
  setFeatureFlag,
  useIsFeatureFlagEnabled,
  type FeatureFlag,
} from '@restate/util/feature-flag';
import { Switch } from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';

function FeatureFlagRow({ flag }: { flag: FeatureFlag }) {
  const { title, description, available } = FEATURE_FLAG_METADATA[flag];
  const isEnabled = useIsFeatureFlagEnabled(flag);

  return (
    <div className="flex items-start gap-4 px-4 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{title}</span>
          {!available && (
            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-2xs font-medium text-zinc-500">
              Coming soon
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{description}</p>
        <code className="mt-0.5 font-mono text-2xs text-gray-400">{flag}</code>
      </div>
      <Switch
        aria-label={title}
        isSelected={available && isEnabled}
        isDisabled={!available}
        onChange={(value) => setFeatureFlag(flag, value)}
        className="mt-1 shrink-0"
      />
    </div>
  );
}

function Component() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-2 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-xs">
          <Icon name={IconName.Sparkles} className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-gray-800">
            Restate UI Labs
          </h1>
          <p className="text-sm text-gray-500">
            Turn UI experimental features on or off. Preferences are saved in
            this browser only.
          </p>
        </div>
      </div>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border bg-white shadow-xs">
        {FEATURE_FLAGS.map((flag) => (
          <FeatureFlagRow key={flag} flag={flag} />
        ))}
      </div>
    </div>
  );
}

export const features = { Component };
