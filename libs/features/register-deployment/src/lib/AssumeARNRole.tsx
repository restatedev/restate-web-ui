import { FormFieldInput } from '@restate/ui/form-field';
import { useRegisterDeploymentContext } from './Context';
import { InlineTooltip } from '@restate/ui/tooltip';

const ROLE_REGEX =
  /^arn:aws(?:-cn|-us-gov)?:iam::\d{12}:role(?:\/[\w+=,.@\-]+)+$/;
export function AssumeARNRole({ className }: { className?: string }) {
  const { updateAssumeRoleArn, assumeRoleArn } = useRegisterDeploymentContext();

  return (
    <FormFieldInput
      name="assume_role_arn"
      placeholder="arn:aws:iam::{account}:role/{role-name}"
      pattern={ROLE_REGEX.source}
      value={assumeRoleArn}
      className={className}
      onChange={updateAssumeRoleArn}
      label={
        <>
          <span slot="title">
            <InlineTooltip
              title="Assumed role"
              variant="indicator-button"
              description={
                <p>
                  This role must exist in your account, it must trust Restate
                  Cloud to assume it, and it must have permission to invoke the
                  Lambda function containing the handler.
                </p>
              }
              learnMoreHref="https://docs.restate.dev/cloud/connecting-services#connecting-aws-lambda-services"
            >
              Role ARN
            </InlineTooltip>
          </span>
          <span slot="description" className="block text-0.5xs leading-5">
            AWS role ARN that Restate can assume to invoke the Lambda function
          </span>
        </>
      }
    />
  );
}
