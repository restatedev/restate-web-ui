import { SubmitButton } from '@restate/ui/button';
import { FormFieldCheckbox, FormFieldInput } from '@restate/ui/form-field';
import { useFetcherWithError } from '@restate/util/remix';
import { clientAction } from './action';
import { ErrorBanner } from '@restate/ui/error';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';

export function CreateAccountOnboarding() {
  const action = '/accounts';
  const fetcher = useFetcherWithError<typeof clientAction>({ key: action });

  return (
    <div className="flex-auto flex items-center animate-in fade-in slide-in-from-top-6 duration-300">
      <fetcher.Form
        method="POST"
        action={action}
        className="flex flex-col  max-w-md mx-auto"
        name="createAccount"
      >
        <h3 className="pl-5 mb-4 text-[#222452] text-xl font-medium leading-6 flex items-center gap-2">
          Welcome to
          <Icon
            name={IconName.RestateEnvironment}
            className="inline-block drop-shadow-sm"
          />
          Cloud!
        </h3>
        <div className="flex flex-col gap-6 bg-white rounded-xl border p-5">
          <div>
            <div>
              <p className="text-sm text-gray-500 mt-1">
                You'll need an account to manage resources, users, and
                permissions. Help us tailor your experience by providing a name
                of your account. We're thrilled to have you on board!
              </p>
              <FormFieldInput
                autoFocus
                required
                name="name"
                className="mt-4"
                placeholder="Name"
                pattern="[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]"
              />
              <p className="text-xs text-gray-500 mt-2">
                Choose a DNS-compatible name: lowercase letters, numbers, and
                hyphens only. Must start/end with a letter or number (3-63
                characters).
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">
              To get started, kindly review and agree to our Terms and
              Conditions.
            </p>
            <FormFieldCheckbox name="tc" required>
              <span className="text-sm text-start">
                I have read and agree to the{' '}
                <Link
                  href="https://restate.dev/terms-and-conditions"
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
        </div>
        <p className="text-gray-500 mt-2 text-xs px-5">
          As part of the use of our services, we may send our customers product
          information and updates on our offerings. You can object to this at
          any time and free of charge by sending an email to{' '}
          <Link
            href="mailto:dataprotection@restate.dev"
            target="_blank"
            variant="secondary"
            rel="noreferrer noopener"
          >
            dataprotection@restate.dev
          </Link>
          . Further information on the processing of your personal data can be
          found at{' '}
          <Link
            href="https://restate.dev/privacy/"
            target="_blank"
            variant="secondary"
            rel="noreferrer noopener"
          >
            https://restate.dev/privacy/
          </Link>
          .
        </p>
      </fetcher.Form>
    </div>
  );
}