import * as adminApi from '@restate/data-access/admin-api/spec';
import { HandlerTypeExplainer } from '@restate/features/explainers';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'flex flex-row items-center gap-2 [&:has(+*)]:rounded-b-none [&+*]:rounded-t-none [&+*]:border-t-0 rounded-[calc(0.75rem-0.5rem)]',
});

export function Handler({
  handler,
  className,
}: {
  handler: adminApi.components['schemas']['ServiceMetadata']['handlers'][number];
  className?: string;
}) {
  return (
    <div className={styles({ className })}>
      <div className="shrink-0 h-6 w-6 bg-white border shadow-sm rounded-md">
        <Icon
          name={IconName.Function}
          className="w-full h-full text-zinc-400"
        />
      </div>

      <div className="text-code text-zinc-600">{handler.name}</div>
      <div className="ml-auto text-2xs font-medium leading-5 bg-white text-zinc-500 ring-zinc-500/20 inline-flex gap-1 items-center rounded-md px-2 py-0 ring-1 ring-inset">
        <HandlerTypeExplainer type={handler.ty} variant="indicator-button">
          {handler.ty}
        </HandlerTypeExplainer>
      </div>
    </div>
  );
}
