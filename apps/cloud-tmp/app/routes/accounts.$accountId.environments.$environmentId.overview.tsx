import { overview } from '@restate/features/overview-route';
import { withFeatureFlag } from '@restate/util/feature-flag';

export const clientLoader = withFeatureFlag(
  'FEATURE_OVERVIEW_PAGE',
  () => null
);
export default overview.Component;
