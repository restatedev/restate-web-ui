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
    <div className="flex-auto flex items-center animate-in fade-in slide-in-from-top-6 duration-300">
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
            Help us tailor your experience by providing a name of your account.
            We're thrilled to have you on board!
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
        <div>
          <p className="text-sm text-gray-500 mb-1">
            To get started, kindly review and agree to our Terms and Conditions.
          </p>
          <FormFieldCheckbox name="tc" required>
            <span className="text-sm text-start">
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
