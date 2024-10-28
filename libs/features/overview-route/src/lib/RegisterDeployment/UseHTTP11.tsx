import { FormFieldCheckbox } from '@restate/ui/form-field';
import { useRegisterDeploymentContext } from './Context';

export function UseHTTP11() {
  const { updateUseHttp11Arn, useHttp11 } = useRegisterDeploymentContext();

  return (
    <FormFieldCheckbox
      name="use_http_11"
      className="self-baseline mt-0.5"
      value="true"
      direction="right"
      checked={useHttp11}
      onChange={updateUseHttp11Arn}
    >
      <span slot="title" className="text-sm font-medium text-gray-700">
        Use <code>HTTP1.1</code>
      </span>
      <br />
      <span
        slot="description"
        className="leading-5 text-code block text-gray-500"
      >
        <code>HTTP1.1</code> will be used for service registration.
      </span>
    </FormFieldCheckbox>
  );
}
