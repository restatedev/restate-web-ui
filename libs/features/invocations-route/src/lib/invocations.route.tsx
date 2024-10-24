import { Code, Snippet } from '@restate/ui/code';
import { Link } from '@restate/ui/link';

function Component() {
  return (
    <div className="flex md:sticky md:top-[11rem] flex-col items-center md:h-[calc(100vh-150px-6rem)] py-8 flex-auto w-full justify-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col gap-2 items-center relative w-full text-center mt-6">
        <h3 className="text-sm font-semibold text-gray-600">Coming soon!</h3>
        <p className="text-sm text-gray-500 px-4 max-w-md">
          The Invocations page is currently under development and will be
          available soon. In the meantime, you can use our{' '}
          <Link
            href="https://docs.restate.dev/develop/local_dev/#running-restate-server--cli-locally"
            rel="noopener noreferrer"
            target="_blank"
          >
            CLI
          </Link>{' '}
          to manage invocations. Below are a few examples of how you can use CLI
          commands to perform tasks:
        </p>
        <Code className="bg-zinc-700 py-4 pr-8 pl-4 text-code mt-4">
          <Snippet language="bash">#List the invocations</Snippet>
          <Snippet className="[filter:invert(1)]" language="bash">
            restate invocations list
          </Snippet>
          <Snippet className="mt-2" language="bash">
            #Cancel an invocation
          </Snippet>
          <Snippet
            className="[filter:invert(1)]"
            language="bash"
          >{`restate invocation cancel <INVOCATION_ID>`}</Snippet>
        </Code>
      </div>
    </div>
  );
}

export const invocations = { Component };
