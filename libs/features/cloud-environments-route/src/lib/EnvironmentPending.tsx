import {
  Await,
  useAsyncValue,
  useLoaderData,
  useLocation,
  useRevalidator,
  useSearchParams,
} from '@remix-run/react';
import { Button, Spinner } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import invariant from 'tiny-invariant';
import { clientLoader } from './loader';
import { Suspense } from 'react';
import {
  useAccountParam,
  useEnvironmentParam,
  toEnvironmentRoute,
} from '@restate/features/cloud/routes-utils';
import { Icon, IconName } from '@restate/ui/icons';
import { EnvironmentStatus, MiniEnvironmentStatus } from './EnvironmentStatus';
import { CreateEnvironment } from './CreateEnvironment';
import {
  CREATE_ENVIRONMENT_PARAM_NAME,
  DELETE_ENVIRONMENT_PARAM_NAME,
} from './constants';
import { DeleteEnvironment } from './DeleteEnvironment';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { InlineError } from '@restate/ui/error';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EnvironmentPendingProps {}

export function EnvironmentPending(props: EnvironmentPendingProps) {
  const currentAccountId = useAccountParam();
  const { environmentList, ...environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();
  const currentEnvironmentParam = useEnvironmentParam();
  invariant(currentAccountId, 'Account id is missing');
  const { state } = useRevalidator();
  const isLoading = state === 'loading';

  if (!currentEnvironmentParam) {
    return null;
  }

  return (
    <Suspense>
      <Await resolve={environmentsWithDetailsPromises[currentEnvironmentParam]}>
        <EnvironmentPendingContent />
      </Await>
    </Suspense>
  );
}

function EnvironmentPendingContent() {
  const environmentDetails = useAsyncValue() as Awaited<
    ReturnType<typeof describeEnvironment>
  >;
  const isPending = environmentDetails.data?.status === 'PENDING';

  if (isPending) {
    return (
      <LayoutOutlet zone={LayoutZone.Notification}>
        <div className="flex items-center gap-2 bg-orange-100 rounded-xl bg-orange-200/60 shadow-lg shadow-zinc-800/5 border border-orange-200 text-orange-800 px-3">
          <Spinner /> Please bear with us until we create your environment.
        </div>
      </LayoutOutlet>
    );
  }

  return null;
}
