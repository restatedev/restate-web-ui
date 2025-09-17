import { useSearchParams } from 'react-router';
import { ONBOARDING_QUERY_PARAM } from './constants';

export function useOnboarding() {
  const [searchParams] = useSearchParams();
  return searchParams.get(ONBOARDING_QUERY_PARAM) === 'true';
}
