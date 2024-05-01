import { SubmitButton } from '@restate/ui/button';
import { FormFieldCheckbox, FormFieldInput } from '@restate/ui/form-field';
import { useFetcherWithError } from '@restate/util/remix';
import { clientAction } from './action';
import { ErrorBanner } from '@restate/ui/error';
import { Link } from '@restate/ui/link';

export function CreateAccountOnboarding() {
  const action = '/accounts';
  const fetcher = useFetcherWithError<typeof clientAction>({ key: action });

  return (
    <div className="flex-auto flex items-center">
      <fetcher.Form
        method="POST"
        action={action}
        className="flex flex-col gap-4 bg-white rounded-xl border p-5 max-w-md mx-auto"
      >
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Welcome to restate Cloud!
        </h3>
        <div>
          <p className="text-sm text-gray-500">
            You'll need an account to manage resources, users, and permissions.
            Help us tailor your experience by providing a brief description of
            your account. We're thrilled to have you on board!
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
        <div>
          <p className="text-sm text-gray-500 mb-1">
            To get started, kindly review and agree to our Terms and Conditions.
          </p>
          <FormFieldCheckbox name="tc" required>
            <span>
              I have read and agree to the{' '}
              <Link
                href="https://restate.dev"
                target="_blank"
                rel="noreferrer noopener"
              >
                Terms & Conditions
              </Link>
            </span>
          </FormFieldCheckbox>
        </div>
        <ErrorBanner errors={fetcher.errors} />
        <SubmitButton variant="primary" className="flex-auto">
          Sign up
        </SubmitButton>
      </fetcher.Form>
    </div>
  );
}
