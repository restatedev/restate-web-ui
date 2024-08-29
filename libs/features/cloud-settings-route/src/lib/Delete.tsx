import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Loading } from './Loading';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { useRouteLoaderData, useSearchParams } from '@remix-run/react';
import {
  DELETE_ENVIRONMENT_PARAM_NAME,
  environments,
  useEnvironmentDetails,
} from '@restate/features/cloud/environments-route';
import invariant from 'tiny-invariant';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';

export function Delete({ isLoading }: { isLoading: boolean }) {
  const [, setSearchParams] = useSearchParams();
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const environmentDetails = useEnvironmentDetails();

  return (
    <Section>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Icon
            name={IconName.Trash}
            className="w-[1.125em] h-[1.125em] text-gray-700"
          />
          Delete
        </span>
        <p>Delete your Restate environment</p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2 relative min-h-[6rem]">
        {environmentDetails.isLoading || isLoading ? (
          <Loading className="rounded-xl" />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="bg-white rounded-xl border px-4 py-3 shadow-sm ">
              <h6 className="inline font-normal text-red-800">
                Delete{' '}
                <span className="font-mono leading-snug text-sm inline-flex gap-1 items-center rounded-lg px-1 py-0.5 bg-red-50 text-red-600">
                  {environmentDetails?.data?.name}
                </span>
              </h6>
              <p className="text-sm text-gray-500 mt-2">
                Deleting this environment will permanently erase all associated
                data, configurations, and resources. This action{' '}
                <span className="font-medium">cannot be undone</span>.
              </p>
            </div>
            <Button
              className="self-start flex gap-2 items-center"
              variant="destructive"
              onClick={() =>
                setSearchParams(
                  (perv) => {
                    perv.set(DELETE_ENVIRONMENT_PARAM_NAME, 'true');
                    return perv;
                  },
                  { preventScrollReset: true }
                )
              }
            >
              <Icon name={IconName.Trash} className="w-[1.25em] h-[1.25em]" />
              Delete environment
            </Button>
          </div>
        )}
      </SectionContent>
    </Section>
  );
}
