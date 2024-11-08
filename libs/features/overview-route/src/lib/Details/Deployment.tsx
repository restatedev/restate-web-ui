import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
} from '@restate/ui/layout';

export function DeploymentDetails() {
  return (
    <ComplementaryWithSearchParam
      paramName="deployment"
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
      {DeploymentForm}
    </ComplementaryWithSearchParam>
  );
}

function DeploymentForm({ paramValue }: { paramValue: string }) {
  return <div>{paramValue}</div>;
}
