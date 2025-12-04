import { PropsWithChildren, ReactNode } from 'react';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import { BatchState } from './types';
import { useProgress } from './useProgress';

export function NotificationProgressTracker({
  batch,
  onClose,
  onExpand,
  inProgressContent,
  finishedContent,
}: PropsWithChildren<{
  batch: BatchState;
  onClose: VoidFunction;
  onExpand: VoidFunction;
  inProgressContent: (args: {
    successful?: number;
    failed?: number;
    total?: number;
  }) => ReactNode;
  finishedContent: (args: {
    successful: number;
    failed: number;
    total?: number;
  }) => ReactNode;
}>) {
  const progress = useProgress(batch.progressStore);

  if (progress?.isFinished && progress.failed === 0) {
    onClose();
  }
  if (progress?.isError) {
    onClose();
    onExpand();
  }

  return (
    <>
      {!progress?.isFinished && <Spinner className="h-4 w-4 shrink-0" />}
      {progress?.isFinished
        ? finishedContent({
            successful: progress.successful,
            failed: progress.failed,
            total: progress.total,
          })
        : inProgressContent({
            successful: progress?.successful,
            failed: progress?.failed,
            total: progress?.total,
          })}
      <div className="ml-auto">
        <Button
          variant="icon"
          onClick={() => {
            onClose();
            if (!progress?.isFinished || progress.failed > 0) {
              onExpand();
            }
          }}
          className="h-6 w-6 shrink-0 before:absolute before:inset-0 before:rounded-lg before:content-['']"
        >
          <Icon
            name={
              progress?.isFinished && progress.failed === 0
                ? IconName.X
                : IconName.Maximize
            }
          />
        </Button>
      </div>
    </>
  );
}
