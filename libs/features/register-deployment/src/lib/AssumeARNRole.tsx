import { FormFieldInput } from '@restate/ui/form-field';
import { useRegisterDeploymentContext } from './Context';

const ROLE_REGEX =
  /^arn:aws(?:-cn|-us-gov)?:iam::\d{12}:role(?:\/[\w+=,.@\-]+)+$/;
export function AssumeARNRole({ className }: { className?: string }) {
  const { updateAssumeRoleArn, assumeRoleArn, isPending } =
    useRegisterDeploymentContext();

  return (
    <FormFieldInput
      name="assume_role_arn"
      placeholder="arn:aws:iam::{account}:role/{role-name}"
      pattern={ROLE_REGEX.source}
      value={assumeRoleArn}
      className={className}
      onChange={updateAssumeRoleArn}
      disabled={isPending}
      label={
        <>
          <span slot="title">Role ARN</span>
          <span slot="description" className="block text-0.5xs leading-5">
            AWS role ARN that Restate can assume to invoke the Lambda function
          </span>
        </>
      }
    />
  );
}
