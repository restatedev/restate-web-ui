import { SubmitButton } from '@restate/ui/button';
import { tv } from '@restate/util/styles';
import { FIX_HTTP_ACTION } from './utils';
import { Icon, IconName } from '@restate/ui/icons';
import { InlineTooltip } from '@restate/ui/tooltip';
import { ERROR_CODES } from '@restate/util/errors';
import Markdown from 'react-markdown';

const styles = tv({
  base: 'mb-2 flex items-center gap-4 rounded-xl border border-zinc-900/80 bg-zinc-800/90 py-1.5 pr-1.5 pl-2 text-sm text-gray-200 shadow-[inset_0_0.5px_0_0_var(--color-gray-500)] drop-shadow-xl backdrop-blur-xl',
});
export function FixHttp1({
  formId,
  className,
  endpoint,
}: {
  formId?: string;
  className?: string;
  endpoint?: string;
}) {
  const code = 'META0014';
  const { help, summary } = ERROR_CODES[code] ?? {};
  return (
    <div className={styles({ className })}>
      <div className="flex-auto">
        <Icon
          name={IconName.Sparkles}
          className="mr-2 inline h-4 w-4 -translate-y-0.5"
        />
        Server responded with HTTP/1.1, common in local dev with FaaS platforms.
        <InlineTooltip
          variant="indicator-button"
          className="ml-0.5 translate-y-0.5 [&_button]:mt-1 [&_button]:mr-1 [&_button]:self-start"
          title={code}
          {...(code && {
            learnMoreHref: `https://docs.restate.dev/references/errors#${code?.toLowerCase()}`,
          })}
          description={
            <div className="[&_li]:list-inside [&_li]:list-disc [&_ul]:mt-2">
              <Markdown>{help}</Markdown>
            </div>
          }
        ></InlineTooltip>
      </div>
      <SubmitButton
        form={formId}
        autoFocus
        value={FIX_HTTP_ACTION}
        variant="icon"
        className="flex h-7 shrink-0 items-center gap-2 rounded-md bg-white/20 px-3 py-0 pr-1.5 text-0.5xs text-white outline-blue-300 hover:bg-white/25 pressed:bg-white/30"
      >
        Switch to HTTP/1.1
        <Icon name={IconName.ChevronRight} className="h-4 w-4" />
      </SubmitButton>
    </div>
  );
}
