import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
} from '@restate/ui/layout';

import { useSearchParams } from 'react-router';

import { INVOCATION_QUERY_NAME } from './constants';
import { Link } from '@restate/ui/link';
import { Code, Snippet } from '@restate/ui/code';

export function InvocationPanel() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(INVOCATION_QUERY_NAME);

  if (!invocationId) {
    return null;
  }

  return (
    <ComplementaryWithSearchParam
      paramName={INVOCATION_QUERY_NAME}
      footer={
        <div className="flex gap-2 flex-col flex-auto">
          <div className="flex gap-2">
            <ComplementaryClose>
              <Button className="flex-auto grow-0 w-full" variant="secondary">
                Cancel
              </Button>
            </ComplementaryClose>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center py-8 flex-auto w-full justify-center rounded-xl">
        <div className="flex flex-col gap-2 items-center relative w-full text-left mt-6 justify-start">
          <h3 className="text-sm font-semibold text-gray-600 w-full px-4">
            Coming soon!
          </h3>
          <p className="text-sm text-gray-500 px-4 max-w-md">
            The Invocation details page is currently under development and will
            be available soon. In the meantime, you can use our{' '}
            <Link
              href="https://docs.restate.dev/develop/local_dev/#running-restate-server--cli-locally"
              rel="noopener noreferrer"
              target="_blank"
            >
              CLI
            </Link>{' '}
            to manage invocations. Below are a few examples of how you can use
            CLI commands to perform tasks:
          </p>
          <Code className="bg-zinc-700 py-4 pr-8 pl-4 text-code mt-4 mx-4">
            <Snippet language="bash">#Get the invocation details</Snippet>
            <Snippet className="[filter:invert(1)]" language="bash">
              {`restate invocation get ${invocationId}`}
            </Snippet>
            <Snippet className="mt-2" language="bash">
              #Cancel an invocation
            </Snippet>
            <Snippet
              className="[filter:invert(1)]"
              language="bash"
            >{`restate invocation cancel ${invocationId}`}</Snippet>
          </Code>
        </div>
      </div>
    </ComplementaryWithSearchParam>
  );
}
