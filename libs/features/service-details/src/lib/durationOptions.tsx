import type { ComboBoxOptionSection } from '@restate/ui/form-field';
import { Link } from '@restate/ui/link';

function durationOptions(examples: readonly string[]): ComboBoxOptionSection[] {
  return [
    {
      id: 'examples',
      title: 'Examples',
      description: (
        <>
          Choose from the example options above, or enter a custom value in the{' '}
          <Link
            href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            jiff friendly
          </Link>{' '}
          format.
        </>
      ),
      items: examples.map((id) => ({ id })),
    },
  ];
}

export const timeoutOptions = durationOptions([
  '1m',
  '5m',
  '30m',
  '1h 30m',
  '1day',
]);
export const retentionOptions = durationOptions([
  '1h 30m',
  '12h',
  '1day',
  '7days',
]);
