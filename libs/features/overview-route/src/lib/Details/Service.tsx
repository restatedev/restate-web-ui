import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
} from '@restate/ui/layout';
import { SERVICE_QUERY_PARAM } from '../constants';

export function ServiceDetails() {
  return (
    <ComplementaryWithSearchParam
      paramName={SERVICE_QUERY_PARAM}
      footer={
        <>
          <ComplementaryClose>
            <Button className="flex-auto" variant="secondary">
              Cancel
            </Button>
          </ComplementaryClose>
          <Button className="flex-auto">Submit</Button>
        </>
      }
    >
      {ServiceForm}
    </ComplementaryWithSearchParam>
  );
}

function ServiceForm({ paramValue }: { paramValue: string }) {
  return <div>{paramValue}</div>;
}
