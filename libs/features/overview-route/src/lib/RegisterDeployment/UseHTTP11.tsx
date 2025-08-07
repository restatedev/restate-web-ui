import { FormFieldCheckbox } from '@restate/ui/form-field';
import { useRegisterDeploymentContext } from './Context';

export function UseHTTP11() {
  const { updateUseHttp11Arn, useHttp11 } = useRegisterDeploymentContext();

  return (
    <div>
      <div slot="title" className="mb-2 text-sm font-medium text-gray-700">
        Use <code>HTTP1.1</code>
      </div>
      <FormFieldCheckbox
        name="use_http_11"
        className="mt-0.5 self-baseline"
        value="true"
        checked={useHttp11}
        onChange={updateUseHttp11Arn}
      >
        <span
          slot="description"
          className="block text-code leading-5 text-gray-500"
        >
          <code>HTTP1.1</code> will be used for service registration.
        </span>
      </FormFieldCheckbox>
    </div>
  );
}
