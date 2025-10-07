import { FormFieldCheckbox } from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import { useRegisterDeploymentContext } from './Context';

export function OverrideWarning() {
  const { isLambda, isDuplicate, shouldForce, updateShouldForce } =
    useRegisterDeploymentContext();

  if (!isDuplicate) {
    return null;
  }

  return (
    <FormFieldCheckbox
      name="force"
      className="relative mb-2 rounded-xl bg-orange-100 p-3 [&_.error]:absolute [&_.error]:bottom-[-1.5em] [&_input]:bg-white"
      value="true"
      checked={shouldForce}
      onChange={updateShouldForce}
      direction="right"
      autoFocus
    >
      <div
        slot="title"
        className="flex items-center gap-2 text-sm font-semibold text-orange-600"
      >
        <Icon
          className="h-5 w-5 fill-orange-600 text-orange-100"
          name={IconName.TriangleAlert}
        />
        Override existing deployments
      </div>

      <span
        slot="description"
        className="mt-2 block pl-7 text-0.5xs leading-5 text-orange-600"
      >
        An existing deployment with the same {isLambda ? 'ARN' : 'URL'} already
        exists. Would you like to override it? Please note that this may cause{' '}
        <strong className="font-semibold">unrecoverable errors</strong> in
        active invocations.
      </span>
    </FormFieldCheckbox>
  );
}
