import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense } from 'react';
import { Loading } from './Loading';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { useSearchParams } from '@remix-run/react';
import { DELETE_ENVIRONMENT_PARAM_NAME } from '@restate/features/cloud/environments-route';

export function Delete({ isLoading }: { isLoading: boolean }) {
  const [, setSearchParams] = useSearchParams();

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
        <p>Delete your restate environment</p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2 relative min-h-[6rem]">
        <Suspense fallback={<Loading className="rounded-xl" />}>
          {isLoading ? (
            <Loading className="rounded-xl" />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="bg-white rounded-xl border px-4 py-3 shadow-sm ">
                <h6 className="inline-flex items-center gap-2 font-normal">
                  Caution
                </h6>
                <p className="text-sm text-gray-500 mt-2">
                  Deleting this environment will permanently erase all
                  associated data, configurations, and resources. This action{' '}
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
        </Suspense>
      </SectionContent>
    </Section>
  );
}
