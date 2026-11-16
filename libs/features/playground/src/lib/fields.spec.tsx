import { render, screen } from '@testing-library/react';
import { InputField } from './fields';
import type { OperationRun } from './useHandlerRun';

vi.mock('./BodyEditor', () => ({
  BodyEditor: ({ ariaLabel, value }: { ariaLabel: string; value: string }) => (
    <textarea aria-label={ariaLabel} value={value} readOnly />
  ),
}));

function run({
  required,
  schema,
  hasInput = true,
}: {
  required: boolean;
  schema?: unknown;
  hasInput?: boolean;
}) {
  return {
    service: 'Greeter',
    draftName: 'greet',
    schemas: [],
    hasInput,
    isInputOptional: schema === undefined && !required,
    operation: {
      body: { contentType: 'application/json', required, schema },
    },
    runner: {
      draft: { rawBody: '', bodyMode: 'text' },
      exampleBody: '',
      setDraft: vi.fn(),
      issueFor: () => undefined,
    },
  } as unknown as OperationRun;
}

describe('InputField', () => {
  it('shows an empty editor for an optional input without a schema', () => {
    render(<InputField run={run({ required: false })} />);

    expect(screen.getByRole('textbox', { name: 'Input' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About Input' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add input/ })).toBeNull();
  });

  it('shows the editor without the note when the input is required', () => {
    render(<InputField run={run({ required: true })} />);

    expect(screen.getByRole('textbox', { name: 'Input' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'About Input' })).toBeNull();
  });

  it('renders nothing for a handler without input', () => {
    const { container } = render(
      <InputField run={run({ required: false, hasInput: false })} />,
    );

    expect(container.innerHTML).toBe('');
  });
});
