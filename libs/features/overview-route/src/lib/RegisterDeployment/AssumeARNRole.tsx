import { FormFieldInput } from '@restate/ui/form-field';

export function AssumeARNRole() {
  return (
    <FormFieldInput
      name="assume_role_arn"
      placeholder="arn:aws:sts::{acc}:assumed-role/{role}/{func}"
      pattern="^arn:aws:sts::(\d{12}):assumed-role\/([^\/]+)\/([^\/]+)$"
      label={
        <>
          <span slot="title">Assume role ARN</span>
          <span slot="description" className="leading-5 text-code block">
            ARN of a role to use when invoking the Lambda
          </span>
        </>
      }
    />
  );
}
