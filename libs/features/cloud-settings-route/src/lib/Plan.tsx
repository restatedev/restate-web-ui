import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense } from 'react';
import { Loading } from './Loading';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';

export function Plan({ isLoading }: { isLoading: boolean }) {
  return (
    <Section>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Icon
            name={IconName.Wallet}
            className="w-[1.125em] h-[1.125em] text-gray-700"
          />
          Plan
        </span>
        <p>
          View and manage your{' '}
          <span className="whitespace-nowrap">restate Cloud</span> plan
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2 relative min-h-[6rem]">
        <Suspense fallback={<Loading className="rounded-xl" />}>
          {isLoading ? (
            <Loading className="rounded-xl" />
          ) : (
            <div className="bg-white rounded-xl border px-4 py-3 shadow-sm">
              <h6 className="inline-flex items-center gap-2 font-medium">
                Free tier{' '}
                <span className="font-medium leading-snug text-2xs inline-flex gap-1 items-center rounded-md px-2 py-0.5  bg-gray-50 ring-1 ring-inset ring-gray-500/30 text-gray-600">
                  BETA
                </span>
              </h6>
              <p className="text-sm mt-2 text-gray-600">
                You are currently enrolled in our beta free tier plan. If you're
                interested in upcoming premium tiers,{' '}
                <Link
                  target="_blank"
                  href="https://restate.dev/get-restate-cloud/"
                  rel="noreferrer noopener"
                  className="inline"
                  variant="secondary"
                >
                  register your interest.
                </Link>
              </p>
            </div>
          )}
        </Suspense>
      </SectionContent>
    </Section>
  );
}
