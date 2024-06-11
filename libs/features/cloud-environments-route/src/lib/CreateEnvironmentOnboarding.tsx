import { SubmitButton } from '@restate/ui/button';
import { FormFieldInput } from '@restate/ui/form-field';
import { useFetcherWithError } from '@restate/util/remix';
import { clientAction } from './action';
import { ErrorBanner } from '@restate/ui/error';
import { useAccountParam } from '@restate/features/cloud/routes-utils';

export function CreateEnvironmentOnboarding() {
  const accountId = useAccountParam();
  const action = `/accounts/${accountId}/environments`;
  const fetcher = useFetcherWithError<typeof clientAction>({ key: action });

  return (
    <div className="flex-auto flex items-center animate-in fade-in slide-in-from-top-6 duration-300">
      <fetcher.Form
        method="POST"
        name="createEnvironment"
        action={action}
        className="flex flex-col gap-4 bg-white rounded-xl border p-5 max-w-md mx-auto"
      >
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Create environment
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Creating a Restate Cloud environment is the quickest path to
            securing a dedicated, fully managed Restate instance.
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">
            Please provide a name for your new environment
          </p>
          <FormFieldInput
            autoFocus
            required
            name="name"
            className="mt-2"
            placeholder="Name"
            pattern="[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]"
          />
          <p className="text-xs text-gray-500 mt-2">
            Choose a DNS-compatible name: lowercase letters, numbers, and
            hyphens only. Must start/end with a letter or number (3-63
            characters).
          </p>
        </div>
        <ErrorBanner errors={fetcher.errors} />
        <SubmitButton variant="primary" className="flex-auto">
          Create
        </SubmitButton>
      </fetcher.Form>
    </div>
  );
}
