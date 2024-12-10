import { ErrorBanner } from '@restate/ui/error';
import { Cell, Row } from './Row';

export function LoadingRows({
  numOfColumns,
  numOfRows = 5,
}: {
  numOfColumns: number;
  numOfRows?: number;
}) {
  return Array(numOfRows)
    .fill(null)
    .map((_, index) => (
      <Row key={index}>
        {Array(numOfColumns)
          .fill(null)
          .map((_, i) => (
            <Cell key={i} className="p-0">
              <div
                className="p-2 min-h-10 flex"
                style={{
                  paddingRight: `${hashCode((index + 1) * 11, (i + 1) * 13)}%`,
                }}
              >
                <div className="animate-pulse min-h-full w-full rounded-md bg-slate-200" />
              </div>
            </Cell>
          ))}
      </Row>
    ));
}

export function TableError({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-stretch p-2 gap-4">
      <ErrorBanner error={error} className="rounded-md" />
    </div>
  );
}

function hashCode(num1: number, num2: number) {
  // Convert numbers to 32-bit integers
  num1 = num1 | 0;
  num2 = num2 | 0;

  // Simple hash function using bitwise operations
  let hash = num1;
  hash = (hash << 5) - hash + num2;
  hash = hash & hash; // Convert to 32-bit integer

  // Ensure positive hash
  hash = hash >>> 0;
  return hash % 60;
}
