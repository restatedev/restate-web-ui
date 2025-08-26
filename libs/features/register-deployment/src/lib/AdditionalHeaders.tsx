import { Button } from '@restate/ui/button';
import {
  FormFieldGroup,
  FormFieldLabel,
  FormFieldInput,
} from '@restate/ui/form-field';
import { IconName, Icon } from '@restate/ui/icons';
import { useRegisterDeploymentContext } from './Context';

export function AdditionalHeaders() {
  const { additionalHeaders: list } = useRegisterDeploymentContext();

  return (
    <FormFieldGroup className="flex h-auto flex-col items-start gap-1">
      <FormFieldLabel>
        <span slot="title" className="text-sm font-medium text-gray-700">
          Additional headers
        </span>
        <span slot="description" className="block text-0.5xs leading-5">
          Headers added to the register/invoke requests to the deployment.
        </span>
      </FormFieldLabel>
      {list?.items.map((item) => (
        <div key={item.index} className="flex w-full items-center gap-1.5">
          <FormFieldInput
            name="key"
            className="basis-1/3"
            value={item.key}
            placeholder="Header name"
            onChange={(key) =>
              list.update(item.index, {
                ...item,
                key,
              })
            }
          />
          :
          <FormFieldInput
            name="value"
            className="flex-auto"
            value={item.value}
            placeholder="Header value"
            onChange={(value) =>
              list.update(item.index, {
                ...item,
                value,
              })
            }
          />
          <Button
            onClick={() => {
              if (list.items.length === 1) {
                list.update(item.index, {
                  key: '',
                  value: '',
                  index: item.index,
                });
              } else {
                list.remove(item.index);
              }
            }}
            variant="icon"
            className={
              list.items.length === 1 &&
              list.getItem(item.index)?.key === '' &&
              list.getItem(item.index)?.value === ''
                ? 'invisible p-1'
                : 'p-1'
            }
          >
            <Icon name={IconName.Trash} className="m-1 h-5 w-5" />
          </Button>
        </div>
      ))}
      <Button
        onClick={() =>
          list?.append({
            key: '',
            value: '',
            index: Math.floor(Math.random() * 1000000),
          })
        }
        variant="secondary"
        className="flex h-8.5 items-center gap-2 rounded-lg px-3"
      >
        <Icon name={IconName.Plus} className="h-4.5 w-4.5" />
        Add header
      </Button>
    </FormFieldGroup>
  );
}
