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
    <FormFieldGroup className="h-auto flex gap-1 flex-col items-start">
      <FormFieldLabel>
        <span slot="title" className="text-sm font-medium text-gray-700">
          Additional headers
        </span>
        <span slot="description" className="leading-5 text-code block">
          Headers added to the register/invoke requests to the deployment.
        </span>
      </FormFieldLabel>
      {list?.items.map((item) => (
        <div key={item.index} className="flex gap-1.5 items-center w-full">
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
              list.getItem(item.index).key === '' &&
              list.getItem(item.index).value === ''
                ? 'invisible p-1'
                : ' p-1'
            }
          >
            <Icon
              name={IconName.Trash}
              className="w-[1.25rem] h-[1.25rem] m-[0.25rem]"
            />
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
        className="flex gap-2 items-center px-3 rounded-lg h-[2.125rem]"
      >
        <Icon name={IconName.Plus} className="w-[1.125rem] h-[1.125rem]" />
        Add header
      </Button>
    </FormFieldGroup>
  );
}
