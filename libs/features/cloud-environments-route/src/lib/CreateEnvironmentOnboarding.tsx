import { SubmitButton } from '@restate/ui/button';
import { FormFieldInput } from '@restate/ui/form-field';
import { useFetcherWithError } from '@restate/util/remix';
import { clientAction } from './action';
import { ErrorBanner } from '@restate/ui/error';
import { useAccountParam } from '@restate/features/cloud/utils-routes';

export function CreateEnvironmentOnboarding() {
  const accountId = useAccountParam();
  const action = `/accounts/${accountId}/environments`;
  const fetcher = useFetcherWithError<typeof clientAction>({ key: action });

  return (
    <div className="flex-auto flex items-center animate-in fade-in slide-in-from-top-6 duration-300">
      <fetcher.Form
        method="POST"
        action={action}
        className="flex flex-col gap-4 bg-white rounded-xl border p-5 max-w-md mx-auto"
      >
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Create environment
          </h3>
          <p className="text-sm text-gray-500">
            Setting up a restate Cloud environment is the most convenient method
            to acquire your dedicated restate server instance.
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">
            Please provide a brief description for your new environment
          </p>

          <FormFieldInput
            autoFocus
            required
            name="description"
            className="mt-2"
            placeholder="Description"
            maxLength={100}
          />
        </div>
        <ErrorBanner errors={fetcher.errors} />
        <SubmitButton variant="primary" className="flex-auto">
          Create
        </SubmitButton>
      </fetcher.Form>
    </div>
  );
}
