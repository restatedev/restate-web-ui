import {
  FormFieldGroup,
  FormFieldLabel,
  FormFieldInput,
} from '@restate/ui/form-field';
import { useRegisterDeploymentContext } from './Context';

export function RoutingHeader() {
  const { routingHeader, updateRoutingHeader } = useRegisterDeploymentContext();

  return (
    <FormFieldGroup className="flex h-auto flex-col items-start gap-1">
      <FormFieldLabel>
        <span slot="title" className="text-sm font-medium text-gray-700">
          Routing header
        </span>
        <span slot="description" className="block text-0.5xs leading-5">
          Set this header if your load balancer uses header-based routing to
          direct requests to specific deployments.
        </span>
      </FormFieldLabel>
      <div className="flex w-full items-center gap-1.5">
        <FormFieldInput
          name="key"
          className="basis-1/3"
          value={routingHeader?.key}
          placeholder="Header name"
          onChange={(key) =>
            updateRoutingHeader?.(key, routingHeader?.value ?? '')
          }
        />
        :
        <FormFieldInput
          name="value"
          className="flex-auto"
          value={routingHeader?.value}
          placeholder="Header value"
          onChange={(value) =>
            updateRoutingHeader?.(routingHeader?.key ?? '', value)
          }
        />
        <div className="w-9" />
      </div>
    </FormFieldGroup>
  );
}
