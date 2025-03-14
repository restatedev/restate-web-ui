import { FormFieldInput } from '@restate/ui/form-field';
import { useRegisterDeploymentContext } from './Context';
import { InlineTooltip } from '@restate/ui/tooltip';

export function AssumeARNRole() {
  const { updateAssumeRoleArn, assumeRoleArn } = useRegisterDeploymentContext();

  return (
    <FormFieldInput
      name="assume_role_arn"
      placeholder="arn:aws:iam::{account}:role/{role-name}"
      pattern="^arn:aws:iam::\d{12}:role(\/[\w-]+)*\/[\w+-]+$"
      value={assumeRoleArn}
      onChange={updateAssumeRoleArn}
      label={
        <>
          <span slot="title">
            <InlineTooltip
              title="Assumed role"
              description={
                <p>
                  This role must exist in your account, it must trust Restate
                  Cloud to assume it, and it must have permission to invoke the
                  Lambda function containing the handler.
                </p>
              }
              learnMoreHref="https://docs.restate.dev/deploy/server/cloud#aws-lambda-services"
            >
              Role ARN
            </InlineTooltip>
          </span>
          <span slot="description" className="leading-5 text-code block">
            AWS role ARN that Restate Cloud can assume to invoke the Lambda
            function
          </span>
        </>
      }
    />
  );
}
