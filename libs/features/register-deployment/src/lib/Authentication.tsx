import { FormFieldCheckbox, FormFieldInput } from '@restate/ui/form-field';
import { Copy } from '@restate/ui/copy';
import { Link } from '@restate/ui/link';
import { useRestateContext } from '@restate/features/restate-context';
import { useRegisterDeploymentContext } from './Context';
import { tv } from 'tailwind-variants';
import { InlineTooltip } from '@restate/ui/tooltip';

const styles = tv({
  base: '',
});
export function Authentication({ className }: { className?: string }) {
  const { googleAuth, updateGoogleAuth, isPending } =
    useRegisterDeploymentContext();
  const { gcpServiceAccount } = useRestateContext();
  const isEnabled = Boolean(googleAuth);

  return (
    <div className={styles({ className })}>
      <div className="-m-3 rounded-xl p-3 hover:bg-gray-50 has-pressed:bg-gray-100">
        <FormFieldCheckbox
          name="auth"
          className="relative self-baseline [&_label]:before:absolute [&_label]:before:inset-0 [&_label]:before:content-['']"
          value="true"
          checked={isEnabled}
          disabled={isPending}
          direction="right"
          autoFocus
          onChange={(checked) =>
            updateGoogleAuth?.(
              checked
                ? gcpServiceAccount
                  ? { impersonateServiceAccount: gcpServiceAccount.value }
                  : {}
                : undefined,
            )
          }
        >
          <span slot="title" className="text-sm font-medium text-gray-700">
            Authenticate with Google ID token
          </span>
          <span
            slot="description"
            className="block text-0.5xs leading-5 text-gray-500"
          >
            Restate mints a Google-signed OIDC ID token for each request and
            attaches it as <code>X-Serverless-Authorization</code>, for invoking
            private Google Cloud Run services.
          </span>
        </FormFieldCheckbox>
      </div>
      {isEnabled && (
        <div className="mt-4 flex flex-col gap-4">
          <FormFieldInput
            name="auth_audience"
            placeholder="https://my-service-abc-uc.a.run.app"
            value={googleAuth?.audience ?? ''}
            disabled={isPending}
            onChange={(value) =>
              updateGoogleAuth?.({
                ...googleAuth,
                audience: value || undefined,
              })
            }
            label={
              <>
                <span slot="title">Audience</span>
                <span slot="description" className="block text-0.5xs leading-5">
                  Optional. Leave empty to derive it from the deployment URL.
                  Set it explicitly for custom domains, load balancers, traffic
                  tags, or non-default ports, where it must match the Cloud Run
                  service's canonical URL.
                </span>
              </>
            }
          />
          {gcpServiceAccount ? (
            <FormFieldInput
              readonly
              name="auth_impersonate_service_account"
              value={gcpServiceAccount.value}
              className="[&_input]:pr-9"
              label={
                <>
                  <span slot="title">Service account to impersonate</span>
                  <span
                    slot="description"
                    className="block text-0.5xs leading-5"
                  >
                    Your environment's Google service account. Restate mints
                    tokens as this identity. Grant it{' '}
                    <code>roles/run.invoker</code> on your Cloud Run service so
                    Restate can invoke it.{' '}
                    {gcpServiceAccount.url && (
                      <Link
                        href={gcpServiceAccount.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="secondary"
                      >
                        Learn more…
                      </Link>
                    )}
                  </span>
                </>
              }
            >
              <Copy
                copyText={gcpServiceAccount.value}
                className="absolute top-1/2 right-0.5 ml-0 -translate-y-1/2 p-1.5"
              />
            </FormFieldInput>
          ) : (
            <FormFieldInput
              name="auth_impersonate_service_account"
              placeholder="caller@my-project.iam.gserviceaccount.com"
              value={googleAuth?.impersonateServiceAccount ?? ''}
              disabled={isPending}
              onChange={(value) =>
                updateGoogleAuth?.({
                  ...googleAuth,
                  impersonateServiceAccount: value || undefined,
                })
              }
              label={
                <>
                  <span slot="title">
                    Service account to impersonate{' '}
                    <InlineTooltip
                      title="Service account to impersonate"
                      variant="indicator-button"
                      description={
                        <div>
                          The account must allow Restate to impersonate it (
                          <code>
                            roles/iam.serviceAccountOpenIdTokenCreator
                          </code>
                          ). Also needed if Restate's own credentials can't
                          issue ID tokens, such as federated or external
                          accounts or a local <code>gcloud</code> login.
                        </div>
                      }
                    />
                  </span>
                  <span
                    slot="description"
                    className="block text-0.5xs leading-5"
                  >
                    Optional. Leave empty to use Restate's own Google
                    credentials, or enter a service account email to mint tokens
                    as that account instead.{' '}
                  </span>
                </>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
