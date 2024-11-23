import type { Config } from '@react-router/dev/config';
import { BASE_URL } from './constants';

export default {
  ssr: false,
  basename: BASE_URL,
} satisfies Config;
