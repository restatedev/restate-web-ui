import { FormFieldCheckbox } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { useRegisterDeploymentContext } from './Context';

export function OverrideWarning() {
  const { isLambda, isDuplicate, shouldForce, updateShouldForce } =
    useRegisterDeploymentContext();

  if (!isDuplicate) {
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
          Deployment already exists!
        </div>

        <span
          slot="description"
          className="mt-2 block pl-7 text-0.5xs leading-5 text-warning"
        >
          An existing deployment with the same {isLambda ? 'ARN' : 'URL'}{' '}
          already exists. Would you like to override it? Please note that this
          may cause{' '}
          <strong className="font-semibold">unrecoverable errors</strong> in
          active invocations.
        </span>
        <div className="relative -mx-3 mt-3 -mb-3 rounded-b-xl border-t border-warning bg-surface/60 py-3">
          <FormFieldCheckbox
            name="force"
            className="pl-3 text-warning [--checkbox-bg:var(--background-color-surface)] [&_label]:before:absolute [&_label]:before:inset-0 [&_label]:before:content-['']"
            value="true"
            checked={shouldForce}
            onChange={updateShouldForce}
            autoFocus
            required
          >
            <div className="text-0.5xs font-medium">
              Override existing deployment
            </div>
          </FormFieldCheckbox>
        </div>
      </div>
    </div>
  );
}
