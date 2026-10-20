import { FormFieldCheckbox } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { useRegisterDeploymentContext } from './Context';

export function OverrideBreaking() {
  const {
    isBreakingChangeError,
    shouldAllowBreakingChange,
    updateShouldAllowBreakingChange,
    error,
  } = useRegisterDeploymentContext();

  if (!isBreakingChangeError) {
    return null;
  }

  return (
    <div>
      <div className="relative mb-2 rounded-xl border border-warning bg-warning-subtle p-3 [&_.error]:absolute [&_.error]:bottom-[-1.5em] [&_input]:bg-surface">
        <div
          slot="title"
          className="flex items-center gap-2 text-sm font-semibold text-warning"
        >
          <Icon
            className="h-5 w-5 fill-warning text-on-warning"
            name={IconName.TriangleAlert}
          />
          Breaking change detected!
        </div>

        <span
          slot="description"
          className="mt-2 block pl-7 text-0.5xs leading-5 text-warning"
        >
          The new service revision conflicts with an existing revision and
          cannot be registered automatically:
          <code className="mt-2 block rounded-lg border bg-emphasis/30 p-2 text-xs mix-blend-multiply shadow-[inset_0_0.5px_0.5px_0px_--theme(--box-shadow-color-default/8%)]">
            {error?.message?.split('[META0006]').at(-1)?.trim()}
          </code>
        </span>
        <div className="relative -mx-3 mt-3 -mb-3 rounded-b-xl border-t border-warning bg-surface/60 py-3">
          <FormFieldCheckbox
            name="breaking"
            className="pl-3 text-warning [--checkbox-bg:var(--background-color-surface)] [&_label]:before:absolute [&_label]:before:inset-0 [&_label]:before:content-['']"
            value="true"
            checked={shouldAllowBreakingChange}
            onChange={updateShouldAllowBreakingChange}
            autoFocus
            required
          >
            <div className="text-0.5xs font-medium">
              Register deployment despite breaking changes
            </div>
          </FormFieldCheckbox>
        </div>
      </div>
    </div>
  );
}
