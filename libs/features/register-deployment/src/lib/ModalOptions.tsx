import { FormFieldInput } from '@restate/ui-form-field';
import { Spinner } from '@restate/ui-loading';
import { useRegisterDeploymentContext } from './Context';

export function ModalOptions() {
  const {
    modalCommand,
    modalWorkdir,
    modalInfo,
    updateModalOptions,
    modalPort,
    isPending,
  } = useRegisterDeploymentContext();
  const defaultCommand = modalInfo?.command.join(' ') ?? '';
  const defaultWorkdir = modalInfo?.workdir ?? '';

  return (
    <div className="flex flex-col gap-4">
      <FormFieldInput
        name="modal_command"
        placeholder={defaultCommand}
        value={modalCommand ?? defaultCommand}
        disabled={isPending}
        onChange={(value) =>
          updateModalOptions?.({
            modalCommand: value,
            modalWorkdir,
            modalPort,
          })
        }
        label={
          <>
            <span slot="title">Command</span>
            <span slot="description" className="block text-0.5xs leading-5">
              Modal runs this command instead of the image's own CMD
            </span>
          </>
        }
      />
      <FormFieldInput
        name="modal_workdir"
        placeholder={defaultWorkdir}
        value={modalWorkdir ?? defaultWorkdir}
        disabled={isPending}
        onChange={(value) =>
          updateModalOptions?.({
            modalCommand,
            modalWorkdir: value,
            modalPort,
          })
        }
        label={<span slot="title">Working directory</span>}
      />
      {isPending && (
        <p className="flex items-center gap-2 text-0.5xs text-muted">
          <Spinner />
          Starting a Modal sandbox for the image… the first time can take a few
          minutes.
        </p>
      )}
    </div>
  );
}

export function ModalPort() {
  const {
    modalCommand,
    modalWorkdir,
    modalInfo,
    updateModalOptions,
    modalPort,
  } = useRegisterDeploymentContext();
  const defaultPort = String(modalInfo?.port ?? 9080);

  return (
    <FormFieldInput
      name="modal_port"
      type="number"
      placeholder={defaultPort}
      value={modalPort ?? defaultPort}
      onChange={(value) =>
        updateModalOptions?.({
          modalCommand,
          modalWorkdir,
          modalPort: value,
        })
      }
      label={
        <>
          <span slot="title">Port</span>
          <span slot="description" className="block text-0.5xs leading-5">
            The port the Restate SDK listens on inside the sandbox
          </span>
        </>
      }
    />
  );
}
